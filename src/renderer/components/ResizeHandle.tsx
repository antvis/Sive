import { Separator } from 'react-resizable-panels';

export function ResizeHandle() {
  return (
    <Separator
      aria-label="拖拽调整区域宽度"
      title="拖拽调整宽度"
      className="group flex w-1.5 cursor-col-resize items-center justify-center bg-line/50 transition-colors hover:bg-accent/30"
    >
      <span className="h-7 w-0.5 rounded-full bg-muted/40 group-hover:bg-accent" />
    </Separator>
  );
}
