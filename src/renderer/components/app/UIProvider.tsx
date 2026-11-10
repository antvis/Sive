import { useRef, useState, type ReactNode } from 'react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';
import { Toaster } from 'sonner';
import { useTheme } from '@renderer/hooks/useTheme';
import { UIContext } from '@renderer/hooks/useUI';
import type { ConfirmOptions } from '@renderer/types/ui';
import { Modal } from '@renderer/components/ui/overlays';

export function UIProvider({ children }: { children: ReactNode }) {
  const [confirmation, setConfirmation] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((result: boolean) => void) | null>(null);
  const { dark } = useTheme();

  const close = (result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setConfirmation(null);
  };
  return (
    <UIContext.Provider
      value={{
        confirm: (options) => {
          resolver.current?.(false);
          setConfirmation(options);
          return new Promise((resolve) => {
            resolver.current = resolve;
          });
        },
      }}
    >
      <TooltipPrimitive.Provider delayDuration={350}>{children}</TooltipPrimitive.Provider>
      <Toaster
        theme={dark ? 'dark' : 'light'}
        position="bottom-right"
        toastOptions={{ className: 'ui-toast' }}
      />
      <Modal
        open={!!confirmation}
        title={confirmation?.title}
        onCancel={() => close(false)}
        okText={confirmation?.okText}
        cancelText={confirmation?.cancelText}
        okButtonProps={confirmation?.okButtonProps}
        onOk={async () => {
          await confirmation?.onOk();
          close(true);
        }}
      >
        <p className="mt-0 mb-4 text-muted">{confirmation?.content}</p>
      </Modal>
    </UIContext.Provider>
  );
}
