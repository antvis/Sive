import { cx } from '../shared/cx';
import { useEffect, useState, type ReactNode } from 'react';
import { Button, TextArea, Tooltip } from './ui';
import { PencilSimpleIcon, CopyIcon, CheckIcon } from '@phosphor-icons/react';
import logo from '../../assets/sive-logo.svg';

function MessageActions({
  time,
  text,
  markdown = false,
  compactTime = false,
  children,
}: {
  time?: string;
  text: string | (() => string);
  markdown?: boolean;
  compactTime?: boolean;
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
      className="flex items-center justify-end flex-wrap gap-1 [&_.ui-button-ghost]:text-muted [&_.ui-button-ghost]:text-helper message-hover-actions min-h-7 opacity-0 pointer-events-none data-[feedback=true]:opacity-100 data-[feedback=true]:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto"
      data-feedback={feedback !== 'idle'}
    >
      {date && Number.isFinite(date.getTime()) && (
        <time
          className="text-muted text-caption tabular-nums"
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
      className="flex flex-col items-end mt-1 mr-0 mb-6 ml-0 gap-1.5 min-w-0 [&_>_.message-hover-actions]:pr-2 [&_>_.message-hover-actions]:gap-1.5 [&_>_.message-hover-actions_time]:text-helper [&_>_.message-hover-actions_time]:mr-1 [&:hover_>_.message-hover-actions]:opacity-100 [&:hover_>_.message-hover-actions]:pointer-events-auto [&:focus-within_>_.message-hover-actions]:opacity-100 [&:focus-within_>_.message-hover-actions]:pointer-events-auto"
      aria-label="用户问题"
    >
      <div
        className={cx(
          'max-w-[92%] min-w-0 text-ink bg-[color-mix(in_srgb,_var(--muted)_8%,_var(--surface))] py-2.5 px-4 rounded-[20px] [&.editing]:w-full [&.editing]:max-w-full [&.editing]:pt-3.5 [&.editing]:pr-4 [&.editing]:pb-3 [&.editing]:pl-4 [&.editing]:border-0 [&.editing]:rounded-[calc(var(--radius)_+_14px)] [&.editing]:bg-[color-mix(in_srgb,_var(--muted)_8%,_var(--surface))] [&.editing_.ui-textarea]:p-0 [&.editing_.ui-textarea]:rounded-none [&.editing_.ui-textarea]:text-body [&.editing_.ui-textarea]:leading-[1.7]',
          editing ? ' editing' : '',
        )}
      >
        {editing ? (
          <>
            <TextArea
              aria-label="编辑已发送的问题"
              autoFocus
              autoSize={{ minRows: 3, maxRows: 8 }}

              variant="borderless"
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
            <div className="flex items-center justify-end flex-wrap [&_.ui-button-ghost]:text-muted [&_.ui-button-ghost]:text-helper mt-3 gap-2 [&_.ui-button-secondary]:border-line [&_.ui-button-secondary]:bg-surface [&_.ui-button-primary]:bg-ink [&_.ui-button-primary]:text-surface [&_.ui-button:hover:not(:disabled)]:[filter:brightness(0.95)]">
              <Button size="small" disabled={sending} onClick={() => setEditing(false)}>
                取消
              </Button>
              <Button
                size="small"
                variant="primary"
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
        <MessageActions time={time} text={question} compactTime>
          <Tooltip title={disabledReason || '修改此问题后重新发送'}>
            <Button
              variant="ghost"
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
    <section
      className="[&:hover_>_.message-hover-actions]:opacity-100 [&:hover_>_.message-hover-actions]:pointer-events-auto [&:focus-within_>_.message-hover-actions]:opacity-100 [&:focus-within_>_.message-hover-actions]:pointer-events-auto [&_>_.message-hover-actions]:justify-start [&_>_.message-hover-actions]:mt-2 min-w-0 [&_>_.task]:mt-0 [&_>_p]:text-helper"
      aria-label="Sive 回复"
    >
      <div className="flex items-center gap-[7px] text-helper text-ink mb-2.5">
        <img className="w-5 h-5 dark:[filter:invert(1)]" src={logo} alt="" />
        <strong>Sive</strong>
        <span className="[&:last-child:not(.ui-icon)]:text-muted [&:last-child:not(.ui-icon)]:font-normal">
          数据分析
        </span>
      </div>
      {children}
      <MessageActions time={time} text={markdown} markdown />
    </section>
  );
}
