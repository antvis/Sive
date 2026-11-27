import { i18n } from '../../util/i18n';
import { randomUUID } from 'node:crypto';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';
import type { Repositories } from '../../db/repository';
import type { DBConnection } from '../../db/repository/db-connection';
import { decrypt, encrypt, required } from '../../util';
import type { ModelConnectionInput, ModelInput, ModelTestProgress } from '@shared/api';

export type ModelConfig = { baseURL: string; model: string; apiKey?: string };

function modelURL(value: string) {
  const url = new URL(value);
  const localHTTP = url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !localHTTP) || url.username || url.password || url.search || url.hash) {
    throw new Error(i18n('errors.model.invalidUrl'));
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
      i18n('errors.model.credentialSourceNotFound'),
    );
    if (source.baseUrl !== input.baseURL)
      throw new Error(i18n('errors.model.credentialsRequiredAfterUrlChange'));
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

  getDefaultModelConfig(): ModelConfig {
    const active = this.repositories.settings.getActiveModel();
    if (!active.providerId) throw new Error(i18n('errors.model.defaultRequired'));
    const provider = required(
      this.repositories.modelProviders.get(active.providerId),
      i18n('errors.model.defaultNotFound'),
    );
    const model =
      active.model && provider.modelNames.includes(active.model) ? active.model : provider.modelNames[0];
    if (!model) throw new Error(i18n('errors.model.defaultHasNoModels'));
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
    if (!response.ok) throw new Error(i18n('errors.model.listRequestFailed', [response.status]));
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || !('data' in body) || !Array.isArray(body.data)) {
      throw new Error(i18n('errors.model.invalidListResponse'));
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
    if (!input.modelIds.length) throw new Error(i18n('errors.model.selectionRequired'));
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
        ? required(this.repositories.modelProviders.get(input.id), i18n('errors.model.providerNotFound'))
        : undefined;
      let encryptedKey: string | null = null;
      if (input.apiKey) encryptedKey = encrypt(input.apiKey);
      else if (input.credentialSourceId) {
        const source = required(
          this.repositories.modelProviders.get(input.credentialSourceId),
          i18n('errors.model.credentialSourceNotFound'),
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
    const provider = required(
      this.repositories.modelProviders.get(id),
      i18n('errors.model.providerNotFound'),
    );
    if (model && !provider.modelNames.includes(model)) throw new Error(i18n('errors.model.providerMismatch'));
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
      required(this.repositories.modelProviders.get(id), i18n('errors.model.providerNotFound'));
      this.repositories.modelProviders.remove(id);
      if (this.repositories.settings.getActiveModel().providerId === id) {
        this.repositories.settings.saveActiveModel({ providerId: '' });
      }
    });
  }
}
