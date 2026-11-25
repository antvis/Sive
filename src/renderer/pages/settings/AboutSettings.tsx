import { SquareArrowOutUpRightIcon } from 'lucide-react';
import type { Preferences } from '@shared/api';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { showUpdateNotification } from '../../components/UpdateNotification';
import { errorMessage } from '../../utils';
import { SettingGroup, SettingRow } from './SettingControls';

export function AboutSettings({ preferences }: { preferences: Preferences }) {
  const [version, setVersion] = useState('');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void window.workbench.aboutGetVersion().then(setVersion);
  }, []);

  const checkUpdates = async () => {
    setChecking(true);
    try {
      const result = await window.workbench.aboutCheckUpdates();
      if (result.hasUpdate) showUpdateNotification(result);
      else toast.success(`当前已是最新版本 ${result.currentVersion}`);
    } catch (cause) {
      toast.error(errorMessage(cause));
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
          基于 AntV AVA 的 AI 桌面数据管理与分析工作台，让数据理解、分析和图表可视化在一个工作台中完成
        </p>
        <p className="mt-5 mb-0 text-sm text-muted-foreground">版本 {version || '读取中…'} · MIT License</p>
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
            variant="secondary"
            disabled={checking}
            onClick={() => void checkUpdates()}
          >
            {checking ? '正在检查…' : '检查更新'}
          </Button>
          <Button
            onClick={() => void window.workbench.systemOpen('url', 'https://github.com/antvis/Sive')}
          >
            <img src="./logos/github.svg" width={17} height={17} alt="" />
            关注开源项目
          </Button>
        </div>
      </section>
      <SettingGroup>
        <SettingRow
          title="自动检查更新"
          description="启动后及每 24 小时检查新版本。发现更新时会显示下载入口。"
        >
          <Switch
            aria-label="自动检查更新"
            checked={preferences.autoCheckUpdates}
            disabled={saving}
            onCheckedChange={(checked) => void updateAutomaticCheck(checked)}
          />
        </SettingRow>
      </SettingGroup>
    </>
  );
}
