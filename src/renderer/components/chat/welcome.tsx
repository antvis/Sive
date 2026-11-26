import { useContext, useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { ThemeContext } from '../../theme';
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
    <header className="isolate flex min-w-0 flex-col-reverse gap-3 self-end pb-[clamp(18px,4vh,2.5rem)] @min-[380px]:grid @min-[380px]:grid-cols-[minmax(0,1fr)_auto] @min-[380px]:items-center @min-[380px]:gap-6 motion-safe:animate-fade-up">
      <div className="min-w-0">
        <h1 className="text-2xl leading-tight font-semibold tracking-tight wrap-anywhere @min-[540px]:text-3xl">
          向{' '}
          <button
            type="button"
            title={`预览数据源 ${datasetName}`}
            className="inline-block max-w-full rounded-sm text-left align-baseline wrap-anywhere text-accent underline-offset-4 hover:underline focus-visible:underline"
            onClick={onOpenDatasetPreview}
          >
            <span className="me-1.5 inline-flex align-middle">
              <DataSourceLogo type={datasetSourceType} size={20} />
            </span>
            {datasetName}
          </button>{' '}
          提问
        </h1>
        <p className="mt-2 leading-[1.7] text-[light-dark(#435c78,#b8c8dc)]">
          用自然语言探索数据中的趋势、差异和异常。
        </p>
        {showModelNotice && (
          <p className="mt-3 text-sm text-muted-foreground">请先在设置中配置默认模型服务。</p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm wrap-anywhere text-destructive">
            {error}
          </p>
        )}
      </div>
      <div className="min-w-0 self-end @min-[380px]:self-center">
        <WelcomeCompanion />
      </div>
    </header>
  );
}

const GLOW_RADIUS = 182;
const GLOW_IDLE_DELAY = 120;
const GLOW_FADE_DURATION = 320;
const RIPPLE_DURATION = 560;

type Point = { x: number; y: number };
type Glow = Point & { fadeAt: number };
type Ripple = Point & { startedAt: number };

export function ChatWelcomeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { mode } = useContext(ThemeContext);

  useEffect(() => {
    const canvas = canvasRef.current;
    const draft = canvas?.parentElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !draft || !context) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const dark = mode === 'dark';
    let frame = 0;
    let width = 0;
    let height = 0;
    let glow: Glow | undefined;
    let ripples: Ripple[] = [];

    const draw = (now: number) => {
      frame = 0;
      context.clearRect(0, 0, width, height);

      if (glow) {
        const { x, y, fadeAt } = glow;
        const opacity = 1 - Math.max(0, now - fadeAt) / GLOW_FADE_DURATION;
        if (opacity > 0) {
          const gradient = context.createRadialGradient(x, y, 0, x, y, GLOW_RADIUS);
          gradient.addColorStop(0, dark ? '#7ac8ff32' : '#1ca9f52b');
          gradient.addColorStop(0.42, dark ? '#55adff15' : '#52c4ff15');
          gradient.addColorStop(1, '#52c4ff00');
          context.globalAlpha = opacity ** 2;
          context.fillStyle = gradient;
          context.fillRect(x - GLOW_RADIUS, y - GLOW_RADIUS, GLOW_RADIUS * 2, GLOW_RADIUS * 2);
        } else {
          glow = undefined;
        }
      }

      ripples = ripples.filter(({ startedAt }) => now - startedAt < RIPPLE_DURATION);
      for (const { x, y, startedAt } of ripples) {
        const progress = Math.max(0, now - startedAt) / RIPPLE_DURATION;
        const radius = 12 + 105 * (1 - (1 - progress) ** 2);

        context.globalAlpha = 0.48 * (1 - progress) ** 1.6;
        context.strokeStyle = dark ? '#b6e3ff' : '#1697e3';
        context.lineWidth = 1.6 - progress * 0.8;
        context.beginPath();
        context.arc(x, y, radius, 0, 2 * Math.PI);
        context.stroke();
      }

      context.globalAlpha = 1;
      if (glow || ripples.length) requestDraw();
    };

    function requestDraw() {
      if (!frame) frame = requestAnimationFrame(draw);
    }

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const scale = Math.min(window.devicePixelRatio, 2);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
      requestDraw();
    };

    const locate = (event: MouseEvent): Point => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    function move(event: PointerEvent) {
      if (reduceMotion.matches || event.pointerType === 'touch') return;
      glow = { ...locate(event), fadeAt: performance.now() + GLOW_IDLE_DELAY };
      requestDraw();
    }

    function click(event: MouseEvent) {
      if (reduceMotion.matches || event.detail === 0) return;
      if (ripples.length === 4) ripples.shift();
      ripples.push({ ...locate(event), startedAt: performance.now() });
      requestDraw();
    }

    function leave() {
      if (glow) glow.fadeAt = Math.min(glow.fadeAt, performance.now());
    }

    function reset() {
      glow = undefined;
      ripples = [];
      requestDraw();
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    draft.addEventListener('pointermove', move, { passive: true });
    draft.addEventListener('click', click, { capture: true, passive: true });
    draft.addEventListener('pointerleave', leave, { passive: true });
    reduceMotion.addEventListener('change', reset);
    window.addEventListener('blur', reset);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      draft.removeEventListener('pointermove', move);
      draft.removeEventListener('click', click, true);
      draft.removeEventListener('pointerleave', leave);
      reduceMotion.removeEventListener('change', reset);
      window.removeEventListener('blur', reset);
    };
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      data-draft-background
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 block size-full"
    />
  );
}

const leftBubble = 'top-0 left-0 after:right-10';
const rightBubble = 'top-11 right-0 after:left-5';

const prompts = [
  {
    text: '最近有什么变化？',
    className: cn(leftBubble, 'motion-reduce:opacity-100'),
  },
  {
    text: '哪组差异最大？',
    className: cn(rightBubble, 'motion-safe:[animation-delay:1.2s] motion-reduce:opacity-100'),
  },
  {
    text: '有没有异常值？',
    className: cn(leftBubble, 'motion-safe:[animation-delay:6s]'),
  },
  {
    text: '画张图看看？',
    className: cn(rightBubble, 'motion-safe:[animation-delay:7.2s]'),
  },
];

function WelcomeCompanion() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative flex w-56 max-w-full justify-center self-end pt-19 select-none"
    >
      <div className="motion-safe:animate-draft-companion-enter">
        <img
          src="./illustrations/draft-companion.png"
          alt=""
          width={288}
          height={259}
          decoding="async"
          className="h-[clamp(64px,11vh,96px)] w-auto origin-[50%_78%] object-contain drop-shadow-[0_9px_12px_#07589532] motion-safe:animate-draft-companion-idle"
        />
      </div>
      {prompts.map(({ text, className }) => (
        <p
          key={text}
          className={cn(
            'absolute z-10 rounded-xl bg-[light-dark(#f7faffed,#35485f)] px-3 py-1.5 text-sm font-medium whitespace-nowrap text-[light-dark(#16436c,#e8f5ff)] opacity-0 shadow-[0_3px_12px_#213d621a] after:absolute after:top-full after:h-1 after:w-2 after:bg-inherit after:[clip-path:polygon(0_0,100%_0,50%_100%)] motion-safe:animate-draft-companion-bubble',
            className,
          )}
        >
          {text}
        </p>
      ))}
    </div>
  );
}
