import { useEffect, useRef, useState } from 'react';
import type { SnippetExportApi, SnippetExportInput } from '@shared/api';
import { ThemeContext } from '../../theme';
import { errorMessage } from '../../utils';
import { SnippetCard } from './index';

async function waitForRendering(container: HTMLElement) {
  await document.fonts.ready;
  await Promise.all(Array.from(container.querySelectorAll('img'), (image) => image.decode()));

  // GPT-Vis has no unified completion event. Wait for stable layout and pixels.
  // Continuous canvas animations (e.g. liquid waves) get a current-frame snapshot
  // after layout has settled for 2s, rather than blocking export indefinitely.
  let previousLayout = '';
  let previousPixels = '';
  let chartStarted = false;
  let layoutStableSince = performance.now();
  let pixelsStableSince = layoutStableSince;
  const deadline = layoutStableSince + 15000;
  while (true) {
    if (performance.now() > deadline) throw new Error('图表仍在渲染，请稍后重试。');
    await new Promise(requestAnimationFrame);
    if (!chartStarted) {
      // An empty chart can stay stable while its renderer is still initializing.
      chartStarted = Array.from(container.querySelectorAll('[data-visualization]')).every((chart) => {
        const canvases = Array.from(chart.querySelectorAll('canvas'));
        if (!canvases.length)
          return Boolean(
            chart.textContent?.trim() || chart.querySelector('svg :is(path,rect,circle,line,text)'),
          );
        return canvases.some((canvas) => {
          if (!canvas.width || !canvas.height) return false;
          const pixels = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data;
          return pixels?.some((value, index) => index % 4 === 3 && value > 0);
        });
      });
      if (!chartStarted) continue;
    }
    const pixels = Array.from(container.querySelectorAll('canvas'), (canvas) => canvas.toDataURL());
    const rect = container.getBoundingClientRect();
    const layout = `${rect.width},${rect.height},${container.innerHTML}`;
    const currentPixels = pixels.join('');
    const now = performance.now();
    if (layout !== previousLayout) layoutStableSince = now;
    if (currentPixels !== previousPixels) pixelsStableSince = now;
    previousLayout = layout;
    previousPixels = currentPixels;
    if (now - layoutStableSince >= 300 && (now - pixelsStableSince >= 300 || now - layoutStableSince >= 2000))
      return;
  }
}

export function SnippetExportPage() {
  // The export preload exposes its own API under the same workbench namespace.
  const api = window.workbench as unknown as SnippetExportApi;
  const [input, setInput] = useState<SnippetExportInput>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void api
      .getRenderData()
      .then((data) => {
        document.documentElement.dataset.theme = data.theme.mode;
        document.documentElement.style.fontSize = `${data.theme.fontSize}px`;
        setInput(data);
      })
      .catch((cause) => {
        api.renderComplete({ error: errorMessage(cause) });
      });
  }, [api]);

  useEffect(() => {
    if (!input) return;
    let cancelled = false;

    const report = async () => {
      try {
        const container = containerRef.current!;
        await waitForRendering(container);
        if (cancelled) return;
        api.renderComplete({
          height: Math.ceil(container.getBoundingClientRect().height),
          title: container.querySelector('[role="heading"]')?.textContent ?? 'Snippet',
        });
      } catch (cause) {
        if (!cancelled) api.renderComplete({ error: errorMessage(cause) });
      }
    };
    void report();
    return () => {
      cancelled = true;
    };
  }, [api, input]);

  return input ? (
    <ThemeContext value={input.theme}>
      <div ref={containerRef} className="w-[800px] bg-page p-6">
        <SnippetCard
          data={input.snippet}
          templateId={input.templateId}
          createdAt={input.snippet.createdAt}
          mode="export"
        />
      </div>
    </ThemeContext>
  ) : null;
}
