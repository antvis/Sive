import { useRef, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Dataset } from '../../shared/contracts';
import { requiredText } from '../../shared/input-schemas';
import { queryClient } from '../shared/queries';
import { errorMessage } from '../shared/feedback';
import { Button, Field, Form, Input, Modal, useForm, useUI } from './ui';

const nameSchema = z.object({ name: requiredText('请填写连接名称') });

export default function LocalConnectionActions({
  dataset,
  disabled = false,
}: {
  dataset: Dataset;
  disabled?: boolean;
}) {
  const { message } = useUI();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState('');
  const lock = useRef(false);
  const form = useForm<{ name: string }>({ resolver: zodResolver(nameSchema) });
  const perform = async (operation: string, action: () => Promise<void>) => {
    if (lock.current || disabled) return;
    lock.current = true;
    setPending(operation);
    try {
      await action();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      lock.current = false;
      setPending('');
    }
  };
  const rename = form.handleSubmit(({ name }) =>
    perform('rename', async () => {
      await window.workbench.renameData(dataset.id, name.trim());
      setEditing(false);
      message.success('连接名称已修改');
    }),
  );
  if (dataset.format === 'mysql' || dataset.deletedAt) return null;
  return (
    <>
      <Button
        size="small"
        variant="ghost"
        disabled={disabled || !!pending}
        onClick={() => {
          form.reset({ name: dataset.name });
          setEditing(true);
        }}
      >
        修改名称
      </Button>
      <Button
        size="small"
        variant="ghost"
        disabled={disabled || !!pending}
        loading={pending === 'relocate'}
        onClick={() =>
          perform('relocate', async () => {
            if (await window.workbench.relocateData(dataset.id)) {
              await queryClient.invalidateQueries({ queryKey: ['preview', dataset.id] });
              message.success('源文件已重新连接');
            }
          })
        }
      >
        重新选择源文件
      </Button>
      <Modal
        title="修改连接名称"
        open={editing}
        onCancel={() => !pending && setEditing(false)}
        onOk={() => rename()}
        okText="保存"
        confirmLoading={pending === 'rename'}
        okButtonProps={{ disabled: disabled || !!pending }}
      >
        <Form form={form} disabled={disabled || !!pending}>
          <Field name="name" label="连接名称" required extra="仅修改显示名称，不会重命名磁盘文件。">
            <Input
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing && !event.repeat) {
                  event.preventDefault();
                  void rename();
                }
              }}
            />
          </Field>
        </Form>
      </Modal>
    </>
  );
}
