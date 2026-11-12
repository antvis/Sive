import type { AnalysisMessage, AnalysisTaskEvent } from '../../types';

function cellText(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

export function AnalysisMessageView({
  message,
  activeTask,
}: {
  message: AnalysisMessage;
  activeTask?: AnalysisTaskEvent | null;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="m-0 max-w-[85%] rounded-xl bg-accent-soft px-4 py-3 text-sm leading-6 whitespace-pre-wrap">
          {message.content.question}
        </p>
      </div>
    );
  }

  if (message.status === 'running' || message.status === 'cancelling') {
    return (
      <p className="m-0 text-sm text-muted">
        {activeTask?.taskId === message.id ? activeTask.stage : message.content.stage || '正在分析…'}
      </p>
    );
  }
  if (message.status === 'error') {
    return <p className="m-0 text-sm text-danger">{message.content.error || '分析失败，请重试。'}</p>;
  }
  if (message.status === 'cancelled' || message.status === 'interrupted') {
    return (
      <p className="m-0 text-sm text-muted">
        {message.status === 'cancelled' ? '分析已取消。' : '分析已中断。'}
      </p>
    );
  }

  const { text, sql, chartHtml, schema: columns = [], data = [] } = message.content;
  return (
    <div className="grid gap-4">
      {text && <div className="text-sm leading-6 whitespace-pre-wrap">{text}</div>}
      {chartHtml && (
        <iframe
          title="分析图表"
          srcDoc={chartHtml}
          sandbox="allow-scripts"
          className="h-80 w-full rounded-xl border-0 bg-surface"
        />
      )}
      {!!data.length && (
        <div className="overflow-auto rounded-xl bg-page p-3">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.name} className="border-b px-2 py-2 text-left font-medium text-muted">
                    {column.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 20).map((row, index) => (
                <tr key={index}>
                  {columns.map((column) => (
                    <td
                      key={column.name}
                      className="max-w-48 truncate border-b px-2 py-2"
                      title={cellText(row[column.name])}
                    >
                      {cellText(row[column.name])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.length > 20 && <p className="mt-2 mb-0 text-xs text-muted">仅展示前 20 行</p>}
        </div>
      )}
      {sql && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">查看 SQL</summary>
          <pre className="mt-2 overflow-auto rounded-xl bg-page p-3 text-xs leading-5 whitespace-pre-wrap">
            {sql}
          </pre>
        </details>
      )}
    </div>
  );
}
