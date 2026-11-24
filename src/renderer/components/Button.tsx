import type { ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

export function Button({ className, variant = 'secondary', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={twMerge(
        'inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-base font-medium transition-colors disabled:opacity-45',
        variant === 'primary' && 'bg-accent text-white hover:opacity-90',
        variant === 'secondary' && 'border bg-surface text-ink hover:bg-page',
        variant === 'ghost' && 'text-muted-foreground hover:bg-page hover:text-ink',
        variant === 'danger' && 'border border-danger/30 bg-danger/5 text-danger hover:bg-danger/10',
        className,
      )}
      {...props}
    />
  );
}
