import type { DBConnection } from './DBConnection';
import { ConversationRepo } from './ConversationRepo';
import { DatasetRepo } from './DatasetRepo';
import { MessageRepo } from './MessageRepo';
import { ModelProviderRepo } from './ModelProviderRepo';
import { SettingRepo } from './SettingRepo';
import { SnippetRepo } from './SnippetRepo';

export function createRepositories(database: DBConnection) {
  return {
    conversations: new ConversationRepo(database),
    datasets: new DatasetRepo(database),
    messages: new MessageRepo(database),
    modelProviders: new ModelProviderRepo(database),
    settings: new SettingRepo(database),
    snippets: new SnippetRepo(database),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;

export { ConversationRepo, DatasetRepo, MessageRepo, ModelProviderRepo, SettingRepo, SnippetRepo };
