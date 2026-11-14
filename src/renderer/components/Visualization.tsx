import { GPTVis } from '@antv/gpt-vis';
import type { SnippetSpec } from '@shared/snippets';
import sizeSensor from 'size-sensor';
import { useEffect, useRef, useState } from 'react';
import { errorMessage } from '../utils';

export function Visualization({ spec, height = 320 }: { spec: SnippetSpec; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !visible) return;
    setError('');
    let chart: GPTVis | undefined;
    let width = 0;

    const render = () => {
      const nextWidth = container.clientWidth;
      if (!nextWidth || nextWidth === width) return;
      width = nextWidth;
      chart?.destroy();
      try {
        chart = new GPTVis({ container, width: nextWidth, height });
        chart.render(spec);
        setError('');
      } catch (cause) {
        chart?.destroy();
        chart = undefined;
        setError(errorMessage(cause));
      }
    };

    render();
    const unbind = sizeSensor.bind(container, render);
    return () => {
      unbind();
      chart?.destroy();
    };
  }, [spec, height, visible]);

  return (
    <div className="relative w-full min-w-0 max-w-full overflow-hidden" style={{ height }}>
      <div ref={containerRef} className="h-full w-full" />
      {error && (
        <p
          role="alert"
          className="absolute inset-0 m-0 grid place-items-center bg-page p-4 text-sm text-danger"
        >
          图表无法渲染：{error}
        </p>
      )}
    </div>
  );
}
