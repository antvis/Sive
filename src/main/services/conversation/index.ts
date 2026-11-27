import { i18n } from '../../util/i18n';
import { randomUUID } from 'node:crypto';
import type { Repositories } from '../../db/repository';
import type { DBConnection } from '../../db/repository/db-connection';
import { required } from '../../util';

export class ConversationService {
  constructor(
    private database: DBConnection,
    private repositories: Repositories,
  ) {}

  list() {
    return this.repositories.conversations.list();
  }

  listArchived() {
    return this.repositories.conversations.listArchived();
  }

  create(datasetId: string) {
    required(this.repositories.datasets.get(datasetId), i18n('errors.dataset.notFound'));
    const now = new Date().toISOString();
    return this.database.write(() =>
      this.repositories.conversations.insert({
        id: randomUUID(),
        datasetId,
        title: i18n('conversation.defaultTitle'),
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  rename(id: string, title: string) {
    this.database.write(() => {
      required(this.repositories.conversations.get(id), i18n('errors.conversation.notFound'));
      this.repositories.conversations.update(id, { title: title.trim() });
    });
  }

  archive(id: string) {
    this.database.write(() => {
      required(this.repositories.conversations.get(id), i18n('errors.conversation.notFound'));
      this.repositories.conversations.update(id, { archivedAt: new Date().toISOString() });
    });
  }

  restore(id: string) {
    this.database.write(() => {
      required(this.repositories.conversations.get(id), i18n('errors.conversation.notFound'));
      this.repositories.conversations.update(id, { archivedAt: null });
    });
  }

  purge(ids: string[]) {
    if (!ids.length) return;
    this.database.write(() => {
      for (const id of ids) {
        const conversation = required(
          this.repositories.conversations.get(id),
          i18n('errors.conversation.notFound'),
        );
        if (!conversation.archivedAt) throw new Error(i18n('errors.conversation.archiveBeforePurge'));
        for (const message of this.repositories.messages.listByConversationId(id)) {
          const snippet = this.repositories.snippets.getByMessageId(message.id);
          if (snippet) this.repositories.snippets.remove(snippet.id);
        }
        this.repositories.messages.removeByConversationId(id);
        this.repositories.conversations.remove(id);
      }
    });
  }
}
