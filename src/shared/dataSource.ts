export const DATA_SOURCE_GROUPS = [
  {
    title: '文件与文本',
    icon: 'Files',
    sources: [
      {
        type: 'csv-file',
        enable: true,
        label: 'CSV',
        description: '逗号分隔的纯文本表格格式',
        color: '#25804d',
        logo: './logos/csv.svg',
        action: { type: 'file', format: 'csv', extensions: ['csv'] },
        actionLabel: '选择文件',
      },
      {
        type: 'json-file',
        enable: true,
        label: 'JSON',
        description: '轻量级数据交换格式',
        color: '#8054b6',
        logo: './logos/json.svg',
        action: { type: 'file', format: 'json', extensions: ['json'] },
        actionLabel: '选择文件',
      },
      {
        type: 'excel',
        enable: true,
        label: 'Excel',
        description: '支持多个工作表的电子表格格式',
        color: '#18734b',
        logo: './logos/excel.svg',
        action: { type: 'file', format: 'xlsx', extensions: ['xlsx'] },
        actionLabel: '选择文件',
      },
      {
        type: 'parquet',
        enable: true,
        label: 'Parquet',
        description: '面向分析的列式数据文件',
        color: '#a66a1c',
        logo: './logos/parquet.svg',
        action: { type: 'file', format: 'parquet', extensions: ['parquet'] },
        actionLabel: '选择文件',
      },
      {
        type: 'text',
        enable: true,
        label: '文本',
        description: '通过模型从文本中提取结构化数据',
        color: '#687682',
        logo: './logos/text.svg',
        action: { type: 'import', dialog: 'TextImportDialog' },
        actionLabel: '提取数据',
      },
    ],
  },
  {
    title: '数据库',
    icon: 'Database',
    sources: [
      {
        type: 'mysql',
        enable: true,
        label: 'MySQL',
        description: '开源关系型数据库',
        color: '#28769a',
        logo: './logos/mysql.svg',
        action: { type: 'connection', dialog: 'MySQLDialog' },
        actionLabel: '配置连接',
      },
      {
        type: 'postgresql',
        enable: true,
        label: 'PostgreSQL',
        description: '通用对象关系型数据库',
        color: '#336791',
        logo: './logos/postgresql.svg',
        action: { type: 'connection', dialog: 'PostgreSQLDialog' },
        actionLabel: '配置连接',
      },
      {
        type: 'sqlite',
        enable: true,
        label: 'SQLite',
        description: '轻量级本地文件数据库，支持多表分析',
        color: '#28769a',
        logo: './logos/sqlite.svg',
        action: { type: 'file', format: 'sqlite', extensions: ['sqlite', 'sqlite3', 'db'] },
        actionLabel: '选择文件',
      },
      {
        type: 'mongodb',
        enable: true,
        label: 'MongoDB',
        description: '面向文档的 NoSQL 数据库',
        color: '#25804d',
        logo: './logos/mongodb.svg',
        action: { type: 'connection', dialog: 'MongoDBDialog' },
        actionLabel: '配置连接',
      },
      {
        type: 'clickhouse',
        enable: true,
        label: 'ClickHouse',
        description: '面向实时分析的列式数据库',
        color: '#687682',
        logo: './logos/clickhouse.svg',
        action: { type: 'connection', dialog: 'ClickHouseDialog' },
        actionLabel: '配置连接',
      },
    ],
  },
  {
    title: 'SaaS 应用',
    icon: 'Stack',
    sources: [
      {
        type: 'github',
        enable: true,
        label: 'GitHub',
        description: '使用访问令牌，分析仓库的 Issue 与 PR',
        color: '#687682',
        logo: './logos/github.svg',
        action: { type: 'connection', dialog: 'GitHubDialog' },
        actionLabel: '连接仓库',
      },
      {
        type: 'supabase',
        enable: true,
        label: 'Supabase',
        description: '基于 PostgreSQL 的云端数据库',
        color: '#687682',
        logo: './logos/supabase.svg',
        action: { type: 'connection', dialog: 'SupabaseDialog' },
        actionLabel: '配置连接',
      },
      {
        type: 'feishu-bitable',
        enable: true,
        label: '飞书多维表格',
        description: '飞书中的协作表格与业务数据',
        color: '#687682',
        logo: './logos/feishu-bitable.svg',
        action: { type: 'connection', dialog: 'FeishuBitableDialog' },
        actionLabel: '配置连接',
      },
    ],
  },
] as const;

export type DatasetSource = (typeof DATA_SOURCE_GROUPS)[number]['sources'][number];

export type DatasetSourceAction = DatasetSource['action'];

export type LocalFileFormat = Extract<DatasetSourceAction, { type: 'file' }>['format'];

const sources = DATA_SOURCE_GROUPS.flatMap<DatasetSource>((group) => group.sources);

export const FILE_SOURCES = sources.filter(
  (source): source is Extract<DatasetSource, { action: { type: 'file' } }> =>
    source.enable && source.action.type === 'file',
);

export function findDatasetSource(type: string): DatasetSource | undefined {
  return sources.find((source) => source.type === (type === 'json' ? 'json-file' : type));
}
