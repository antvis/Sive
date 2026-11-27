import { EllipsisIcon, PencilIcon, RefreshCwIcon, SlidersHorizontalIcon, Trash2Icon } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { errorMessage } from '../../utils';
import { findDatasetSource } from '@shared/dataSource';
import * as dialogs from './datasetDialogs';

export function SourceActions({
  datasetId,
  datasetName,
  sourceType,
  disabled,
  onRename,
  onDelete,
}: {
  datasetId: string;
  datasetName: string;
  sourceType: string;
  disabled: boolean;
  onRename: () => void;
  onDelete: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const pendingAction = useRef<(() => void) | null>(null);
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
    <div className="relative z-10 flex shrink-0" aria-busy={busy}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={trigger}
            variant="ghost"
            size="icon-sm"
            className="hover:bg-selected"
            aria-label={busy ? `正在刷新 ${datasetName}` : `更多操作：${datasetName}`}
            title={busy ? '正在刷新数据源…' : '更多操作'}
            disabled={disabled || busy}
          >
            {busy ? (
              <RefreshCwIcon className="size-4 motion-safe:animate-spin" aria-hidden />
            ) : (
              <EllipsisIcon className="size-4" aria-hidden />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={(event) => {
            const action = pendingAction.current;
            if (!action) return;
            pendingAction.current = null;
            event.preventDefault();
            trigger.current?.focus();
            action();
          }}
        >
          <DropdownMenuItem onSelect={() => void refresh()}>
            <RefreshCwIcon aria-hidden />
            刷新数据源
          </DropdownMenuItem>
          {Dialog && (
            <DropdownMenuItem
              onSelect={() => {
                pendingAction.current = () => setEditing(true);
              }}
            >
              <SlidersHorizontalIcon aria-hidden />
              编辑连接
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={() => {
              pendingAction.current = onRename;
            }}
          >
            <PencilIcon aria-hidden />
            重命名
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            className="text-destructive"
            onSelect={() => {
              pendingAction.current = onDelete;
            }}
          >
            <Trash2Icon aria-hidden />
            删除数据源
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {editing && Dialog && <Dialog datasetId={datasetId} onClose={() => setEditing(false)} />}
    </div>
  );
}
