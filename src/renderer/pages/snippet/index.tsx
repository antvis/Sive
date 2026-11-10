import { useScrollLoad } from '@renderer/hooks/useScrollLoad';
import { useRun } from '@renderer/hooks/useRun';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Dropdown,
  Empty,
  SearchInput,
  Segmented,
  Spin,
  Modal,
  Input,
} from '@renderer/components/ui/index';
import { useUI } from '@renderer/hooks/useUI';
import {
  DatabaseIcon,
  TrashIcon,
  DotsThreeIcon,
  ArrowClockwiseIcon,
  PencilSimpleIcon,
  DownloadSimpleIcon,
} from '@phosphor-icons/react';
import type { Dataset, Run, RunSummary } from '@shared/contracts';
import { errorMessage } from '@renderer/utils/feedback';
import { Chart } from '@renderer/components/charts/Chart';
import Grid from '@renderer/components/data/DataGrid';
import { cx } from '@renderer/utils/cx';
import { renderMarkdown } from '@shared/markdown';

const savedCardSurface =
  'grid [grid-row:span_6] grid-rows-subgrid gap-y-0 min-w-0 w-full p-4.5 border border-line rounded-card bg-surface [transition:border-color_150ms,_box-shadow_150ms] hover:border-accent-line hover:shadow-[0_4px_18px] hover:shadow-ink/4 focus-within:border-accent-line focus-within:shadow-[0_4px_18px] focus-within:shadow-ink/4';

function SavedCard({
  run,
  onOpen,
  onRemove,
  busy,
  refreshingId,
  source,
}: {
  run: Run;
  onOpen: (run: RunSummary) => void;
  onRemove: (id: string) => Promise<unknown>;
  busy: boolean;
  refreshingId?: string;
  source?: Dataset;
}) {
  const { message, confirm } = useUI();
  const [tab, setTab] = useState('图表');
  const [resultIndex, setResultIndex] = useState(0);
  const [chartIndex, setChartIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const title = run.snippet?.title || run.question;
  const disconnected = !source || !!source.deletedAt;
  const sourceName = source?.name || run.sourceName;
  const rename = async () => {
    if (renaming || !titleDraft?.trim()) return;
    setRenaming(true);
    try {
      await window.workbench.snippetRename(run.id, titleDraft.trim());
      setTitleDraft(null);
      message.success('标题已修改');
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setRenaming(false);
    }
  };
  const root = useRef<HTMLElement>(null);
  const refreshing = pending || refreshingId === run.id;
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '120px' },
    );
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  const output = run.snippet?.output || run.output;
  const chartResultIndex = output.results.findIndex(({ id }) => id === output.charts[chartIndex]?.resultId);
  const result =
    output.results[tab === '图表' ? chartResultIndex : resultIndex]?.result || output.results[0]?.result;
  const updatedAt = run.snippet?.updatedAt || run.createdAt;
  const exportCard = async (format: string) => {
    if (exporting || refreshing) return;
    if (format !== 'pdf' && format !== 'png' && format !== 'html') return;
    setExporting(true);
    try {
      const exported = await window.workbench.analysisExport(run.id, format, true);
      if (exported) message.success('导出成功');
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setExporting(false);
    }
  };
  const refresh = async () => {
    if (disconnected || refreshing || busy || refreshingId) return;
    setPending(true);
    setError('');
    try {
      await window.workbench.snippetRefresh(run.id);
      message.success('数据已刷新');
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setPending(false);
    }
  };
  return (
    <article className={savedCardSurface} ref={root} aria-label={title}>
      <header className="flex gap-2 items-start">
        <h3 className="flex-1 min-w-0 m-0 text-body leading-[24px] wrap-anywhere line-clamp-2" title={title}>
          {title}
        </h3>
        <Dropdown
          menu={{
            items: [
              { key: 'rename', label: '修改标题', icon: <PencilSimpleIcon />, disabled: refreshing },
              {
                key: 'refresh',
                label: '刷新数据',
                icon: <ArrowClockwiseIcon />,
                disabled: disconnected || busy || !!refreshingId || pending || !output.results.length,
              },
              {
                key: 'remove',
                label: '移除卡片',
                icon: <TrashIcon />,
                danger: true,
                disabled: refreshing,
              },
            ],
            onClick: ({ key }) => {
              if (key === 'refresh') refresh();
              else if (key === 'rename') {
                setTitleDraft(title);
              } else if (key === 'remove')
                confirm({
                  title: '移除此分析收藏？',
                  content: '原始对话和执行记录会保留。',
                  okText: '移除',
                  cancelText: '取消',
                  onOk: () => onRemove(run.id),
                });
            },
          }}
        >
          <Button variant="ghost" size="small" icon={<DotsThreeIcon />} aria-label={'分析操作：' + title} />
        </Dropdown>
      </header>
      <div className="items-center grid grid-cols-[auto_minmax(0,_1fr)] gap-y-1 gap-x-2 text-muted text-helper mt-2 mr-0 mb-3.5 ml-0">
        <DatabaseIcon />
        <span className="min-w-0 truncate" title={sourceName}>
          {sourceName}
          {disconnected ? ' · 连接已删除' : ''}
        </span>
        <time className="[grid-column:2] tabular-nums" dateTime={updatedAt}>
          数据更新于 {new Date(updatedAt).toLocaleString()}
        </time>
      </div>
      <div className="flex gap-2 items-center flex-wrap">
        <div className="flex-1 min-w-48 whitespace-nowrap">
          <Segmented
            aria-label="分析内容"
            options={['数据', 'SQL', '图表']}
            value={tab}
            onChange={(next) => {
              if (tab === '图表' && chartResultIndex >= 0) setResultIndex(chartResultIndex);
              setTab(next);
            }}
          />
        </div>
        {(tab === '图表' ? output.charts.length : output.results.length) > 1 && (
          <Dropdown
            menu={{
              selectedKeys: [String(tab === '图表' ? chartIndex : resultIndex)],
              items:
                tab === '图表'
                  ? output.charts.map((chart, index) => ({
                      key: String(index),
                      label: `图表 ${index + 1} · ${chart.spec.chartType}`,
                    }))
                  : output.results.map(({ result }, index) => ({
                      key: String(index),
                      label: `结果 ${index + 1} · ${result.query}`,
                    })),
              onClick: ({ key }) =>
                tab === '图表' ? setChartIndex(Number(key)) : setResultIndex(Number(key)),
            }}
          >
            <Button size="small">
              {tab === '图表' ? `图表 ${chartIndex + 1}` : `结果 ${resultIndex + 1}`}
            </Button>
          </Dropdown>
        )}
      </div>
      <div
        className={cx(
          'flex flex-col h-65 min-h-0 min-w-0 my-3 mx-0',
          tab === '图表' ? 'overflow-hidden' : 'overflow-auto',
        )}
      >
        {output.warning && <Alert className="shrink-0" type="warning" title={output.warning} />}
        {refreshing && (
          <div className="shrink-0 flex gap-2 items-center mt-3 text-helper text-accent" role="status">
            <Spin size="small" />
            正在重新查询{output.charts.length ? '并更新图表' : '数据'}，完成前保留上次结果…
          </div>
        )}
        {error && (
          <Alert
            className="shrink-0"
            type="error"
            title="刷新失败，仍显示上次成功的数据"
            description={error}
            closable
            onClose={() => setError('')}
          />
        )}
        {tab === '图表' ? (
          output.charts.length ? (
            visible ? (
              <Chart run={run} saved index={chartIndex} />
            ) : (
              <div className="h-65 grid place-items-center">
                <Spin />
              </div>
            )
          ) : output.text ? (
            <div
              className="markdown overflow-auto"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(output.text, true) }}
            />
          ) : (
            <Empty
              description={result?.data.length ? '本次分析没有图表，可切换查看数据或 SQL' : '查询未返回数据'}
            />
          )
        ) : tab === 'SQL' ? (
          <pre className="m-0 h-full overflow-auto">{result?.sql || '此分析没有 SQL'}</pre>
        ) : (
          <Grid
            className="shrink-0"
            rows={result?.data || []}
            columns={result?.schema}
            resetKey={updatedAt}
            pageSize={5}
          />
        )}
      </div>
      <footer className="flex items-center gap-2 flex-wrap justify-between border-t border-t-line pt-3">
        <span className="text-muted">
          {result?.data.length || 0} 行 · {result?.schema.length || 0} 列
          {result?.truncated ? ' · 结果已截断' : ''}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <Dropdown
            disabled={exporting || refreshing}
            open={exportMenuOpen}
            onOpenChange={setExportMenuOpen}
            menu={{
              items: ['pdf', 'png', 'html'].map((key) => ({ key, label: key.toUpperCase() })),
              onClick: ({ key }) => {
                setExportMenuOpen(false);
                exportCard(key);
              },
            }}
          >
            <Button size="small" icon={<DownloadSimpleIcon />} loading={exporting} disabled={refreshing}>
              导出
            </Button>
          </Dropdown>
          <Button size="small" onClick={() => onOpen(run)}>
            查看分析
          </Button>
        </div>
      </footer>
      <Modal
        title="修改收藏标题"
        open={titleDraft !== null}
        onCancel={() => !renaming && setTitleDraft(null)}
        onOk={rename}
        okText="保存"
        cancelText="取消"
        confirmLoading={renaming}
        okButtonProps={{ disabled: !titleDraft?.trim() }}
      >
        <Input
          aria-label="收藏标题"
          value={titleDraft ?? ''}
          disabled={renaming}
          placeholder="输入收藏标题"
          onChange={(event) => setTitleDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing && !event.repeat) {
              event.preventDefault();
              rename();
            }
          }}
        />
      </Modal>
    </article>
  );
}

function SavedCardLoader(props: {
  run: RunSummary;
  onOpen: (run: RunSummary) => void;
  onRemove: (id: string) => Promise<unknown>;
  busy: boolean;
  refreshingId?: string;
  source?: Dataset;
}) {
  const detail = useRun(props.run);
  if (detail.error)
    return (
      <article className={savedCardSurface}>
        <Alert type="error" title={detail.error} action={<Button onClick={detail.retry}>重试</Button>} />
      </article>
    );
  if (!detail.run)
    return (
      <article className={savedCardSurface}>
        <h3>{props.run.snippet?.title || props.run.question}</h3>
        <Spin />
      </article>
    );
  return <SavedCard {...props} run={detail.run} />;
}

export default function SnippetPage({
  runs,
  onOpen,
  onRemove,
  busy = false,
  refreshingId,
  datasets,
}: {
  runs: RunSummary[];
  onOpen: (run: RunSummary) => void;
  onRemove: (id: string) => Promise<unknown>;
  busy?: boolean;
  refreshingId?: string;
  datasets: Dataset[];
}) {
  const [search, setSearch] = useState('');
  const keyword = search.trim().toLocaleLowerCase();
  const filtered = runs
    .flatMap((run) => (run.snippet ? [{ ...run, snippet: run.snippet }] : []))
    .filter((run) =>
      [
        run.snippet.title,
        run.question,
        datasets.find((d) => d.id === run.datasetId)?.name || run.sourceName,
        run.modelName,
      ].some((text) => text.toLocaleLowerCase().includes(keyword)),
    )
    .sort((a, b) => b.snippet.updatedAt.localeCompare(a.snippet.updatedAt));
  const { count, hasMore, footer } = useScrollLoad(filtered.length, 6, keyword);
  return (
    <section aria-label="分析收藏卡片">
      <div className="flex items-center gap-2 flex-wrap mt-1 mr-0 mb-3 ml-0 pb-4 border-b border-b-line">
        <SearchInput
          className="max-w-75"
          aria-label="搜索分析收藏"
          placeholder="搜索标题、问题、数据或模型"
          allowClear
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
        />
        <span className="text-muted">{filtered.length} 个洞察 Snippet</span>
      </div>
      {filtered.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,_minmax(min(360px,_100%),_1fr))] gap-4 items-stretch mt-5">
          {filtered.slice(0, count).map((run) => (
            <SavedCardLoader
              key={run.id}
              run={run}
              onOpen={onOpen}
              onRemove={onRemove}
              busy={busy}
              refreshingId={refreshingId}
              source={datasets.find((d) => d.id === run.datasetId)}
            />
          ))}
        </div>
      ) : (
        <Empty description={search ? '没有匹配的分析' : '暂无分析收藏，点击结果中的“保存分析”后显示在这里'} />
      )}
      {hasMore && (
        <div ref={footer} className="py-5 text-center text-muted text-helper" role="status">
          正在加载更多分析收藏…
        </div>
      )}
    </section>
  );
}
