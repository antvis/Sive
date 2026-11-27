import { useI18n } from '../../i18n';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useEffect, useId, useRef, useState } from 'react';
import { PanelLeftIcon, Table2Icon } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { DEFAULT_PREVIEW_PAGE_SIZE, PREVIEW_PAGE_SIZES } from '@shared/api';
import { Button } from '../../components/ui/button';
import { ButtonGroup, ButtonGroupText } from '../../components/ui/button-group';
import { DataGrid } from '../../components/DataGrid';
import { Input } from '../../components/ui/input';
import { SelectField } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import type { DatasetDetail } from '../../types';
import { errorMessage } from '../../utils';
import { TableNavigator } from './TableNavigator';

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
  const i18n = useI18n();
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
            className="absolute inset-0 grid place-items-center bg-surface text-sm text-muted-foreground"
            role="status"
          >
            {i18n('datasetPreview.loadingData')}
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
              {i18n('datasetPreview.actions.retry')}
            </Button>
          </div>
        ) : null}
      </div>
      <footer className="flex shrink-0 flex-wrap items-center gap-3 border-t border-ink/10 px-4 py-3 text-xs text-muted-foreground">
        <span className="mr-auto" aria-live="polite">
          {loading
            ? i18n('datasetPreview.pagination.loading')
            : error
              ? i18n('datasetPreview.pagination.failed')
              : rows.length
                ? i18n('datasetPreview.pagination.rowRange', [
                    offset + 1,
                    offset + rows.length,
                    hasMore ? '' : i18n('datasetPreview.pagination.lastPageSuffix'),
                  ])
                : offset
                  ? i18n('datasetPreview.pagination.emptyPage')
                  : i18n('common.empty.noData')}
        </span>
        <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
          <span title={i18n('datasetPreview.sort.description')}>
            {i18n('datasetPreview.sort.currentPage')}
          </span>
          <SelectField
            className="w-28 max-w-full"
            aria-label={i18n('datasetPreview.pagination.pageSizeLabel')}
            value={String(pageSize)}
            onChange={(value) => onPageSizeChange(Number(value))}
            options={PREVIEW_PAGE_SIZES.map((size) => ({
              value: String(size),
              label: i18n('datasetPreview.pagination.pageSizeOption', [size]),
            }))}
          />
          <ButtonGroup aria-label={i18n('datasetPreview.pagination.label')}>
            <Button
              variant="ghost"
              size="sm"
              disabled={loading || offset === 0}
              onClick={() => setOffset(Math.max(0, offset - pageSize))}
            >
              {i18n('datasetPreview.pagination.previous')}
            </Button>
            <ButtonGroupText>
              {i18n('datasetPreview.pagination.pageNumber', [offset / pageSize + 1])}
            </ButtonGroupText>
            <Button
              variant="ghost"
              size="sm"
              disabled={loading || !!error || !hasMore}
              onClick={() => setOffset(offset + pageSize)}
            >
              {i18n('datasetPreview.pagination.next')}
            </Button>
          </ButtonGroup>
        </div>
      </footer>
    </div>
  );
}

export function DatasetPanel({ datasetId }: { datasetId: string }) {
  const i18n = useI18n();
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
          setError(i18n('errors.dataset.notFound'));
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
  }, [i18n, datasetId]);

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
      toast.success(i18n('semantics.notifications.saved'));
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="grid h-full place-items-center text-muted-foreground">
        {i18n('datasetPreview.loadingDataset')}
      </div>
    );
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
    <Tabs
      ref={root}
      defaultValue="data"
      onValueChange={() => {
        if (compact) setNavigation((current) => ({ ...current, open: false }));
      }}
      className="flex h-full min-h-0 min-w-0 flex-col"
    >
      <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-2 px-4 py-2">
        {multipleTables && (
          <Button
            ref={treeToggle}
            variant="ghost"
            aria-label={
              showTree
                ? i18n('datasetPreview.actions.collapseSchema')
                : i18n('datasetPreview.actions.openSchema')
            }
            aria-expanded={showTree}
            aria-controls={treeId}
            onClick={() => setNavigation((current) => ({ ...current, open: !current.open }))}
          >
            <PanelLeftIcon size={16} />
            <span>{i18n('profile.summary.tableCount', [detail.schema.models.length])}</span>
          </Button>
        )}
        <TabsList aria-label={i18n('datasetPreview.info.title')}>
          <TabsTrigger value="data">{i18n('common.labels.data')}</TabsTrigger>
          <TabsTrigger value="fields">{i18n('common.labels.columns')}</TabsTrigger>
          <TabsTrigger value="semantic">{i18n('datasetPreview.tabs.semantics')}</TabsTrigger>
        </TabsList>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {multipleTables && (
          <aside
            id={treeId}
            hidden={!showTree}
            aria-label={i18n('datasetPreview.tabs.schema')}
            className={clsx(
              'flex min-h-0 min-w-0 flex-col hidden:hidden',
              compact ? 'w-full' : 'w-56 shrink-0 border-e border-line',
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
              <Table2Icon size={14} className="shrink-0" />
              <span className="truncate text-base font-medium text-ink" title={model?.name}>
                {model?.name ?? i18n('datasetPreview.empty.tables')}
              </span>
            </div>
            {model && (
              <span className="shrink-0">{i18n('profile.summary.columnCount', [columns.length])}</span>
            )}
          </div>
          <TabsContent value="data" className="flex min-h-0 flex-1 flex-col">
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
          </TabsContent>
          <TabsContent value="fields" className="min-h-0 flex-1 overflow-auto px-4 pt-1 pb-4">
            <Input
              aria-label={i18n('datasetPreview.search.columns')}
              placeholder={i18n('datasetPreview.search.columns')}
              value={fieldSearch}
              onChange={(event) => setFieldSearch(event.target.value)}
              className="mb-3"
            />
            <table className="w-full table-fixed border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left text-muted-foreground">
                  <th className="w-2/5 py-2 pr-3 font-medium">{i18n('schema.columns.name')}</th>
                  <th className="w-2/5 py-2 pr-3 font-medium">{i18n('schema.columns.dataType')}</th>
                  <th className="py-2 font-medium">{i18n('schema.columns.constraints')}</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((column) => (
                  <tr key={column.name} className="border-b border-ink/7 last:border-0">
                    <td className="py-3 pr-3 text-base break-all">{column.name}</td>
                    <td className="py-3 pr-3 break-all text-muted-foreground">{column.type}</td>
                    <td className="py-3 text-muted-foreground">
                      {[
                        primaryKey.includes(column.name) && i18n('schema.columns.primaryKey'),
                        column.notNull && i18n('schema.columns.notNull'),
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!fields.length && (
              <p className="text-sm text-muted-foreground">{i18n('datasetPreview.empty.columnSearch')}</p>
            )}
            {!!relationships.length && (
              <section className="mt-5 text-sm">
                <h3 className="text-sm font-medium">{i18n('schema.relationships.foreignKeys')}</h3>
                <ul className="space-y-2 pl-4">
                  {relationships.map((relation) => (
                    <li key={relation.name}>
                      <span>{relation.name}</span>
                      <code className="mt-1 block break-all text-sm text-muted-foreground">
                        {relation.condition}
                      </code>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </TabsContent>
          <TabsContent value="semantic" className="min-h-0 flex-1 overflow-auto p-5">
            <label className="grid gap-2 text-base">
              {i18n('semantics.editor.label')}
              <Textarea
                className="field-sizing-fixed min-h-48 p-3 text-base leading-6"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={i18n('semantics.editor.placeholder')}
              />
            </label>
            <Button className="mt-4" variant="primary" disabled={saving} onClick={() => void saveSemantic()}>
              {saving ? i18n('common.status.saving') : i18n('semantics.actions.save')}
            </Button>
          </TabsContent>
        </div>
      </div>
    </Tabs>
  );
}
