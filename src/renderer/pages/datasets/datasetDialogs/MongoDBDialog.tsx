import { useI18n } from '../../../i18n';
import { useCallback, useState } from 'react';
import type { DatasetDetail } from '@shared/api';
import { Checkbox } from '../../../components/ui/checkbox';
import { ConnectionDialog, ConnectionField } from './ConnectionDialog';
import type { ConnectionDialogProps } from './ConnectionDialog';

export function MongoDBDialog({ datasetId, onClose }: ConnectionDialogProps) {
  const i18n = useI18n();
  const [form, setForm] = useState({
    name: '',
    host: 'localhost',
    port: '27017',
    database: '',
    user: '',
    password: '',
    authSource: '',
    tls: false,
  });

  const loadConnection = useCallback((connection: DatasetDetail) => {
    const { sourceConfig } = connection;
    if (sourceConfig.type !== 'mongodb') throw new Error(i18n('errors.mongodb.sourceTypeMismatch'));
    const {
      host = 'localhost',
      port = 27017,
      database,
      user = '',
      authSource = '',
      tls = false,
    } = sourceConfig.options;
    setForm({
      name: connection.name,
      host,
      port: String(port),
      database,
      user,
      password: '',
      authSource,
      tls,
    });
  }, [i18n]);

  const { name, authSource, ...options } = form;

  return (
    <ConnectionDialog
      datasetId={datasetId}
      onClose={onClose}
      label="MongoDB"
      name={name}
      sourceConfig={{
        type: 'mongodb',
        options: { ...options, port: Number(form.port), authSource: authSource.trim() || undefined },
      }}
      onLoad={loadConnection}
    >
      <ConnectionField
        label={i18n('datasets.fields.name')}
        name="name"
        value={form.name}
        onValueChange={(value) => setForm({ ...form, name: value })}
      />
      <div className="grid grid-cols-[minmax(0,1fr)_100px] gap-3">
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
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ConnectionField
          label={i18n('connections.fields.database')}
          name="database"
          value={form.database}
          onValueChange={(value) => setForm({ ...form, database: value })}
        />
        <ConnectionField
          label={i18n('connections.fields.username')}
          name="user"
          required={false}
          placeholder={i18n('connections.fields.optionalAuthentication')}
          value={form.user}
          onValueChange={(value) => setForm({ ...form, user: value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ConnectionField
          label={i18n('connections.fields.password')}
          name="password"
          type="password"
          required={false}
          placeholder={datasetId ? i18n('connections.fields.passwordReentry') : undefined}
          value={form.password}
          onValueChange={(value) => setForm({ ...form, password: value })}
        />
        <ConnectionField
          label={i18n('connections.mongodb.authDatabaseLabel')}
          name="authSource"
          required={false}
          placeholder={i18n('connections.mongodb.authDatabasePlaceholder')}
          value={form.authSource}
          onValueChange={(value) => setForm({ ...form, authSource: value })}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          name="tls"
          checked={form.tls}
          onChange={(event) => setForm({ ...form, tls: event.target.checked })}
        />
        {i18n('connections.fields.useTls')}
      </label>
    </ConnectionDialog>
  );
}
