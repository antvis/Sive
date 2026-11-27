import { i18n, useI18n } from '../../i18n';
import { analysisStrategy } from '@shared/api';
import type { Preferences } from '@shared/api';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { SegmentedControl } from '../../components/ui/segmented-control';
import { errorMessage } from '../../utils';
import { SettingGroup, SettingRow } from './SettingControls';

const strategyOptions = [
  {
    value: 'direct',
    get label() {
      return i18n('analysis.strategies.direct');
    },
  },
  {
    value: 'loop',
    get label() {
      return i18n('analysis.strategies.loop');
    },
  },
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
  useI18n();
  return (
    <div className="relative w-32">
      <Input
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
  useI18n();
  return (
    <Button variant="link" onClick={() => void window.workbench.systemOpen('url', url)}>
      {label}
    </Button>
  );
}

export function AnalysisSettings({ preferences }: { preferences: Preferences }) {
  useI18n();
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
        title={i18n('settings.analysis.strategy.title')}
        action={
          <DocumentationLink
            url="https://ava.antv.vision/documentation/analysis/strategies/"
            label={i18n('settings.analysis.strategy.documentation')}
          />
        }
      >
        <SettingRow
          title={i18n('settings.analysis.strategy.defaultTitle')}
          description={i18n('settings.analysis.strategy.description')}
        >
          <SegmentedControl
            label={i18n('settings.analysis.strategy.defaultTitle')}
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
          <SettingRow
            title={i18n('settings.analysis.strategy.roundLimitTitle')}
            description={i18n('settings.analysis.strategy.roundLimitDescription')}
          >
            <NumberInput
              label={i18n('settings.analysis.strategy.roundLimitLabel')}
              max={50}
              unit={i18n('settings.analysis.units.rounds')}
              value={preferences.strategy.maxSteps ?? 12}
              disabled={saving}
              onChange={(maxSteps) => void update({ ...preferences, strategy: { type: 'loop', maxSteps } })}
            />
          </SettingRow>
        )}
      </SettingGroup>

      <SettingGroup title={i18n('settings.analysis.agent.title')}>
        <SettingRow
          title={i18n('settings.analysis.agent.roundLimitTitle')}
          description={i18n('settings.analysis.agent.roundLimitDescription')}
        >
          <NumberInput
            label={i18n('settings.analysis.agent.roundLimitLabel')}
            value={preferences.agent.maxSteps}
            unit={i18n('settings.analysis.units.rounds')}
            max={50}
            disabled={saving}
            onChange={(maxSteps) => void update({ ...preferences, agent: { maxSteps } })}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup
        title={i18n('settings.analysis.engine.title')}
        action={
          <DocumentationLink
            url="https://ava.antv.vision/documentation/engines/duckdb/"
            label={i18n('settings.analysis.engine.documentation')}
          />
        }
      >
        <SettingRow
          title={i18n('settings.analysis.engine.memoryTitle')}
          description={i18n('settings.analysis.engine.memoryDescription')}
        >
          <NumberInput
            label={i18n('settings.analysis.engine.memoryLabel')}
            value={sizeInMB(preferences.engine.memoryLimit)}
            unit="MB"
            min={128}
            step={128}
            disabled={saving}
            onChange={(value) => void updateEngine({ memoryLimit: `${value}MB` })}
          />
        </SettingRow>
        <SettingRow
          title={i18n('settings.analysis.engine.threadsTitle')}
          description={i18n('settings.analysis.engine.threadsDescription')}
        >
          <NumberInput
            label={i18n('settings.analysis.engine.threadsLabel')}
            value={preferences.engine.threads ?? 1}
            unit={i18n('settings.analysis.units.threads')}
            disabled={saving}
            onChange={(threads) => void updateEngine({ threads })}
          />
        </SettingRow>
        <SettingRow
          title={i18n('settings.analysis.engine.timeoutTitle')}
          description={i18n('settings.analysis.engine.timeoutDescription')}
        >
          <NumberInput
            label={i18n('settings.analysis.engine.timeoutLabel')}
            value={(preferences.engine.queryTimeoutMs ?? 30000) / 1000}
            unit={i18n('common.units.seconds')}
            disabled={saving}
            onChange={(value) => void updateEngine({ queryTimeoutMs: value * 1000 })}
          />
        </SettingRow>
        <SettingRow
          title={i18n('settings.analysis.engine.tempStorageTitle')}
          description={i18n('settings.analysis.engine.tempStorageDescription')}
        >
          <NumberInput
            label={i18n('settings.analysis.engine.tempStorageLabel')}
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
