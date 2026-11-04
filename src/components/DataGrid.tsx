import { useEffect, useMemo, useRef, useState, type ThHTMLAttributes } from 'react';
import { Button, Pagination, Tooltip } from './ui';
import {
  ArrowCounterClockwiseIcon,
  ArrowsDownUpIcon,
  CaretUpIcon,
  CaretDownIcon,
} from '@phosphor-icons/react';
import { clampColumnWidth, contentColumnWidths, MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH } from '../shared/grid';
import { compareNumeric, isNumericColumn, type TableField } from '../../shared/table-values';

type HeaderProps = ThHTMLAttributes<HTMLTableCellElement> & {
  columnName?: string;
  columnWidth?: number;
  onResize?: (width: number) => void;
  onReset?: () => void;
};

function ResizeHeader({ columnName, columnWidth, onResize, onReset, children, ...props }: HeaderProps) {
  const drag = useRef<{ id: number; start: number; width: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  return (
    <th {...props} aria-label={props['aria-label'] || columnName}>
      {children}
      {onResize && columnWidth !== undefined && (
        <span
          className={'column-resizer' + (dragging ? ' dragging' : '')}
          role="separator"
          aria-label={'调整列宽：' + columnName}
          aria-orientation="vertical"
          aria-valuemin={MIN_COLUMN_WIDTH}
          aria-valuemax={MAX_COLUMN_WIDTH}
          aria-valuenow={Math.round(columnWidth)}
          tabIndex={0}
          title="拖动调整列宽，双击恢复；也可使用左右方向键"
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => {
            event.stopPropagation();
            onReset?.();
          }}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.stopPropagation();
            drag.current = { id: event.pointerId, start: event.clientX, width: columnWidth };
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
          }}
          onPointerMove={(event) => {
            if (drag.current?.id === event.pointerId)
              onResize(clampColumnWidth(drag.current.width + event.clientX - drag.current.start));
          }}
          onPointerUp={(event) => {
            if (drag.current?.id !== event.pointerId) return;
            drag.current = null;
            setDragging(false);
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onLostPointerCapture={() => {
            drag.current = null;
            setDragging(false);
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              onResize(
                clampColumnWidth(
                  columnWidth + (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 40 : 10),
                ),
              );
            } else if (event.key === 'Home') {
              event.preventDefault();
              onReset?.();
            }
          }}
        />
      )}
    </th>
  );
}

const cell = (value: unknown) =>
  value === null || value === undefined
    ? '—'
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);

export default function Grid({
  rows,
  columns,
  fill = false,
  footer,
  resetKey,
  pageSize = 10,
}: {
  rows: Record<string, unknown>[];
  columns?: TableField[];
  fill?: boolean;
  footer?: import('react').ReactNode;
  resetKey?: string;
  pageSize?: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(0);
  const [widths, setWidths] = useState<Map<string, number>>(new Map());
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ name: string; order: 'ascend' | 'descend' } | null>(null);
  useEffect(() => {
    setPage(1);
    setSort(null);
    if (viewport.current) viewport.current.scrollTop = 0;
  }, [resetKey]);
  const fields = useMemo(
    () => columns ?? Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).map((name) => ({ name })),
    [columns, rows],
  );
  const numeric = useMemo(
    () => new Set(fields.filter((field) => isNumericColumn(field, rows)).map((field) => field.name)),
    [fields, rows],
  );
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setAvailable(Math.floor(entry.contentRect.width)));
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  const defaults = useMemo(
    () => contentColumnWidths(fields, rows, available, numeric),
    [fields, rows, available, numeric],
  );
  const resolved = fields.map((field, index) => widths.get(field.name) ?? defaults[index]);
  const total = Math.max(
    resolved.reduce((sum, width) => sum + width, 0),
    available,
    160,
  );
  const resize = (name: string, width: number) => {
    // Freeze the other visible widths so dragging one boundary never resizes its neighbours.
    setWidths(
      new Map(fields.map((field, index) => [field.name, field.name === name ? width : resolved[index]])),
    );
  };
  const sorted = useMemo(
    () =>
      sort
        ? [...rows].sort(
            (a, b) =>
              compareNumeric(a[sort.name], b[sort.name], sort.order) * (sort.order === 'descend' ? -1 : 1),
          )
        : rows,
    [rows, sort],
  );
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize)));
  const visible = fill ? sorted : sorted.slice((current - 1) * pageSize, current * pageSize);
  return (
    <div className={'data-grid' + (fill ? ' data-grid-fill' : '')} ref={root}>
      <div className="grid-table-viewport ui-table-scroll" ref={viewport}>
        <table className="ui-table data-table" style={{ width: total, tableLayout: 'fixed' }}>
          <colgroup>
            {fields.map((field, index) => (
              <col key={field.name} style={{ width: resolved[index] }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {fields.map(({ name }, index) => (
                <ResizeHeader
                  key={name}
                  scope="col"
                  columnName={name}
                  columnWidth={resolved[index]}
                  onResize={(width) => resize(name, width)}
                  onReset={() => resize(name, defaults[index])}
                  aria-sort={
                    numeric.has(name)
                      ? sort?.name === name
                        ? sort.order === 'ascend'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                      : undefined
                  }
                >
                  {numeric.has(name) ? (
                    <button
                      className="ui-sort"
                      title={name}
                      aria-label={'排序：' + name}
                      onClick={() => {
                        setSort(
                          sort?.name !== name
                            ? { name, order: 'ascend' }
                            : sort.order === 'ascend'
                              ? { name, order: 'descend' }
                              : null,
                        );
                        setPage(1);
                      }}
                    >
                      <span>{name}</span>
                      {sort?.name === name ? (
                        sort.order === 'ascend' ? (
                          <CaretUpIcon size={12} />
                        ) : (
                          <CaretDownIcon size={12} />
                        )
                      ) : (
                        <ArrowsDownUpIcon size={12} />
                      )}
                    </button>
                  ) : (
                    <span className="ui-column-title" title={name}>
                      {name}
                    </span>
                  )}
                </ResizeHeader>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => (
              <tr key={index}>
                {fields.map(({ name }) => {
                  const text = cell(row[name]);
                  return (
                    <td key={name} title={text}>
                      {text}
                    </td>
                  );
                })}
              </tr>
            ))}
            {!visible.length && (
              <tr>
                <td colSpan={Math.max(fields.length, 1)} className="ui-table-empty">
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!fill && rows.length > pageSize && (
        <Pagination current={current} pageSize={pageSize} total={rows.length} onChange={setPage} />
      )}
      <div className="grid-footer">
        {footer || <span>{rows.length} 行 · 排序仅作用于已加载数据</span>}
        <Tooltip title="恢复全部列宽；拖动表头右边界可调整，双击可恢复单列">
          <Button
            size="small"
            variant="ghost"
            icon={<ArrowCounterClockwiseIcon />}
            aria-label="恢复全部列宽"
            disabled={!widths.size}
            onClick={() => setWidths(new Map())}
          />
        </Tooltip>
      </div>
    </div>
  );
}
