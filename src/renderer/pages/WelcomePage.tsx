import { Database, FileCode, FileCsv, FileText, Files, Lightning, Stack, Table } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useImportLocal } from '../hooks/useImportLocal';
import type { LocalFileFormat } from '@shared/api';
import { getSourceEditor } from '../components/sourceEditors';

type Source = {
  name: string;
  description: string;
  color: string;
  icon: Icon;
  format?: LocalFileFormat;
  connection?: string;
};

const groups: { title: string; icon: Icon; sources: Source[] }[] = [
  {
    title: '文件与文本',
    icon: Files,
    sources: [
      { name: 'CSV 文件', description: '本地 CSV 文件', color: '#25804d', icon: FileCsv, format: 'csv' },
      { name: 'JSON 文件', description: '本地 JSON 文件', color: '#8054b6', icon: FileCode, format: 'json' },
      {
        name: 'Excel',
        description: '支持多个工作表的 XLSX 文件',
        color: '#18734b',
        icon: Table,
        format: 'xlsx',
      },
      {
        name: 'Parquet',
        description: '面向分析的列式数据文件',
        color: '#a66a1c',
        icon: Stack,
        format: 'parquet',
      },
      { name: 'CSV 内容', description: '直接提供 CSV 文本内容', color: '#25804d', icon: FileCsv },
      { name: 'JSON 数据', description: '直接提供结构化 JSON 数据', color: '#8054b6', icon: FileCode },
      { name: '文本', description: '通过模型从文本中提取结构化数据', color: '#687682', icon: FileText },
    ],
  },
  {
    title: '数据库',
    icon: Database,
    sources: [
      {
        name: 'MySQL',
        description: '连接数据库并浏览数据表',
        color: '#28769a',
        icon: Database,
        connection: 'mysql',
      },
      { name: 'PostgreSQL', description: '开源对象关系型数据库', color: '#687682', icon: Database },
      { name: 'SQLite', description: '轻量级本地文件数据库', color: '#687682', icon: Database },
      { name: 'MongoDB', description: '面向文档的 NoSQL 数据库', color: '#687682', icon: Stack },
      { name: 'ClickHouse', description: '面向实时分析的列式数据库', color: '#687682', icon: Database },
    ],
  },
  {
    title: 'SaaS 应用',
    icon: Stack,
    sources: [
      { name: 'Supabase', description: '基于 PostgreSQL 的云端数据库', color: '#687682', icon: Lightning },
      { name: '飞书多维表格', description: '飞书中的协作表格与业务数据', color: '#687682', icon: Table },
    ],
  },
];

function SourceCard({
  source,
  importing,
  onImport,
}: {
  source: Source;
  importing: boolean;
  onImport: () => void;
}) {
  const { name, description, color, icon: SourceIcon, format, connection } = source;
  const canConnect = Boolean(connection && getSourceEditor(connection));
  const action = canConnect ? '配置连接' : !format ? '待接入' : importing ? '正在导入…' : '选择文件';
  return (
    <button
      type="button"
      disabled={(!format && !canConnect) || importing}
      onClick={onImport}
      aria-label={`${name}：${description}。${action}`}
      className="group relative grid h-28 w-full min-w-0 rounded-[14px] border bg-surface px-4 py-3 text-left text-ink shadow-[0_2px_4px] shadow-ink/3 transition-[border-color,box-shadow] hover:border-[var(--source-color)] hover:shadow-[0_4px_12px] focus-visible:border-[var(--source-color)] focus-visible:outline-none disabled:opacity-60"
      style={{ '--source-color': color } as CSSProperties}
    >
      <span
        aria-hidden
        className="[grid-area:1/1] flex flex-col items-center justify-center gap-1 group-hover:invisible group-focus-visible:invisible"
      >
        <span
          className="grid size-9 shrink-0 place-items-center rounded-[10px]"
          style={{ color, backgroundColor: `${color}14` }}
        >
          <SourceIcon size={20} weight="duotone" />
        </span>
        <strong className="text-sm leading-6 font-normal wrap-anywhere">{name}</strong>
      </span>
      <span
        aria-hidden
        className="invisible [grid-area:1/1] flex flex-col items-center justify-center gap-1 text-center group-hover:visible group-focus-visible:visible"
      >
        <strong className="text-sm leading-6 font-normal wrap-anywhere">{name}</strong>
        <small className="text-xs text-muted">{description}</small>
        <span className="mt-0.5 text-xs" style={{ color: format || canConnect ? color : undefined }}>
          {action}
        </span>
      </span>
    </button>
  );
}

export function WelcomePage() {
  const { importing, importLocal } = useImportLocal();
  const [connectionType, setConnectionType] = useState('');
  const Editor = getSourceEditor(connectionType);

  return (
    <div className="mx-auto max-w-266 px-6 pt-8 pb-12" aria-busy={importing}>
      <header>
        <h1 className="m-0 text-[26px] leading-[1.35] font-semibold tracking-[-0.03em]">欢迎使用 Sive</h1>
        <p className="mt-3 mb-0 max-w-150 leading-[1.7] text-muted">
          选择下方的数据源，导入或连接后，即可提问并查看分析结果。
        </p>
      </header>
      <div className="my-8 grid gap-8">
        {groups.map(({ title, icon: GroupIcon, sources }) => (
          <section key={title} aria-label={title}>
            <h2 className="mt-0 mr-0 mb-3.5 ml-0 flex items-center gap-2 text-base font-normal tracking-[0.01em]">
              <GroupIcon size={18} className="text-muted" aria-hidden />
              {title}
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,min(200px,100%))] gap-4">
              {sources.map((source) => (
                <SourceCard
                  key={source.name}
                  source={source}
                  importing={importing}
                  onImport={() =>
                    source.connection ? setConnectionType(source.connection) : void importLocal(source.format)
                  }
                />
              ))}
            </div>
          </section>
        ))}
      </div>
      {Editor && <Editor onClose={() => setConnectionType('')} />}
    </div>
  );
}
