import { useState } from 'react';
import { DatabaseIcon, TableIcon, PlusIcon } from '@phosphor-icons/react';
import type { Dataset } from '../../shared/contracts';
import { Button, SearchInput } from './ui';

export default function DatasetPicker({
  datasets,
  onSelect,
  onAdd,
}: {
  datasets: Dataset[];
  onSelect: (dataset: Dataset) => void;
  onAdd: () => void;
}) {
  const [search, setSearch] = useState('');
  const keyword = search.trim().toLocaleLowerCase();
  const filtered = datasets.filter((dataset) =>
    [dataset.name, dataset.format, dataset.connection?.database || ''].some((value) =>
      value.toLocaleLowerCase().includes(keyword),
    ),
  );
  return (
    <section className="dataset-picker" aria-label="选择要浏览的数据">
      <aside className="dataset-picker-sidebar" aria-label="数据源列表">
        <div className="dataset-picker-search">
          <SearchInput
            aria-label="搜索可选数据"
            placeholder="搜索数据源…"
            value={search}
            allowClear
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button
            variant="ghost"
            icon={<PlusIcon />}
            aria-label="新增数据"
            title="新增数据"
            onClick={onAdd}
          />
        </div>
        <div className="dataset-picker-list">
          {filtered.map((dataset) => (
            <button
              type="button"
              key={dataset.id}
              className="dataset-picker-item"
              title={dataset.name + (dataset.connection ? ' · ' + dataset.connection.database : '')}
              onClick={() => onSelect(dataset)}
            >
              {dataset.connection ? <DatabaseIcon aria-hidden /> : <TableIcon aria-hidden />}
              <span className="dataset-picker-name">{dataset.name}</span>
              <small>{dataset.connection?.database || dataset.format.toUpperCase()}</small>
            </button>
          ))}
          {!filtered.length && (
            <p className="dataset-picker-no-results">
              {datasets.length ? '没有匹配的数据源' : '暂无数据源'}
              {datasets.length > 0 && (
                <Button variant="link" size="small" onClick={() => setSearch('')}>
                  清除搜索
                </Button>
              )}
            </p>
          )}
        </div>
        <div className="dataset-picker-count" role="status">
          {keyword ? filtered.length + ' / ' + datasets.length : datasets.length} 个数据源
        </div>
      </aside>
      <div className="dataset-picker-welcome">
        <span className="dataset-picker-symbol" aria-hidden>
          <DatabaseIcon />
        </span>
        <h3>{datasets.length ? '选择一个数据源' : '还没有可浏览的数据'}</h3>
        <p>
          {datasets.length
            ? '从左侧选择数据源，查看数据、字段结构和业务口径。'
            : '导入本地文件或连接 MySQL，开始浏览和分析。'}
        </p>
        {!datasets.length && <Button onClick={onAdd}>新增数据</Button>}
      </div>
    </section>
  );
}
