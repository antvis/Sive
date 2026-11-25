import { useCallback, useState } from 'react';
import type { DatasetDetail } from '@shared/api';
import { Checkbox } from '../../../components/ui/checkbox';
import { ConnectionDialog, ConnectionField } from './ConnectionDialog';
import type { ConnectionDialogProps } from './ConnectionDialog';

export function MongoDBDialog({ datasetId, onClose }: ConnectionDialogProps) {
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
    if (sourceConfig.type !== 'mongodb') throw new Error('只有 MongoDB 数据源支持此操作。');
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
  }, []);

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
        label="数据源名称"
        name="name"
        value={form.name}
        onValueChange={(value) => setForm({ ...form, name: value })}
      />
      <div className="grid grid-cols-[minmax(0,1fr)_100px] gap-3">
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
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ConnectionField
          label="数据库"
          name="database"
          value={form.database}
          onValueChange={(value) => setForm({ ...form, database: value })}
        />
        <ConnectionField
          label="用户名"
          name="user"
          required={false}
          placeholder="无需认证时可留空"
          value={form.user}
          onValueChange={(value) => setForm({ ...form, user: value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ConnectionField
          label="密码"
          name="password"
          type="password"
          required={false}
          placeholder={datasetId ? '请重新填写密码，无密码可留空' : undefined}
          value={form.password}
          onValueChange={(value) => setForm({ ...form, password: value })}
        />
        <ConnectionField
          label="认证数据库（authSource）"
          name="authSource"
          required={false}
          placeholder="默认使用当前数据库"
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
        使用 TLS 加密连接
      </label>
    </ConnectionDialog>
  );
}
