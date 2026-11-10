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
import type { AnalysisOutput, AnalysisToolPart } from '@shared/contracts';
import { analysisTools } from '@shared/analysis';
import { cx } from '../../utils/cx';

const presentations: Record<string, { label: string; call: string; icon: typeof FileIcon }> = {
  source: { label: '加载数据', call: 'ava.source()', icon: FileIcon },
  schema: { label: '查看表结构', call: 'ava.schema()', icon: FileIcon },
  profile: { label: '查看数据统计', call: 'ava.profile()', icon: ChartBarIcon },
  semantic: { label: '读取业务语义', call: 'ava.semantic()', icon: BookOpenIcon },
  analyze: { label: '分析数据', call: 'ava.analyze(query)', icon: TerminalIcon },
  inspect: { label: '查看已有结果', call: 'inspect(resultId)', icon: MagnifyingGlassIcon },
  visualize: { label: '生成图表', call: 'visualize(resultId)', icon: PencilSimpleIcon },
};

function toolStatus(part: AnalysisToolPart, active: boolean) {
  if (part.title === '历史调用') return '历史调用';
  switch (part.state) {
    case 'input-streaming':
      return active ? '准备中' : '已中断';
    case 'input-available':
      return active ? '进行中' : '已中断';
    case 'output-error':
    case 'output-denied':
      return '失败';
    default:
      if (
        part.type === 'tool-visualize' &&
        part.state === 'output-available' &&
        part.output.chartType === null
      )
        return '无需绘图';
      return '已完成';
  }
}

function toolDetail(part: AnalysisToolPart) {
  if (part.state === 'output-error') return part.errorText;
  switch (part.type) {
    case 'tool-inspect':
      return part.input?.resultId;
    case 'tool-analyze':
    case 'tool-visualize':
      return part.input?.query;
    case 'tool-source':
      if (part.state === 'output-available') return part.output.name;
  }
}

function ToolOutput({ part }: { part: AnalysisToolPart }) {
  if (part.state === 'output-error') return <p role="alert">{part.errorText}</p>;
  if (part.state !== 'output-available') return null;
  switch (part.type) {
    case 'tool-source':
    case 'tool-schema':
    case 'tool-profile':
    case 'tool-semantic':
      return (
        <>
          {part.type === 'tool-profile' && <p>导入或刷新数据源时保存的统计快照。</p>}
          <pre className="whitespace-pre-wrap wrap-anywhere">{JSON.stringify(part.output, null, 2)}</pre>
        </>
      );
    default:
      return (
        <p>
          {part.type === 'tool-visualize' && part.output.chartType && `${part.output.chartType} · `}
          {part.output.resultId && `结果编号：${part.output.resultId}`}
        </p>
      );
  }
}

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
        const presentation = presentations[name] ?? { label: name, call: name, icon: FileIcon };
        let Icon = presentation.icon;
        if (running) Icon = CircleNotchIcon;
        if (historical) Icon = ClockCounterClockwiseIcon;
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
                <code>{presentation.call}</code> · {toolStatus(part, active)}
              </span>
              <span className="min-w-0 flex-1 truncate">{toolDetail(part)}</span>
            </summary>
            <div className="my-1 ml-2 border-l border-line py-1 pl-4">
              {part.input && Object.keys(part.input).length > 0 && (
                <pre className="whitespace-pre-wrap wrap-anywhere">{JSON.stringify(part.input, null, 2)}</pre>
              )}
              <ToolOutput part={part} />
            </div>
          </details>
        );
      })}
    </div>
  );
}
