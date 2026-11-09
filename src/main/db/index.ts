import { DbService } from './DbService';
import { SettingsService } from './repository/SettingsService';
import { ModelProviderService } from './repository/ModelProviderService';
import { DatasetService } from './repository/DatasetService';
import { ConversationService } from './repository/ConversationService';

/**
 * Construct one connection and inject only the data services each consumer needs.
 *
 * Use this function to create a single instance of the data services for the entire application.
 */
export async function createDataServices(root: string) {
  const database = await DbService.connect(root);
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
export type DataServices = Awaited<ReturnType<typeof createDataServices>>;
