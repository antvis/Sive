import { cx } from '@renderer/utils/cx';
import { Button, Dropdown, TextArea, Tooltip } from '@renderer/components/ui/index';
import { ArrowUpIcon, CaretDownIcon, StopCircleIcon } from '@phosphor-icons/react';
import type { Dataset, ModelProfile, AnalysisMode } from '@shared/contracts';
import { analysisModes } from '../../data/analysisOptions';
import { usePreferences } from '@renderer/hooks/usePreferences';
import { isSendKey } from '@renderer/utils/keyboard';

export default function AnalysisComposer({
  question,
  onChange,
  dataset,
  models,
  modelId,
  onModel,
  mode,
  onMode,
  busy,
  refreshing,
  cancelling,
  submitting,
  onSubmit,
  onCancel,
  onSettings,
  className,
}: {
  question: string;
  onChange: (text: string) => void;
  dataset?: Dataset;
  models: ModelProfile[];
  modelId: string;
  onModel: (id: string, model: string) => void;
  mode: AnalysisMode;
  onMode: (mode: AnalysisMode) => void;
  busy: boolean;
  refreshing: boolean;
  cancelling: boolean;
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  onSettings: () => void;
  className?: string;
}) {
  const { preferences } = usePreferences();
  const mac = navigator.platform.includes('Mac');
  const modifier = mac ? '⌘' : 'Ctrl';
  const sendKey = preferences.sendShortcut === 'enter' ? 'Enter' : `${modifier} + Enter`;
  const locked = submitting;
  const model = models.find((item) => item.id === modelId && item.modelIds.includes(item.model));
  const canSend = !!dataset && !!model && !!question.trim() && !locked && !busy && !refreshing;
  let sendHint = `发送 · ${sendKey}`;
  if (!question.trim()) sendHint = '输入想分析的问题';
  if (!model) sendHint = '先配置并选择模型';
  if (!dataset) sendHint = '请先打开数据源';
  if (refreshing) sendHint = '收藏的分析正在刷新，完成后可发送';

  const newlineKey = preferences.sendShortcut === 'enter' ? 'Shift + Enter' : 'Enter';
  let footerHint = `${sendKey} 发送 · ${newlineKey} 换行`;
  if (busy) footerHint = '正在分析，可编辑下一条问题或切换会话';
  if (busy && cancelling) footerHint = '正在结束本次分析…';
  if (refreshing) footerHint = '收藏的分析正在刷新，完成后可发送';
  if (!dataset) footerHint = '请先打开数据源';
  return (
    <div className={cx('pt-2 px-3 pb-1.5 bg-surface shrink-0', className)}>
      <div
        className={cx(
          'border border-line rounded-panel bg-surface shadow-[0_2px_6px] shadow-ink/4 overflow-visible [transition:border-color_120ms] focus-within:border-accent',
          locked && 'bg-page',
        )}
        onKeyDown={(event) => {
          if (
            event.target instanceof HTMLTextAreaElement &&
            isSendKey(event.nativeEvent, preferences.sendShortcut, mac) &&
            !event.defaultPrevented
          ) {
            event.preventDefault();
            if (canSend && !event.repeat) onSubmit();
          }
        }}
      >
        <TextArea
          aria-label="分析问题"
          value={question}
          onChange={(event) => onChange(event.target.value)}
          placeholder="描述想分析的问题…"
          autoSize={{ minRows: 3, maxRows: 7 }}
          disabled={locked}
          variant="borderless"
          className="pt-3 px-3 pb-1"
        />
        <div className="flex flex-wrap items-center gap-x-0.5 gap-y-1 pt-1.5 px-2 pb-2">
          <Dropdown
            contentClassName="w-65 max-h-75 overflow-y-auto"
            placement="topLeft"

            disabled={locked || !models.length}
            menu={{
              selectedKeys: model ? [JSON.stringify([model.id, model.model])] : [],
              items: models.map((item) => ({
                key: item.id,
                label: item.name,
                disabled: !item.modelIds.length,
                children: item.modelIds.map((id) => ({ key: JSON.stringify([item.id, id]), label: id })),
              })),
              onClick: ({ key }) => {
                for (const item of models)
                  for (const selected of item.modelIds)
                    if (JSON.stringify([item.id, selected]) === key) {
                      onModel(item.id, selected);
                      return;
                    }
              },
            }}
          >
            <Button
              variant="ghost"
              size="small"
              className="min-w-0 max-w-45 flex-initial gap-1 hover:text-muted"
              aria-label="选择模型"
              title={model ? `${model.name} · ${model.model}` : '选择模型'}
              disabled={locked || !models.length}
            >
              <span className="truncate">{model ? `${model.name} · ${model.model}` : '选择模型'}</span>
              <CaretDownIcon size={12} />
            </Button>
          </Dropdown>
          <Dropdown
            contentClassName="w-70"
            placement="topRight"

            disabled={locked}
            menu={{
              selectedKeys: [mode],
              items: analysisModes.map((item) => ({
                key: item.value,
                label: (
                  <div className="max-w-62.5 py-1 px-0">
                    <strong>{item.label}</strong>
                    <small className="block text-muted mt-1 leading-[1.5]">{item.description}</small>
                  </div>
                ),
              })),
              onClick: ({ key }) => onMode(key),
            }}
          >
            <Button
              variant="ghost"
              size="small"
              className="shrink-0 gap-1 hover:text-muted"
              aria-label="分析方式"
              disabled={locked}
            >
              {analysisModes.find((item) => item.value === mode)?.label}
              <CaretDownIcon size={12} />
            </Button>
          </Dropdown>
          <div className="ml-auto flex min-w-0 max-w-full items-center gap-2">
            {!model ? (
              <Button variant="link" size="small" className="text-accent text-helper" onClick={onSettings}>
                添加模型后开始分析
              </Button>
            ) : (
              <span className="min-w-0 truncate text-muted text-helper" title={footerHint}>
                {footerHint}
              </span>
            )}
            {busy ? (
              <Tooltip title={cancelling ? '正在停止' : '停止分析'}>
                <Button
                  className="size-7.5 shrink-0 rounded-control text-title"
                  danger
                  aria-label={cancelling ? '正在停止' : '停止分析'}
                  disabled={cancelling}
                  icon={<StopCircleIcon />}
                  onClick={onCancel}
                />
              </Tooltip>
            ) : (
              <Tooltip title={sendHint}>
                <Button
                  className="size-7.5 shrink-0 rounded-control text-title"
                  variant="primary"
                  aria-label="开始分析"
                  loading={submitting}
                  disabled={!canSend}
                  icon={<ArrowUpIcon />}
                  onClick={onSubmit}
                />
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
