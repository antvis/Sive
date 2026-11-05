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
        <section
          className="[&_h3_svg]:w-4.5 [&_h3_svg]:h-4.5 [&_h3_svg]:text-muted"
          key={name}
          aria-label={name}
        >
          <h3 className="flex items-center gap-[9px] mt-0 mr-0 mb-3.5 ml-0 text-subtitle font-normal tracking-[0.01em]">
            <GroupIcon aria-hidden="true" />
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
                  className="[--source-color:var(--accent-text)] relative grid min-w-0 w-full h-28 py-3 px-4 border border-[color-mix(in_srgb,_var(--border)_80%,_var(--surface))] rounded-source bg-surface text-ink shadow-[0_2px_4px_color-mix(in_srgb,_var(--text)_3%,_transparent)] [transition:border-color_160ms_ease,_background_160ms_ease,_box-shadow_160ms_ease] data-[source=csv]:[--source-color:#25804d] data-[source=json]:[--source-color:#8054b6] data-[source=xlsx]:[--source-color:#18734b] data-[source=parquet]:[--source-color:#a66a1c] data-[source=mysql]:[--source-color:#28769a] dark:data-[source=csv]:[--source-color:#70cc92] dark:data-[source=json]:[--source-color:#bb96ed] dark:data-[source=xlsx]:[--source-color:#57c393] dark:data-[source=parquet]:[--source-color:#e3b36a] dark:data-[source=mysql]:[--source-color:#78bddd] [&:hover:not(:disabled)]:border-[color-mix(in_srgb,_var(--source-color)_48%,_var(--border))] [&:hover:not(:disabled)]:bg-[color-mix(in_srgb,_var(--source-color)_4%,_var(--surface))] [&:hover:not(:disabled)]:shadow-[0_4px_12px_color-mix(in_srgb,_var(--source-color)_9%,_transparent)] focus-visible:border-[color-mix(in_srgb,_var(--source-color)_48%,_var(--border))] focus-visible:bg-[color-mix(in_srgb,_var(--source-color)_4%,_var(--surface))] focus-visible:shadow-[0_4px_12px_color-mix(in_srgb,_var(--source-color)_9%,_transparent)] focus-visible:outline-[var(--source-color)] [&:hover_.data-source-front]:invisible [&:focus-visible_.data-source-front]:invisible [&:hover_.data-source-details]:visible [&:focus-visible_.data-source-details]:visible [&:disabled_.data-source-action]:text-muted data-[available=false]:border-[color-mix(in_srgb,_var(--border)_55%,_var(--surface))] data-[available=false]:bg-[color-mix(in_srgb,_var(--surface)_60%,_var(--background))] data-[available=false]:text-muted data-[available=false]:shadow-none [&[data-available='false']_.data-source-symbol]:text-muted [&[data-available='false']_.data-source-symbol]:bg-surface [&[data-available='false']_.data-source-symbol]:border-[color-mix(in_srgb,_var(--border)_65%,_var(--surface))] [&[data-available='true']:disabled]:opacity-55 motion-reduce:transition-none"
                  data-available={available}
                  data-source={format ?? (mysql ? 'mysql' : undefined)}
                  aria-label={`${label}：${description}。${action}`}
                  disabled={!available || disabled || importing}
                  onClick={() => (format ? onImport(format) : mysql && onConnect())}
                >
                  <span
                    className="data-source-front [grid-area:1_/_1] flex flex-col items-center justify-center gap-1 min-w-0"
                    aria-hidden="true"
                  >
                    {!available && (
                      <span className="absolute top-1.5 right-2 py-0.5 px-1.5 border border-[color-mix(in_srgb,_var(--border)_60%,_transparent)] rounded-[4px] text-tiny text-muted bg-surface">
                        即将支持
                      </span>
                    )}
                    <span className="data-source-symbol grid place-items-center w-8 h-8 shrink-0 rounded-card border border-[color-mix(in_srgb,_var(--source-color)_12%,_var(--surface))] [background:linear-gradient(_145deg,_color-mix(in_srgb,_var(--source-color)_6%,_var(--surface)),_color-mix(in_srgb,_var(--source-color)_13%,_var(--surface))_)] text-[var(--source-color)] [&_svg]:w-5.5 [&_svg]:h-5.5">
                      <SourceIcon weight="duotone" />
                    </span>
                    <strong className="text-label font-normal wrap-anywhere leading-[1.5]">{label}</strong>
                  </span>
                  <span
                    className="data-source-details [grid-area:1_/_1] flex flex-col items-center justify-center gap-1 min-w-0 invisible text-center"
                    aria-hidden="true"
                  >
                    <strong className="text-label font-normal wrap-anywhere leading-[1.5]">
                      {mysql ? 'MySQL 业务数据库' : label}
                    </strong>
                    <small className="text-helper text-muted">{description}</small>
                    <span className="data-source-action inline-flex items-center gap-[5px] mt-0.5 text-[var(--source-color)] text-helper font-semibold [&_svg]:w-[13px] [&_svg]:h-[13px]">
                      {action}
                      {available && !disabled && !importing && <ArrowRightIcon />}
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
