import { useRun } from '../shared/use-run';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  useUI,
  Button,
  Dropdown,
  Empty,
  SearchInput,
  Pagination,
  Segmented,
  Spin,
  Modal,
  Input,
} from './ui';
import {
  DatabaseIcon,
  TrashIcon,
  DotsThreeIcon,
  ArrowClockwiseIcon,
  PencilSimpleIcon,
  DownloadSimpleIcon,
} from '@phosphor-icons/react';
import type { Run, RunSummary } from '../../shared/contracts';
import { errorMessage } from '../shared/feedback';
import { Chart } from './Results';
import Grid from './DataGrid';
import { cx } from '../shared/cx';

function SavedCard({
  run,
  onOpen,
  onRemove,
  busy,
  refreshingId,
}: {
  run: Run;
  onOpen: (run: RunSummary) => void;
  onRemove: (id: string) => Promise<unknown>;
  busy: boolean;
  refreshingId?: string;
}) {
  const { message, confirm } = useUI();
  const [tab, setTab] = useState('图表');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const title = run.savedTitle || run.question;
  const rename = async () => {
    if (renaming || !titleDraft?.trim()) return;
    setRenaming(true);
    try {
      await window.workbench.renameSavedAnalysis(run.id, titleDraft.trim());
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
  const current = run.savedView ? { ...run, result: run.savedView.result, chart: run.savedView.chart } : run;
  const updatedAt = run.savedView?.updatedAt || run.createdAt;
  const exportCard = async (format: string) => {
    if (exporting || refreshing) return;
    if (format !== 'pdf' && format !== 'png' && format !== 'html') return;
    setExporting(true);
    try {
      const exported = await window.workbench.exportAnalysis(run.id, format, true);
      if (exported) message.success('导出成功');
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setExporting(false);
    }
  };
  const refresh = async () => {
    if (refreshing || busy || refreshingId) return;
    setPending(true);
    setError('');
    try {
      await window.workbench.refreshSavedAnalysis(run.id);
      message.success('数据已刷新');
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setPending(false);
    }
  };
  return (
    <article
      className="grid [grid-row:span_6] grid-rows-subgrid gap-y-0 min-w-0 w-full p-4.5 border border-line rounded-card bg-surface [transition:border-color_150ms,_box-shadow_150ms] hover:border-[color-mix(in_srgb,_var(--accent)_45%,_var(--border))] hover:shadow-[0_4px_18px_color-mix(in_srgb,_var(--text)_4%,_transparent)] focus-within:border-[color-mix(in_srgb,_var(--accent)_45%,_var(--border))] focus-within:shadow-[0_4px_18px_color-mix(in_srgb,_var(--text)_4%,_transparent)]"
      ref={root}
      aria-label={title}
    >
      <header className="flex gap-2 items-start">
        <h3
          className="flex-1 min-w-0 m-0 text-label leading-[24px] wrap-anywhere [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden"
          title={title}
        >
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
                disabled: busy || !!refreshingId || pending,
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
      <div className="items-center grid grid-cols-[auto_minmax(0,_1fr)] gap-y-1 gap-x-2 text-muted text-caption mt-2 mr-0 mb-3.5 ml-0">
        <DatabaseIcon />
        <span
          className="[&:not(.ui-icon)]:min-w-0 [&:not(.ui-icon)]:overflow-hidden [&:not(.ui-icon)]:text-ellipsis [&:not(.ui-icon)]:whitespace-nowrap"
          title={run.sourceName}
        >
          {run.sourceName}
        </span>
        <time className="[grid-column:2] tabular-nums" dateTime={updatedAt}>
          数据更新于 {new Date(updatedAt).toLocaleString()}
        </time>
      </div>
      <Segmented aria-label="分析内容" options={['数据', 'SQL', '图表']} value={tab} onChange={setTab} />
      <div
        className={cx(
          'flex flex-col h-65 min-h-0 min-w-0 my-3 mx-0 [&_.chart-frame]:block [&_.chart-frame]:h-0 [&_.chart-frame]:flex-1 [&_.chart-frame]:min-h-0 [&_>_.data-grid]:shrink-0 [&_>_.ui-alert]:shrink-0 [&_>_.saved-card-feedback]:shrink-0 [&_.chart-render-status:has(span:empty)]:hidden',
          tab === '图表' ? 'overflow-hidden' : 'overflow-auto',
        )}
      >
        {refreshing && (
          <div
            className="saved-card-feedback flex gap-2 items-center mt-3 text-helper text-accent"
            role="status"
          >
            <Spin size="small" />
            正在重新查询{run.chart ? '并更新图表' : '数据'}，完成前保留上次结果…
          </div>
        )}
        {error && (
          <Alert
            type="error"
            title="刷新失败，仍显示上次成功的数据"
            description={error}
            closable
            onClose={() => setError('')}
          />
        )}
        {tab === '图表' ? (
          current.chart ? (
            visible ? (
              <Chart run={current} saved />
            ) : (
              <div className="h-65 grid place-items-center">
                <Spin />
              </div>
            )
          ) : (
            <Empty
              description={
                current.result.data.length ? '本次分析没有图表，可切换查看数据或 SQL' : '查询未返回数据'
              }
            />
          )
        ) : tab === 'SQL' ? (
          <pre className="m-0 h-full overflow-auto">{current.result.sql || '此分析没有 SQL'}</pre>
        ) : (
          <Grid
            rows={current.result.data}
            columns={current.result.schema}
            resetKey={updatedAt}
            pageSize={5}
          />
        )}
      </div>
      <footer className="flex items-center gap-2 flex-wrap justify-between border-t border-t-line pt-3">
        <span className="text-muted">
          {current.result.data.length} 行 · {current.result.schema.length} 列
          {current.result.truncated ? ' · 结果已截断' : ''}
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
}) {
  const detail = useRun(props.run);
  if (detail.error)
    return (
      <article className="grid [grid-row:span_6] grid-rows-subgrid gap-y-0 min-w-0 w-full p-4.5 border border-line rounded-card bg-surface [transition:border-color_150ms,_box-shadow_150ms] hover:border-[color-mix(in_srgb,_var(--accent)_45%,_var(--border))] hover:shadow-[0_4px_18px_color-mix(in_srgb,_var(--text)_4%,_transparent)] focus-within:border-[color-mix(in_srgb,_var(--accent)_45%,_var(--border))] focus-within:shadow-[0_4px_18px_color-mix(in_srgb,_var(--text)_4%,_transparent)]">
        <Alert type="error" title={detail.error} action={<Button onClick={detail.retry}>重试</Button>} />
      </article>
    );
  if (!detail.run)
    return (
      <article className="grid [grid-row:span_6] grid-rows-subgrid gap-y-0 min-w-0 w-full p-4.5 border border-line rounded-card bg-surface [transition:border-color_150ms,_box-shadow_150ms] hover:border-[color-mix(in_srgb,_var(--accent)_45%,_var(--border))] hover:shadow-[0_4px_18px_color-mix(in_srgb,_var(--text)_4%,_transparent)] focus-within:border-[color-mix(in_srgb,_var(--accent)_45%,_var(--border))] focus-within:shadow-[0_4px_18px_color-mix(in_srgb,_var(--text)_4%,_transparent)]">
        <h3>{props.run.savedTitle || props.run.question}</h3>
        <Spin />
      </article>
    );
  return <SavedCard {...props} run={detail.run} />;
}

export default function SavedAnalyses({
  runs,
  onOpen,
  onRemove,
  busy = false,
  refreshingId,
}: {
  runs: RunSummary[];
  onOpen: (run: RunSummary) => void;
  onRemove: (id: string) => Promise<unknown>;
  busy?: boolean;
  refreshingId?: string;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const keyword = search.trim().toLocaleLowerCase();
  const filtered = runs
    .filter(
      (run) =>
        !!run.savedAt &&
        [run.savedTitle || '', run.question, run.sourceName, run.modelName].some((text) =>
          text.toLocaleLowerCase().includes(keyword),
        ),
    )
    .sort((a, b) => b.savedAt!.localeCompare(a.savedAt!));
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / 6)));
  return (
    <section aria-label="分析收藏卡片">
      <div className="toolbar flex items-center gap-2 flex-wrap mt-1 mr-0 mb-3 ml-0 [&_h2]:m-0 [&_h3]:m-0 pb-4 border-b border-b-line">
        <SearchInput
          className="max-w-75"
          aria-label="搜索分析收藏"
          placeholder="搜索标题、问题、数据或模型"
          allowClear
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <span className="text-muted">{filtered.length} 个分析</span>
      </div>
      {filtered.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,_minmax(min(360px,_100%),_1fr))] gap-4 items-stretch mt-5">
          {filtered.slice((current - 1) * 6, current * 6).map((run) => (
            <SavedCardLoader
              key={run.id}
              run={run}
              onOpen={onOpen}
              onRemove={onRemove}
              busy={busy}
              refreshingId={refreshingId}
            />
          ))}
        </div>
      ) : (
        <Empty description={search ? '没有匹配的分析' : '暂无分析收藏，点击结果中的“保存分析”后显示在这里'} />
      )}
      {filtered.length > 6 && (
        <Pagination
          className="justify-end mt-5"
          current={current}
          pageSize={6}
          total={filtered.length}
          onChange={setPage}
        />
      )}
    </section>
  );
}
