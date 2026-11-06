import { cx } from '../shared/cx';
import { dataSourceColors } from './ui/styles';
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
          <h3 className="flex items-center gap-[9px] mt-0 mr-0 mb-3.5 ml-0 text-subtitle font-normal tracking-[0.01em]">
            <GroupIcon size={18} className="text-muted" aria-hidden="true" />
            {name}
          </h3>
          <div className="grid grid-cols-[repeat(auto-fill,_min(200px,_100%))] gap-4">
            {sources.map(({ name: label, description, icon: SourceIcon, format, mysql }) => {
              const available = !!format || !!mysql;
              const action = !available
                ? '即将支持'
                : disabled || importing
                  ? '请稍候'
                  : mysql
                    ? '开始连接'
                    : '选择文件';
              return (
                <button
                  key={label}
                  type="button"
                  className={cx(
                    'group/source [--source-color:var(--accent-text)] relative grid min-w-0 w-full h-28 py-3 px-4 border border-[color-mix(in_srgb,_var(--border)_80%,_var(--surface))] rounded-source bg-surface text-ink shadow-[0_2px_4px_color-mix(in_srgb,_var(--text)_3%,_transparent)] [transition:border-color_160ms_ease,_background_160ms_ease,_box-shadow_160ms_ease] [&:hover:not(:disabled)]:border-[color-mix(in_srgb,_var(--source-color)_48%,_var(--border))] [&:hover:not(:disabled)]:bg-[color-mix(in_srgb,_var(--source-color)_4%,_var(--surface))] [&:hover:not(:disabled)]:shadow-[0_4px_12px_color-mix(in_srgb,_var(--source-color)_9%,_transparent)] focus-visible:border-[color-mix(in_srgb,_var(--source-color)_48%,_var(--border))] focus-visible:bg-[color-mix(in_srgb,_var(--source-color)_4%,_var(--surface))] focus-visible:shadow-[0_4px_12px_color-mix(in_srgb,_var(--source-color)_9%,_transparent)] focus-visible:outline-[var(--source-color)] data-[available=false]:border-[color-mix(in_srgb,_var(--border)_55%,_var(--surface))] data-[available=false]:text-muted data-[available=false]:shadow-none [&[data-available=true]:disabled]:opacity-55',
                    dataSourceColors,
                  )}
                  data-available={available}
                  data-source={format ?? (mysql ? 'mysql' : undefined)}
                  aria-label={`${label}：${description}。${action}`}
                  disabled={!available || disabled || importing}
                  onClick={() => (format ? onImport(format) : mysql && onConnect())}
                >
                  <span
                    className="group-hover/source:invisible group-focus-visible/source:invisible [grid-area:1_/_1] flex flex-col items-center justify-center gap-1 min-w-0"
                    aria-hidden="true"
                  >
                    {!available && (
                      <span className="absolute top-1.5 right-2 py-0.5 px-1.5 border border-[color-mix(in_srgb,_var(--border)_60%,_transparent)] rounded-compact text-tiny text-muted bg-surface">
                        即将支持
                      </span>
                    )}
                    <span className="group-data-[available=false]/source:text-muted group-data-[available=false]/source:border-[color-mix(in_srgb,_var(--border)_65%,_var(--surface))] grid place-items-center size-8 shrink-0 rounded-card border border-[color-mix(in_srgb,_var(--source-color)_12%,_var(--surface))] [background:linear-gradient(_145deg,_color-mix(in_srgb,_var(--source-color)_6%,_var(--surface)),_color-mix(in_srgb,_var(--source-color)_13%,_var(--surface))_)] text-[var(--source-color)]">
                      <SourceIcon size={22} weight="duotone" />
                    </span>
                    <strong className="text-label font-normal wrap-anywhere leading-[1.5]">{label}</strong>
                  </span>
                  <span
                    className="group-hover/source:visible group-focus-visible/source:visible [grid-area:1_/_1] flex flex-col items-center justify-center gap-1 min-w-0 invisible text-center"
                    aria-hidden="true"
                  >
                    <strong className="text-label font-normal wrap-anywhere leading-[1.5]">
                      {mysql ? 'MySQL 业务数据库' : label}
                    </strong>
                    <small className="text-helper text-muted">{description}</small>
                    <span className="group-disabled/source:text-muted inline-flex items-center gap-[5px] mt-0.5 text-[var(--source-color)] text-helper font-semibold">
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
