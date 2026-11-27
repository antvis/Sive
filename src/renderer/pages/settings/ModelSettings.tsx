import { useI18n } from '../../i18n';
import { CpuIcon, PencilIcon, PlusIcon, RotateCwIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/dialog';
import { SelectField } from '../../components/ui/select';
import type { ModelProfile, ModelTestProgress } from '../../types';
import { errorMessage } from '../../utils';
import { ModelPicker } from './ModelPicker';
import { SettingField } from './SettingControls';

type Catalog = { baseURL: string; apiKey: string; ids: string[] };

function ModelEditor({ model, onClose }: { model?: ModelProfile; onClose: () => void }) {
  const i18n = useI18n();
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
  const discoverLabel = currentCatalog
    ? i18n('settings.models.actions.refreshList')
    : i18n('settings.models.actions.fetchList');

  const discover = async () => {
    if (!baseURL.trim()) {
      setError(i18n('errors.model.urlRequired'));
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
      setError(i18n('errors.model.requiredFields'));
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
      toast.success(i18n('settings.models.notifications.saved'));
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
      ? i18n('settings.models.modelCount', [currentCatalog.ids.length])
      : i18n('settings.models.empty.list')
    : '';

  return (
    <Modal
      open
      onOpenChange={() => !saving && onClose()}
      title={model ? i18n('settings.models.editTitle') : i18n('settings.models.addTitle')}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            {i18n('common.actions.cancel')}
          </Button>
          <Button variant="primary" type="submit" form="model-form" disabled={saving || discovering}>
            {saving
              ? i18n('settings.models.status.testingAndSaving')
              : i18n('settings.models.actions.testAndSave')}
          </Button>
        </>
      }
    >
      <form id="model-form" onSubmit={(event) => void save(event)}>
        <fieldset disabled={saving} className="grid min-w-0 gap-4 border-0 p-0">
          <SettingField
            label={i18n('settings.models.fields.nameTitle')}
            description={i18n('settings.models.fields.nameDescription')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={i18n('settings.models.fields.namePlaceholder')}
            required
          />
          <SettingField
            label={i18n('settings.models.fields.urlTitle')}
            description={i18n('settings.models.fields.urlDescription')}
            value={baseURL}
            onChange={(e) => setBaseURL(e.target.value)}
            placeholder="https://example.com/v1"
            required
          />
          <SettingField
            label={i18n('settings.models.fields.apiKeyTitle')}
            description={i18n('settings.models.fields.apiKeyDescription')}
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={
              model?.hasKey
                ? i18n('settings.models.fields.apiKeyReusePlaceholder')
                : i18n('settings.models.fields.apiKeyOptionalPlaceholder')
            }
          />
          <div className="grid gap-1.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span>{i18n('settings.models.enabledTitle')}</span>
                <span className="text-xs text-muted-foreground">
                  {i18n('settings.models.selectedCount', [modelIds.length])}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {catalogHint && <span className="text-xs text-muted-foreground">{catalogHint}</span>}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={discoverLabel}
                  title={discoverLabel}
                  className="text-black/50 dark:text-white/50"
                  disabled={discovering}
                  onClick={() => void discover()}
                >
                  <RotateCwIcon
                    className={discovering ? 'size-[16px] animate-spin' : 'size-[16px]'}
                    aria-hidden
                  />
                </Button>
              </div>
            </div>
            <p className="m-0 text-xs text-muted-foreground">
              {i18n('settings.models.selectionDescription')}
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
          <div className="mt-4 rounded-lg bg-workspace-control p-3 text-sm leading-5 text-ink" role="status">
            {i18n('settings.models.testProgress', [
              progress.completed,
              progress.total,
              progress.active.length
                ? i18n('settings.models.testingModelSuffix', [progress.active.join('、')])
                : i18n('settings.models.savingConfigurationSuffix'),
            ])}
          </div>
        )}
        {error && <p className="mt-4 mb-0 text-sm text-danger">{error}</p>}
      </form>
    </Modal>
  );
}

export function ModelSettings({ models, activeModelId }: { models: ModelProfile[]; activeModelId: string }) {
  const i18n = useI18n();
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
      {i18n('settings.models.actions.add')}
    </Button>
  );

  return (
    <section>
      {models.length > 0 && <div className="mb-5 flex justify-end">{addService}</div>}
      {error && <p className="mt-0 text-sm text-danger">{error}</p>}
      <div className="grid gap-3">
        {models.map((model) => (
          <article key={model.id} className="group rounded-2xl bg-page p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="m-0 truncate text-base font-semibold">{model.name}</h2>
                {activeModelId === model.id && (
                  <Badge className="bg-accent text-accent-foreground">
                    {i18n('settings.models.defaultProvider')}
                  </Badge>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-sm:opacity-100">
                {activeModelId !== model.id && (
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      void perform(
                        () => window.workbench.modelActivate(model.id),
                        i18n('settings.models.notifications.defaultProviderUpdated'),
                      )
                    }
                  >
                    {i18n('settings.models.actions.setDefault')}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={i18n('common.actions.editLabel', [model.name])}
                  title={i18n('common.actions.editLabel', [model.name])}
                  disabled={busy}
                  onClick={() => setEditing(model)}
                >
                  <PencilIcon className="size-[16px]" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={i18n('common.actions.deleteLabel', [model.name])}
                  title={i18n('common.actions.deleteLabel', [model.name])}
                  disabled={busy}
                  onClick={() => setDeleting(model)}
                >
                  <Trash2Icon className="size-[16px]" aria-hidden />
                </Button>
              </div>
            </div>

            <dl className="mt-4 grid gap-2 text-sm leading-5">
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 text-muted-foreground">
                  {i18n('settings.models.fields.urlTitle')}
                </dt>
                <dd className="m-0 min-w-0 break-all text-ink">{model.baseURL}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 text-muted-foreground">
                  {i18n('settings.models.availableTitle')}
                </dt>
                <dd className="m-0 min-w-0 leading-5 text-ink">
                  {model.modelIds.join('、')}
                  <span className="ml-2 text-muted-foreground">
                    {i18n('settings.models.availableCount', [model.modelIds.length])}
                  </span>
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                {i18n('settings.models.updatedAt', [new Date(model.updatedAt).toLocaleString(i18n.locale)])}
              </span>
              {activeModelId === model.id && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <div className="grid gap-1">
                    <span>{i18n('settings.models.defaultModelTitle')}</span>
                    <span className="text-xs text-muted-foreground">
                      {i18n('settings.models.defaultModelDescription')}
                    </span>
                  </div>
                  <SelectField
                    aria-label={i18n('settings.models.defaultModelTitle')}
                    value={model.model}
                    disabled={busy}
                    onChange={(selected) =>
                      void perform(
                        () => window.workbench.modelActivate(model.id, selected),
                        i18n('settings.models.notifications.defaultModelUpdated'),
                      )
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
          <h2 className="m-0 text-base font-medium">{i18n('settings.models.empty.title')}</h2>
          <p className="m-0 leading-6 text-muted-foreground">{i18n('settings.models.empty.description')}</p>
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
        title={i18n('settings.models.deleteTitle')}
        footer={
          <>
            <Button onClick={() => setDeleting(null)}>{i18n('common.actions.cancel')}</Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() =>
                void perform(async () => {
                  await window.workbench.modelDelete(deleting!.id);
                  setDeleting(null);
                }, i18n('settings.models.notifications.deleted'))
              }
            >
              {i18n('common.actions.delete')}
            </Button>
          </>
        }
      >
        <p className="m-0 leading-6 text-muted-foreground">
          {i18n('settings.models.deleteDescription', [deleting?.name])}
        </p>
      </Modal>
    </section>
  );
}
