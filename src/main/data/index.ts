import { DbService } from './db/DbService';
import { SettingsService } from './services/SettingsService';
import { ModelProviderService } from './services/ModelProviderService';
import { DatasetService } from './services/DatasetService';
import { ConversationService } from './services/ConversationService';

// Construct one connection and inject only the data services each consumer needs.
export function createDataServices(root: string) {
  const database = new DbService(root);
  try {
    const settings = new SettingsService(database);
    const providers = new ModelProviderService(database, settings);
    const datasets = new DatasetService(database);
    const conversations = new ConversationService(database, datasets);
    conversations.recoverInterrupted();
    return { database, settings, providers, datasets, conversations };
  } catch (error) {
    database.close();
    throw error;
  }
}
export type DataServices = ReturnType<typeof createDataServices>;
