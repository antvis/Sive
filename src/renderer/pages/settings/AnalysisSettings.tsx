import { analysisStrategy } from '@shared/api';
import type { Preferences } from '@shared/api';
import { Tabs } from 'radix-ui';
import { useState } from 'react';
import { errorMessage } from '../../utils';
import { SettingGroup, SettingRow } from './SettingControls';

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
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  disabled: boolean;
  min?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="relative w-32">
      <input
        aria-label={label}
        type="number"
        min={min}
        step={step}
        value={value}
        disabled={disabled}
        className="h-9 w-full rounded-lg border bg-surface px-3 pr-11 text-sm text-ink outline-none focus:border-accent disabled:opacity-45"
        onChange={(event) => {
          const next = event.target.valueAsNumber;
          if (Number.isInteger(next) && next >= min) onChange(next);
        }}
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
        {unit}
      </span>
    </div>
  );
}

function DocumentationLink({ url }: { url: string }) {
  return (
    <button
      type="button"
      className="ml-1 text-accent hover:underline"
      onClick={() => void window.workbench.systemOpen('url', url)}
    >
      查看文档
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
    <div>
      <SettingGroup
        title="分析策略"
        description={
          <>
            选择直接分析或多步探索。
            <DocumentationLink url="https://ava.antv.vision/documentation/analysis/strategies/" />
          </>
        }
      >
        <SettingRow
          title="默认分析方式"
          description="直接分析适合明确问题；多步探索会逐步查询，通常更慢、调用更多。"
        >
          <Tabs.Root
            value={preferences.strategy.type}
            onValueChange={(type) =>
              void update({
                ...preferences,
                strategy: analysisStrategy(type as 'direct' | 'loop', preferences.strategy),
              })
            }
          >
            <Tabs.List aria-label="默认分析方式" className="flex w-56 rounded-lg bg-page p-1">
              <Tabs.Trigger
                value="direct"
                disabled={saving}
                className="flex-1 rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-sm"
              >
                直接分析
              </Tabs.Trigger>
              <Tabs.Trigger
                value="loop"
                disabled={saving}
                className="flex-1 rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-sm"
              >
                多步探索
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
        </SettingRow>
        {preferences.strategy.type === 'loop' && (
          <SettingRow title="最大轮次" description="限制 AVA 多步探索的正常推理轮次，默认 12 轮。">
            <input
              aria-label="多步探索最大轮次"
              type="number"
              min={1}
              max={50}
              step={1}
              value={preferences.strategy.maxSteps}
              disabled={saving}
              className="h-9 w-24 rounded-lg border bg-surface px-3 text-sm text-ink outline-none focus:border-accent disabled:opacity-45"
              onChange={(event) => {
                const maxSteps = event.target.valueAsNumber;
                if (Number.isInteger(maxSteps) && maxSteps >= 1 && maxSteps <= 50)
                  void update({ ...preferences, strategy: { type: 'loop', maxSteps } });
              }}
            />
          </SettingRow>
        )}
      </SettingGroup>

      <SettingGroup
        title="AVA DuckDB 引擎"
        description={
          <>
            配置查询资源与临时文件限制。
            <DocumentationLink url="https://ava.antv.vision/documentation/engines/duckdb/" />
          </>
        }
      >
        <SettingRow title="内存上限" description="限制单个 DuckDB 引擎可使用的内存。">
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
        <SettingRow title="工作线程数" description="设置 DuckDB 查询使用的工作线程数量。">
          <NumberInput
            label="DuckDB 工作线程数"
            value={preferences.engine.threads ?? 1}
            unit="线程"
            disabled={saving}
            onChange={(threads) => void updateEngine({ threads })}
          />
        </SettingRow>
        <SettingRow title="单次查询超时" description="超过设定时间的查询会被终止。">
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
          description="限制 DuckDB 查询产生的临时文件占用，修改后将在下次执行时生效。"
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
      {error && <p className="mt-0 text-sm text-danger">{error}</p>}
    </div>
  );
}
