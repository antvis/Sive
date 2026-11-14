import type { Icon, IconWeight } from '@phosphor-icons/react';
import clsx from 'clsx';
import { Tooltip } from 'radix-ui';
import type { ComponentPropsWithRef, ReactNode } from 'react';

type IconButtonProps = Omit<ComponentPropsWithRef<'button'>, 'children'> & {
  icon: Icon;
  label: string;
  tooltip?: ReactNode;
  iconSize?: number;
  weight?: IconWeight;
  iconClassName?: string;
  variant?: 'ghost' | 'danger';
};

export function IconButton({
  icon: ButtonIcon,
  label,
  tooltip,
  iconSize = 16,
  weight,
  iconClassName,
  className,
  variant = 'ghost',
  type = 'button',
  ...props
}: IconButtonProps) {
  const button = (
    <button
      type={type}
      aria-label={label}
      title={tooltip ? undefined : label}
      className={clsx(
        'inline-flex size-8 min-h-0 shrink-0 items-center justify-center rounded-lg p-0 transition-colors disabled:opacity-45',
        variant === 'ghost' && 'text-muted hover:bg-line/50 hover:text-ink',
        variant === 'danger' && 'text-danger hover:bg-danger/10',
        className,
      )}
      {...props}
    >
      <ButtonIcon size={iconSize} weight={weight} className={iconClassName} />
    </button>
  );
  if (!tooltip) return button;

  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{button}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="bottom"
            sideOffset={6}
            className="z-50 flex items-center gap-2 rounded-xl bg-[#202325] px-3 py-2 text-sm font-medium text-white shadow-lg"
          >
            {tooltip === true ? label : tooltip}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
