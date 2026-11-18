import { ArrowsClockwise, PencilSimple } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { IconButton } from '../../components/IconButton';
import { errorMessage } from '../../utils';
import { findDatasetSource } from '@shared/dataSource';
import * as dialogs from './datasetDialogs';

export function SourceActions({ datasetId, sourceType }: { datasetId: string; sourceType: string }) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const source = findDatasetSource(sourceType);
  const Dialog =
    source?.enable && source.action.type === 'connection' ? dialogs[source.action.dialog] : undefined;

  const refresh = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await window.workbench.datasetRefresh(datasetId);
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
      {source && Dialog && (
        <IconButton
          icon={PencilSimple}
          label={`编辑 ${source.label} 连接`}
          disabled={busy}
          onClick={() => setEditing(true)}
        />
      )}
      {editing && Dialog && <Dialog datasetId={datasetId} onClose={() => setEditing(false)} />}
    </div>
  );
}
