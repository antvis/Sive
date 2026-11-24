import { ChartBar, Check, SquaresFour } from '@phosphor-icons/react';
import { Popover } from 'radix-ui';
import { useContext, useState } from 'react';
import type { RefObject } from 'react';
import { twMerge } from 'tailwind-merge';
import { createChartTheme, ThemeContext } from '../../theme';
import { IconButton } from '../IconButton';
import type { SnippetTemplateProps } from './index';

export function TemplatePicker({
  value,
  templates,
  disabled,
  buttonRef,
  onChange,
}: {
  value: string;
  templates: SnippetTemplateProps['templates'];
  disabled: boolean;
  buttonRef: RefObject<HTMLButtonElement | null>;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const theme = useContext(ThemeContext);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger ref={buttonRef} asChild>
        <IconButton
          icon={SquaresFour}
          label={`切换模板，当前：${value}`}
          disabled={disabled}
          className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label="选择 Snippet 模板"
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className="z-50 w-80 max-w-[calc(100vw-32px)] rounded-xl border bg-surface p-3 font-sans text-ink shadow-xl"
        >
          <p className="mt-0 mb-3 text-xs font-medium text-muted-foreground">选择模板</p>
          <div className="grid grid-cols-3 gap-2">
            {templates.map((template) => {
              const { tokens } = template.theme ?? createChartTheme(theme);
              return (
                <button
                  key={template.value}
                  type="button"
                  aria-pressed={value === template.value}
                  onClick={() => {
                    setOpen(false);
                    if (value !== template.value) onChange(template.value);
                  }}
                  className={twMerge(
                    'min-w-0 overflow-hidden rounded-lg border bg-surface p-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                    value === template.value ? 'border-accent! ring-1 ring-accent' : 'hover:border-muted!',
                  )}
                >
                  <span
                    aria-hidden
                    style={{ background: tokens?.colorBackground, color: tokens?.colorDefault }}
                    className="flex h-14 items-center justify-center rounded-t-md"
                  >
                    <ChartBar size={30} weight="duotone" />
                  </span>
                  <span aria-hidden className="flex h-2 overflow-hidden rounded-b-sm">
                    {tokens?.category10?.slice(0, 5).map((color, index) => (
                      <span key={index} className="flex-1" style={{ background: color }} />
                    ))}
                  </span>
                  <span className="flex items-center justify-between gap-1 px-1 pt-2 pb-1 text-xs">
                    {template.label}
                    {value === template.value && <Check size={12} aria-hidden className="text-accent" />}
                  </span>
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
