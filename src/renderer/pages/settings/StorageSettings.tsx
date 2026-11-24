import { FolderOpen } from '@phosphor-icons/react';
import type { StorageInfo } from '@shared/api';
import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { errorMessage } from '../../utils';
import { SettingGroup, SettingRow } from './SettingControls';

function formatSize(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function StorageSettings() {
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
          title: '工作台数据库',
          description: `数据库大小 ${formatSize(storage.data.sizeBytes)}`,
          path: storage.data.path,
          directory: storage.data.directory,
        },
        {
          title: '应用缓存',
          description: `缓存占用 ${formatSize(storage.cache.usedBytes)} · 磁盘可用 ${formatSize(storage.cache.freeBytes)}`,
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
            <p className="m-0 text-sm font-light text-muted-foreground">Sive 占用空间</p>
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
                  className="border-0 bg-workspace-control-active hover:bg-sidebar-highlight"
                  aria-label={`打开${title}目录`}
                  onClick={() => void openDirectory(directory)}
                >
                  <FolderOpen size={16} aria-hidden />
                  打开目录
                </Button>
              </SettingRow>
            ))}
          </SettingGroup>
        </div>
      ) : (
        !error && (
          <p className="text-sm text-muted-foreground" role="status">
            正在读取存储信息…
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
