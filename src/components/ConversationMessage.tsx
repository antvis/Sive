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
    <div className="message-actions message-hover-actions" data-feedback={feedback !== 'idle'}>
      {date && Number.isFinite(date.getTime()) && (
        <time dateTime={date.toISOString()} title={date.toLocaleString('zh-CN', { hour12: false })}>
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
          onClick={() => void copy()}
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
    if (sending || disabledReason || !text.trim() || text.length > 6000) return;
    setSending(true);
    try {
      if (await onResubmit(text.trim())) setEditing(false);
    } finally {
      setSending(false);
    }
  };
  return (
    <section className="user-message" aria-label="用户问题">
      <div className={'user-bubble' + (editing ? ' editing' : '')}>
        {editing ? (
          <>
            <TextArea
              aria-label="编辑已发送的问题"
              autoFocus
              autoSize={{ minRows: 3, maxRows: 8 }}
              maxLength={6000}
              variant="borderless"
              value={draft}
              disabled={sending}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  if (!event.repeat) void submit(draft);
                }
              }}
            />
            <div className="message-actions message-edit-actions">
              <Button size="small" disabled={sending} onClick={() => setEditing(false)}>
                取消
              </Button>
              <Button
                size="small"
                variant="primary"
                loading={sending}
                disabled={sending || !!disabledReason || !draft.trim()}
                title={disabledReason || '使用当前模型重新分析，原结果仍保留在历史中'}
                onClick={() => void submit(draft)}
              >
                发送
              </Button>
            </div>
          </>
        ) : (
          <div className="user-question-text">{question}</div>
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
    <section className="assistant-message" aria-label="Sive 回复">
      <div className="message-author">
        <img src={logo} alt="" />
        <strong>Sive</strong>
        <span>数据分析</span>
      </div>
      {children}
      <MessageActions time={time} text={markdown} markdown />
    </section>
  );
}
