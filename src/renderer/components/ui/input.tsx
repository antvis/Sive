import * as React from "react"

import { cn } from "../../lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'w-full min-w-0 rounded-[10px] border border-ink/10 bg-workspace-control-active px-3 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-focus/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        "h-9 py-1 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground disabled:pointer-events-none",
        className
      )}
      {...props}
    />
  )
}

export { Input }
