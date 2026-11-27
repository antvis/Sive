import { useI18n } from '../../../i18n';
import { useCallback, useState } from 'react';
import type { DatasetDetail, SupabaseOAuthResult } from '@shared/api';
import { Button } from '../../../components/ui/button';
import { SelectField } from '../../../components/ui/select';
import { errorMessage } from '../../../utils';
import { ConnectionDialog, ConnectionField } from './ConnectionDialog';
import type { ConnectionDialogProps } from './ConnectionDialog';

export function SupabaseDialog({ datasetId, onClose }: ConnectionDialogProps) {
  const i18n = useI18n();
  const [form, setForm] = useState({ name: '', projectRef: '' });
  const [session, setSession] = useState<SupabaseOAuthResult | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  const loadConnection = useCallback((connection: DatasetDetail) => {
    const { sourceConfig } = connection;
    if (sourceConfig.type !== 'supabase') throw new Error(i18n('errors.supabase.sourceTypeMismatch'));
    setForm({ name: connection.name, projectRef: sourceConfig.options.projectRef });
    setSession(null);
  }, [i18n]);

  const connect = async () => {
    if (connecting) return;
    setConnecting(true);
    setError('');
    try {
      const result = await window.workbench.oAuthStart('supabase');
      if (!result.projects.length) throw new Error(i18n('errors.supabase.noProjects'));
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
        label={i18n('datasets.fields.name')}
        name="name"
        value={form.name}
        onValueChange={(value) => setForm({ ...form, name: value })}
      />
      <div className="grid gap-1.5 text-sm">
        <span>{i18n('connections.supabase.authorizationLabel')}</span>
        <Button variant={session ? 'default' : 'primary'} disabled={connecting} onClick={connect}>
          {connecting
            ? i18n('connections.supabase.waitingAuthorization')
            : session
              ? i18n('connections.supabase.reauthorize')
              : i18n('connections.supabase.connect')}
        </Button>
      </div>
      {session ? (
        <label className="grid gap-1.5 text-sm">
          {i18n('connections.supabase.projectLabel')}
          <SelectField
            aria-label={i18n('connections.supabase.projectSelectLabel')}
            className="w-full"
            value={form.projectRef}
            options={session.projects.map((project) => ({ value: project.id, label: project.name }))}
            onChange={(projectRef) => setForm({ ...form, projectRef })}
          />
        </label>
      ) : (
        <p className="m-0 text-xs text-muted-foreground">
          {form.projectRef
            ? i18n('connections.supabase.reauthorizationDescription', [form.projectRef])
            : i18n('connections.supabase.authorizationDescription')}
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
