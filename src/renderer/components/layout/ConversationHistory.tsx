import { cx } from '@renderer/utils/cx';
import { navigationItem, navigationIconButton } from '@renderer/components/layout/navigationStyles';
import { Button, Input, Tooltip } from '@renderer/components/ui/index';
import { ArchiveIcon, CheckIcon, PencilSimpleIcon, XIcon } from '@phosphor-icons/react';
import type { Conversation, RunSummary, Task } from '@shared/contracts';
import { conversationStatus } from '@renderer/utils/conversationView';
import type { ConversationReadPositions } from '@renderer/data/conversationRead';
import { useEffect, useId, useRef, useState } from 'react';
import { useUI } from '../../hooks/useUI';
import { errorMessage } from '../../utils/feedback';

const statusLabels: Partial<Record<Task['status'], string>> = {
  running: '分析中',
  cancelling: '正在停止',
  error: '分析失败',
  interrupted: '已中断',
  cancelled: '已取消',
};

export default function ConversationHistory({
  conversations,
  runs,
  tasks,
  readPositions,
  currentId,
  disabled,
  onSelect,
  archiveDisabled,
  onArchive,
}: {
  archiveDisabled: (conversation: Conversation) => boolean;
  onArchive: (conversation: Conversation) => void;
  conversations: Conversation[];
  runs: RunSummary[];
  tasks: Task[];
  readPositions: ConversationReadPositions;
  currentId: string;
  disabled: boolean;
  onSelect: (conversation: Conversation) => void;
}) {
  const { message } = useUI();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const errorId = useId();
  useEffect(() => {
    if (editingId) {
      input.current?.focus();
      input.current?.select();
    }
  }, [editingId]);

  const rename = async (conversation: Conversation) => {
    if (saving || disabled) return;
    const title = titleDraft.trim();
    if (!title) {
      setEditError('请输入任务标题');
      input.current?.focus();
      return;
    }
    if (title === conversation.title) {
      setEditingId(null);
      return;
    }
    setSaving(true);
    setEditError('');
    try {
      await window.workbench.conversationRename(conversation.id, title);
      setEditingId(null);
      message.success('任务标题已修改');
    } catch (error) {
      setEditError(errorMessage(error));
      input.current?.focus();
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="flex flex-col gap-2.5 min-h-0 mt-6 pt-4 border-t border-t-line" aria-label="分析任务">
      <h2 className="m-0 shrink-0 px-3 text-helper font-medium text-muted">分析任务</h2>
      <div className="flex flex-col gap-1 overflow-y-auto min-h-0">
        {conversations.map((c) => {
          const { status, unreadSequence } = conversationStatus(c, runs, tasks, readPositions[c.id]);
          const label = status ? statusLabels[status] : undefined;
          return (
            <div className="group/history relative" key={c.id}>
              {editingId === c.id ? (
                <form
                  className="px-2 py-1"
                  aria-label={`修改分析任务标题：${c.title}`}
                  onSubmit={(event) => {
                    event.preventDefault();
                    rename(c);
                  }}
                  onKeyDown={(event) => {
                    if (event.nativeEvent.isComposing) {
                      if (event.key === 'Enter') event.preventDefault();
                      return;
                    }
                    if (event.key === 'Escape' && !saving) {
                      event.preventDefault();
                      setEditingId(null);
                    }
                  }}
                >
                  <div className="flex items-center gap-1">
                    <Input
                      ref={input}
                      aria-label="分析任务标题"
                      aria-invalid={!!editError}
                      aria-describedby={editError ? errorId : undefined}
                      value={titleDraft}
                      disabled={saving}
                      onChange={(event) => {
                        setTitleDraft(event.target.value);
                        setEditError('');
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="small"
                      icon={<CheckIcon />}
                      aria-label="保存任务标题"
                      loading={saving}
                      onClick={() => rename(c)}
                    />
                    <Button
                      variant="ghost"
                      size="small"
                      icon={<XIcon />}
                      aria-label="取消修改任务标题"
                      disabled={saving}
                      onClick={() => setEditingId(null)}
                    />
                  </div>
                  {editError && (
                    <p id={errorId} role="alert" className="m-0 mt-1 text-helper text-danger">
                      {editError}
                    </p>
                  )}
                </form>
              ) : (
                <>
                  <button
                    className={cx(navigationItem, 'flex-col items-stretch gap-1 pr-14')}
                    aria-current={c.id === currentId ? 'page' : undefined}
                    disabled={disabled}
                    onClick={() => onSelect(c)}
                  >
                    <span className="truncate text-helper" title={c.title}>
                      {c.title}
                    </span>
                    <span className="flex items-center gap-2 text-tiny text-muted">
                      <time dateTime={c.updatedAt}>{new Date(c.updatedAt).toLocaleDateString()}</time>
                      {label && (
                        <span className={status === 'error' ? 'text-danger' : undefined}>{label}</span>
                      )}
                      {unreadSequence !== undefined && <span className="text-accent-ink">未读</span>}
                    </span>
                  </button>
                  <div className="absolute right-1 top-2 flex items-center opacity-0 pointer-events-none group-hover/history:opacity-100 group-hover/history:pointer-events-auto group-focus-within/history:opacity-100 group-focus-within/history:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto">
                    <Tooltip title="修改标题">
                      <Button
                        className={cx(navigationIconButton, 'size-6 p-1')}
                        variant="ghost"
                        size="small"
                        icon={<PencilSimpleIcon />}
                        disabled={disabled || saving}
                        onClick={() => {
                          setTitleDraft(c.title);
                          setEditError('');
                          setEditingId(c.id);
                        }}
                        aria-label={`修改任务标题：${c.title}`}
                      />
                    </Tooltip>
                    <Tooltip title="归档会话">
                      <Button
                        className={cx(navigationIconButton, 'size-6 p-1')}
                        variant="ghost"
                        size="small"
                        icon={<ArchiveIcon />}
                        disabled={archiveDisabled(c)}
                        onClick={() => onArchive(c)}
                        aria-label={`归档会话：${c.title}`}
                      />
                    </Tooltip>
                  </div>
                </>
              )}
            </div>
          );
        })}
        {!conversations.length && <p className="text-muted px-2.5 text-helper">暂无分析任务</p>}
      </div>
    </section>
  );
}
