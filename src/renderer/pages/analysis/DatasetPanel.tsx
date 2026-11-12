import { useEffect, useState } from 'react';
import { Tabs } from 'radix-ui';
import { toast } from 'sonner';
import { Button } from '../../components/Button';
import type { DatasetDetail } from '../../types';
import { errorMessage } from '../../utils';

function cellText(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

export function DatasetPanel({ datasetId }: { datasetId: string }) {
  const [detail, setDetail] = useState<DatasetDetail | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    Promise.all([window.workbench.datasetGet(datasetId), window.workbench.datasetPreview(datasetId)])
      .then(([dataset, preview]) => {
        if (!live) return;
        if (!dataset) {
          setError('数据源不存在或已删除。');
          return;
        }
        setDetail(dataset);
        setDescription(dataset.semantic.description ?? '');
        setRows(preview);
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

  const columns = detail.schema.models[0]?.columns ?? [];

  return (
    <Tabs.Root defaultValue="data" className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center border-b px-4">
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
      </div>
      <Tabs.Content value="data" className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-surface">
              <tr>
                {columns.map((column) => (
                  <th key={column.name} className="border-b px-4 py-2 text-left font-medium text-muted">
                    {column.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="odd:bg-page/50 transition-colors hover:bg-accent-soft">
                  {columns.map((column) => (
                    <td
                      key={column.name}
                      className="max-w-60 truncate border-b px-4 py-2"
                      title={cellText(row[column.name])}
                    >
                      {cellText(row[column.name])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="shrink-0 border-t px-4 py-3 text-xs text-muted">最多预览前 100 行</footer>
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
