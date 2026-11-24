import type { KeyboardEvent, PointerEventHandler } from 'react';

export const panelCollapsePreviewClassName =
  'data-[collapse-pending]:[&>*]:blur-[3px] motion-safe:[&>*]:transition-[filter] motion-safe:[&>*]:duration-150';

type Props = {
  label: string;
  controls: string;
  width: number;
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  dragging: boolean;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onLostPointerCapture: PointerEventHandler<HTMLDivElement>;
  onResize: (width: number) => void;
};

export function ResizeHandle({
  label,
  controls,
  width,
  minWidth,
  maxWidth,
  defaultWidth,
  dragging,
  onPointerDown,
  onLostPointerCapture,
  onResize,
}: Props) {
  const resizeWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    const widths: Record<string, number> = {
      ArrowLeft: width - 16,
      ArrowRight: width + 16,
      Home: minWidth,
      End: maxWidth,
    };
    if (!Object.hasOwn(widths, event.key)) return;

    event.preventDefault();
    onResize(widths[event.key]);
  };

  return (
    <div
      className="group/resize flex min-w-0 touch-none cursor-col-resize justify-center overflow-hidden"
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-controls={controls}
      aria-orientation="vertical"
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      aria-valuenow={Math.round(width)}
      data-separator={dragging ? 'active' : 'inactive'}
      onPointerDown={onPointerDown}
      onLostPointerCapture={onLostPointerCapture}
      onDoubleClick={() => onResize(defaultWidth)}
      onKeyDown={resizeWithKeyboard}
    >
      <span
        aria-hidden
        className="pointer-events-none w-[3px] rounded-full bg-linear-to-b from-transparent via-accent/65 to-transparent opacity-0 transition-opacity duration-150 group-hover/resize:opacity-100 group-data-[separator=active]/resize:opacity-100 group-focus-visible/resize:opacity-100 motion-reduce:transition-none"
      />
    </div>
  );
}
