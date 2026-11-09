import { isDeepStrictEqual } from 'node:util';
import { and, eq, isNull } from 'drizzle-orm';
import { modelProviders } from '@main/db/schema';
import { parseJSON, type StoredModel } from '@main/db/mappers';
import type { SettingsService } from './SettingsService';
import type { DbService } from '@main/db/DbService';
import { conflict, timestamp } from '@main/utils/repository';

export class ModelProviderService {
  constructor(
    private database: DbService,
    private settings: SettingsService,
  ) {}
  private get db() {
    return this.database.connection;
  }
  private get activeModel() {
    return this.settings.get<{ provider_id: string; model_name: string } | null>('active_model');
  }
  get activeModelId() {
    return this.activeModel?.provider_id || '';
  }
  models() {
    const selected = this.activeModel;
    return this.db
      .select()
      .from(modelProviders)
      .where(isNull(modelProviders.deleted_at))
      .orderBy(modelProviders.created_at, modelProviders.id)
      .all()
      .map((row) => {
        const modelIds = parseJSON<string[]>(row.model_names);
        return {
          id: row.id,
          name: row.name,
          baseURL: row.base_url,
          modelIds,
          model: selected?.provider_id === row.id ? selected.model_name : modelIds[0],
          encryptedKey: row.encrypted_key ?? undefined,
          updatedAt: row.updated_at,
        };
      });
  }
  saveModel(model: StoredModel, expected?: StoredModel) {
    this.database.write(() => {
      const current = this.models().find((entry) => entry.id === model.id);
      if (expected ? !current || !isDeepStrictEqual(current, expected) : !!current)
        conflict('模型已被修改或移除，请重新打开设置');
      const now = timestamp(current?.updatedAt);
      const values = {
        name: model.name,
        model_names: JSON.stringify(model.modelIds),
        base_url: model.baseURL,
        encrypted_key: model.encryptedKey ?? null,
        updated_at: now,
      };
      this.db
        .insert(modelProviders)
        .values({ id: model.id, created_at: now, ...values })
        .onConflictDoUpdate({ target: modelProviders.id, set: values })
        .run();
      if (!this.activeModel || this.activeModel.provider_id === model.id)
        this.settings.set('active_model', { provider_id: model.id, model_name: model.model });
    });
  }
  activateModel(id: string, model: string) {
    this.database.write(() => {
      if (
        !this.models()
          .find((entry) => entry.id === id)
          ?.modelIds.includes(model)
      )
        conflict('模型不存在或未配置');
      this.settings.set('active_model', { provider_id: id, model_name: model });
    });
  }
  deleteModel(id: string) {
    this.database.write(() => {
      const now = timestamp();
      this.db
        .update(modelProviders)
        .set({ deleted_at: now, updated_at: now, encrypted_key: null })
        .where(and(eq(modelProviders.id, id), isNull(modelProviders.deleted_at)))
        .run();
      if (this.activeModel?.provider_id === id) {
        const next = this.models()[0];
        this.settings.set(
          'active_model',
          next ? { provider_id: next.id, model_name: next.modelIds[0] } : null,
        );
      }
    });
  }
}
