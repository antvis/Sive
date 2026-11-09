import type { Task } from '@shared/contracts';
import type { Repositories } from '../db';
import { ModelService } from './settings/ModelService';
import { SettingsService } from './settings/SettingsService';
import { ConnectionService } from './data/ConnectionService';
import { DatasetService } from './data/DatasetService';
import { AnalysisService } from './analysis/AnalysisService';
import { AnalysisRecordService } from './analysis/AnalysisRecordService';
import { ConversationService } from './conversation/ConversationService';
import { SnippetService } from './snippet/SnippetService';

export function createWorkbenchServices(
  data: Repositories,
  encrypt: (value: string) => string,
  decrypt: (value: string) => string,
  change: () => void,
  taskChanged: (task: Task) => void,
) {
  const settings = new SettingsService(data.database, data.settings, change);
  const models = new ModelService(data.database, data.providers, data.settings, encrypt, decrypt, change);
  const connections = new ConnectionService((id) => datasets.dataset(id));
  const datasets: DatasetService = new DatasetService(
    data.database,
    data.datasets,
    change,
    () => analysis.busy,
    (id) => analysis.forgetDataset(id),
    connections,
    () => !!snippets.refreshingId,
  );
  const records = new AnalysisRecordService(data, datasets);
  const conversations: ConversationService = new ConversationService(
    data,
    datasets,
    change,
    (id) => analysis.isRunning(id),
    () => (snippets.refreshingId ? records.run(snippets.refreshingId).conversationId : undefined),
    (id) => analysis.forgetConversation(id),
  );
  const analysis: AnalysisService = new AnalysisService(
    records,
    conversations,
    models,
    datasets,
    change,
    () => !!snippets.refreshingId,
    connections,
    taskChanged,
  );
  const snippets: SnippetService = new SnippetService(
    data,
    records,
    conversations,
    settings,
    models,
    datasets,
    change,
    () => analysis.busy,
    connections,
  );
  records.recoverInterrupted();
  return { settings, models, datasets, conversations, records, analysis, snippets };
}

export type WorkbenchServices = ReturnType<typeof createWorkbenchServices>;
