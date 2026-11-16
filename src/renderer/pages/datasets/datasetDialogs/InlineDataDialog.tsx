import { useId, useState } from 'react';
import { toast } from 'sonner';
import type { DataSourceConfig } from '@antv/ava';
import { Button } from '../../../components/Button';
import { Modal } from '../../../components/Modal';
import { errorMessage } from '../../../utils';

export function InlineDataDialog({ type, onClose }: { type: 'csv' | 'json'; onClose: () => void }) {
  const formId = useId();
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const label = type === 'csv' ? 'CSV 内容' : 'JSON 数据';

  const save = async () => {
    if (saving || !name.trim() || !content.trim()) return;
    setError('');
    setSaving(true);
    try {
      const sourceConfig: DataSourceConfig =
        type === 'csv'
          ? { type, options: { csv: content } }
          : { type, options: { data: JSON.parse(content) } };
      await window.workbench.datasetSave(name.trim(), sourceConfig);
      toast.success(`已添加数据源“${name.trim()}”`);
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={`添加${label}`}
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
      footer={
        <Button
          type="submit"
          form={formId}
          variant="primary"
          disabled={saving || !name.trim() || !content.trim()}
        >
          {saving ? '正在保存…' : '保存数据源'}
        </Button>
      }
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={saving} className="m-0 grid gap-3 border-0 p-0">
          <label className="grid gap-1.5 text-sm">
            数据源名称
            <input
              name="name"
              required
              autoComplete="off"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="min-w-0 rounded-lg border bg-page px-3 py-2 outline-none focus:border-accent"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            {label}
            <textarea
              name="content"
              required
              spellCheck={false}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={
                type === 'csv'
                  ? 'name,amount\nAlice,100\nBob,200'
                  : '[\n  { "name": "Alice", "amount": 100 }\n]'
              }
              className="min-h-56 min-w-0 resize-y rounded-lg border bg-page px-3 py-2 font-mono text-sm outline-none focus:border-accent"
            />
          </label>
          <p className="m-0 text-xs text-muted">
            {type === 'csv'
              ? '第一行作为字段名，后续每行是一条数据。'
              : '请输入 JSON 对象数组，每个对象是一条数据。'}
          </p>
        </fieldset>
      </form>
      {error && (
        <p role="alert" className="mb-0 text-sm text-danger break-words">
          {error}
        </p>
      )}
    </Modal>
  );
}
