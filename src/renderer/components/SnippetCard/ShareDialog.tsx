import { Copy, DownloadSimple } from '@phosphor-icons/react';
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

  return snapdom.toBlob(container, { type: 'png', scale: 2, dpr: 1, embedFonts: true });
}

export function ShareDialog({ snippet, onClose }: { snippet: Snippet; onClose: () => void }) {
  const [templateId, setTemplateId] = useState(snippet.templateId);
  const [busy, setBusy] = useState<SnippetExportInput['target'] | null>(null);
  const [error, setError] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);
  const templateButtonRef = useRef<HTMLButtonElement>(null);

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
      className="flex w-[900px] flex-col overflow-hidden"
      footer={
        <>
          <Button disabled={!!busy} onClick={() => void share('clipboard')}>
            <Copy size={16} aria-hidden />
            {busy === 'clipboard' ? '正在生成…' : '复制图片'}
          </Button>
          <Button variant="primary" disabled={!!busy} onClick={() => void share('file')}>
            <DownloadSimple size={16} aria-hidden />
            {busy === 'file' ? '正在保存…' : '保存 PNG…'}
          </Button>
        </>
      }
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="m-0 text-xs text-muted">完整卡片 · 高清 PNG · 2×</p>
        <div className="flex items-center gap-1 text-xs text-muted">
          模板
          <TemplatePicker
            value={templateId}
            templates={templateOptions}
            disabled={!!busy}
            buttonRef={templateButtonRef}
            onChange={setTemplateId}
          />
        </div>
      </div>
      <div
        role="region"
        aria-label="Snippet 图片预览"
        aria-busy={!!busy}
        tabIndex={0}
        className="min-h-0 overflow-auto rounded-xl border bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <div ref={previewRef} className="w-[800px] bg-page p-6">
          <SnippetCard data={snippet} templateId={templateId} createdAt={snippet.createdAt} mode="export" />
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
