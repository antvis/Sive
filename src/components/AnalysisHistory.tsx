import { useEffect, useState } from 'react';
import { useUI, Button, Empty, SearchInput, Pagination, Tag, Tooltip } from './ui';
import { BroomIcon, FileTextIcon, CircleNotchIcon, CaretRightIcon } from '@phosphor-icons/react';
import type { Task } from '../../shared/contracts';
import { groupHistory, historyTime } from '../shared/history-groups';
const statusLabels: Record<Task['status'], string> = {
  running: '分析中',
  cancelling: '正在停止',
  done: '已完成',
  error: '失败',
  cancelled: '已取消',
  interrupted: '已中断',
};

const statusColors: Record<Task['status'], string> = {
  running: 'processing',
  cancelling: 'warning',
  done: 'success',
  error: 'error',
  cancelled: 'default',
  interrupted: 'warning',
};

export default function AnalysisHistory({
  tasks,
  onOpen,
  onClear,
  busy,
}: {
  tasks: Task[];
  onOpen: (task: Task) => void;
  onClear: () => Promise<void>;
  busy: boolean;
}) {
  const { confirm, message } = useUI();
  const [clearing, setClearing] = useState(false);
  const clear = async () => {
    await confirm({
      title: '清空全部会话记录？',
      content: `将清空全部 ${tasks.length} 条执行记录，包括搜索未显示的记录。会话中的分析结果、收藏的分析及数据源会保留。清空后无法恢复这些执行记录。`,
      okText: '清空历史',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        setClearing(true);
        try {
          await onClear();
          setSearch('');
          setPage(1);
          message.success('会话记录已清空');
        } finally {
          setClearing(false);
        }
      },
    });
  };
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, 60000);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  const filtered = tasks
    .filter((task) =>
      [task.question, task.sourceName, task.modelName].some((text) =>
        text?.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
      ),
    )
    .sort((a, b) => (historyTime(b) ?? -Infinity) - (historyTime(a) ?? -Infinity));
  const pageSize = 20;
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const groups = groupHistory(filtered.slice((current - 1) * pageSize, current * pageSize), now);
  return (
    <section className="analysis-history" aria-label="会话记录列表">
      <div className="toolbar toolbar-divider">
        <SearchInput
          aria-label="搜索会话记录"
          placeholder="搜索问题、数据或模型"
          allowClear
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <span className="history-count">{filtered.length} 条记录</span>
        <span className="min-w-[4px] flex-1" />
        <Tooltip title={busy ? '请等待当前分析结束后再清空历史' : '清空历史'}>
          <Button
            variant="ghost"
            danger
            aria-label="清空历史"
            icon={<BroomIcon />}
            disabled={!tasks.length || busy || clearing}
            onClick={clear}
          />
        </Tooltip>
      </div>
      {filtered.length ? (
        <div className="history-groups">
          {groups.map(({ label, tasks }) => (
            <section className="history-group" aria-label={label} key={label}>
              <h3>{label}</h3>
              <ul className="history-list">
                {tasks.map((task) => {
                  const timestamp = historyTime(task);
                  const date = timestamp === undefined ? undefined : new Date(timestamp);
                  return (
                    <li key={task.id}>
                      <button
                        type="button"
                        className="history-row"
                        aria-label={'查看过程：' + task.question}
                        onClick={() => onOpen(task)}
                      >
                        <span className="history-row-icon">
                          {task.status === 'running' || task.status === 'cancelling' ? (
                            <CircleNotchIcon className="ui-icon animate-spin" />
                          ) : (
                            <FileTextIcon />
                          )}
                        </span>
                        <span className="history-row-main">
                          <strong title={task.question}>{task.question}</strong>
                          <span className="history-row-meta">
                            <span>{task.sourceName || '未记录数据源'}</span>
                            <span>{task.modelName || '未记录模型'}</span>
                          </span>
                        </span>
                        <span className="history-row-status">
                          <Tag color={statusColors[task.status]}>{statusLabels[task.status]}</Tag>
                          {date ? (
                            <time dateTime={date.toISOString()} title={date.toLocaleString('zh-CN')}>
                              {date.toLocaleString('zh-CN', {
                                ...(label !== '今天' && label !== '昨天'
                                  ? {
                                      month: '2-digit',
                                      day: '2-digit',
                                      ...(date.getFullYear() !== now.getFullYear()
                                        ? { year: 'numeric' }
                                        : {}),
                                    }
                                  : {}),
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                              })}
                            </time>
                          ) : (
                            <span>—</span>
                          )}
                        </span>
                        <CaretRightIcon className="history-row-arrow" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <Empty description={search ? '没有匹配的历史记录' : '暂无会话记录，发起分析后可在这里查看执行过程'} />
      )}
      {filtered.length > pageSize && (
        <Pagination
          className="collection-pagination"
          current={current}
          pageSize={pageSize}
          total={filtered.length}
          onChange={setPage}
        />
      )}
    </section>
  );
}
