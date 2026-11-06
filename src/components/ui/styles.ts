// Shared Tailwind recipes for primitives rendered by both Radix and native elements.
export const controlSurface =
  'bg-[color-mix(in_srgb,_var(--background)_65%,_var(--surface))] text-ink border border-[color-mix(in_srgb,_var(--border)_65%,_transparent)] rounded-card outline-none text-body';
export const floatingSurface =
  'z-110 p-[5px] bg-surface text-ink border border-[color-mix(in_srgb,_var(--border)_70%,_transparent)] rounded-panel shadow-[0_8px_30px_color-mix(in_srgb,_var(--text)_12%,_transparent)] max-w-[calc(100vw_-_24px)]';
export const menuItem =
  "flex items-center gap-[9px] relative w-full py-[9px] px-2.5 border-0 rounded-item cursor-pointer outline-none bg-transparent text-left text-body hover:bg-[color-mix(in_srgb,_var(--accent)_8%,_transparent)] [&[data-highlighted]]:bg-[color-mix(in_srgb,_var(--accent)_8%,_transparent)] data-[selected=true]:bg-[color-mix(in_srgb,_var(--accent)_8%,_transparent)] [&[aria-current='true']]:bg-[color-mix(in_srgb,_var(--accent)_8%,_transparent)] [&[data-disabled]]:opacity-40 [&[data-disabled]]:pointer-events-none disabled:opacity-40 disabled:pointer-events-none";
export const tableViewport =
  'min-w-0 overflow-auto border border-[color-mix(in_srgb,_var(--border)_75%,_transparent)] rounded-card';
export const tableSurface = 'w-full text-left border-separate border-spacing-0 text-helper';
export const tableHeader =
  'font-medium bg-page text-muted sticky top-0 z-2 h-9 py-2 px-3 border-b border-b-[color-mix(in_srgb,_var(--border)_65%,_transparent)] text-left';
export const tableRow = 'group/row hover:bg-[color-mix(in_srgb,_var(--muted)_3%,_transparent)]';
export const tableCell =
  'h-9 py-2 px-3 border-b border-b-[color-mix(in_srgb,_var(--border)_65%,_transparent)] text-left group-last/row:border-b-0';

// Source-specific light and dark colors shared by import and dataset pickers.
export const dataSourceColors =
  'data-[source=csv]:[--source-color:#25804d] data-[source=json]:[--source-color:#8054b6] data-[source=xlsx]:[--source-color:#18734b] data-[source=parquet]:[--source-color:#a66a1c] data-[source=mysql]:[--source-color:#28769a] dark:data-[source=csv]:[--source-color:#70cc92] dark:data-[source=json]:[--source-color:#bb96ed] dark:data-[source=xlsx]:[--source-color:#57c393] dark:data-[source=parquet]:[--source-color:#e3b36a] dark:data-[source=mysql]:[--source-color:#78bddd]';
