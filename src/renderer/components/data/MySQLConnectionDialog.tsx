import {
  Alert,
  Button,
  Form,
  Field,
  Input,
  PasswordInput,
  InputNumber,
  Modal,
} from '@renderer/components/ui/index';
import type { useDataSourceActions } from '@renderer/hooks/useDataSourceActions';

export default function MySQLConnectionDialog({
  editing,
  busy,
  form,
  feedback,
  setFeedback,
  cancelConnection,
  submit,
}: Pick<
  ReturnType<typeof useDataSourceActions>,
  'editing' | 'busy' | 'form' | 'feedback' | 'setFeedback' | 'cancelConnection' | 'submit'
>) {
  return (
    <Modal
      width={600}
      title={editing === 'new' ? '连接 MySQL' : '编辑 MySQL 连接'}
      open={!!editing}
      onCancel={cancelConnection}
      footer={
        <>
          <Button disabled={!!busy} onClick={cancelConnection}>
            取消
          </Button>
          <Button loading={busy === 'test'} disabled={!!busy} onClick={() => submit(false)}>
            测试连接
          </Button>
          <Button variant="primary" loading={busy === 'save'} disabled={!!busy} onClick={() => submit(true)}>
            验证并保存
          </Button>
        </>
      }
    >
      <p className="mt-0 mb-4 text-muted">
        验证包含建立连接、读取表结构和首表抽样。不会全库扫描；账号权限决定可读取范围。当前不支持 SSH 配置。
      </p>
      <Form form={form} disabled={!!busy} onValuesChange={() => setFeedback(null)}>
        <Field name="name" label="连接名称" required>
          <Input placeholder="例如：业务分析库" />
        </Field>
        <div className="grid grid-cols-[2fr_1fr] gap-4">
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
  );
}
