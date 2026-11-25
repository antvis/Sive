import { RadioGroup } from 'radix-ui';
import type { ReactNode } from 'react';

type SegmentedControlProps<Value extends string> = {
  label: string;
  options: readonly { value: Value; label: ReactNode }[];
  value: Value;
  onValueChange: (value: Value) => void;
  disabled?: boolean;
};

export function SegmentedControl<Value extends string>({
  label,
  options,
  value,
  onValueChange,
  disabled,
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
      className="flex flex-wrap gap-0.5 rounded-xl border border-ink/10 bg-workspace-control-active p-0.5"
    >
      {options.map(({ value, label }) => (
        <RadioGroup.Item
          key={value}
          value={value}
          className="flex min-h-8 items-center justify-center gap-1.5 rounded-[9px] px-2.5 py-1 text-sm text-muted-foreground -outline-offset-1 transition-colors hover:text-ink data-[state=checked]:bg-selected data-[state=checked]:text-selected-foreground disabled:opacity-45"
        >
          {label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
