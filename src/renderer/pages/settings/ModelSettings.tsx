import { CpuIcon, PencilIcon, PlusIcon, RotateCwIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { Modal } from '../../components/Modal';
import { Select } from '../../components/Select';
import type { ModelProfile, ModelTestProgress } from '../../types';
import { errorMessage } from '../../utils';
import { ModelPicker } from './ModelPicker';
import { SettingField } from './SettingControls';

type Catalog = { baseURL: string; apiKey: string; ids: string[] };

function ModelEditor({ model, onClose }: { model?: ModelProfile; onClose: () => void }) {
  const [name, setName] = useState(model?.name ?? '');
  const [baseURL, setBaseURL] = useState(model?.baseURL ?? '');
  const [apiKey, setApiKey] = useState('');
  const [modelIds, setModelIds] = useState(model?.modelIds ?? []);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<ModelTestProgress | null>(null);
  const [error, setError] = useState('');
  const currentCatalog =
    catalog && catalog.baseURL === baseURL.trim() && catalog.apiKey === apiKey ? catalog : null;

  const discover = async () => {
    if (!baseURL.trim()) {
      setError('请先填写服务地址。');
      return;
    }
    setDiscovering(true);
    setError('');
    try {
      const ids = await window.workbench.modelListAvailable({
        baseURL: baseURL.trim(),
        apiKey,
        credentialSourceId: model?.id,
      });
      setCatalog({ baseURL: baseURL.trim(), apiKey, ids });
    } catch (cause) {
      setCatalog(null);
      setError(errorMessage(cause));
    } finally {
      setDiscovering(false);
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !baseURL.trim() || !modelIds.length) {
      setError('请填写服务名称、服务地址，并至少选择一个模型。');
      return;
    }
    setSaving(true);
    setError('');
    setProgress({ completed: 0, total: modelIds.length, active: [] });
    const unsubscribe = window.workbench.modelOnTestProgress(setProgress);
    try {
      await window.workbench.modelSave({
        id: model?.id,
        name: name.trim(),
        baseURL: baseURL.trim(),
        apiKey,
        modelIds,
        credentialSourceId: model?.id,
      });
      toast.success('模型测试通过并已保存');
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      unsubscribe();
      setProgress(null);
      setSaving(false);
    }
  };

  const catalogHint = currentCatalog
    ? currentCatalog.ids.length
      ? `${currentCatalog.ids.length} 个模型`
      : '未返回模型，请手动添加'
    : '';

  return (
    <Modal
      open
      onOpenChange={() => !saving && onClose()}
      title={model ? '编辑模型服务' : '添加模型服务'}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button variant="primary" type="submit" form="model-form" disabled={saving || discovering}>
            {saving ? '测试并保存中…' : '测试并保存'}
          </Button>
        </>
      }
    >
      <form id="model-form" onSubmit={(event) => void save(event)}>
        <fieldset disabled={saving} className="grid min-w-0 gap-4 border-0 p-0">
          <SettingField
            label="服务名称"
            description="用来区分不同的模型服务"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：云端模型服务"
            required
          />
          <SettingField
            label="服务地址"
            description="填写服务商提供的 API 基础地址"
            value={baseURL}
            onChange={(e) => setBaseURL(e.target.value)}
            placeholder="https://example.com/v1"
            required
          />
          <SettingField
            label="密钥"
            description="服务要求认证时，填写服务商提供的 API 密钥"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={model?.hasKey ? '留空复用已保存的密钥' : '本地无认证服务可留空'}
          />
          <div className="grid gap-1.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span>启用模型</span>
                <span className="text-xs text-muted-foreground">已选择 {modelIds.length} 个</span>
              </div>
              <div className="flex items-center gap-2">
                {catalogHint && <span className="text-xs text-muted-foreground">{catalogHint}</span>}
                <IconButton
                  icon={RotateCwIcon}
                  iconClassName={discovering ? 'animate-spin' : undefined}
                  className="text-accent hover:bg-accent-soft"
                  disabled={discovering}
                  onClick={() => void discover()}
                  label={currentCatalog ? '刷新模型列表' : '获取可用模型'}
                />
              </div>
            </div>
            <p className="m-0 text-xs text-muted-foreground">
              从列表中选择要启用的模型，也可以手动添加模型 ID
            </p>
            <ModelPicker
              options={currentCatalog?.ids ?? []}
              value={modelIds}
              onChange={setModelIds}
              disabled={saving}
            />
          </div>
        </fieldset>
        {progress && (
          <div className="mt-4 rounded-lg bg-accent-soft p-3 text-sm leading-5 text-accent" role="status">
            已完成 {progress.completed} / {progress.total}
            {progress.active.length ? `，正在测试：${progress.active.join('、')}` : '，正在保存配置…'}
          </div>
        )}
        {error && <p className="mt-4 mb-0 text-sm text-danger">{error}</p>}
      </form>
    </Modal>
  );
}

export function ModelSettings({ models, activeModelId }: { models: ModelProfile[]; activeModelId: string }) {
  const [editing, setEditing] = useState<ModelProfile | 'new' | null>(null);
  const [deleting, setDeleting] = useState<ModelProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const perform = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    setError('');
    try {
      await action();
      toast.success(success);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const addService = (
    <Button variant="primary" onClick={() => setEditing('new')}>
      <PlusIcon size={16} />
      添加服务
    </Button>
  );

  return (
    <section>
      {models.length > 0 && <div className="mb-5 flex justify-end">{addService}</div>}
      {error && <p className="mt-0 text-sm text-danger">{error}</p>}
      <div className="grid gap-3">
        {models.map((model) => (
          <article key={model.id} className="group rounded-xl bg-workspace-control/70 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="m-0 truncate text-base font-semibold">{model.name}</h2>
                {activeModelId === model.id && (
                  <span className="shrink-0 rounded-md bg-accent-soft px-2 py-0.5 text-xs text-accent">
                    默认服务
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-sm:opacity-100">
                {activeModelId !== model.id && (
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      void perform(() => window.workbench.modelActivate(model.id), '已设为默认服务')
                    }
                  >
                    设为默认
                  </Button>
                )}
                <IconButton
                  icon={PencilIcon}
                  label={`编辑 ${model.name}`}
                  disabled={busy}
                  onClick={() => setEditing(model)}
                />
                <IconButton
                  icon={Trash2Icon}
                  label={`删除 ${model.name}`}
                  disabled={busy}
                  onClick={() => setDeleting(model)}
                />
              </div>
            </div>

            <dl className="mt-4 grid gap-2 text-sm leading-5">
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 text-muted-foreground">服务地址</dt>
                <dd className="m-0 min-w-0 break-all text-ink">{model.baseURL}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 text-muted-foreground">可用模型</dt>
                <dd className="m-0 min-w-0 leading-5 text-ink">
                  {model.modelIds.join('、')}
                  <span className="ml-2 text-muted-foreground">（{model.modelIds.length} 个）</span>
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                最近更新：{new Date(model.updatedAt).toLocaleString('zh-CN')}
              </span>
              {activeModelId === model.id && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <div className="grid gap-1">
                    <span>默认模型</span>
                    <span className="text-xs text-muted-foreground">分析对话会预选此模型</span>
                  </div>
                  <Select
                    compact
                    aria-label="默认模型"
                    value={model.model}
                    disabled={busy}
                    onChange={(selected) =>
                      void perform(() => window.workbench.modelActivate(model.id, selected), '默认模型已更新')
                    }
                    options={model.modelIds.map((id) => ({ value: id, label: id }))}
                  />
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
      {!models.length && (
        <div className="grid justify-items-center gap-3 px-6 py-14 text-center">
          <CpuIcon size={32} className="text-accent" />
          <h2 className="m-0 text-base font-medium">连接你的第一个模型服务</h2>
          <p className="m-0 leading-6 text-muted-foreground">支持兼容 OpenAI 接口的云端或本地服务</p>
          <div className="mt-2">{addService}</div>
        </div>
      )}
      {editing && (
        <ModelEditor
          key={editing === 'new' ? 'new' : editing.id}
          model={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      <Modal
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="删除模型服务"
        footer={
          <>
            <Button onClick={() => setDeleting(null)}>取消</Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() =>
                void perform(async () => {
                  await window.workbench.modelDelete(deleting!.id);
                  setDeleting(null);
                }, '模型服务已删除')
              }
            >
              删除
            </Button>
          </>
        }
      >
        <p className="m-0 leading-6 text-muted-foreground">确定删除“{deleting?.name}”及其模型配置吗？</p>
      </Modal>
    </section>
  );
}
