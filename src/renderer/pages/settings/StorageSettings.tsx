import { i18n, useI18n } from '../../i18n';
import { FolderOpenIcon } from 'lucide-react';
import type { StorageInfo } from '@shared/api';
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import { errorMessage } from '../../utils';
import { SettingGroup, SettingRow } from './SettingControls';

function formatSize(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function StorageSettings() {
  useI18n();
  const [storage, setStorage] = useState<StorageInfo>();
  const [error, setError] = useState('');

  useEffect(() => {
    void window.workbench
      .systemGetStorageInfo()
      .then(setStorage)
      .catch((cause) => setError(errorMessage(cause)));
  }, []);

  const openDirectory = async (path: string) => {
    setError('');
    try {
      await window.workbench.systemOpen('directory', path);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  const entries = storage
    ? [
        {
          title: i18n('settings.storage.databaseTitle'),
          description: i18n('settings.storage.databaseSize', [formatSize(storage.data.sizeBytes)]),
          path: storage.data.path,
          directory: storage.data.directory,
        },
        {
          title: i18n('settings.storage.cacheTitle'),
          description: i18n('settings.storage.cacheSize', [
            formatSize(storage.cache.usedBytes),
            formatSize(storage.cache.freeBytes),
          ]),
          path: storage.cache.path,
          directory: storage.cache.path,
        },
      ]
    : [];

  return (
    <>
      {storage ? (
        <div className="grid gap-4">
          <div className="grid gap-1 px-4">
            <p className="m-0 text-sm font-light text-muted-foreground">
              {i18n('settings.storage.usageLabel')}
            </p>
            <p aria-live="polite" className="m-0 text-xl font-medium tabular-nums text-sidebar-ink">
              {formatSize(storage.data.sizeBytes + storage.cache.usedBytes)}
            </p>
          </div>
          <SettingGroup>
            {entries.map(({ title, description, path, directory }) => (
              <SettingRow
                key={title}
                title={title}
                description={
                  <>
                    <span className="block">{description}</span>
                    <span className="mt-1 block break-all">{path}</span>
                  </>
                }
              >
                <Button
                  className="bg-surface hover:bg-workspace-control"
                  aria-label={i18n('settings.storage.openDirectoryLabel', [title])}
                  onClick={() => void openDirectory(directory)}
                >
                  <FolderOpenIcon size={16} aria-hidden />
                  {i18n('settings.storage.openDirectory')}
                </Button>
              </SettingRow>
            ))}
          </SettingGroup>
        </div>
      ) : (
        !error && (
          <p className="text-sm text-muted-foreground" role="status">
            {i18n('settings.storage.loading')}
          </p>
        )
      )}
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
