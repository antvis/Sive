import { CalendarIcon, ChevronDownIcon, CheckIcon, QuoteIcon, TagIcon } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import type { SnippetTemplateProps } from '../index';
import { Button } from '../../ui/button';
import { AnalysisSource } from '../AnalysisSource';
import { Summary } from '../../Summary';
import { Visualization } from '../../Visualization';
import { getIntentIcon } from '../utils';

export default function CircuitTemplate({ data, createdAt, mode = 'view', card }: SnippetTemplateProps) {
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
      className="relative isolate h-fit w-full min-w-0 p-6 text-ink"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,#ffffff12_0_1px,transparent_1px_3px),linear-gradient(135deg,#b8c5d3,#4d6075_18%,#1d2b3d_45%,#60758b_78%,#a8b9c9)] [clip-path:polygon(0_0,calc(100%_-_16px)_0,100%_16px,100%_100%,16px_100%,0_calc(100%_-_16px))]">
          <div className="absolute inset-[2px] bg-surface bg-[linear-gradient(125deg,#ffffff06,transparent_40%)] shadow-[inset_0_1px_0_#ffffff0a,inset_0_-2px_4px_#0008] [clip-path:polygon(0_0,calc(100%_-_15px)_0,100%_15px,100%_100%,15px_100%,0_calc(100%_-_15px))]" />
        </div>
        <span className="absolute top-px left-8 h-px w-16 bg-accent/80" />
        <span className="absolute top-[7px] right-0 h-0.5 w-5 rotate-45 bg-accent/75" />
        <span className="absolute right-8 bottom-px h-px w-10 bg-accent/60" />
        <span className="absolute top-2 left-2 size-1.5 rounded-full bg-[linear-gradient(135deg,#9aaabd,#344456_55%,#121b27)] shadow-[0_1px_1px_#000,inset_0_1px_0_#ffffff40] after:absolute after:top-0.5 after:left-px after:h-px after:w-1 after:-rotate-45 after:bg-[#111b28]" />
        <span className="absolute right-2 bottom-2 size-1.5 rounded-full bg-[linear-gradient(135deg,#9aaabd,#344456_55%,#121b27)] shadow-[0_1px_1px_#000,inset_0_1px_0_#ffffff40] after:absolute after:top-0.5 after:left-px after:h-px after:w-1 after:-rotate-45 after:bg-[#111b28]" />
      </div>
      <header className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
        <span
          className={twMerge(
            'inline-flex min-h-7 items-center gap-1.5 rounded-sm border border-line! px-2 py-1 text-xs tabular-nums [&_svg]:shrink-0',
            'bg-[color-mix(in_srgb,var(--accent-soft)_25%,var(--surface))] font-semibold text-ink',
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
              'inline-flex min-h-7 items-center gap-1.5 rounded-sm border border-line! px-2 py-1 text-xs tabular-nums [&_svg]:shrink-0',
              'bg-[color-mix(in_srgb,var(--accent-soft)_65%,var(--surface))] font-medium text-accent',
            )}
          >
            <TagIcon size={13} aria-hidden />
            {tag}
          </span>
        ))}
      </header>
      <div className="mt-6">
        {editing ? (
          <div>
            <label htmlFor={titleId} className="text-xs font-medium text-muted-foreground">
              标题
            </label>
            <textarea
              id={titleId}
              className="mt-1 block field-sizing-content max-h-40 min-h-14 w-full resize-none border-0 border-b border-line! bg-transparent px-0 py-2 text-xl leading-7 font-semibold text-balance text-ink outline-none placeholder:text-muted-foreground focus:border-focus! disabled:opacity-50"
              value={title}
              disabled={busy}
              autoFocus
              aria-label="Snippet 标题"
              placeholder="为这份洞察起个标题"
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
      {data.metrics.length > 0 && (
        <dl
          aria-label="关键指标"
          className="mt-5 grid grid-flow-col auto-cols-fr gap-4 border-y border-line! py-4"
        >
          {data.metrics.map((metric, index) => (
            <div key={index} className="min-w-0">
              <dt className="text-xs leading-5 text-pretty text-muted-foreground">{metric.label}</dt>
              <dd className="m-0 mt-1 flex flex-wrap items-baseline gap-x-1 tabular-nums">
                <span className="text-2xl leading-8 font-medium wrap-anywhere text-accent">
                  {metric.value}
                </span>
                <span className="text-xs text-muted-foreground">{metric.unit}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}
      {editing ? (
        <div className="mt-5">
          <div className="rounded-sm border-l-2 border-accent/60! bg-accent/5 px-4 py-3 ring-1 ring-line/60 focus-within:ring-focus/50">
            <label htmlFor={summaryId} className="text-xs font-medium text-muted-foreground">
              关键洞察
            </label>
            <textarea
              id={summaryId}
              className="mt-2 block field-sizing-content max-h-72 min-h-24 w-full resize-none border-0 bg-transparent p-0 text-base leading-relaxed text-pretty text-ink outline-none placeholder:text-muted-foreground disabled:opacity-50"
              value={summary}
              disabled={busy}
              aria-label="Snippet 洞察描述"
              placeholder="记录数据里的关键发现…"
              onChange={(event) => setSummary(event.target.value)}
            />
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button variant="ghost" className="h-9 rounded-sm" disabled={busy} onClick={cancelEditing}>
              取消
            </Button>
            <Button
              variant="neutral"
              className="h-9 rounded-sm px-4 shadow-none"
              disabled={busy || !title.trim()}
              onClick={() => void saveEdits()}
            >
              <CheckIcon size={14} aria-hidden />
              {busy ? '保存中…' : '保存修改'}
            </Button>
          </div>
        </div>
      ) : (
        data.summary.trim() && (
          <section
            aria-label="关键洞察"
            className="relative isolate mt-5 rounded-md bg-[linear-gradient(110deg,color-mix(in_srgb,var(--accent)_7%,var(--surface)),var(--surface))] px-4 py-3"
          >
            <QuoteIcon
              size={48}
              fill="currentColor"
              stroke="none"
              aria-hidden
              className="pointer-events-none absolute top-1 right-2 -z-10 text-accent/7"
            />
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
                  {summaryExpanded ? '收起洞察' : '展开洞察'}
                  <ChevronDownIcon
                    size={12}
                    aria-hidden
                    className={summaryExpanded ? 'rotate-180' : undefined}
                  />
                </button>
              )}
            </div>
          </section>
        )
      )}
      {error && (
        <p role="alert" className="mt-3 mb-0 text-sm text-danger">
          {error}
        </p>
      )}
      <figure className="relative mx-0 mt-6 mb-0 min-w-0 border-y border-line/60! pt-3 pb-2">
        <figcaption className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="text-accent">图表分析</span>
          <span aria-hidden className="h-px flex-1 bg-line" />
          <svg viewBox="0 0 80 80" aria-hidden className="size-6 text-accent" fill="none">
            <path
              d="M4 40H20L29 14L43 66L54 30L62 40H76 M12 16V8H24 M56 72H68V64"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinejoin="round"
            />
          </svg>
        </figcaption>
        <div className="relative isolate min-w-0 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-[linear-gradient(to_right,var(--line)_1px,transparent_1px),linear-gradient(to_bottom,var(--line)_1px,transparent_1px)] before:bg-size-[28px_28px] before:opacity-15">
          <Visualization spec={chartSpec} height={360} />
        </div>
      </figure>
      <footer className="mt-3 flex items-start justify-between gap-4 border-t border-line/65! pt-3 text-xs text-muted-foreground">
        {mode === 'export' ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 leading-6">
            <span
              aria-hidden
              className="size-4 shrink-0 bg-current [mask:url('/sive.svg')_center/contain_no-repeat]"
            />
            <span>
              Made with <span className="font-semibold text-ink">Sive</span>
            </span>
          </span>
        ) : (
          <AnalysisSource question={data.question} trace={data.trace} />
        )}
        {createdAt && (
          <time
            dateTime={createdAt}
            title={`保存于 ${new Date(createdAt).toLocaleString('zh-CN')}`}
            className="ml-auto flex shrink-0 items-center gap-1.5 leading-6 tabular-nums"
          >
            <CalendarIcon size={13} aria-hidden />
            {new Date(createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
          </time>
        )}
      </footer>
    </article>
  );
}
