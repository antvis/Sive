import { useCallback, useState } from 'react';
import type { DatasetDetail } from '@shared/api';
import { ConnectionDialog, ConnectionField } from './ConnectionDialog';
import type { ConnectionDialogProps } from './ConnectionDialog';

export function SupabaseDialog({ datasetId, onClose }: ConnectionDialogProps) {
  const [form, setForm] = useState({ name: '', projectRef: '', accessToken: '' });

  const loadConnection = useCallback((connection: DatasetDetail) => {
    const { sourceConfig } = connection;
    if (sourceConfig.type !== 'supabase') throw new Error('只有 Supabase 数据源支持此操作。');
    setForm({ name: connection.name, projectRef: sourceConfig.options.projectRef, accessToken: '' });
  }, []);

  return (
    <ConnectionDialog
      datasetId={datasetId}
      onClose={onClose}
      label="Supabase"
      name={form.name}
      sourceConfig={{
        type: 'supabase',
        options: { projectRef: form.projectRef.trim(), accessToken: form.accessToken.trim() },
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
        label="项目 ID（Project Ref）"
        name="projectRef"
        placeholder="项目设置中的 Reference ID"
        value={form.projectRef}
        onValueChange={(value) => setForm({ ...form, projectRef: value })}
      />
      <ConnectionField
        label="个人访问令牌（Access Token）"
        name="accessToken"
        type="password"
        placeholder={datasetId ? '请重新填写个人访问令牌' : '账户 Access Tokens 中生成的令牌'}
        value={form.accessToken}
        onValueChange={(value) => setForm({ ...form, accessToken: value })}
      />
      <p className="m-0 text-xs text-muted">
        使用个人访问令牌（非项目 API Key），读取 public schema 中的数据表和视图。
      </p>
    </ConnectionDialog>
  );
}
