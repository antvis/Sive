import { ArrowsClockwise, PencilSimple } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { IconButton } from './IconButton';
import { errorMessage } from '../utils';
import { MySQLConnectionDialog } from './datasetDialogs/MySQLConnectionDialog';

export function DatasetSourceActions({
  datasetId,
  sourceType,
  onUpdated,
}: {
  datasetId: string;
  sourceType: string;
  onUpdated?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const refresh = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await window.workbench.datasetRefresh(datasetId);
      onUpdated?.();
      toast.success('数据源已刷新');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex shrink-0" onClick={(event) => event.stopPropagation()} aria-busy={busy}>
      <IconButton icon={ArrowsClockwise} label="刷新数据源" disabled={busy} onClick={() => void refresh()} />
      {sourceType === 'mysql' && (
        <IconButton
          icon={PencilSimple}
          label="编辑 MySQL 连接"
          disabled={busy}
          onClick={() => setEditing(true)}
        />
      )}
      {editing && (
        <MySQLConnectionDialog datasetId={datasetId} onClose={() => setEditing(false)} onSaved={onUpdated} />
      )}
    </div>
  );
}
