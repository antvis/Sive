import { useI18n } from '../../../i18n';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { DataGrid } from '../../../components/DataGrid';
import { Modal } from '../../../components/ui/dialog';
import { Textarea } from '../../../components/ui/textarea';
import { errorMessage } from '../../../utils';
import { ConnectionField } from './ConnectionDialog';

export function TextImportDialog({ onClose }: { onClose: () => void }) {
  const i18n = useI18n();
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [busy, setBusy] = useState<'extract' | 'save' | null>(null);
  const [error, setError] = useState('');

  const extract = async () => {
    if (busy || !text.trim()) return;
    setBusy('extract');
    setError('');
    try {
      setRows(await window.workbench.datasetExtractText(text));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (busy || !rows || !name.trim()) return;
    setBusy('save');
    setError('');
    try {
      await window.workbench.datasetSave(name.trim(), { type: 'json', options: { data: rows } });
      toast.success(i18n('datasets.textImport.saved'));
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  };

  const columns = [...new Set(rows?.flatMap((row) => Object.keys(row)))].map((name) => ({ name }));

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      title={rows ? i18n('datasets.textImport.confirmTitle') : i18n('datasets.textImport.title')}
      footer={
        rows ? (
          <>
            <Button
              disabled={!!busy}
              onClick={() => {
                setRows(null);
                setError('');
              }}
            >
              {i18n('datasets.textImport.back')}
            </Button>
            <Button variant="primary" disabled={!!busy || !name.trim()} onClick={() => void save()}>
              {busy === 'save' ? i18n('snippet.export.saving') : i18n('datasets.textImport.confirmSave')}
            </Button>
          </>
        ) : (
          <Button variant="primary" disabled={!!busy || !text.trim()} onClick={() => void extract()}>
            {busy === 'extract'
              ? i18n('datasets.textImport.extracting')
              : i18n('datasets.textImport.extract')}
          </Button>
        )
      }
    >
      <div className="grid gap-3" aria-busy={!!busy}>
        <ConnectionField
          label={i18n('datasets.fields.name')}
          name="name"
          value={name}
          disabled={!!busy}
          onValueChange={setName}
        />
        {rows ? (
          <>
            <p className="m-0 text-sm text-muted-foreground">
              {i18n('datasets.textImport.previewDescription', [rows.length, Math.min(rows.length, 20)])}
            </p>
            <div className="flex h-48 min-w-0 overflow-hidden rounded-lg border">
              <DataGrid rows={rows.slice(0, 20)} columns={columns} profile={undefined} resetKey={0} />
            </div>
          </>
        ) : (
          <>
            <p className="m-0 text-sm text-muted-foreground">
              {i18n('datasets.textImport.privacyDescription')}
            </p>
            <label className="grid gap-1.5 text-sm">
              {i18n('datasets.textImport.textLabel')}
              <Textarea
                name="text"
                value={text}
                disabled={!!busy}
                placeholder={i18n('datasets.textImport.textPlaceholder')}
                className="h-40"
                onChange={(event) => setText(event.target.value)}
              />
            </label>
          </>
        )}
        {error && (
          <p role="alert" className="m-0 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
