import { useEffect } from 'react';
import { useScrollLoad } from '../shared/use-scroll-load';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { paths } from '../shared/routes';
import { useUI, Button, SearchInput, ConfirmAction, Empty, Tag } from './ui';
import {
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
import MySQLConnectionDialog from './MySQLConnectionDialog';
import LocalConnectionActions from './LocalConnectionActions';
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
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const search = params.get('q') || '';
  useEffect(() => {
    if (!params.has('page')) return;
    const next = new URLSearchParams(params);
    next.delete('page');
    setParams(next, { replace: true });
  }, [params, setParams]);
  const filtered = datasets.filter((d) =>
    d.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  const { count, hasMore, footer } = useScrollLoad(filtered.length, 12, search);
  const sourceActions = useDataSourceActions({ onImported: open, onConnected: () => {} });
  const { busy, perform, connection } = sourceActions;
  return (
    <>
      <div className="toolbar flex items-center gap-2 flex-wrap mt-1 mr-0 mb-3 ml-0 [&_h2]:m-0 [&_h3]:m-0 pb-4 border-b border-b-line">
        <SearchInput
          className="max-w-70"
          aria-label="搜索源数据名称"
          placeholder="搜索源数据名称"
          value={search}
          allowClear
          onChange={(e) => {
            const next = new URLSearchParams(params);
            if (e.target.value) next.set('q', e.target.value);
            else next.delete('q');
            next.delete('page');
            setParams(next, { replace: true, flushSync: true });
          }}
        />
        <span className="min-w-[4px] flex-1" />
        <Button
          variant="primary"
          icon={<PlusIcon />}
          disabled={!!busy || analyzing}
          onClick={() =>
            navigate(paths.newData, { state: { returnTo: location.pathname + location.search } })
          }
        >
          新增数据源
        </Button>
      </div>
      <section aria-label="数据源卡片">
        <span className="text-muted">{filtered.length} 个数据源</span>
        {filtered.length ? (
          <div className="grid mt-5 grid-cols-[repeat(auto-fill,_minmax(min(320px,_100%),_1fr))] gap-4">
            {filtered.slice(0, count).map((d) => (
              <CollectionCard
                className="[&_.data-card-preview]:mr-auto [&_.data-card-preview]:pl-0 p-4.5 hover:border-[color-mix(in_srgb,_var(--accent)_45%,_var(--border))] hover:shadow-[0_3px_12px_color-mix(in_srgb,_var(--text)_5%,_transparent)] focus-within:border-[color-mix(in_srgb,_var(--accent)_45%,_var(--border))] focus-within:shadow-[0_3px_12px_color-mix(in_srgb,_var(--text)_5%,_transparent)] [&_h3]:mt-0 [&_h3]:mr-0 [&_h3]:mb-[5px] [&_h3]:ml-0 [&_h3]:text-label [&_h3]:text-ink [&_h3]:tracking-[-0.02em] [&_.collection-card-summary]:[-webkit-line-clamp:1] [&_.collection-card-summary]:min-h-0 [&_.collection-card-summary]:mt-3 [&_.collection-card-summary]:mr-0 [&_.collection-card-summary]:mb-0 [&_.collection-card-summary]:ml-0 [&_.collection-card-summary]:leading-[1.6] [&_.collection-card-date]:mt-auto [&_.collection-card-date]:gap-[5px] [&_.collection-card-date]:flex-wrap [&_.collection-card-actions]:gap-0.5 [&_.collection-card-actions]:mt-3.5 [&_.collection-card-actions]:border-t-[color-mix(in_srgb,_var(--border)_55%,_transparent)]"
                key={d.id}
                label={d.name}
                action="打开分析"
                onOpen={() => open(d)}
              >
                <div className="flex gap-2.5 justify-between items-start min-h-16.5 [&_.ui-badge]:m-0 [&_.ui-badge]:shrink-0">
                  <div className="flex gap-2.5 min-w-0 items-start text-helper text-muted">
                    <span
                      className="shrink-0 grid place-items-center w-9 h-9 rounded-card text-accent-ink bg-[color-mix(in_srgb,_var(--accent)_8%,_var(--surface))] [&_svg]:w-5 [&_svg]:h-5"
                      aria-hidden="true"
                    >
                      {d.connection ? <DatabaseIcon /> : d.format === 'xlsx' ? <TableIcon /> : <FileIcon />}
                    </span>
                    <div className="min-w-0">
                      <h3>{d.name}</h3>
                      <span>
                        {d.format === 'mysql' ? 'MySQL · 远程只读' : `${d.format.toUpperCase()} · 文件引用`}
                      </span>
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
                    className="collection-card-summary [display:-webkit-box] [-webkit-box-orient:vertical] overflow-hidden wrap-anywhere [-webkit-line-clamp:3] text-muted text-body mt-0 mr-0 mb-3 ml-0 min-h-11"
                    title={`${d.connection.host}:${d.connection.port} / ${d.connection.database}`}
                  >
                    {`${d.connection.host}:${d.connection.port} / ${d.connection.database}`}
                  </p>
                )}
                {d.connection?.error && (
                  <p
                    className="text-muted wrap-anywhere [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden text-helper"
                    title={d.connection.error}
                  >
                    {d.connection.error}
                  </p>
                )}
                <div className="flex flex-wrap gap-4 mt-4 mr-0 mb-2.5 ml-0 text-helper text-muted">
                  <span>
                    <strong className="text-ink text-subtitle font-semibold tabular-nums">
                      {d.schema.models.length}
                    </strong>{' '}
                    张表
                  </span>
                  <span>
                    <strong className="text-ink text-subtitle font-semibold tabular-nums">
                      {d.schema.models.reduce((total, table) => total + table.columns.length, 0)}
                    </strong>{' '}
                    个字段
                  </span>
                </div>
                <div className="collection-card-date flex items-center gap-2 text-muted flex-wrap mt-2 text-caption">
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
                <div className="collection-card-actions [&_button]:relative [&_button]:z-2 flex items-center gap-2 text-muted text-helper mt-4 pt-3 border-t border-t-line justify-end flex-wrap">
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
                    title="删除连接？"
                    description="仅解除连接，不删除原始文件或数据库。历史会话和分析收藏仍可查看和导出，但不能继续分析或刷新。"
                    onConfirm={() => perform('delete', () => api.deleteData(d.id))}
                  >
                    <Button
                      variant="ghost"
                      className="hover:text-danger hover:bg-[color-mix(in_srgb,_var(--danger)_8%,_transparent)]"
                      size="small"
                      icon={<TrashIcon />}
                      aria-label={`移除数据源：${d.name}`}
                      title="移除数据源"
                      disabled={analyzing || !!busy}
                    />
                  </ConfirmAction>
                  <LocalConnectionActions dataset={d} disabled={analyzing || !!busy} />
                </div>
              </CollectionCard>
            ))}
          </div>
        ) : (
          <Empty
            description={datasets.length ? '没有匹配的数据' : '还没有数据源，点击右上角“新增数据源”开始。'}
          />
        )}
        {hasMore && (
          <div ref={footer} className="py-5 text-center text-muted text-helper" role="status">
            正在加载更多数据源…
          </div>
        )}
      </section>
      <MySQLConnectionDialog {...sourceActions} />
    </>
  );
}
