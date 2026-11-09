import { useEffect, type CSSProperties } from 'react';
import { getDataSource } from '@renderer/constants';
import { useScrollLoad } from '@renderer/hooks/useScrollLoad';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { paths } from '@renderer/utils/routes';
import { Button, SearchInput, ConfirmAction, Empty, Tag, Tooltip } from '@renderer/components/ui/index';
import { useUI } from '@renderer/hooks/useUI';
import {
  ArrowUpRightIcon,
  ArrowsClockwiseIcon,
  ClockIcon,
  FolderOpenIcon,
  PencilSimpleIcon,
  TrashIcon,
  PlusIcon,
} from '@phosphor-icons/react';
import type { Dataset } from '@shared/contracts';
import CollectionCard from '@renderer/components/CollectionCard';
import MySQLConnectionDialog from '@renderer/components/data/MySQLConnectionDialog';
import DatasetName from '@renderer/components/data/DatasetName';
import { queryClient } from '@renderer/data/queries';
import { useDataSourceActions } from '@renderer/hooks/useDataSourceActions';
const api = window.workbench;
export default function DataPage({
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
      <div className="flex items-center gap-2 flex-wrap mt-1 mr-0 mb-3 ml-0 pb-4 border-b border-b-line">
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
            {filtered.slice(0, count).map((d) => {
              const { icon: SourceIcon, color } = getDataSource(d.format);
              return (
                <CollectionCard
                  className="hover:border-source-line hover:shadow-[0_3px_12px] hover:shadow-ink/5 focus-within:border-source-line focus-within:shadow-[0_3px_12px] focus-within:shadow-ink/5"
                  style={{ '--source-color': color } as CSSProperties}
                  key={d.id}
                  label={d.name}
                  action="打开分析"
                  onOpen={() => open(d)}
                >
                  <div className="flex gap-2.5 justify-between items-start min-h-16.5">
                    <div className="flex flex-1 gap-2.5 min-w-0 items-start text-helper text-muted">
                      <span
                        className="grid place-items-center size-9 shrink-0 rounded-card text-source bg-source-soft"
                        aria-hidden="true"
                      >
                        <SourceIcon size={20} weight="duotone" />
                      </span>
                      <div className="min-w-0 flex-1">
                        {d.format === 'mysql' ? (
                          <h3 className="line-clamp-2 wrap-anywhere text-body text-ink tracking-[-0.02em] leading-[1.5] mt-0 mb-1 min-h-6">
                            {d.name}
                          </h3>
                        ) : (
                          <DatasetName dataset={d} disabled={analyzing || !!busy} onOpen={() => open(d)} />
                        )}
                        <span>
                          {d.format === 'mysql' ? 'MySQL · 远程只读' : `${d.format.toUpperCase()} · 文件引用`}
                        </span>
                      </div>
                    </div>
                    {d.connection && (
                      <Tag
                        className="m-0 shrink-0"
                        color={d.connection.status === 'ready' ? 'success' : 'error'}
                      >
                        {d.connection.status === 'ready' ? '已验证' : '验证失败'}
                      </Tag>
                    )}
                  </div>
                  {d.connection && (
                    <p
                      className="line-clamp-1 wrap-anywhere text-muted text-body mt-3 mb-0 min-h-0 leading-[1.6]"
                      title={`${d.connection.host}:${d.connection.port} / ${d.connection.database}`}
                    >
                      {`${d.connection.host}:${d.connection.port} / ${d.connection.database}`}
                    </p>
                  )}
                  {d.connection?.error && (
                    <p
                      className="text-muted wrap-anywhere line-clamp-2 text-helper"
                      title={d.connection.error}
                    >
                      {d.connection.error}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-4 mt-4 mr-0 mb-2.5 ml-0 text-helper text-muted">
                    <span>
                      <strong className="text-ink text-title font-semibold tabular-nums">
                        {d.schema.models.length}
                      </strong>{' '}
                      张表
                    </span>
                    <span>
                      <strong className="text-ink text-title font-semibold tabular-nums">
                        {d.schema.models.reduce((total, table) => total + table.columns.length, 0)}
                      </strong>{' '}
                      个字段
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-muted flex-wrap mt-auto text-helper">
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
                  <div className="flex items-center gap-0.5 text-muted text-helper mt-3.5 pt-3 border-t border-t-line/55 justify-end flex-wrap">
                    <Button
                      variant="link"
                      size="small"
                      className="relative z-2 mr-auto pl-0"
                      onClick={() => open(d)}
                    >
                      打开分析 <ArrowUpRightIcon />
                    </Button>
                    {d.connection && (
                      <>
                        <Tooltip title="编辑连接">
                          <Button
                            variant="ghost"
                            size="small"
                            icon={<PencilSimpleIcon />}
                            className="relative z-2"
                            aria-label="编辑连接"
                            disabled={analyzing || !!busy}
                            onClick={() => connection(d)}
                          />
                        </Tooltip>
                        <Tooltip title="重新验证">
                          <Button
                            variant="ghost"
                            size="small"
                            icon={<ArrowsClockwiseIcon />}
                            className="relative z-2"
                            aria-label="重新验证"
                            disabled={analyzing || !!busy}
                            loading={busy === d.id}
                            onClick={() =>
                              perform(d.id, async () => {
                                await api.refreshMySQL(d.id);
                                message.success('连接和结构已更新');
                              })
                            }
                          />
                        </Tooltip>
                      </>
                    )}
                    <Tooltip title="移除数据源">
                      <ConfirmAction
                        title="删除连接？"
                        description="仅解除连接，不删除原始文件或数据库。历史会话和分析收藏仍可查看和导出，但不能继续分析或刷新。"
                        onConfirm={() => perform('delete', () => api.deleteData(d.id))}
                      >
                        <Button
                          variant="ghost"
                          className="relative z-2 hover:text-danger hover:bg-danger/8"
                          size="small"
                          icon={<TrashIcon />}
                          aria-label={`移除数据源：${d.name}`}
                          disabled={analyzing || !!busy}
                        />
                      </ConfirmAction>
                    </Tooltip>
                    {d.format !== 'mysql' && (
                      <Tooltip title="重新选择源文件">
                        <Button
                          size="small"
                          variant="ghost"
                          icon={<FolderOpenIcon />}
                          className="relative z-2"
                          aria-label="重新选择源文件"
                          disabled={analyzing || !!busy}
                          loading={busy === d.id}
                          onClick={() =>
                            perform(d.id, async () => {
                              if (await api.relocateData(d.id)) {
                                await queryClient.invalidateQueries({ queryKey: ['preview', d.id] });
                                message.success('源文件已重新连接');
                              }
                            })
                          }
                        />
                      </Tooltip>
                    )}
                  </div>
                </CollectionCard>
              );
            })}
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
