import { cx } from '../shared/cx';
import { Button, Dropdown, TextArea, Tooltip } from './ui';
import { ArrowUpIcon, CaretDownIcon, InfoIcon, StopCircleIcon } from '@phosphor-icons/react';
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
    <div className="composer pt-2 pr-3 pb-1.5 pl-3 bg-surface shrink-0">
      <div
        className={cx(
          'border border-line rounded-panel bg-surface shadow-[0_2px_6px_color-mix(in_srgb,_var(--text)_4%,_transparent)] overflow-visible [transition:border-color_120ms] focus-within:border-accent [&_.ui-textarea]:pt-3 [&_.ui-textarea]:pr-3 [&_.ui-textarea]:pb-1 [&_.ui-textarea]:pl-3 [&_.ui-textarea]:text-body [&_.ui-textarea]:leading-[1.7] [&_.ui-textarea]:bg-transparent [&.is-busy]:bg-page',
          locked ? ' is-busy' : '',
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
        />
        <div className="flex items-center gap-0.5 pt-1.5 pr-2 pb-2 pl-2 [&_.ui-button]:h-7 [&_.ui-button]:text-helper [&_.composer-model]:min-w-0 [&_.composer-model]:max-w-45 [&_.composer-model]:flex-initial [&_.composer-model]:gap-[5px] [&_.composer-model]:text-muted [&_.composer-mode]:shrink-0 [&_.composer-mode]:gap-[5px] [&_.composer-mode]:text-muted [&_.composer-send]:w-7.5 [&_.composer-send]:h-7.5 [&_.composer-send]:shrink-0 [&_.composer-send]:rounded-control [&_.composer-send]:text-title">
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
              className="composer-model [&_.ui-icon]:w-3 [&_.ui-icon]:h-3"
              aria-label="选择模型"
              title={model ? `${model.name} · ${model.model}` : '选择模型'}
              disabled={locked || !models.length}
            >
              <span className="truncate">{model ? `${model.name} · ${model.model}` : '选择模型'}</span>
              <CaretDownIcon />
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
                  <div className="max-w-62.5 py-[3px] px-0">
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
              className="composer-mode [&_.ui-icon]:w-3 [&_.ui-icon]:h-3"
              aria-label="分析方式"
              disabled={locked}
            >
              {analysisModes.find((item) => item.value === mode)?.label}
              <CaretDownIcon />
            </Button>
          </Dropdown>
          <span className="min-w-[4px] flex-1" />
          {busy && !busyElsewhere ? (
            <Tooltip title={cancelling ? '正在停止' : '停止分析'}>
              <Button
                className="composer-send"
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
                className="composer-send"
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
      <div className="flex items-center justify-between gap-2 text-muted text-caption min-h-7.5 px-0.5 [&_.ui-button]:text-muted [&_.ui-button]:text-caption [&_.ui-button-link]:text-accent">
        {!model ? (
          <Button variant="link" size="small" onClick={onSettings}>
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
        <Tooltip title="将向所选模型发送问题、表结构、数据语义及必要的查询结果。">
          <Button variant="ghost" size="small" icon={<InfoIcon />} aria-label="数据发送说明" />
        </Tooltip>
      </div>
    </div>
  );
}
