import { FolderOpen } from '@phosphor-icons/react';
import type { StorageInfo } from '@shared/api';
import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { errorMessage } from '../../utils';
import { SettingGroup, SettingRow } from './SettingControls';

function formatSize(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
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

  return (
    <>
      {storage ? (
        <SettingGroup>
          <SettingRow
            title="工作台数据库"
            description={
              <>
                <span className="block">数据库大小 {formatSize(storage.data.sizeBytes)}</span>
                <span className="mt-1 block break-all">{storage.data.path}</span>
              </>
            }
          >
            <Button
              variant="ghost"
              className="bg-workspace-control text-ink hover:bg-ink/10"
              aria-label="打开数据存储目录"
              onClick={() => void openDirectory(storage.data.directory)}
            >
              <FolderOpen size={16} aria-hidden />
              打开目录
            </Button>
          </SettingRow>
          <SettingRow
            title="应用缓存"
            description={
              <>
                <span className="block">
                  缓存占用 {formatSize(storage.cache.usedBytes)} · 磁盘可用{' '}
                  {formatSize(storage.cache.freeBytes)}
                </span>
                <span className="mt-1 block break-all">{storage.cache.path}</span>
              </>
            }
          >
            <Button
              variant="ghost"
              className="bg-workspace-control text-ink hover:bg-ink/10"
              aria-label="打开缓存目录"
              onClick={() => void openDirectory(storage.cache.path)}
            >
              <FolderOpen size={16} aria-hidden />
              打开目录
            </Button>
          </SettingRow>
        </SettingGroup>
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
