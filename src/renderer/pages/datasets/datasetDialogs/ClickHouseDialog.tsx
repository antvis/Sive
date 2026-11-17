import { useCallback, useState } from 'react';
import type { DatasetDetail } from '@shared/api';
import { ConnectionDialog, ConnectionField } from './ConnectionDialog';
import type { ConnectionDialogProps } from './ConnectionDialog';

export function ClickHouseDialog({ datasetId, onClose }: ConnectionDialogProps) {
  const [form, setForm] = useState({
    name: '',
    url: 'http://localhost:8123',
    database: 'default',
    username: 'default',
    password: '',
  });

  const loadConnection = useCallback((connection: DatasetDetail) => {
    const { sourceConfig } = connection;
    if (sourceConfig.type !== 'clickhouse') throw new Error('只有 ClickHouse 数据源支持此操作。');
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
        label="数据源名称"
        name="name"
        value={form.name}
        onValueChange={(value) => setForm({ ...form, name: value })}
      />
      <ConnectionField
        label="HTTP(S) 地址"
        name="url"
        type="url"
        pattern="https?://[^\s@?#]+"
        title="请输入 HTTP(S) 地址，用户名和密码请在下方填写，地址中不包含查询参数。"
        placeholder="http://localhost:8123 或 https://主机:8443"
        value={form.url}
        onValueChange={(value) => setForm({ ...form, url: value })}
      />
      <div className="grid grid-cols-2 gap-3">
        <ConnectionField
          label="数据库"
          name="database"
          value={form.database}
          onValueChange={(value) => setForm({ ...form, database: value })}
        />
        <ConnectionField
          label="用户名"
          name="username"
          value={form.username}
          onValueChange={(value) => setForm({ ...form, username: value })}
        />
      </div>
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
