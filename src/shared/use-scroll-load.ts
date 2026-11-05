import { useEffect, useRef, useState } from 'react';

// Lists already have their metadata; reveal cards in batches as the footer approaches.
export function useScrollLoad(total: number, batchSize: number, resetKey: string) {
  const [batch, setBatch] = useState({ key: resetKey, limit: batchSize });
  const footer = useRef<HTMLDivElement>(null);
  const limit = batch.key === resetKey ? batch.limit : batchSize;
  if (batch.key !== resetKey) setBatch({ key: resetKey, limit: batchSize });
  const count = Math.min(limit, total);
  const hasMore = count < total;

  useEffect(() => {
    const node = footer.current;
    if (!node || !hasMore) return;
    let active = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!active || !entry.isIntersecting) return;
        active = false;
        observer.disconnect();
        setBatch({ key: resetKey, limit: count + batchSize });
      },
      { root: node.closest('#workspace-panel'), rootMargin: '240px 0px' },
    );
    observer.observe(node);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [count, hasMore, batchSize, resetKey]);

  return { count, hasMore, footer };
}
