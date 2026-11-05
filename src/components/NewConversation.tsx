import { navigationItem } from './navigation-styles';
import ComposeIcon from './ComposeIcon';
import { useState } from 'react';
import { PlusIcon } from '@phosphor-icons/react';
import type { Dataset } from '../../shared/contracts';
import { DATA_SOURCE_ICONS } from '../constants';
import { Button, Modal, SearchInput } from './ui';

export default function NewConversation({
  datasets,
  current,
  disabled,
  onNew,
  onAddData,
}: {
  datasets: Dataset[];
  current?: Dataset;
  disabled: boolean;
  onNew: (dataset: Dataset) => void;
  onAddData: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = datasets.filter((dataset) =>
    dataset.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  return (
    <>
      <button
        className={navigationItem}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (current) onNew(current);
          else {
            setSearch('');
            setOpen(true);
          }
        }}
      >
        <ComposeIcon />
        新建分析
      </button>
      <Modal
        title="选择会话数据"
        open={open}
        onCancel={() => setOpen(false)}
        width={520}
        footer={
          <Button
            icon={<PlusIcon />}
            onClick={() => {
              setOpen(false);
              onAddData();
            }}
          >
            添加数据源
          </Button>
        }
      >
        <p className="text-muted mb-4">选择要分析的数据，开始新会话。</p>
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
            <div className="mt-3 max-h-80 overflow-y-auto [&_.data-source-icon]:w-5 [&_.data-source-icon]:h-5 [&_.data-source-icon]:shrink-0 [&_.data-source-icon]:text-[var(--source-color)]">
              {filtered.map((dataset) => {
                const SourceIcon = DATA_SOURCE_ICONS[dataset.format];
                return (
                  <button
                    className="flex items-center gap-2.5 w-full py-3 px-2 border-0 rounded-control bg-transparent text-ink text-left hover:bg-page focus-visible:bg-page"
                    type="button"
                    key={dataset.id}
                    disabled={disabled}
                    onClick={() => {
                      onNew(dataset);
                      setOpen(false);
                    }}
                  >
                    <SourceIcon
                      className="ui-icon inline-block shrink-0 align-middle data-source-icon data-[source=csv]:[--source-color:#25804d] data-[source=json]:[--source-color:#8054b6] data-[source=xlsx]:[--source-color:#18734b] data-[source=parquet]:[--source-color:#a66a1c] data-[source=mysql]:[--source-color:#28769a] dark:data-[source=csv]:[--source-color:#70cc92] dark:data-[source=json]:[--source-color:#bb96ed] dark:data-[source=xlsx]:[--source-color:#57c393] dark:data-[source=parquet]:[--source-color:#e3b36a] dark:data-[source=mysql]:[--source-color:#78bddd]"
                      data-source={dataset.format}
                      size={20}
                      weight="duotone"
                      aria-hidden="true"
                    />
                    <span
                      className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
                      title={dataset.name}
                    >
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
          <p className="text-muted">还没有数据源，请先导入本地文件或连接 MySQL。</p>
        )}
      </Modal>
    </>
  );
}
