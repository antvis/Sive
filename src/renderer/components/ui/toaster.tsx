import { Toaster as Sonner } from 'sonner';

export function Toaster({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <Sonner
      theme={theme}
      position="bottom-right"
      visibleToasts={1}
      toastOptions={{
        className: 'w-max! max-w-[calc(100vw-32px)]! min-h-[unset]! rounded-xl! border! border-line! bg-surface! px-[12px]! py-[8px]! text-sm! text-ink! shadow-overlay!',
      }}
    />
  );
}
