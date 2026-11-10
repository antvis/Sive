import { cx } from '@renderer/utils/cx';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tableDetailsQuery } from '@renderer/data/queries';
import { Button, Empty, Input, Modal, Spin } from '@renderer/components/ui/index';
import { useUI } from '@renderer/hooks/useUI';
import {
  MagnifyingGlassIcon,
  ArrowClockwiseIcon,
  CaretRightIcon,
  CaretDownIcon,
  TableIcon,
  KeyIcon,
  HashIcon,
  TextTIcon,
  CalendarBlankIcon,
  ListIcon,
  CodeIcon,
} from '@phosphor-icons/react';
import type { Dataset } from '@shared/contracts';

export default function TableNavigator({
  dataset,
  selected,
  onSelect,
  refreshing,
  onRefresh,
}: {
  dataset: Dataset;
  selected: string;
  onSelect: (table: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { message } = useUI();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(selected || null);
  const query = useQuery(tableDetailsQuery(dataset, expanded));
  const [definition, setDefinition] = useState<{ table: string; ddl: string } | null>(null);
  useEffect(() => {
    if (expanded && !dataset.schema.models.some((model) => model.name === expanded))
      setExpanded(selected || null);
  }, [dataset.schema, expanded, selected]);
  const tables = dataset.schema.models.filter((model) =>
    model.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  const details =
    query.isPending || query.isFetching
      ? null
      : {
          value: query.data,
          error: query.error ? '结构详情读取失败，请检查连接或查看权限。' : undefined,
        };
  const value = details?.value;
  const ddl = value?.ddl;
  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-surface">
      <div className="flex items-center gap-1 pt-2 pr-2 pb-0 pl-2">
        <Input
          aria-label="搜索数据表"
          prefix={<MagnifyingGlassIcon />}
          placeholder="搜索数据表…"
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          variant="ghost"
          aria-label="刷新表结构"
          title="重新读取数据库结构"
          icon={<ArrowClockwiseIcon />}
          loading={refreshing}
          onClick={onRefresh}
        />
      </div>
      <div className="flex justify-between py-2 px-3 text-helper text-muted">
        {search ? `${tables.length} / ${dataset.schema.models.length}` : dataset.schema.models.length} 张表{' '}
        <span>括号内为字段数</span>
      </div>
      <nav className="flex-1 min-h-0 overflow-auto pt-0 pr-1.5 pb-3 pl-1.5" aria-label="数据表列表">
        <ul className="list-none p-0 m-0">
          {tables.map((model) => {
            const isOpen = expanded === model.name;
            const primary =
              typeof model.primaryKey === 'string' ? [model.primaryKey] : model.primaryKey || [];
            return (
              <li key={model.name}>
                <div
                  className={cx(
                    'flex items-center rounded-control my-0.5 mx-0 hover:bg-page ',
                    selected === model.name && 'bg-accent-soft text-accent',
                  )}
                >
                  <button
                    className="w-6.5 h-8.5 shrink-0 text-inherit bg-transparent border-0"
                    aria-label={(isOpen ? '收起 ' : '展开 ') + model.name}
                    aria-expanded={isOpen}
                    onClick={() => setExpanded(isOpen ? null : model.name)}
                  >
                    {isOpen ? <CaretDownIcon size={12} /> : <CaretRightIcon size={12} />}
                  </button>
                  <button
                    className="flex items-center gap-2 min-w-0 flex-1 pt-2 pr-2 pb-2 pl-0 text-left text-inherit bg-transparent border-0 aria-[current=true]:font-semibold"
                    aria-label={'预览 ' + model.name}
                    aria-current={selected === model.name ? 'true' : undefined}
                    title={model.name}
                    onClick={() => {
                      setExpanded(model.name);
                      onSelect(model.name);
                    }}
                  >
                    <TableIcon />
                    <span className="truncate">{model.name}</span>
                    <small className="shrink-0 ml-auto text-muted">({model.columns.length})</small>
                  </button>
                </div>
                {isOpen && (
                  <div className="mt-1 mr-2 mb-3 ml-7.5">
                    <ul className="list-none p-0 m-0">
                      {model.columns.map((column) => (
                        <li
                          className="flex items-center gap-2 py-1.5 px-0"
                          key={column.name}
                          title={`${column.name} · ${column.type}${primary.includes(column.name) ? ' · 主键' : ''}${column.notNull ? ' · 非空' : ''}`}
                        >
                          <span
                            className={primary.includes(column.name) ? 'text-accent' : 'text-muted'}
                            aria-label={primary.includes(column.name) ? '主键' : undefined}
                          >
                            {primary.includes(column.name) ? (
                              <KeyIcon />
                            ) : /INT|DECIMAL|FLOAT|DOUBLE|NUMERIC/i.test(column.type) ? (
                              <HashIcon />
                            ) : /DATE|TIME/i.test(column.type) ? (
                              <CalendarBlankIcon />
                            ) : (
                              <TextTIcon />
                            )}
                          </span>
                          <span className="min-w-0 truncate">{column.name}</span>
                          <small className="text-muted max-w-20 truncate ml-auto shrink-0">
                            {column.type}
                          </small>
                        </li>
                      ))}
                    </ul>
                    <div className="border-t border-t-line mt-2.5 pt-2.5">
                      <small className="block text-muted tracking-[0.06em] mb-1.5">索引</small>
                      {!details ? (
                        <div className="flex items-center gap-2 text-muted text-helper py-2 px-0">
                          <Spin size="small" />
                          读取结构详情…
                        </div>
                      ) : details.error ? (
                        <div className="text-muted text-helper">
                          <span>{details.error}</span>
                          <Button
                            className="mt-1.5"
                            variant="link"
                            size="small"
                            onClick={() => query.refetch()}
                          >
                            重试
                          </Button>
                        </div>
                      ) : value ? (
                        <>
                          {value.indexes.length ? (
                            value.indexes.map((index) => (
                              <div
                                className="flex gap-2 my-2 mx-0 text-muted"
                                key={index.name}
                                title={`${index.name} · ${index.type} · ${index.columns.join(', ')}`}
                              >
                                <ListIcon />
                                <div className="min-w-0">
                                  <span className="block truncate">{index.name}</span>
                                  <small className="block truncate text-helper mt-1">
                                    {index.columns.join(', ')}
                                    {index.unique ? ' · 唯一' : ''}
                                  </small>
                                </div>
                              </div>
                            ))
                          ) : (
                            <span className="text-muted">暂无索引</span>
                          )}
                          <Button
                            variant="ghost"
                            size="small"
                            className="mt-1.5"
                            icon={<CodeIcon />}
                            disabled={!ddl}
                            onClick={() => {
                              if (ddl) setDefinition({ table: model.name, ddl });
                            }}
                          >
                            查看建表语句
                          </Button>
                          {value.ddlError && (
                            <div className="text-muted text-helper">
                              {value.ddlError}
                              <Button variant="link" size="small" onClick={() => query.refetch()}>
                                重试
                              </Button>
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {!tables.length && <Empty description={search ? '未找到匹配的数据表' : '没有可读取的数据表'} />}
      </nav>
      <Modal
        title={'建表语句 · ' + (definition?.table || '')}
        open={!!definition}
        onCancel={() => setDefinition(null)}
        width={760}
        footer={
          <>
            <Button
              onClick={() =>
                window.workbench
                  .clipboardWrite(definition?.ddl || '')
                  .then(() => message.success('已复制建表语句'))
                  .catch(() => message.error('复制失败，请选择文本手动复制'))
              }
            >
              复制
            </Button>
            <Button onClick={() => setDefinition(null)}>关闭</Button>
          </>
        }
      >
        <p className="mt-0 mb-4 text-muted">数据库返回的实际定义，仅供查看，不会执行。</p>
        <pre className="max-h-[55vh] overflow-auto leading-[1.7]">{definition?.ddl}</pre>
      </Modal>
    </div>
  );
}
