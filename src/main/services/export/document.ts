import type { ResultDocument, ResultTarget } from '@shared/results';
import { messageDocument, snippetDocument } from '@shared/results';
import type { Repositories } from '../../db/repository';
import { required } from '../../util';

export function getResultDocument(repositories: Repositories, target: ResultTarget): ResultDocument {
  if (target.kind === 'snippet')
    return snippetDocument(required(repositories.snippets.getByMessageId(target.id), 'Snippet 不存在。'));
  const message = required(repositories.messages.get(target.id), '分析消息不存在。');
  if (message.role !== 'assistant' || message.status !== 'done') throw new Error('请等待分析完成后再导出。');
  const question =
    repositories.messages
      .listByConversationId(message.conversationId)
      .filter((item) => item.role === 'user' && item.sequence < message.sequence)
      .at(-1)?.content.question ?? '';
  return messageDocument(message, question);
}
