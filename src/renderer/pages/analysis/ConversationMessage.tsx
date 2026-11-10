import { cx } from '@renderer/utils/cx';
import { useEffect, useState, type ReactNode } from 'react';
import { Button, Tooltip } from '@renderer/components/ui/index';
import { CopyIcon, CheckIcon } from '@phosphor-icons/react';
import logo from '@assets/sive.svg';

function MessageActions({
  time,
  text,
  markdown = false,
  compactTime = false,
  className,
  children,
}: {
  time?: string;
  text: string | (() => string);
  markdown?: boolean;
  compactTime?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const [copying, setCopying] = useState(false);
  const [feedback, setFeedback] = useState<'idle' | 'success' | 'error'>('idle');
  useEffect(() => {
    if (feedback === 'idle') return;
    const timer = window.setTimeout(() => setFeedback('idle'), 2000);
    return () => window.clearTimeout(timer);
  }, [feedback]);
  const date = time ? new Date(time) : undefined;
  const copyLabel = markdown ? '复制回复（Markdown）' : '复制问题';
  const feedbackLabel = feedback === 'success' ? '复制成功' : '复制失败，请重试';
  const copy = async () => {
    if (copying) return;
    setCopying(true);
    setFeedback('idle');
    try {
      await window.workbench.clipboardWrite(typeof text === 'function' ? text() : text);
      setFeedback('success');
    } catch {
      setFeedback('error');
    } finally {
      setCopying(false);
    }
  };
  return (
    <div
      className={cx(
        'flex items-center justify-end flex-wrap gap-1 min-h-7 opacity-0 pointer-events-none group-hover/message:opacity-100 group-hover/message:pointer-events-auto group-focus-within/message:opacity-100 group-focus-within/message:pointer-events-auto data-[feedback=true]:opacity-100 data-[feedback=true]:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto',
        className,
      )}
      data-feedback={feedback !== 'idle'}
    >
      {date && Number.isFinite(date.getTime()) && (
        <time
          className={cx('text-muted text-helper tabular-nums', compactTime && 'text-helper mr-1')}
          dateTime={date.toISOString()}
          title={date.toLocaleString('zh-CN', { hour12: false })}
        >
          {compactTime
            ? date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
            : date.toLocaleString('zh-CN', { hour12: false })}
        </time>
      )}
      <Tooltip
        open={feedback === 'idle' ? undefined : true}
        title={feedback === 'idle' ? copyLabel : <span role="status">{feedbackLabel}</span>}
      >
        <Button
          variant="ghost"
          className="hover:text-muted"
          size="small"
          icon={feedback === 'success' ? <CheckIcon /> : <CopyIcon />}
          aria-label={markdown ? '复制回复' : '复制问题'}
          disabled={!text || copying}
          onClick={() => copy()}
        />
      </Tooltip>
      {children}
    </div>
  );
}

export function UserMessage({ question, time }: { question: string; time?: string }) {
  return (
    <section
      className="group/message flex flex-col items-end mt-1 mb-6 gap-1.5 min-w-0"
      aria-label="用户问题"
    >
      <div className="max-w-[92%] min-w-0 text-ink bg-neutral-soft py-2.5 px-4 rounded-[20px]">
        <div className="font-normal whitespace-pre-wrap wrap-anywhere leading-[1.7]">{question}</div>
      </div>
      <MessageActions className="pr-2 gap-1.5" time={time} text={question} compactTime />
    </section>
  );
}

export function AssistantMessage({
  children,
  time,
  markdown,
}: {
  children: ReactNode;
  time?: string;
  markdown: string | (() => string);
}) {
  return (
    <section className="group/message min-w-0" aria-label="Sive 回复">
      <div className="flex items-center gap-2 text-helper text-ink mb-2.5">
        <img className="size-5 dark:[filter:invert(1)]" src={logo} alt="" />
        <strong>Sive</strong>
        <span className="text-muted font-normal">数据分析</span>
      </div>
      {children}
      <MessageActions className="justify-start mt-2" time={time} text={markdown} markdown />
    </section>
  );
}
