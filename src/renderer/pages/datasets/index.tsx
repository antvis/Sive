import {
  Columns2Icon,
  DatabaseIcon,
  FileTextIcon,
  PlusIcon,
  SearchIcon,
  Table2Icon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { WorkspacePage } from '../../components/WorkspacePage';
import { Button } from '../../components/ui/button';
import { DataSourceLogo } from '../../components/DataSourceLogo';
import { Modal } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { SourceActions } from './SourceActions';
import type { DatasetSummary } from '../../types';
import { errorMessage } from '../../utils';
import { findDatasetSource } from '@shared/dataSource';

function formatFileSize(value?: number) {
  if (value === undefined) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function DatasetCard({
  dataset,
  onOpen,
}: {
  dataset: DatasetSummary;
  onOpen: (id: string) => void;
}) {
  const [action, setAction] = useState<'rename' | 'delete' | null>(null);
  const [name, setName] = useState(dataset.name);
  const [busy, setBusy] = useState(false);
  const renameCancelled = useRef(false);
  const source = findDatasetSource(dataset.sourceType);
  const sourceLabel = source?.label ?? dataset.sourceType;
  const stats = [
    dataset.localFile
      ? { label: '数据量', value: formatFileSize(dataset.fileSize), icon: FileTextIcon }
      : { label: '数据表', value: String(dataset.tableCount ?? 0), icon: Table2Icon },
    { label: '行数', value: dataset.rowCount?.toLocaleString('zh-CN') ?? '—', icon: DatabaseIcon },
    { label: '列数', value: dataset.columnCount.toLocaleString('zh-CN'), icon: Columns2Icon },
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
      setAction(null);
      toast.success('数据源已删除');
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="relative isolate rounded-2xl bg-page p-5 shadow-card transition-[box-shadow,translate] hover:shadow-card-raised motion-safe:hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface">
            <DataSourceLogo type={dataset.sourceType} size={26} />
          </span>
          {action === 'rename' ? (
            <input
              className="min-w-0 flex-1 rounded-md bg-page px-2 py-1 text-base font-semibold focus:bg-selected"
              value={name}
              disabled={busy}
              autoFocus
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
              className="m-0 min-w-0 truncate text-left text-lg font-semibold before:absolute before:inset-0 before:rounded-2xl"
              onClick={() => onOpen(dataset.id)}
            >
              {dataset.name}
            </button>
          )}
        </div>
        <SourceActions
          datasetId={dataset.id}
          datasetName={dataset.name}
          sourceType={dataset.sourceType}
          disabled={busy || action !== null}
          onRename={() => {
            renameCancelled.current = false;
            setName(dataset.name);
            setAction('rename');
          }}
          onDelete={() => setAction('delete')}
        />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-surface py-3">
        {stats.map(({ label, value, icon: StatIcon }) => (
          <div
            key={label}
            className="flex min-w-0 items-center justify-center gap-2 px-2"
          >
            <StatIcon size={17} className="shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <strong className="block truncate text-sm font-semibold text-ink tabular-nums">{value}</strong>
              <span className="mt-0.5 block text-xs text-muted-foreground">{label}</span>
            </div>
          </div>
        ))}
      </div>
      <footer className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>
          {sourceLabel}
          {(dataset.tableCount ?? 0) > 1 ? ` · ${dataset.tableCount} 张表` : ''}
        </span>
        <span>更新于 {dataset.updatedAt.slice(0, 10)}</span>
      </footer>
      {dataset.fileUnavailable && (
        <p className="mt-2 mb-0 text-sm text-danger">文件不可用，请检查原文件或重新导入。</p>
      )}
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
        <p className="m-0 leading-6 text-muted-foreground">确定删除“{dataset.name}”吗？删除后不再显示在数据源列表中。</p>
      </Modal>
    </article>
  );
}

export function DatasetsPage({
  datasets,
  onAdd,
  onOpen,
}: {
  datasets: DatasetSummary[];
  onAdd: () => void;
  onOpen: (id: string) => void;
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
    <WorkspacePage
      title="数据源"
      description={`${datasets.length} 个已添加的数据源`}
      action={
        <Button variant="primary" size="lg" onClick={onAdd}>
          <PlusIcon size={16} />
          添加数据源
        </Button>
      }
    >
      <div className="mt-10 flex items-center justify-between gap-4">
        <div className="relative w-72 min-w-0 max-w-full">
          <SearchIcon size={15} aria-hidden className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="搜索数据源"
            placeholder="按名称搜索数据源…"
            className="ps-9"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleCount(24);
            }}
          />
        </div>
        {(query.trim() || hasMore) && (
          <span className="text-xs text-muted-foreground">
            已显示 {Math.min(visibleCount, filtered.length)} / {filtered.length} 个
          </span>
        )}
      </div>
      <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4">
        {filtered.slice(0, visibleCount).map((dataset) => (
          <DatasetCard key={dataset.id} dataset={dataset} onOpen={onOpen} />
        ))}
      </div>
      {!filtered.length && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {datasets.length ? '没有匹配的数据源' : '还没有数据源，点击“添加数据源”开始。'}
        </p>
      )}
      {hasMore && (
        <div ref={footer} className="mt-6 flex justify-center">
          <Button onClick={() => setVisibleCount((count) => count + 24)}>显示更多数据源</Button>
        </div>
      )}
    </WorkspacePage>
  );
}
