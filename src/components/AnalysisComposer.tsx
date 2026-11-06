import { cx } from '../shared/cx';
import { Button, Dropdown, TextArea, Tooltip } from './ui';
import { ArrowUpIcon, CaretDownIcon, StopCircleIcon } from '@phosphor-icons/react';
import type { Dataset, ModelProfile } from '../../shared/contracts';
import { analysisModes, type AnalysisMode } from '../../shared/analysis-options';
import { usePreferences } from '../preferences';
import { isSendKey } from '../shared/preferences';

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
  busyElsewhere = false,
  busyElsewhereLabel = '其他会话正在分析，结束后可发送',
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
  busyElsewhere?: boolean;
  busyElsewhereLabel?: string;
  cancelling: boolean;
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  onSettings: () => void;
  className?: string;
}) {
  const { preferences } = usePreferences();
  const mac = navigator.platform.includes('Mac');
  const sendKey = preferences.sendShortcut === 'enter' ? 'Enter' : mac ? '⌘ + Enter' : 'Ctrl + Enter';
  const locked = (busy && !busyElsewhere) || submitting;
  const model = models.find((item) => item.id === modelId && item.modelIds.includes(item.model));
  const canSend = !!dataset && !!model && !!question.trim() && !locked && !busy;
  const sendHint = busyElsewhere
    ? busyElsewhereLabel
    : !dataset
      ? '请先打开数据源'
      : !model
        ? '先配置并选择模型'
        : !question.trim()
          ? '输入想分析的问题'
          : `发送 · ${sendKey}`;
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
        <div className="flex items-center gap-0.5 pt-1.5 px-2 pb-2">
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
                const [id, selected] = JSON.parse(key) as [string, string];
                onModel(id, selected);
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
              onClick: ({ key }) => onMode(key as AnalysisMode),
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
          <span className="min-w-[4px] flex-1" />
          {busy && !busyElsewhere ? (
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
      <div className="flex items-center justify-between gap-2 text-muted text-helper min-h-7.5 px-0.5">
        {!model ? (
          <Button variant="link" size="small" className="text-accent text-helper" onClick={onSettings}>
            添加模型后开始分析
          </Button>
        ) : !dataset ? (
          <span>请先打开数据源</span>
        ) : (
          <span>
            {busyElsewhere
              ? busyElsewhereLabel
              : busy
                ? cancelling
                  ? '正在结束本次分析…'
                  : '正在分析，可随时停止'
                : `${sendKey} 发送 · ${preferences.sendShortcut === 'enter' ? 'Shift + Enter' : 'Enter'} 换行`}
          </span>
        )}
      </div>
    </div>
  );
}
