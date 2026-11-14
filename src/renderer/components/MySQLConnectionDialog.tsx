import { useEffect, useId, useState } from 'react';
import { toast } from 'sonner';
import { mysqlInputSchema } from '@shared/mysql';
import { Button } from './Button';
import { Modal } from './Modal';
import { errorMessage } from '../utils';

export function MySQLConnectionDialog({
  datasetId,
  onClose,
  onSaved,
}: {
  datasetId?: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const formId = useId();
  const [form, setForm] = useState({
    name: '',
    host: 'localhost',
    port: '3306',
    database: '',
    user: '',
    password: '',
  });
  const [hasPassword, setHasPassword] = useState(false);
  const [clearPassword, setClearPassword] = useState(false);
  const [loading, setLoading] = useState(Boolean(datasetId));
  const [busy, setBusy] = useState<'test' | 'save' | null>(null);
  const [error, setError] = useState('');
  const [tested, setTested] = useState(false);

  useEffect(() => {
    if (!datasetId) return;
    let live = true;
    window.workbench
      .datasetMySQLGet(datasetId)
      .then((connection) => {
        if (!live) return;
        setForm({
          name: connection.name,
          host: connection.host,
          port: String(connection.port),
          database: connection.database,
          user: connection.user,
          password: '',
        });
        setHasPassword(connection.hasPassword);
      })
      .catch((cause) => {
        if (live) setError(errorMessage(cause));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [datasetId]);

  const submit = async (action: 'test' | 'save') => {
    if (busy || loading) return;
    setError('');
    setTested(false);
    const parsed = mysqlInputSchema.safeParse({
      ...form,
      id: datasetId,
      port: Number(form.port),
      password: clearPassword ? '' : form.password || (datasetId ? undefined : ''),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(action);
    try {
      if (action === 'test') {
        await window.workbench.datasetMySQLTest(parsed.data);
        setTested(true);
      } else {
        await window.workbench.datasetMySQLSave(parsed.data);
        toast.success(datasetId ? 'MySQL 连接已更新' : 'MySQL 数据源已添加');
        onSaved?.();
        onClose();
      }
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      title={datasetId ? '编辑 MySQL 连接' : '连接 MySQL'}
      footer={
        <>
          <Button disabled={loading || !!busy} onClick={() => void submit('test')}>
            {busy === 'test' ? '正在测试…' : '测试连接'}
          </Button>
          <Button type="submit" form={formId} variant="primary" disabled={loading || !!busy}>
            {busy === 'save' ? '正在保存…' : '保存连接'}
          </Button>
        </>
      }
    >
      {loading ? (
        <p className="text-sm text-muted">正在读取连接…</p>
      ) : (
        <form
          id={formId}
          onSubmit={(event) => {
            event.preventDefault();
            void submit('save');
          }}
          className="grid gap-3"
        >
          <fieldset disabled={!!busy} className="m-0 grid gap-3 border-0 p-0">
            {(
              [
                ['name', '数据源名称'],
                ['host', '主机'],
                ['port', '端口'],
                ['database', '数据库'],
                ['user', '用户名'],
                ['password', '密码'],
              ] as const
            ).map(([field, label]) => (
              <label key={field} className="grid gap-1.5 text-sm">
                {label}
                <input
                  name={field}
                  type={field === 'password' ? 'password' : field === 'port' ? 'number' : 'text'}
                  min={field === 'port' ? 1 : undefined}
                  max={field === 'port' ? 65535 : undefined}
                  autoComplete={field === 'password' ? 'new-password' : 'off'}
                  disabled={field === 'password' && clearPassword}
                  placeholder={field === 'password' && hasPassword ? '留空保留已保存的密码' : undefined}
                  className="min-w-0 rounded-lg border bg-page px-3 py-2 outline-none focus:border-accent disabled:opacity-50"
                  value={form[field]}
                  onChange={(event) => {
                    setForm({ ...form, [field]: event.target.value });
                    setTested(false);
                  }}
                />
              </label>
            ))}
            {hasPassword && (
              <label className="flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={clearPassword}
                  onChange={(event) => {
                    setClearPassword(event.target.checked);
                    setTested(false);
                  }}
                />
                清空已保存的密码
              </label>
            )}
          </fieldset>
        </form>
      )}
      {error && (
        <p role="alert" className="mb-0 text-sm text-danger">
          {error}
        </p>
      )}
      {tested && (
        <p role="status" className="mb-0 text-sm text-accent">
          连接成功，数据库结构可读取。
        </p>
      )}
    </Modal>
  );
}
