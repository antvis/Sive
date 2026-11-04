import { useState } from 'react';
import {
  Alert,
  useUI,
  Button,
  Form,
  Field,
  useForm,
  Input,
  SearchInput,
  PasswordInput,
  InputNumber,
  Modal,
  ConfirmAction,
  Empty,
  Pagination,
  Tag,
} from './ui';
import {
  ArrowUpRightIcon,
  ClockIcon,
  DatabaseIcon,
  FileIcon,
  TableIcon,
  TrashIcon,
  UploadSimpleIcon,
} from '@phosphor-icons/react';
import type { Dataset, MySQLInput } from '../../shared/contracts';
import { errorMessage } from '../shared/feedback';
import CollectionCard from './CollectionCard';
import DataWelcome from './DataWelcome';
const api = window.workbench;
export default function DataManager({
  datasets,
  open,
  busy: analyzing,
  modelName,
  onModelSettings,
}: {
  datasets: Dataset[];
  open: (d: Dataset) => void;
  busy: boolean;
  modelName?: string;
  onModelSettings: () => void;
}) {
  const { message } = useUI();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const filtered = datasets.filter((d) =>
    d.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / 12)));
  const [editing, setEditing] = useState<Dataset | 'new' | null>(null);
  const [busy, setBusy] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const form = useForm<MySQLInput>({ mode: 'onChange' });
  const perform = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setBusy('');
    }
  };
  const connection = (d?: Dataset) => {
    setFeedback(null);
    form.reset();
    form.reset(d?.connection ? { ...d.connection, name: d.name } : { port: 3306 });
    setEditing(d || 'new');
  };
  const importData = () =>
    void perform('import', async () => {
      const d = await api.importData();
      if (d) open(d);
    });
  async function submit(save: boolean) {
    if (!(await form.trigger(undefined, { shouldFocus: true }))) return;
    const values = form.getValues();
    setBusy(save ? 'save' : 'test');
    setFeedback(null);
    try {
      const input = { ...values, id: editing && editing !== 'new' ? editing.id : undefined };
      if (save) {
        const d = await api.saveMySQL(input);
        setEditing(null);
        message.success(`连接已验证：${d.schema.models.length} 张表`);
      } else {
        const result = await api.testMySQL(input);
        setFeedback({
          type: 'success',
          text: `已连接并验证读取权限：发现 ${result.tables} 张表，首表读取 ${result.rows} 行。尚未保存。`,
        });
      }
    } catch (e) {
      setFeedback({ type: 'error', text: errorMessage(e) });
    } finally {
      setBusy('');
    }
  }
  return (
    <>
      {!datasets.length ? (
        <DataWelcome
          importing={busy === 'import'}
          disabled={!!busy || analyzing}
          modelName={modelName}
          onImport={importData}
          onConnect={() => connection()}
          onSettings={onModelSettings}
        />
      ) : (
        <>
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
            <Button icon={<DatabaseIcon />} disabled={!!busy || analyzing} onClick={() => connection()}>
              连接 MySQL
            </Button>
            <Button
              variant="primary"
              icon={<UploadSimpleIcon />}
              loading={busy === 'import'}
              disabled={!!busy}
              onClick={importData}
            >
              导入本地数据
            </Button>
          </div>
          <p className="data-source-help text-muted">
            本地文件：CSV、Excel（XLSX）、JSON、Parquet。MySQL：以只读方式访问账号可读取的数据库表。
          </p>
          <section aria-label="数据源卡片">
            <span className="text-muted">{filtered.length} 个数据源</span>
            {filtered.length ? (
              <div className="collection-grid data-card-grid">
                {filtered.slice((current - 1) * 12, current * 12).map((d) => (
                  <CollectionCard
                    className="data-card"
                    key={d.id}
                    label={d.name}
                    action="预览数据"
                    onOpen={() => open(d)}
                  >
                    <div className="data-card-header">
                      <div className="data-card-source">
                        <span className="data-card-icon" aria-hidden="true">
                          {d.connection ? (
                            <DatabaseIcon />
                          ) : d.format === 'xlsx' ? (
                            <TableIcon />
                          ) : (
                            <FileIcon />
                          )}
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
                      <Button
                        variant="link"
                        size="small"
                        className="data-card-preview"
                        onClick={() => open(d)}
                      >
                        预览数据 <ArrowUpRightIcon />
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
                              void perform(d.id, async () => {
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
                        title={d.connection ? '移除此连接？' : '删除导入副本？'}
                        description="已保存的分析快照仍会保留。"
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
              <Empty description="没有匹配的数据" />
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
        </>
      )}
      <Modal
        width={600}
        title={editing === 'new' ? '连接 MySQL' : '编辑 MySQL 连接'}
        open={!!editing}
        onCancel={() => !busy && setEditing(null)}
        footer={
          <>
            <Button disabled={!!busy} onClick={() => setEditing(null)}>
              取消
            </Button>
            <Button loading={busy === 'test'} disabled={!!busy} onClick={() => void submit(false)}>
              测试连接
            </Button>
            <Button
              variant="primary"
              loading={busy === 'save'}
              disabled={!!busy}
              onClick={() => void submit(true)}
            >
              验证并保存
            </Button>
          </>
        }
      >
        <p className="text-muted">
          验证包含建立连接、读取表结构和首表抽样。不会全库扫描；账号权限决定可读取范围。当前不支持 SSH 配置。
        </p>
        <Form form={form} disabled={!!busy} onValuesChange={() => setFeedback(null)}>
          <Field name="name" label="连接名称" required>
            <Input placeholder="例如：业务分析库" />
          </Field>
          <div className="form-columns">
            <Field name="host" label="主机" required>
              <Input placeholder="127.0.0.1" />
            </Field>
            <Field name="port" label="端口" required>
              <InputNumber min={1} max={65535} />
            </Field>
          </div>
          <Field name="database" label="数据库" required>
            <Input />
          </Field>
          <Field name="user" label="用户名" required>
            <Input autoComplete="off" />
          </Field>
          <Field
            name="password"
            label="密码"
            extra="编辑时留空保留密码；清空输入框可设为空密码。驱动暂不支持空白、引号与反斜杠。"
          >
            <PasswordInput autoComplete="new-password" />
          </Field>
        </Form>
        {busy && <Alert type="info" title="正在验证连接、读取表结构和抽样数据…" />}
        {feedback && <Alert type={feedback.type} title={feedback.text} />}
      </Modal>
    </>
  );
}
