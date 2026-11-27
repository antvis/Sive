import { i18n, useI18n } from '../i18n';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { UpdateResult } from '@shared/api';
import { errorMessage } from '../utils';

export const UPDATE_NOTIFICATION_ID = 'app-update';

export function showUpdateNotification(result: UpdateResult) {
  toast.info(i18n('updates.availableTitle', [result.latestVersion]), {
    id: UPDATE_NOTIFICATION_ID,
    description: i18n('updates.availableDescription', [result.currentVersion]),
    duration: Infinity,
    closeButton: true,
    action: {
      label: i18n('updates.actions.view'),
      onClick: () => {
        void window.workbench
          .systemOpen('url', 'https://github.com/antvis/Sive/releases/latest')
          .catch((cause) =>
            toast.error(i18n('errors.update.openPageFailed'), {
              description: errorMessage(cause),
            }),
          );
      },
    },
  });
}

export function UpdateNotification() {
  useI18n();
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
