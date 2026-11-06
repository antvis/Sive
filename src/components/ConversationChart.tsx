import { useEffect, useRef, useState } from 'react';
import type { Run } from '../../shared/contracts';
import { Chart } from './Results';

// Keep the same space while loading or releasing an offscreen chart so the
// timeline's scroll position and follow-latest behavior remain stable.
export default function ConversationChart({ run }: { run: Run }) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    let timer: ReturnType<typeof setTimeout>;
    const observer = new IntersectionObserver(
      ([entry]) => {
        clearTimeout(timer);
        // Avoid initializing charts passed over during fast scrolling, and
        // avoid repeated teardown at the edge of the preload area.
        timer = setTimeout(() => setActive(entry.isIntersecting), 150);
      },
      { root: node.closest('.conversation-body'), rootMargin: '400px 0px' },
    );
    observer.observe(node);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="grid grid-rows-[32px_340px] h-93 min-w-0" ref={root}>
      {active ? (
        <Chart run={run} />
      ) : (
        <div className="[grid-row:1_/_-1] min-h-0 overflow-auto grid place-items-center text-muted text-helper">
          滚动到此处加载图表
        </div>
      )}
    </div>
  );
}
