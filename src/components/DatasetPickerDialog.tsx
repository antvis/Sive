import { cx } from '../shared/cx';
import { dataSourceColors } from './ui/styles';
import { useState } from 'react';
import { PlusIcon } from '@phosphor-icons/react';
import type { Dataset } from '../../shared/contracts';
import { DATA_SOURCE_ICONS } from '../constants';
import { Button, Modal, SearchInput } from './ui';

export default function DatasetPickerDialog({
  datasets,
  disabled = false,
  onSelect,
  onClose,
  onAddData,
}: {
  datasets: Dataset[];
  disabled?: boolean;
  onSelect: (dataset: Dataset) => void;
  onClose: () => void;
  onAddData: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = datasets.filter((dataset) =>
    dataset.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  return (
    <Modal
      title="选择数据源"
      open
      onCancel={onClose}
      width={520}
      footer={
        <Button
          icon={<PlusIcon />}
          onClick={() => {
            onClose();
            onAddData();
          }}
        >
          添加数据源
        </Button>
      }
    >
      <p className="text-muted mt-0 mb-4">选择要分析的数据，开始新会话。</p>
      {datasets.length > 0 ? (
        <>
          <SearchInput
            className="w-full"
            autoFocus
            aria-label="搜索会话数据源"
            placeholder="搜索数据源"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="mt-3 max-h-80 overflow-y-auto">
            {filtered.map((dataset) => {
              const SourceIcon = DATA_SOURCE_ICONS[dataset.format];
              return (
                <button
                  className="flex items-center gap-2.5 w-full py-3 px-2 border-0 rounded-control bg-transparent text-ink text-left hover:bg-page focus-visible:bg-page"
                  type="button"
                  key={dataset.id}
                  disabled={disabled}
                  onClick={() => {
                    onSelect(dataset);
                    onClose();
                  }}
                >
                  <SourceIcon
                    className={cx(
                      'inline-block shrink-0 align-middle text-[var(--source-color)]',
                      dataSourceColors,
                    )}
                    data-source={dataset.format}
                    size={20}
                    weight="duotone"
                    aria-hidden="true"
                  />
                  <span className="flex-1 min-w-0 truncate" title={dataset.name}>
                    {dataset.name}
                  </span>
                  <small className="text-muted">
                    {dataset.format === 'mysql' ? 'MySQL' : dataset.format.toUpperCase()}
                  </small>
                </button>
              );
            })}
            {!filtered.length && <p className="text-muted">没有匹配的数据源</p>}
          </div>
        </>
      ) : (
        <p className="mt-0 mb-4 text-muted">还没有数据源，请先导入本地文件或连接 MySQL。</p>
      )}
    </Modal>
  );
}
