import { useI18n } from '../../../i18n';
import { CalendarIcon, ChevronDownIcon, CheckIcon, TagIcon } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import type { SnippetTemplateProps } from '../index';
import { Button } from '../../ui/button';
import { AnalysisSource } from '../AnalysisSource';
import { Summary } from '../../Summary';
import { Visualization } from '../../Visualization';
import { getIntentIcon } from '../utils';

export default function PopTemplate({ data, createdAt, mode = 'view', card }: SnippetTemplateProps) {
  const i18n = useI18n();
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
    cancelEditing,
    saveEdits,
  } = card;
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
      <header className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
        <span
          className={twMerge(
            'inline-flex min-h-7 items-center gap-1.5 border-2 border-ink! px-2 py-1 text-xs tabular-nums [&_svg]:shrink-0',
            '-rotate-1 bg-[color-mix(in_srgb,var(--accent-soft)_25%,var(--surface))] font-semibold text-ink',
          )}
          title={i18n('snippet.categoryLabel', [data.intent])}
        >
          <IntentIcon size={13} aria-hidden className="text-accent" />
          {data.intent}
        </span>
        {data.tags.map((tag) => (
          <span
            key={tag}
            className={twMerge(
              'inline-flex min-h-7 items-center gap-1.5 border-2 border-ink! px-2 py-1 text-xs tabular-nums [&_svg]:shrink-0',
              'rotate-1 bg-[color-mix(in_srgb,var(--accent-soft)_65%,var(--surface))] font-medium text-muted-foreground',
            )}
          >
            <TagIcon size={13} aria-hidden />
            {tag}
          </span>
        ))}
      </header>
      {editing ? (
        <div className="mt-6 border-l-4 border-(--accent-secondary)! bg-accent-soft/40 py-2 pr-3 pl-4 focus-within:border-focus!">
          <label htmlFor={summaryId} className="text-xs font-medium text-muted-foreground">
            {i18n('snippet.insights.title')}
          </label>
          <textarea
            id={summaryId}
            className="mt-2 block field-sizing-content max-h-72 min-h-24 w-full resize-none border-0 bg-transparent p-0 text-base leading-relaxed text-pretty text-ink outline-none disabled:opacity-50"
            value={summary}
            disabled={busy}
            aria-label={i18n('snippet.editor.descriptionLabel')}
            placeholder={i18n('snippet.editor.descriptionPlaceholder')}
            onChange={(event) => setSummary(event.target.value)}
          />
        </div>
      ) : (
        data.summary.trim() && (
          <section
            aria-label={i18n('snippet.insights.title')}
            className="relative isolate mt-6 border-l-4 border-(--accent-secondary)! bg-[linear-gradient(100deg,color-mix(in_srgb,var(--accent-secondary)_6%,transparent),transparent_75%)] py-2 pr-3 pl-4"
          >
            <div
              className={
                'min-w-0 text-base leading-relaxed text-pretty tabular-nums [&_.gpt-vis-summary]:bg-transparent! [&_.gpt-vis-summary]:p-0! [&_.t8-p]:m-0! [&_.t8-p]:text-base! [&_.t8-p]:leading-relaxed!'
              }
            >
              <div
                id={summaryId}
                className={mode === 'export' || summaryExpanded ? undefined : 'line-clamp-3 max-h-[3lh]'}
              >
                <div ref={summaryRef}>
                  <Summary syntax={data.summary} />
                </div>
              </div>
              {mode !== 'export' && summaryOverflow && (
                <button
                  type="button"
                  aria-expanded={summaryExpanded}
                  aria-controls={summaryId}
                  onClick={() => setSummaryExpanded(!summaryExpanded)}
                  className={
                    'mt-2 inline-flex items-center gap-1 p-0 text-sm leading-5 text-muted-foreground hover:text-ink focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-focus'
                  }
                >
                  {summaryExpanded ? i18n('snippet.insights.collapse') : i18n('snippet.insights.expand')}
                  <ChevronDownIcon
                    size={12}
                    aria-hidden
                    className={summaryExpanded ? 'rotate-180' : undefined}
                  />
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
        <dl
          aria-label={i18n('snippet.metrics.title')}
          className="mt-6 grid grid-flow-col auto-cols-fr gap-4 bg-accent-soft p-4"
        >
          {data.metrics.map((metric, index) => (
            <div key={index} className="min-w-0">
              <dt className="text-xs leading-5 text-pretty text-muted-foreground">{metric.label}</dt>
              <dd className="m-0 mt-1 flex flex-wrap items-baseline gap-x-1 tabular-nums">
                <span className="text-2xl leading-8 font-black wrap-anywhere text-ink">{metric.value}</span>
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
          {i18n('snippet.chart.title')}
        </figcaption>
        <Visualization spec={chartSpec} height={360} />
      </figure>
      <div className="mt-5 border-2 border-ink! bg-accent-soft p-4 shadow-[4px_4px_0_var(--ink)]">
        {editing ? (
          <div>
            <label htmlFor={titleId} className="text-xs font-medium text-muted-foreground">
              {i18n('common.fields.title')}
            </label>
            <textarea
              id={titleId}
              className="mt-1 block field-sizing-content max-h-40 min-h-14 w-full resize-none border-0 border-b border-ink/25! bg-transparent px-0 py-2 text-xl leading-7 font-semibold text-balance text-ink outline-none focus:border-focus! disabled:opacity-50"
              value={title}
              disabled={busy}
              autoFocus
              aria-label={i18n('snippet.editor.titleLabel')}
              placeholder={i18n('snippet.editor.titlePlaceholder')}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
        ) : (
          <div
            id={titleId}
            role="heading"
            aria-level={3}
            className={twMerge(
              'line-clamp-2 max-h-14 text-xl leading-7 font-semibold break-words text-balance tabular-nums [&_.gpt-vis-summary]:bg-transparent! [&_.gpt-vis-summary]:p-0! [&_.t8-container]:text-xl! [&_.t8-p]:line-clamp-2 [&_.t8-p]:m-0! [&_.t8-p]:text-xl! [&_.t8-p]:leading-7! [&_.t8-p]:font-semibold!',
              mode === 'export' && 'line-clamp-none max-h-none [&_.t8-p]:line-clamp-none',
            )}
          >
            <Summary syntax={data.title} />
          </div>
        )}
        {!editing && subtitle && (
          <p
            className={twMerge(
              'mt-2 mb-0 line-clamp-2 max-w-[65ch] text-sm leading-5 text-pretty text-muted-foreground',
              mode === 'export' && 'line-clamp-none',
            )}
            title={subtitle}
          >
            {subtitle}
          </p>
        )}
      </div>
      {editing && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" className="h-9 rounded-none" disabled={busy} onClick={cancelEditing}>
            {i18n('common.actions.cancel')}
          </Button>
          <Button
            variant="neutral"
            className="h-9 rounded-none px-4"
            disabled={busy || !title.trim()}
            onClick={() => void saveEdits()}
          >
            <CheckIcon size={14} aria-hidden />
            {busy ? i18n('common.status.saving') : i18n('common.actions.saveChanges')}
          </Button>
        </div>
      )}
      <footer className="mt-3 flex items-start justify-between gap-4 border-t-2 border-ink! pt-3 text-xs text-muted-foreground">
        {mode === 'export' ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 leading-6">
            <span
              aria-hidden
              className="size-4 shrink-0 bg-current [mask:url('/sive.svg')_center/contain_no-repeat]"
            />
            <span>{i18n('snippet.export.attribution')}</span>
          </span>
        ) : (
          <AnalysisSource question={data.question} trace={data.trace} />
        )}
        {createdAt && (
          <time
            dateTime={createdAt}
            title={i18n('snippet.savedAt', [new Date(createdAt).toLocaleString(i18n.locale)])}
            className="ml-auto flex shrink-0 items-center gap-1.5 leading-6 tabular-nums"
          >
            <CalendarIcon size={13} aria-hidden />
            {new Date(createdAt).toLocaleDateString(i18n.locale, { month: 'short', day: 'numeric' })}
          </time>
        )}
      </footer>
    </article>
  );
}
