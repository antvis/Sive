import { useCallback, useEffect, useRef, useState } from 'react';
import type { DatasetDetail } from '@shared/api';
import type { GitHubRepositoryPage } from '@shared/github';
import { Button } from '../../../components/Button';
import { Select } from '../../../components/Select';
import { errorMessage } from '../../../utils';
import { ConnectionDialog, ConnectionField } from './ConnectionDialog';
import type { ConnectionDialogProps } from './ConnectionDialog';

export function GitHubDialog({ datasetId, onClose }: ConnectionDialogProps) {
  const [form, setForm] = useState({ name: '', repository: '', since: '', maxRecords: 10000 });
  const [login, setLogin] = useState('');
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

  const loadRepositories = async (page = 1) => {
    const request = ++repositoryRequest.current;
    setLoadingRepositories(true);
    setRepositoryError('');
    if (page === 1) {
      setRepositories([]);
      setPagination({ page, hasMore: false, incomplete: false });
    }
    try {
      const result = await window.workbench.githubRepositories({ page });
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
    if (connection.sourceConfig.type !== 'github') throw new Error('只有 GitHub 数据源支持此操作。');
    const { repository, since = '', maxRecords = 10000 } = connection.sourceConfig.options;
    setForm({ name: connection.name, repository, since, maxRecords });
  }, []);

  const connect = async () => {
    if (pending.current) return;
    pending.current = crypto.randomUUID();
    setConnecting(true);
    setLogin('');
    setError('');
    repositoryRequest.current++;
    setRepositories([]);
    setRepositoryError('');
    setLoadingRepositories(false);
    try {
      const result = await window.workbench.githubConnect(pending.current);
      if (mounted.current) {
        setLogin(result.login);
        void loadRepositories();
      }
    } catch (cause) {
      if (mounted.current) setError(errorMessage(cause));
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
      submitDisabled={!login || connecting}
      onLoad={loadConnection}
    >
      <ConnectionField
        label="数据源名称"
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
        {connecting ? '请在浏览器中完成授权…' : datasetId || login ? '重新连接 GitHub' : '连接 GitHub'}
      </Button>
      <p className="m-0 text-xs text-muted-foreground">
        通过浏览器授权连接。编辑连接或重启应用后需要重新连接。
      </p>
      {login && (
        <div className="grid gap-2">
          <p className="m-0 text-xs text-muted-foreground">
            已连接 {login}，显示账号名下的仓库（含 Fork）。组织或其他仓库可手动填写地址。
          </p>
          <Select
            aria-label="选择 GitHub 仓库"
            className="w-full"
            value={selectedRepository?.fullName ?? ''}
            options={[
              { value: '', label: '请选择仓库' },
              ...repositories.map((repo) => ({
                value: repo.fullName,
                label: `${repo.fullName}${repo.private ? '（私有）' : ''}`,
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
              正在加载仓库…
            </p>
          )}
          {!loadingRepositories && !repositoryError && !repositories.length && (
            <p className="m-0 text-xs text-muted-foreground">未找到仓库，可手动填写地址。</p>
          )}
          {pagination.hasMore && (
            <Button disabled={loadingRepositories} onClick={() => void loadRepositories(pagination.page + 1)}>
              加载更多仓库
            </Button>
          )}
          {pagination.incomplete && (
            <p className="m-0 text-xs text-muted-foreground">
              仓库列表不完整或超过 1,000 个，可手动填写未列出的仓库地址。
            </p>
          )}
          {repositoryError && (
            <p role="alert" className="m-0 text-sm text-danger">
              仓库加载失败：{repositoryError} 可重新连接或手动填写地址。
            </p>
          )}
        </div>
      )}
      <ConnectionField
        label="GitHub 仓库（可手动填写）"
        name="repository"
        placeholder="antvis/AVA 或 https://github.com/antvis/AVA"
        value={form.repository}
        onValueChange={(repository) => setForm((current) => ({ ...current, repository }))}
      />
      <details className="text-sm">
        <summary className="cursor-pointer">读取范围</summary>
        <div className="mt-3 grid gap-3">
          <ConnectionField
            label="记录起始日期（UTC）"
            name="since"
            type="date"
            required={false}
            value={form.since}
            onValueChange={(since) => setForm({ ...form, since })}
          />
          <ConnectionField
            label="记录上限（Issue 与 PR 合计）"
            name="maxRecords"
            type="number"
            min={1}
            max={100000}
            step={1}
            value={form.maxRecords}
            onValueChange={(maxRecords) => setForm({ ...form, maxRecords: Number(maxRecords) })}
          />
          <p className="m-0 text-xs text-muted-foreground">
            始终保留全部未关闭记录；超过上限时会提示调整范围，不会截断数据。预览与新分析会重新读取仓库。
          </p>
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
