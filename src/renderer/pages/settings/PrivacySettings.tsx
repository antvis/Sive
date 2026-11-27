import { i18n, useI18n } from '../../i18n';
import { SquareArrowOutUpRightIcon } from 'lucide-react';
import type { Preferences } from '@shared/api';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { errorMessage } from '../../utils';
import { SettingGroup, SettingRow } from './SettingControls';

export function PrivacySettings({ preferences }: { preferences: Preferences }) {
  useI18n();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateNativeCrashReporting = async (nativeCrashReporting: boolean) => {
    setSaving(true);
    setError('');
    try {
      await window.workbench.settingsSavePreferences({
        ...preferences,
        diagnostics: { nativeCrashReporting },
      });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SettingGroup
        title={i18n('settings.privacy.reporting.title')}
        description={i18n('settings.privacy.reporting.description')}
      >
        <SettingRow
          title={i18n('settings.privacy.javascript.title')}
          description={i18n('settings.privacy.javascript.description')}
        >
          <span className="text-sm whitespace-nowrap text-muted-foreground">
            {i18n('settings.privacy.javascript.alwaysEnabled')}
          </span>
        </SettingRow>
        <SettingRow
          title={i18n('settings.privacy.native.title')}
          description={i18n('settings.privacy.native.description')}
        >
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch
              aria-label={i18n('settings.privacy.native.enableLabel')}
              checked={preferences.diagnostics.nativeCrashReporting}
              disabled={saving}
              onCheckedChange={(checked) => void updateNativeCrashReporting(checked)}
            />
            {i18n('common.actions.enable')}
          </label>
        </SettingRow>
      </SettingGroup>

      <SettingGroup
        title={i18n('settings.privacy.boundaries.title')}
        description={i18n('settings.privacy.boundaries.description')}
      >
        <div className="py-4 text-sm leading-6 text-muted-foreground">
          <ul className="m-0 list-disc space-y-1 pl-5">
            <li>{i18n('settings.privacy.boundaries.data')}</li>
            <li>{i18n('settings.privacy.boundaries.conversations')}</li>
            <li>{i18n('settings.privacy.boundaries.identity')}</li>
          </ul>
          <p className="mt-4 mb-0">
            {i18n('settings.privacy.sourceDescription')}
            <Button
              variant="link"
              onClick={() => void window.workbench.systemOpen('url', 'https://github.com/antvis/Sive')}
            >
              https://github.com/antvis/Sive
              <SquareArrowOutUpRightIcon size={14} aria-hidden />
            </Button>
          </p>
        </div>
      </SettingGroup>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
