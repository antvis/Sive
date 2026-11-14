import type { Icon, IconWeight } from '@phosphor-icons/react';
import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: Icon;
  label: string;
  iconSize?: number;
  weight?: IconWeight;
  iconClassName?: string;
  variant?: 'ghost' | 'danger';
};

export function IconButton({
  icon: ButtonIcon,
  label,
  iconSize = 16,
  weight,
  iconClassName,
  className,
  variant = 'ghost',
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex size-8 min-h-0 shrink-0 items-center justify-center rounded-lg p-0 transition-colors disabled:opacity-45',
        variant === 'ghost' && 'text-muted hover:bg-page hover:text-ink',
        variant === 'danger' && 'text-danger hover:bg-danger/10',
        className,
      )}
      {...props}
    >
      <ButtonIcon size={iconSize} weight={weight} className={iconClassName} />
    </button>
  );
}
