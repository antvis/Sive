import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { modelInputSchema } from '../../shared/input-schemas';
import {
  Alert,
  useUI,
  Button,
  Form,
  Field,
  useForm,
  Input,
  PasswordInput,
  Modal,
  ConfirmAction,
  Tag,
} from './ui';
import type { ModelInput, ModelProfile, ModelTestProgress, State } from '../../shared/contracts';
import { errorMessage } from '../shared/feedback';
import ModelPicker from './ModelPicker';
import { CpuIcon, PlusIcon } from '@phosphor-icons/react';
const api = window.workbench;
export default function ModelSettings({ state }: { state: State }) {
  const { message } = useUI();
  const [edit, setEdit] = useState<ModelProfile | 'new' | null>(null);
  const [busy, setBusy] = useState(false);
  const form = useForm<ModelInput>({ mode: 'onChange', resolver: zodResolver(modelInputSchema) });
  const [discovering, setDiscovering] = useState(false);
  const [testProgress, setTestProgress] = useState<ModelTestProgress | null>(null);
  const [catalog, setCatalog] = useState<{ baseURL: string; apiKey: string; ids: string[] } | null>(null);
  const [catalogError, setCatalogError] = useState('');
  const baseURL = form.watch('baseURL');
  const apiKey = form.watch('apiKey') || '';
  const currentCatalog = catalog && catalog.baseURL === baseURL && catalog.apiKey === apiKey ? catalog : null;
  const startEdit = (model?: ModelProfile) => {
    form.reset(
      model
        ? {
            ...model,
            apiKey: '',
            credentialSourceId: model.id,
          }
        : { name: '', modelIds: [], baseURL: '', apiKey: '' },
    );
    setCatalog(null);
    setCatalogError('');
    setEdit(model || 'new');
  };
  const discover = async () => {
    if (!(await form.trigger('baseURL', { shouldFocus: true }))) return;
    setDiscovering(true);
    setBusy(true);
    setCatalogError('');
    setCatalog(null);
    const input = form.getValues();
    try {
      const ids = await api.listModels({
        baseURL: input.baseURL,
        apiKey: input.apiKey,
        credentialSourceId: input.credentialSourceId,
      });
      setCatalog({ baseURL: input.baseURL, apiKey: input.apiKey || '', ids });
    } catch (error) {
      setCatalogError(errorMessage(error));
    } finally {
      setBusy(false);
      setDiscovering(false);
    }
  };
  const perform = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section>
      <div className="flex items-start justify-between gap-4 mt-0 mr-0 mb-7 ml-0 flex-wrap">
        <div>
          <h2 className="m-0 text-heading tracking-[-0.03em]">模型服务</h2>
          <p className="mt-2 mr-0 mb-0 ml-0 text-muted text-body">
            连接兼容 OpenAI 的服务，获取并选择可用模型。
          </p>
        </div>
        <Button variant="primary" icon={<PlusIcon />} disabled={busy} onClick={() => startEdit()}>
          添加服务
        </Button>
      </div>
      {state.models.map((model) => (
        <div
          className="flex items-center gap-5 p-5.5 border border-line rounded-card mb-3.5 flex-wrap [&:has(.ui-badge[data-tone='success'])]:border-[color-mix(in_srgb,_var(--accent)_40%,_var(--border))] [&_>_div_>_.ui-badge]:ml-2.5"
          key={model.id}
        >
          <div className="[&:first-child]:flex-1 [&:first-child]:min-w-[min(240px,_100%)] [&:first-child]:wrap-anywhere">
            <strong className="text-label">{model.name}</strong>
            {state.activeModelId === model.id && <Tag color="success">默认服务</Tag>}
            <p className="text-muted my-2 mx-0 text-helper">
              {model.modelIds.length} 个模型 · {model.baseURL}
            </p>
            <p className="text-muted my-2 mx-0 text-helper">{model.modelIds.join('、')}</p>
            <small className="text-muted text-caption">
              {model.testedAt ? `最近测试：${new Date(model.testedAt).toLocaleString()}` : '尚未验证'}
            </small>
          </div>
          <div className="flex items-center flex-wrap gap-2 [&:first-child]:flex-1 [&:first-child]:min-w-[min(240px,_100%)] [&:first-child]:wrap-anywhere">
            {state.activeModelId !== model.id && (
              <Button disabled={busy} onClick={() => perform(() => api.activateModel(model.id))}>
                设为默认
              </Button>
            )}
            <Button disabled={busy} onClick={() => startEdit(model)}>
              编辑
            </Button>
            <ConfirmAction
              title="删除此服务及其模型配置？"
              onConfirm={() => perform(() => api.deleteModel(model.id))}
            >
              <Button danger disabled={busy}>
                删除
              </Button>
            </ConfirmAction>
          </div>
        </div>
      ))}
      {!state.models.length && (
        <div className="grid justify-items-center text-center py-14 px-6 border border-dashed border-line rounded-[12px] [&_>_svg]:text-accent-ink">
          <CpuIcon size={32} />
          <h3 className="mt-4.5 mr-0 mb-2 ml-0 text-title font-medium">连接你的第一个模型服务</h3>
          <p className="mt-0 mr-0 mb-6 ml-0 text-muted leading-[1.8]">
            支持兼容 OpenAI 接口的云端或本地服务。
            <br />
            添加服务并验证模型后，就可以开始分析。
          </p>
          <Button icon={<PlusIcon />} onClick={() => startEdit()}>
            添加模型服务
          </Button>
        </div>
      )}
      <Modal
        width={560}
        title={edit === 'new' ? '添加模型服务' : '编辑模型服务'}
        open={!!edit}
        confirmLoading={busy}
        okButtonProps={{ 'aria-label': '测试并保存', disabled: busy }}
        cancelButtonProps={{ disabled: busy }}
        okText="测试并保存"
        cancelText="取消"
        onCancel={() => !busy && setEdit(null)}
        onOk={async () => {
          if (!(await form.trigger(undefined, { shouldFocus: true }))) return;
          const input = form.getValues();
          perform(async () => {
            setTestProgress({ completed: 0, total: input.modelIds.length, active: [] });
            const unsubscribe = api.onModelTest(setTestProgress);
            try {
              await api.saveModel({ ...input, id: edit && edit !== 'new' ? edit.id : undefined });
              setEdit(null);
              message.success('模型测试通过并已保存');
            } finally {
              unsubscribe();
              setTestProgress(null);
            }
          });
        }}
      >
        <Form form={form} disabled={busy} onValuesChange={() => setCatalogError('')}>
          <Field name="baseURL" label="服务地址" required>
            <Input placeholder="https://example.com/v1" />
          </Field>
          <Field
            name="apiKey"
            label="密钥"
            extra={
              form.getValues('credentialSourceId')
                ? '留空复用此服务已保存的密钥；修改服务地址后需重新填写。'
                : '密钥将加密保存；本地无认证服务可留空。'
            }
          >
            <PasswordInput autoComplete="new-password" />
          </Field>
          <div className="flex items-center flex-wrap gap-2 mt-1 mr-0 mb-4 ml-0">
            <Button disabled={busy} loading={discovering} onClick={() => discover()}>
              {currentCatalog ? '刷新模型列表' : '获取可用模型'}
            </Button>
            <span className="text-[12px] text-muted" role="status">
              {discovering
                ? '正在获取…'
                : currentCatalog
                  ? currentCatalog.ids.length
                    ? `获取到 ${currentCatalog.ids.length} 个模型`
                    : '未返回模型，请手动填写名称'
                  : '填写服务地址和密钥后获取'}
            </span>
          </div>
          {catalogError && <Alert type="error" title={catalogError} />}
          <Field name="modelIds" label="启用模型" required>
            <ModelPicker options={currentCatalog?.ids || []} />
          </Field>
          <Field name="name" label="服务名称" required>
            <Input placeholder="例如：DeepSeek、公司模型服务" />
          </Field>
          <p className="text-[12px] text-muted">
            最多同时测试 3 个模型，单个测试限时 30 秒。地址和密钥未变时，已验证模型无需重复测试。
          </p>
          {testProgress && (
            <div role="status">
              <Alert
                type="info"
                title={`验证进度：${testProgress.completed} / ${testProgress.total}${
                  testProgress.active.length
                    ? ` · 正在测试：${testProgress.active.join('、')}`
                    : ' · 正在保存配置…'
                }`}
              />
            </div>
          )}
        </Form>
      </Modal>
    </section>
  );
}
