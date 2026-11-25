import type { ThemeSpec } from '@antv/gpt-vis';
import { ChartColumnIncreasingIcon, CheckIcon, Grid2X2Icon } from 'lucide-react';
import { useContext, useState } from 'react';
import type { RefObject } from 'react';
import { createChartTheme, ThemeContext } from '../../theme';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

export function TemplatePicker({
  value,
  templates,
  disabled,
  buttonRef,
  onChange,
}: {
  value: string;
  templates: { value: string; label: string; theme?: ThemeSpec }[];
  disabled: boolean;
  buttonRef?: RefObject<HTMLButtonElement | null>;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const theme = useContext(ThemeContext);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger ref={buttonRef} asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`切换模板，当前：${value}`}
          title={`切换模板，当前：${value}`}
          className="text-sidebar-muted"
          disabled={disabled}
        >
          <Grid2X2Icon className="size-[14px]" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
          aria-label="选择 Snippet 模板"
          align="end"
          className="w-80"
        >
          <p className="mt-0 mb-3 text-xs font-medium text-muted-foreground">选择模板</p>
          <div className="grid grid-cols-3 gap-2">
            {templates.map((template) => {
              const { tokens } = template.theme ?? createChartTheme(theme);
              return (
                <Button
                  key={template.value}
                  type="button"
                  aria-pressed={value === template.value}
                  onClick={() => {
                    setOpen(false);
                    if (value !== template.value) onChange(template.value);
                  }}
                  className="block min-w-0 overflow-hidden p-1 text-left font-normal hover:border-muted aria-pressed:border-focus/40"
                >
                  <span
                    aria-hidden
                    style={{ background: tokens?.colorBackground, color: tokens?.colorDefault }}
                    className="flex h-14 items-center justify-center rounded-t-md"
                  >
                    <ChartColumnIncreasingIcon size={30} />
                  </span>
                  <span aria-hidden className="flex h-2 overflow-hidden rounded-b-sm">
                    {tokens?.category10?.slice(0, 5).map((color, index) => (
                      <span key={index} className="flex-1" style={{ background: color }} />
                    ))}
                  </span>
                  <span className="flex items-center justify-between gap-1 px-1 pt-2 pb-1 text-xs">
                    {template.label}
                    {value === template.value && <CheckIcon size={12} aria-hidden />}
                  </span>
                </Button>
              );
            })}
          </div>
      </PopoverContent>
    </Popover>
  );
}
