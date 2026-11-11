import { randomUUID } from 'node:crypto';
import type { Repositories } from '../../db/repository';
import type { DBConnection } from '../../db/repository/db-connection';
import { encrypt, required } from '../../util';
import type { ModelInput } from '../types';

export class ModelService {
  constructor(
    private database: DBConnection,
    private repositories: Repositories,
  ) {}

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
