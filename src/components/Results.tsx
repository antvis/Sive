import { useState, useEffect, useRef } from 'react';
import { Alert, Spin, Button } from './ui';
import type { Run } from '../../shared/contracts';
import { useTheme } from '../theme';
const api = window.workbench;
function ChartFrame({ html, title }: { html: string; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    setStatus('loading');
    const timer = setTimeout(() => setStatus((s) => (s === 'loading' ? 'timeout' : s)), 15000);
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.data?.type !== 'ava-chart') return;
      if (['ready', 'error'].includes(event.data.status)) {
        clearTimeout(timer);
        setStatus(event.data.status);
      }
    };
    window.addEventListener('message', receive);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('message', receive);
    };
  }, [html, attempt]);
  return (
    <>
      <div className="chart-render-status" role="status">
        <span>
          {status === 'loading'
            ? '正在绘制图表…'
            : status === 'error'
              ? '图表绘制失败，请查看计算数据或重新加载。'
              : status === 'timeout'
                ? '图表加载较慢，可尝试重新加载。'
                : ''}
        </span>
        <Button variant="ghost" size="small" onClick={() => setAttempt((v) => v + 1)}>
          重新加载图表
        </Button>
      </div>
      <iframe
        key={attempt}
        ref={frame}
        className="chart-frame"
        title={title}
        sandbox="allow-scripts"
        srcDoc={html}
      />
    </>
  );
}
export function Chart({ run, saved = false }: { run: Run; saved?: boolean }) {
  const { settings } = useTheme();
  const [html, setHTML] = useState('');
  const [error, setError] = useState('');
  // Original results are immutable; only saved-view refreshes change chart content.
  useEffect(() => {
    let live = true;
    setHTML('');
    setError('');
    Promise.resolve()
      .then(() => api.chartHTML(run.id, settings, saved))
      .then((s) => live && setHTML(s))
      .catch(() => live && setError('图表加载失败，请重新分析或查看计算数据'));
    return () => {
      live = false;
    };
  }, [run.id, settings.mode, saved, run.savedView?.updatedAt]);
  return error ? (
    <Alert type="warning" title={error} />
  ) : html ? (
    <ChartFrame html={html} title={run.question} />
  ) : (
    <div className="loading">
      <Spin />
    </div>
  );
}
