import { useState } from 'react';
import { useUI, Button, SearchInput, ConfirmAction, Empty, Pagination, Tag } from './ui';
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  ClockIcon,
  DatabaseIcon,
  FileIcon,
  TableIcon,
  TrashIcon,
  PlusIcon,
} from '@phosphor-icons/react';
import type { Dataset } from '../../shared/contracts';
import CollectionCard from './CollectionCard';
import DataSourcePicker from './DataSourcePicker';
import MySQLConnectionDialog from './MySQLConnectionDialog';
import { useDataSourceActions } from '../shared/use-data-source-actions';
const api = window.workbench;
export default function DataManager({
  datasets,
  open,
  busy: analyzing,
}: {
  datasets: Dataset[];
  open: (d: Dataset) => void;
  busy: boolean;
}) {
  const { message } = useUI();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const filtered = datasets.filter((d) =>
    d.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / 12)));
  const [choosingSource, setChoosingSource] = useState(false);
  const sourceActions = useDataSourceActions({
    onImported: (dataset) => {
      setChoosingSource(false);
      open(dataset);
    },
    onConnected: () => setChoosingSource(false),
  });
  const { busy, perform, connection, importData } = sourceActions;
  return (
    <>
      {!choosingSource && (
        <div className="toolbar toolbar-divider">
          <SearchInput
            aria-label="搜索数据"
            placeholder="搜索数据名称"
            value={search}
            allowClear
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ maxWidth: 280 }}
          />
          <span className="min-w-[4px] flex-1" />
          <Button
            variant="primary"
            icon={<PlusIcon />}
            disabled={!!busy || analyzing}
            onClick={() => setChoosingSource(true)}
          >
            新增数据源
          </Button>
        </div>
      )}
      {choosingSource ? (
        <section className="data-welcome">
          <header>
            <div>
              <h2>新增数据源</h2>
              <p>选择数据来源，导入本地文件或建立 MySQL 只读连接。</p>
            </div>
            <Button icon={<ArrowLeftIcon />} disabled={!!busy} onClick={() => setChoosingSource(false)}>
              返回数据源
            </Button>
          </header>
          <DataSourcePicker
            importing={busy === 'import'}
            disabled={!!busy || analyzing}
            onImport={importData}
            onConnect={() => connection()}
          />
        </section>
      ) : (
        <section aria-label="数据源卡片">
          <span className="text-muted">{filtered.length} 个数据源</span>
          {filtered.length ? (
            <div className="collection-grid data-card-grid">
              {filtered.slice((current - 1) * 12, current * 12).map((d) => (
                <CollectionCard
                  className="data-card"
                  key={d.id}
                  label={d.name}
                  action="打开分析"
                  onOpen={() => open(d)}
                >
                  <div className="data-card-header">
                    <div className="data-card-source">
                      <span className="data-card-icon" aria-hidden="true">
                        {d.connection ? <DatabaseIcon /> : d.format === 'xlsx' ? <TableIcon /> : <FileIcon />}
                      </span>
                      <div className="data-card-title">
                        <h3>{d.name}</h3>
                        <span>{d.format === 'mysql' ? 'MySQL · 远程只读' : d.format.toUpperCase()}</span>
                      </div>
                    </div>
                    {d.connection && (
                      <Tag color={d.connection.status === 'ready' ? 'success' : 'error'}>
                        {d.connection.status === 'ready' ? '已验证' : '验证失败'}
                      </Tag>
                    )}
                  </div>
                  {d.connection && (
                    <p
                      className="collection-card-summary"
                      title={`${d.connection.host}:${d.connection.port} / ${d.connection.database}`}
                    >
                      {`${d.connection.host}:${d.connection.port} / ${d.connection.database}`}
                    </p>
                  )}
                  {d.connection?.error && (
                    <p className="collection-card-error" title={d.connection.error}>
                      {d.connection.error}
                    </p>
                  )}
                  <div className="data-card-metrics">
                    <span>
                      <strong>{d.schema.models.length}</strong> 张表
                    </span>
                    <span>
                      <strong>
                        {d.schema.models.reduce((total, table) => total + table.columns.length, 0)}
                      </strong>{' '}
                      个字段
                    </span>
                  </div>
                  <div className="collection-card-date">
                    <ClockIcon />
                    <span>{d.connection ? '最近验证' : '导入时间'}</span>
                    {d.connection && !d.connection.checkedAt ? (
                      <span>尚未验证</span>
                    ) : (
                      <time dateTime={d.connection?.checkedAt || d.createdAt}>
                        {new Date(d.connection?.checkedAt || d.createdAt).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    )}
                  </div>
                  <div className="collection-card-actions">
                    <Button variant="link" size="small" className="data-card-preview" onClick={() => open(d)}>
                      打开分析 <ArrowUpRightIcon />
                    </Button>
                    {d.connection && (
                      <>
                        <Button
                          variant="ghost"
                          size="small"
                          disabled={analyzing || !!busy}
                          onClick={() => connection(d)}
                        >
                          编辑
                        </Button>
                        <Button
                          variant="ghost"
                          size="small"
                          disabled={analyzing || !!busy}
                          loading={busy === d.id}
                          onClick={() =>
                            perform(d.id, async () => {
                              await api.refreshMySQL(d.id);
                              message.success('连接和结构已更新');
                            })
                          }
                        >
                          重新验证
                        </Button>
                      </>
                    )}
                    <ConfirmAction
                      title="删除数据源及关联内容？"
                      description="将永久删除此数据源的全部会话（包括已删除会话）、草稿和分析收藏，无法恢复。原始文件或数据库不会被删除。"
                      onConfirm={() => perform('delete', () => api.deleteData(d.id))}
                    >
                      <Button
                        variant="ghost"
                        className="data-card-remove"
                        size="small"
                        icon={<TrashIcon />}
                        aria-label={`移除数据源：${d.name}`}
                        title="移除数据源"
                        disabled={analyzing || !!busy}
                      />
                    </ConfirmAction>
                  </div>
                </CollectionCard>
              ))}
            </div>
          ) : (
            <Empty
              description={datasets.length ? '没有匹配的数据' : '还没有数据源，点击右上角“新增数据源”开始。'}
            />
          )}
          {filtered.length > 12 && (
            <Pagination
              className="collection-pagination"
              current={current}
              pageSize={12}
              total={filtered.length}
              onChange={setPage}
            />
          )}
        </section>
      )}
      <MySQLConnectionDialog {...sourceActions} />
    </>
  );
}
