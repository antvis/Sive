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
import type { Dataset, LocalDataset } from '../../shared/contracts';

export const DATA_SOURCE_ICONS: Record<Dataset['format'], Icon> = {
  csv: FileCsvIcon,
  json: FileCodeIcon,
  xlsx: TableIcon,
  parquet: StackIcon,
  mysql: DatabaseIcon,
};

type Source = {
  name: string;
  description: string;
  icon: Icon;
  format?: LocalDataset['format'];
  mysql?: boolean;
};
export const DATA_SOURCE_GROUPS: { name: string; icon: Icon; sources: Source[] }[] = [
  {
    name: '文件与文本',
    icon: FilesIcon,
    sources: [
      { name: 'CSV', description: '逗号分隔的表格数据', icon: DATA_SOURCE_ICONS.csv, format: 'csv' },
      { name: 'JSON', description: '结构化 JSON 数据文件', icon: DATA_SOURCE_ICONS.json, format: 'json' },
      {
        name: 'Excel',
        description: '支持多个工作表的 XLSX 文件',
        icon: DATA_SOURCE_ICONS.xlsx,
        format: 'xlsx',
      },
      {
        name: 'Parquet',
        description: '面向分析的列式数据文件',
        icon: DATA_SOURCE_ICONS.parquet,
        format: 'parquet',
      },
      { name: '文本', description: '通过模型从文本中提取结构化数据', icon: FileTextIcon },
    ],
  },
  {
    name: '数据库',
    icon: DatabaseIcon,
    sources: [
      { name: 'MySQL', description: '开源关系型数据库', icon: DATA_SOURCE_ICONS.mysql, mysql: true },
      { name: 'PostgreSQL', description: '开源对象关系型数据库', icon: DatabaseIcon },
      { name: 'SQLite', description: '轻量级本地文件数据库', icon: DatabaseIcon },
      { name: 'MongoDB', description: '面向文档的 NoSQL 数据库', icon: StackIcon },
      { name: 'ClickHouse', description: '面向实时分析的列式数据库', icon: DatabaseIcon },
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
      },
    ],
  },
  {
    name: 'SaaS 应用',
    icon: StackIcon,
    sources: [
      { name: 'Supabase', description: '基于 PostgreSQL 的云端数据库', icon: LightningIcon },
      { name: '飞书多维表格', description: '飞书中的协作表格与业务数据', icon: TableIcon },
    ],
  },
];
