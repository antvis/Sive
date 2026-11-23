import { isTextUIPart } from 'ai';
import type { UIMessage } from 'ai';

/**
 * Joins the text parts of a UI message in order, preserving whitespace.
 */
export function getTextFromUIMessage(message: UIMessage, separator = ''): string {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join(separator);
}
