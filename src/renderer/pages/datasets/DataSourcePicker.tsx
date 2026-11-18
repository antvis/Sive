import { Database, Files, Stack } from '@phosphor-icons/react';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { DataSourceLogo } from '../../components/DataSourceLogo';
import { useImportLocal } from '../../hooks/useImportLocal';
import { DATA_SOURCE_GROUPS } from '@shared/dataSource';
import type { DatasetSource, DatasetSourceAction } from '@shared/dataSource';
import * as dialogs from './datasetDialogs';

const groupIcons = { Database, Files, Stack };

function SourceCard({
  source,
  actionLabel,
  disabled,
  onSelect,
}: {
  source: Pick<DatasetSource, 'type' | 'label' | 'description' | 'color'>;
  actionLabel: string;
  disabled: boolean;
  onSelect: () => void;
}) {
  const { label: name, description, color } = source;
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
          style={{ backgroundColor: `${color}14` }}
        >
          <DataSourceLogo type={source.type} size={24} />
        </span>
        <strong className="text-sm leading-6 font-normal wrap-anywhere">{name}</strong>
      </span>
      <span
        aria-hidden
        className="invisible [grid-area:1/1] flex flex-col items-center justify-center gap-1 text-center group-hover:visible group-focus-visible:visible"
      >
        <strong className="text-sm leading-6 font-normal wrap-anywhere">{name}</strong>
        <small className="text-xs text-muted">{description}</small>
        <span className="mt-0.5 text-xs" style={{ color }}>
          {actionLabel}
        </span>
      </span>
    </button>
  );
}

export function DataSourcePicker() {
  const { importing, importLocal } = useImportLocal();
  const [connection, setConnection] = useState<Extract<
    DatasetSourceAction,
    { type: 'connection' | 'import' }
  > | null>(null);
  const [importingType, setImportingType] = useState<string | null>(null);
  const Dialog = connection ? dialogs[connection.dialog] : undefined;

  const selectSource = async (source: DatasetSource) => {
    if (!source.enable || importing) return;
    const { action } = source;
    switch (action.type) {
      case 'connection':
      case 'import':
        setConnection(action);
        return;
      case 'file':
        setImportingType(source.type);
        try {
          await importLocal(action.format);
        } finally {
          setImportingType(null);
        }
        return;
      default:
        action satisfies never;
    }
  };

  return (
    <>
      <div className="my-8 grid gap-8" aria-busy={importing}>
        {DATA_SOURCE_GROUPS.map(({ title, icon, sources }) => {
          const GroupIcon = groupIcons[icon];
          return (
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
                    disabled={!source.enable || importing}
                    actionLabel={
                      !source.enable
                        ? '待接入'
                        : importingType === source.type
                          ? '正在导入…'
                          : source.actionLabel
                    }
                    onSelect={() => void selectSource(source)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
      {Dialog && <Dialog onClose={() => setConnection(null)} />}
    </>
  );
}
