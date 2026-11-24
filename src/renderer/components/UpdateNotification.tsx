import { useEffect } from 'react';
import { toast } from 'sonner';
import type { UpdateResult } from '@shared/api';
import { errorMessage } from '../utils';

export function showUpdateNotification(result: UpdateResult) {
  toast.info(`发现新版本 ${result.latestVersion}`, {
    id: `update-${result.latestVersion}`,
    duration: Infinity,
    closeButton: true,
    action: {
      label: '前往下载',
      onClick: () => {
        void window.workbench
          .systemOpen('url', 'https://github.com/antvis/Sive/releases/latest')
          .catch((cause) => toast.error(errorMessage(cause)));
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
