import { i18n, useI18n } from '../../../i18n';
import type { MessageKey } from '@shared/i18n';
import type { Profile } from '@antv/ava';
import { ChartColumnIcon, CheckIcon, CircleDashedIcon } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { formatMetric } from '../../../utils';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Table } from '../../ui/table';
import { Collapsible, CollapsibleContent, CollapsibleRowTrigger } from '../../ui/collapsible';

type Model = Profile['models'][number];

const typeLabels = {
  get numeric() {
    return i18n('profile.types.numeric');
  },
  get string() {
    return i18n('profile.types.text');
  },
  get date() {
    return i18n('profile.types.date');
  },
  get boolean() {
    return i18n('profile.types.boolean');
  },
  get unknown() {
    return i18n('profile.types.other');
  },
};
const numericMetrics = [
  ['min', 'profile.metrics.minimum'],
  ['max', 'profile.metrics.maximum'],
  ['mean', 'profile.metrics.mean'],
] as const satisfies readonly (readonly [metric: string, labelKey: MessageKey])[];

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatRate(value: number | undefined) {
  return value === undefined ? '—' : `${(value * 100).toFixed(2)}%`;
}

function formatStatistic(value: unknown) {
  if (!isNumber(value)) return '—';
  return value !== 0 && Math.abs(value) < 0.01
    ? value.toLocaleString(i18n.locale, { maximumSignificantDigits: 4 })
    : formatMetric(value);
}

function summarize(model: Model) {
  const rowCount = isNumber(model.metrics.row_count) ? model.metrics.row_count : undefined;
  const known = model.columns.flatMap((column) => {
    const count = column.metrics.null_count;
    return isNumber(count) ? [{ name: column.name, count }] : [];
  });
  const nullFields = known.filter((field) => field.count > 0).sort((a, b) => b.count - a.count);
  const nullCount = known.reduce((total, field) => total + field.count, 0);
  const complete = model.columns.length > 0 && known.length === model.columns.length;
  const totalCells = rowCount === undefined ? undefined : rowCount * model.columns.length;
  const nullRate = complete && totalCells ? nullCount / totalCells : undefined;

  return { rowCount, knownCount: known.length, nullFields, nullCount, complete, nullRate };
}

function ProfileFields({ model, stats }: { model: Model; stats: ReturnType<typeof summarize> }) {
  useI18n();
  const [expandedNulls, setExpandedNulls] = useState(false);
  const [expandedNumbers, setExpandedNumbers] = useState(false);
  const nullFieldsId = useId();
  const numericFieldsId = useId();
  const fieldsRef = useRef<HTMLDivElement>(null);
  const nullFields = expandedNulls ? stats.nullFields : stats.nullFields.slice(0, 3);
  const numericColumns = model.columns.filter((column) => column.properties.logicalType === 'numeric');
  const numericFields = expandedNumbers ? numericColumns : numericColumns.slice(0, 5);
  const hasRows = stats.rowCount !== undefined && stats.rowCount > 0;

  const scrollToTable = () => {
    requestAnimationFrame(() => {
      fieldsRef.current
        ?.closest('[data-profile-table]')
        ?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  };

  if (!model.columns.length)
    return <p className="m-0 text-xs text-muted-foreground">{i18n('profile.empty.columns')}</p>;

  return (
    <div ref={fieldsRef} className="grid min-w-0 gap-4 pb-3">
      <div
        className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"
        aria-label={i18n('profile.types.title')}
      >
        {Object.entries(typeLabels).map(([type, label]) => {
          const count = model.columns.filter((column) => column.properties.logicalType === type).length;
          return count > 0 ? <span key={type}>{`${label} ${count}`}</span> : null;
        })}
      </div>
      <section
        className="min-w-0 rounded-lg bg-muted/50 p-3"
        aria-label={i18n('profile.nulls.overviewLabel', [model.name])}
      >
        <div className="mb-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h4 className="m-0 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <CircleDashedIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <span>{i18n('profile.nulls.overviewTitle')}</span>
          </h4>
          {stats.knownCount > 0 && (
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {!stats.complete
                ? i18n('profile.nulls.coverage', [stats.knownCount, model.columns.length])
                : stats.nullFields.length > 0
                  ? hasRows
                    ? i18n('profile.nulls.sortByRate')
                    : i18n('profile.nulls.sortByCount')
                  : null}
            </span>
          )}
        </div>
        {!stats.knownCount ? (
          <p className="m-0 text-xs text-muted-foreground">{i18n('profile.empty.nulls')}</p>
        ) : stats.nullFields.length ? (
          <>
            <p className="mt-0 mb-[9px] text-sm text-foreground/80">
              {i18n('profile.nulls.summary', [
                stats.nullFields.length,
                stats.complete ? i18n('profile.nulls.totalQualifier') : i18n('profile.nulls.knownQualifier'),
                formatMetric(stats.nullCount),
              ])}
            </p>
            <Table className="table-fixed" aria-label={i18n('profile.nulls.tableLabel', [model.name])}>
              <thead>
                <tr>
                  <th scope="col" className="w-[52%]">
                    {i18n('common.labels.columns')}
                  </th>
                  <th scope="col" className="w-[20%] text-right">
                    {i18n('profile.nulls.countLabel')}
                  </th>
                  <th scope="col" className="w-[28%] text-right">
                    {i18n('profile.nulls.columnShare')}
                  </th>
                </tr>
              </thead>
              <tbody id={nullFieldsId}>
                {nullFields.map((field) => {
                  const rate =
                    stats.rowCount !== undefined && stats.rowCount > 0
                      ? field.count / stats.rowCount
                      : undefined;

                  return (
                    <tr key={field.name}>
                      <td className="break-words">
                        <code>{field.name}</code>
                      </td>
                      <td className="text-right break-words tabular-nums">{formatMetric(field.count)}</td>
                      <td className="text-right tabular-nums">
                        <span className="flex items-center justify-end gap-2">
                          {rate !== undefined && (
                            <span
                              className="h-1 min-w-5 max-w-15 flex-1 overflow-hidden rounded-sm bg-muted/50 max-[520px]:hidden"
                              aria-hidden="true"
                            >
                              <span
                                className="block h-full bg-muted-foreground/70"
                                style={{ width: `${Math.min(100, rate * 100)}%` }}
                              />
                            </span>
                          )}
                          <span>{formatRate(rate)}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            {stats.nullFields.length > 3 && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="mt-[9px] mb-3"
                aria-expanded={expandedNulls}
                aria-controls={nullFieldsId}
                onClick={() => {
                  setExpandedNulls((value) => !value);
                  if (expandedNulls) scrollToTable();
                }}
              >
                {expandedNulls
                  ? i18n('profile.nulls.collapseColumns')
                  : i18n('profile.nulls.showRemainingColumns', [stats.nullFields.length - 3])}
              </Button>
            )}
          </>
        ) : (
          <p className="m-0 flex items-center gap-1.5 text-sm text-foreground/80">
            {stats.complete && <CheckIcon className="size-3.5" aria-hidden="true" />}
            {stats.complete
              ? i18n('profile.nulls.noneComplete', [model.columns.length])
              : i18n('profile.nulls.nonePartial', [stats.knownCount, model.columns.length])}
          </p>
        )}
      </section>
      {numericColumns.length > 0 && (
        <section
          className="min-w-0 rounded-lg bg-muted/50 p-3"
          aria-label={i18n('profile.numeric.tableLabel', [model.name])}
        >
          <div className="mb-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h4 className="m-0 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ChartColumnIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <span>{i18n('profile.numeric.title')}</span>
            </h4>
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {i18n('profile.numeric.columnCount', [numericColumns.length])}
            </span>
          </div>
          <Table
            className="table-fixed max-[520px]:block max-[520px]:[&_td]:border-b-0"
            aria-label={i18n('profile.numeric.tableLabel', [model.name])}
          >
            <thead className="max-[520px]:sr-only">
              <tr>
                <th scope="col" className="w-[43%]">
                  {i18n('common.labels.columns')}
                </th>
                {numericMetrics.map(([key, labelKey]) => (
                  <th key={key} scope="col" className="w-[19%] text-right">
                    {i18n(labelKey)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody id={numericFieldsId} className="max-[520px]:block">
              {numericFields.map((column) => (
                <tr
                  key={column.name}
                  className="max-[520px]:grid max-[520px]:grid-cols-3 max-[520px]:border-b max-[520px]:border-border max-[520px]:py-2"
                >
                  <td className="break-words max-[520px]:col-span-3">
                    <code>{column.name}</code>
                  </td>
                  {numericMetrics.map(([key, labelKey]) => {
                    const value = column.metrics[key];

                    return (
                      <td key={key} className="text-right break-words tabular-nums max-[520px]:text-left">
                        <span className="hidden text-xs text-muted-foreground max-[520px]:block">
                          {i18n(labelKey)}
                        </span>
                        <span title={isNumber(value) ? String(value) : undefined}>
                          {formatStatistic(value)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </Table>
          {numericColumns.length > 5 && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="mt-[9px] mb-3"
              aria-expanded={expandedNumbers}
              aria-controls={numericFieldsId}
              onClick={() => {
                setExpandedNumbers((value) => !value);
                if (expandedNumbers) scrollToTable();
              }}
            >
              {expandedNumbers
                ? i18n('profile.nulls.collapseColumns')
                : i18n('profile.nulls.showRemainingColumns', [numericColumns.length - 5])}
            </Button>
          )}
        </section>
      )}
    </div>
  );
}

export function ProfileTool({ profile: { models } }: { profile: Profile }) {
  useI18n();
  const [expandedModel, setExpandedModel] = useState<string>();
  const summaries = models.map(summarize);
  const columnCount = models.reduce((total, model) => total + model.columns.length, 0);
  const nullColumnCount = summaries.reduce((total, stats) => total + stats.nullFields.length, 0);
  const complete = summaries.every((stats) => stats.complete);

  if (!models.length)
    return <p className="m-0 text-sm leading-6 text-muted-foreground">{i18n('profile.empty.overview')}</p>;

  return (
    <div className="grid min-w-0 gap-4 text-sm leading-[1.6] text-foreground">
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary">{i18n('profile.summary.tableCount', [models.length])}</Badge>
        <Badge variant="secondary">{i18n('profile.summary.columnCount', [columnCount])}</Badge>
        <Badge variant="secondary">
          {!complete
            ? i18n('profile.nulls.incomplete')
            : nullColumnCount
              ? i18n('profile.nulls.columnsWithNulls', [nullColumnCount])
              : i18n('profile.nulls.none')}
        </Badge>
      </div>
      <div className="min-w-0 divide-y divide-border">
        {models.map((model, index) => {
          const stats = summaries[index];
          const heading = (
            <>
              <code className="min-w-0 break-words text-sm font-semibold">{model.name}</code>
              <span className="ml-auto text-xs text-muted-foreground">
                {stats.rowCount === undefined
                  ? i18n('profile.summary.rowCountUnavailable')
                  : i18n('profile.summary.rowCount', [formatMetric(stats.rowCount)])}
                {i18n('profile.summary.columnCountSuffix', [model.columns.length])}
              </span>
              <span
                className="shrink-0 text-xs text-muted-foreground max-[520px]:basis-full max-[520px]:pl-[22px]"
                title={i18n('profile.nulls.rateDescription')}
              >
                {stats.nullRate !== undefined
                  ? i18n('profile.nulls.rate', [formatRate(stats.nullRate)])
                  : stats.rowCount === 0
                    ? i18n('profile.summary.emptyTable')
                    : i18n('profile.nulls.rateUnavailable')}
              </span>
            </>
          );

          return models.length === 1 ? (
            <div key={model.name} data-profile-table={model.name} className="grid min-w-0 scroll-mt-4 gap-2">
              <div className="flex flex-wrap items-center gap-2 pb-1">{heading}</div>
              <ProfileFields model={model} stats={stats} />
            </div>
          ) : (
            <Collapsible
              key={model.name}
              data-profile-table={model.name}
              open={expandedModel === model.name}
              onOpenChange={(open) => setExpandedModel(open ? model.name : undefined)}
              className="scroll-mt-4"
            >
              <CollapsibleRowTrigger>{heading}</CollapsibleRowTrigger>
              <CollapsibleContent>
                <ProfileFields model={model} stats={stats} />
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
