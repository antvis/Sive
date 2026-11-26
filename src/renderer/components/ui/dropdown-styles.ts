export const dropdownContentClassName =
  'relative z-50 min-w-44 overflow-x-hidden overflow-y-auto rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-overlay [--dropdown-enter-transform:translateY(-6px)] data-[side=top]:[--dropdown-enter-transform:translateY(6px)] data-[side=left]:[--dropdown-enter-transform:translateX(6px)] data-[side=right]:[--dropdown-enter-transform:translateX(-6px)] motion-safe:data-[state=open]:animate-dropdown-open motion-safe:data-[state=closed]:animate-dropdown-close';

export const dropdownItemClassName =
  'relative z-10 flex min-h-[30px] w-full cursor-default items-center gap-2 rounded-md py-1.5 pl-2 text-sm leading-4 font-normal outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4';
