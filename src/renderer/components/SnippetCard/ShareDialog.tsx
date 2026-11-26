import { CopyIcon, DownloadIcon } from 'lucide-react';
import { useContext, useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { SNIPPET_EXPORT_WIDTH } from '@shared/api';
import type { Snippet, SnippetExportInput } from '@shared/api';
import { errorMessage } from '../../utils';
import { ThemeContext } from '../../theme';
import { Button } from '../ui/button';
import { Modal } from '../ui/dialog';
import { SnippetCard } from './index';

export function ShareDialog({ snippet, onClose }: { snippet: Snippet; onClose: () => void }) {
  const [busy, setBusy] = useState<SnippetExportInput['target'] | null>(null);
  const [error, setError] = useState('');
  const [previewScale, setPreviewScale] = useState(1);
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const theme = useContext(ThemeContext);

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
    if (busy) return;
    setBusy(target);
    setError('');
    try {
      const exported = await window.workbench.snippetExport({
        snippet,
        templateId: snippet.templateId,
        theme,
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
      className="flex h-[min(800px,85vh)] w-[920px] flex-col overflow-hidden"
      footer={
        <div className="flex items-center gap-2">
          <Button size="lg" disabled={!!busy} onClick={() => void share('clipboard')}>
            <CopyIcon size={16} aria-hidden />
            {busy === 'clipboard' ? '正在生成…' : '复制图片'}
          </Button>
          <Button variant="neutral" size="lg" disabled={!!busy} onClick={() => void share('file')}>
            <DownloadIcon size={16} aria-hidden />
            {busy === 'file' ? '正在保存…' : '保存图片'}
          </Button>
        </div>
      }
    >
      <div
        ref={setViewport}
        role="region"
        aria-label="Snippet 图片预览"
        aria-busy={!!busy}
        className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-line! bg-page"
      >
        <div
          className="absolute top-1/2 left-1/2 origin-center"
          style={{ transform: `translate(-50%, -50%) scale(${previewScale})` }}
        >
          <div ref={previewRef} className="bg-page p-6" style={{ width: SNIPPET_EXPORT_WIDTH }}>
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
