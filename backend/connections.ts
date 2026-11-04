import { WorkbenchError } from '../shared/errors';
import { randomUUID } from 'node:crypto';
import type { DataSourceConfig } from '@antv/ava';
import type { MySQLInput } from '../shared/contracts';
import type { Store, StoredDataset } from './store';

function validateMySQL(input: MySQLInput) {
  if (!Number.isInteger(input.port) || input.port < 1 || input.port > 65535)
    throw new WorkbenchError('INVALID_INPUT', '端口应为 1–65535');
  for (const key of ['host', 'database', 'user'] as const)
    if (typeof input[key] !== 'string' || !input[key])
      throw new WorkbenchError('INVALID_INPUT', '请填写主机、数据库和用户名');
  // AVA beta joins DuckDB MySQL connection fields without quoting. Reject
  // ambiguous values instead of letting them become connection-string options.
  for (const value of [input.host, input.database, input.user, input.password ?? ''])
    if (typeof value !== 'string' || /[\s'"\\\x00-\x1f\x7f]/u.test(value))
      throw new WorkbenchError(
        'INVALID_INPUT',
        '当前 MySQL 驱动暂不支持连接字段含空白、引号、反斜杠或控制字符',
      );
}
export function connectionFailure(error: unknown) {
  const text =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String(error.message)
        : String(error);
  // Never return the native driver text: ATTACH errors can contain passwords.
  if (/extension|download|install|http|扩展/i.test(text))
    return 'MySQL 扩展加载失败，请检查当前平台的 DuckDB 安装与 mysql 扩展。';
  if (/access denied|authentication|身份验证/i.test(text))
    return '身份验证失败，请检查账号、密码及数据库读取权限。';
  if (/timeout|connect|refused|resolve|host|连接未建立/i.test(text))
    return '连接未建立，请检查主机、端口、网络及 MySQL 服务状态。';
  return 'MySQL 读取失败，请检查数据库名称、表权限和服务状态后重新验证。';
}
export class Connections {
  constructor(
    private store: Store,
    private encrypt: (s: string) => string,
    private decrypt: (s: string) => string,
  ) {}
  prepare(input: MySQLInput): StoredDataset {
    validateMySQL(input);
    const old = input.id ? this.store.dataset(input.id) : undefined;
    if (old && old.format !== 'mysql') throw new WorkbenchError('INVALID_INPUT', '只能编辑 MySQL 连接');
    const sameSource =
      old?.connection &&
      (['host', 'port', 'database', 'user'] as const).every((key) => old.connection![key] === input[key]);
    return {
      id: old?.id || randomUUID(),
      name: input.name.trim(),
      format: 'mysql',
      file: '',
      fingerprint: sameSource ? old.fingerprint : randomUUID(),
      schemaRevision: randomUUID(),
      createdAt: old?.createdAt || new Date().toISOString(),
      lastUsedAt: old?.lastUsedAt,
      semantic: old?.semantic || '',
      metrics: old?.metrics || [],
      preview: [],
      schema: { models: [] },
      profile: { models: [] },
      connection: {
        host: input.host,
        port: input.port,
        database: input.database,
        user: input.user,
        hasPassword: input.password !== undefined ? !!input.password : !!old?.encryptedPassword,
        status: 'ready',
      },
      encryptedPassword:
        input.password === undefined
          ? old?.encryptedPassword
          : input.password
            ? this.encrypt(input.password)
            : undefined,
    };
  }
  source(dataset: StoredDataset): DataSourceConfig {
    const c = dataset.connection;
    if (!c) throw new WorkbenchError('INVALID_INPUT', '缺少 MySQL 连接配置');
    const password = dataset.encryptedPassword ? this.decrypt(dataset.encryptedPassword) : '';
    const input = {
      name: dataset.name,
      host: c.host,
      port: c.port,
      database: c.database,
      user: c.user,
      password,
    };
    validateMySQL(input);
    return {
      type: 'mysql',
      options: { host: input.host, port: input.port, database: input.database, user: input.user, password },
    };
  }
}
