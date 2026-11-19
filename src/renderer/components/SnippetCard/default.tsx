import {
  ArrowsDownUp,
  CalendarBlank,
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
  LinkSimple,
  NotePencil,
  PencilSimple,
  PushPin,
  Ranking,
  SquaresFour,
  Table,
  Tag,
  TextAa,
  Trash,
  TreeStructure,
  WarningCircle,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import clsx from 'clsx';
import { useId, useMemo, useState } from 'react';
import type { SnippetTemplateProps } from './index';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { Select } from '../Select';
import { Summary } from '../Summary';
import { Visualization } from '../Visualization';
import { errorMessage } from '../../utils';

// The model supplies the intent; this map only selects its visual icon.
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

export default function DefaultTemplate({
  data,
  templateId,
  templates,
  createdAt,
  saved,
  onSave,
  onUpdate,
  onDelete,
}: SnippetTemplateProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(data.title);
  const [summary, setSummary] = useState(data.summary);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const titleId = useId();
  const IntentIcon = intentIcons.get(data.intent) ?? NotePencil;
  const subtitle = typeof data.spec !== 'string' ? data.spec.subtitle : undefined;
  const chartSpec = useMemo(
    () =>
      typeof data.spec === 'string'
        ? data.spec
        : {
            ...data.spec,
            title: undefined,
            subtitle: undefined,
            style: { ...data.spec.style, backgroundColor: 'transparent' },
          },
    [data.spec],
  );

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      return true;
    } catch (cause) {
      setError(errorMessage(cause));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      aria-labelledby={titleId}
      className="relative isolate h-fit w-full min-w-0 rounded-xl border border-[color-mix(in_srgb,var(--line)_85%,var(--surface))]! bg-surface bg-[linear-gradient(160deg,color-mix(in_srgb,var(--accent-soft)_20%,var(--surface)),var(--surface)_40%)] p-6 text-ink shadow-[0_3px_0_-1px_var(--surface),0_3px_0_var(--line),0_5px_8px_-5px_color-mix(in_srgb,var(--ink)_12%,transparent),0_18px_30px_-22px_color-mix(in_srgb,var(--ink)_28%,transparent)] before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-[url('/textures/paper-grain.svg')] before:opacity-[0.055]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-2.5 left-[calc(50%-42px)] h-[22px] w-[84px] -rotate-3 [border-inline:1px_dashed_color-mix(in_srgb,var(--accent)_22%,transparent)]! bg-[linear-gradient(110deg,color-mix(in_srgb,var(--accent-soft)_85%,transparent),color-mix(in_srgb,var(--accent)_20%,var(--accent-soft)))] shadow-[0_1px_2px_color-mix(in_srgb,var(--ink)_7%,transparent)] [clip-path:polygon(2%_0,98%_0,100%_18%,98%_34%,100%_54%,98%_75%,100%_100%,0_100%,2%_78%,0_57%,2%_36%,0_16%)] after:absolute after:inset-0 after:bg-[url('/textures/paper-grain.svg')] after:opacity-12 after:mix-blend-multiply"
      />
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
          <span
            className={clsx(
              chipClassName,
              '-rotate-1 bg-[color-mix(in_srgb,var(--accent-soft)_25%,var(--surface))] font-semibold text-ink',
            )}
            title={`分析类别：${data.intent}`}
          >
            <IntentIcon size={13} aria-hidden className="text-accent" />
            {data.intent}
          </span>
          {data.tags.map((tag) => (
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
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {onUpdate && !editing && (
            <>
              <Select
                aria-label="Snippet 模板"
                compact
                className="w-28"
                value={templateId}
                options={templates}
                disabled={busy}
                onChange={(value) => void run(() => onUpdate({ templateId: value }))}
              />
              <IconButton
                icon={PencilSimple}
                label="编辑 Snippet"
                disabled={busy}
                onClick={() => {
                  setTitle(data.title);
                  setSummary(data.summary);
                  setError('');
                  setEditing(true);
                }}
              />
            </>
          )}
          {onDelete && !editing && (
            <IconButton
              icon={Trash}
              label="删除 Snippet"
              disabled={busy}
              className="hover:text-danger"
              onClick={onDelete}
            />
          )}
          {onSave && (
            <IconButton
              icon={PushPin}
              weight={saved ? 'fill' : 'regular'}
              label={saved ? '已保存 Snippet' : busy ? '保存中…' : '保存 Snippet'}
              disabled={saved || busy}
              className={saved ? 'text-accent disabled:opacity-100' : undefined}
              onClick={() => void run(onSave)}
            />
          )}
        </div>
      </header>
      {editing ? (
        <input
          id={titleId}
          className="mt-4 w-full rounded-lg border bg-surface px-3 py-2 text-xl leading-7 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          value={title}
          disabled={busy}
          autoFocus
          aria-label="Snippet 标题"
          onChange={(event) => setTitle(event.target.value)}
        />
      ) : (
        <div
          id={titleId}
          role="heading"
          aria-level={3}
          className="mt-3 line-clamp-2 max-h-14 text-xl leading-7 font-semibold break-words text-balance tabular-nums [&_.gpt-vis-summary]:bg-transparent! [&_.gpt-vis-summary]:p-0! [&_.t8-container]:text-xl! [&_.t8-p]:line-clamp-2 [&_.t8-p]:m-0! [&_.t8-p]:text-xl! [&_.t8-p]:leading-7! [&_.t8-p]:font-semibold!"
        >
          <Summary syntax={data.title} />
        </div>
      )}
      {!editing && subtitle && (
        <p
          className="mt-2 mb-0 line-clamp-2 max-w-[65ch] text-xs leading-5 text-pretty text-muted"
          title={subtitle}
        >
          {subtitle}
        </p>
      )}
      {editing ? (
        <div className="mt-4">
          <textarea
            className="min-h-28 w-full resize-y rounded-lg border bg-surface p-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            value={summary}
            disabled={busy}
            aria-label="Snippet 洞察描述"
            onChange={(event) => setSummary(event.target.value)}
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setError('');
              }}
            >
              取消
            </Button>
            <Button
              variant="primary"
              disabled={busy || !title.trim()}
              onClick={async () => {
                if (onUpdate && (await run(() => onUpdate({ title: title.trim(), summary: summary.trim() }))))
                  setEditing(false);
              }}
            >
              {busy ? '保存中…' : '保存'}
            </Button>
          </div>
        </div>
      ) : (
        data.summary.trim() && (
          <div className="relative mt-5 rotate-[-0.35deg] rounded-md border border-[color-mix(in_srgb,var(--accent)_14%,var(--surface))]! bg-[linear-gradient(165deg,color-mix(in_srgb,var(--accent-soft)_90%,var(--surface)),color-mix(in_srgb,var(--accent-soft)_55%,var(--surface)))] p-4 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface)_65%,transparent),1px_4px_7px_-5px_color-mix(in_srgb,var(--ink)_22%,transparent)] after:pointer-events-none after:absolute after:-right-px after:-bottom-px after:size-4 after:rounded-[3px_0_5px] after:bg-[linear-gradient(135deg,transparent_48%,color-mix(in_srgb,var(--accent)_20%,var(--surface))_50%,var(--surface)_90%)]">
            <div className="mb-2 flex min-h-6 items-center gap-1.5 text-xs font-medium text-accent">
              <Lightbulb size={14} weight="duotone" aria-hidden />
              关键洞察
            </div>
            <div className="min-w-0 text-sm leading-7 text-pretty tabular-nums [&_.gpt-vis-summary]:bg-transparent! [&_.gpt-vis-summary]:p-0! [&_:is(.t8-metric\_value,.t8-delta\_value,.t8-ratio\_value)]:rounded-xs [&_:is(.t8-metric\_value,.t8-delta\_value,.t8-ratio\_value)]:bg-accent/8 [&_:is(.t8-metric\_value,.t8-delta\_value,.t8-ratio\_value)]:font-semibold [&_:is(.t8-metric\_value,.t8-delta\_value,.t8-ratio\_value)]:text-accent [&_:is(.t8-metric\_name,.t8-trend\_desc)]:font-semibold">
              <Summary syntax={data.summary} />
            </div>
          </div>
        )
      )}
      {error && (
        <p role="alert" className="mt-3 mb-0 text-sm text-danger">
          {error}
        </p>
      )}
      <figure className="relative mx-0 mt-5 mb-0 min-w-0 rounded-lg">
        <figcaption className="sr-only">图表分析</figcaption>
        <Visualization spec={chartSpec} height={360} />
      </figure>
      <footer className="mt-3 flex items-start justify-between gap-4 border-t border-line/65! pt-3 text-xs text-muted">
        <details className="group/source min-w-0 flex-1">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
            <LinkSimple size={13} aria-hidden />
            分析来源
            <CaretDown size={11} aria-hidden className="group-open/source:rotate-180" />
          </summary>
          <p className="mt-2 mb-0 leading-5 text-pretty wrap-anywhere">{data.question}</p>
        </details>
        {createdAt && (
          <time
            dateTime={createdAt}
            title={`保存于 ${new Date(createdAt).toLocaleString('zh-CN')}`}
            className="flex shrink-0 items-center gap-1.5 leading-6 tabular-nums"
          >
            <CalendarBlank size={13} aria-hidden />
            {new Date(createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
          </time>
        )}
      </footer>
    </article>
  );
}
