import { Database, FileCode, FileCsv, FileText, Files, Lightning, Stack, Table } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import type { ComponentType } from 'react';
import type { LocalFileFormat } from '@shared/api';
import { MySQLDialog } from '../pages/datasets/datasetDialogs/MySQLDialog';
import { PostgreSQLDialog } from '../pages/datasets/datasetDialogs/PostgreSQLDialog';
import type { ConnectionDialogProps } from '../pages/datasets/datasetDialogs/ConnectionDialog';

export type DatasetSourceAction =
  | { type: 'file'; format: LocalFileFormat }
  | { type: 'connection'; Dialog: ComponentType<ConnectionDialogProps> };

export type DatasetSource = {
  type: string;
  label: string;
  description: string;
  color: string;
  icon: Icon;
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
        label: 'CSV 文件',
        description: '本地 CSV 文件',
        color: '#25804d',
        icon: FileCsv,
        action: { type: 'file', format: 'csv' },
        actionLabel: '选择文件',
      },
      {
        type: 'json-file',
        enable: true,
        label: 'JSON 文件',
        description: '本地 JSON 文件',
        color: '#8054b6',
        icon: FileCode,
        action: { type: 'file', format: 'json' },
        actionLabel: '选择文件',
      },
      {
        type: 'excel',
        enable: true,
        label: 'Excel',
        description: '支持多个工作表的 XLSX 文件',
        color: '#18734b',
        icon: Table,
        action: { type: 'file', format: 'xlsx' },
        actionLabel: '选择文件',
      },
      {
        type: 'parquet',
        enable: true,
        label: 'Parquet',
        description: '面向分析的列式数据文件',
        color: '#a66a1c',
        icon: Stack,
        action: { type: 'file', format: 'parquet' },
        actionLabel: '选择文件',
      },
      {
        type: 'text',
        enable: false,
        label: '文本',
        description: '通过模型从文本中提取结构化数据',
        color: '#687682',
        icon: FileText,
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
        description: '连接数据库并浏览数据表',
        color: '#28769a',
        icon: Database,
        action: { type: 'connection', Dialog: MySQLDialog },
        actionLabel: '配置连接',
      },
      {
        type: 'postgresql',
        enable: true,
        label: 'PostgreSQL',
        description: '连接指定 Schema 并浏览数据表',
        color: '#336791',
        icon: Database,
        action: { type: 'connection', Dialog: PostgreSQLDialog },
        actionLabel: '配置连接',
      },
      {
        type: 'sqlite',
        enable: true,
        label: 'SQLite',
        description: '支持多表浏览的本地 SQLite 数据库',
        color: '#28769a',
        icon: Database,
        action: { type: 'file', format: 'sqlite' },
        actionLabel: '选择文件',
      },
      {
        type: 'mongodb',
        enable: false,
        label: 'MongoDB',
        description: '面向文档的 NoSQL 数据库',
        color: '#687682',
        icon: Stack,
      },
      {
        type: 'clickhouse',
        enable: false,
        label: 'ClickHouse',
        description: '面向实时分析的列式数据库',
        color: '#687682',
        icon: Database,
      },
    ],
  },
  {
    title: 'SaaS 应用',
    icon: Stack,
    sources: [
      {
        type: 'supabase',
        enable: false,
        label: 'Supabase',
        description: '基于 PostgreSQL 的云端数据库',
        color: '#687682',
        icon: Lightning,
      },
      {
        type: 'feishu-bitable',
        enable: false,
        label: '飞书多维表格',
        description: '飞书中的协作表格与业务数据',
        color: '#687682',
        icon: Table,
      },
    ],
  },
];

const sources = DATA_SOURCE_GROUPS.flatMap((group) => group.sources);

export function findDatasetSource(type: string): DatasetSource | undefined {
  return sources.find((source) => source.type === type);
}

export function getDatasetSource(type: string): Pick<DatasetSource, 'label' | 'icon'> {
  return findDatasetSource(type) ?? { label: type, icon: Database };
}
