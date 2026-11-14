import { GPTVis } from '@antv/gpt-vis';
import type { SnippetSpec } from '@shared/snippets';
import sizeSensor from 'size-sensor';
import { useEffect, useRef } from 'react';

export function Visualization({ spec, height = 320 }: { spec: SnippetSpec; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let chart: GPTVis | undefined;
    let width = 0;

    const render = () => {
      const nextWidth = container.clientWidth;
      if (!nextWidth || nextWidth === width) return;
      width = nextWidth;
      chart?.destroy();
      chart = new GPTVis({ container, width: nextWidth, height });
      chart.render(spec);
    };

    render();
    const unbind = sizeSensor.bind(container, render);
    return () => {
      unbind();
      chart?.destroy();
    };
  }, [spec, height]);

  return <div ref={containerRef} className="w-full min-w-0 max-w-full overflow-hidden" style={{ height }} />;
}
