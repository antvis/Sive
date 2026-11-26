import { useEffect } from 'react';
import { toast } from 'sonner';
import type { UpdateResult } from '@shared/api';
import { errorMessage } from '../utils';

export const UPDATE_NOTIFICATION_ID = 'app-update';

export function showUpdateNotification(result: UpdateResult) {
  toast.info(`发现新版本 ${result.latestVersion}`, {
    id: UPDATE_NOTIFICATION_ID,
    description: `当前版本 ${result.currentVersion}。请前往 GitHub 查看更新内容，下载并手动安装新版本。`,
    duration: Infinity,
    closeButton: true,
    action: {
      label: '查看更新',
      onClick: () => {
        void window.workbench
          .systemOpen('url', 'https://github.com/antvis/Sive/releases/latest')
          .catch((cause) =>
            toast.error('无法打开更新页面', {
              description: errorMessage(cause),
            }),
          );
      },
    },
  });
}

export function UpdateNotification() {
  useEffect(() => {
    const notify = () => {
      void window.workbench
        .aboutTakeUpdateNotification()
        .then((result) => {
          if (result) showUpdateNotification(result);
        })
        .catch(() => {
          // Automatic checks never interrupt the user with errors.
        });
    };
    const unsubscribe = window.workbench.aboutOnUpdateAvailable(notify);
    // Recover a result detected before the renderer was ready or while the window was closed.
    notify();
    return unsubscribe;
  }, []);

  return null;
}
