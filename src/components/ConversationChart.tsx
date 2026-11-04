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
    <div className="conversation-chart" ref={root}>
      {active ? (
        <Chart run={run} />
      ) : (
        <div className="conversation-chart-placeholder">滚动到此处加载图表</div>
      )}
    </div>
  );
}
