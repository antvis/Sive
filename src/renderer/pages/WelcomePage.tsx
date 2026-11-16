import { useState } from 'react';
import type { CSSProperties } from 'react';
import { MySQLDialog } from './datasets/datasetDialogs/MySQLDialog';
import { useImportLocal } from '../hooks/useImportLocal';
import { DATA_SOURCE_GROUPS } from '../utils/dataSource';
import type { DatasetSource } from '../utils/dataSource';

function SourceCard({
  source,
  importing,
  onImport,
}: {
  source: DatasetSource;
  importing: boolean;
  onImport: () => void;
}) {
  const { type, label: name, description, color, icon: SourceIcon, format } = source;
  const action = type === 'mysql' ? '配置连接' : !format ? '待接入' : importing ? '正在导入…' : '选择文件';
  return (
    <button
      type="button"
      disabled={(!format && type !== 'mysql') || importing}
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
        <span className="mt-0.5 text-xs" style={{ color: format || type === 'mysql' ? color : undefined }}>
          {action}
        </span>
      </span>
    </button>
  );
}

export function WelcomePage() {
  const { importing, importLocal } = useImportLocal();
  const [connectingMySQL, setConnectingMySQL] = useState(false);

  return (
    <div className="mx-auto max-w-266 px-6 pt-8 pb-12" aria-busy={importing}>
      <header>
        <h1 className="m-0 text-[26px] leading-[1.35] font-semibold tracking-[-0.03em]">欢迎使用 Sive</h1>
        <p className="mt-3 mb-0 max-w-150 leading-[1.7] text-muted">
          选择下方的数据源，导入或连接后，即可提问并查看分析结果。
        </p>
      </header>
      <div className="my-8 grid gap-8">
        {DATA_SOURCE_GROUPS.map(({ title, icon: GroupIcon, sources }) => (
          <section key={title} aria-label={title}>
            <h2 className="mt-0 mr-0 mb-3.5 ml-0 flex items-center gap-2 text-base font-normal tracking-[0.01em]">
              <GroupIcon size={18} className="text-muted" aria-hidden />
              {title}
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,min(200px,100%))] gap-4">
              {sources.map((source) => (
                <SourceCard
                  key={source.type}
                  source={source}
                  importing={importing}
                  onImport={() =>
                    source.type === 'mysql' ? setConnectingMySQL(true) : void importLocal(source.format)
                  }
                />
              ))}
            </div>
          </section>
        ))}
      </div>
      {connectingMySQL && <MySQLDialog onClose={() => setConnectingMySQL(false)} />}
    </div>
  );
}
