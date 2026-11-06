// Shared Tailwind recipes for primitives rendered by both Radix and native elements.
export const controlSurface =
  'bg-[color-mix(in_srgb,_var(--background)_65%,_var(--surface))] text-ink border border-line/65 rounded-card outline-none text-body';
export const floatingSurface =
  'z-110 p-1 bg-surface text-ink border border-line/70 rounded-panel shadow-[0_8px_30px] shadow-ink/12 max-w-[calc(100vw_-_24px)]';
export const menuItem =
  "flex items-center gap-2 relative w-full py-2 px-2.5 border-0 rounded-button cursor-pointer outline-none bg-transparent text-left text-body hover:bg-accent/8 [&[data-highlighted]]:bg-accent/8 data-[selected=true]:bg-accent/8 [&[aria-current='true']]:bg-accent/8 [&[data-disabled]]:opacity-40 [&[data-disabled]]:pointer-events-none disabled:opacity-40 disabled:pointer-events-none";
export const tableViewport = 'min-w-0 overflow-auto border border-line/75 rounded-card';
export const tableSurface = 'w-full text-left border-separate border-spacing-0 text-helper';
export const tableHeader =
  'font-medium bg-page text-muted sticky top-0 z-2 h-9 py-2 px-3 border-b border-b-line/65 text-left';
export const tableRow = 'group/row hover:bg-muted/3';
export const tableCell = 'h-9 py-2 px-3 border-b border-b-line/65 text-left group-last/row:border-b-0';
