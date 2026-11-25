import { CopyIcon, DownloadIcon } from 'lucide-react';
import { snapdom } from '@zumer/snapdom';
import { useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Snippet, SnippetExportInput, SnippetShareInput } from '@shared/api';
import { errorMessage } from '../../utils';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { SegmentedControl } from '../SegmentedControl';
import { SnippetCard } from './index';
import { XiaohongshuPreview } from './XiaohongshuPreview';

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
  });
}

export function ShareDialog({ snippet, onClose }: { snippet: Snippet; onClose: () => void }) {
  const [destination, setDestination] = useState<'image' | 'xiaohongshu'>('image');
  const [busy, setBusy] = useState<SnippetExportInput['target'] | 'xiaohongshu' | 'publish' | null>(null);
  const [post, setPost] = useState<SnippetShareInput | null>(null);
  const [error, setError] = useState('');
  const [previewScale, setPreviewScale] = useState(1);
  const previewRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);

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

  const share = async (target: SnippetExportInput['target'] | 'xiaohongshu') => {
    const container = previewRef.current;
    if (!container || busy) return;
    setBusy(target);
    setError('');
    try {
      const blob = await captureSnippet(container);
      const image = {
        image: new Uint8Array(await blob.arrayBuffer()),
        title: container.querySelector('[role="heading"]')?.textContent ?? 'Snippet',
      };
      if (target === 'xiaohongshu') {
        const content =
          container.querySelector<HTMLElement>('section[aria-label="关键洞察"]')?.innerText.trim() ?? '';
        setPost((previous) => ({
          ...image,
          title: previous?.title ?? image.title,
          content: previous?.content ?? content,
        }));
        setDestination('xiaohongshu');
      } else if (await window.workbench.snippetExport({ ...image, target })) {
        toast.success(target === 'clipboard' ? '图片已复制' : '图片已保存');
      }
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
        destination === 'image' && (
          <div className="flex items-center gap-2">
            <Button
              className="h-10 gap-2 px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              disabled={!!busy}
              onClick={() => void share('clipboard')}
            >
              <CopyIcon size={16} aria-hidden />
              {busy === 'clipboard' ? '正在生成…' : '复制图片'}
            </Button>
            <Button
              variant="primary"
              className="h-10 gap-2 bg-ink! px-4 text-surface! shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              disabled={!!busy}
              onClick={() => void share('file')}
            >
              <DownloadIcon size={16} aria-hidden />
              {busy === 'file' ? '正在保存…' : '保存图片'}
            </Button>
          </div>
        )
      }
    >
      <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <SegmentedControl
          label="导出方式"
          options={[
            { value: 'image', label: '图片' },
            { value: 'xiaohongshu', label: '小红书' },
          ]}
          value={destination}
          disabled={!!busy}
          onValueChange={(value) => {
            setError('');
            if (value === 'xiaohongshu') void share(value);
            else setDestination(value);
          }}
        />
        {busy === 'xiaohongshu' && (
          <span role="status" className="text-xs text-muted-foreground">
            正在生成预览…
          </span>
        )}
      </div>
      {destination === 'xiaohongshu' && post ? (
        <XiaohongshuPreview
          post={post}
          onChange={setPost}
          onPublishingChange={(publishing) => setBusy(publishing ? 'publish' : null)}
          onClose={onClose}
        />
      ) : (
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
            <div ref={previewRef} className="w-[800px] bg-page p-6">
              <SnippetCard
                data={snippet}
                templateId={snippet.templateId}
                createdAt={snippet.createdAt}
                mode="export"
              />
            </div>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 mb-0 text-sm text-danger">
          {error}
        </p>
      )}
    </Modal>
  );
}
