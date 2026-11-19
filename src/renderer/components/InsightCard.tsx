import {
  ArrowsDownUp,
  CaretDown,
  ChartBar,
  ChartBarHorizontal,
  ChartLineUp,
  ChartPieSlice,
  ChartPolar,
  ChartScatter,
  FlowArrow,
  Funnel,
  Gauge,
  Intersect,
  Lightbulb,
  NotePencil,
  Ranking,
  SquaresFour,
  Table,
  Tag,
  TextAa,
  TreeStructure,
  WarningCircle,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import clsx from 'clsx';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { InsightPresentation } from '@shared/insight';
import type { SnippetSpec } from '@shared/schema';
import { Button } from './Button';
import { InsightSummary } from './InsightSummary';
import { Visualization } from './Visualization';

// Presentation only: the model supplies the intent; unfamiliar intents keep the note icon.
const intentIcons = new Map<string, Icon>([
  ['趋势观察', ChartLineUp],
  ['分类比较', ChartBarHorizontal],
  ['排名分析', Ranking],
  ['多维比较', ChartPolar],
  ['占比分析', ChartPieSlice],
  ['阶段转化', Funnel],
  ['累计增减', ArrowsDownUp],
  ['进度观察', Gauge],
  ['分布分析', ChartBar],
  ['异常观察', WarningCircle],
  ['相关分析', ChartScatter],
  ['集合关系', Intersect],
  ['层级构成', TreeStructure],
  ['流向分析', FlowArrow],
  ['词频分析', TextAa],
  ['明细查阅', Table],
  ['数据概览', SquaresFour],
]);

const chipClassName =
  "relative isolate inline-flex min-h-[26px] items-center justify-center gap-[5px] rounded border border-dashed border-[color-mix(in_srgb,var(--accent)_30%,var(--surface))]! px-2 py-[3px] leading-[18px] tabular-nums shadow-[0_2px_3px_color-mix(in_srgb,var(--ink)_5%,transparent)] before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-[url('/textures/paper-grain.svg')] before:opacity-[0.055] [&_svg]:shrink-0";

export function HighlightedTitle({ text, highlights }: { text: string; highlights: string[] }) {
  const parts: ReactNode[] = [];
  let cursor = 0;
  const ranges = highlights
    .flatMap((highlight) => {
      const start = text.indexOf(highlight);
      return start < 0 || !highlight ? [] : [{ start, text: highlight }];
    })
    .sort((a, b) => a.start - b.start);
  for (const range of ranges) {
    if (range.start < cursor) continue;
    parts.push(text.slice(cursor, range.start));
    parts.push(
      <span
        key={range.start}
        className="font-semibold text-accent tabular-nums underline decoration-accent/16 decoration-[5px] -underline-offset-2 [text-decoration-skip-ink:none]"
      >
        {range.text}
      </span>,
    );
    cursor = range.start + range.text.length;
  }
  parts.push(text.slice(cursor));
  return parts;
}

export function InsightLabels({ presentation }: { presentation?: InsightPresentation }) {
  const intent = presentation?.intent ?? '数据笔记';
  const IntentIcon = intentIcons.get(intent) ?? NotePencil;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
      <span
        className={clsx(
          chipClassName,
          '-rotate-1 bg-[color-mix(in_srgb,var(--accent-soft)_25%,var(--surface))] font-semibold text-ink',
        )}
        title={`分析类别：${intent}`}
      >
        <IntentIcon size={13} aria-hidden className="text-accent" />
        {intent}
      </span>
      {presentation?.tags.map((tag) => (
        <span
          key={tag}
          className={clsx(
            chipClassName,
            'rotate-1 bg-[color-mix(in_srgb,var(--accent-soft)_65%,var(--surface))] font-medium text-accent',
          )}
        >
          <Tag size={13} aria-hidden />
          {tag}
        </span>
      ))}
    </div>
  );
}

export function InsightNote({ text, syntax }: { text: string; syntax?: string }) {
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [summaryOverflow, setSummaryOverflow] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const summaryId = useId();

  useEffect(() => {
    const content = summaryRef.current;
    if (!content) return;

    const measure = () => {
      if (!summaryExpanded) setSummaryOverflow(content.scrollHeight > content.clientHeight + 1);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    if (content.firstElementChild) observer.observe(content.firstElementChild);
    measure();

    return () => observer.disconnect();
  }, [text, syntax, summaryExpanded]);

  if (!text.trim()) return null;
  return (
    <div className="relative mt-5 rotate-[-0.35deg] rounded-md border border-[color-mix(in_srgb,var(--accent)_14%,var(--surface))]! bg-[linear-gradient(165deg,color-mix(in_srgb,var(--accent-soft)_90%,var(--surface)),color-mix(in_srgb,var(--accent-soft)_55%,var(--surface)))] p-4 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface)_65%,transparent),1px_4px_7px_-5px_color-mix(in_srgb,var(--ink)_22%,transparent)] after:pointer-events-none after:absolute after:-right-px after:-bottom-px after:size-4 after:rounded-[3px_0_5px] after:bg-[linear-gradient(135deg,transparent_48%,color-mix(in_srgb,var(--accent)_20%,var(--surface))_50%,var(--surface)_90%)] [&_.markdown-body_strong]:font-semibold [&_.markdown-body_strong]:underline [&_.markdown-body_strong]:decoration-accent/25 [&_.markdown-body_strong]:decoration-4 [&_.markdown-body_strong]:-underline-offset-2 [&_.markdown-body_strong]:[text-decoration-skip-ink:none]">
      <div className="mb-2 flex min-h-6 items-center justify-between gap-2 text-xs font-medium text-accent">
        <span className="flex items-center gap-1.5">
          <Lightbulb size={14} weight="duotone" aria-hidden />
          关键洞察
        </span>
        {summaryOverflow && (
          <Button
            variant="ghost"
            className="min-h-6! px-1 text-xs text-accent!"
            aria-expanded={summaryExpanded}
            aria-controls={summaryId}
            onClick={() => setSummaryExpanded((expanded) => !expanded)}
          >
            {summaryExpanded ? '收起' : '展开全文'}
            <CaretDown size={11} aria-hidden className={summaryExpanded ? 'rotate-180' : undefined} />
          </Button>
        )}
      </div>
      <div
        id={summaryId}
        ref={summaryRef}
        data-expanded={summaryExpanded}
        className="min-w-0 text-sm leading-7 text-pretty tabular-nums data-[expanded=false]:max-h-[84px] data-[expanded=false]:overflow-hidden [&_.gpt-vis-summary]:bg-transparent! [&_.gpt-vis-summary]:p-0! [&_.markdown-body]:leading-7! [&_:is(.t8-metric\_value,.t8-delta\_value,.t8-ratio\_value)]:rounded-xs [&_:is(.t8-metric\_value,.t8-delta\_value,.t8-ratio\_value)]:bg-accent/8 [&_:is(.t8-metric\_value,.t8-delta\_value,.t8-ratio\_value)]:font-semibold [&_:is(.t8-metric\_value,.t8-delta\_value,.t8-ratio\_value)]:text-accent [&_:is(.t8-metric\_name,.t8-trend\_desc)]:font-semibold"
      >
        <InsightSummary text={text} syntax={syntax} />
      </div>
    </div>
  );
}

export function InsightFigure({ spec }: { spec: SnippetSpec }) {
  const chartSpec = useMemo(
    () =>
      typeof spec === 'string'
        ? spec
        : {
            ...spec,
            title: undefined,
            subtitle: undefined,
            style: {
              ...spec.style,
              backgroundColor: 'transparent',
            },
          },
    [spec],
  );

  return (
    <figure className="relative mx-0 mt-5 mb-0 min-w-0 rounded-lg">
      <figcaption className="sr-only">
        {typeof spec !== 'string' && spec.title ? spec.title : '图表分析'}
      </figcaption>
      <Visualization spec={chartSpec} height={360} />
    </figure>
  );
}
