import { i18n, useI18n } from '../../../i18n';
import { useCallback, useState } from 'react';
import type { DatasetDetail } from '@shared/api';
import { ConnectionDialog, ConnectionField } from './ConnectionDialog';
import type { ConnectionDialogProps } from './ConnectionDialog';

export function ClickHouseDialog({ datasetId, onClose }: ConnectionDialogProps) {
  useI18n();
  const [form, setForm] = useState({
    name: '',
    url: 'http://localhost:8123',
    database: 'default',
    username: 'default',
    password: '',
  });

  const loadConnection = useCallback((connection: DatasetDetail) => {
    const { sourceConfig } = connection;
    if (sourceConfig.type !== 'clickhouse') throw new Error(i18n('errors.clickhouse.sourceTypeMismatch'));
    const { url = '', database, username = 'default' } = sourceConfig.options;
    setForm({ name: connection.name, url, database, username, password: '' });
  }, []);

  const { name, ...options } = form;

  return (
    <ConnectionDialog
      datasetId={datasetId}
      onClose={onClose}
      label="ClickHouse"
      name={name}
      sourceConfig={{
        type: 'clickhouse',
        options: { ...options, url: form.url.trim(), request_timeout: 30000 },
      }}
      onLoad={loadConnection}
    >
      <ConnectionField
        label={i18n('datasets.fields.name')}
        name="name"
        value={form.name}
        onValueChange={(value) => setForm({ ...form, name: value })}
      />
      <ConnectionField
        label={i18n('connections.clickhouse.urlLabel')}
        name="url"
        type="url"
        pattern="https?://[^\s@?#]+"
        title={i18n('connections.clickhouse.urlDescription')}
        placeholder={i18n('connections.clickhouse.urlPlaceholder')}
        value={form.url}
        onValueChange={(value) => setForm({ ...form, url: value })}
      />
      <div className="grid grid-cols-2 gap-3">
        <ConnectionField
          label={i18n('connections.fields.database')}
          name="database"
          value={form.database}
          onValueChange={(value) => setForm({ ...form, database: value })}
        />
        <ConnectionField
          label={i18n('connections.fields.username')}
          name="username"
          value={form.username}
          onValueChange={(value) => setForm({ ...form, username: value })}
        />
      </div>
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
