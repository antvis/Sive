import { DbService } from './DbService';
import { ConversationRepo } from './repository/ConversationRepo';
import { DatasetRepo } from './repository/DatasetRepo';
import { MessageRepo } from './repository/MessageRepo';
import { ModelProviderRepo } from './repository/ModelProviderRepo';
import { SettingRepo } from './repository/SettingRepo';
import { SnippetRepo } from './repository/SnippetRepo';

export async function createRepositories(root: string) {
  const database = await DbService.connect(root);
  return {
    database,
    conversations: new ConversationRepo(database),
    datasets: new DatasetRepo(database),
    messages: new MessageRepo(database),
    providers: new ModelProviderRepo(database),
    settings: new SettingRepo(database),
    snippets: new SnippetRepo(database),
  };
}

export type Repositories = Awaited<ReturnType<typeof createRepositories>>;
