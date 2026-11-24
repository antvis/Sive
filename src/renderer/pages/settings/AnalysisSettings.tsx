import { analysisStrategy } from '@shared/api';
import type { Preferences } from '@shared/api';
import { useState } from 'react';
import { SegmentedControl } from '../../components/SegmentedControl';
import { errorMessage } from '../../utils';
import { SettingGroup, SettingInput, SettingRow } from './SettingControls';

const strategyOptions = [
  { value: 'direct', label: '直接分析' },
  { value: 'loop', label: '多步探索' },
] as const;

function sizeInMB(value: string | undefined) {
  const size = Number.parseInt(value ?? '1024', 10);
  return value?.toUpperCase().endsWith('GB') ? size * 1024 : size;
}

function NumberInput({
  label,
  value,
  unit,
  disabled,
  min = 1,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  disabled: boolean;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="relative w-32">
      <SettingInput
        aria-label={label}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        className="pr-11 text-ink"
        onChange={(event) => {
          const next = event.target.valueAsNumber;
          if (Number.isInteger(next) && next >= min && (max === undefined || next <= max)) onChange(next);
        }}
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
        {unit}
      </span>
    </div>
  );
}

function DocumentationLink({ url, label }: { url: string; label: string }) {
  return (
    <button
      type="button"
      className="text-sm text-accent hover:underline"
      onClick={() => void window.workbench.systemOpen('url', url)}
    >
      {label}
    </button>
  );
}

export function AnalysisSettings({ preferences }: { preferences: Preferences }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = async (value: Preferences) => {
    setSaving(true);
    setError('');
    try {
      await window.workbench.settingsSavePreferences(value);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const updateEngine = (value: Partial<Preferences['engine']>) =>
    update({ ...preferences, engine: { ...preferences.engine, ...value } });

  return (
    <>
      <SettingGroup
        title="分析策略"
        action={
          <DocumentationLink
            url="https://ava.antv.vision/documentation/analysis/strategies/"
            label="查看分析策略文档"
          />
        }
      >
        <SettingRow
          title="默认分析方式"
          description="直接分析适合明确的问题。多步探索会分步查询，通常耗时更长，模型调用更多"
        >
          <SegmentedControl
            label="默认分析方式"
            options={strategyOptions}
            value={preferences.strategy.type}
            disabled={saving}
            onValueChange={(type) =>
              void update({
                ...preferences,
                strategy: analysisStrategy(type, preferences.strategy),
              })
            }
          />
        </SettingRow>
        {preferences.strategy.type === 'loop' && (
          <SettingRow title="多步探索轮次上限" description="限制一次多步探索的推理轮次，默认 12 轮">
            <NumberInput
              label="多步探索最大轮次"
              max={50}
              unit="轮"
              value={preferences.strategy.maxSteps ?? 12}
              disabled={saving}
              onChange={(maxSteps) => void update({ ...preferences, strategy: { type: 'loop', maxSteps } })}
            />
          </SettingRow>
        )}
      </SettingGroup>

      <SettingGroup title="Agent 行为">
        <SettingRow
          title="任务执行轮次上限"
          description="限制 Agent 处理单次任务时的执行轮次，以控制工具与模型调用"
        >
          <NumberInput
            label="Agent 最大执行轮次"
            value={preferences.agent.maxSteps}
            unit="轮"
            max={50}
            disabled={saving}
            onChange={(maxSteps) => void update({ ...preferences, agent: { maxSteps } })}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup
        title="AVA DuckDB 引擎"
        action={
          <DocumentationLink
            url="https://ava.antv.vision/documentation/engines/duckdb/"
            label="查看 DuckDB 文档"
          />
        }
      >
        <SettingRow title="内存上限" description="限制单个 DuckDB 引擎可使用的内存">
          <NumberInput
            label="DuckDB 内存上限"
            value={sizeInMB(preferences.engine.memoryLimit)}
            unit="MB"
            min={128}
            step={128}
            disabled={saving}
            onChange={(value) => void updateEngine({ memoryLimit: `${value}MB` })}
          />
        </SettingRow>
        <SettingRow title="工作线程数" description="设置 DuckDB 查询使用的工作线程数量">
          <NumberInput
            label="DuckDB 工作线程数"
            value={preferences.engine.threads ?? 1}
            unit="线程"
            disabled={saving}
            onChange={(threads) => void updateEngine({ threads })}
          />
        </SettingRow>
        <SettingRow title="单次查询超时" description="超过设定时间的查询会被终止">
          <NumberInput
            label="DuckDB 查询超时"
            value={(preferences.engine.queryTimeoutMs ?? 30000) / 1000}
            unit="秒"
            disabled={saving}
            onChange={(value) => void updateEngine({ queryTimeoutMs: value * 1000 })}
          />
        </SettingRow>
        <SettingRow
          title="临时文件上限"
          description="限制 DuckDB 查询产生的临时文件占用，修改后将在下次执行时生效"
        >
          <NumberInput
            label="DuckDB 临时文件上限"
            value={sizeInMB(preferences.engine.maxTempDirectorySize)}
            unit="MB"
            disabled={saving}
            onChange={(value) => void updateEngine({ maxTempDirectorySize: `${value}MB` })}
          />
        </SettingRow>
      </SettingGroup>
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
