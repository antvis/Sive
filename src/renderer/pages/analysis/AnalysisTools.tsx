import { getToolName } from 'ai';
import {
  CircleNotchIcon,
  ClockCounterClockwiseIcon,
  FileIcon,
  ChartBarIcon,
  BookOpenIcon,
  TerminalIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  CaretRightIcon,
} from '@phosphor-icons/react';
import type { AnalysisOutput } from '@shared/contracts';
import { analysisTools } from '@shared/analysisTools';
import { cx } from '../../utils/cx';

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
        const name = getToolName(part);
        const presentation = {
          source: { label: '加载数据', call: 'ava.source()', icon: FileIcon },
          schema: { label: '查看表结构', call: 'ava.schema()', icon: FileIcon },
          profile: { label: '查看数据统计', call: 'ava.profile()', icon: ChartBarIcon },
          semantic: { label: '读取业务语义', call: 'ava.semantic()', icon: BookOpenIcon },
          analyze: { label: '分析数据', call: 'ava.analyze(query)', icon: TerminalIcon },
          inspect: { label: '查看已有结果', call: 'inspect(resultId)', icon: MagnifyingGlassIcon },
          visualize: { label: '生成图表', call: 'visualize(resultId)', icon: PencilSimpleIcon },
        }[name] ?? { label: name, call: name, icon: FileIcon };
        const Icon = historical ? ClockCounterClockwiseIcon : running ? CircleNotchIcon : presentation.icon;
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
              : part.type === 'tool-analyze' || part.type === 'tool-visualize'
                ? part.input?.query
                : part.type === 'tool-source' && part.state === 'output-available'
                  ? part.output.name
                  : undefined;
        return (
          <details key={part.toolCallId} className="group/tool">
            <summary className="flex min-w-0 items-center gap-2 rounded-control py-1 px-1 hover:bg-neutral-soft [&::before]:hidden">
              <span
                className={cx(
                  'relative flex size-4 shrink-0 items-center justify-center',
                  failed && 'text-danger',
                )}
                aria-hidden="true"
              >
                <Icon
                  size={14}
                  className={cx(
                    'transition-opacity group-hover/tool:opacity-0 group-focus-within/tool:opacity-0',
                    running && 'animate-spin',
                  )}
                />
                <CaretRightIcon
                  size={14}
                  className="absolute opacity-0 transition-[opacity,rotate] group-hover/tool:opacity-100 group-focus-within/tool:opacity-100 group-open/tool:rotate-90"
                />
              </span>
              <span className="w-[6em] shrink-0 whitespace-nowrap text-ink">{presentation.label}</span>
              <span className="shrink-0 whitespace-nowrap rounded-control border border-line bg-neutral-soft px-2 py-0.5">
                <code>{presentation.call}</code> · {status}
              </span>
              <span className="min-w-0 flex-1 truncate">{detail}</span>
            </summary>
            <div className="my-1 ml-2 border-l border-line py-1 pl-4">
              {part.input && Object.keys(part.input).length > 0 && (
                <pre className="whitespace-pre-wrap wrap-anywhere">{JSON.stringify(part.input, null, 2)}</pre>
              )}
              {part.state === 'output-error' && <p role="alert">{part.errorText}</p>}
              {part.state === 'output-available' &&
                (part.type === 'tool-source' ||
                part.type === 'tool-schema' ||
                part.type === 'tool-profile' ||
                part.type === 'tool-semantic' ? (
                  <>
                    {part.type === 'tool-profile' && <p>导入或刷新数据源时保存的统计快照。</p>}
                    <pre className="whitespace-pre-wrap wrap-anywhere">
                      {JSON.stringify(part.output, null, 2)}
                    </pre>
                  </>
                ) : (
                  <p>
                    {part.type === 'tool-visualize' && part.output.chartType
                      ? `${part.output.chartType} · `
                      : ''}
                    {part.output.resultId && `结果编号：${part.output.resultId}`}
                  </p>
                ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
