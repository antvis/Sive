import type { ChatStatus } from 'ai';
import { ArrowUpIcon, RouteIcon, ZapIcon } from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';
import type { ModelProfile } from '../../types';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '../ai-elements/prompt-input';
import type { PromptInputMessage } from '../ai-elements/prompt-input';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (message: PromptInputMessage) => Promise<void>;
  onStop: () => void;
  status: ChatStatus;
  disabled: boolean;
  models: ModelProfile[];
  activeModelId: string;
  onModelChange: (value: string) => void;
  mode: 'direct' | 'loop';
  onModeChange: (value: string) => void;
};

const modelValue = (providerId: string, model: string) => JSON.stringify([providerId, model]);

export function MultimodalInput({
  value,
  onChange,
  onSubmit,
  onStop,
  status,
  disabled,
  models,
  activeModelId,
  onModelChange,
  mode,
  onModeChange,
}: Props) {
  const provider = models.find((model) => model.id === activeModelId);
  const busy = status === 'submitted' || status === 'streaming';
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const selectedModel = provider ? modelValue(provider.id, provider.model) : '';

  const focusInput = (event: Event) => {
    event.preventDefault();
    inputRef.current?.focus();
  };

  return (
    <PromptInput
      className={cn(
        'motion-reduce:transition-none! motion-reduce:**:transition-none!',
        '[&_[data-slot=input-group]]:gap-1.5 [&_[data-slot=input-group]]:rounded-[14px]! [&_[data-slot=input-group]]:border-border [&_[data-slot=input-group]]:bg-background [&_[data-slot=input-group]]:p-1.5',
        '[&_[data-slot=input-group]]:shadow-[0_1px_3px_rgb(0_0_0/5%),0_1px_1px_rgb(0_0_0/3%)] dark:[&_[data-slot=input-group]]:shadow-[inset_0_1px_0_rgb(255_255_255/3%),0_1px_3px_rgb(0_0_0/20%)]',
        '[&_[data-slot=input-group]]:transition-[border-color,border-radius] [&_[data-slot=input-group]]:duration-150 [&_[data-slot=input-group]]:ease-[ease]',
        '[&_[data-slot=input-group]]:focus-within:border-ring! [&_[data-slot=input-group]]:focus-within:ring-0!',
      )}
      onSubmit={onSubmit}
      onResetCapture={(event) => {
        // Text is cleared by the caller; a native reset also changes the model and strategy.
        event.preventDefault();
        event.stopPropagation();
      }}
      maxFiles={0}
      onError={() => toast.error('当前对话仅支持文字提问。')}
    >
      <PromptInputBody>
        <PromptInputTextarea
          ref={inputRef}
          rows={2}
          className="max-h-25 min-h-[46px] px-1 py-[5px] text-base leading-[16px] placeholder:text-muted-foreground md:text-base"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="输入你的分析问题…"
          aria-label="分析问题"
        />
      </PromptInputBody>
      <PromptInputFooter className="items-end gap-1 p-0">
        <PromptInputTools className="min-w-0 flex-1 items-end">
          <PromptInputSelect value={mode} onValueChange={onModeChange} disabled={busy}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PromptInputSelectTrigger
                  aria-label="分析方式"
                  size="sm"
                  className="shrink-0 rounded-lg px-1.5 text-base font-normal transition-[background-color,color,transform] duration-150 ease-[ease] hover:bg-secondary active:scale-[0.94] data-[size=sm]:h-7"
                >
                  <PromptInputSelectValue />
                </PromptInputSelectTrigger>
              </TooltipTrigger>
              <TooltipContent className="chat-theme rounded-lg text-base" side="top" sideOffset={6}>
                选择分析策略
              </TooltipContent>
            </Tooltip>
            <PromptInputSelectContent
              className="chat-theme text-base [&_[data-slot=select-item]]:min-h-[30px] [&_[data-slot=select-item]]:text-base [&_[data-slot=select-item]]:leading-4 [&_[data-slot=select-item]]:font-normal"
              side="top"
              onCloseAutoFocus={focusInput}
            >
              <PromptInputSelectItem value="direct">
                <ZapIcon aria-hidden="true" className="size-3.5 text-muted-foreground" />
                直接分析
              </PromptInputSelectItem>
              <PromptInputSelectItem value="loop">
                <RouteIcon aria-hidden="true" className="size-3.5 text-muted-foreground" />
                多步探索
              </PromptInputSelectItem>
            </PromptInputSelectContent>
          </PromptInputSelect>
          <PromptInputSelect
            value={selectedModel}
            onValueChange={onModelChange}
            disabled={!models.length || busy}
          >
            <PromptInputSelectTrigger
              aria-label="选择模型"
              size="sm"
              className="ml-auto min-h-7 min-w-0 max-w-full rounded-lg px-1.5 py-1 text-left text-base font-normal whitespace-normal transition-[background-color,color,transform] duration-150 ease-[ease] hover:bg-secondary active:scale-[0.94] data-[size=sm]:h-auto *:data-[slot=select-value]:line-clamp-none"
            >
              <PromptInputSelectValue className="min-w-0 break-all" placeholder="选择模型">
                {provider?.model}
              </PromptInputSelectValue>
            </PromptInputSelectTrigger>
            <PromptInputSelectContent
              className="chat-theme text-base [&_[data-slot=select-item]]:min-h-[30px] [&_[data-slot=select-item]]:text-base [&_[data-slot=select-item]]:leading-4 [&_[data-slot=select-item]]:font-normal"
              side="top"
              onCloseAutoFocus={focusInput}
            >
              {models.flatMap((model) =>
                model.modelIds.map((id) => (
                  <PromptInputSelectItem key={modelValue(model.id, id)} value={modelValue(model.id, id)}>
                    {model.name} · {id}
                  </PromptInputSelectItem>
                )),
              )}
            </PromptInputSelectContent>
          </PromptInputSelect>
        </PromptInputTools>
        <PromptInputSubmit
          className={cn(
            'size-7 shrink-0 rounded-lg transition-[background-color,color,transform] duration-200 active:translate-y-0 enabled:active:scale-[0.94]',
            value.trim() || busy
              ? 'bg-foreground text-background hover:bg-foreground/90'
              : 'cursor-not-allowed bg-border text-muted-foreground disabled:opacity-100',
          )}
          status={status}
          variant="secondary"
          onStop={onStop}
          aria-label={busy ? '停止分析' : '发送问题'}
          disabled={!busy && (!value.trim() || disabled)}
          children={busy ? undefined : <ArrowUpIcon className="size-4" />}
        />
      </PromptInputFooter>
    </PromptInput>
  );
}
