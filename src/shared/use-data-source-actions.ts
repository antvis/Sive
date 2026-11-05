import { useState } from 'react';
import { useUI, useForm } from '../components/ui';
import type { Dataset, LocalDataset, MySQLInput } from '../../shared/contracts';
import { errorMessage } from './feedback';
import { zodResolver } from '@hookform/resolvers/zod';
import { mysqlInputSchema } from '../../shared/input-schemas';

const api = window.workbench;

export function useDataSourceActions({
  onImported,
  onConnected,
}: {
  onImported: (dataset: Dataset) => void;
  onConnected: (dataset: Dataset) => void;
}) {
  const { message } = useUI();
  const [editing, setEditing] = useState<Dataset | 'new' | null>(null);
  const [busy, setBusy] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const form = useForm<MySQLInput>({ mode: 'onChange', resolver: zodResolver(mysqlInputSchema) });
  const perform = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setBusy('');
    }
  };
  const connection = (d?: Dataset) => {
    setFeedback(null);
    form.reset(d?.connection ? { ...d.connection, name: d.name } : { port: 3306 });
    setEditing(d || 'new');
  };
  const importData = (format: LocalDataset['format']) =>
    perform('import', async () => {
      const d = await api.importData(format);
      if (d) {
        onImported(d);
      }
    });
  async function submit(save: boolean) {
    if (!(await form.trigger(undefined, { shouldFocus: true }))) return;
    const values = form.getValues();
    setBusy(save ? 'save' : 'test');
    setFeedback(null);
    try {
      const input = { ...values, id: editing && editing !== 'new' ? editing.id : undefined };
      if (save) {
        const d = await api.saveMySQL(input);
        setEditing(null);
        message.success(`连接已验证：${d.schema.models.length} 张表`);
        onConnected(d);
      } else {
        const result = await api.testMySQL(input);
        setFeedback({
          type: 'success',
          text: `已连接并验证读取权限：发现 ${result.tables} 张表，首表读取 ${result.rows} 行。尚未保存。`,
        });
      }
    } catch (e) {
      setFeedback({ type: 'error', text: errorMessage(e) });
    } finally {
      setBusy('');
    }
  }

  const cancelConnection = () => {
    if (!busy) setEditing(null);
  };
  return {
    busy,
    perform,
    connection,
    importData,
    editing,
    form,
    feedback,
    setFeedback,
    cancelConnection,
    submit,
  };
}
