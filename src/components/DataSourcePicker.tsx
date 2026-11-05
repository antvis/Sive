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
    <div className="data-source-picker" aria-busy={importing || undefined}>
      {DATA_SOURCE_GROUPS.map(({ name, icon: GroupIcon, sources }) => (
        <section className="data-source-group" key={name} aria-label={name}>
          <h3>
            <GroupIcon aria-hidden="true" />
            {name}
          </h3>
          <div className="data-source-grid">
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
                  className="data-source-option"
                  data-available={available}
                  data-source={format ?? (mysql ? 'mysql' : undefined)}
                  aria-label={`${label}：${description}。${action}`}
                  disabled={!available || disabled || importing}
                  onClick={() => (format ? onImport(format) : mysql && onConnect())}
                >
                  <span className="data-source-front" aria-hidden="true">
                    {!available && <span className="data-source-soon">即将支持</span>}
                    <span className="data-source-symbol">
                      <SourceIcon weight="duotone" />
                    </span>
                    <strong>{label}</strong>
                    {available && <small>{mysql ? '只读连接' : `.${format} 文件`}</small>}
                  </span>
                  <span className="data-source-details" aria-hidden="true">
                    <strong>{mysql ? 'MySQL 业务数据库' : label}</strong>
                    <small>{description}</small>
                    <span className="data-source-action">
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
