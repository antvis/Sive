import { ArrowSquareOut, GithubLogo } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Preferences } from '@shared/api';
import { Button } from '../../components/Button';
import { showUpdateNotification } from '../../components/UpdateNotification';
import { errorMessage } from '../../utils';

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
    <section className="rounded-xl bg-surface px-8 py-12 text-center">
      <img className="mx-auto size-20 dark:invert" src="./sive.svg" alt="Sive" />
      <h1 className="mt-5 mb-2 text-2xl font-semibold">Sive</h1>
      <p className="m-0 text-sm text-muted-foreground">Sive, See it Live, Share it Real.</p>
      <p className="mx-auto mt-4 mb-0 max-w-md text-sm leading-6 text-muted-foreground">
        基于 AntV AVA 的 AI 桌面数据管理与分析工作台，让数据理解、分析和图表可视化在一个工作台中完成。
      </p>
      <p className="mt-5 mb-0 text-sm text-muted-foreground">版本 {version || '读取中…'} · MIT License</p>
      <button
        className="mx-auto mt-3 flex items-center gap-1 text-sm text-accent"
        onClick={() => void window.workbench.systemOpen('url', 'https://github.com/antvis/Sive')}
      >
        https://github.com/antvis/Sive
        <ArrowSquareOut size={14} />
      </button>
      <div className="mt-7 flex justify-center gap-3">
        <Button disabled={checking} onClick={() => void checkUpdates()}>
          {checking ? '正在检查…' : '检查更新'}
        </Button>
        <Button
          variant="primary"
          onClick={() => void window.workbench.systemOpen('url', 'https://github.com/antvis/Sive')}
        >
          <GithubLogo size={17} />
          关注开源项目
        </Button>
      </div>
      <label className="mt-7 flex items-center justify-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={preferences.autoCheckUpdates}
          disabled={saving}
          className="size-4 accent-[var(--accent)]"
          onChange={(event) => void updateAutomaticCheck(event.target.checked)}
        />
        自动检查更新
      </label>
      <p className="mt-2 mb-0 text-xs text-muted-foreground">
        启动后及每 24 小时检查新版本，发现更新时提醒，点击后前往发布页下载。
      </p>
    </section>
  );
}
