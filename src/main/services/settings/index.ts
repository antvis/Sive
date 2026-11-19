import type { Repositories } from '../../db/repository';
import type { DBConnection } from '../../db/repository/db-connection';
import type { ActiveModel } from '../../db/repository/setting-repo';
import type { Preferences } from '@shared/api';
import { DEFAULT_PREFERENCES } from '../../../shared/api';
import type { DuckDBEngineConfig } from '../../../shared/api';

const LANGUAGE_KEY = 'language';

// 主题风格
const THEME_KEY = 'theme';
// Agent 设置
const AGENT_KEY = 'agent';
// 分析策略
const STRATEGY_KEY = 'strategy';
// DuckDB 引擎配置
const ENGINE_KEY = 'engine';

/**
 * Store several types of configurations separately,
 *  and finally query and return them to the front end.
 */
export class SettingsService {
  constructor(
    private database: DBConnection,
    private repositories: Repositories,
  ) {}

  private set(key: string, value: unknown) {
    const now = new Date().toISOString();
    this.database.write(() => {
      if (this.repositories.settings.get(key))
        this.repositories.settings.update(key, { value, updatedAt: now });
      else this.repositories.settings.insert({ key, value, createdAt: now, updatedAt: now });
    });
  }

  getPreferences(): Preferences {
    const language = this.repositories.settings.get(LANGUAGE_KEY)?.value;
    const theme = this.repositories.settings.get(THEME_KEY)?.value as
      Partial<Preferences['theme']> | undefined;
    const agent = this.repositories.settings.get(AGENT_KEY)?.value as Preferences['agent'] | undefined;
    const strategy = this.repositories.settings.get(STRATEGY_KEY)?.value as
      Preferences['strategy'] | undefined;
    const engine = this.repositories.settings.get(ENGINE_KEY)?.value as
      Partial<DuckDBEngineConfig> | undefined;
    return {
      language: (language || DEFAULT_PREFERENCES.language) as Preferences['language'],
      theme: { ...DEFAULT_PREFERENCES.theme, ...theme },
      agent: { ...DEFAULT_PREFERENCES.agent, ...agent },
      strategy: { ...DEFAULT_PREFERENCES.strategy, ...strategy },
      engine: { ...DEFAULT_PREFERENCES.engine, ...engine },
    };
  }

  savePreferences(preferences: Preferences) {
    this.database.write(() => {
      this.set(LANGUAGE_KEY, preferences.language);
      this.set(THEME_KEY, preferences.theme);
      this.set(AGENT_KEY, preferences.agent);
      this.set(STRATEGY_KEY, preferences.strategy);
      this.set(ENGINE_KEY, preferences.engine);
    });
  }

  getActiveModel(): ActiveModel {
    return this.repositories.settings.getActiveModel();
  }

  saveActiveModel(value: ActiveModel) {
    this.repositories.settings.saveActiveModel(value);
  }
}
