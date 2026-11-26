import { useEffect, useRef, useState } from 'react';
import type { SnippetExportInput } from '@shared/api';
import { ThemeContext } from '../../theme';
import { errorMessage } from '../../utils';
import { SnippetCard } from './index';

export async function waitForRendering(container: HTMLElement) {
  await document.fonts.ready;
  await Promise.all(Array.from(container.querySelectorAll('img'), (image) => image.decode()));

  // GPT-Vis has no unified completion event. Wait for stable layout and pixels.
  // Continuous canvas animations (e.g. liquid waves) get a current-frame snapshot
  // after layout has settled for 2s, rather than blocking export indefinitely.
  let previousLayout = '';
  let previousPixels = '';
  let layoutStableSince = performance.now();
  let pixelsStableSince = layoutStableSince;
  const deadline = layoutStableSince + 15000;
  while (true) {
    if (performance.now() > deadline) throw new Error('图表仍在渲染，请稍后重试。');
    await new Promise(requestAnimationFrame);
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
  const [input, setInput] = useState<SnippetExportInput>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void window.workbench
      .snippetExportGetRenderData()
      .then((data) => {
        document.documentElement.dataset.theme = data.theme.mode;
        document.documentElement.style.fontSize = `${data.theme.fontSize}px`;
        setInput(data);
      })
      .catch((cause) => {
        window.workbench.snippetExportRenderComplete({ error: errorMessage(cause) });
      });
  }, []);

  useEffect(() => {
    if (!input) return;
    let cancelled = false;

    const report = async () => {
      try {
        const container = containerRef.current!;
        await waitForRendering(container);
        if (cancelled) return;
        window.workbench.snippetExportRenderComplete({
          height: Math.ceil(container.getBoundingClientRect().height),
          title: container.querySelector('[role="heading"]')?.textContent ?? 'Snippet',
        });
      } catch (cause) {
        if (!cancelled) window.workbench.snippetExportRenderComplete({ error: errorMessage(cause) });
      }
    };
    void report();
    return () => {
      cancelled = true;
    };
  }, [input]);

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
