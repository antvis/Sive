import { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { DataSourceLogo } from '../DataSourceLogo';

type ChatWelcomeHeaderProps = {
  datasetName: string;
  datasetSourceType: string;
  onOpenDatasetPreview: () => void;
  showModelNotice: boolean;
  error: string | undefined;
};

export function ChatWelcomeHeader({
  datasetName,
  datasetSourceType,
  onOpenDatasetPreview,
  showModelNotice,
  error,
}: ChatWelcomeHeaderProps) {
  return (
    <header className="@container/welcome isolate flex min-w-0 flex-col items-center text-center motion-safe:animate-fade-up">
      <WelcomeCompanion />
      <h1 className="w-full text-[1.77rem]/[1.35] font-[650] tracking-[-0.025em] text-[light-dark(#0e1a2b,var(--ink))]">
        向
        <button
          type="button"
          title={`预览数据源 ${datasetName}`}
          className={cn(
            'mx-[3px] inline-flex max-w-[calc(100%-6px)] items-center gap-[6px] rounded-lg border border-[light-dark(#dbefff,#355876)] py-px ps-[6px] pe-[10px] text-left align-[1px]',
            'bg-linear-to-b from-surface to-[light-dark(#f0f9ff,#223648)] text-chat-accent shadow-[0_2px_6px_-3px_#259de84d]',
            'hover:border-[light-dark(#bfe3ff,#5687a8)] hover:shadow-[0_8px_16px_-8px_#259de880] focus-visible:outline-2 focus-visible:outline-offset-2',
            'motion-safe:transition-[translate,rotate,border-color,box-shadow] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(.22,1,.36,1)] motion-safe:hover:-translate-y-[2px] motion-safe:hover:-rotate-1',
          )}
          onClick={onOpenDatasetPreview}
        >
          <DataSourceLogo type={datasetSourceType} size={18} />
          <span className="min-w-0 wrap-anywhere">{datasetName}</span>
        </button>
        提问
      </h1>
      <p className="mt-[8px] text-[1.04rem]/[1.55] font-light text-[light-dark(#687589,var(--muted-foreground))]">
        用自然语言探索数据中的趋势、差异和异常。
      </p>
      {showModelNotice && (
        <p className="mt-3 text-sm text-muted-foreground">请先在设置中配置默认模型服务。</p>
      )}
      {error && (
        <p role="alert" className="mt-3 max-w-full text-sm wrap-anywhere text-destructive">
          {error}
        </p>
      )}
    </header>
  );
}

const prompts = ['最近有什么变化？', '哪组差异最大？', '有没有异常值？', '画张图看看？'];

// Each eye covers the matching painted eye in the companion illustration.
const companionEyes = [
  {
    left: '27.7%',
    top: '47.7%',
    skin: 'linear-gradient(135deg, #f7f0ed, #ece6e4)',
    iris: 'linear-gradient(125deg, #797376, #47434a 78%)',
  },
  {
    left: '48.1%',
    top: '48.9%',
    skin: 'linear-gradient(135deg, #e7e2e4, #ddd8dc)',
    iris: 'linear-gradient(125deg, #757177, #35343f 78%)',
  },
];

function WelcomeCompanion() {
  const companionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const companion = companionRef.current;
    if (!companion) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const resetGaze = () => companion.style.removeProperty('--companion-gaze');

    const trackPointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || reducedMotion.matches) return;

      const { left, top, width, height } = companion.getBoundingClientRect();
      const x = event.clientX - (left + width * 0.38);
      const y = event.clientY - (top + height * 0.48);
      const travel = (height * 0.035) / Math.max(72, Math.hypot(x, y));
      companion.style.setProperty('--companion-gaze', `translate(${x * travel}px, ${y * travel}px)`);
    };

    window.addEventListener('pointermove', trackPointer, { passive: true });
    window.addEventListener('blur', resetGaze);
    document.documentElement.addEventListener('pointerleave', resetGaze);
    reducedMotion.addEventListener('change', resetGaze);
    return () => {
      window.removeEventListener('pointermove', trackPointer);
      window.removeEventListener('blur', resetGaze);
      document.documentElement.removeEventListener('pointerleave', resetGaze);
      reducedMotion.removeEventListener('change', resetGaze);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative mb-[10px] flex w-full max-w-[300px] justify-center pt-[24px] select-none @max-[310px]/welcome:pt-[36px]"
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
              className="h-[clamp(64px,10vh,88px)] w-auto"
            />
            {companionEyes.map(({ left, top, skin, iris }) => (
              <span key={left} style={{ left, top }} className="absolute h-[13%] w-[9%] -translate-1/2">
                <span
                  style={{ background: skin }}
                  className="absolute inset-0 mask-[radial-gradient(ellipse_farthest-side,#000_80%,transparent)]"
                />
                <span
                  style={{ background: iris }}
                  className="absolute top-1/2 left-1/2 h-[68%] w-[44%] -translate-1/2 rotate-[5deg] rounded-full [transform:var(--companion-gaze,none)] motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out"
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
