import {
  CircleNotchIcon,
  FileTextIcon,
  MinusCircleIcon,
  PencilSimpleIcon,
  SparkleIcon,
  StopCircleIcon,
  TerminalIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import { cx } from '../../utils/cx';
import type { ProgressStep as Step } from '@shared/progress';

const stageIcons = {
  source: FileTextIcon,
  schema: FileTextIcon,
  profile: FileTextIcon,
  semantic: FileTextIcon,
  query: TerminalIcon,
  visualize: PencilSimpleIcon,
};

const statusLabels = {
  running: '进行中',
  done: '已完成',
  error: '失败',
  stopped: '已停止',
  skipped: '已跳过',
};

export default function ProgressStep({ step }: { step: Step }) {
  const active = step.status === 'running';
  const Icon = {
    running: CircleNotchIcon,
    error: XCircleIcon,
    stopped: StopCircleIcon,
    skipped: MinusCircleIcon,
    done: stageIcons[step.stage as keyof typeof stageIcons] || SparkleIcon,
  }[step.status];
  const observation = step.observation;
  const expandable = !!(step.detail || observation || step.recovery || step.sql);
  const Container = expandable ? 'details' : 'div';
  const Heading = expandable ? 'summary' : 'div';
  const previewCaption =
    observation &&
    (observation.rowCount === undefined || observation.columnCount === undefined
      ? `此记录仅保存 ${observation.rows.length} 行、${observation.columns.length} 列预览`
      : [
          observation.rows.length < observation.rowCount
            ? `显示前 ${observation.rows.length} 行，共 ${observation.rowCount} 行`
            : `显示全部 ${observation.rowCount} 行`,
          observation.columns.length < observation.columnCount
            ? `前 ${observation.columns.length} 列，共 ${observation.columnCount} 列`
            : `${observation.columnCount} 列`,
        ].join(' · '));
  const summary = (step.detail || previewCaption || step.recovery || step.sql)?.replace(/\s+/g, ' ').trim();

  return (
    <li className="min-w-0">
      <Container className="m-0">
        <Heading className="flex items-center gap-2 rounded-control px-2 py-2 text-helper before:hidden hover:bg-neutral-soft">
          <Icon
            className={cx(
              'size-4 shrink-0',
              active && 'animate-spin',
              step.status === 'error' && 'text-danger',
            )}
            aria-label={statusLabels[step.status]}
          />
          <span className="min-w-0 max-w-[45%] shrink-0 truncate text-ink" title={step.label}>
            {step.label}
          </span>
          {summary && (
            <span
              className="min-w-0 flex-1 truncate rounded-control border border-line bg-neutral-soft px-2 py-0.5 text-muted"
              title={summary}
            >
              {summary}
            </span>
          )}
        </Heading>
        {expandable && (
          <div className="my-1 ml-2 border-l border-line py-1 pl-4 text-helper text-muted">
            {step.detail && <p className="my-1 whitespace-pre-wrap wrap-anywhere">{step.detail}</p>}
            {step.observation && (
              <div className="my-2 max-h-80 overflow-auto" tabIndex={0} aria-label="本轮查询结果预览">
                <table className="w-full border-collapse text-left">
                  <caption className="pb-2 text-left">{previewCaption}</caption>
                  <thead>
                    <tr>
                      {step.observation.columns.map((column, index) => (
                        <th key={index} className="border-b border-line px-2 py-1 font-medium text-ink">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {step.observation.rows.map((row, index) => (
                      <tr key={index}>
                        {row.map((value, index) => (
                          <td key={index} className="max-w-60 border-b border-line px-2 py-1 wrap-anywhere">
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {step.recovery && <p className="my-1 wrap-anywhere">{step.recovery}</p>}
            {step.sql && (
              <pre className="my-2 max-h-60 overflow-auto" tabIndex={0} aria-label="本次查询 SQL">
                {step.sql}
              </pre>
            )}
          </div>
        )}
      </Container>
    </li>
  );
}
