import { i18n, useI18n } from '../../i18n';
import { CopyIcon, DownloadIcon } from 'lucide-react';
import { snapdom } from '@zumer/snapdom';
import { useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Snippet, SnippetExportInput } from '@shared/api';
import { errorMessage } from '../../utils';
import { Button } from '../ui/button';
import { Modal } from '../ui/dialog';
import { SnippetCard } from './index';

async function captureSnippet(container: HTMLDivElement) {
  await document.fonts.ready;

  // GPT-Vis does not expose render completion. Wait for the rendered DOM and canvas
  // pixels to settle, including chart animations, instead of using a fixed delay.
  let previous = '';
  let stableFrames = 0;
  const deadline = performance.now() + 10000;
  while (stableFrames < 3) {
    if (performance.now() > deadline) throw new Error(i18n('errors.snippet.chartRendering'));
    await new Promise(requestAnimationFrame);
    const pixels = Array.from(container.querySelectorAll('canvas'), (canvas) => canvas.toDataURL());
    const current = container.innerHTML + pixels.join('');
    stableFrames = current === previous ? stableFrames + 1 : 0;
    previous = current;
  }

  return snapdom.toBlob(container, {
    type: 'png',
    scale: 2,
    dpr: 1,
    embedFonts: true,
    exclude: ['.g2-tooltip'],
    // Keep tooltip boxes in the clone so snapdom does not reflow unrelated elements.
    excludeMode: 'hide',
  });
}

export function ShareDialog({ snippet, onClose }: { snippet: Snippet; onClose: () => void }) {
  useI18n();
  const [busy, setBusy] = useState<SnippetExportInput['target'] | null>(null);
  const [error, setError] = useState('');
  const [previewScale, setPreviewScale] = useState(1);
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const preview = previewRef.current;
    if (!preview || !viewport) return;

    const resize = () => {
      setPreviewScale(
        Math.min(1, viewport.clientWidth / preview.offsetWidth, viewport.clientHeight / preview.offsetHeight),
      );
    };
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    observer.observe(preview);
    resize();
    return () => observer.disconnect();
  }, [viewport]);

  const share = async (target: SnippetExportInput['target']) => {
    const container = previewRef.current;
    if (!container || busy) return;
    setBusy(target);
    setError('');
    try {
      const blob = await captureSnippet(container);
      const exported = await window.workbench.snippetExport({
        image: new Uint8Array(await blob.arrayBuffer()),
        title: container.querySelector('[role="heading"]')?.textContent ?? 'Snippet',
        target,
      });
      if (exported)
        toast.success(target === 'clipboard' ? i18n('snippet.export.copied') : i18n('snippet.export.saved'));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      open
      onOpenChange={(open) => !busy && !open && onClose()}
      title={i18n('snippet.export.title')}
      className="flex h-[min(800px,85vh)] w-[920px] flex-col overflow-hidden"
      footer={
        <div className="flex items-center gap-2">
          <Button size="lg" disabled={!!busy} onClick={() => void share('clipboard')}>
            <CopyIcon size={16} aria-hidden />
            {busy === 'clipboard' ? i18n('snippet.export.generating') : i18n('snippet.export.copyImage')}
          </Button>
          <Button variant="neutral" size="lg" disabled={!!busy} onClick={() => void share('file')}>
            <DownloadIcon size={16} aria-hidden />
            {busy === 'file' ? i18n('snippet.export.saving') : i18n('snippet.export.saveImage')}
          </Button>
        </div>
      }
    >
      <div
        ref={setViewport}
        role="region"
        aria-label={i18n('snippet.export.previewLabel')}
        aria-busy={!!busy}
        className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-line! bg-page"
      >
        <div
          className="absolute top-1/2 left-1/2 origin-center"
          style={{ transform: `translate(-50%, -50%) scale(${previewScale})` }}
        >
          <div ref={previewRef} className="bg-page p-6" style={{ width: 800 }}>
            <SnippetCard
              data={snippet}
              templateId={snippet.templateId}
              createdAt={snippet.createdAt}
              mode="export"
            />
          </div>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-3 mb-0 text-sm text-danger">
          {error}
        </p>
      )}
    </Modal>
  );
}
