import { cx } from '../shared/cx';
import { useEffect, useState, type ReactNode } from 'react';
import { Button, TextArea, Tooltip } from './ui';
import { PencilSimpleIcon, CopyIcon, CheckIcon } from '@phosphor-icons/react';
import logo from '../../assets/sive.svg';

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
  const copy = async () => {
    if (copying) return;
    setCopying(true);
    setFeedback('idle');
    try {
      await window.workbench.writeClipboard(typeof text === 'function' ? text() : text);
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
          className={cx('text-muted text-caption tabular-nums', compactTime && 'text-helper mr-1')}
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
        title={
          feedback === 'idle' ? (
            markdown ? (
              '复制回复（Markdown）'
            ) : (
              '复制问题'
            )
          ) : (
            <span role="status">{feedback === 'success' ? '复制成功' : '复制失败，请重试'}</span>
          )
        }
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

export function UserMessage({
  question,
  time,
  disabledReason,
  onResubmit,
}: {
  question: string;
  time?: string;
  disabledReason?: string;
  onResubmit: (question: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(question);
  const [sending, setSending] = useState(false);
  const submit = async (text: string) => {
    if (sending || disabledReason || !text.trim()) return;
    setSending(true);
    try {
      if (await onResubmit(text.trim())) setEditing(false);
    } finally {
      setSending(false);
    }
  };
  return (
    <section
      className="group/message flex flex-col items-end mt-1 mb-6 gap-1.5 min-w-0"
      aria-label="用户问题"
    >
      <div
        className={cx(
          'max-w-[92%] min-w-0 text-ink bg-[color-mix(in_srgb,_var(--muted)_8%,_var(--surface))] py-2.5 px-4 rounded-bubble',
          editing && 'w-full max-w-full pt-3.5 pb-3 border-0 rounded-editor',
        )}
      >
        {editing ? (
          <>
            <TextArea
              aria-label="编辑已发送的问题"
              autoFocus
              autoSize={{ minRows: 3, maxRows: 8 }}

              variant="borderless"
              className="p-0 rounded-none"
              value={draft}
              disabled={sending}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  if (!event.repeat) submit(draft);
                }
              }}
            />
            <div className="flex items-center justify-end flex-wrap mt-3 gap-2">
              <Button
                className="border-line bg-surface hover:bg-surface hover:brightness-95"
                size="small"
                disabled={sending}
                onClick={() => setEditing(false)}
              >
                取消
              </Button>
              <Button
                size="small"
                variant="primary"
                className="bg-ink text-surface hover:bg-ink hover:brightness-95"
                loading={sending}
                disabled={sending || !!disabledReason || !draft.trim()}
                title={disabledReason || '使用当前模型重新分析，原结果仍保留在历史中'}
                onClick={() => submit(draft)}
              >
                发送
              </Button>
            </div>
          </>
        ) : (
          <div className="font-normal whitespace-pre-wrap wrap-anywhere leading-[1.7]">{question}</div>
        )}
      </div>
      {!editing && (
        <MessageActions className="pr-2 gap-1.5" time={time} text={question} compactTime>
          <Tooltip title={disabledReason || '修改此问题后重新发送'}>
            <Button
              variant="ghost"
              className="hover:text-muted"
              size="small"
              icon={<PencilSimpleIcon />}
              aria-label="编辑问题"
              disabled={!!disabledReason || sending}
              onClick={() => {
                setDraft(question);
                setEditing(true);
              }}
            />
          </Tooltip>
        </MessageActions>
      )}
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
      <div className="flex items-center gap-[7px] text-helper text-ink mb-2.5">
        <img className="size-5 dark:[filter:invert(1)]" src={logo} alt="" />
        <strong>Sive</strong>
        <span className="text-muted font-normal">数据分析</span>
      </div>
      {children}
      <MessageActions className="justify-start mt-2" time={time} text={markdown} markdown />
    </section>
  );
}
