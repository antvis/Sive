import type { Profile } from '@antv/ava';
import { ChartColumnIcon, CheckIcon, CircleDashedIcon } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { formatMetric } from '../../../utils';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Table } from '../../ui/table';
import { Collapsible, CollapsibleContent, CollapsibleRowTrigger } from '../../ui/collapsible';

type Model = Profile['models'][number];

const typeLabels = { numeric: '数值', string: '文本', date: '日期', boolean: '布尔', unknown: '其他' };
const numericMetrics = [
  ['min', '最小值'],
  ['max', '最大值'],
  ['mean', '均值'],
] as const;
const moreClassName =
  'mt-[9px] mb-3 h-auto rounded-sm border-0 px-2 py-1 text-xs font-normal text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:no-underline focus-visible:ring-2 focus-visible:ring-ring';

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatRate(value: number | undefined) {
  return value === undefined ? '—' : `${(value * 100).toFixed(2)}%`;
}

function formatStatistic(value: unknown) {
  if (!isNumber(value)) return '—';
  return value !== 0 && Math.abs(value) < 0.01
    ? value.toLocaleString('zh-CN', { maximumSignificantDigits: 4 })
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

  if (!model.columns.length) return <p className="m-0 text-xs text-muted-foreground">未返回字段统计。</p>;

  return (
    <div ref={fieldsRef} className="grid min-w-0 gap-4 pb-3">
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-label="字段类型">
        {Object.entries(typeLabels).map(([type, label]) => {
          const count = model.columns.filter((column) => column.properties.logicalType === type).length;
          return count > 0 ? <span key={type}>{`${label} ${count}`}</span> : null;
        })}
      </div>
      <section className="min-w-0 rounded-lg bg-muted/50 p-3" aria-label={`${model.name} 的空值概况`}>
        <div className="mb-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h4 className="m-0 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <CircleDashedIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <span>空值概况</span>
          </h4>
          {stats.knownCount > 0 && (
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {!stats.complete
                ? `已统计 ${stats.knownCount}/${model.columns.length} 字段`
                : stats.nullFields.length > 0
                  ? hasRows
                    ? '按空值率从高到低'
                    : '按空值数从高到低'
                  : null}
            </span>
          )}
        </div>
        {!stats.knownCount ? (
          <p className="m-0 text-xs text-muted-foreground">未返回空值统计。</p>
        ) : stats.nullFields.length ? (
          <>
            <p className="mt-0 mb-[9px] text-sm text-foreground/80">
              {`${stats.nullFields.length} 个字段有空值 · ${stats.complete ? '共' : '已知'} ${formatMetric(stats.nullCount)} 个空单元格`}
            </p>
            <Table className="table-fixed text-sm" aria-label={`${model.name} 的空值统计`}>
              <thead>
                <tr>
                  <th scope="col" className="w-[52%]">
                    字段
                  </th>
                  <th scope="col" className="w-[20%] text-right">
                    空值数
                  </th>
                  <th scope="col" className="w-[28%] text-right">
                    占本列
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
                variant="link"
                size="xs"
                className={moreClassName}
                aria-expanded={expandedNulls}
                aria-controls={nullFieldsId}
                onClick={() => {
                  setExpandedNulls((value) => !value);
                  if (expandedNulls) scrollToTable();
                }}
              >
                {expandedNulls ? '收起字段' : `查看其余 ${stats.nullFields.length - 3} 个字段`}
              </Button>
            )}
          </>
        ) : (
          <p className="m-0 flex items-center gap-1.5 text-sm text-foreground/80">
            {stats.complete && <CheckIcon className="size-3.5" aria-hidden="true" />}
            {stats.complete
              ? `${model.columns.length} 个字段均未发现空值。`
              : `已统计 ${stats.knownCount}/${model.columns.length} 字段，未发现空值。`}
          </p>
        )}
      </section>
      {numericColumns.length > 0 && (
        <section className="min-w-0 rounded-lg bg-muted/50 p-3" aria-label={`${model.name} 的数值统计`}>
          <div className="mb-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h4 className="m-0 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ChartColumnIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <span>数值统计</span>
            </h4>
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {numericColumns.length} 个数值字段
            </span>
          </div>
          <Table
            className="table-fixed text-sm max-[520px]:block max-[520px]:[&_td]:border-b-0"
            aria-label={`${model.name} 的数值统计`}
          >
            <thead className="max-[520px]:sr-only">
              <tr>
                <th scope="col" className="w-[43%]">
                  字段
                </th>
                {numericMetrics.map(([key, label]) => (
                  <th key={key} scope="col" className="w-[19%] text-right">
                    {label}
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
                  {numericMetrics.map(([key, label]) => {
                    const value = column.metrics[key];

                    return (
                      <td key={key} className="text-right break-words tabular-nums max-[520px]:text-left">
                        <span className="hidden text-xs text-muted-foreground max-[520px]:block">
                          {label}
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
              variant="link"
              size="xs"
              className={moreClassName}
              aria-expanded={expandedNumbers}
              aria-controls={numericFieldsId}
              onClick={() => {
                setExpandedNumbers((value) => !value);
                if (expandedNumbers) scrollToTable();
              }}
            >
              {expandedNumbers ? '收起字段' : `查看其余 ${numericColumns.length - 5} 个字段`}
            </Button>
          )}
        </section>
      )}
    </div>
  );
}

export function ProfileTool({ profile: { models } }: { profile: Profile }) {
  const [expandedModel, setExpandedModel] = useState<string>();
  const summaries = models.map(summarize);
  const columnCount = models.reduce((total, model) => total + model.columns.length, 0);
  const nullColumnCount = summaries.reduce((total, stats) => total + stats.nullFields.length, 0);
  const complete = summaries.every((stats) => stats.complete);

  if (!models.length) return <p className="m-0 text-sm leading-6 text-muted-foreground">未返回数据概况。</p>;

  return (
    <div className="grid min-w-0 gap-4 text-sm leading-[1.6] text-foreground">
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary">{models.length} 张表</Badge>
        <Badge variant="secondary">{columnCount} 个字段</Badge>
        <Badge variant="secondary">
          {!complete ? '空值统计不完整' : nullColumnCount ? `${nullColumnCount} 个字段有空值` : '未发现空值'}
        </Badge>
      </div>
      <div className="min-w-0 divide-y divide-border">
        {models.map((model, index) => {
          const stats = summaries[index];
          const heading = (
            <>
              <code className="min-w-0 break-words text-sm font-semibold">{model.name}</code>
              <span className="ml-auto text-xs text-muted-foreground">
                {stats.rowCount === undefined ? '行数未返回' : `${formatMetric(stats.rowCount)} 行`}
                {` · ${model.columns.length} 个字段`}
              </span>
              <span
                className="shrink-0 text-xs text-muted-foreground max-[520px]:basis-full max-[520px]:pl-[22px]"
                title="空单元格数 ÷（本表行数 × 字段数）"
              >
                {stats.nullRate !== undefined
                  ? `空值率 ${formatRate(stats.nullRate)}`
                  : stats.rowCount === 0
                    ? '空表'
                    : '空值率未统计'}
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
              className="min-w-0 scroll-mt-4"
            >
              <CollapsibleRowTrigger>{heading}</CollapsibleRowTrigger>
              <CollapsibleContent className="min-w-0">
                <ProfileFields model={model} stats={stats} />
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
