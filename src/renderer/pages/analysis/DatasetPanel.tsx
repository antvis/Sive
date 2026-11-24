import { useEffect, useId, useRef, useState } from 'react';
import { SidebarSimple, Table } from '@phosphor-icons/react';
import clsx from 'clsx';
import { Tabs } from 'radix-ui';
import { toast } from 'sonner';
import { DEFAULT_PREVIEW_PAGE_SIZE, PREVIEW_PAGE_SIZES } from '@shared/api';
import { Button } from '../../components/Button';
import { DataGrid } from '../../components/DataGrid';
import { Select } from '../../components/Select';
import type { DatasetDetail } from '../../types';
import { errorMessage } from '../../utils';
import { TableNavigator } from './TableNavigator';

const previewTabClassName =
  'rounded-lg px-3 py-1.5 text-base font-medium text-muted-foreground outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/60 data-[state=active]:bg-workspace-control-active data-[state=active]:text-ink data-[state=active]:shadow-xs';

function DataPreview({
  datasetId,
  model,
  profile,
  pageSize,
  onPageSizeChange,
}: {
  datasetId: string;
  model: DatasetDetail['schema']['models'][number];
  profile: DatasetDetail['profile']['models'][number] | undefined;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}) {
  const [offset, setOffset] = useState(0);
  const [retry, setRetry] = useState(0);
  const [preview, setPreview] = useState<{
    offset: number;
    rows: Record<string, unknown>[];
    error: string;
  } | null>(null);
  const loading = preview?.offset !== offset;
  const rows = !loading && preview ? preview.rows.slice(0, pageSize) : [];
  const error = !loading ? preview?.error : '';
  const hasMore = !loading && !!preview && preview.rows.length > pageSize;

  useEffect(() => {
    let live = true;
    window.workbench
      .datasetPreview(datasetId, model.name, { offset, limit: pageSize })
      .then((rows) => {
        if (live) setPreview({ offset, rows, error: '' });
      })
      .catch((cause) => {
        if (live) setPreview({ offset, rows: [], error: errorMessage(cause) });
      });
    return () => {
      live = false;
    };
  }, [datasetId, model.name, offset, pageSize, retry]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <DataGrid rows={rows} columns={model.columns} profile={profile} resetKey={offset} />
        {loading ? (
          <div
            className="absolute inset-0 grid place-items-center bg-preview-surface text-sm text-muted-foreground"
            role="status"
          >
            正在读取数据…
          </div>
        ) : error ? (
          <div className="absolute inset-0 grid place-content-center justify-items-center gap-3 bg-preview-surface p-4 text-center text-sm">
            <p className="m-0 text-danger">{error}</p>
            <Button
              onClick={() => {
                setPreview(null);
                setRetry((value) => value + 1);
              }}
            >
              重试预览
            </Button>
          </div>
        ) : null}
      </div>
      <footer className="flex shrink-0 flex-wrap items-center gap-3 border-t border-ink/10 px-4 py-3 text-xs text-muted-foreground">
        <span className="mr-auto" aria-live="polite">
          {loading
            ? '正在读取…'
            : error
              ? '读取失败'
              : rows.length
                ? `第 ${offset + 1}–${offset + rows.length} 行${hasMore ? '' : ' · 已到末页'}`
                : offset
                  ? '本页暂无数据，可返回上一页'
                  : '暂无数据'}
        </span>
        <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
          <span title="排序只作用于已读取的当前页；数据变化或没有主键时，翻页结果可能变化。">
            仅排序当前页
          </span>
          <Select
            compact
            className="w-28 max-w-full [&>select]:border-transparent [&>select]:bg-workspace-control"
            aria-label="每页行数"
            value={String(pageSize)}
            onChange={(value) => onPageSizeChange(Number(value))}
            options={PREVIEW_PAGE_SIZES.map((size) => ({ value: String(size), label: `${size} 行 / 页` }))}
          />
          <Button
            variant="ghost"
            className="text-xs"
            disabled={loading || offset === 0}
            onClick={() => setOffset(Math.max(0, offset - pageSize))}
          >
            上一页
          </Button>
          <span>第 {offset / pageSize + 1} 页</span>
          <Button
            variant="ghost"
            className="text-xs"
            disabled={loading || !!error || !hasMore}
            onClick={() => setOffset(offset + pageSize)}
          >
            下一页
          </Button>
        </div>
      </footer>
    </div>
  );
}

export function DatasetPanel({ datasetId }: { datasetId: string }) {
  const [detail, setDetail] = useState<DatasetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [table, setTable] = useState('');
  const [{ compact, open: treeOpen }, setNavigation] = useState({ compact: true, open: false });
  const root = useRef<HTMLDivElement>(null);
  const treeToggle = useRef<HTMLButtonElement>(null);
  const treeId = useId();
  const [fieldSearch, setFieldSearch] = useState('');
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PREVIEW_PAGE_SIZE);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    window.workbench
      .datasetGet(datasetId)
      .then((dataset) => {
        if (!live) return;
        if (!dataset) {
          setError('数据源不存在或已删除。');
          return;
        }
        setDetail(dataset);
        setDescription(dataset.semantic.description ?? '');
      })
      .catch((cause) => {
        if (live) setError(errorMessage(cause));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [datasetId]);

  useEffect(() => {
    if (!root.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const compact = entry.contentRect.width < 640;
      setNavigation((current) => (current.compact === compact ? current : { compact, open: !compact }));
    });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, [loading, error]);

  const closeTree = () => {
    setNavigation((current) => ({ ...current, open: false }));
    treeToggle.current?.focus();
  };

  const saveSemantic = async () => {
    if (!detail || saving) return;
    setSaving(true);
    try {
      const semantic = { ...detail.semantic, description };
      await window.workbench.datasetSaveSemantic(datasetId, semantic);
      setDetail({ ...detail, semantic });
      toast.success('语义已保存');
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="grid h-full place-items-center text-muted-foreground">正在加载数据集…</div>;
  if (error) return <div className="grid h-full place-items-center p-6 text-center text-danger">{error}</div>;
  if (!detail) return null;
  const model = detail.schema.models.find((item) => item.name === table) ?? detail.schema.models[0];
  const columns = model?.columns ?? [];
  const multipleTables = detail.schema.models.length > 1;
  const showTree = multipleTables && treeOpen;
  const fields = columns.filter((column) =>
    column.name.toLocaleLowerCase().includes(fieldSearch.trim().toLocaleLowerCase()),
  );
  const primaryKey = typeof model?.primaryKey === 'string' ? [model.primaryKey] : (model?.primaryKey ?? []);
  const relationships =
    detail.schema.relationships?.filter((item) => model && item.models.includes(model.name)) ?? [];

  return (
    <Tabs.Root
      ref={root}
      defaultValue="data"
      onValueChange={() => {
        if (compact) setNavigation((current) => ({ ...current, open: false }));
      }}
      className="flex h-full min-h-0 min-w-0 flex-col"
    >
      <div className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-2">
        <Tabs.List aria-label="数据集信息" className="flex rounded-[10px] bg-workspace-control p-0.5">
          <Tabs.Trigger value="data" className={previewTabClassName}>
            数据
          </Tabs.Trigger>
          <Tabs.Trigger value="fields" className={previewTabClassName}>
            字段
          </Tabs.Trigger>
          <Tabs.Trigger value="semantic" className={previewTabClassName}>
            语义层
          </Tabs.Trigger>
        </Tabs.List>
        {multipleTables && (
          <button
            ref={treeToggle}
            type="button"
            aria-label={showTree ? '收起表结构' : '打开表结构'}
            aria-expanded={showTree}
            aria-controls={treeId}
            onClick={() => setNavigation((current) => ({ ...current, open: !current.open }))}
            className={clsx(
              'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-accent',
              showTree ? 'bg-accent-soft text-accent' : 'text-muted-foreground hover:bg-workspace-control',
            )}
          >
            <SidebarSimple size={16} />
            <span>{detail.schema.models.length} 张表</span>
          </button>
        )}
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {multipleTables && (
          <aside
            id={treeId}
            hidden={!showTree}
            aria-label="表结构"
            className={clsx(
              'flex min-h-0 min-w-0 flex-col hidden:hidden',
              compact ? 'w-full' : 'w-56 shrink-0 bg-workspace-control/55',
            )}
            onKeyDown={(event) => {
              if (compact && event.key === 'Escape') {
                event.preventDefault();
                closeTree();
              }
            }}
          >
            <TableNavigator
              models={detail.schema.models}
              selected={model?.name ?? ''}
              autoFocus={compact && showTree}
              onSelect={(name) => {
                setTable(name);
                setFieldSearch('');
                if (compact) closeTree();
              }}
            />
          </aside>
        )}
        <div hidden={compact && showTree} className="flex min-h-0 min-w-0 flex-1 flex-col hidden:hidden">
          <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-2 pb-3 text-xs text-muted-foreground">
            <div className="flex min-w-0 items-center gap-2">
              <Table size={14} className="shrink-0" />
              <span className="truncate text-base font-medium text-ink" title={model?.name}>
                {model?.name ?? '没有可预览的数据表'}
              </span>
            </div>
            {model && <span className="shrink-0">{columns.length} 个字段</span>}
          </div>
          <Tabs.Content value="data" className="flex min-h-0 flex-1 flex-col">
            {model && (
              <DataPreview
                key={JSON.stringify([model.name, pageSize])}
                datasetId={datasetId}
                model={model}
                profile={detail.profile.models.find((item) => item.name === model.name)}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
              />
            )}
          </Tabs.Content>
          <Tabs.Content value="fields" className="min-h-0 flex-1 overflow-auto px-4 pt-1 pb-4">
            <input
              aria-label="搜索字段"
              placeholder="搜索字段"
              value={fieldSearch}
              onChange={(event) => setFieldSearch(event.target.value)}
              className="mb-3 w-full rounded-lg bg-workspace-control px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            />
            <table className="w-full table-fixed border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left text-muted-foreground">
                  <th className="w-2/5 py-2 pr-3 font-medium">字段名</th>
                  <th className="w-2/5 py-2 pr-3 font-medium">数据类型</th>
                  <th className="py-2 font-medium">约束</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((column) => (
                  <tr key={column.name} className="border-b border-ink/7 last:border-0">
                    <td className="py-3 pr-3 text-base break-all">{column.name}</td>
                    <td className="py-3 pr-3 break-all text-muted-foreground">{column.type}</td>
                    <td className="py-3 text-muted-foreground">
                      {[primaryKey.includes(column.name) && '主键', column.notNull && '非空']
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!fields.length && <p className="text-sm text-muted-foreground">没有匹配的字段</p>}
            {!!relationships.length && (
              <section className="mt-5 text-sm">
                <h3 className="text-sm font-medium">外键关系</h3>
                <ul className="space-y-2 pl-4">
                  {relationships.map((relation) => (
                    <li key={relation.name}>
                      <span>{relation.name}</span>
                      <code className="mt-1 block break-all text-sm text-muted-foreground">{relation.condition}</code>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </Tabs.Content>
          <Tabs.Content value="semantic" className="min-h-0 flex-1 overflow-auto p-5">
            <label className="grid gap-2 text-base">
              数据集业务说明
              <textarea
                className="min-h-48 resize-none rounded-xl bg-workspace-control p-3 text-base leading-6 outline-none focus:bg-accent-soft"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="描述数据集中的业务概念、字段含义和分析注意事项…"
              />
            </label>
            <Button className="mt-4" variant="primary" disabled={saving} onClick={() => void saveSemantic()}>
              {saving ? '保存中…' : '保存语义'}
            </Button>
          </Tabs.Content>
        </div>
      </div>
    </Tabs.Root>
  );
}
