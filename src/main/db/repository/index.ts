import type { DBConnection } from './db-connection';
import { ConversationRepo } from './conversation-repo';
import { DatasetRepo } from './dataset-repo';
import { MessageRepo } from './message-repo';
import { ModelProviderRepo } from './model-provider-repo';
import { SettingRepo } from './setting-repo';
import { SnippetRepo } from './snippet-repo';
import { StorageRepo } from './storage-repo';

export function createRepositories(database: DBConnection) {
  return {
    conversations: new ConversationRepo(database),
    datasets: new DatasetRepo(database),
    messages: new MessageRepo(database),
    modelProviders: new ModelProviderRepo(database),
    settings: new SettingRepo(database),
    snippets: new SnippetRepo(database),
    storage: new StorageRepo(database),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;

export { ConversationRepo, DatasetRepo, MessageRepo, ModelProviderRepo, SettingRepo, SnippetRepo };
