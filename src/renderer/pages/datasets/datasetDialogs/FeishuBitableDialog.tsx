import { useCallback, useState } from 'react';
import type { DatasetDetail } from '@shared/api';
import { ConnectionDialog, ConnectionField } from './ConnectionDialog';
import type { ConnectionDialogProps } from './ConnectionDialog';

export function FeishuBitableDialog({ datasetId, onClose }: ConnectionDialogProps) {
  const [form, setForm] = useState({ name: '', url: '', appId: '', appSecret: '' });

  const loadConnection = useCallback((connection: DatasetDetail) => {
    const { sourceConfig } = connection;
    if (sourceConfig.type !== 'feishu-bitable') throw new Error('只有飞书多维表格支持此操作。');
    const { url = '', appId = '' } = sourceConfig.options;
    setForm({ name: connection.name, url, appId, appSecret: '' });
  }, []);

  return (
    <ConnectionDialog
      datasetId={datasetId}
      onClose={onClose}
      label="飞书多维表格"
      name={form.name}
      sourceConfig={{
        type: 'feishu-bitable',
        options: { url: form.url.trim(), appId: form.appId.trim(), appSecret: form.appSecret.trim() },
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
        label="多维表格链接"
        name="url"
        type="url"
        placeholder="https://example.feishu.cn/base/...?table=..."
        value={form.url}
        onValueChange={(value) => setForm({ ...form, url: value })}
      />
      <ConnectionField
        label="App ID"
        name="appId"
        value={form.appId}
        onValueChange={(value) => setForm({ ...form, appId: value })}
      />
      <ConnectionField
        label="App Secret"
        name="appSecret"
        type="password"
        placeholder={datasetId ? '请重新填写 App Secret' : undefined}
        value={form.appSecret}
        onValueChange={(value) => setForm({ ...form, appSecret: value })}
      />
      <p className="m-0 text-xs text-muted-foreground">
        请粘贴具体数据表链接，并为应用授予读取权限；读取整张表，不应用视图筛选。
      </p>
    </ConnectionDialog>
  );
}
