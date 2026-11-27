import { i18n, useI18n } from '../../../i18n';
import { useCallback, useState } from 'react';
import type { DatasetDetail } from '@shared/api';
import { ConnectionDialog, ConnectionField } from './ConnectionDialog';
import type { ConnectionDialogProps } from './ConnectionDialog';

export function FeishuBitableDialog({ datasetId, onClose }: ConnectionDialogProps) {
  useI18n();
  const [form, setForm] = useState({ name: '', url: '', appId: '', appSecret: '' });

  const loadConnection = useCallback((connection: DatasetDetail) => {
    const { sourceConfig } = connection;
    if (sourceConfig.type !== 'feishu-bitable') throw new Error(i18n('errors.feishu.sourceTypeMismatch'));
    const { url = '', appId = '' } = sourceConfig.options;
    setForm({ name: connection.name, url, appId, appSecret: '' });
  }, []);

  return (
    <ConnectionDialog
      datasetId={datasetId}
      onClose={onClose}
      label={i18n('datasets.sources.feishu.label')}
      name={form.name}
      sourceConfig={{
        type: 'feishu-bitable',
        options: { url: form.url.trim(), appId: form.appId.trim(), appSecret: form.appSecret.trim() },
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
        label={i18n('connections.feishu.urlLabel')}
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
        placeholder={datasetId ? i18n('connections.feishu.secretReentry') : undefined}
        value={form.appSecret}
        onValueChange={(value) => setForm({ ...form, appSecret: value })}
      />
      <p className="m-0 text-xs text-muted-foreground">{i18n('connections.feishu.description')}</p>
    </ConnectionDialog>
  );
}
