import { CaretDown } from '@phosphor-icons/react';
import clsx from 'clsx';

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  compact?: boolean;
  'aria-label': string;
};

export function Select({
  value,
  onChange,
  options,
  disabled,
  compact,
  'aria-label': ariaLabel,
}: SelectProps) {
  return (
    <div className="relative w-42 max-sm:w-full">
      <select
        aria-label={ariaLabel}
        className={clsx(
          'w-full appearance-none rounded-lg border bg-surface px-3 pr-8 text-ink outline-none focus:border-accent disabled:opacity-45',
          compact ? 'h-8 text-xs' : 'h-9 text-sm',
        )}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <CaretDown
        size={14}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
        aria-hidden
      />
    </div>
  );
}
