import { useEffect, useRef, useState } from 'react';
import { Alert, useUI, Button, Drawer, Empty, TextArea, Select, Spin, Tabs, Tag } from './ui';
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
const api = window.workbench;
export default function DataBrowser({
  dataset,
  datasets,
  onAsk,
}: {
  dataset: Dataset;
  datasets: Dataset[];
  onAsk: (q: string) => void;
}) {
  const { message } = useUI();
  const [table, setTable] = useState(dataset.schema.models[0]?.name);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loadedKey, setLoadedKey] = useState('');
  const [pagination, setPagination] = useState({ key: '', page: 1, size: 100 });
  const [hasMore, setHasMore] = useState(false);
  const [retry, setRetry] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [treeOpen, setTreeOpen] = useState(true);
  const [compact, setCompact] = useState(false);
  const root = useRef<HTMLDivElement>(null);
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [semantic, setSemantic] = useState(dataset.semantic);
  const [metrics, setMetrics] = useState(dataset.metrics || []);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let live = true;
    if (!activeTable) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    api
      .preview(dataset.id, activeTable, { offset: (page - 1) * pageSize, limit: pageSize + 1 })
      .then((data) => {
        if (live) {
          setRows(data.slice(0, pageSize));
          setHasMore(data.length > pageSize);
          setLoadedKey(requestKey);
        }
      })
      .catch((e) => {
        if (live) {
          setError(errorMessage(e));
          setRows([]);
          setHasMore(false);
          setLoadedKey(requestKey);
        }
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [dataset.id, activeTable, dataset.fingerprint, page, pageSize, requestKey, retry]);
  const pending = loading || loadedKey !== requestKey;
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
        if (compact) setTreeOpen(false);
      }}
      refreshing={refreshing}
      onRefresh={() => refresh()}
    />
  );
  return (
    <div ref={root} className={'data-browser' + (mysql && treeOpen && !compact ? ' with-tree' : '')}>
      {mysql && treeOpen && !compact && <aside className="schema-sidebar">{navigation}</aside>}
      {mysql && compact && (
        <Drawer title="表结构" width={280} open={treeOpen} onClose={() => setTreeOpen(false)}>
          {treeOpen && navigation}
        </Drawer>
      )}
      <div className="data-content">
        {showTableToolbar && (
          <div className="toolbar data-toolbar">
            {mysql ? (
              <>
                <Button
                  aria-label={treeOpen ? '收起表结构' : '打开表结构'}
                  size="small"
                  icon={treeOpen ? <SidebarSimpleIcon /> : <SidebarIcon />}
                  onClick={() => setTreeOpen(!treeOpen)}
                >
                  {dataset.schema.models.length} 张表
                </Button>
                <strong className="current-table" title={activeTable}>
                  <TableIcon />
                  {activeTable || '未选择数据表'}
                </strong>
              </>
            ) : (
              <Select
                aria-label="选择数据表"
                value={activeTable}
                onChange={(name) => {
                  setTable(name);
                  setPagination((value) => ({ ...value, key: '', page: 1 }));
                  setTab('rows');
                }}
                options={dataset.schema.models.map((m) => ({ value: m.name, label: m.name }))}
                style={{ minWidth: 180, maxWidth: 300 }}
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
              <Button size="small" onClick={() => setRetry((v) => v + 1)}>
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
                <div className="preview-page">
                  <Grid
                    key={tableKey}
                    fill
                    resetKey={requestKey}
                    rows={pending ? [] : rows}
                    columns={model?.columns}
                    footer={
                      <div className="preview-pagination">
                        <span aria-live="polite">
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
                          className="preview-sort-note"
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
                        <span>第 {page} 页</span>
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
                    <div className="preview-loading preview-loading-overlay" role="status">
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
                <div className="ui-table-scroll">
                  <table className="ui-table schema-table">
                    <thead>
                      <tr>
                        <th>字段</th>
                        <th style={{ width: 210 }}>类型</th>
                        <th style={{ width: 160 }}>约束</th>
                      </tr>
                    </thead>
                    <tbody>
                      {model?.columns.map((column) => (
                        <tr key={column.name}>
                          <td>{column.name}</td>
                          <td>{column.type}</td>
                          <td>
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
                      style={{ marginLeft: 12 }}
                      onClick={async () => {
                        try {
                          await api.reparseData(dataset.id);
                          message.success('表头已重新识别');
                        } catch (e) {
                          message.error(String(e));
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
        <div className="quick-questions">
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
