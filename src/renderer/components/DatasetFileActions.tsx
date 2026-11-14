import { ArrowsClockwise, FolderOpen } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { IconButton } from './IconButton';
import { errorMessage } from '../utils';

export function DatasetFileActions({ datasetId, onUpdated }: { datasetId: string; onUpdated?: () => void }) {
  const [busy, setBusy] = useState(false);

  const update = async (relocate: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (relocate) {
        if (!(await window.workbench.datasetRelocate(datasetId))) return;
      } else await window.workbench.datasetRefresh(datasetId);
      onUpdated?.();
      toast.success(relocate ? '文件已重新定位' : '数据源已刷新');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex shrink-0" onClick={(event) => event.stopPropagation()} aria-busy={busy}>
      <IconButton
        icon={ArrowsClockwise}
        label="刷新数据源"
        disabled={busy}
        onClick={() => void update(false)}
      />
      <IconButton icon={FolderOpen} label="重新定位文件" disabled={busy} onClick={() => void update(true)} />
    </div>
  );
}
