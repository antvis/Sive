import { getToolName } from 'ai';
import {
  CircleNotchIcon,
  CheckIcon,
  XCircleIcon,
  StopCircleIcon,
  ClockCounterClockwiseIcon,
} from '@phosphor-icons/react';
import type { AnalysisOutput } from '@shared/contracts';
import { analysisTools } from '@shared/analysisTools';

export default function AnalysisTools({
  output,
  active = false,
}: {
  output?: AnalysisOutput;
  active?: boolean;
}) {
  const parts = analysisTools(output);
  if (!parts.length) return null;
  return (
    <div className="my-3 space-y-1 text-helper text-muted" aria-label="工具调用">
      {parts.map((part) => {
        const pending = part.state === 'input-streaming' || part.state === 'input-available';
        const failed = part.state === 'output-error' || part.state === 'output-denied';
        const historical = part.title === '历史调用';
        const running = pending && active && !historical;
        const Icon = historical
          ? ClockCounterClockwiseIcon
          : running
            ? CircleNotchIcon
            : failed
              ? XCircleIcon
              : pending
                ? StopCircleIcon
                : CheckIcon;
        const label = { analyze: '分析数据', inspect: '查看已有结果', visualize: '生成图表' }[
          getToolName(part)
        ];
        const status = historical
          ? '历史调用'
          : pending
            ? active
              ? part.state === 'input-streaming'
                ? '准备中'
                : '进行中'
              : '已中断'
            : failed
              ? '失败'
              : part.type === 'tool-visualize' &&
                  part.state === 'output-available' &&
                  part.output.chartType === null
                ? '无需绘图'
                : '已完成';
        const detail =
          part.state === 'output-error'
            ? part.errorText
            : part.type === 'tool-inspect'
              ? part.input?.resultId
              : part.input?.query;
        return (
          <details key={part.toolCallId}>
            <summary className="flex min-w-0 items-center gap-2 rounded-control py-2 pr-2 pl-4 hover:bg-neutral-soft">
              <Icon
                className={running ? 'shrink-0 animate-spin' : failed ? 'shrink-0 text-danger' : 'shrink-0'}
                aria-hidden="true"
              />
              <span className="shrink-0 whitespace-nowrap text-ink">{label}</span>
              <span className="shrink-0 whitespace-nowrap">{status}</span>
              <span className="min-w-0 flex-1 truncate">{detail}</span>
            </summary>
            <div className="my-1 ml-2 border-l border-line py-1 pl-4">
              <pre className="whitespace-pre-wrap wrap-anywhere">{JSON.stringify(part.input, null, 2)}</pre>
              {part.state === 'output-error' && <p role="alert">{part.errorText}</p>}
              {part.state === 'output-available' && (
                <p>
                  {part.type === 'tool-visualize' && part.output.chartType
                    ? `${part.output.chartType} · `
                    : ''}
                  {part.output.resultId && `结果编号：${part.output.resultId}`}
                </p>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
