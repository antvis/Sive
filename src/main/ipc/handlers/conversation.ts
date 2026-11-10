import type { CommandHandlers } from '../commands';
import type { WorkbenchServices } from '../../services';

export function createConversationHandlers(
  conversations: WorkbenchServices['conversations'],
): Pick<
  CommandHandlers,
  | 'conversationCreate'
  | 'conversationRename'
  | 'conversationArchive'
  | 'conversationRestore'
  | 'conversationPurge'
> {
  return {
    conversationCreate: (datasetId) => conversations.create(datasetId),
    conversationRename: (id, title) => conversations.rename(id, title),
    conversationArchive: (id) => conversations.archive(id),
    conversationRestore: (id) => conversations.restore(id),
    conversationPurge: (ids) => conversations.purge(ids),
  };
}
