import { DownloadSimple } from '@phosphor-icons/react';
import { DropdownMenu } from 'radix-ui';
import { useState } from 'react';
import { toast } from 'sonner';
import type { ExportFormat, ResultTarget } from '@shared/results';
import { IconButton } from './IconButton';
import { errorMessage } from '../utils';

export function ExportButton({ target }: { target: ResultTarget }) {
  const [busy, setBusy] = useState(false);

  const save = async (format: ExportFormat) => {
    setBusy(true);
    try {
      if (await window.workbench.resultExport(target, format)) toast.success('已导出');
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <IconButton icon={DownloadSimple} label={busy ? '导出中…' : '导出结果'} disabled={busy} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-32 rounded-xl border bg-surface p-1 shadow-lg"
        >
          {(['html', 'pdf', 'png'] as const).map((format) => (
            <DropdownMenu.Item
              key={format}
              onSelect={() => void save(format)}
              className="cursor-pointer rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-page"
            >
              导出 {format.toUpperCase()}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
