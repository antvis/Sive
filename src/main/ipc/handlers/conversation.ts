import type { CommandHandlers } from '@shared/commands';
import type { WorkbenchServices } from '../../services';

export function createConversationHandlers(
  conversations: WorkbenchServices['conversations'],
): Pick<
  CommandHandlers,
  'conversationCreate' | 'conversationArchive' | 'conversationRestore' | 'conversationPurge'
> {
  return {
    conversationCreate: (datasetId) => conversations.create(datasetId),
    conversationArchive: (id) => conversations.archive(id),
    conversationRestore: (id) => conversations.restore(id),
    conversationPurge: (ids) => conversations.purge(ids),
  };
}
