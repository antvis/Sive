import { Columns, Database, FileText, PencilSimple, Plus, Table, Trash } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { Modal } from '../../components/Modal';
import { DatasetSourceActions } from '../../components/DatasetSourceActions';
import type { DatasetSummary } from '../../types';
import { errorMessage } from '../../utils';
import { getDatasetSource } from '../../utils/dataSource';

function formatFileSize(value?: number) {
  if (value === undefined) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function DatasetCard({
  dataset,
  onOpen,
  onDelete,
}: {
  dataset: DatasetSummary;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [action, setAction] = useState<'rename' | 'delete' | null>(null);
  const [name, setName] = useState(dataset.name);
  const [busy, setBusy] = useState(false);
  const renameCancelled = useRef(false);
  const { icon: SourceIcon, label: sourceLabel } = getDatasetSource(dataset.sourceType);
  const stats = [
    dataset.localFile
      ? { label: '数据量', value: formatFileSize(dataset.fileSize), icon: FileText }
      : { label: '数据表', value: String(dataset.tableCount ?? 0), icon: Table },
    { label: '行数', value: dataset.rowCount?.toLocaleString('zh-CN') ?? '—', icon: Database },
    { label: '列数', value: dataset.columnCount.toLocaleString('zh-CN'), icon: Columns },
  ];

  const saveName = async () => {
    if (renameCancelled.current) {
      renameCancelled.current = false;
      return;
    }
    if (action !== 'rename' || busy) return;
    const nextName = name.trim();
    if (!nextName || nextName === dataset.name) {
      setName(dataset.name);
      setAction(null);
      return;
    }
    setBusy(true);
    try {
      await window.workbench.datasetRename(dataset.id, nextName);
      setAction(null);
      toast.success('数据源名称已修改');
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (action !== 'delete' || busy) return;
    setBusy(true);
    try {
      await window.workbench.datasetDelete(dataset.id);
      onDelete(dataset.id);
      setAction(null);
      toast.success('数据源已删除');
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      className="group cursor-pointer rounded-2xl bg-surface p-5 shadow-[0_3px_12px] shadow-ink/8 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px] hover:shadow-ink/10"
      onClick={() => onOpen(dataset.id)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#25804d14] text-[#25804d]">
            <SourceIcon size={26} weight="duotone" />
          </span>
          {action === 'rename' ? (
            <input
              className="min-w-0 flex-1 rounded-md bg-page px-2 py-1 text-base font-semibold outline-none focus:bg-accent-soft"
              value={name}
              disabled={busy}
              autoFocus
              onClick={(event) => event.stopPropagation()}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => void saveName()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) void saveName();
                if (e.key === 'Escape') {
                  renameCancelled.current = true;
                  setName(dataset.name);
                  setAction(null);
                }
              }}
              aria-label="数据源名称"
            />
          ) : (
            <button
              type="button"
              className="m-0 min-w-0 truncate text-left text-base font-semibold"
              onClick={(event) => {
                event.stopPropagation();
                onOpen(dataset.id);
              }}
            >
              {dataset.name}
            </button>
          )}
        </div>
        {action !== 'rename' && (
          <div className="flex shrink-0 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            <IconButton
              icon={PencilSimple}
              label={`重命名 ${dataset.name}`}
              onClick={(event) => {
                event.stopPropagation();
                renameCancelled.current = false;
                setName(dataset.name);
                setAction('rename');
              }}
            />
            <IconButton
              icon={Trash}
              label={`删除 ${dataset.name}`}
              onClick={(event) => {
                event.stopPropagation();
                setAction('delete');
              }}
            />
          </div>
        )}
      </div>
      <div className="mt-5 grid grid-cols-3 rounded-xl bg-page py-3">
        {stats.map(({ label, value, icon: StatIcon }) => (
          <div
            key={label}
            className="flex items-center justify-center gap-2 border-r border-line/60 px-2 last:border-0"
          >
            <StatIcon size={17} className="shrink-0 text-muted" />
            <div className="min-w-0">
              <strong className="block truncate text-sm font-medium text-muted">{value}</strong>
              <span className="mt-0.5 block text-[10px] text-muted/80">{label}</span>
            </div>
          </div>
        ))}
      </div>
      <footer className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-muted">
        <SourceIcon size={14} className="text-[#25804d]" aria-label={sourceLabel} />
        <span>
          {sourceLabel}
          {(dataset.tableCount ?? 0) > 1 ? ` · ${dataset.tableCount} 张表` : ''}
        </span>
        <span>更新于 {dataset.updatedAt.slice(0, 10)}</span>
        <div className="ml-auto">
          <DatasetSourceActions
            datasetId={dataset.id}
            sourceType={dataset.sourceType}
            localFile={dataset.localFile}
          />
        </div>
      </footer>
      {dataset.fileUnavailable && <p className="mt-2 mb-0 text-xs text-danger">文件不可用，请重新定位。</p>}
      <Modal
        open={action === 'delete'}
        onOpenChange={(open) => {
          if (!open && !busy) setAction(null);
        }}
        title="删除数据源"
        footer={
          <>
            <Button disabled={busy} onClick={() => setAction(null)}>
              取消
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => void remove()}>
              {busy ? '删除中…' : '删除'}
            </Button>
          </>
        }
      >
        <p className="m-0 leading-6 text-muted">确定删除“{dataset.name}”吗？删除后不再显示在数据源列表中。</p>
      </Modal>
    </article>
  );
}

export function DatasetsPage({
  datasets,
  onAdd,
  onOpen,
  onDelete,
}: {
  datasets: DatasetSummary[];
  onAdd: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(24);
  const footer = useRef<HTMLDivElement>(null);
  const filtered = useMemo(
    () =>
      datasets.filter((dataset) =>
        dataset.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
      ),
    [datasets, query],
  );
  const hasMore = visibleCount < filtered.length;

  useEffect(() => {
    const node = footer.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setVisibleCount((count) => count + 24);
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleCount, hasMore, query]);

  return (
    <div className="w-full px-6 pt-8 pb-12">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="m-0 text-[26px] leading-[1.35] font-semibold tracking-[-0.03em]">数据源</h1>
          <p className="mt-2 mb-0 text-muted">{datasets.length} 个已添加的数据源</p>
        </div>
        <Button variant="primary" onClick={onAdd}>
          <Plus size={16} />
          添加数据源
        </Button>
      </header>
      <div className="mt-6 flex items-center justify-between gap-4">
        <input
          type="search"
          aria-label="搜索数据源"
          placeholder="按名称搜索数据源…"
          className="w-72 max-w-full rounded-lg border bg-surface px-3 py-2 text-sm"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setVisibleCount(24);
          }}
        />
        <span className="text-xs text-muted">
          已显示 {Math.min(visibleCount, filtered.length)} / {filtered.length} 个
        </span>
      </div>
      <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
        {filtered.slice(0, visibleCount).map((dataset) => (
          <DatasetCard key={dataset.id} dataset={dataset} onOpen={onOpen} onDelete={onDelete} />
        ))}
      </div>
      {!filtered.length && (
        <p className="py-10 text-center text-sm text-muted">
          {datasets.length ? '没有匹配的数据源' : '还没有数据源，点击“添加数据源”开始。'}
        </p>
      )}
      {hasMore && (
        <div ref={footer} className="mt-6 flex justify-center">
          <Button onClick={() => setVisibleCount((count) => count + 24)}>显示更多数据源</Button>
        </div>
      )}
    </div>
  );
}
