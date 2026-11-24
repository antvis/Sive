import { createRepositories } from '../db/repository';
import type { DBConnection } from '../db/repository/db-connection';
import { AnalysisService } from './analysis';
import { ConversationService } from './conversation';
import { DatasetService } from './dataset';
import { ModelService } from './model';
import { SettingsService } from './settings';
import { SnippetService } from './snippet';
import { StorageService } from './storage';

export function createServices(database: DBConnection) {
  const repositories = createRepositories(database);

  const analysis = new AnalysisService(database, repositories);
  const dataset = new DatasetService(database, repositories);
  const conversation = new ConversationService(database, repositories);
  const snippet = new SnippetService(database, repositories);
  const settings = new SettingsService(database, repositories);
  const model = new ModelService(database, repositories);
  const storage = new StorageService(repositories.storage);

  return { dataset, conversation, analysis, snippet, settings, model, storage };
}

export type Services = ReturnType<typeof createServices>;
