import type { CSSProperties } from 'react';
import { ArrowRightIcon } from '@phosphor-icons/react';
import type { LocalDataset } from '../../shared/contracts';
import { DATA_SOURCE_GROUPS } from '../constants';

export type DataSourcePickerProps = {
  importing: boolean;
  disabled: boolean;
  onImport: (format: LocalDataset['format']) => void;
  onConnect: () => void;
};
export default function DataSourcePicker({
  importing,
  disabled,
  onImport,
  onConnect,
}: DataSourcePickerProps) {
  return (
    <div className="grid max-w-280 gap-8 my-8 mx-0 max-[481px]:gap-6" aria-busy={importing || undefined}>
      {DATA_SOURCE_GROUPS.map(({ name, icon: GroupIcon, sources }) => (
        <section key={name} aria-label={name}>
          <h3 className="flex items-center gap-2 mt-0 mr-0 mb-3.5 ml-0 text-title font-normal tracking-[0.01em]">
            <GroupIcon size={18} className="text-muted" aria-hidden="true" />
            {name}
          </h3>
          <div className="grid grid-cols-[repeat(auto-fill,_min(200px,_100%))] gap-4">
            {sources.map(({ name: label, description, icon: SourceIcon, color, format }) => {
              const available = !!format;
              const action = !available
                ? '即将支持'
                : disabled || importing
                  ? '请稍候'
                  : format === 'mysql'
                    ? '开始连接'
                    : '选择文件';
              return (
                <button
                  key={label}
                  type="button"
                  className="group/source relative grid min-w-0 w-full h-28 py-3 px-4 border border-[color-mix(in_srgb,_var(--border)_80%,_var(--surface))] rounded-source bg-surface text-ink shadow-[0_2px_4px] shadow-ink/3 [transition:border-color_160ms_ease,_background_160ms_ease,_box-shadow_160ms_ease] [&:hover:not(:disabled)]:border-source-line [&:hover:not(:disabled)]:bg-source-hover [&:hover:not(:disabled)]:shadow-[0_4px_12px] [&:hover:not(:disabled)]:shadow-source/9 focus-visible:border-source-line focus-visible:bg-source-hover focus-visible:shadow-[0_4px_12px] focus-visible:shadow-source/9 focus-visible:outline-source data-[available=false]:border-[color-mix(in_srgb,_var(--border)_55%,_var(--surface))] data-[available=false]:text-muted data-[available=false]:shadow-none [&[data-available=true]:disabled]:opacity-55"
                  style={{ '--source-color': color } as CSSProperties}
                  data-available={available}
                  aria-label={`${label}：${description}。${action}`}
                  disabled={!available || disabled || importing}
                  onClick={() => (format === 'mysql' ? onConnect() : format && onImport(format))}
                >
                  <span
                    className="group-hover/source:invisible group-focus-visible/source:invisible [grid-area:1_/_1] flex flex-col items-center justify-center gap-1 min-w-0"
                    aria-hidden="true"
                  >
                    {!available && (
                      <span className="absolute top-1.5 right-2 py-0.5 px-1.5 border border-line/60 rounded-compact text-tiny text-muted bg-surface">
                        即将支持
                      </span>
                    )}
                    <span className="grid place-items-center size-9 shrink-0 rounded-card text-source bg-source-soft">
                      <SourceIcon size={20} weight="duotone" />
                    </span>
                    <strong className="text-body font-normal wrap-anywhere leading-[1.5]">{label}</strong>
                  </span>
                  <span
                    className="group-hover/source:visible group-focus-visible/source:visible [grid-area:1_/_1] flex flex-col items-center justify-center gap-1 min-w-0 invisible text-center"
                    aria-hidden="true"
                  >
                    <strong className="text-body font-normal wrap-anywhere leading-[1.5]">
                      {format === 'mysql' ? 'MySQL 业务数据库' : label}
                    </strong>
                    <small className="text-helper text-muted">{description}</small>
                    <span className="group-disabled/source:text-muted inline-flex items-center gap-1 mt-0.5 text-source text-helper font-semibold">
                      {action}
                      {available && !disabled && !importing && <ArrowRightIcon size={13} />}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
