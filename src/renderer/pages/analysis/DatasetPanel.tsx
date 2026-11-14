import { useEffect, useState } from 'react';
import { Tabs } from 'radix-ui';
import { toast } from 'sonner';
import { DEFAULT_PREFERENCES, PREVIEW_PAGE_SIZES } from '@shared/api';
import { Button } from '../../components/Button';
import { DataGrid } from '../../components/DataGrid';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [table, setTable] = useState('');
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
  }, [datasetId]);

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

  if (loading) return <div className="grid h-full place-items-center text-muted">正在加载数据集…</div>;
  if (error) return <div className="grid h-full place-items-center p-6 text-center text-danger">{error}</div>;
  if (!detail) return null;
  const model = detail.schema.models.find((item) => item.name === table) ?? detail.schema.models[0];
  const columns = model?.columns ?? [];

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
          <Select
            compact
            aria-label="选择数据表"
            value={model.name}
            onChange={setTable}
            options={detail.schema.models.map((item) => ({ value: item.name, label: item.name }))}
          />
        )}
      </div>
      <Tabs.Content value="data" className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2 text-xs text-muted">
          <span className="min-w-0 truncate">
            {model ? `${model.name} · ${columns.length} 个字段` : '没有可预览的数据表'}
          </span>
        </div>
        {model && (
          <DataPreview
            key={JSON.stringify([model.name, pageSize])}
            datasetId={datasetId}
            model={model}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
        )}
      </Tabs.Content>
      <Tabs.Content value="fields" className="min-h-0 flex-1 overflow-auto p-4">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted">
              <th className="py-2 font-medium">字段名</th>
              <th className="py-2 font-medium">数据类型</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((column) => (
              <tr key={column.name} className="border-b last:border-0">
                <td className="py-3">{column.name}</td>
                <td className="py-3 text-muted">{column.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Tabs.Content>
      <Tabs.Content value="semantic" className="min-h-0 flex-1 overflow-auto p-5">
        <label className="grid gap-2 text-sm">
          数据集业务说明
          <textarea
            className="min-h-48 resize-none rounded-xl bg-page p-3 text-sm leading-6 outline-none focus:bg-accent-soft"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="描述数据集中的业务概念、字段含义和分析注意事项…"
          />
        </label>
        <Button className="mt-4" variant="primary" disabled={saving} onClick={() => void saveSemantic()}>
          {saving ? '保存中…' : '保存语义'}
        </Button>
      </Tabs.Content>
    </Tabs.Root>
  );
}
