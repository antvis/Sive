import { useI18n } from '../../i18n';
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
  const i18n = useI18n();
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
      toast.success(i18n('datasets.notifications.refreshed'));
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
            aria-label={
              busy
                ? i18n('datasets.actions.refreshingLabel', [datasetName])
                : i18n('datasets.actions.moreLabel', [datasetName])
            }
            title={busy ? i18n('datasets.status.refreshing') : i18n('common.actions.more')}
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
            {i18n('datasets.actions.refresh')}
          </DropdownMenuItem>
          {Dialog && (
            <DropdownMenuItem
              onSelect={() => {
                pendingAction.current = () => setEditing(true);
              }}
            >
              <SlidersHorizontalIcon aria-hidden />
              {i18n('datasets.actions.editConnection')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={() => {
              pendingAction.current = onRename;
            }}
          >
            <PencilIcon aria-hidden />
            {i18n('common.actions.rename')}
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
            {i18n('datasets.actions.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {editing && Dialog && <Dialog datasetId={datasetId} onClose={() => setEditing(false)} />}
    </div>
  );
}
