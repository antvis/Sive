import { cx } from '../shared/cx';
import { useEffect, useState, type ReactNode } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  CircleNotchIcon,
  StopCircleIcon,
  MinusCircleIcon,
} from '@phosphor-icons/react';
import { Alert, Button, Spin, useUI } from './ui';
import type { Run, Task } from '../../shared/contracts';
import { errorMessage } from '../shared/feedback';
import { analysisLabel } from '../../shared/analysis-options';
import {
  preparationStages,
  progressDuration,
  progressSteps,
  stageDescription,
  type ProgressStep,
} from '../shared/progress';

function Artifact({
  title,
  content,
  className,
}: {
  title: string;
  content: () => string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { message } = useUI();
  return (
    <details
      className={cx('mt-2 text-helper', className)}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>{title}</summary>
      {open && (
        <ArtifactContent
          title={title}
          text={content()}
          onError={(error) => message.error(errorMessage(error))}
        />
      )}
    </details>
  );
}

function ArtifactContent({
  title,
  text,
  onError,
}: {
  title: string;
  text: string;
  onError: (error: unknown) => void;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return (
    <>
      <Button
        size="small"
        className="mt-2"
        aria-label={`复制${title}`}
        onClick={async () => {
          try {
            await window.workbench.writeClipboard(text);
            setCopied(true);
          } catch (error) {
            onError(error);
          }
        }}
      >
        {copied ? '已复制' : '复制内容'}
      </Button>
      <pre
        className="max-h-90 overflow-auto whitespace-pre-wrap wrap-anywhere"
        tabIndex={0}
        aria-label={title}
      >
        {text}
      </pre>
    </>
  );
}

function Step({ step, now, children }: { step: ProgressStep; now: number; children?: ReactNode }) {
  const active = step.status === 'running';
  return (
    <li className="grid grid-cols-[16px_minmax(0,_1fr)] gap-2 py-2.5 border-t border-t-line">
      <span
        className={cx('text-body pt-0.5', active ? 'text-accent' : 'text-muted')}
        aria-label={
          { running: '进行中', done: '已完成', error: '失败', stopped: '已停止', skipped: '已跳过' }[
            step.status
          ]
        }
      >
        {active ? (
          <CircleNotchIcon className="inline-block shrink-0 align-middle animate-spin" />
        ) : step.status === 'skipped' ? (
          <MinusCircleIcon />
        ) : step.status === 'done' ? (
          <CheckCircleIcon />
        ) : step.status === 'error' ? (
          <XCircleIcon />
        ) : (
          <StopCircleIcon />
        )}
      </span>
      <div>
        <div className="flex flex-wrap [align-items:baseline] gap-y-1 gap-x-3 text-helper">
          <strong
            className={cx(
              'text-helper',
              active && 'text-accent',
              step.status === 'error' && 'font-bold underline decoration-dotted',
            )}
          >
            {step.label}
          </strong>
          {(active || step.durationMs !== undefined) && (
            <span className="text-muted">
              {active ? '进行中 · ' : ''}
              {progressDuration(
                active ? Math.max(0, now - Date.parse(step.startedAt)) : (step.durationMs ?? 0),
              )}
            </span>
          )}
        </div>
        {step.detail && <p className="my-1 mx-0 text-helper">{step.detail}</p>}
        {step.recovery && <p className="my-1 mx-0 text-helper text-muted">{step.recovery}</p>}
        {children}
        {step.sql && (
          <details className="text-helper mt-1.5">
            <summary>查看本次查询</summary>
            <pre className="whitespace-pre-wrap wrap-anywhere">{step.sql}</pre>
          </details>
        )}
        {!!step.calls.length && (
          <details className="text-muted text-helper mt-1.5">
            <summary>
              模型调用 · {step.calls.filter((event) => event.stage === 'modelstart').length} 次
            </summary>
            {step.calls.map((call, index) => (
              <p className="my-1 mx-0 text-helper" key={index}>
                <time className="text-caption text-muted" dateTime={call.at}>
                  {new Date(call.at).toLocaleTimeString('zh-CN')}
                </time>{' '}
                · {call.label}
                {call.durationMs !== undefined && ` · ${progressDuration(call.durationMs)}`}
                {call.detail && ` · ${call.detail}`}
              </p>
            ))}
          </details>
        )}
      </div>
    </li>
  );
}

export default function AnalysisProgress({
  task,
  run,
  className,
}: {
  task: Task;
  className?: string;
  run?: Pick<Run, 'result' | 'chart' | 'chartError'>;
}) {
  const running = task.status === 'running' || task.status === 'cancelling';
  const [now, setNow] = useState(Date.now);
  const [expanded, setExpanded] = useState(true);
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running, task.id]);
  const steps = progressSteps(task.events, task.status, task.finishedAt);
  const current = [...steps].reverse().find((step) => step.status === 'running');
  const setup = steps.filter((step) => preparationStages.has(step.stage));
  const work = steps.filter((step) => !preparationStages.has(step.stage));
  const completed = [...work].reverse().filter((step) => step.status === 'done');
  const summaryStep = completed.find((step) => step.stage === 'summarize');
  const chartStep = completed.find((step) => step.stage === 'visualize');
  const result = run?.result || task.preview;
  const conclusion = result?.text ? (
    <Artifact
      className={summaryStep ? 'mt-1.5' : undefined}
      title={run ? '查看分析结论' : '查看已生成的结论（中间结果）'}
      content={() => result.text}
    />
  ) : null;
  const chart = run?.chart ? (
    <Artifact
      className={chartStep ? 'mt-1.5' : undefined}
      title={`查看最终图表配置 · ${run.chart.chartType}`}
      content={() => JSON.stringify(run.chart!.config, null, 2)}
    />
  ) : null;
  const setupDone = setup.length > 0 && setup.every((step) => step.status === 'done');
  const last = task.events.at(-1);
  const start = task.startedAt || task.events[0]?.at;
  const end = running ? now : Date.parse(task.finishedAt || last?.at || '');
  const elapsed = start ? progressDuration(Math.max(0, end - Date.parse(start))) : '—';
  const lastCall = current?.calls.at(-1);
  const waiting = lastCall?.stage === 'modelstart';
  const waitingMs = waiting ? Math.max(0, now - Date.parse(lastCall.at)) : 0;
  const title = {
    running: '正在分析',
    done: '分析已完成',
    error: '分析未完成',
    cancelled: '分析已取消',
    cancelling: '正在停止',
    interrupted: '分析已中断',
  }[task.status];
  return (
    <section
      className={cx('my-3 mx-0 p-3 bg-page border border-line rounded-control', className)}
      aria-label="实时执行过程"
    >
      {task.persistenceError && <Alert type="warning" title={task.persistenceError} />}
      <div className="flex gap-2 items-center">
        {running ? (
          <Spin size="small" />
        ) : task.status === 'done' ? (
          <CheckCircleIcon />
        ) : task.status === 'cancelled' ? (
          <StopCircleIcon />
        ) : (
          <XCircleIcon />
        )}
        <strong>{title}</strong>
        <span className="ml-auto text-muted text-helper">
          {running ? '已用时' : '耗时'} {elapsed}
        </span>
      </div>
      <small className="text-muted">
        {task.sourceName} · {task.modelName}
        {task.strategy && ` · ${analysisLabel(task.strategy)}`}
      </small>
      <div className="my-3 mx-0 pl-2.5 [border-left:2px_solid_var(--accent)]" role="status">
        <strong>
          {running
            ? task.status === 'cancelling'
              ? '正在取消，等待当前操作结束'
              : current?.label || (steps.length ? '正在完成本次分析' : '正在准备分析')
            : task.error || '执行结束，已保留查询和过程记录'}
        </strong>
        {running && task.status !== 'cancelling' && current && (
          <p className="my-[5px] mx-0 text-helper text-muted">{stageDescription(current.stage)}</p>
        )}
        {waiting && task.status === 'running' && (
          <p className="my-[5px] mx-0 text-helper text-muted">
            {lastCall.label} · 等待响应 {progressDuration(waitingMs)}
            {waitingMs >= 20000 && (
              <span className="block mt-1">尚未收到完整响应，可继续等待或停止分析。</span>
            )}
          </p>
        )}
      </div>
      <button
        className="border-0 p-0 bg-transparent text-accent"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        {expanded ? '收起' : '查看'}执行过程 · {steps.length} 个步骤
      </button>
      {expanded && (
        <div className="mt-3">
          {setupDone ? (
            <details>
              <summary className="text-helper cursor-pointer">
                <CheckCircleIcon /> 数据准备已完成{' '}
                <span className="text-muted">
                  · {progressDuration(setup.reduce((sum, step) => sum + (step.durationMs || 0), 0))} ·{' '}
                  {setup.length} 项
                </span>
              </summary>
              <ol className="list-none p-0 m-0" aria-label="数据准备记录">
                {setup.map((step, index) => (
                  <Step key={index} step={step} now={now} />
                ))}
              </ol>
            </details>
          ) : (
            !!setup.length && (
              <ol className="list-none p-0 m-0" aria-label="数据准备记录">
                {setup.map((step, index) => (
                  <Step key={index} step={step} now={now} />
                ))}
              </ol>
            )
          )}
          {!!work.length && (
            <ol className="list-none p-0 m-0" aria-label="执行记录">
              {work.map((step, index) => (
                <Step key={index} step={step} now={now}>
                  {step === summaryStep && conclusion}
                  {step === chartStep && chart}
                </Step>
              ))}
            </ol>
          )}
          {!steps.length && (
            <p className="text-muted">{running ? '任务已提交，正在准备分析…' : '暂无执行步骤记录'}</p>
          )}
          {!summaryStep && conclusion}
          {!chartStep && chart}
        </div>
      )}
    </section>
  );
}
