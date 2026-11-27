import { i18n, useI18n } from '../../i18n';
import { LoaderCircleIcon, SquareArrowOutUpRightIcon } from 'lucide-react';
import type { Preferences } from '@shared/api';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { showUpdateNotification, UPDATE_NOTIFICATION_ID } from '../../components/UpdateNotification';
import { errorMessage } from '../../utils';
import { SettingGroup, SettingRow } from './SettingControls';

export function AboutSettings({ preferences }: { preferences: Preferences }) {
  useI18n();
  const [version, setVersion] = useState('');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void window.workbench.aboutGetVersion().then(setVersion);
  }, []);

  const checkUpdates = async () => {
    if (checking) return;
    setChecking(true);
    toast.loading(i18n('updates.checkingTitle'), {
      id: UPDATE_NOTIFICATION_ID,
      description: i18n('updates.checkingDescription'),
      duration: Infinity,
      closeButton: false,
      action: null,
    });
    try {
      const result = await window.workbench.aboutCheckUpdates();
      if (result.hasUpdate) showUpdateNotification(result);
      else
        toast.success(i18n('updates.upToDateTitle'), {
          id: UPDATE_NOTIFICATION_ID,
          description: i18n('updates.upToDateDescription', [result.currentVersion]),
          duration: 5000,
          closeButton: true,
          action: null,
        });
    } catch (cause) {
      toast.error(i18n('errors.update.checkFailed'), {
        id: UPDATE_NOTIFICATION_ID,
        description: errorMessage(cause).replace(
          /^Error invoking remote method 'aboutCheckUpdates': (?:Error: )?/,
          '',
        ),
        duration: 8000,
        closeButton: true,
        action: {
          label: i18n('common.actions.retry'),
          onClick: (event) => {
            // Keep the loading toast that reuses this notification ID.
            event.preventDefault();
            void checkUpdates();
          },
        },
      });
    } finally {
      setChecking(false);
    }
  };

  const updateAutomaticCheck = async (autoCheckUpdates: boolean) => {
    setSaving(true);
    try {
      await window.workbench.settingsSavePreferences({ ...preferences, autoCheckUpdates });
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section className="px-8 pt-4 pb-2 text-center">
        <img className="mx-auto size-20 dark:invert" src="./sive.svg" alt="Sive" />
        <h2 className="mt-5 mb-2 text-2xl font-semibold">Sive</h2>
        <p className="m-0 text-sm text-muted-foreground">Sive, See it Live, Share it Real.</p>
        <p className="mx-auto mt-4 mb-0 max-w-md text-sm leading-6 text-muted-foreground">
          {i18n('settings.about.description')}
        </p>
        <p className="mt-5 mb-0 text-sm text-muted-foreground">
          {i18n('settings.about.versionLicense', [version || i18n('common.status.reading')])}
        </p>
        <Button
          variant="link"
          className="mx-auto mt-3 flex w-fit"
          onClick={() => void window.workbench.systemOpen('url', 'https://github.com/antvis/Sive')}
        >
          https://github.com/antvis/Sive
          <SquareArrowOutUpRightIcon size={14} aria-hidden />
        </Button>
        <div className="mt-7 flex justify-center gap-3">
          <Button
            variant="primary"
            disabled={checking}
            aria-busy={checking}
            onClick={() => void checkUpdates()}
          >
            {checking && <LoaderCircleIcon size={16} className="motion-safe:animate-spin" aria-hidden />}
            {checking ? i18n('updates.checking') : i18n('updates.actions.check')}
          </Button>
          <Button onClick={() => void window.workbench.systemOpen('url', 'https://github.com/antvis/Sive')}>
            <img src="./logos/github.svg" width={17} height={17} alt="" />
            {i18n('settings.about.openSourceProject')}
          </Button>
        </div>
      </section>
      <SettingGroup>
        <SettingRow
          title={i18n('settings.about.autoUpdateTitle')}
          description={i18n('settings.about.autoUpdateDescription')}
        >
          <Switch
            aria-label={i18n('settings.about.autoUpdateTitle')}
            checked={preferences.autoCheckUpdates}
            disabled={saving}
            onCheckedChange={(checked) => void updateAutomaticCheck(checked)}
          />
        </SettingRow>
      </SettingGroup>
    </>
  );
}
