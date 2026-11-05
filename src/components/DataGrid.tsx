import { tableViewport, tableSurface } from './ui/styles';
import { cx } from '../shared/cx';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Header,
  type SortingState,
} from '@tanstack/react-table';
import { Button, Pagination, Tooltip } from './ui';
import {
  ArrowCounterClockwiseIcon,
  ArrowsDownUpIcon,
  CaretUpIcon,
  CaretDownIcon,
} from '@phosphor-icons/react';
import {
  clampColumnWidth,
  contentColumnWidths,
  gridColumns,
  MIN_COLUMN_WIDTH,
  MAX_COLUMN_WIDTH,
} from '../shared/grid';
import { isNumericColumn, type TableField } from '../../shared/table-values';

function ResizeHeader({
  header,
  children,
}: {
  header: Header<Record<string, unknown>, unknown>;
  children: ReactNode;
}) {
  const column = header.column;
  const table = header.getContext().table;
  const name = column.id;
  const size = column.getSize();
  const freezeWidths = () =>
    table.setColumnSizing(
      Object.fromEntries(table.getAllLeafColumns().map((item) => [item.id, item.getSize()])),
    );
  return (
    <th
      scope="col"
      aria-label={name}
      aria-sort={
        column.getCanSort()
          ? column.getIsSorted() === 'asc'
            ? 'ascending'
            : column.getIsSorted() === 'desc'
              ? 'descending'
              : 'none'
          : undefined
      }
    >
      {children}
      <span
        className={cx(
          "absolute z-2 top-0 right-0 w-[9px] h-full cursor-col-resize touch-none select-none [&::after]:[content:''] [&::after]:absolute [&::after]:top-[25%] [&::after]:bottom-[25%] [&::after]:right-[3px] [&::after]:w-0.5 [&::after]:rounded-[1px] [&::after]:bg-line [&:hover::after]:bg-accent [&:hover::after]:top-[10%] [&:hover::after]:bottom-[10%] [&:focus-visible::after]:bg-accent [&:focus-visible::after]:top-[10%] [&:focus-visible::after]:bottom-[10%] [&.dragging::after]:bg-accent [&.dragging::after]:top-[10%] [&.dragging::after]:bottom-[10%] focus-visible:outline-1 focus-visible:outline-solid focus-visible:outline-accent focus-visible:-outline-offset-1",
          column.getIsResizing() ? ' dragging' : '',
        )}
        role="separator"
        aria-label={'调整列宽：' + name}
        aria-orientation="vertical"
        aria-valuemin={MIN_COLUMN_WIDTH}
        aria-valuemax={MAX_COLUMN_WIDTH}
        aria-valuenow={Math.round(size)}
        tabIndex={0}
        title="拖动调整列宽，双击恢复；也可使用左右方向键"
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => {
          event.stopPropagation();
          column.resetSize();
        }}
        onMouseDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.stopPropagation();
          freezeWidths();
          header.getResizeHandler()(event);
        }}
        onTouchStart={(event) => {
          event.stopPropagation();
          freezeWidths();
          header.getResizeHandler()(event);
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            freezeWidths();
            table.setColumnSizing((previous) => ({
              ...previous,
              [name]: clampColumnWidth(
                size + (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 40 : 10),
              ),
            }));
          } else if (event.key === 'Home') {
            event.preventDefault();
            column.resetSize();
          }
        }}
      />
    </th>
  );
}
const cell = (value: unknown) =>
  value == null ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value);

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
  footer?: ReactNode;
  resetKey?: string;
  pageSize?: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([]);
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
  const definitions = useMemo(
    () => gridColumns(fields, defaults, numeric, sorting),
    [fields, defaults, numeric, sorting],
  );
  const table = useReactTable({
    data: rows,
    columns: definitions,
    state: { sorting },
    onSortingChange: setSorting,
    initialState: { pagination: { pageIndex: 0, pageSize } },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: fill,
    autoResetPageIndex: false,
    enableMultiSort: false,
    columnResizeMode: 'onChange',
  });
  useEffect(() => {
    table.resetSorting();
    table.setPageIndex(0);
    if (viewport.current) viewport.current.scrollTop = 0;
  }, [resetKey, table]);
  useEffect(() => {
    table.setPageSize(pageSize);
  }, [pageSize, table]);
  useEffect(() => {
    table.setPageIndex((index) => Math.min(index, Math.max(0, table.getPageCount() - 1)));
  }, [rows.length, pageSize, table]);
  const visible = table.getRowModel().rows;
  const total = Math.max(table.getTotalSize(), available, 160);
  return (
    <div
      className={cx(
        'data-grid min-w-0 [&_.ui-table_th]:sticky [&_.ui-table_th]:pr-4',
        fill
          ? ' flex flex-col h-full min-h-0 [&_.grid-table-viewport]:flex-1 [&_.grid-table-viewport]:min-h-0 [&_.grid-table-viewport]:overflow-auto [&_.grid-footer]:shrink-0 [&_.grid-footer]:border-t [&_.grid-footer]:border-t-line [&_.grid-footer]:pt-2 [&_.grid-footer]:mt-1'
          : '',
      )}
      ref={root}
    >
      <div className={cx(tableViewport, 'grid-table-viewport')} ref={viewport}>
        <table className={cx(tableSurface, 'table-fixed')} style={{ width: total }}>
          <colgroup>
            {table.getAllLeafColumns().map((column) => (
              <col key={column.id} style={{ width: column.getSize() }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {table.getFlatHeaders().map((header) => {
                const column = header.column;
                const name = column.id;
                const sorted = column.getIsSorted();
                return (
                  <ResizeHeader key={header.id} header={header}>
                    {column.getCanSort() ? (
                      <button
                        className="ui-sort flex items-center gap-2 w-full border-0 bg-transparent text-inherit text-left p-0 [&_svg]:shrink-0 [&_svg]:text-muted"
                        title={name}
                        aria-label={'排序：' + name}
                        onClick={() => {
                          column.toggleSorting();
                          table.setPageIndex(0);
                        }}
                      >
                        <span className="overflow-hidden text-ellipsis whitespace-nowrap">{name}</span>
                        {sorted === 'asc' ? (
                          <CaretUpIcon size={12} />
                        ) : sorted === 'desc' ? (
                          <CaretDownIcon size={12} />
                        ) : (
                          <ArrowsDownUpIcon size={12} />
                        )}
                      </button>
                    ) : (
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap block" title={name}>
                        {name}
                      </span>
                    )}
                  </ResizeHeader>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((entry) => {
                  const text = cell(entry.getValue());
                  return (
                    <td
                      className="h-9 py-2 px-3 border-b border-b-[color-mix(in_srgb,_var(--border)_65%,_transparent)] text-left overflow-hidden text-ellipsis whitespace-nowrap"
                      key={entry.id}
                      title={text}
                    >
                      {text}
                    </td>
                  );
                })}
              </tr>
            ))}
            {!visible.length && (
              <tr>
                <td
                  colSpan={Math.max(fields.length, 1)}
                  className="ui-table-empty h-9 py-2 px-3 border-b border-b-[color-mix(in_srgb,_var(--border)_65%,_transparent)] text-left overflow-hidden text-ellipsis whitespace-nowrap"
                >
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!fill && rows.length > pageSize && (
        <Pagination
          current={table.getState().pagination.pageIndex + 1}
          pageSize={pageSize}
          total={rows.length}
          onChange={(page) => table.setPageIndex(page - 1)}
        />
      )}
      <div className="grid-footer flex justify-between items-center gap-2 min-h-7 text-muted text-caption [&_.ui-button]:text-muted">
        {footer || <span>{rows.length} 行 · 排序仅作用于已加载数据</span>}
        <Tooltip title="恢复全部列宽；拖动表头右边界可调整，双击可恢复单列">
          <Button
            size="small"
            variant="ghost"
            icon={<ArrowCounterClockwiseIcon />}
            aria-label="恢复全部列宽"
            disabled={!Object.keys(table.getState().columnSizing).length}
            onClick={() => table.resetColumnSizing()}
          />
        </Tooltip>
      </div>
    </div>
  );
}
