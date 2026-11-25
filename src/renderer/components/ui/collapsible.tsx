"use client"

import { ChevronRightIcon } from "lucide-react"
import { Collapsible as CollapsiblePrimitive } from "radix-ui"
import { cn } from "../../lib/utils"

function Collapsible({
  className,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" className={cn("min-w-0", className)} {...props} />
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  )
}

function CollapsibleRowTrigger({
  children,
  className,
  ...props
}: Omit<React.ComponentProps<typeof CollapsibleTrigger>, "asChild">) {
  return (
    <CollapsibleTrigger
      className={cn(
        "group/collapsible-row flex w-full flex-wrap items-center gap-2 rounded-sm bg-transparent py-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-focus",
        className,
      )}
      {...props}
    >
      <ChevronRightIcon
        className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/collapsible-row:rotate-90 motion-reduce:transition-none"
        aria-hidden="true"
      />
      {children}
    </CollapsibleTrigger>
  )
}

function CollapsibleInlineTrigger({
  children,
  className,
  endContent,
  ...props
}: Omit<React.ComponentProps<typeof CollapsibleTrigger>, "asChild"> & { endContent?: React.ReactNode }) {
  return (
    <CollapsibleTrigger
      className={cn(
        "group/collapsible-inline flex min-h-7 w-full items-center justify-start gap-1 bg-transparent p-0 text-left text-sm font-normal text-muted-foreground outline-offset-2 transition-colors duration-150 hover:text-foreground focus-visible:outline-1 focus-visible:outline-focus",
        className,
      )}
      {...props}
    >
      <span className="flex min-w-0 flex-wrap items-center gap-2 gap-y-1">{children}</span>
      <ChevronRightIcon
        className="size-4 shrink-0 text-inherit opacity-0 transition-[opacity,transform] duration-150 group-hover/collapsible-inline:opacity-100 group-focus-visible/collapsible-inline:opacity-100 group-data-[state=open]/collapsible-inline:rotate-90 group-data-[state=open]/collapsible-inline:opacity-100 motion-reduce:transition-none"
        aria-hidden
      />
      {endContent}
    </CollapsibleTrigger>
  )
}

function CollapsibleContent({
  className,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      className={cn("min-w-0", className)}
      {...props}
    />
  )
}

function CollapsibleInlineContent({
  children,
  className,
  ...props
}: Omit<React.ComponentProps<typeof CollapsibleContent>, "asChild">) {
  return (
    <CollapsibleContent
      className={cn(
        "overflow-hidden text-sm text-popover-foreground outline-none motion-safe:data-[state=open]:animate-collapsible-expand motion-safe:data-[state=closed]:animate-collapsible-collapse",
        className,
      )}
      {...props}
    >
      <div className="ml-4 min-w-0 border-l border-border py-3 pl-4">{children}</div>
    </CollapsibleContent>
  )
}

export {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleRowTrigger,
  CollapsibleInlineTrigger,
  CollapsibleContent,
  CollapsibleInlineContent,
}
