import { Database, FileCode, FileCsv, FileText, Files, Lightning, Stack, Table } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import type { LocalFileFormat } from '@shared/api';

export type DatasetSource = {
  type: string;
  enable: boolean;
  label: string;
  description: string;
  color: string;
  icon: Icon;
  format?: LocalFileFormat;
};

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
        format: 'csv',
      },
      {
        type: 'json-file',
        enable: true,
        label: 'JSON 文件',
        description: '本地 JSON 文件',
        color: '#8054b6',
        icon: FileCode,
        format: 'json',
      },
      {
        type: 'excel',
        enable: true,
        label: 'Excel',
        description: '支持多个工作表的 XLSX 文件',
        color: '#18734b',
        icon: Table,
        format: 'xlsx',
      },
      {
        type: 'parquet',
        enable: true,
        label: 'Parquet',
        description: '面向分析的列式数据文件',
        color: '#a66a1c',
        icon: Stack,
        format: 'parquet',
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
      },
      {
        type: 'postgresql',
        enable: false,
        label: 'PostgreSQL',
        description: '开源对象关系型数据库',
        color: '#687682',
        icon: Database,
      },
      {
        type: 'sqlite',
        enable: true,
        label: 'SQLite',
        description: '支持多表浏览的本地 SQLite 数据库',
        color: '#28769a',
        icon: Database,
        format: 'sqlite',
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

export function getDatasetSource(type: string): Pick<DatasetSource, 'label' | 'icon'> {
  return sources.find((source) => source.type === type) ?? { label: type, icon: Database };
}
