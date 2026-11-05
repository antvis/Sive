// Shared Tailwind recipes for primitives rendered by both Radix and native elements.
export const floatingSurface =
  'z-110 p-[5px] bg-surface text-ink border border-[color-mix(in_srgb,_var(--border)_70%,_transparent)] rounded-panel shadow-[0_8px_30px_color-mix(in_srgb,_var(--text)_12%,_transparent)] max-w-[calc(100vw_-_24px)]';
export const menuItem =
  "flex items-center gap-[9px] relative w-full py-[9px] px-2.5 border-0 rounded-item cursor-pointer outline-none bg-transparent text-left text-body hover:bg-[color-mix(in_srgb,_var(--accent)_8%,_transparent)] [&[data-highlighted]]:bg-[color-mix(in_srgb,_var(--accent)_8%,_transparent)] data-[selected=true]:bg-[color-mix(in_srgb,_var(--accent)_8%,_transparent)] [&[aria-current='true']]:bg-[color-mix(in_srgb,_var(--accent)_8%,_transparent)] [&[data-disabled]]:opacity-40 [&[data-disabled]]:pointer-events-none disabled:opacity-40 disabled:pointer-events-none";
export const tableViewport =
  'min-w-0 overflow-auto border border-[color-mix(in_srgb,_var(--border)_75%,_transparent)] rounded-card';
export const tableSurface =
  "ui-table w-full text-left border-separate border-spacing-0 text-helper [&_th]:font-medium [&_th]:bg-page [&_th]:text-muted [&_th]:sticky [&_th]:top-0 [&_th]:z-2 [&_th]:h-9 [&_th]:py-2 [&_th]:px-3 [&_th]:border-b [&_th]:border-b-[color-mix(in_srgb,_var(--border)_65%,_transparent)] [&_th]:text-left [&_tr:last-child_td]:border-b-0 [&_tbody_tr:hover]:bg-[color-mix(in_srgb,_var(--muted)_3%,_transparent)] [&_th[aria-sort='ascending']_.ui-sort]:text-accent [&_th[aria-sort='descending']_.ui-sort]:text-accent [&_.ui-table-empty]:text-center [&_.ui-table-empty]:h-27.5 [&_.ui-table-empty]:text-muted";
