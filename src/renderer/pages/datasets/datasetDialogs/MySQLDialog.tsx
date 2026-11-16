import { useCallback, useState } from 'react';
import type { DatasetDetail } from '@shared/api';
import { ConnectionDialog, ConnectionField } from './ConnectionDialog';
import type { ConnectionDialogProps } from './ConnectionDialog';

export function MySQLDialog({ datasetId, onClose }: ConnectionDialogProps) {
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
    if (sourceConfig.type !== 'mysql') throw new Error('只有 MySQL 数据源支持此操作。');
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
        label="数据源名称"
        name="name"
        value={form.name}
        onValueChange={(value) => setForm({ ...form, name: value })}
      />
      <ConnectionField
        label="主机"
        name="host"
        value={form.host}
        onValueChange={(value) => setForm({ ...form, host: value })}
      />
      <ConnectionField
        label="端口"
        name="port"
        type="number"
        min={1}
        max={65535}
        step={1}
        value={form.port}
        onValueChange={(value) => setForm({ ...form, port: value })}
      />
      <ConnectionField
        label="数据库"
        name="database"
        value={form.database}
        onValueChange={(value) => setForm({ ...form, database: value })}
      />
      <ConnectionField
        label="用户名"
        name="user"
        value={form.user}
        onValueChange={(value) => setForm({ ...form, user: value })}
      />
      <ConnectionField
        label="密码"
        name="password"
        type="password"
        required={false}
        placeholder={datasetId ? '请重新填写密码，无密码可留空' : undefined}
        value={form.password}
        onValueChange={(value) => setForm({ ...form, password: value })}
      />
    </ConnectionDialog>
  );
}
