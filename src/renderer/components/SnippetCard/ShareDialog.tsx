import { Copy, DownloadSimple, ImageSquare } from '@phosphor-icons/react';
import { snapdom } from '@zumer/snapdom';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Snippet, SnippetExportInput } from '@shared/api';
import { errorMessage } from '../../utils';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { SnippetCard, templateOptions } from './index';
import { TemplatePicker } from './TemplatePicker';

async function captureSnippet(container: HTMLDivElement) {
  await document.fonts.ready;

  // GPT-Vis does not expose render completion. Wait for the rendered DOM and canvas
  // pixels to settle, including chart animations, instead of using a fixed delay.
  let previous = '';
  let stableFrames = 0;
  const deadline = performance.now() + 10000;
  while (stableFrames < 3) {
    if (performance.now() > deadline) throw new Error('图表仍在渲染，请稍后重试。');
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
    excludeMode: 'remove',
  });
}

export function ShareDialog({ snippet, onClose }: { snippet: Snippet; onClose: () => void }) {
  const [templateId, setTemplateId] = useState(snippet.templateId);
  const [busy, setBusy] = useState<SnippetExportInput['target'] | null>(null);
  const [error, setError] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);

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
      if (exported) toast.success(target === 'clipboard' ? '图片已复制' : '图片已保存');
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
      title="分享与导出"
      className="flex w-[920px] flex-col overflow-hidden"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <span aria-hidden className="flex size-9 items-center justify-center rounded-lg border bg-page">
              <ImageSquare size={18} />
            </span>
            <p className="m-0 text-xs font-medium text-ink">
              高清 PNG <span className="ml-1 text-muted-foreground tabular-nums">2×</span>
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              className="h-10 gap-2 px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              disabled={!!busy}
              onClick={() => void share('clipboard')}
            >
              <Copy size={16} aria-hidden />
              {busy === 'clipboard' ? '正在生成…' : '复制图片'}
            </Button>
            <Button
              variant="primary"
              className="h-10 gap-2 bg-ink! px-4 text-surface! shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              disabled={!!busy}
              onClick={() => void share('file')}
            >
              <DownloadSimple size={16} aria-hidden />
              {busy === 'file' ? '正在保存…' : '保存图片'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-line!">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line! bg-surface px-4 py-2.5">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ImageSquare size={15} aria-hidden />
            图片预览
          </span>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">模板</span>
            <span className="font-medium">
              {templateOptions.find(({ value }) => value === templateId)?.label}
            </span>
            <TemplatePicker
              value={templateId}
              templates={templateOptions}
              disabled={!!busy}
              onChange={setTemplateId}
            />
          </div>
        </div>
        <div
          role="region"
          aria-label="Snippet 图片预览"
          aria-busy={!!busy}
          tabIndex={0}
          className="min-h-0 overflow-auto bg-page focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
        >
          <div ref={previewRef} className="mx-auto w-[800px] bg-page p-6">
            <SnippetCard data={snippet} templateId={templateId} createdAt={snippet.createdAt} mode="export" />
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
