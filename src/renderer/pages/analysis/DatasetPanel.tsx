import { useEffect, useState } from 'react';
import { Tabs } from 'radix-ui';
import { toast } from 'sonner';
import { DEFAULT_PREFERENCES, PREVIEW_PAGE_SIZES } from '@shared/api';
import { Button } from '../../components/Button';
import { DataGrid } from '../../components/DataGrid';
import { DatasetSourceActions } from '../../components/DatasetSourceActions';
import { Select } from '../../components/Select';
import type { DatasetDetail, Preferences } from '../../types';
import { errorMessage } from '../../utils';

function DataPreview({
  datasetId,
  model,
  pageSize,
  onPageSizeChange,
}: {
  datasetId: string;
  model: DatasetDetail['schema']['models'][number];
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
        <DataGrid rows={rows} columns={model.columns} resetKey={offset} />
        {loading ? (
          <div
            className="absolute inset-0 grid place-items-center bg-surface text-sm text-muted"
            role="status"
          >
            正在读取数据…
          </div>
        ) : error ? (
          <div className="absolute inset-0 grid place-content-center justify-items-center gap-3 bg-surface p-4 text-center text-sm">
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
      <footer className="flex shrink-0 flex-wrap items-center gap-3 border-t px-4 py-3 text-xs text-muted">
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
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span title="排序只作用于已读取的当前页；数据变化或没有主键时，翻页结果可能变化。">
            仅排序当前页
          </span>
          <Select
            compact
            className="w-28"
            aria-label="每页行数"
            value={String(pageSize)}
            onChange={(value) => onPageSizeChange(Number(value))}
            options={PREVIEW_PAGE_SIZES.map((size) => ({ value: String(size), label: `${size} 行 / 页` }))}
          />
          <Button
            disabled={loading || offset === 0}
            onClick={() => setOffset(Math.max(0, offset - pageSize))}
          >
            上一页
          </Button>
          <span>第 {offset / pageSize + 1} 页</span>
          <Button disabled={loading || !!error || !hasMore} onClick={() => setOffset(offset + pageSize)}>
            下一页
          </Button>
        </div>
      </footer>
    </div>
  );
}

export function DatasetPanel({
  datasetId,
  defaultPageSize = DEFAULT_PREFERENCES.previewPageSize,
}: {
  datasetId: string;
  defaultPageSize?: Preferences['previewPageSize'];
}) {
  const [detail, setDetail] = useState<DatasetDetail | null>(null);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [table, setTable] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [fieldSearch, setFieldSearch] = useState('');
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);

  useEffect(() => {
    setPageSize(defaultPageSize);
  }, [defaultPageSize]);

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
  }, [datasetId, reload]);

  const saveSemantic = async () => {
    if (!detail || saving || description === (detail.semantic.description ?? '')) return;
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

  if (loading) return <div className="grid h-full place-items-center text-muted">正在加载数据集…</div>;
  if (error) return <div className="grid h-full place-items-center p-6 text-center text-danger">{error}</div>;
  if (!detail) return null;
  const model = detail.schema.models.find((item) => item.name === table) ?? detail.schema.models[0];
  const columns = model?.columns ?? [];
  const tables = detail.schema.models.filter((item) =>
    item.name.toLocaleLowerCase().includes(tableSearch.trim().toLocaleLowerCase()),
  );
  const fields = columns.filter((column) =>
    column.name.toLocaleLowerCase().includes(fieldSearch.trim().toLocaleLowerCase()),
  );
  const primaryKey = typeof model?.primaryKey === 'string' ? [model.primaryKey] : (model?.primaryKey ?? []);
  const relationships =
    detail.schema.relationships?.filter((item) => model && item.models.includes(model.name)) ?? [];

  return (
    <Tabs.Root defaultValue="data" className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
        <Tabs.List aria-label="数据集信息" className="flex rounded-lg bg-page p-1">
          <Tabs.Trigger
            value="data"
            className="rounded-md px-3 py-1 text-xs text-muted data-[state=active]:bg-surface data-[state=active]:text-ink"
          >
            数据
          </Tabs.Trigger>
          <Tabs.Trigger
            value="fields"
            className="rounded-md px-3 py-1 text-xs text-muted data-[state=active]:bg-surface data-[state=active]:text-ink"
          >
            字段
          </Tabs.Trigger>
          <Tabs.Trigger
            value="semantic"
            className="rounded-md px-3 py-1 text-xs text-muted data-[state=active]:bg-surface data-[state=active]:text-ink"
          >
            语义层
          </Tabs.Trigger>
        </Tabs.List>
        {detail.schema.models.length > 1 && (
          <div className="flex min-w-0 items-center gap-2">
            <input
              aria-label="搜索数据表"
              placeholder="搜索数据表"
              value={tableSearch}
              onChange={(event) => setTableSearch(event.target.value)}
              className="w-28 rounded-md border bg-page px-2 py-1 text-xs outline-none focus:border-accent"
            />
            {tables.length ? (
              <Select
                compact
                aria-label="选择数据表"
                value={tables.some((item) => item.name === model.name) ? model.name : ''}
                onChange={(value) => {
                  if (value) setTable(value);
                }}
                options={[
                  ...(!tables.some((item) => item.name === model.name)
                    ? [{ value: '', label: '请选择数据表' }]
                    : []),
                  ...tables.map((item) => ({ value: item.name, label: item.name })),
                ]}
              />
            ) : (
              <span className="text-xs text-muted">无匹配数据表</span>
            )}
          </div>
        )}
      </div>
      <Tabs.Content value="data" className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2 text-xs text-muted">
          <span className="min-w-0 truncate">
            {model ? `${model.name} · ${columns.length} 个字段` : '没有可预览的数据表'}
          </span>
          <DatasetSourceActions
            datasetId={datasetId}
            sourceType={detail.sourceType}
            localFile={detail.localFile}
            onUpdated={() => setReload((value) => value + 1)}
          />
        </div>
        {model && (
          <DataPreview
            key={JSON.stringify([model.name, pageSize, reload])}
            datasetId={datasetId}
            model={model}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
        )}
      </Tabs.Content>
      <Tabs.Content value="fields" className="min-h-0 flex-1 overflow-auto p-4">
        <input
          aria-label="搜索字段"
          placeholder="搜索字段"
          value={fieldSearch}
          onChange={(event) => setFieldSearch(event.target.value)}
          className="mb-3 w-full rounded-lg border bg-page px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted">
              <th className="w-2/5 py-2 pr-3 font-medium">字段名</th>
              <th className="w-2/5 py-2 pr-3 font-medium">数据类型</th>
              <th className="py-2 font-medium">约束</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((column) => (
              <tr key={column.name} className="border-b last:border-0">
                <td className="py-3 pr-3 break-all">{column.name}</td>
                <td className="py-3 pr-3 break-all text-muted">{column.type}</td>
                <td className="py-3 text-xs text-muted">
                  {[primaryKey.includes(column.name) && '主键', column.notNull && '非空']
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!fields.length && <p className="text-sm text-muted">没有匹配的字段</p>}
        {!!relationships.length && (
          <section className="mt-5 text-sm">
            <h3 className="text-sm font-medium">外键关系</h3>
            <ul className="space-y-2 pl-4">
              {relationships.map((relation) => (
                <li key={relation.name}>
                  <span>{relation.name}</span>
                  <code className="mt-1 block break-all text-xs text-muted">{relation.condition}</code>
                </li>
              ))}
            </ul>
          </section>
        )}
      </Tabs.Content>
      <Tabs.Content value="semantic" className="min-h-0 flex-1 overflow-auto p-5">
        <label className="grid gap-2 text-sm">
          数据集业务说明
          <textarea
            disabled={saving}
            className="min-h-48 resize-none rounded-xl bg-page p-3 text-sm leading-6 outline-none focus:bg-accent-soft"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="描述数据集中的业务概念、字段含义和分析注意事项…"
          />
        </label>
        <Button
          className="mt-4"
          variant="primary"
          disabled={saving || description === (detail.semantic.description ?? '')}
          onClick={() => void saveSemantic()}
        >
          {saving ? '保存中…' : '保存语义'}
        </Button>
      </Tabs.Content>
    </Tabs.Root>
  );
}
