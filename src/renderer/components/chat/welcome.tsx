import { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { DataSourceLogo } from '../DataSourceLogo';

type ChatWelcomeHeaderProps = {
  datasetName: string;
  datasetSourceType: string;
  onOpenDatasetPreview: () => void;
  previewOpen: boolean;
  showModelNotice: boolean;
  error: string | undefined;
};

export function ChatWelcomeHeader({
  datasetName,
  datasetSourceType,
  onOpenDatasetPreview,
  previewOpen,
  showModelNotice,
  error,
}: ChatWelcomeHeaderProps) {
  return (
    <header
      className={cn(
        '@container/welcome isolate flex min-w-0 flex-col [--companion-height:clamp(64px,10vh,88px)] motion-safe:animate-fade-up',
        previewOpen ? 'items-start text-left' : 'items-center text-center',
      )}
    >
      <div className="mb-[10px] h-[calc(var(--companion-height)+24px)] w-full">
        {!previewOpen && <WelcomeCompanion />}
      </div>
      <h1 data-draft-slide className="flex max-w-full items-center text-[1.77rem]/[1.35] font-[650] tracking-[-0.025em] text-[light-dark(#0e1a2b,var(--ink))]">
        <span className="shrink-0">向</span>
        <button
          type="button"
          title={`预览数据源 ${datasetName}`}
          className={cn(
            'mx-[3px] inline-flex min-w-0 items-center gap-[6px] rounded-lg border border-[light-dark(#dbefff,#355876)] py-px ps-[6px] pe-[10px] text-left',
            'bg-linear-to-b from-surface to-[light-dark(#f0f9ff,#223648)] text-accent shadow-[0_2px_6px_-3px_#259de84d]',
            'hover:border-[light-dark(#bfe3ff,#5687a8)] hover:shadow-[0_8px_16px_-8px_#259de880] focus-visible:outline-2 focus-visible:outline-offset-2',
            'motion-safe:transition-[translate,rotate,border-color,box-shadow] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(.22,1,.36,1)] motion-safe:hover:-translate-y-[2px] motion-safe:hover:-rotate-1',
          )}
          onClick={onOpenDatasetPreview}
        >
          <DataSourceLogo type={datasetSourceType} size={18} />
          <span className="min-w-0 truncate">{datasetName}</span>
        </button>
        <span className="shrink-0">提问</span>
      </h1>
      <p data-draft-slide className="mt-[8px] min-h-[3lh] text-[1.04rem]/[1.55] font-light text-[light-dark(#687589,var(--muted-foreground))]">
        用自然语言探索数据中的趋势、差异和异常。
      </p>
      {showModelNotice && (
        <p data-draft-slide className="mt-3 text-sm text-muted-foreground">请先在设置中配置默认模型服务。</p>
      )}
      {error && (
        <p data-draft-slide role="alert" className="mt-3 max-w-full text-sm wrap-anywhere text-destructive">
          {error}
        </p>
      )}
    </header>
  );
}

const prompts = ['最近有什么变化？', '哪组差异最大？', '有没有异常值？', '画张图看看？'];

function WelcomeCompanion() {
  const companionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const companion = companionRef.current;
    if (!companion) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listeners = new AbortController();
    const { signal } = listeners;

    const resetGaze = () => companion.style.removeProperty('--companion-gaze');

    const trackPointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || reducedMotion.matches) return;

      const { left, top, width, height } = companion.getBoundingClientRect();
      const x = event.clientX - (left + width * 0.38);
      const y = event.clientY - (top + height * 0.48);
      const travel = (height * 0.035) / Math.max(72, Math.hypot(x, y));
      companion.style.setProperty('--companion-gaze', `translate(${x * travel}px, ${y * travel}px)`);
    };

    window.addEventListener('pointermove', trackPointer, { passive: true, signal });
    window.addEventListener('blur', resetGaze, { signal });
    document.documentElement.addEventListener('pointerleave', resetGaze, { signal });
    reducedMotion.addEventListener('change', resetGaze, { signal });
    return () => listeners.abort();
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative mx-auto flex w-full max-w-[300px] justify-center pt-[24px] select-none"
    >
      <div ref={companionRef} className="group/companion pointer-events-auto">
        <div className="pointer-events-none motion-safe:animate-draft-companion-enter">
          <div
            className={cn(
              'relative origin-[50%_78%] drop-shadow-[0_9px_12px_#07589532] group-hover/companion:drop-shadow-[0_12px_15px_#209fe84d]',
              'motion-safe:animate-draft-companion-idle motion-safe:transition-[translate,scale,filter] motion-safe:duration-250 motion-safe:ease-out motion-safe:group-hover/companion:-translate-y-1 motion-safe:group-hover/companion:scale-[1.045]',
            )}
          >
            <img
              src="./illustrations/draft-companion.png"
              alt=""
              width={288}
              height={259}
              draggable={false}
              className="h-(--companion-height) w-auto"
            />
            {[
              {
                position: 'left-[27.7%] top-[47.7%]',
                skin: 'bg-[image:linear-gradient(135deg,#f7f0ed,#ece6e4)]',
                iris: 'bg-[image:linear-gradient(125deg,#797376,#47434a_78%)]',
              },
              {
                position: 'left-[48.1%] top-[48.9%]',
                skin: 'bg-[image:linear-gradient(135deg,#e7e2e4,#ddd8dc)]',
                iris: 'bg-[image:linear-gradient(125deg,#757177,#35343f_78%)]',
              },
            ].map(({ position, skin, iris }) => (
              <span key={position} className={cn('absolute h-[13%] w-[9%] -translate-1/2', position)}>
                <span
                  className={cn('absolute inset-0 mask-[radial-gradient(ellipse_farthest-side,#000_80%,transparent)]', skin)}
                />
                <span
                  className={cn(
                    'absolute top-1/2 left-1/2 h-[68%] w-[44%] -translate-1/2 rotate-[5deg] rounded-full [transform:var(--companion-gaze,none)] motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out',
                    iris,
                  )}
                />
              </span>
            ))}
          </div>
        </div>
      </div>
      {prompts.map((text, index) => (
        <p
          key={text}
          style={{ animationDelay: `${700 + index * 3800}ms` }}
          className={cn(
            'absolute top-[14px] right-0 max-w-full origin-bottom-left rounded-[12px_12px_12px_4px] border border-[light-dark(#dbefff,#355876)] bg-[light-dark(#fffffff2,#35485f)] px-[11px] py-[6px] text-sm font-medium text-[light-dark(#13578a,#e8f5ff)] opacity-0 shadow-[0_6px_18px_-8px_#2493d959] @max-[310px]/welcome:top-0',
            'motion-safe:animate-draft-companion-bubble motion-reduce:first-of-type:opacity-100',
          )}
        >
          {text}
        </p>
      ))}
    </div>
  );
}
