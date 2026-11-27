import { i18n, useI18n } from '../../../i18n';
import { useCallback, useState } from 'react';
import type { DatasetDetail } from '@shared/api';
import { ConnectionDialog, ConnectionField } from './ConnectionDialog';
import type { ConnectionDialogProps } from './ConnectionDialog';

export function MySQLDialog({ datasetId, onClose }: ConnectionDialogProps) {
  useI18n();
  const [form, setForm] = useState({
    name: '',
    host: 'localhost',
    port: '3306',
    database: '',
    user: '',
    password: '',
  });

  const loadConnection = useCallback((connection: DatasetDetail) => {
    const { sourceConfig } = connection;
    if (sourceConfig.type !== 'mysql') throw new Error(i18n('errors.mysql.sourceTypeMismatch'));
    const { host, port = 3306, database, user = '' } = sourceConfig.options;
    setForm({
      name: connection.name,
      host,
      port: String(port),
      database,
      user,
      password: '',
    });
  }, []);

  const { name, ...options } = form;

  return (
    <ConnectionDialog
      datasetId={datasetId}
      onClose={onClose}
      label="MySQL"
      name={name}
      sourceConfig={{ type: 'mysql', options: { ...options, port: Number(form.port) } }}
      onLoad={loadConnection}
    >
      <ConnectionField
        label={i18n('datasets.fields.name')}
        name="name"
        value={form.name}
        onValueChange={(value) => setForm({ ...form, name: value })}
      />
      <ConnectionField
        label={i18n('connections.fields.host')}
        name="host"
        value={form.host}
        onValueChange={(value) => setForm({ ...form, host: value })}
      />
      <ConnectionField
        label={i18n('connections.fields.port')}
        name="port"
        type="number"
        min={1}
        max={65535}
        step={1}
        value={form.port}
        onValueChange={(value) => setForm({ ...form, port: value })}
      />
      <ConnectionField
        label={i18n('connections.fields.database')}
        name="database"
        value={form.database}
        onValueChange={(value) => setForm({ ...form, database: value })}
      />
      <ConnectionField
        label={i18n('connections.fields.username')}
        name="user"
        value={form.user}
        onValueChange={(value) => setForm({ ...form, user: value })}
      />
      <ConnectionField
        label={i18n('connections.fields.password')}
        name="password"
        type="password"
        required={false}
        placeholder={datasetId ? i18n('connections.fields.passwordReentry') : undefined}
        value={form.password}
        onValueChange={(value) => setForm({ ...form, password: value })}
      />
    </ConnectionDialog>
  );
}
