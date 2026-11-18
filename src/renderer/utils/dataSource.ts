import { Database, Files, Stack } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import type { ComponentType } from 'react';
import type { LocalFileFormat } from '@shared/api';
import {
  MySQLDialog,
  PostgreSQLDialog,
  MongoDBDialog,
  ClickHouseDialog,
  SupabaseDialog,
  FeishuBitableDialog,
  TextImportDialog,
} from '../pages/datasets/datasetDialogs';
import type { ConnectionDialogProps } from '../pages/datasets/datasetDialogs';

export type DatasetSourceAction =
  | { type: 'file'; format: LocalFileFormat }
  | { type: 'import'; Dialog: ComponentType<{ onClose: () => void }> }
  | { type: 'connection'; Dialog: ComponentType<ConnectionDialogProps> };

export type DatasetSource = {
  type: string;
  label: string;
  description: string;
  color: string;
  logo: string;
} & (
  | { enable: false; action?: never; actionLabel?: never }
  | { enable: true; action: DatasetSourceAction; actionLabel: string }
);

export const DATA_SOURCE_GROUPS: { title: string; icon: Icon; sources: DatasetSource[] }[] = [
  {
    title: '文件与文本',
    icon: Files,
    sources: [
      {
        type: 'csv-file',
        enable: true,
        label: 'CSV',
        description: '逗号分隔的纯文本表格格式',
        color: '#25804d',
        logo: './logos/csv.svg',
        action: { type: 'file', format: 'csv' },
        actionLabel: '选择文件',
      },
      {
        type: 'json-file',
        enable: true,
        label: 'JSON',
        description: '轻量级数据交换格式',
        color: '#8054b6',
        logo: './logos/json.svg',
        action: { type: 'file', format: 'json' },
        actionLabel: '选择文件',
      },
      {
        type: 'excel',
        enable: true,
        label: 'Excel',
        description: '支持多个工作表的电子表格格式',
        color: '#18734b',
        logo: './logos/excel.svg',
        action: { type: 'file', format: 'xlsx' },
        actionLabel: '选择文件',
      },
      {
        type: 'parquet',
        enable: true,
        label: 'Parquet',
        description: '面向分析的列式数据文件',
        color: '#a66a1c',
        logo: './logos/parquet.svg',
        action: { type: 'file', format: 'parquet' },
        actionLabel: '选择文件',
      },
      {
        type: 'text',
        enable: true,
        label: '文本',
        description: '通过模型从文本中提取结构化数据',
        color: '#687682',
        logo: './logos/text.svg',
        action: { type: 'import', Dialog: TextImportDialog },
        actionLabel: '提取数据',
      },
    ],
  },
  {
    title: '数据库',
    icon: Database,
    sources: [
      {
        type: 'mysql',
        enable: true,
        label: 'MySQL',
        description: '开源关系型数据库',
        color: '#28769a',
        logo: './logos/mysql.svg',
        action: { type: 'connection', Dialog: MySQLDialog },
        actionLabel: '配置连接',
      },
      {
        type: 'postgresql',
        enable: true,
        label: 'PostgreSQL',
        description: '通用对象关系型数据库',
        color: '#336791',
        logo: './logos/postgresql.svg',
        action: { type: 'connection', Dialog: PostgreSQLDialog },
        actionLabel: '配置连接',
      },
      {
        type: 'sqlite',
        enable: true,
        label: 'SQLite',
        description: '轻量级本地文件数据库，支持多表分析',
        color: '#28769a',
        logo: './logos/sqlite.svg',
        action: { type: 'file', format: 'sqlite' },
        actionLabel: '选择文件',
      },
      {
        type: 'mongodb',
        enable: true,
        label: 'MongoDB',
        description: '面向文档的 NoSQL 数据库',
        color: '#25804d',
        logo: './logos/mongodb.svg',
        action: { type: 'connection', Dialog: MongoDBDialog },
        actionLabel: '配置连接',
      },
      {
        type: 'clickhouse',
        enable: true,
        label: 'ClickHouse',
        description: '面向实时分析的列式数据库',
        color: '#687682',
        logo: './logos/clickhouse.svg',
        action: { type: 'connection', Dialog: ClickHouseDialog },
        actionLabel: '配置连接',
      },
    ],
  },
  {
    title: 'SaaS 应用',
    icon: Stack,
    sources: [
      {
        type: 'supabase',
        enable: true,
        label: 'Supabase',
        description: '基于 PostgreSQL 的云端数据库',
        color: '#687682',
        logo: './logos/supabase.svg',
        action: { type: 'connection', Dialog: SupabaseDialog },
        actionLabel: '配置连接',
      },
      {
        type: 'feishu-bitable',
        enable: true,
        label: '飞书多维表格',
        description: '飞书中的协作表格与业务数据',
        color: '#687682',
        logo: './logos/feishu-bitable.svg',
        action: { type: 'connection', Dialog: FeishuBitableDialog },
        actionLabel: '配置连接',
      },
    ],
  },
];

const sources = DATA_SOURCE_GROUPS.flatMap((group) => group.sources);

export function findDatasetSource(type: string): DatasetSource | undefined {
  return sources.find((source) => source.type === (type === 'json' ? 'json-file' : type));
}
