import { isDeepStrictEqual } from 'node:util';
import { and, eq, isNull } from 'drizzle-orm';
import { modelProviders } from '@main/db/schema';
import type { StoredModel } from '@main/db/mappers';
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
      .where(isNull(modelProviders.deletedAt))
      .orderBy(modelProviders.createdAt, modelProviders.id)
      .all()
      .map((row) => {
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
  saveModel(model: StoredModel, expected?: StoredModel) {
    this.database.write(() => {
      const current = this.models().find((entry) => entry.id === model.id);
      if (expected ? !current || !isDeepStrictEqual(current, expected) : !!current)
        conflict('模型已被修改或移除，请重新打开设置');
      const now = timestamp(current?.updatedAt);
      const values = {
        name: model.name,
        modelNames: model.modelIds,
        baseUrl: model.baseURL,
        encryptedKey: model.encryptedKey ?? null,
        updatedAt: now,
      };
      this.db
        .insert(modelProviders)
        .values({ id: model.id, createdAt: now, ...values })
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
        .set({ deletedAt: now, updatedAt: now, encryptedKey: null })
        .where(and(eq(modelProviders.id, id), isNull(modelProviders.deletedAt)))
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
