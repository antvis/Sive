import { PencilIcon, RefreshCwIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
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
    <div className="flex shrink-0" aria-busy={busy}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="刷新数据源"
        title="刷新数据源"
        className="text-black/50 dark:text-white/50"
        disabled={busy}
        onClick={() => void refresh()}
      >
        <RefreshCwIcon className="size-[14px]" aria-hidden />
      </Button>
      {source && Dialog && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`编辑 ${source.label} 连接`}
          title={`编辑 ${source.label} 连接`}
          className="text-black/50 dark:text-white/50"
          disabled={busy}
          onClick={() => setEditing(true)}
        >
          <PencilIcon className="size-[14px]" aria-hidden />
        </Button>
      )}
      {editing && Dialog && <Dialog datasetId={datasetId} onClose={() => setEditing(false)} />}
    </div>
  );
}
