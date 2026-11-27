import { useI18n } from '../../../i18n';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DatasetDetail } from '@shared/api';
import type { GitHubDeviceAuthorization, GitHubRepositoryPage } from '@shared/github';
import { Button } from '../../../components/ui/button';
import { SelectField } from '../../../components/ui/select';
import { errorMessage } from '../../../utils';
import { ConnectionDialog, ConnectionField } from './ConnectionDialog';
import type { ConnectionDialogProps } from './ConnectionDialog';

export function GitHubDialog({ datasetId, onClose }: ConnectionDialogProps) {
  const i18n = useI18n();
  const [form, setForm] = useState({ name: '', repository: '', since: '', maxRecords: 10000 });
  const [session, setSession] = useState<{ id: string; login: string }>();
  const [device, setDevice] = useState<GitHubDeviceAuthorization>();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [repositories, setRepositories] = useState<GitHubRepositoryPage['repositories']>([]);
  const [pagination, setPagination] = useState({ page: 1, hasMore: false, incomplete: false });
  const [loadingRepositories, setLoadingRepositories] = useState(false);
  const [repositoryError, setRepositoryError] = useState('');
  const repositoryRequest = useRef(0);
  const pending = useRef<string | null>(null);
  const mounted = useRef(true);
  const selectedRepository = repositories.find((repo) => repo.fullName === form.repository);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      repositoryRequest.current++;
      if (pending.current) void window.workbench.githubConnectCancel(pending.current).catch(() => {});
    };
  }, []);

  const loadRepositories = async (page = 1, connectionId = session?.id) => {
    if (!connectionId) return;
    const request = ++repositoryRequest.current;
    setLoadingRepositories(true);
    setRepositoryError('');
    if (page === 1) {
      setRepositories([]);
      setPagination({ page, hasMore: false, incomplete: false });
    }
    try {
      const result = await window.workbench.githubRepositories({ connectionId, page });
      if (!mounted.current || request !== repositoryRequest.current) return;
      setRepositories((current) => [
        ...new Map(
          [...(page === 1 ? [] : current), ...result.repositories].map((repo) => [repo.fullName, repo]),
        ).values(),
      ]);
      setPagination({ page, hasMore: result.hasMore, incomplete: result.incomplete });
    } catch (cause) {
      if (mounted.current && request === repositoryRequest.current) setRepositoryError(errorMessage(cause));
    } finally {
      if (mounted.current && request === repositoryRequest.current) setLoadingRepositories(false);
    }
  };

  const loadConnection = useCallback((connection: DatasetDetail) => {
    if (connection.sourceConfig.type !== 'github') throw new Error(i18n('errors.github.sourceTypeMismatch'));
    const { repository, since = '', maxRecords = 10000 } = connection.sourceConfig.options;
    setForm({ name: connection.name, repository, since, maxRecords });
  }, [i18n]);

  const connect = async () => {
    if (pending.current) return;
    const connectionId = crypto.randomUUID();
    pending.current = connectionId;
    setConnecting(true);
    setSession(undefined);
    setDevice(undefined);
    setError('');
    repositoryRequest.current++;
    setRepositories([]);
    setRepositoryError('');
    setLoadingRepositories(false);
    try {
      const authorization = await window.workbench.githubConnect(connectionId);
      if (!mounted.current) {
        await window.workbench.githubConnectCancel(connectionId).catch(() => {});
        return;
      }
      setDevice(authorization);
      const result = await window.workbench.githubConnectWait(connectionId);
      if (mounted.current) {
        setSession({ id: connectionId, login: result.login });
        setDevice(undefined);
        void loadRepositories(1, connectionId);
      }
    } catch (cause) {
      if (mounted.current) {
        setDevice(undefined);
        setError(errorMessage(cause));
      }
    } finally {
      pending.current = null;
      if (mounted.current) setConnecting(false);
    }
  };

  return (
    <ConnectionDialog
      datasetId={datasetId}
      onClose={onClose}
      label="GitHub"
      name={form.name}
      sourceConfig={{
        type: 'github',
        options: {
          repository: form.repository.trim(),
          maxRecords: form.maxRecords,
          ...(form.since ? { since: form.since } : {}),
        },
      }}
      authSessionId={session?.id}
      submitDisabled={!session || connecting}
      onLoad={loadConnection}
    >
      <ConnectionField
        label={i18n('datasets.fields.name')}
        name="name"
        value={form.name}
        onValueChange={(name) => setForm({ ...form, name })}
      />
      <Button
        className="w-full"
        onClick={connect}
        disabled={connecting || loadingRepositories}
        variant="primary"
      >
        {connecting
          ? i18n('connections.github.waitingAuthorization')
          : datasetId || session
            ? i18n('connections.github.reconnect')
            : i18n('connections.github.connect')}
      </Button>
      {device && (
        <div className="grid gap-2 rounded-md border p-3 text-sm">
          <p className="m-0">{i18n('connections.github.deviceCodeDescription')}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-center text-lg font-semibold tracking-widest">
              {device.userCode}
            </code>
            <Button type="button" onClick={() => void navigator.clipboard.writeText(device.userCode)}>
              {i18n('connections.github.copyDeviceCode')}
            </Button>
          </div>
          <p className="m-0 break-all text-xs text-muted-foreground">
            {i18n('connections.github.authorizationInstructions', [device.verificationUri])}
          </p>
        </div>
      )}
      <p className="m-0 text-xs text-muted-foreground">{i18n('connections.github.credentialsDescription')}</p>
      {session && (
        <div className="grid gap-2">
          <p className="m-0 text-xs text-muted-foreground">
            {i18n('connections.github.accountDescription', [session.login])}
          </p>
          <SelectField
            aria-label={i18n('connections.github.repositorySelectLabel')}
            className="w-full"
            value={selectedRepository?.fullName ?? ''}
            options={[
              { value: '', label: i18n('connections.github.repositorySelectPlaceholder') },
              ...repositories.map((repo) => ({
                value: repo.fullName,
                label: `${repo.fullName}${repo.private ? i18n('connections.github.privateRepositorySuffix') : ''}`,
              })),
            ]}
            onChange={(repository) => {
              if (repository)
                setForm((current) => ({ ...current, repository, name: current.name || repository }));
            }}
          />
          {selectedRepository?.description && (
            <p className="m-0 break-words text-xs text-muted-foreground">{selectedRepository.description}</p>
          )}
          {loadingRepositories && (
            <p role="status" className="m-0 text-xs text-muted-foreground">
              {i18n('connections.github.loadingRepositories')}
            </p>
          )}
          {!loadingRepositories && !repositoryError && !repositories.length && (
            <p className="m-0 text-xs text-muted-foreground">
              {i18n('connections.github.emptyRepositories')}
            </p>
          )}
          {pagination.hasMore && (
            <Button disabled={loadingRepositories} onClick={() => void loadRepositories(pagination.page + 1)}>
              {i18n('connections.github.loadMoreRepositories')}
            </Button>
          )}
          {pagination.incomplete && (
            <p className="m-0 text-xs text-muted-foreground">
              {i18n('connections.github.incompleteRepositories')}
            </p>
          )}
          {repositoryError && (
            <p role="alert" className="m-0 text-sm text-danger">
              {i18n('connections.github.repositoryLoadFailed', [repositoryError])}
            </p>
          )}
        </div>
      )}
      <ConnectionField
        label={i18n('connections.github.repositoryLabel')}
        name="repository"
        placeholder={i18n('connections.github.repositoryPlaceholder')}
        value={form.repository}
        onValueChange={(repository) => setForm((current) => ({ ...current, repository }))}
      />
      <details className="text-sm">
        <summary className="cursor-pointer">{i18n('connections.github.readScope')}</summary>
        <div className="mt-3 grid gap-3">
          <ConnectionField
            label={i18n('connections.github.sinceLabel')}
            name="since"
            type="date"
            required={false}
            value={form.since}
            onValueChange={(since) => setForm({ ...form, since })}
          />
          <ConnectionField
            label={i18n('connections.github.limitLabel')}
            name="maxRecords"
            type="number"
            min={1}
            max={100000}
            step={1}
            value={form.maxRecords}
            onValueChange={(maxRecords) => setForm({ ...form, maxRecords: Number(maxRecords) })}
          />
          <p className="m-0 text-xs text-muted-foreground">{i18n('connections.github.scopeDescription')}</p>
        </div>
      </details>
      {error && (
        <p role="alert" className="m-0 text-sm text-danger">
          {error}
        </p>
      )}
    </ConnectionDialog>
  );
}
