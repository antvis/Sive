import { useEffect, useState } from 'react';
import { useUI, Button, Empty, Input, Modal, Spin } from './ui';
import {
  DatabaseIcon,
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
import type { Dataset, TableDetails } from '../../shared/contracts';

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
  const [retry, setRetry] = useState(0);
  const [info, setInfo] = useState<{
    table: string;
    revision: string;
    value?: TableDetails;
    error?: string;
  } | null>(null);
  const [definition, setDefinition] = useState<{ table: string; ddl: string } | null>(null);
  useEffect(() => {
    if (expanded && !dataset.schema.models.some((model) => model.name === expanded))
      setExpanded(selected || null);
  }, [dataset.schema, expanded, selected]);
  useEffect(() => {
    let live = true;
    setInfo(null);
    if (expanded && dataset.schema.models.some((model) => model.name === expanded)) {
      window.workbench
        .tableDetails(dataset.id, expanded)
        .then((value) => {
          if (live)
            setInfo({ table: expanded, revision: dataset.schemaRevision || dataset.fingerprint, value });
        })
        .catch(() => {
          if (live)
            setInfo({
              table: expanded,
              revision: dataset.schemaRevision || dataset.fingerprint,
              error: '结构详情读取失败，请检查连接或查看权限。',
            });
        });
    }
    return () => {
      live = false;
    };
  }, [dataset.id, dataset.fingerprint, dataset.schemaRevision, expanded, retry]);
  const tables = dataset.schema.models.filter((model) =>
    model.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  const details =
    info?.table === expanded && info.revision === (dataset.schemaRevision || dataset.fingerprint)
      ? info
      : null;
  return (
    <div className="table-navigator">
      <div className="database-heading">
        <DatabaseIcon />
        <div>
          <strong title={dataset.connection?.database}>{dataset.connection?.database}</strong>
          <small title={dataset.name}>{dataset.name} · MySQL</small>
        </div>
      </div>
      <div className="table-search">
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
      <div className="table-count">
        {search ? `${tables.length} / ${dataset.schema.models.length}` : dataset.schema.models.length} 张表{' '}
        <span>括号内为字段数</span>
      </div>
      <nav className="table-tree" aria-label="数据表列表">
        <ul>
          {tables.map((model) => {
            const isOpen = expanded === model.name;
            const primary =
              typeof model.primaryKey === 'string' ? [model.primaryKey] : model.primaryKey || [];
            return (
              <li key={model.name}>
                <div className={'table-node ' + (selected === model.name ? 'selected' : '')}>
                  <button
                    className="table-expander"
                    aria-label={(isOpen ? '收起 ' : '展开 ') + model.name}
                    aria-expanded={isOpen}
                    onClick={() => setExpanded(isOpen ? null : model.name)}
                  >
                    {isOpen ? <CaretDownIcon /> : <CaretRightIcon />}
                  </button>
                  <button
                    className="table-select"
                    aria-label={'预览 ' + model.name}
                    aria-current={selected === model.name ? 'true' : undefined}
                    title={model.name}
                    onClick={() => {
                      setExpanded(model.name);
                      onSelect(model.name);
                    }}
                  >
                    <TableIcon />
                    <span>{model.name}</span>
                    <small>({model.columns.length})</small>
                  </button>
                </div>
                {isOpen && (
                  <div className="table-structure">
                    <ul className="column-list">
                      {model.columns.map((column) => (
                        <li
                          key={column.name}
                          title={`${column.name} · ${column.type}${primary.includes(column.name) ? ' · 主键' : ''}${column.notNull ? ' · 非空' : ''}`}
                        >
                          <span
                            className={primary.includes(column.name) ? 'primary-key' : 'text-muted'}
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
                          <span className="column-name">{column.name}</span>
                          <small>{column.type}</small>
                        </li>
                      ))}
                    </ul>
                    <div className="table-indexes">
                      <small className="structure-label">索引</small>
                      {!details ? (
                        <div className="structure-loading">
                          <Spin size="small" />
                          读取结构详情…
                        </div>
                      ) : details.error ? (
                        <div className="structure-error">
                          <span>{details.error}</span>
                          <Button variant="link" size="small" onClick={() => setRetry((v) => v + 1)}>
                            重试
                          </Button>
                        </div>
                      ) : (
                        <>
                          {details.value!.indexes.length ? (
                            details.value!.indexes.map((index) => (
                              <div
                                className="index-item"
                                key={index.name}
                                title={`${index.name} · ${index.type} · ${index.columns.join(', ')}`}
                              >
                                <ListIcon />
                                <div>
                                  <span>{index.name}</span>
                                  <small>
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
                            icon={<CodeIcon />}
                            disabled={!details.value!.ddl}
                            onClick={() => setDefinition({ table: model.name, ddl: details.value!.ddl! })}
                          >
                            查看建表语句
                          </Button>
                          {details.value!.ddlError && (
                            <div className="structure-error">
                              {details.value!.ddlError}
                              <Button variant="link" size="small" onClick={() => setRetry((v) => v + 1)}>
                                重试
                              </Button>
                            </div>
                          )}
                        </>
                      )}
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
                  .writeClipboard(definition?.ddl || '')
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
        <p className="text-muted">数据库返回的实际定义，仅供查看，不会执行。</p>
        <pre className="ddl-preview">{definition?.ddl}</pre>
      </Modal>
    </div>
  );
}
