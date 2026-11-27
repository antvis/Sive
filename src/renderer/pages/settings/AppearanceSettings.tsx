import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { MessageKey } from '@shared/i18n';
import type { Preferences } from '@shared/api';
import { useState } from 'react';
import { SegmentedControl } from '../../components/ui/segmented-control';
import { Slider } from '../../components/ui/slider';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../utils';
import { SettingGroup, SettingRow } from './SettingControls';

const FONT_SIZES = [12, 13, 14, 16, 18, 20];
const languageOptions = [
  { value: 'zh-CN', label: '中文（简体）' },
  { value: 'en-US', label: 'English' },
] as const;
const themes = [
  ['light', 'settings.appearance.themes.light', SunIcon],
  ['dark', 'settings.appearance.themes.dark', MoonIcon],
  ['system', 'settings.appearance.themes.system', MonitorIcon],
] as const satisfies readonly (readonly [
  value: Preferences['theme']['mode'],
  labelKey: MessageKey,
  icon: LucideIcon,
])[];

export function AppearanceSettings({ preferences }: { preferences: Preferences }) {
  const i18n = useI18n();
  const themeOptions = themes.map(([value, labelKey, Icon]) => ({
    value,
    label: (
      <>
        <Icon size={16} aria-hidden />
        {i18n(labelKey)}
      </>
    ),
  }));
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
      <SettingGroup title={i18n('settings.appearance.title')}>
        <SettingRow
          title={i18n('settings.language.title')}
          description={i18n('settings.language.description')}
        >
          <SegmentedControl
            label={i18n('settings.language.title')}
            options={languageOptions}
            value={preferences.language}
            disabled={saving}
            onValueChange={(language) => void update({ ...preferences, language })}
          />
        </SettingRow>
        <SettingRow
          title={i18n('settings.appearance.themeTitle')}
          description={i18n('settings.appearance.themeDescription')}
        >
          <SegmentedControl
            label={i18n('settings.appearance.themeTitle')}
            options={themeOptions}
            value={theme.mode}
            disabled={saving}
            onValueChange={(mode) => void update({ ...preferences, theme: { ...theme, mode } })}
          />
        </SettingRow>
        <SettingRow
          title={i18n('settings.appearance.fontSizeTitle')}
          description={i18n('settings.appearance.fontSizeDescription')}
        >
          <div className="w-56 max-w-full">
            <Slider
              aria-label={i18n('settings.appearance.fontSizeTitle')}
              aria-valuetext={`${theme.fontSize}px`}
              list="font-size-stops"
              min={0}
              max={FONT_SIZES.length - 1}
              step={1}
              value={Math.max(0, FONT_SIZES.indexOf(theme.fontSize))}
              disabled={saving}
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
            <div className="relative flex justify-between text-xs text-muted-foreground">
              <span>{i18n('settings.appearance.fontSizeSmall')}</span>
              <span className="absolute left-[40%] -translate-x-1/2">
                {i18n('settings.appearance.fontSizeDefault')}
              </span>
              <span>{i18n('settings.appearance.fontSizeLarge')}</span>
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
