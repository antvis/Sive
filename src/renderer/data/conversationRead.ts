export const conversationReadStorageKey = 'sive.conversation-read.v1';

export type ConversationReadPositions = Record<string, number>;

export function restoreConversationRead(serialized: string | null): ConversationReadPositions {
  try {
    const value: unknown = JSON.parse(serialized || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter(([, sequence]) => Number.isSafeInteger(sequence) && sequence >= 0),
    );
  } catch {
    return {};
  }
}

export function advanceConversationRead(
  positions: ConversationReadPositions,
  conversationId: string,
  sequence: number,
): ConversationReadPositions {
  if (sequence <= (positions[conversationId] ?? -1)) return positions;
  return { ...positions, [conversationId]: sequence };
}

export function pruneConversationRead(positions: ConversationReadPositions, validIds: Set<string>) {
  const entries = Object.entries(positions).filter(([id]) => validIds.has(id));
  return entries.length === Object.keys(positions).length ? positions : Object.fromEntries(entries);
}
