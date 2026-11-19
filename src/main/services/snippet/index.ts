import { randomUUID } from 'node:crypto';
import type { SnippetSaveInput, SnippetUpdateInput } from '@shared/schema';
import { readInsightPresentation } from '../../../shared/insight';
import type { Repositories } from '../../db/repository';
import type { DBConnection } from '../../db/repository/db-connection';
import { required } from '../../util/assert';

export class SnippetService {
  constructor(
    private database: DBConnection,
    private repositories: Repositories,
  ) {}

  list() {
    return this.repositories.snippets.list();
  }

  save(input: SnippetSaveInput) {
    required(this.repositories.messages.get(input.messageId), '分析消息不存在。');
    return this.database.write(() => {
      const existing = this.repositories.snippets.getByMessageId(input.messageId);
      if (existing) return existing;
      const now = new Date().toISOString();
      return this.repositories.snippets.insert({
        id: randomUUID(),
        messageId: input.messageId,
        title: typeof input.spec === 'string' ? input.question : input.spec.title || input.question,
        content: {
          question: input.question,
          spec: input.spec,
          summary: input.summary,
          presentation: readInsightPresentation(input.presentation),
        },
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  update(messageId: string, input: SnippetUpdateInput) {
    this.database.write(() => {
      const snippet = required(this.repositories.snippets.getByMessageId(messageId), 'Snippet 不存在。');
      const title = input.title.trim();
      if (!title) throw new Error('标题不能为空。');
      const summary = input.summary.trim();
      const presentation =
        summary === snippet.content.summary.trim() ? snippet.content.presentation : undefined;
      this.repositories.snippets.update(snippet.id, {
        title,
        content: {
          ...snippet.content,
          summary,
          presentation: presentation && {
            ...presentation,
            titleHighlights: title === snippet.title ? presentation.titleHighlights : [],
          },
        },
      });
    });
  }

  remove(messageId: string) {
    this.database.write(() => {
      const snippet = this.repositories.snippets.getByMessageId(messageId);
      if (snippet) this.repositories.snippets.remove(snippet.id);
    });
  }
}
