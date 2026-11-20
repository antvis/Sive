import { useEffect, useId, useRef, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { toast } from 'sonner';
import type { DataSourceConfig } from '@antv/ava';
import type { DatasetDetail } from '@shared/api';
import { Button } from '../../../components/Button';
import { Modal } from '../../../components/Modal';
import { errorMessage } from '../../../utils';

export type ConnectionDialogProps = {
  datasetId?: string;
  onClose: () => void;
};

export function ConnectionField({
  label,
  onValueChange,
  type = 'text',
  required = true,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  label: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      {label}
      <input
        type={type}
        required={required}
        pattern={type === 'text' && required ? '.*\\S.*' : undefined}
        autoComplete={type === 'password' ? 'new-password' : 'off'}
        className="min-w-0 rounded-lg border bg-page px-3 py-2 outline-none focus:border-accent disabled:opacity-50"
        {...props}
        onChange={(event) => onValueChange(event.target.value)}
      />
    </label>
  );
}

export function ConnectionDialog({
  datasetId,
  onClose,
  label,
  name,
  sourceConfig,
  authSessionId,
  submitDisabled = false,
  onLoad,
  children,
}: ConnectionDialogProps & {
  label: string;
  name: string;
  sourceConfig: DataSourceConfig;
  authSessionId?: string;
  submitDisabled?: boolean;
  onLoad: (connection: DatasetDetail) => void;
  children: ReactNode;
}) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(Boolean(datasetId));
  const [busy, setBusy] = useState<'test' | 'save' | null>(null);
  const [error, setError] = useState('');
  const [tested, setTested] = useState(false);

  useEffect(() => {
    if (!datasetId) return;
    let live = true;
    window.workbench
      .datasetGet(datasetId)
      .then((connection) => {
        if (!live) return;
        if (!connection) throw new Error('数据源不存在或已删除。');
        onLoad(connection);
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
  }, [datasetId, onLoad]);

  const submit = async (action: 'test' | 'save') => {
    if (busy || loading || submitDisabled || !formRef.current?.reportValidity()) return;
    setError('');
    setTested(false);
    setBusy(action);
    try {
      if (action === 'test') {
        await window.workbench.datasetTest(sourceConfig, authSessionId);
        setTested(true);
      } else {
        await window.workbench.datasetSave(name, sourceConfig, datasetId, authSessionId);
        toast.success(datasetId ? `${label} 连接已更新` : `${label} 数据源已添加`);
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
      title={datasetId ? `编辑 ${label} 连接` : `连接 ${label}`}
      footer={
        <>
          <Button disabled={loading || !!busy || submitDisabled} onClick={() => submit('test')}>
            {busy === 'test' ? '正在测试…' : '测试连接'}
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            disabled={loading || !!busy || submitDisabled}
          >
            {busy === 'save' ? '正在保存…' : '保存连接'}
          </Button>
        </>
      }
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">正在读取连接…</p>
      ) : (
        <form
          id={formId}
          ref={formRef}
          onChange={() => setTested(false)}
          onSubmit={(event) => {
            event.preventDefault();
            submit('save');
          }}
          className="grid gap-3"
        >
          <fieldset disabled={!!busy} className="m-0 grid gap-3 border-0 p-0">
            {children}
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
