import { useCallback, useState } from 'react';
import type { DatasetDetail, SupabaseOAuthResult } from '@shared/api';
import { Button } from '../../../components/Button';
import { Select } from '../../../components/Select';
import { errorMessage } from '../../../utils';
import { ConnectionDialog, ConnectionField } from './ConnectionDialog';
import type { ConnectionDialogProps } from './ConnectionDialog';

export function SupabaseDialog({ datasetId, onClose }: ConnectionDialogProps) {
  const [form, setForm] = useState({ name: '', projectRef: '' });
  const [session, setSession] = useState<SupabaseOAuthResult | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  const loadConnection = useCallback((connection: DatasetDetail) => {
    const { sourceConfig } = connection;
    if (sourceConfig.type !== 'supabase') throw new Error('只有 Supabase 数据源支持此操作。');
    setForm({ name: connection.name, projectRef: sourceConfig.options.projectRef });
    setSession(null);
  }, []);

  const connect = async () => {
    if (connecting) return;
    setConnecting(true);
    setError('');
    try {
      const result = await window.workbench.oAuthStart('supabase');
      if (!result.projects.length) throw new Error('当前 Supabase 账户未发现可连接的项目。');
      setSession(result);
      setForm((current) => ({
        name: current.name || result.projects[0].name,
        projectRef: result.projects[0].id,
      }));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setConnecting(false);
    }
  };

  return (
    <ConnectionDialog
      datasetId={datasetId}
      onClose={onClose}
      label="Supabase"
      name={form.name}
      sourceConfig={{
        type: 'supabase',
        options: { projectRef: form.projectRef, accessToken: '' },
      }}
      authSessionId={session?.sessionId}
      submitDisabled={!session || !form.projectRef || connecting}
      onLoad={loadConnection}
    >
      <ConnectionField
        label="数据源名称"
        name="name"
        value={form.name}
        onValueChange={(value) => setForm({ ...form, name: value })}
      />
      <div className="grid gap-1.5 text-sm">
        <span>Supabase 授权</span>
        <Button variant={session ? 'secondary' : 'primary'} disabled={connecting} onClick={connect}>
          {connecting ? '正在等待浏览器授权…' : session ? '重新授权' : '连接 Supabase'}
        </Button>
      </div>
      {session ? (
        <label className="grid gap-1.5 text-sm">
          项目
          <Select
            aria-label="Supabase 项目"
            className="w-full"
            value={form.projectRef}
            options={session.projects.map((project) => ({ value: project.id, label: project.name }))}
            onChange={(projectRef) => setForm({ ...form, projectRef })}
          />
        </label>
      ) : (
        <p className="m-0 text-xs text-muted-foreground">
          {form.projectRef
            ? `当前项目：${form.projectRef}。保存前请重新授权。`
            : '通过系统浏览器安全授权，无需填写访问令牌。'}
        </p>
      )}
      {error && (
        <p role="alert" className="m-0 text-sm text-danger">
          {error}
        </p>
      )}
    </ConnectionDialog>
  );
}
