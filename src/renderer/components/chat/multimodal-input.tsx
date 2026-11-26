import type { ChatStatus } from 'ai';
import { ArrowUpIcon, CpuIcon, RouteIcon, ZapIcon } from 'lucide-react';
import type { ReactNode, RefObject } from 'react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import type { ModelProfile } from '../../types';
import { ComposerFooter } from '../ui/composer';
import { SegmentedControl } from '../ui/segmented-control';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
} from '../ai-elements/prompt-input';
import type { PromptInputMessage } from '../ai-elements/prompt-input';

type Props = {
  welcome: boolean;
  datasetSelector: ReactNode;
  inputRef: RefObject<HTMLTextAreaElement | null>;
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

const analysisModes = [
  {
    value: 'direct',
    label: (
      <>
        <ZapIcon aria-hidden className="size-3 shrink-0 @max-[17rem]/composer:hidden" />
        直接分析
      </>
    ),
  },
  {
    value: 'loop',
    label: (
      <>
        <RouteIcon aria-hidden className="size-3 shrink-0 @max-[17rem]/composer:hidden" />
        多步探索
      </>
    ),
  },
] as const;

export function MultimodalInput({
  welcome,
  datasetSelector,
  inputRef,
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
  const selectedModel = provider ? modelValue(provider.id, provider.model) : '';

  const focusInput = (event: Event) => {
    event.preventDefault();
    inputRef.current?.focus();
  };

  const modelSelector = (
    <Select value={selectedModel} onValueChange={onModelChange} disabled={!models.length || busy}>
      <SelectTrigger
        aria-label="选择模型"
        title={provider?.model}
        className="ml-auto h-7 min-w-0 justify-start rounded-full border-0 bg-transparent px-2 font-normal text-muted-foreground hover:text-foreground"
      >
        <CpuIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        <SelectValue placeholder="选择模型">{provider?.model}</SelectValue>
      </SelectTrigger>
      <SelectContent side="top" align="end" onCloseAutoFocus={focusInput}>
        {models.flatMap((model) =>
          model.modelIds.map((id) => (
            <SelectItem key={modelValue(model.id, id)} value={modelValue(model.id, id)}>
              {model.name} · {id}
            </SelectItem>
          )),
        )}
      </SelectContent>
    </Select>
  );

  const submitButton = (
    <PromptInputSubmit
      className="size-8 rounded-full in-data-conversation-draft:shrink-0 in-data-conversation-draft:enabled:bg-[light-dark(#1768d4,#8bbcff)] in-data-conversation-draft:enabled:text-[light-dark(#fff,#12233a)] in-data-conversation-draft:enabled:hover:bg-[light-dark(#0d55b8,#a7ceff)]"
      status={status}
      onStop={onStop}
      aria-label={busy ? '停止分析' : '发送问题'}
      disabled={!busy && (!value.trim() || disabled)}
      children={busy ? undefined : <ArrowUpIcon className="size-4" />}
    />
  );

  return (
    <PromptInput
      onSubmit={onSubmit}
      onResetCapture={(event) => {
        // Text is cleared by the caller; a native reset also changes the model and strategy.
        event.preventDefault();
        event.stopPropagation();
      }}
      maxFiles={0}
      onError={() => toast.error('当前对话仅支持文字提问。')}
    >
      {datasetSelector && <div className="w-full min-w-0">{datasetSelector}</div>}
      <PromptInputTextarea
        className="min-h-14 px-2 py-2 leading-normal"
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="输入你的分析问题…"
        aria-label="分析问题"
      />
      <ComposerFooter className={welcome ? '@container/composer flex-wrap items-center' : undefined}>
        {welcome ? (
          <>
            <SegmentedControl
              label="分析方式"
              options={analysisModes}
              value={mode}
              onValueChange={onModeChange}
              className={cn(
                'relative isolate grid max-w-full shrink-0 grid-cols-2 gap-0 rounded-full border border-[light-dark(#eef2f7,var(--line))] bg-[light-dark(#f6f8fc,var(--workspace-control))] p-[2px]',
                'before:pointer-events-none before:absolute before:inset-y-[2px] before:left-[2px] before:-z-10 before:w-[calc(50%-2px)] before:rounded-full before:bg-surface before:shadow-card',
                'motion-safe:before:transition-transform motion-safe:before:duration-[380ms] motion-safe:before:ease-[cubic-bezier(.22,1,.36,1)]',
                mode === 'loop' && 'before:translate-x-full',
              )}
              itemClassName="min-h-[24px] gap-[5px] rounded-full px-[6px] py-[3px] leading-tight whitespace-nowrap data-[state=checked]:bg-transparent data-[state=checked]:text-chat-accent"
            />
            <div className="flex min-w-0 flex-1 items-center justify-end gap-1 @max-[20rem]/composer:basis-full">
              {modelSelector}
              {submitButton}
            </div>
          </>
        ) : (
          <>
            <div className="flex min-w-0 flex-1 items-end gap-1">
              <Select value={mode} onValueChange={onModeChange} disabled={busy}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SelectTrigger
                      aria-label="分析方式"
                      className="h-7 shrink-0 rounded-full border-0 bg-workspace-control px-2.5 font-normal text-muted-foreground hover:text-foreground"
                    >
                      <SelectValue />
                    </SelectTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top">选择分析策略</TooltipContent>
                </Tooltip>
                <SelectContent side="top" onCloseAutoFocus={focusInput}>
                  <SelectItem value="direct">
                    <ZapIcon aria-hidden="true" className="size-3.5 text-muted-foreground" />
                    直接分析
                  </SelectItem>
                  <SelectItem value="loop">
                    <RouteIcon aria-hidden="true" className="size-3.5 text-muted-foreground" />
                    多步探索
                  </SelectItem>
                </SelectContent>
              </Select>
              {modelSelector}
            </div>
            {submitButton}
          </>
        )}
      </ComposerFooter>
    </PromptInput>
  );
}
