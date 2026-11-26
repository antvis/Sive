import { useEffect, useState } from 'react';

const STORAGE_KEY = 'sive.pinned-conversation-groups';

export function usePinnedConversationGroups() {
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pinnedIds));
    } catch {
      // Pinning still works for this window when storage is unavailable.
    }
  }, [pinnedIds]);

  const togglePin = (id: string) => {
    setPinnedIds((current) =>
      current.includes(id) ? current.filter((pinnedId) => pinnedId !== id) : [id, ...current],
    );
  };

  return { pinnedIds, togglePin };
}
