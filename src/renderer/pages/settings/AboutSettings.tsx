import { ArrowSquareOut, GithubLogo } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/Button';
import { errorMessage } from '../../utils';

export function AboutSettings() {
  const [version, setVersion] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    void window.workbench.aboutGetVersion().then(setVersion);
  }, []);

  const checkUpdates = async () => {
    setChecking(true);
    try {
      const result = await window.workbench.aboutCheckUpdates();
      toast.success(
        result.hasUpdate
          ? `发现新版本 ${result.latestVersion}，已打开发布页面`
          : `当前已是最新版本 ${result.currentVersion}`,
      );
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className="px-8 py-12 text-center">
      <img className="mx-auto size-20 dark:invert" src="./sive.svg" alt="Sive" />
      <h2 className="mt-5 mb-2 text-2xl font-semibold">Sive</h2>
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
        <Button
          variant="ghost"
          className="bg-workspace-control text-ink hover:bg-ink/10"
          disabled={checking}
          onClick={() => void checkUpdates()}
        >
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
    </section>
  );
}
