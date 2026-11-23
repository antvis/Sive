import { randomUUID } from 'node:crypto';
import { isStaticToolUIPart } from 'ai';
import { isAnalysisToolResult } from '@shared/analysis-trace';
import type { SnippetSaveInput, SnippetUpdateInput } from '@shared/schema';
import { i18n } from '../../util/i18n';
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
    return this.database.write(() => {
      const message = required(this.repositories.messages.get(input.messageId), '分析消息不存在。');
      const existing = this.repositories.snippets.getByMessageId(input.messageId);
      if (existing) return existing;

      const analysisId = input.trace?.toolCallId;
      const analysisOutput = analysisId
        ? this.repositories.messages
            .listByConversationId(message.conversationId)
            .flatMap(({ parts }) => parts.filter(isStaticToolUIPart))
            .find(
              (part) =>
                part.type === 'tool-analyze' &&
                part.toolCallId === analysisId &&
                part.state === 'output-available',
            )?.output
        : undefined;
      const trace = isAnalysisToolResult(analysisOutput) ? (analysisOutput.trace ?? null) : null;
      const now = new Date().toISOString();
      return this.repositories.snippets.insert({
        id: randomUUID(),
        messageId: input.messageId,
        trace,
        question: input.question,
        intent: input.intent,
        title: input.title,
        summary: input.summary,
        spec: input.spec,
        tags: input.tags,
        metrics: input.metrics,
        templateId: 'default',
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  update(messageId: string, input: SnippetUpdateInput) {
    this.database.write(() => {
      const snippet = required(this.repositories.snippets.getByMessageId(messageId), 'Snippet 不存在。');
      const title = input.title?.trim();
      if (title === '') throw new Error(i18n('errors.snippetTitleRequired'));
      this.repositories.snippets.update(snippet.id, {
        title,
        summary: input.summary?.trim(),
        templateId: input.templateId,
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
