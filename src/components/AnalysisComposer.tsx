import { Button, Dropdown, TextArea, Tooltip } from './ui';
import { ArrowUpIcon, XIcon, CaretDownIcon, InfoIcon, StopCircleIcon } from '@phosphor-icons/react';
import type { Dataset, ModelProfile } from '../../shared/contracts';
import { analysisModes, type AnalysisMode } from '../../shared/analysis-options';

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
  hasContext,
  onClearContext,
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
  hasContext: boolean;
  onClearContext: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  onSettings: () => void;
}) {
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
          : '发送 · Enter';
  return (
    <div className="composer">
      {hasContext && (
        <div className="composer-context">
          <span>已关联当前会话上下文</span>
          <Button
            variant="ghost"
            size="small"
            icon={<XIcon />}
            aria-label="清除上下文"
            disabled={locked}
            onClick={onClearContext}
          />
        </div>
      )}
      <div
        className={'composer-box' + (locked ? ' is-busy' : '')}
        onKeyDown={(event) => {
          if (
            event.target instanceof HTMLTextAreaElement &&
            event.key === 'Enter' &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing &&
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
        <div className="composer-actions">
          <Dropdown
            placement="topLeft"
            style={{ width: 260, maxHeight: 300, overflowY: 'auto' }}
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
              className="composer-model"
              aria-label="选择模型"
              title={model ? `${model.name} · ${model.model}` : '选择模型'}
              disabled={locked || !models.length}
            >
              <span className="truncate">{model ? `${model.name} · ${model.model}` : '选择模型'}</span>
              <CaretDownIcon />
            </Button>
          </Dropdown>
          <Dropdown
            placement="topRight"
            style={{ width: 280 }}
            disabled={locked}
            menu={{
              selectedKeys: [mode],
              items: analysisModes.map((item) => ({
                key: item.value,
                label: (
                  <div className="analysis-mode-option">
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </div>
                ),
              })),
              onClick: ({ key }) => onMode(key as AnalysisMode),
            }}
          >
            <Button
              variant="ghost"
              size="small"
              className="composer-mode"
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
      <div className="composer-footer">
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
                : 'Enter 发送 · Shift + Enter 换行'}
          </span>
        )}
        <Tooltip title="将向所选模型发送问题、表结构、数据语义及必要的查询结果。">
          <Button variant="ghost" size="small" icon={<InfoIcon />} aria-label="数据发送说明" />
        </Tooltip>
      </div>
    </div>
  );
}
