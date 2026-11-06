import { tableViewport } from './ui/styles';
import { cx } from '../shared/cx';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { previewQuery } from '../shared/queries';
import { usePreferences } from '../preferences';
import { Alert, useUI, Button, Empty, TextArea, Select, Spin, Tabs, Tag } from './ui';
import {
  CaretLeftIcon,
  CaretRightIcon,
  SidebarSimpleIcon,
  SidebarIcon,
  TableIcon,
} from '@phosphor-icons/react';
import type { Dataset } from '../../shared/contracts';
import { quickQuestions } from '../shared/quick-questions';
import MetricEditor from './MetricEditor';
import TableNavigator from './TableNavigator';
import Grid from './DataGrid';
import { errorMessage } from '../shared/feedback';
import LocalConnectionActions from './LocalConnectionActions';
const api = window.workbench;
export default function DataBrowser({
  dataset,
  datasets,
  onAsk,
  active = true,
  busy = false,
}: {
  dataset: Dataset;
  datasets: Dataset[];
  onAsk: (q: string) => void;
  active?: boolean;
  busy?: boolean;
}) {
  const { message } = useUI();
  const { preferences } = usePreferences();
  const [table, setTable] = useState(dataset.schema.models[0]?.name);
  const [pagination, setPagination] = useState({
    key: '',
    page: 1,
    size: preferences.previewPageSize as number,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [treeOpen, setTreeOpen] = useState(true);
  const [compact, setCompact] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const treeToggle = useRef<HTMLButtonElement>(null);
  const closeTree = () => {
    setTreeOpen(false);
    requestAnimationFrame(() => treeToggle.current?.focus());
  };
  const mysql = dataset.format === 'mysql';
  const showTableToolbar = mysql || dataset.schema.models.length > 1;
  const model = dataset.schema.models.find((m) => m.name === table) || dataset.schema.models[0];
  const activeTable = model?.name || '';
  const tableKey = JSON.stringify([dataset.id, activeTable, dataset.fingerprint, dataset.schemaRevision]);
  const page = pagination.key === tableKey ? pagination.page : 1;
  const pageSize = pagination.size;
  const requestKey = JSON.stringify([tableKey, page, pageSize]);
  const changePage = (next: number, size = pageSize) => setPagination({ key: tableKey, page: next, size });
  const [tab, setTab] = useState('rows');
  useEffect(() => {
    const observer = new ResizeObserver((entries) => setCompact(entries[0].contentRect.width < 740));
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (compact) setTreeOpen(false);
  }, [compact]);
  useEffect(() => {
    if (compact && treeOpen) root.current?.querySelector<HTMLInputElement>('.schema-sidebar input')?.focus();
  }, [compact, treeOpen]);
  const [semantic, setSemantic] = useState(dataset.semantic);
  const [metrics, setMetrics] = useState(dataset.metrics || []);
  const [saving, setSaving] = useState(false);
  const preview = useQuery(previewQuery(dataset, activeTable, page, pageSize, active));
  const pending = !!activeTable && (preview.isPending || preview.isFetching);
  const error = preview.error && !pending ? errorMessage(preview.error) : '';
  const rows = preview.isError ? [] : (preview.data || []).slice(0, pageSize);
  const hasMore = !preview.isError && (preview.data?.length || 0) > pageSize;
  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await api.refreshMySQL(dataset.id);
      message.success('表结构已刷新');
    } catch (error) {
      message.error(String(error));
    } finally {
      setRefreshing(false);
    }
  };
  const navigation = (
    <TableNavigator
      dataset={dataset}
      selected={activeTable}
      onSelect={(name) => {
        setTable(name);
        setPagination((value) => ({ ...value, key: '', page: 1 }));
        setTab('rows');
        if (compact) closeTree();
      }}
      refreshing={refreshing}
      onRefresh={() => refresh()}
    />
  );
  return (
    <div
      ref={root}
      className={cx(
        'data-browser relative h-full min-h-0 grid grid-cols-1 overflow-hidden [&.with-tree]:grid-cols-[250px_minmax(0,_1fr)] [&.with-tree]:gap-4',
        mysql && treeOpen && !compact ? ' with-tree' : '',
      )}
    >
      {mysql && treeOpen && (
        <aside
          className="schema-sidebar flex flex-col min-w-0 min-h-0 overflow-hidden border border-line rounded-control"
          aria-label="表结构"
          onKeyDown={(event) => {
            if (compact && event.key === 'Escape') {
              event.preventDefault();
              closeTree();
            }
          }}
        >
          {navigation}
        </aside>
      )}
      <div
        className="min-w-0 min-h-0 overflow-hidden flex flex-col [&_>_.toolbar]:shrink-0 [&_>_.ui-alert]:shrink-0 [&_>_.quick-questions]:shrink-0 [&_>_.quick-questions]:mt-2 [&_>_.quick-questions]:pt-2 [&_>_.ui-tabs]:flex-1 [&_>_.ui-tabs]:min-h-0 [&_.ui-tab-content[data-state='active']]:h-full [&_.ui-tab-content[data-state='active']]:overflow-auto [&_.ui-tab-content[data-state='active']:has(.preview-page)]:overflow-hidden hidden:hidden"
        hidden={mysql && compact && treeOpen}
      >
        {!mysql && (
          <div className="toolbar flex items-center flex-wrap gap-2 mb-3 pr-9">
            <Tag>本地文件引用</Tag>
            <LocalConnectionActions dataset={dataset} disabled={busy || saving} />
          </div>
        )}
        {showTableToolbar && (
          <div className="toolbar flex items-center gap-2 flex-wrap mt-1 mr-0 mb-3 ml-0 [&_h2]:m-0 [&_h3]:m-0 pr-9">
            {mysql ? (
              <>
                <Button
                  ref={treeToggle}
                  aria-expanded={treeOpen}
                  aria-label={treeOpen ? '收起表结构' : '打开表结构'}
                  size="small"
                  icon={treeOpen ? <SidebarSimpleIcon /> : <SidebarIcon />}
                  onClick={() => setTreeOpen(!treeOpen)}
                >
                  {dataset.schema.models.length} 张表
                </Button>
                <strong
                  className="flex items-center gap-2 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap max-w-full [&_>_svg]:shrink-0"
                  title={activeTable}
                >
                  <TableIcon />
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                    {activeTable || '未选择数据表'}
                  </span>
                </strong>
              </>
            ) : (
              <Select
                className="min-w-45 max-w-75"
                aria-label="选择数据表"
                value={activeTable}
                onChange={(name) => {
                  setTable(name);
                  setPagination((value) => ({ ...value, key: '', page: 1 }));
                  setTab('rows');
                }}
                options={dataset.schema.models.map((m) => ({ value: m.name, label: m.name }))}
              />
            )}
            <span className="text-[12px] text-muted">{model?.columns.length} 个字段</span>
            <span className="min-w-[4px] flex-1" />
            {dataset.format === 'mysql' && <Tag>远程实时读取</Tag>}
          </div>
        )}
        {error && (
          <Alert
            type="error"
            title={error}
            action={
              <Button size="small" onClick={() => preview.refetch()}>
                重试预览
              </Button>
            }
          />
        )}
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: 'rows',
              label: '数据预览',
              children: !activeTable ? (
                <Empty description="没有可预览的数据表" />
              ) : (
                <div className="preview-page relative h-full min-h-0">
                  <Grid
                    key={tableKey}
                    fill
                    resetKey={requestKey}
                    rows={pending ? [] : rows}
                    columns={model?.columns}
                    footer={
                      <div className="flex-1 flex items-center flex-wrap gap-2">
                        <span className="[&:first-child]:mr-auto" aria-live="polite">
                          {pending
                            ? '正在读取…'
                            : error
                              ? '读取失败'
                              : rows.length
                                ? `第 ${(page - 1) * pageSize + 1}–${(page - 1) * pageSize + rows.length} 行${hasMore ? ' · 后续还有数据' : ' · 已到末页'}`
                                : page === 1
                                  ? '暂无数据'
                                  : '本页暂无数据，可返回上一页'}
                        </span>
                        <span
                          className="text-muted [&:first-child]:mr-auto"
                          title="分页按需读取；排序只作用于当前页。远程数据变化或无唯一键时，翻页结果可能变化。"
                        >
                          仅排序当前页
                        </span>
                        <Select
                          aria-label="每页行数"
                          size="small"
                          value={pageSize}
                          disabled={pending}
                          onChange={(size) => changePage(1, size)}
                          options={[50, 100, 200].map((size) => ({ value: size, label: `${size} 行 / 页` }))}
                        />
                        <Button
                          size="small"
                          aria-label="上一页"
                          icon={<CaretLeftIcon />}
                          disabled={pending || page === 1}
                          onClick={() => changePage(page - 1)}
                        />
                        <span className="[&:first-child]:mr-auto">第 {page} 页</span>
                        <Button
                          size="small"
                          aria-label="下一页"
                          icon={<CaretRightIcon />}
                          disabled={pending || !!error || !hasMore}
                          onClick={() => changePage(page + 1)}
                        />
                      </div>
                    }
                  />
                  {pending && (
                    <div
                      className="min-h-45 flex items-center justify-center gap-3 text-muted absolute [inset:0_0_50px] bg-surface z-3"
                      role="status"
                    >
                      <Spin />
                      <span>正在读取 {activeTable}…</span>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'schema',
              label: !showTableToolbar && model ? `字段结构（${model.columns.length}）` : '字段结构',
              children: (
                <div className={tableViewport}>
                  <table className="ui-table w-full text-left border-separate border-spacing-0 text-helper [&_tr:last-child_td]:border-b-0 [&_tbody_tr:hover]:bg-[color-mix(in_srgb,_var(--muted)_3%,_transparent)] [&_th[aria-sort='ascending']_.ui-sort]:text-accent [&_th[aria-sort='descending']_.ui-sort]:text-accent [&_.ui-table-empty]:text-center [&_.ui-table-empty]:h-27.5 [&_.ui-table-empty]:text-muted min-w-165">
                    <thead>
                      <tr>
                        <th className="font-medium bg-page text-muted sticky top-0 z-2 h-9 py-2 px-3 border-b border-b-[color-mix(in_srgb,_var(--border)_65%,_transparent)] text-left">
                          字段
                        </th>
                        <th className="font-medium bg-page text-muted sticky top-0 z-2 h-9 py-2 px-3 border-b border-b-[color-mix(in_srgb,_var(--border)_65%,_transparent)] text-left w-52.5">
                          类型
                        </th>
                        <th className="font-medium bg-page text-muted sticky top-0 z-2 h-9 py-2 px-3 border-b border-b-[color-mix(in_srgb,_var(--border)_65%,_transparent)] text-left w-40">
                          约束
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {model?.columns.map((column) => (
                        <tr key={column.name}>
                          <td className="h-9 py-2 px-3 border-b border-b-[color-mix(in_srgb,_var(--border)_65%,_transparent)] text-left">
                            {column.name}
                          </td>
                          <td className="h-9 py-2 px-3 border-b border-b-[color-mix(in_srgb,_var(--border)_65%,_transparent)] text-left">
                            {column.type}
                          </td>
                          <td className="h-9 py-2 px-3 border-b border-b-[color-mix(in_srgb,_var(--border)_65%,_transparent)] text-left">
                            {(typeof model.primaryKey === 'string'
                              ? [model.primaryKey]
                              : model.primaryKey || []
                            ).includes(column.name) && <Tag>主键</Tag>}
                            {column.notNull && <Tag>非空</Tag>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ),
            },
            {
              key: 'semantic',
              label: '数据语义',
              children: (
                <>
                  <p className="text-muted">
                    补充字段含义、业务规则和指标定义，帮助 AI 准确理解数据。
                    分析时会与数据结构一起发送给所选模型服务。
                  </p>
                  <TextArea
                    aria-label="数据语义说明"
                    placeholder="例如：amount 为订单实付金额，单位为元；仅统计支付成功的订单。"
                    value={semantic}
                    onChange={(e) => setSemantic(e.target.value)}
                    autoSize={{ minRows: 3, maxRows: 8 }}
                  />
                  <MetricEditor
                    dataset={dataset}
                    datasets={datasets}
                    metrics={metrics}
                    onChange={setMetrics}
                    disabled={saving}
                  />
                  <Button
                    loading={saving}
                    disabled={busy}
                    variant="primary"
                    onClick={async () => {
                      setSaving(true);
                      try {
                        await api.semantic(dataset.id, semantic, metrics);
                        message.success('数据语义已保存');
                      } catch (e) {
                        message.error(String(e));
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    保存数据语义
                  </Button>
                  {dataset.format === 'xlsx' && (
                    <Button
                      className="ml-3"
                      disabled={busy || refreshing}
                      loading={refreshing}
                      onClick={async () => {
                        if (refreshing) return;
                        setRefreshing(true);
                        try {
                          await api.reparseData(dataset.id);
                          message.success('表头已重新识别');
                        } catch (e) {
                          message.error(String(e));
                        } finally {
                          setRefreshing(false);
                        }
                      }}
                    >
                      重新识别 Excel 表头
                    </Button>
                  )}
                </>
              ),
            },
          ]}
        />
        <div className="quick-questions flex items-center gap-2 flex-wrap mt-4 pt-3 border-t border-t-line">
          <span className="text-muted">开始分析</span>
          {quickQuestions(dataset, activeTable).map((q) => (
            <Button size="small" key={q.id} onClick={() => onAsk(q.question)}>
              {q.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
