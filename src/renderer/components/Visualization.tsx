import { GPTVis } from '@antv/gpt-vis';
import type { SnippetSpec } from '@shared/schema';
import sizeSensor from 'size-sensor';
import { useContext, useEffect, useRef } from 'react';
import { createChartTheme, ThemeContext } from '../theme';
import { InsightSummary } from './InsightSummary';

export function Visualization({ spec, height = 320 }: { spec: SnippetSpec; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const themeMode = useContext(ThemeContext);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof spec === 'string') return;
    const theme = createChartTheme(themeMode);
    let chart: GPTVis | undefined;
    let width = 0;

    const render = () => {
      const nextWidth = container.clientWidth;
      if (!nextWidth || nextWidth === width) return;
      width = nextWidth;
      chart?.destroy();
      chart = new GPTVis({ container, width: nextWidth, height, theme });
      // Keep model-generated themes from overriding the client appearance.
      chart.render({ ...spec, theme });
    };

    render();
    const unbind = sizeSensor.bind(container, render);
    return () => {
      unbind();
      chart?.destroy();
    };
  }, [spec, height, themeMode]);

  if (typeof spec === 'string') {
    const syntax = spec.replace(/^theme\s+(light|dark)\s*$/gim, '');
    return <InsightSummary text={syntax} syntax={syntax} />;
  }

  return <div ref={containerRef} className="w-full min-w-0 max-w-full overflow-hidden" style={{ height }} />;
}
