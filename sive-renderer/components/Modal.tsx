import { X } from '@phosphor-icons/react';
import { Dialog } from 'radix-ui';
import type { PropsWithChildren, ReactNode } from 'react';

type ModalProps = PropsWithChildren<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  footer?: ReactNode;
}>;

export function Modal({ open, onOpenChange, title, footer, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#15202bcc]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-50 max-h-[85vh] w-[480px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl border bg-surface p-6 shadow-2xl"
        >
          <div className="mb-5 flex items-center justify-between">
            <Dialog.Title className="m-0 text-lg font-semibold">{title}</Dialog.Title>
            <Dialog.Close
              className="rounded-md p-1 text-muted hover:bg-page hover:text-ink"
              aria-label="关闭"
            >
              <X size={18} />
            </Dialog.Close>
          </div>
          {children}
          {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
