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

export class ModelService {
  constructor(
    private database: DBConnection,
    private repositories: Repositories,
  ) {}

  private resolveApiKey(input: ModelConnectionInput) {
    if (input.apiKey) return input.apiKey;
    if (!input.credentialSourceId) return '';
    const source = required(
      this.repositories.modelProviders.get(input.credentialSourceId),
      '凭据来源不存在。',
    );
    if (source.baseUrl !== input.baseURL) throw new Error('服务地址已修改，请重新填写密钥。');
    return source.encryptedKey ? decrypt(source.encryptedKey) : '';
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
    const apiKey = this.resolveApiKey({ ...input, baseURL });
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
          item && typeof item === 'object' && 'id' in item && typeof item.id === 'string' && item.id
            ? [item.id]
            : [],
        ),
      ),
    ];
  }

  async test(input: ModelInput, report: (progress: ModelTestProgress) => void) {
    if (!input.modelIds.length) throw new Error('请至少选择一个模型。');
    const baseURL = modelURL(input.baseURL);
    const apiKey = this.resolveApiKey({ ...input, baseURL });
    const provider = createOpenAICompatible({ name: 'sive', baseURL, apiKey: apiKey || undefined });
    let cursor = 0;
    let completed = 0;
    const active = new Set<string>();
    const progress = () => report({ completed, total: input.modelIds.length, active: [...active] });

    const worker = async () => {
      while (cursor < input.modelIds.length) {
        const modelId = input.modelIds[cursor++];
        active.add(modelId);
        progress();
        try {
          await generateText({
            model: provider.chatModel(modelId),
            prompt: 'Reply with OK.',
            maxOutputTokens: 32,
            maxRetries: 0,
            timeout: 30_000,
          });
        } finally {
          active.delete(modelId);
          completed += 1;
          progress();
        }
      }
    };

    const results = await Promise.allSettled(
      Array.from({ length: Math.min(3, input.modelIds.length) }, worker),
    );
    const failed = results.find((result) => result.status === 'rejected');
    if (failed) throw failed.reason;
  }

  save(input: ModelInput) {
    const now = new Date().toISOString();
    this.database.write(() => {
      const existing = input.id
        ? required(this.repositories.modelProviders.get(input.id), '模型服务不存在。')
        : undefined;
      let encryptedKey: string | null = null;
      if (input.apiKey) encryptedKey = encrypt(input.apiKey);
      else if (input.credentialSourceId) {
        const source = required(
          this.repositories.modelProviders.get(input.credentialSourceId),
          '凭据来源不存在。',
        );
        if (source.baseUrl === input.baseURL) encryptedKey = source.encryptedKey;
      }
      const values = {
        name: input.name.trim(),
        modelNames: input.modelIds,
        baseUrl: input.baseURL,
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
