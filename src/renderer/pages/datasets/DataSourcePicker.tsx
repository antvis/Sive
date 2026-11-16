import { useState } from 'react';
import type { CSSProperties } from 'react';
import { MySQLDialog } from './datasetDialogs/MySQLDialog';
import { InlineDataDialog } from './datasetDialogs/InlineDataDialog';
import { useImportLocal } from '../../hooks/useImportLocal';
import { DATA_SOURCE_GROUPS } from '../../utils/dataSource';
import type { DatasetSource, DatasetSourceAction } from '../../utils/dataSource';

type DialogAction = Exclude<DatasetSourceAction, { kind: 'file' }>;

function SourceDialog({ action, onClose }: { action: DialogAction; onClose: () => void }) {
  switch (action.kind) {
    case 'mysql':
      return <MySQLDialog onClose={onClose} />;
    case 'inline':
      return <InlineDataDialog key={action.format} type={action.format} onClose={onClose} />;
    default:
      return action satisfies never;
  }
}

function SourceCard({
  source,
  actionLabel,
  disabled,
  onSelect,
}: {
  source: Pick<DatasetSource, 'label' | 'description' | 'color' | 'icon'>;
  actionLabel: string;
  disabled: boolean;
  onSelect: () => void;
}) {
  const { label: name, description, color, icon: SourceIcon } = source;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-label={`${name}：${description}。${actionLabel}`}
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
        <span className="mt-0.5 text-xs" style={{ color: disabled ? undefined : color }}>
          {actionLabel}
        </span>
      </span>
    </button>
  );
}

export function DataSourcePicker() {
  const { importing, importLocal } = useImportLocal();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogAction | null>(null);

  const openSource = (source: DatasetSource) => {
    if (!source.enable) return;
    const { action } = source;
    if (action.kind === 'file') {
      setSelectedFile(source.type);
      void importLocal(action.format);
    } else {
      setDialog(action);
    }
  };

  return (
    <div aria-busy={importing}>
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
                  actionLabel={
                    !source.enable
                      ? '待接入'
                      : importing && selectedFile === source.type
                        ? '正在导入…'
                        : source.actionLabel
                  }
                  disabled={!source.enable || importing}
                  onSelect={() => openSource(source)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
      {dialog && <SourceDialog action={dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}
