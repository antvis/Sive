import { ChevronRightIcon } from 'lucide-react';
import { useState } from 'react';
import { DataSourceLogo } from '../../components/DataSourceLogo';
import { useImportLocal } from '../../hooks/useImportLocal';
import { DATA_SOURCE_GROUPS } from '@shared/dataSource';
import type { DatasetSource, DatasetSourceAction } from '@shared/dataSource';
import * as dialogs from './datasetDialogs';

const groupIllustrations = {
  Database: './illustrations/source-databases-ceramic.png',
  Files: './illustrations/source-files-ceramic.png',
  Stack: './illustrations/source-saas-ceramic.png',
};

function SourceOption({
  source,
  status,
  disabled,
  onSelect,
}: {
  source: DatasetSource;
  status?: string;
  disabled: boolean;
  onSelect: () => void;
}) {
  const { label, description, actionLabel } = source;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-label={`${label}：${description}。${status ?? actionLabel}`}
      className="group flex min-h-16 w-full min-w-0 items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-foreground transition-colors enabled:hover:bg-selected disabled:opacity-55"
    >
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface">
        <DataSourceLogo type={source.type} size={22} />
      </span>
      <span aria-hidden className="grid min-w-0 flex-1 gap-1">
        <strong className="text-base leading-tight font-semibold wrap-anywhere">{label}</strong>
        <small className="text-sm leading-snug text-muted-foreground wrap-anywhere">
          {status ?? description}
        </small>
      </span>
      <ChevronRightIcon size={15} className="shrink-0 text-muted-foreground group-hover:text-ink" aria-hidden />
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
      <div
        data-source-picker
        className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] items-start gap-6"
        aria-busy={importing}
      >
        {DATA_SOURCE_GROUPS.map(({ title, icon, sources }) => (
          <section
            key={icon}
            aria-label={title}
            className="min-w-0 rounded-3xl bg-page px-4 pt-3 pb-4 shadow-card transition-[box-shadow,translate] hover:shadow-card-raised motion-safe:hover:-translate-y-0.5"
          >
            <div className="relative isolate flex h-32 items-end overflow-hidden rounded-2xl bg-surface px-3.5 pb-3.5">
              <img
                src={groupIllustrations[icon]}
                alt=""
                decoding="async"
                className="pointer-events-none absolute end-2 top-1/2 -z-10 h-32 w-[48%] -translate-y-1/2 object-contain object-right"
              />
              <h2 className="relative max-w-[48%] text-xl leading-tight font-semibold tracking-tight text-foreground wrap-anywhere">
                {title}
              </h2>
            </div>
            <ul className="mt-3 grid gap-1.5">
              {sources.map((source) => (
                <li key={source.type} className="min-w-0">
                  <SourceOption
                    source={source}
                    status={!source.enable ? '待接入' : importingType === source.type ? '正在导入…' : undefined}
                    disabled={!source.enable || importing}
                    onSelect={() => void selectSource(source)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {Dialog && <Dialog onClose={() => setConnection(null)} />}
    </>
  );
}
