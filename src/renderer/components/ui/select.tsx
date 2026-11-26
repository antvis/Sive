"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "radix-ui"

import { cn } from "../../lib/utils"
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from "lucide-react"
import { DropdownList } from "./dropdown-list"

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectGroup({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  )
}

function SelectValue(props: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        'w-full min-w-0 rounded-lg border border-input bg-surface px-3 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-focus/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        "flex h-8 w-fit max-w-full items-center justify-between gap-1.5 text-left text-ink hover:bg-workspace-control aria-expanded:bg-selected aria-expanded:text-selected-foreground data-placeholder:text-placeholder *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:truncate [&_[data-slot=select-value]_:is(img,svg)]:me-1.5 [&_[data-slot=select-value]_:is(img,svg)]:inline-block [&_[data-slot=select-value]_:is(img,svg)]:align-middle",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="pointer-events-none size-3.5 shrink-0 text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

type SelectFieldProps = {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
  className?: string
  "aria-label": string
}

function SelectField({
  value,
  onChange,
  options,
  disabled,
  className,
  "aria-label": ariaLabel,
}: SelectFieldProps) {
  const selected = options.find((option) => option.value === value) ?? options[0]

  // Radix reserves the empty string for clearing the selection.
  return (
    <Select
      value={selected ? `:${selected.value}` : ""}
      onValueChange={(next) => onChange(next.slice(1))}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn("w-42 max-sm:w-full", className)}
        aria-label={ariaLabel}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="min-w-(--radix-select-trigger-width)">
        {options.map((option) => (
          <SelectItem key={option.value} value={`:${option.value}`}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function SelectContent({
  className,
  children,
  position = "popper",
  align = "start",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          'relative z-50 min-w-44 overflow-x-hidden overflow-y-auto rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-overlay [--dropdown-enter-transform:translateY(-6px)] data-[side=top]:[--dropdown-enter-transform:translateY(6px)] data-[side=left]:[--dropdown-enter-transform:translateX(6px)] data-[side=right]:[--dropdown-enter-transform:translateX(-6px)] motion-safe:data-[state=open]:animate-dropdown-open motion-safe:data-[state=closed]:animate-dropdown-close',
          "p-1",
          "max-h-(--radix-select-content-available-height) max-w-[min(34rem,var(--radix-select-content-available-width))] origin-(--radix-select-content-transform-origin)",
          className
        )}
        position={position}
        align={align}
        sideOffset={sideOffset}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          data-position={position}
          className="relative data-[position=popper]:w-full data-[position=popper]:min-w-(--radix-select-trigger-width)"
        >
          <DropdownList>{children}</DropdownList>
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("px-3 py-2.5 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        'relative z-10 flex min-h-[30px] w-full cursor-default items-center gap-2 rounded-md py-1.5 pl-2 text-sm leading-4 font-normal outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
        "pr-8 data-[state=checked]:text-selected-foreground *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="pointer-events-none size-3.5 text-selected-foreground" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText className="min-w-0 [overflow-wrap:anywhere]">{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(
        "pointer-events-none -mx-1 my-1 h-px bg-border/50",
        className
      )}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "z-10 flex cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronUpIcon
      />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "z-10 flex cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronDownIcon
      />
    </SelectPrimitive.ScrollDownButton>
  )
}

export {
  Select,
  SelectContent,
  SelectField,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
