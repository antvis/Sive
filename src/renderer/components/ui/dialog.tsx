"use client"

import { XIcon } from "lucide-react"
import { AlertDialog as AlertDialogPrimitive, Dialog as DialogPrimitive } from "radix-ui"
import * as React from "react"

import { cn } from "../../lib/utils"
import { Button } from "./button"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogCloseButton() {
  return (
    <DialogClose asChild>
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute top-6 right-6 rounded-md"
        aria-label="关闭"
      >
        <XIcon className="size-[18px]" aria-hidden />
      </Button>
    </DialogClose>
  )
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn("fixed inset-0 z-50 bg-scrim backdrop-blur-[2px] [-webkit-app-region:no-drag]", className)}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn("fixed top-1/2 left-1/2 z-50 max-h-[85vh] w-[480px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-3xl bg-surface p-6 shadow-overlay motion-safe:data-[state=open]:animate-dialog-enter", className)}
        {...props}
      >
        {children}
        {showCloseButton && <DialogCloseButton />}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("mb-5 flex min-h-8 flex-col justify-center gap-2 pe-8", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("mt-6 flex justify-end gap-2", className)}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogClose asChild>
          <Button>关闭</Button>
        </DialogClose>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("m-0 text-lg font-semibold text-balance", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("m-0 text-sm leading-6 text-pretty text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground", className)}
      {...props}
    />
  )
}

type ModalProps = React.PropsWithChildren<{
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  footer?: React.ReactNode
  className?: string
}>

function Modal({ open, onOpenChange, title, footer, className, children }: ModalProps) {
  const triggerRef = React.useRef<HTMLElement | null>(null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        onOpenAutoFocus={() => {
          triggerRef.current = document.activeElement as HTMLElement | null
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          triggerRef.current?.focus({ preventScroll: true })
        }}
        className={className}
      >
        <DialogCloseButton />
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}

function AlertDialog({
  title,
  description,
  cancel,
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root> & {
  title: string
  description: string
  cancel: React.ReactElement
}) {
  return (
    <AlertDialogPrimitive.Root {...props}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay data-slot="dialog-overlay" className="fixed inset-0 z-50 bg-scrim backdrop-blur-[2px] [-webkit-app-region:no-drag]" />
        <AlertDialogPrimitive.Content data-slot="dialog-content" className="fixed top-1/2 left-1/2 z-50 max-h-[85vh] w-[480px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-3xl bg-surface p-6 shadow-overlay motion-safe:data-[state=open]:animate-dialog-enter">
          <DialogHeader className="mb-0 pe-0">
            <AlertDialogPrimitive.Title data-slot="dialog-title" className="m-0 text-lg font-semibold text-balance">
              {title}
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description data-slot="dialog-description" className="m-0 text-sm leading-6 text-pretty text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground">
              {description}
            </AlertDialogPrimitive.Description>
          </DialogHeader>
          <DialogFooter>
            <AlertDialogPrimitive.Cancel asChild>{cancel}</AlertDialogPrimitive.Cancel>
            {children}
          </DialogFooter>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  )
}

export {
  AlertDialog,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  Modal,
}
