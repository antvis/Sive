import type { ModelMessage } from 'ai';
import { lastOf } from '@shared/array';

/**
 * Extracts the text of the most recent user message, preserving whitespace.
 * Returns `undefined` when the history contains no user message.
 */
export function getTextFromLastUserMessage(messages: readonly ModelMessage[]): string | undefined {
  const content = lastOf(messages, (message) => message.role === 'user')?.content;
  if (typeof content === 'string') return content;
  return content?.flatMap((part) => (part.type === 'text' ? [part.text] : [])).join('');
}
