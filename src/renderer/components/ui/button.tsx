import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-base font-medium transition-[background-color,color,border-color] [&[aria-expanded=true][aria-haspopup]]:bg-selected [&[aria-expanded=true][aria-haspopup]]:text-selected-foreground aria-pressed:bg-selected aria-pressed:text-selected-foreground disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border bg-surface text-ink hover:bg-page",
        outline:
          "border border-border bg-input/30 hover:bg-input/50 hover:text-foreground",
        secondary:
          "bg-workspace-control text-ink hover:bg-ink/10",
        ghost: "text-muted-foreground hover:bg-page hover:text-ink",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-current",
        primary: "bg-accent text-accent-foreground enabled:hover:bg-accent/95",
        neutral: "bg-ink text-surface shadow-sm hover:opacity-90",
        danger: "border border-danger/30 bg-danger/5 text-danger hover:bg-danger/10",
      },
      size: {
        default: "min-h-8 gap-1.5 px-3",
        xs: "h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3 text-sm has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-4",
        lg: "h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-[16px]",
        icon: "size-9 shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "icon-xs": "size-[24px] shrink-0 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-[28px] shrink-0 -outline-offset-1 [&_svg:not([class*='size-'])]:size-[18px]",
        "icon-lg": "size-10 shrink-0 [&_svg:not([class*='size-'])]:size-4",
      },
    },
    compoundVariants: [{ variant: "link", class: "min-h-0 gap-1 px-0 text-sm" }],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  type = asChild ? undefined : "button",
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      type={type}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button }
