import { ArrowsClockwise, FolderOpen, PencilSimple } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { IconButton } from './IconButton';
import { errorMessage } from '../utils';
import { getSourceEditor } from './sourceEditors';
import { getDatasetSource } from '../utils/dataSource';

export function DatasetSourceActions({
  datasetId,
  sourceType,
  localFile,
  onUpdated,
}: {
  datasetId: string;
  sourceType: string;
  localFile: boolean;
  onUpdated?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const source = getDatasetSource(sourceType);
  const Editor = getSourceEditor(sourceType);

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
  if (!source.refreshable && !localFile && !Editor) return null;

  return (
    <div className="flex shrink-0" onClick={(event) => event.stopPropagation()} aria-busy={busy}>
      {source.refreshable && (
        <IconButton
          icon={ArrowsClockwise}
          label="刷新数据源"
          disabled={busy}
          onClick={() => void update(false)}
        />
      )}
      {localFile && (
        <IconButton
          icon={FolderOpen}
          label="重新定位文件"
          disabled={busy}
          onClick={() => void update(true)}
        />
      )}
      {Editor && (
        <IconButton
          icon={PencilSimple}
          label={`编辑 ${source.label} 连接`}
          disabled={busy}
          onClick={() => setEditing(true)}
        />
      )}
      {editing && Editor && (
        <Editor datasetId={datasetId} onClose={() => setEditing(false)} onSaved={onUpdated} />
      )}
    </div>
  );
}
