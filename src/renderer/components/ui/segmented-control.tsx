import { RadioGroup } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type SegmentedControlProps<Value extends string> = {
  label: string;
  options: readonly { value: Value; label: ReactNode }[];
  value: Value;
  onValueChange: (value: Value) => void;
  disabled?: boolean;
  className?: string;
  itemClassName?: string;
};

export function SegmentedControl<Value extends string>({
  label,
  options,
  value,
  onValueChange,
  disabled,
  className,
  itemClassName,
}: SegmentedControlProps<Value>) {
  return (
    <RadioGroup.Root
      data-slot="segmented-control"
      aria-label={label}
      orientation="horizontal"
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        const option = options.find(({ value }) => value === next);
        if (option) onValueChange(option.value);
      }}
      className={cn('flex flex-wrap gap-0.5 rounded-xl bg-workspace-control p-0.5', className)}
    >
      {options.map(({ value, label }) => (
        <RadioGroup.Item
          key={value}
          value={value}
          className={cn(
            'flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1 text-sm text-muted-foreground -outline-offset-1 transition-colors hover:text-ink data-[state=checked]:bg-selected data-[state=checked]:text-selected-foreground disabled:opacity-45',
            itemClassName,
          )}
        >
          {label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
