import type { MessageKey } from './i18n';

type DatasetSourceDefinition = {
  type: string;
  enable: boolean;
  labelKey: MessageKey;
  descriptionKey: MessageKey;
  color: string;
  logo: string;
  actionLabelKey: MessageKey;
  action:
    | { type: 'file'; format: string; extensions: readonly string[] }
    | { type: 'connection' | 'import'; dialog: string };
};

export const DATA_SOURCE_GROUPS = [
  {
    titleKey: 'datasets.groups.files',
    icon: 'Files',
    sources: [
      {
        type: 'csv-file',
        enable: true,
        labelKey: 'datasets.sources.csv.label',
        descriptionKey: 'datasets.sources.csv.description',
        color: '#25804d',
        logo: './logos/csv.svg',
        action: { type: 'file', format: 'csv', extensions: ['csv'] },
        actionLabelKey: 'datasets.actions.chooseFile',
      },
      {
        type: 'json-file',
        enable: true,
        labelKey: 'datasets.sources.json.label',
        descriptionKey: 'datasets.sources.json.description',
        color: '#8054b6',
        logo: './logos/json.svg',
        action: { type: 'file', format: 'json', extensions: ['json'] },
        actionLabelKey: 'datasets.actions.chooseFile',
      },
      {
        type: 'excel',
        enable: true,
        labelKey: 'datasets.sources.excel.label',
        descriptionKey: 'datasets.sources.excel.description',
        color: '#18734b',
        logo: './logos/excel.svg',
        action: { type: 'file', format: 'xlsx', extensions: ['xlsx'] },
        actionLabelKey: 'datasets.actions.chooseFile',
      },
      {
        type: 'parquet',
        enable: true,
        labelKey: 'datasets.sources.parquet.label',
        descriptionKey: 'datasets.sources.parquet.description',
        color: '#a66a1c',
        logo: './logos/parquet.svg',
        action: { type: 'file', format: 'parquet', extensions: ['parquet'] },
        actionLabelKey: 'datasets.actions.chooseFile',
      },
      {
        type: 'text',
        enable: true,
        labelKey: 'datasets.sources.text.label',
        descriptionKey: 'datasets.sources.text.description',
        color: '#687682',
        logo: './logos/text.svg',
        action: { type: 'import', dialog: 'TextImportDialog' },
        actionLabelKey: 'datasets.textImport.extract',
      },
    ],
  },
  {
    titleKey: 'datasets.groups.databases',
    icon: 'Database',
    sources: [
      {
        type: 'mysql',
        enable: true,
        labelKey: 'datasets.sources.mysql.label',
        descriptionKey: 'datasets.sources.mysql.description',
        color: '#28769a',
        logo: './logos/mysql.svg',
        action: { type: 'connection', dialog: 'MySQLDialog' },
        actionLabelKey: 'datasets.actions.configureConnection',
      },
      {
        type: 'postgresql',
        enable: true,
        labelKey: 'datasets.sources.postgresql.label',
        descriptionKey: 'datasets.sources.postgresql.description',
        color: '#336791',
        logo: './logos/postgresql.svg',
        action: { type: 'connection', dialog: 'PostgreSQLDialog' },
        actionLabelKey: 'datasets.actions.configureConnection',
      },
      {
        type: 'sqlite',
        enable: true,
        labelKey: 'datasets.sources.sqlite.label',
        descriptionKey: 'datasets.sources.sqlite.description',
        color: '#28769a',
        logo: './logos/sqlite.svg',
        action: { type: 'file', format: 'sqlite', extensions: ['sqlite', 'sqlite3', 'db'] },
        actionLabelKey: 'datasets.actions.chooseFile',
      },
      {
        type: 'mongodb',
        enable: true,
        labelKey: 'datasets.sources.mongodb.label',
        descriptionKey: 'datasets.sources.mongodb.description',
        color: '#25804d',
        logo: './logos/mongodb.svg',
        action: { type: 'connection', dialog: 'MongoDBDialog' },
        actionLabelKey: 'datasets.actions.configureConnection',
      },
      {
        type: 'clickhouse',
        enable: true,
        labelKey: 'datasets.sources.clickhouse.label',
        descriptionKey: 'datasets.sources.clickhouse.description',
        color: '#687682',
        logo: './logos/clickhouse.svg',
        action: { type: 'connection', dialog: 'ClickHouseDialog' },
        actionLabelKey: 'datasets.actions.configureConnection',
      },
    ],
  },
  {
    titleKey: 'datasets.groups.saas',
    icon: 'Stack',
    sources: [
      {
        type: 'github',
        enable: true,
        labelKey: 'datasets.sources.github.label',
        descriptionKey: 'datasets.sources.github.description',
        color: '#687682',
        logo: './logos/github.svg',
        action: { type: 'connection', dialog: 'GitHubDialog' },
        actionLabelKey: 'datasets.actions.connectRepository',
      },
      {
        type: 'supabase',
        enable: true,
        labelKey: 'datasets.sources.supabase.label',
        descriptionKey: 'datasets.sources.supabase.description',
        color: '#687682',
        logo: './logos/supabase.svg',
        action: { type: 'connection', dialog: 'SupabaseDialog' },
        actionLabelKey: 'datasets.actions.configureConnection',
      },
      {
        type: 'feishu-bitable',
        enable: true,
        labelKey: 'datasets.sources.feishu.label',
        descriptionKey: 'datasets.sources.feishu.description',
        color: '#687682',
        logo: './logos/feishu-bitable.svg',
        action: { type: 'connection', dialog: 'FeishuBitableDialog' },
        actionLabelKey: 'datasets.actions.configureConnection',
      },
    ],
  },
] as const satisfies readonly {
  titleKey: MessageKey;
  icon: 'Files' | 'Database' | 'Stack';
  sources: readonly DatasetSourceDefinition[];
}[];

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
