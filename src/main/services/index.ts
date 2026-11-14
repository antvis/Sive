import { createRepositories } from '../db/repository';
import type { DBConnection } from '../db/repository/db-connection';
import { AnalysisService } from './analysis';
import { ConversationService } from './conversation';
import { DatasetService } from './dataset';
import { ModelService } from './model';
import { SettingsService } from './settings';
import { SnippetService } from './snippet';
import { getResultDocument } from './export/document';
import type { ResultTarget } from '@shared/results';

export function createServices(database: DBConnection) {
  const repositories = createRepositories(database);

  const analysis = new AnalysisService(database, repositories);
  const dataset = new DatasetService(database, repositories, (id, update) =>
    analysis.withDatasetUpdate(id, update),
  );
  const conversation = new ConversationService(database, repositories);
  const snippet = new SnippetService(database, repositories);
  const settings = new SettingsService(database, repositories);
  const model = new ModelService(database, repositories);

  return {
    dataset,
    conversation,
    analysis,
    snippet,
    settings,
    model,
    resultDocument: (target: ResultTarget) => getResultDocument(repositories, target),
  };
}

export type Services = ReturnType<typeof createServices>;
