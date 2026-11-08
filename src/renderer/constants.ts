import {
  CloudIcon,
  DatabaseIcon,
  FileCodeIcon,
  FileCsvIcon,
  FileTextIcon,
  FilesIcon,
  LightningIcon,
  LinkIcon,
  StackIcon,
  TableIcon,
  type Icon,
} from '@phosphor-icons/react';
import type { Dataset } from '@shared/contracts';

type Source = {
  name: string;
  description: string;
  icon: Icon;
  color: string;
  format?: Dataset['format'];
};
export const DATA_SOURCE_GROUPS: { name: string; icon: Icon; sources: Source[] }[] = [
  {
    name: '文件与文本',
    icon: FilesIcon,
    sources: [
      {
        name: 'CSV',
        description: '逗号分隔的表格数据',
        icon: FileCsvIcon,
        format: 'csv',
        color: '#25804d',
      },
      {
        name: 'JSON',
        description: '结构化 JSON 数据文件',
        icon: FileCodeIcon,
        format: 'json',
        color: '#8054b6',
      },
      {
        name: 'Excel',
        description: '支持多个工作表的 XLSX 文件',
        icon: TableIcon,
        format: 'xlsx',
        color: '#18734b',
      },
      {
        name: 'Parquet',
        description: '面向分析的列式数据文件',
        icon: StackIcon,
        format: 'parquet',
        color: '#a66a1c',
      },
      {
        name: '文本',
        description: '通过模型从文本中提取结构化数据',
        icon: FileTextIcon,
        color: '#687682',
      },
    ],
  },
  {
    name: '数据库',
    icon: DatabaseIcon,
    sources: [
      {
        name: 'MySQL',
        description: '开源关系型数据库',
        icon: DatabaseIcon,
        format: 'mysql',
        color: '#28769a',
      },
      {
        name: 'PostgreSQL',
        description: '开源对象关系型数据库',
        icon: DatabaseIcon,
        color: '#687682',
      },
      {
        name: 'SQLite',
        description: '轻量级本地文件数据库',
        icon: DatabaseIcon,
        color: '#687682',
      },
      {
        name: 'MongoDB',
        description: '面向文档的 NoSQL 数据库',
        icon: StackIcon,
        color: '#687682',
      },
      {
        name: 'ClickHouse',
        description: '面向实时分析的列式数据库',
        icon: DatabaseIcon,
        color: '#687682',
      },
    ],
  },
  {
    name: '远程文件',
    icon: CloudIcon,
    sources: [
      {
        name: 'HTTP 文件',
        description: '通过链接读取远程数据文件',
        icon: LinkIcon,
        color: '#687682',
      },
    ],
  },
  {
    name: 'SaaS 应用',
    icon: StackIcon,
    sources: [
      {
        name: 'Supabase',
        description: '基于 PostgreSQL 的云端数据库',
        icon: LightningIcon,
        color: '#687682',
      },
      {
        name: '飞书多维表格',
        description: '飞书中的协作表格与业务数据',
        icon: TableIcon,
        color: '#687682',
      },
    ],
  },
];

export function getDataSource(format: Dataset['format']) {
  return DATA_SOURCE_GROUPS.flatMap((group) => group.sources).find((source) => source.format === format)!;
}
