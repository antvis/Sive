import { randomUUID } from 'node:crypto';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';
import type { Repositories } from '../../db/repository';
import type { DBConnection } from '../../db/repository/db-connection';
import { decrypt, encrypt, required } from '../../util';
import type { ModelConnectionInput, ModelInput, ModelTestProgress } from '../types';

function modelURL(value: string) {
  const url = new URL(value);
  const localHTTP = url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !localHTTP) || url.username || url.password || url.search || url.hash) {
    throw new Error('服务地址需使用 HTTPS，或本机 HTTP 地址，且不能包含凭据、查询参数或锚点。');
  }
  return value.replace(/\/+$/, '');
}

function normalizeModelIds(ids: string[]) {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

export class ModelService {
  constructor(
    private database: DBConnection,
    private repositories: Repositories,
  ) {}

  private resolveEncryptedKey(input: ModelConnectionInput) {
    if (input.apiKey || !input.credentialSourceId) return null;
    const source = required(
      this.repositories.modelProviders.get(input.credentialSourceId),
      '凭据来源不存在。',
    );
    if (modelURL(source.baseUrl) !== input.baseURL) throw new Error('服务地址已修改，请重新填写密钥。');
    return source.encryptedKey;
  }

  list() {
    const active = this.repositories.settings.getActiveModel();
    return this.repositories.modelProviders.list().map((row) => ({
      id: row.id,
      name: row.name,
      model:
        active.providerId === row.id && active.model && row.modelNames.includes(active.model)
          ? active.model
          : (row.modelNames[0] ?? ''),
      modelIds: row.modelNames,
      baseURL: row.baseUrl,
      hasKey: Boolean(row.encryptedKey),
      updatedAt: row.updatedAt,
    }));
  }

  getDefaultModelConfig() {
    const active = this.repositories.settings.getActiveModel();
    if (!active.providerId) throw new Error('请先在设置中配置默认模型服务。');
    const provider = required(
      this.repositories.modelProviders.get(active.providerId),
      '默认模型服务不存在。',
    );
    const model =
      active.model && provider.modelNames.includes(active.model) ? active.model : provider.modelNames[0];
    if (!model) throw new Error('默认模型服务没有可用模型。');
    const apiKey = provider.encryptedKey ? decrypt(provider.encryptedKey) : undefined;
    return { baseURL: provider.baseUrl, model, apiKey };
  }

  async listAvailable(input: ModelConnectionInput) {
    const baseURL = modelURL(input.baseURL);
    const encryptedKey = this.resolveEncryptedKey({ ...input, baseURL });
    const apiKey = input.apiKey || (encryptedKey ? decrypt(encryptedKey) : undefined);
    const response = await fetch(`${baseURL}/models`, {
      headers: { Accept: 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`获取模型列表失败（HTTP ${response.status}）。`);
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || !('data' in body) || !Array.isArray(body.data)) {
      throw new Error('模型服务返回了无法识别的模型列表。');
    }
    return [
      ...new Set(
        body.data.flatMap((item) =>
          item && typeof item === 'object' && 'id' in item && typeof item.id === 'string' && item.id.trim()
            ? [item.id.trim()]
            : [],
        ),
      ),
    ];
  }

  async test(input: ModelInput, report: (progress: ModelTestProgress) => void) {
    const modelIds = normalizeModelIds(input.modelIds);
    if (!modelIds.length) throw new Error('请至少选择一个模型。');
    const baseURL = modelURL(input.baseURL);
    const existing = input.id
      ? required(this.repositories.modelProviders.get(input.id), '模型服务不存在。')
      : undefined;
    const encryptedKey = this.resolveEncryptedKey({ ...input, baseURL });
    const reusable =
      existing &&
      !input.apiKey &&
      modelURL(existing.baseUrl) === baseURL &&
      existing.encryptedKey === encryptedKey;
    const pending = reusable ? modelIds.filter((id) => !existing.modelNames.includes(id)) : modelIds;
    let completed = modelIds.length - pending.length;
    const active = new Set<string>();

    const progress = () => report({ completed, total: modelIds.length, active: [...active] });

    progress();
    if (!pending.length) return;

    const apiKey = input.apiKey || (encryptedKey ? decrypt(encryptedKey) : undefined);
    const provider = createOpenAICompatible({ name: 'sive', baseURL, apiKey });
    const abort = new AbortController();
    let cursor = 0;

    const worker = async () => {
      while (!abort.signal.aborted && cursor < pending.length) {
        const modelId = pending[cursor++];
        active.add(modelId);
        progress();
        try {
          await generateText({
            model: provider.chatModel(modelId),
            prompt: 'Reply with OK.',
            maxOutputTokens: 32,
            maxRetries: 0,
            abortSignal: abort.signal,
            timeout: 30_000,
          });
          completed += 1;
        } catch (error) {
          abort.abort(error);
          throw abort.signal.reason;
        } finally {
          active.delete(modelId);
          progress();
        }
      }
    };

    const results = await Promise.allSettled(Array.from({ length: Math.min(3, pending.length) }, worker));
    const failed = results.find((result) => result.status === 'rejected');
    if (failed) throw failed.reason;
  }

  save(input: ModelInput) {
    const baseURL = modelURL(input.baseURL);
    const now = new Date().toISOString();
    this.database.write(() => {
      const existing = input.id
        ? required(this.repositories.modelProviders.get(input.id), '模型服务不存在。')
        : undefined;
      const encryptedKey = input.apiKey
        ? encrypt(input.apiKey)
        : this.resolveEncryptedKey({ ...input, baseURL });
      const values = {
        name: input.name.trim(),
        modelNames: normalizeModelIds(input.modelIds),
        baseUrl: baseURL,
        encryptedKey,
        updatedAt: now,
      };
      if (existing) this.repositories.modelProviders.update(existing.id, values);
      else this.repositories.modelProviders.insert({ ...values, id: randomUUID(), createdAt: now });
    });
  }

  activate(id: string, model?: string) {
    const provider = required(this.repositories.modelProviders.get(id), '模型服务不存在。');
    if (model && !provider.modelNames.includes(model)) throw new Error('所选模型不属于该服务。');
    const active = this.repositories.settings.getActiveModel();
    const selected =
      model ??
      (active.providerId === id && active.model && provider.modelNames.includes(active.model)
        ? active.model
        : provider.modelNames[0]);
    this.repositories.settings.saveActiveModel({ providerId: id, model: selected });
  }

  remove(id: string) {
    this.database.write(() => {
      required(this.repositories.modelProviders.get(id), '模型服务不存在。');
      this.repositories.modelProviders.remove(id);
      if (this.repositories.settings.getActiveModel().providerId === id) {
        this.repositories.settings.saveActiveModel({ providerId: '' });
      }
    });
  }
}
