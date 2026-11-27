import { i18n } from '../../util/i18n';
import { randomUUID } from 'node:crypto';
import { statSync } from 'node:fs';
import { AVA, sourceInputSchema } from '@antv/ava';
import type { DataSourceConfig, JavaScriptEngine, Semantic } from '@antv/ava';
import { createLanguageModel } from '../../ai/model';
import type { Repositories } from '../../db/repository';
import type { DBConnection } from '../../db/repository/db-connection';
import type { DatasetExtras, DatasetRow, SupabaseOAuthCredentials } from '../../db/schema/datasets';
import { required } from '../../util';
import { DEFAULT_PREVIEW_PAGE_SIZE, PREVIEW_PAGE_SIZES } from '@shared/api';
import type { DatasetPreviewOptions, Preferences } from '@shared/api';
import { checkLocalFile, localFilePath } from '../../util/localFile';
import { sourceEngine } from '../../util/engine';
import {
  connectGitHub,
  waitForGitHubConnect,
  cancelGitHubConnect,
  listGitHubRepositories,
} from '../../util/github/client';
import type { GitHubRepositoryListInput } from '@shared/github';
import { githubSourceSchema } from '@shared/github';
import type { ModelConfig } from '../model';
import { supabaseError } from '../../util/supabase/errors';
import { refreshSupabaseOAuth, startSupabaseOAuth } from '../../util/supabase/oauth';

const OAUTH_SESSION_TTL_MS = 10 * 60 * 1000;
const TOKEN_REFRESH_SKEW_MS = 60 * 1000;

type OAuthSession =
  | { type: 'supabase'; credentials: SupabaseOAuthCredentials; expiresAt: number }
  | { type: 'github'; token: string; login: string; expiresAt: number };

function toSummary(row: DatasetRow) {
  let fileSize: number | undefined;
  const filePath = localFilePath(row.sourceConfig);
  let fileUnavailable = false;
  if (filePath) {
    try {
      fileSize = statSync(filePath).size;
    } catch {
      fileUnavailable = true;
    }
  }
  const rowCount = row.profile.models.find((model) => model.name === row.schema.models[0]?.name)?.metrics
    .row_count;
  return {
    id: row.id,
    name: row.name,
    sourceType: row.sourceType,
    updatedAt: row.updatedAt,
    fileSize,
    localFile: Boolean(filePath),
    fileUnavailable,
    tableCount: row.schema.models.length,
    rowCount: typeof rowCount === 'number' ? rowCount : undefined,
    columnCount: row.schema.models[0]?.columns.length ?? 0,
  };
}

export class DatasetService {
  private oauthAuthorizing = false;

  private oauthSessions = new Map<string, OAuthSession>();

  private oauthRefreshes = new Map<string, Promise<void>>();

  constructor(
    private database: DBConnection,
    private repositories: Repositories,
  ) {}

  list() {
    return this.repositories.datasets.list();
  }

  listSummaries() {
    return this.list().map(toSummary);
  }

  get(id: string) {
    return this.repositories.datasets.get(id);
  }

  getDetail(id: string) {
    const row = this.get(id);
    if (!row) return null;
    let sourceConfig = row.sourceConfig;
    switch (sourceConfig.type) {
      case 'mysql':
      case 'postgresql': {
        const { host, port, database, user } = sourceConfig.options;
        sourceConfig = {
          type: sourceConfig.type,
          options: {
            host,
            port,
            database,
            user,
            ...(sourceConfig.type === 'postgresql' ? { schema: sourceConfig.options.schema } : {}),
          },
        };
        break;
      }
      case 'mongodb': {
        const { host, port, database, user, authSource, tls, ssl } = sourceConfig.options;
        sourceConfig = {
          type: 'mongodb',
          options: { host, port, database, user, authSource, tls: tls || ssl },
        };
        break;
      }
      case 'clickhouse': {
        const { url, database, username } = sourceConfig.options;
        const address = new URL(required(url, i18n('errors.clickhouse.urlRequired')));
        address.username = '';
        address.password = '';
        address.search = '';
        address.hash = '';
        sourceConfig = {
          type: 'clickhouse',
          options: { url: address.toString(), database, username },
        };
        break;
      }
      case 'supabase': {
        const { projectRef } = sourceConfig.options;
        sourceConfig = { type: 'supabase', options: { projectRef, accessToken: '' } };
        break;
      }
      case 'github': {
        const { repository, since, maxRecords, timeoutMs } = sourceConfig.options;
        sourceConfig = { type: 'github', options: { repository, since, maxRecords, timeoutMs } };
        break;
      }
      case 'feishu-bitable': {
        const { url, appId } = sourceConfig.options;
        sourceConfig = { type: 'feishu-bitable', options: { url, appId } };
        break;
      }
    }
    return {
      ...toSummary(row),
      sourceConfig,
      schema: row.schema,
      profile: row.profile,
      semantic: row.semantic,
    };
  }

  async oAuthStart(type: DataSourceConfig['type']) {
    if (this.oauthAuthorizing) throw new Error(i18n('errors.oauth.alreadyRunning'));
    this.oauthAuthorizing = true;
    try {
      switch (type) {
        case 'supabase': {
          const { credentials, projects } = await startSupabaseOAuth();
          const sessionId = randomUUID();
          this.oauthSessions.set(sessionId, {
            type: 'supabase',
            credentials,
            expiresAt: Date.now() + OAUTH_SESSION_TTL_MS,
          });
          return { sessionId, projects };
        }
        default:
          throw new Error(i18n('errors.oauth.unsupportedSource'));
      }
    } finally {
      this.oauthAuthorizing = false;
    }
  }

  connectGitHub(connectionId: string) {
    return connectGitHub(connectionId);
  }

  async waitForGitHubConnect(connectionId: string) {
    const session = await waitForGitHubConnect(connectionId);
    this.oauthSessions.set(connectionId, {
      type: 'github',
      ...session,
      expiresAt: Date.now() + OAUTH_SESSION_TTL_MS,
    });
    return { login: session.login };
  }

  cancelGitHubConnect(connectionId: string) {
    return cancelGitHubConnect(connectionId);
  }

  githubRepositories(input: GitHubRepositoryListInput) {
    const session = this.oauthSessions.get(input.connectionId);
    if (!session || session.type !== 'github' || session.expiresAt <= Date.now()) {
      this.oauthSessions.delete(input.connectionId);
      throw new Error(i18n('errors.github.sessionExpired'));
    }
    return listGitHubRepositories(input, session);
  }

  private withOAuthSession(sourceConfig: DataSourceConfig, sessionId?: string) {
    if (!sessionId || (sourceConfig.type !== 'supabase' && sourceConfig.type !== 'github')) {
      return { sourceConfig, extras: null };
    }
    const session = this.oauthSessions.get(sessionId);
    if (!session || session.expiresAt <= Date.now()) {
      this.oauthSessions.delete(sessionId);
      throw new Error(i18n('errors.oauth.sessionExpired'));
    }
    if (sourceConfig.type === 'github') {
      if (session.type !== 'github') throw new Error(i18n('errors.github.invalidSession'));
      return {
        sourceConfig: { ...sourceConfig, options: { ...sourceConfig.options, token: session.token } },
        extras: null,
      };
    }
    if (session.type !== 'supabase') throw new Error(i18n('errors.supabase.invalidSession'));
    const accessToken = required(session.credentials.tokens?.access_token, i18n('errors.oauth.tokenMissing'));
    return {
      sourceConfig: { ...sourceConfig, options: { ...sourceConfig.options, accessToken } },
      extras: { supabaseOAuth: session.credentials },
    };
  }

  private completeOAuth(sessionId?: string) {
    if (sessionId) this.oauthSessions.delete(sessionId);
  }

  async prepareOAuth(id: string): Promise<void> {
    const dataset = this.get(id);
    if (dataset?.sourceConfig.type !== 'supabase') return;
    const { accessToken } = dataset.sourceConfig.options;
    const oauth = dataset.extras?.supabaseOAuth;
    if (!oauth) return;
    if (accessToken && oauth.expiresAt && oauth.expiresAt - TOKEN_REFRESH_SKEW_MS > Date.now()) return;
    if (!oauth.tokens?.refresh_token) throw new Error(i18n('errors.supabase.authorizationExpired'));

    const existing = this.oauthRefreshes.get(id);
    if (existing) return existing;
    const refresh = this.refreshSupabase(id).finally(() => this.oauthRefreshes.delete(id));
    this.oauthRefreshes.set(id, refresh);
    return refresh;
  }

  private async refreshSupabase(id: string) {
    const dataset = required(this.get(id), i18n('errors.dataset.notFound'));
    if (dataset.sourceConfig.type !== 'supabase') return;
    const oauth = required(dataset.extras?.supabaseOAuth, i18n('errors.supabase.credentialsMissing'));
    const credentials = await refreshSupabaseOAuth(oauth);
    const current = required(this.get(id), i18n('errors.dataset.notFound'));
    if (current.sourceConfig.type !== 'supabase') return;
    if (current.extras?.supabaseOAuth?.tokens?.refresh_token !== oauth.tokens?.refresh_token) {
      throw new Error(i18n('errors.supabase.refreshCancelled'));
    }
    const sourceConfig = {
      ...current.sourceConfig,
      options: { ...current.sourceConfig.options, accessToken: credentials.tokens?.access_token ?? '' },
    };
    const extras: DatasetExtras = { ...current.extras, supabaseOAuth: credentials };
    this.database.write(() =>
      required(
        this.repositories.datasets.updateCredentials(id, { sourceConfig, extras }),
        i18n('errors.dataset.notFound'),
      ),
    );
  }

  async refresh(id: string) {
    await this.prepareOAuth(id);
    const original = required(this.get(id), i18n('errors.dataset.notFound'));
    const refreshed = await this.readSource(original.sourceConfig);
    return this.database.write(() =>
      required(this.repositories.datasets.update(id, refreshed), i18n('errors.dataset.notFound')),
    );
  }

  async test(sourceConfig: DataSourceConfig, authSessionId?: string) {
    const connection = this.withOAuthSession(sourceConfig, authSessionId);
    await this.readSource(connection.sourceConfig);
  }

  async extractText(text: string, config: ModelConfig, language: Preferences['language']) {
    const ava = new AVA({
      llm: { model: createLanguageModel(config, language), maxRetries: 0 },
      engine: { type: 'javascript' },
    });
    try {
      await ava.source({ type: 'text', options: { text } });
      const data: Record<string, unknown>[] = (ava.engine as JavaScriptEngine).getData() ?? [];
      sourceInputSchema.parse({ type: 'json', options: { data } });
      if (!data.length || !data.some((row) => Object.keys(row).length))
        throw new Error(i18n('errors.dataset.noExtractedData'));
      return data;
    } finally {
      await ava.dispose();
    }
  }

  async preview(
    id: string,
    table?: string,
    options: DatasetPreviewOptions = { offset: 0, limit: DEFAULT_PREVIEW_PAGE_SIZE },
  ) {
    await this.prepareOAuth(id);
    const dataset = required(this.get(id), i18n('errors.dataset.notFound'));
    const model = required(
      table === undefined
        ? dataset.schema.models[0]
        : dataset.schema.models.find((item) => item.name === table),
      i18n('errors.dataset.tableNotFound'),
    );
    const { offset, limit } = options;
    if (
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      !PREVIEW_PAGE_SIZES.some((size) => size === limit) ||
      !Number.isSafeInteger(offset + limit + 1)
    )
      throw new Error(i18n('errors.dataset.invalidPagination'));

    const identifier = (name: string) => `"${name.replace(/"/g, '""')}"`;
    const keys =
      dataset.sourceType === 'github'
        ? ['number']
        : typeof model.primaryKey === 'string'
          ? [model.primaryKey]
          : (model.primaryKey ?? []);
    const order = keys.length ? ` ORDER BY ${keys.map(identifier).join(', ')}` : '';
    const ava = new AVA({
      llm: { model: 'preview-only' },
      engine: sourceEngine(dataset.sourceConfig),
    });
    try {
      const file = localFilePath(dataset.sourceConfig);
      if (file) await checkLocalFile(file);
      await ava.source(dataset.sourceConfig);
      const reference = model.tableReference;
      const tableName =
        dataset.sourceType === 'github' && reference
          ? [reference.schema, reference.table]
              .filter((part): part is string => Boolean(part))
              .map(identifier)
              .join('.')
          : identifier(model.name);
      const result = await ava.query(
        `SELECT * FROM ${tableName}${order} LIMIT ${limit + 1} OFFSET ${offset}`,
        { maxRows: limit + 1 },
      );
      return result.data;
    } finally {
      await ava.dispose();
    }
  }

  async suggest(id: string, config: ModelConfig, language: Preferences['language']) {
    await this.prepareOAuth(id);
    const dataset = required(this.get(id), i18n('errors.dataset.notFound'));
    const ava = new AVA({
      llm: { model: createLanguageModel(config, language) },
      engine: sourceEngine(dataset.sourceConfig),
    });
    try {
      const file = localFilePath(dataset.sourceConfig);
      if (file) await checkLocalFile(file);
      await ava.source(dataset.sourceConfig);
      await ava.schema({}, () => dataset.schema);
      await ava.profile({}, () => dataset.profile);
      await ava.semantic({}, () => dataset.semantic);
      return await ava.suggest(3);
    } finally {
      await ava.dispose();
    }
  }

  private async readSource(sourceConfig: DataSourceConfig) {
    const file = localFilePath(sourceConfig);
    if (file) await checkLocalFile(file);
    const ava = new AVA({
      llm: { model: 'data-loading-only' },
      engine: sourceEngine(sourceConfig),
    });
    try {
      await ava.source(sourceConfig);
      const schema = await ava.schema();
      const profile = await ava.profile({ metrics: ['row_count'] });
      if (!schema.models.length) throw new Error(i18n('errors.dataset.noReadableTables'));
      return {
        sourceConfig,
        schema,
        profile,
      };
    } catch (error) {
      throw supabaseError(error);
    } finally {
      await ava.dispose();
    }
  }

  async save(name: string, sourceConfig: DataSourceConfig, id?: string, authSessionId?: string) {
    if (sourceConfig.type === 'github') sourceConfig = githubSourceSchema.parse(sourceConfig);
    const connection = this.withOAuthSession(sourceConfig, authSessionId);
    const inspected = await this.readSource(connection.sourceConfig);
    const now = new Date().toISOString();
    const values = {
      ...inspected,
      extras: connection.extras,
      name: name.trim(),
      sourceType: sourceConfig.type,
      updatedAt: now,
    };
    const result = this.database.write(() => {
      if (id) return required(this.repositories.datasets.update(id, values), i18n('errors.dataset.notFound'));
      return this.repositories.datasets.insert({
        ...values,
        id: randomUUID(),
        semantic: {},
        createdAt: now,
      });
    });
    this.completeOAuth(authSessionId);
    return result;
  }

  rename(id: string, name: string) {
    this.database.write(() => {
      required(this.repositories.datasets.get(id), i18n('errors.dataset.notFound'));
      this.repositories.datasets.update(id, { name: name.trim() });
    });
  }

  remove(id: string) {
    this.database.write(() => this.repositories.datasets.remove(id));
  }

  saveSemantic(id: string, semantic: Semantic) {
    this.database.write(() => {
      required(this.repositories.datasets.get(id), i18n('errors.dataset.notFound'));
      this.repositories.datasets.update(id, { semantic });
    });
  }
}
