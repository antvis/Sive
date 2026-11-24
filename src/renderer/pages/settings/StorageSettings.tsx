import { FolderOpen } from '@phosphor-icons/react';
import type { StorageClearTarget, StorageInfo } from '@shared/api';
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
  const [clearing, setClearing] = useState<StorageClearTarget>();
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

  const clear = async (target: StorageClearTarget) => {
    setClearing(target);
    setError('');
    try {
      const updated = await window.workbench.systemClearStorage(target);
      if (updated) setStorage(updated);
    } catch (cause) {
      setError(errorMessage(cause));
      await window.workbench
        .systemGetStorageInfo()
        .then(setStorage)
        .catch(() => {});
    } finally {
      setClearing(undefined);
    }
  };

  const entries = storage
    ? ([
        {
          target: 'data',
          title: '工作台数据库',
          description: `数据库大小 ${formatSize(storage.data.sizeBytes)}`,
          path: storage.data.path,
          directory: storage.data.directory,
        },
        {
          target: 'cache',
          title: '应用缓存',
          description: `缓存占用 ${formatSize(storage.cache.usedBytes)} · 磁盘可用 ${formatSize(storage.cache.freeBytes)}`,
          path: storage.cache.path,
          directory: storage.cache.path,
        },
      ] as const)
    : [];

  return (
    <>
      {storage ? (
        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-3 px-4">
            <div className="grid gap-1">
              <p className="m-0 text-sm font-light text-muted-foreground">Sive 占用空间</p>
              <p aria-live="polite" className="m-0 text-xl font-medium tabular-nums text-sidebar-ink">
                {formatSize(storage.data.sizeBytes + storage.cache.usedBytes)}
              </p>
            </div>
            <Button
              variant="primary"
              className="shrink-0 bg-sidebar-ink text-workspace-control-active"
              disabled={Boolean(clearing)}
              onClick={() => void clear('all')}
            >
              {clearing === 'all' ? '清除中…' : '全部清除'}
            </Button>
          </div>
          <SettingGroup>
            {entries.map(({ target, title, description, path, directory }) => (
              <SettingRow
                key={target}
                title={title}
                description={
                  <>
                    <span className="block">{description}</span>
                    <span className="mt-1 block break-all">{path}</span>
                  </>
                }
              >
                <div className="flex flex-wrap gap-1">
                  <Button
                    className="border-0 bg-workspace-control-active hover:bg-sidebar-highlight"
                    aria-label={`打开${title}目录`}
                    onClick={() => void openDirectory(directory)}
                  >
                    <FolderOpen size={16} aria-hidden />
                    打开目录
                  </Button>
                  <Button
                    className="border-0 bg-workspace-control-active hover:bg-sidebar-highlight"
                    aria-label={`清除${title}`}
                    disabled={Boolean(clearing)}
                    onClick={() => void clear(target)}
                  >
                    {clearing === target ? '清除中…' : '清除'}
                  </Button>
                </div>
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
