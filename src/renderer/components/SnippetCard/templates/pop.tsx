import { CalendarBlank, CaretDown, PencilSimple, PushPin, Tag, Trash } from '@phosphor-icons/react';
import { twMerge } from 'tailwind-merge';
import type { SnippetTemplateProps } from '../index';
import { Button } from '../../Button';
import { IconButton } from '../../IconButton';
import { AnalysisSource } from '../AnalysisSource';
import { TemplatePicker } from '../TemplatePicker';
import { Summary } from '../../Summary';
import { Visualization } from '../../Visualization';
import { useSnippetCard } from '../useSnippetCard';
import { getIntentIcon, titleClassName, summaryClassName, summaryToggleClassName } from '../utils';

const chipClassName =
  'inline-flex min-h-7 items-center gap-1.5 border-2 border-ink! px-2 py-1 text-xs tabular-nums [&_svg]:shrink-0';

export default function PopTemplate({
  data,
  templateId,
  templateButtonRef,
  templates,
  createdAt,
  saved,
  onSave,
  onUpdate,
  onDelete,
}: SnippetTemplateProps) {
  const {
    editing,
    title,
    setTitle,
    summary,
    setSummary,
    busy,
    error,
    titleId,
    summaryId,
    summaryRef,
    summaryExpanded,
    setSummaryExpanded,
    summaryOverflow,
    style,
    chartSpec,
    run,
    startEditing,
    cancelEditing,
    saveEdits,
  } = useSnippetCard(data, onUpdate);
  const IntentIcon = getIntentIcon(data.intent);
  const subtitle = typeof data.spec !== 'string' ? data.spec.subtitle : undefined;

  return (
    <article
      aria-labelledby={titleId}
      style={style}
      className="relative isolate h-fit w-full min-w-0 border-2 border-ink! bg-surface p-6 text-ink shadow-[3px_3px_0_var(--surface),4px_4px_0_var(--ink),7px_7px_0_color-mix(in_srgb,var(--accent)_65%,var(--surface)),8px_8px_0_var(--ink),0_14px_20px_-16px_#0006] before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-[url('/textures/paper-grain.svg')] before:opacity-[0.07]"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span className="absolute -top-0.5 left-7 h-1.5 w-16 border-x border-ink! bg-[repeating-linear-gradient(135deg,var(--ink)_0_1px,var(--accent-soft)_1px_5px)]" />
        <span className="absolute top-2 right-2 size-3 border-t border-r border-ink/70!" />
        <span className="absolute bottom-10 left-0 h-12 w-1 bg-accent" />
        <span className="absolute bottom-1 left-6 h-1 w-16 bg-[radial-gradient(circle,var(--ink)_0.75px,transparent_1px)] bg-size-[4px_4px] opacity-40" />
        <span className="absolute right-0 bottom-0 size-5 bg-[linear-gradient(135deg,transparent_46%,var(--ink)_48%,var(--accent-soft)_51%,var(--surface)_85%)]" />
      </div>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
          <span
            className={twMerge(
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
              className={twMerge(
                chipClassName,
                'rotate-1 bg-[color-mix(in_srgb,var(--accent-soft)_65%,var(--surface))] font-medium text-muted-foreground',
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
              <TemplatePicker
                buttonRef={templateButtonRef}
                value={templateId}
                templates={templates}
                disabled={busy}
                onChange={(value) => void run(() => onUpdate({ templateId: value }))}
              />
              <IconButton icon={PencilSimple} label="编辑 Snippet" disabled={busy} onClick={startEditing} />
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
        <div className="mt-4">
          <textarea
            className="min-h-28 w-full resize-y rounded-lg border bg-surface p-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            value={summary}
            disabled={busy}
            aria-label="Snippet 洞察描述"
            onChange={(event) => setSummary(event.target.value)}
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button disabled={busy} onClick={cancelEditing}>
              取消
            </Button>
            <Button variant="primary" disabled={busy || !title.trim()} onClick={() => void saveEdits()}>
              {busy ? '保存中…' : '保存'}
            </Button>
          </div>
        </div>
      ) : (
        data.summary.trim() && (
          <section
            aria-label="关键洞察"
            className="relative isolate mt-6 border-l-4 border-(--accent-secondary)! bg-[linear-gradient(100deg,color-mix(in_srgb,var(--accent-secondary)_6%,transparent),transparent_75%)] py-2 pr-3 pl-4"
          >
            <div className={summaryClassName}>
              <div id={summaryId} className={summaryExpanded ? undefined : 'line-clamp-3 max-h-[84px]'}>
                <div ref={summaryRef}>
                  <Summary syntax={data.summary} />
                </div>
              </div>
              {summaryOverflow && (
                <button
                  type="button"
                  aria-expanded={summaryExpanded}
                  aria-controls={summaryId}
                  onClick={() => setSummaryExpanded(!summaryExpanded)}
                  className={summaryToggleClassName}
                >
                  {summaryExpanded ? '收起洞察' : '展开洞察'}
                  <CaretDown size={12} aria-hidden className={summaryExpanded ? 'rotate-180' : undefined} />
                </button>
              )}
            </div>
            <svg
              viewBox="0 0 80 80"
              aria-hidden
              className="pointer-events-none absolute -top-2 right-2 -z-10 size-16 rotate-12 text-accent opacity-[0.22]"
            >
              <path
                d="M40 4L48 23L67 13L60 34L78 42L58 49L67 69L47 59L39 78L32 57L12 68L21 47L2 39L23 32L13 12L33 22Z"
                fill="currentColor"
                stroke="var(--ink)"
                strokeWidth="2"
              />
            </svg>
          </section>
        )
      )}
      {data.metrics.length > 0 && (
        <dl aria-label="关键指标" className="mt-6 grid grid-flow-col auto-cols-fr gap-4 bg-accent-soft p-4">
          {data.metrics.map((metric, index) => (
            <div key={index} className="min-w-0">
              <dt className="text-xs leading-5 text-pretty text-muted-foreground">{metric.label}</dt>
              <dd className="m-0 mt-1 flex flex-wrap items-baseline gap-x-1 tabular-nums">
                <span className="text-3xl leading-9 font-black wrap-anywhere text-ink">{metric.value}</span>
                <span className="text-xs text-muted-foreground">{metric.unit}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}
      {error && (
        <p role="alert" className="mt-3 mb-0 text-sm text-danger">
          {error}
        </p>
      )}
      <figure className="mx-0 mt-6 mb-0 min-w-0 border-t-2 border-ink! pt-4">
        <figcaption className="mb-2 flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <span className="inline-block size-2 bg-accent" aria-hidden />
          图表分析
        </figcaption>
        <Visualization spec={chartSpec} height={360} />
      </figure>
      <div className="mt-5 border-2 border-ink! bg-accent-soft p-4 shadow-[4px_4px_0_var(--ink)]">
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
          <div id={titleId} role="heading" aria-level={3} className={titleClassName}>
            <Summary syntax={data.title} />
          </div>
        )}
        {!editing && subtitle && (
          <p
            className="mt-2 mb-0 line-clamp-2 max-w-[65ch] text-xs leading-5 text-pretty text-muted-foreground"
            title={subtitle}
          >
            {subtitle}
          </p>
        )}
      </div>
      <footer className="mt-3 flex items-start justify-between gap-4 border-t-2 border-ink! pt-3 text-xs text-muted-foreground">
        <AnalysisSource question={data.question} trace={data.trace} />
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
