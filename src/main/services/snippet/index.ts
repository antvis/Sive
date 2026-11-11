import type { Repositories } from '../../db/repository';
import type { DBConnection } from '../../db/repository/DBConnection';
import { required } from '../../util';

export class SnippetService {
  constructor(
    private database: DBConnection,
    private repositories: Repositories,
  ) {}

  save(_runId: string) {
    throw new Error('Not implemented');
  }

  rename(runId: string, title: string) {
    this.database.write(() => {
      const snippet = required(this.repositories.snippets.getByMessageId(runId), '收藏不存在。');
      this.repositories.snippets.update(snippet.id, { title: title.trim() });
    });
  }

  remove(runId: string) {
    this.database.write(() => {
      const snippet = this.repositories.snippets.getByMessageId(runId);
      if (snippet) this.repositories.snippets.remove(snippet.id);
    });
  }
}
