import { useEffect, useId, useState } from 'react';
import { CaretDownIcon, CircleNotchIcon } from '@phosphor-icons/react';
import type { Task } from '@shared/contracts';
import { Alert } from '../../components/ui/index';
import { cx } from '../../utils/cx';
import { progressDuration, progressSteps } from '@shared/progress';
import ProgressStep from './ProgressStep';

export default function AnalysisProgress({
  task,
  hasAnswer = !!task.preview?.text.trim(),
  className,
}: {
  task: Task;
  hasAnswer?: boolean;
  className?: string;
}) {
  const running = task.status === 'running' || task.status === 'cancelling';
  const [now, setNow] = useState(Date.now);
  const [expanded, setExpanded] = useState(true);
  const listId = useId();

  useEffect(() => setExpanded(true), [task.id]);

  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running, task.id]);

  const steps = progressSteps(task.events, task.status, task.finishedAt);
  const current = [...steps].reverse().find((step) => step.status === 'running');
  const elapsed = current ? Math.max(0, now - Date.parse(current.startedAt)) : 0;
  const title = {
    running: '正在分析',
    done: '分析已完成',
    error: '分析未完成',
    cancelled: '分析已取消',
    cancelling: '正在停止',
    interrupted: '分析已中断',
  }[task.status];

  return (
    <section className={cx('my-3 min-w-0', className)} aria-label="分析过程">
      {task.persistenceError && <Alert type="warning" title={task.persistenceError} />}
      <button
        type="button"
        className="flex max-w-full items-center gap-2 rounded-control border-0 bg-transparent px-0 py-1 text-helper text-muted hover:text-ink"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls={listId}
      >
        <CaretDownIcon className={cx('shrink-0', !expanded && '-rotate-90')} aria-hidden="true" />
        <span>分析过程 · {task.status === 'done' && hasAnswer ? '已生成回答' : title}</span>
        {running && <CircleNotchIcon className="shrink-0 animate-spin" aria-hidden="true" />}
      </button>
      <div id={listId} hidden={!expanded}>
        <ol className="m-0 mt-2 flex list-none flex-col gap-1 p-0" aria-label="分析步骤">
          {steps.map((step, index) => (
            <ProgressStep key={`${task.id}:${index}`} step={step} />
          ))}
        </ol>
        {!steps.length && (
          <p className="text-helper text-muted">{running ? '正在准备分析' : '暂无分析过程记录'}</p>
        )}
      </div>
      {running && (
        <p className="my-2 text-helper text-muted" role="status">
          {task.status === 'cancelling' ? '正在取消，等待当前操作结束' : current?.label || '正在准备分析'}
          {current && task.status === 'running' && (
            <>
              {' · 已用时 '}
              {progressDuration(elapsed)}
              {elapsed >= 20000 && '，可继续等待或停止分析。'}
            </>
          )}
        </p>
      )}
      {!running && task.status !== 'done' && (
        <p className="my-2 text-helper text-muted" role="status">
          {title}
          {task.error && `：${task.error}`}
        </p>
      )}
    </section>
  );
}
