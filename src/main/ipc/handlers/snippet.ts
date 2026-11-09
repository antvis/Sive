import type { CommandHandlers } from '@shared/commands';
import type { WorkbenchServices } from '../../services';

export function createSnippetHandlers(
  snippets: WorkbenchServices['snippets'],
): Pick<CommandHandlers, 'snippetSave' | 'snippetRemove' | 'snippetRename' | 'snippetRefresh'> {
  return {
    snippetSave: (id) => snippets.save(id),
    snippetRemove: (id) => snippets.remove(id),
    snippetRename: (id, title) => snippets.rename(id, title),
    snippetRefresh: (id) => snippets.refresh(id),
  };
}
