import { isTextUIPart } from 'ai';
import type { UIMessage } from 'ai';
import { getAnalysisTraces } from '@shared/analysis-trace';
import type { ChatMessage } from '@shared/api';

/**
 * Joins the text parts of a UI message in order, preserving whitespace.
 */
export function getTextFromUIMessage(message: UIMessage, separator = ''): string {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join(separator);
}

/**
 * Adds the selected trace to chart output for rendering and pinning.
 */
export function getMessagesForDisplay(messages: ChatMessage[]): ChatMessage[] {
  const traces = getAnalysisTraces(messages);
  if (traces.size === 0) return messages;

  return messages.map((message) => {
    if (message.role !== 'assistant') return message;
    const parts = message.parts.map((part) => {
      if (part.type !== 'tool-visualize' || part.state !== 'output-available') return part;
      const { input, output } = part;
      if (
        !input ||
        typeof input !== 'object' ||
        !('analysisId' in input) ||
        typeof input.analysisId !== 'string'
      )
        return part;

      const trace = traces.get(input.analysisId);
      if (!trace || !output || typeof output !== 'object') return part;
      return { ...part, output: { ...output, trace } };
    });
    return { ...message, parts };
  });
}
