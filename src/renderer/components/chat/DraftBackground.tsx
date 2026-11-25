import { useContext, useEffect, useRef } from 'react';
import { ThemeContext } from '../../theme';

const GLOW_RADIUS = 182;
const RIPPLE_DURATION = 680;

type Point = { x: number; y: number };
type Ripple = Point & { startedAt: number };

export function DraftBackground() {
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
    let pointer: Point | undefined;
    let ripples: Ripple[] = [];

    const draw = (now: number) => {
      frame = 0;
      context.clearRect(0, 0, width, height);

      if (pointer) {
        const { x, y } = pointer;
        const glow = context.createRadialGradient(x, y, 0, x, y, GLOW_RADIUS);
        glow.addColorStop(0, dark ? '#7ac8ff32' : '#1ca9f52b');
        glow.addColorStop(0.42, dark ? '#55adff15' : '#52c4ff15');
        glow.addColorStop(1, '#52c4ff00');
        context.fillStyle = glow;
        context.fillRect(x - GLOW_RADIUS, y - GLOW_RADIUS, GLOW_RADIUS * 2, GLOW_RADIUS * 2);
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
      if (ripples.length) requestDraw();
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

    const locate = (event: PointerEvent): Point => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    function move(event: PointerEvent) {
      if (reduceMotion.matches || event.pointerType === 'touch') return;
      pointer = locate(event);
      requestDraw();
    }

    function press(event: PointerEvent) {
      if (reduceMotion.matches || event.button !== 0) return;
      if (ripples.length === 4) ripples.shift();
      ripples.push({ ...locate(event), startedAt: performance.now() });
      requestDraw();
    }

    function leave() {
      pointer = undefined;
      requestDraw();
    }

    function reset() {
      ripples = [];
      leave();
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    draft.addEventListener('pointermove', move, { passive: true });
    draft.addEventListener('pointerdown', press, { passive: true });
    draft.addEventListener('pointerleave', leave, { passive: true });
    reduceMotion.addEventListener('change', reset);
    window.addEventListener('blur', reset);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      draft.removeEventListener('pointermove', move);
      draft.removeEventListener('pointerdown', press);
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
