import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../../components/Button';
import { DataGrid } from '../../../components/DataGrid';
import { Modal } from '../../../components/Modal';
import { errorMessage } from '../../../utils';
import { ConnectionField } from './ConnectionDialog';

export function TextImportDialog({ onClose }: { onClose: () => void }) {
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
      toast.success('文本提取数据已保存');
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
      title={rows ? '确认提取结果' : '从文本提取数据'}
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
              返回修改
            </Button>
            <Button variant="primary" disabled={!!busy || !name.trim()} onClick={() => void save()}>
              {busy === 'save' ? '正在保存…' : '确认保存'}
            </Button>
          </>
        ) : (
          <Button variant="primary" disabled={!!busy || !text.trim()} onClick={() => void extract()}>
            {busy === 'extract' ? '正在提取…' : '提取数据'}
          </Button>
        )
      }
    >
      <div className="grid gap-3" aria-busy={!!busy}>
        <ConnectionField
          label="数据源名称"
          name="name"
          value={name}
          disabled={!!busy}
          onValueChange={setName}
        />
        {rows ? (
          <>
            <p className="m-0 text-sm text-muted">
              已提取 {rows.length} 条数据，预览前 {Math.min(rows.length, 20)} 条。
              请核对结果，确认后保存全部数据。
            </p>
            <div className="flex h-48 min-w-0 overflow-hidden rounded-lg border">
              <DataGrid rows={rows.slice(0, 20)} columns={columns} profile={undefined} resetKey={0} />
            </div>
          </>
        ) : (
          <>
            <p className="m-0 text-sm text-muted">文本将发送至当前默认模型，提取后可预览并确认保存。</p>
            <label className="grid gap-1.5 text-sm">
              文本内容
              <textarea
                name="text"
                value={text}
                disabled={!!busy}
                placeholder="粘贴包含数据的文本，例如销售记录、调查结果或统计报告。"
                className="h-40 resize-none rounded-lg border bg-page px-3 py-2 outline-none focus:border-accent disabled:opacity-50"
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
