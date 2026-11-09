import type { DatasetService as DatasetDataService } from '@main/db/repository/DatasetService';
import type { StoredDataset } from '@main/db/mappers';
import { mysqlInputSchema, parseInput } from '@shared/inputSchemas';
import { WorkbenchError } from '@shared/errors';
import { randomUUID } from 'node:crypto';
import type { DataSourceConfig } from '@antv/ava';
import type { MySQLInput } from '@shared/contracts';

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
export class ConnectionService {
  constructor(
    private datasetRecords: DatasetDataService,
    private encrypt: (s: string) => string,
    private decrypt: (s: string) => string,
  ) {}
  prepare(input: MySQLInput): StoredDataset {
    input = parseInput(mysqlInputSchema, input);
    const old = input.id ? this.datasetRecords.dataset(input.id) : undefined;
    if (old && old.format !== 'mysql') throw new WorkbenchError('INVALID_INPUT', '只能编辑 MySQL 连接');
    return {
      id: old?.id || randomUUID(),
      name: input.name.trim(),
      format: 'mysql',
      file: '',
      updatedAt: old?.updatedAt || new Date().toISOString(),
      createdAt: old?.createdAt || new Date().toISOString(),
      semantic: old?.semantic || '',
      metrics: old?.metrics || [],
      schema: { models: [] },
      profile: { models: [] },
      connection: {
        host: input.host,
        port: input.port,
        database: input.database,
        user: input.user,
        hasPassword: input.password !== undefined ? !!input.password : !!old?.encryptedCredentials,
        status: 'ready',
      },
      encryptedCredentials:
        input.password === undefined
          ? old?.encryptedCredentials
          : input.password
            ? this.encrypt(JSON.stringify({ password: input.password }))
            : undefined,
    };
  }
  source(dataset: StoredDataset): Extract<DataSourceConfig, { type: 'mysql' }> {
    const c = dataset.connection;
    if (!c) throw new WorkbenchError('INVALID_INPUT', '缺少 MySQL 连接配置');
    const credentials = dataset.encryptedCredentials
      ? JSON.parse(this.decrypt(dataset.encryptedCredentials))
      : {};
    const password = credentials.password ?? '';
    const input = {
      name: dataset.name,
      host: c.host,
      port: c.port,
      database: c.database,
      user: c.user,
      password,
    };
    parseInput(mysqlInputSchema, input);
    return {
      type: 'mysql',
      options: { host: input.host, port: input.port, database: input.database, user: input.user, password },
    };
  }
}
