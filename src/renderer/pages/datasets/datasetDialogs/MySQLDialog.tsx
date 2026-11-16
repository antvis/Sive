import { useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { MySQLInput } from '@shared/api';
import { Button } from '../../../components/Button';
import { Modal } from '../../../components/Modal';
import { errorMessage } from '../../../utils';

export function MySQLDialog({
  datasetId,
  onClose,
  onSaved,
}: {
  datasetId?: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
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
          port: String(connection.port ?? 3306),
          database: connection.database,
          user: connection.user ?? '',
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
    if (busy || loading || !formRef.current?.reportValidity()) return;
    setError('');
    setTested(false);
    const input: MySQLInput = {
      ...form,
      id: datasetId,
      port: Number(form.port),
      password: clearPassword ? '' : form.password || (datasetId ? undefined : ''),
    };
    setBusy(action);
    try {
      if (action === 'test') {
        await window.workbench.datasetMySQLTest(input);
        setTested(true);
      } else {
        await window.workbench.datasetMySQLSave(input);
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
          <Button disabled={loading || !!busy} onClick={() => submit('test')}>
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
          ref={formRef}
          onSubmit={(event) => {
            event.preventDefault();
            submit('save');
          }}
          className="grid gap-3"
        >
          <fieldset disabled={!!busy} className="m-0 grid gap-3 border-0 p-0">
            <label className="grid gap-1.5 text-sm">
              数据源名称
              <input
                name="name"
                type="text"
                required
                pattern={'.*\\S.*'}
                autoComplete="off"
                className="min-w-0 rounded-lg border bg-page px-3 py-2 outline-none focus:border-accent disabled:opacity-50"
                value={form.name}
                onChange={(event) => {
                  setForm({ ...form, name: event.target.value });
                  setTested(false);
                }}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              主机
              <input
                name="host"
                type="text"
                required
                pattern={'.*\\S.*'}
                autoComplete="off"
                className="min-w-0 rounded-lg border bg-page px-3 py-2 outline-none focus:border-accent disabled:opacity-50"
                value={form.host}
                onChange={(event) => {
                  setForm({ ...form, host: event.target.value });
                  setTested(false);
                }}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              端口
              <input
                name="port"
                type="number"
                required
                min={1}
                max={65535}
                step={1}
                autoComplete="off"
                className="min-w-0 rounded-lg border bg-page px-3 py-2 outline-none focus:border-accent disabled:opacity-50"
                value={form.port}
                onChange={(event) => {
                  setForm({ ...form, port: event.target.value });
                  setTested(false);
                }}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              数据库
              <input
                name="database"
                type="text"
                required
                pattern={'.*\\S.*'}
                autoComplete="off"
                className="min-w-0 rounded-lg border bg-page px-3 py-2 outline-none focus:border-accent disabled:opacity-50"
                value={form.database}
                onChange={(event) => {
                  setForm({ ...form, database: event.target.value });
                  setTested(false);
                }}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              用户名
              <input
                name="user"
                type="text"
                required
                pattern={'.*\\S.*'}
                autoComplete="off"
                className="min-w-0 rounded-lg border bg-page px-3 py-2 outline-none focus:border-accent disabled:opacity-50"
                value={form.user}
                onChange={(event) => {
                  setForm({ ...form, user: event.target.value });
                  setTested(false);
                }}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              密码
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                disabled={clearPassword}
                placeholder={hasPassword ? '留空保留已保存的密码' : undefined}
                className="min-w-0 rounded-lg border bg-page px-3 py-2 outline-none focus:border-accent disabled:opacity-50"
                value={form.password}
                onChange={(event) => {
                  setForm({ ...form, password: event.target.value });
                  setTested(false);
                }}
              />
            </label>
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
