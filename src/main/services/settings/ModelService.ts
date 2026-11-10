import { parseInput } from '../../utils/input';
import type { ModelProviderRepo } from '../../db/repository/ModelProviderRepo';
import type { DbService } from '../../db/DbService';
import type { SettingRepo } from '../../db/repository/SettingRepo';
import { isDeepStrictEqual } from 'node:util';
import { timestamp } from '../../utils/time';
import type { StoredModel } from '../../db/mappers';
import { modelConnectionSchema, modelInputSchema } from '@shared/inputSchemas';
import { WorkbenchError } from '@shared/errors';
import { createModel } from '../../ai/provider';
import { APICallError, generateText } from 'ai';
import { randomUUID } from 'node:crypto';
import type { ModelConnectionInput, ModelInput, ModelTestProgress } from '@shared/contracts';

export class ModelCredentialError extends WorkbenchError {
  constructor() {
    super('CREDENTIALS', '无法读取此模型已保存的密钥，请在设置中重新填写密钥并验证保存。');
    this.name = 'ModelCredentialError';
  }
}

export class ModelService {
  constructor(
    private database: DbService,
    private providers: ModelProviderRepo,
    private settings: SettingRepo,
    private encrypt: (s: string) => string,
    private decrypt: (s: string) => string,
    private change: () => void,
  ) {}

  private encryptedKey(input: ModelConnectionInput) {
    if (input.apiKey) return this.encrypt(input.apiKey);
    if (!input.credentialSourceId) return undefined;
    const source = this.profiles().find((m) => m.id === input.credentialSourceId);
    if (!source) throw new WorkbenchError('CONFLICT', '原模型配置已移除，请重新打开设置');
    if (source.baseURL.replace(/\/+$/, '') !== input.baseURL.replace(/\/+$/, ''))
      throw new WorkbenchError('MODEL', '服务地址已变化，请重新填写密钥；无认证服务请新建配置');
    return source.encryptedKey;
  }

  private decryptKey(encrypted?: string) {
    try {
      return encrypted ? this.decrypt(encrypted) : '';
    } catch {
      throw new ModelCredentialError();
    }
  }

  async list(input: ModelConnectionInput): Promise<string[]> {
    input = parseInput(modelConnectionSchema, input);
    const key = this.decryptKey(this.encryptedKey(input));
    try {
      const response = await fetch(input.baseURL.replace(/\/+$/, '') + '/models', {
        headers: key ? { Authorization: `Bearer ${key}` } : {},
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403)
          throw new WorkbenchError('MODEL', '无法获取模型列表，请检查密钥和访问权限。');
        if (response.status === 429)
          throw new WorkbenchError(
            'MODEL',
            '获取模型列表被限流（HTTP 429），请稍后重试并确认填写的是 API 服务地址。',
          );
        throw new WorkbenchError(
          'MODEL',
          `服务未能提供模型列表（HTTP ${response.status}），请确认 API 服务地址，或手动添加模型 ID。`,
        );
      }
      if (response.headers.get('content-type')?.toLowerCase().includes('text/html'))
        throw new WorkbenchError(
          'MODEL',
          '服务返回了网页，请填写 API 服务地址，而非管理控制台或登录页面地址。',
        );
      const body = await response.json();
      if (!Array.isArray(body?.data))
        throw new WorkbenchError('MODEL', '服务返回的模型列表格式不兼容，可手动填写模型名称。');
      return [
        ...new Set<string>(
          body.data.flatMap((item: unknown) => {
            const id = item && typeof item === 'object' && 'id' in item ? item.id : undefined;
            return typeof id === 'string' && id.trim() ? [id.trim()] : [];
          }),
        ),
      ].sort((a, b) => a.localeCompare(b));
    } catch (error) {
      if (error instanceof WorkbenchError) throw error;
      if (error instanceof SyntaxError)
        throw new WorkbenchError(
          'MODEL',
          '模型列表响应不是有效 JSON，请确认 API 服务地址和服务的模型列表接口。',
        );
      if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name))
        throw new WorkbenchError('MODEL', '获取模型列表超时（15 秒），请检查网络连接或稍后重试。');
      throw new WorkbenchError('MODEL', '无法连接模型列表接口，请检查 API 服务地址、网络、代理或证书配置。');
    }
  }

  model(profile: StoredModel, signal?: AbortSignal): ReturnType<typeof createModel> {
    const key = this.decryptKey(profile.encryptedKey);
    return createModel(profile.baseURL, key, profile.model, signal);
  }

  active() {
    const models = this.profiles();
    const activeModelId = this.activeModelId;
    const p = models.find((m) => m.id === activeModelId);
    if (!p) throw new WorkbenchError('MODEL', '请先在模型设置中新增并测试一个模型');
    if (!p.modelIds.includes(p.model))
      throw new WorkbenchError('MODEL', '请在模型服务设置中选择并保存启用的模型');
    return p;
  }

  async save(input: ModelInput, onProgress?: (progress: ModelTestProgress) => void) {
    input = parseInput(modelInputSchema, input);
    const old = this.profiles().find((m) => m.id === input.id);
    if (input.id && !old) throw new WorkbenchError('CONFLICT', '模型已移除，请重新打开设置');
    const modelIds = [...new Set(input.modelIds.map((id) => id.trim()))];
    const p: StoredModel = {
      id: old?.id || randomUUID(),
      name: input.name.trim(),
      model: old && modelIds.includes(old.model) ? old.model : modelIds[0],
      modelIds,
      baseURL: input.baseURL.replace(/\/$/, ''),
      encryptedKey: this.encryptedKey({ ...input, credentialSourceId: old?.id || input.credentialSourceId }),
    };
    // Reuse successful checks only when the service and saved credentials are unchanged.
    const reusable = old && old.baseURL === p.baseURL && !input.apiKey;
    const pending = reusable ? modelIds.filter((id) => !old.modelIds.includes(id)) : modelIds;
    const abort = new AbortController();
    const active = new Set<string>();
    let next = 0;
    let completed = modelIds.length - pending.length;
    let failure: unknown;
    const report = () => onProgress?.({ completed, total: modelIds.length, active: [...active] });
    report();
    const worker = async () => {
      while (!abort.signal.aborted && next < pending.length) {
        const model = pending[next++];
        active.add(model);
        report();
        try {
          await generateText({
            model: this.model({ ...p, model }),
            prompt: 'Reply with OK.',
            maxRetries: 0,
            abortSignal: abort.signal,
            timeout: 30000,
          });
          completed++;
        } catch (error) {
          if (!abort.signal.aborted) {
            failure =
              error instanceof ModelCredentialError
                ? error
                : new WorkbenchError(
                    'MODEL',
                    error instanceof Error && error.name === 'TimeoutError'
                      ? `模型「${model}」测试超时（30 秒），配置未保存。服务繁忙或模型响应较慢均可能导致超时，不代表模型不可用，请稍后重试。`
                      : APICallError.isInstance(error) && [429, 503].includes(error.statusCode ?? 0)
                        ? `模型「${model}」服务繁忙或请求被限流（HTTP ${error.statusCode}），配置未保存，请稍后重试。`
                        : `模型「${model}」测试失败，整个服务配置未保存。请检查模型权限、密钥及接口兼容性。`,
                  );
            abort.abort();
          }
        } finally {
          active.delete(model);
          report();
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, pending.length) }, worker));
    if (failure) throw failure;
    this.saveProfile(p, old);
    this.change();
  }

  activate(id: string, model?: string) {
    const profiles = this.profiles();
    const profile = profiles.find((entry) => entry.id === id);
    if (!profile) throw new WorkbenchError('MODEL', '模型不存在');
    const selected = model ?? profile.model;
    this.activateProfile(id, selected);
    this.change();
  }

  private get activeModel() {
    return this.settings.get('active_model')?.value as
      { provider_id: string; model_name: string } | null | undefined;
  }

  // Called only within the owning model operation's transaction.
  private setActiveModel(value: { provider_id: string; model_name: string } | null) {
    const key = 'active_model';
    const now = timestamp();
    if (!this.settings.update(key, { value, updatedAt: now }))
      this.settings.insert({ key, value, createdAt: now, updatedAt: now });
  }

  get activeModelId() {
    return this.activeModel?.provider_id || '';
  }

  profiles() {
    const selected = this.activeModel;
    return this.providers.list().map((row) => {
      const modelIds = row.modelNames;
      return {
        id: row.id,
        name: row.name,
        baseURL: row.baseUrl,
        modelIds,
        model: selected?.provider_id === row.id ? selected.model_name : modelIds[0],
        encryptedKey: row.encryptedKey ?? undefined,
        updatedAt: row.updatedAt,
      };
    });
  }

  private saveProfile(model: StoredModel, expected?: StoredModel) {
    this.database.write(() => {
      const current = this.profiles().find((entry) => entry.id === model.id);
      if (expected ? !current || !isDeepStrictEqual(current, expected) : !!current)
        throw new WorkbenchError('CONFLICT', '模型已被修改或移除，请重新打开设置');
      const now = timestamp(current?.updatedAt);
      const values = {
        name: model.name,
        modelNames: model.modelIds,
        baseUrl: model.baseURL,
        encryptedKey: model.encryptedKey ?? null,
        updatedAt: now,
      };
      if (current) {
        if (!this.providers.update(model.id, values))
          throw new WorkbenchError('CONFLICT', '模型已被修改或移除，请重新打开设置');
      } else this.providers.insert({ id: model.id, createdAt: now, ...values });
      if (!this.activeModel || this.activeModel.provider_id === model.id)
        this.setActiveModel({ provider_id: model.id, model_name: model.model });
    });
  }

  private activateProfile(id: string, model: string) {
    this.database.write(() => {
      if (
        !this.profiles()
          .find((entry) => entry.id === id)
          ?.modelIds.includes(model)
      )
        throw new WorkbenchError('CONFLICT', '模型不存在或未配置');
      this.setActiveModel({ provider_id: id, model_name: model });
    });
  }

  delete(id: string) {
    this.database.write(() => {
      this.providers.update(id, { encryptedKey: null });
      this.providers.remove(id);
      if (this.activeModel?.provider_id === id) {
        const next = this.profiles()[0];
        this.setActiveModel(next ? { provider_id: next.id, model_name: next.modelIds[0] } : null);
      }
    });
    this.change();
  }
}
