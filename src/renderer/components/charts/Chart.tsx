import { cx } from '../../utils/cx';
import { useState, useEffect, useRef } from 'react';
import { Alert, Spin } from '@renderer/components/ui/index';
import type { Run } from '@shared/contracts';
import { useTheme } from '@renderer/hooks/useTheme';
const api = window.workbench;
const chartStatusText: Record<string, string> = {
  loading: '正在绘制图表…',
  error: '图表绘制失败，请查看计算数据。',
  timeout: '图表加载较慢，请稍候或查看计算数据。',
};

function ChartFrame({ html, title, saved }: { html: string; title: string; saved: boolean }) {
  const frame = useRef<HTMLIFrameElement>(null);
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
  }, [html]);
  return (
    <>
      {status !== 'ready' && (
        <div className="text-muted text-helper" role="status">
          {chartStatusText[status]}
        </div>
      )}
      <iframe
        ref={frame}
        className={cx(
          'block w-full border-0 bg-surface',
          saved ? 'h-0 flex-1 min-h-0' : 'row-start-2 h-full min-h-0',
        )}
        title={title}
        sandbox="allow-scripts"
        srcDoc={html}
      />
    </>
  );
}

export function Chart({ run, saved = false, index = 0 }: { run: Run; saved?: boolean; index?: number }) {
  const { settings } = useTheme();
  const [html, setHTML] = useState('');
  const [error, setError] = useState('');
  // Original results are immutable; only saved-view refreshes change chart content.
  const savedVersion = saved ? run.snippet?.updatedAt : undefined;
  useEffect(() => {
    let live = true;
    setHTML('');
    setError('');
    api
      .analysisGetChartHTML(run.id, settings, saved, index)
      .then((s) => live && setHTML(s))
      .catch(() => live && setError('图表加载失败，请重新分析或查看计算数据'));
    return () => {
      live = false;
    };
  }, [run.id, settings.mode, saved, savedVersion, index]);
  if (error)
    return (
      <Alert
        className={saved ? 'shrink-0' : 'row-span-full min-h-0 overflow-auto'}
        type="warning"
        title={error}
      />
    );
  if (html) return <ChartFrame html={html} title={run.question} saved={saved} />;
  return (
    <div
      className={cx('grid place-content-center', saved ? 'min-h-50' : 'row-span-full min-h-0 overflow-auto')}
    >
      <Spin />
    </div>
  );
}
