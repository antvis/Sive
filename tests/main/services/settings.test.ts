import { DEFAULT_PREFERENCES } from '../../../src/shared/api';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRepositories } from '../../../src/main/db/repository';
import { SettingsService } from '../../../src/main/services/settings';
import { createTestDb } from '../../helpers/db';

describe('SettingsService', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let service: SettingsService;

  beforeEach(async () => {
    testDb = await createTestDb();
    service = new SettingsService(testDb.database, createRepositories(testDb.database));
  });

  afterEach(() => testDb.close());

  it('returns default preferences', () => {
    expect(service.getPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('saves language and other preferences as separate JSON records', () => {
    service.savePreferences({
      ...DEFAULT_PREFERENCES,
      language: 'en-US',
      agent: { maxSteps: 15 },
      strategy: { type: 'loop', maxSteps: 6 },
      engine: { ...DEFAULT_PREFERENCES.engine, memoryLimit: '2GB' },
    });

    const settings = createRepositories(testDb.database).settings;
    expect(settings.get('language')?.value).toBe('en-US');
    expect(service.getPreferences().language).toBe('en-US');
    expect(settings.get('theme')?.value).toEqual(DEFAULT_PREFERENCES.theme);
    expect(settings.get('agent')?.value).toEqual({ maxSteps: 15 });
    expect(settings.get('strategy')?.value).toEqual({ type: 'loop', maxSteps: 6 });
    expect(settings.get('engine')?.value).toEqual({ ...DEFAULT_PREFERENCES.engine, memoryLimit: '2GB' });
  });
});
