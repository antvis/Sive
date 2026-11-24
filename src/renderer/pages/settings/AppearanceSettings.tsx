import { Monitor, Moon, Sun } from '@phosphor-icons/react';
import type { Preferences } from '@shared/api';
import { useState } from 'react';
import { SegmentedControl } from '../../components/SegmentedControl';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../utils';
import { SettingGroup, SettingRow } from './SettingControls';

const FONT_SIZES = [12, 14, 16, 18, 20];
const languageOptions = [
  { value: 'zh-CN', label: '中文' },
  { value: 'en-US', label: 'English' },
] as const;
const themeOptions = (
  [
    ['light', '浅色', Sun],
    ['dark', '深色', Moon],
    ['system', '跟随系统', Monitor],
  ] as const
).map(([value, label, Icon]) => ({
  value,
  label: (
    <>
      <Icon size={16} aria-hidden />
      {label}
    </>
  ),
}));

export function AppearanceSettings({ preferences }: { preferences: Preferences }) {
  const i18n = useI18n();
  const theme = preferences.theme;
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

  return (
    <>
      <SettingGroup>
        <SettingRow title={i18n('settings.language.title')}>
          <SegmentedControl
            label={i18n('settings.language.title')}
            options={languageOptions}
            value={preferences.language}
            disabled={saving}
            onValueChange={(language) => void update({ ...preferences, language })}
          />
        </SettingRow>
        <SettingRow title="界面主题">
          <SegmentedControl
            label="界面主题"
            options={themeOptions}
            value={theme.mode}
            disabled={saving}
            onValueChange={(mode) => void update({ ...preferences, theme: { ...theme, mode } })}
          />
        </SettingRow>
        <SettingRow title="字体大小">
          <div className="w-56 max-w-full">
            <input
              aria-label="字体大小"
              aria-valuetext={`${theme.fontSize}px`}
              type="range"
              list="font-size-stops"
              min={0}
              max={FONT_SIZES.length - 1}
              step={1}
              value={Math.max(0, FONT_SIZES.indexOf(theme.fontSize))}
              disabled={saving}
              className="w-full accent-(--ink)"
              onChange={(event) =>
                void update({
                  ...preferences,
                  theme: { ...theme, fontSize: FONT_SIZES[Number(event.target.value)] },
                })
              }
            />
            <datalist id="font-size-stops">
              {FONT_SIZES.map((size, index) => (
                <option key={size} value={index} label={`${size}px`} />
              ))}
            </datalist>
            <div className="grid grid-cols-5 text-xs text-muted-foreground">
              <span>小</span>
              <span className="text-center">默认</span>
              <span />
              <span />
              <span className="text-right">大</span>
            </div>
          </div>
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
