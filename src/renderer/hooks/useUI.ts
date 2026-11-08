import { createContext, useContext } from 'react';
import { toast } from 'sonner';
import type { ConfirmOptions } from '@renderer/types/ui';

export const UIContext = createContext<{ confirm: (options: ConfirmOptions) => Promise<boolean> } | null>(
  null,
);
export function useUI(): { message: typeof toast; confirm: (options: ConfirmOptions) => Promise<boolean> } {
  const context = useContext(UIContext);
  if (!context) throw new Error('UIProvider is missing');
  return { message: toast, confirm: context.confirm };
}
