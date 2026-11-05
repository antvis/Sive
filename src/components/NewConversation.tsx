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
        新建会话
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
              style={{ width: '100%' }}
              autoFocus
              aria-label="搜索会话数据源"
              placeholder="搜索数据源"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="conversation-source-list">
              {filtered.map((dataset) => {
                const SourceIcon = DATA_SOURCE_ICONS[dataset.format];
                return (
                  <button
                    type="button"
                    key={dataset.id}
                    disabled={disabled}
                    onClick={() => {
                      onNew(dataset);
                      setOpen(false);
                    }}
                  >
                    <SourceIcon
                      className="ui-icon data-source-icon"
                      data-source={dataset.format}
                      size={20}
                      weight="duotone"
                      aria-hidden="true"
                    />
                    <span title={dataset.name}>{dataset.name}</span>
                    <small>{dataset.format === 'mysql' ? 'MySQL' : dataset.format.toUpperCase()}</small>
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
