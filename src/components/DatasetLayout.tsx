import { useRef, useState, type CSSProperties, type ReactNode } from 'react';

export default function DatasetLayout({ dataOpen, children }: { dataOpen: boolean; children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(52);
  const [dragging, setDragging] = useState(false);
  const resize = (percent: number) => {
    const width = container.current!.getBoundingClientRect().width;
    setSplit(Math.max((340 / width) * 100, Math.min(((width - 386) / width) * 100, percent)));
  };
  return (
    <div
      ref={container}
      className={`dataset-detail${dataOpen ? ' with-data' : ''}${dragging ? ' resizing' : ''}`}
      style={{ '--conversation-width': `${split}%` } as CSSProperties}
    >
      {children}
      <div
        className="dataset-divider"
        role="separator"
        aria-label="调整分析会话与数据面板宽度"
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(split)}
        tabIndex={dataOpen ? 0 : -1}
        aria-hidden={!dataOpen}
        inert={!dataOpen}
        title="拖动调整宽度，双击恢复默认"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const bounds = container.current!.getBoundingClientRect();
          resize(((event.clientX - bounds.left) / bounds.width) * 100);
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onLostPointerCapture={() => setDragging(false)}
        onDoubleClick={() => setSplit(52)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            resize(split + (event.key === 'ArrowLeft' ? -2 : 2));
          }
        }}
      />
    </div>
  );
}
