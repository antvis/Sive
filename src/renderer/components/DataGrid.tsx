import { ArrowsDownUp, CaretDown, CaretUp } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { compareTableValues, isNumericColumn, tableValue } from '../utils/table';
import type { TableColumn } from '../utils/table';

const MIN_WIDTH = 80;
const MAX_WIDTH = 1000;
const DEFAULT_WIDTH = 160;

export function DataGrid({
  rows,
  columns,
  resetKey,
}: {
  rows: Record<string, unknown>[];
  columns: TableColumn[];
  resetKey: number;
}) {
  const [sorting, setSorting] = useState<{ name: string; descending: boolean } | null>(null);
  const [widths, setWidths] = useState(new Map<string, number>());
  const drag = useRef<{ name: string; x: number; width: number } | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const visible = useMemo(() => {
    if (!sorting) return rows;
    const column = columns.find((item) => item.name === sorting.name);
    return [...rows].sort((a, b) =>
      compareTableValues(
        a[sorting.name],
        b[sorting.name],
        !!column && isNumericColumn(column),
        sorting.descending,
      ),
    );
  }, [rows, columns, sorting]);

  useEffect(() => {
    setSorting(null);
    if (viewport.current) viewport.current.scrollTop = 0;
  }, [resetKey]);

  const resize = (name: string, width: number) =>
    setWidths((current) =>
      new Map(current).set(name, Math.round(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width)))),
    );

  return (
    <div ref={viewport} className="min-h-0 min-w-0 flex-1 overflow-auto">
      <table
        className="table-fixed border-collapse text-xs"
        style={{
          width: columns.reduce((sum, column) => sum + (widths.get(column.name) ?? DEFAULT_WIDTH), 0),
          minWidth: '100%',
        }}
      >
        <colgroup>
          {columns.map((column) => (
            <col key={column.name} style={{ width: widths.get(column.name) ?? DEFAULT_WIDTH }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-10 bg-surface">
          <tr>
            {columns.map((column) => {
              const sorted = sorting?.name === column.name ? sorting : null;
              const SortIcon = sorted ? (sorted.descending ? CaretDown : CaretUp) : ArrowsDownUp;
              const width = widths.get(column.name) ?? DEFAULT_WIDTH;
              return (
                <th
                  key={column.name}
                  scope="col"
                  className="relative border-b px-4 py-2 text-left font-medium text-muted"
                  aria-sort={sorted ? (sorted.descending ? 'descending' : 'ascending') : 'none'}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 text-left"
                    aria-label={`排序：${column.name}`}
                    title={`${column.name}（仅排序当前页）`}
                    onClick={() =>
                      setSorting(
                        !sorted
                          ? { name: column.name, descending: false }
                          : !sorted.descending
                            ? { name: column.name, descending: true }
                            : null,
                      )
                    }
                  >
                    <span className="truncate">{column.name}</span>
                    <SortIcon size={12} className="shrink-0" />
                  </button>
                  <span
                    role="separator"
                    tabIndex={0}
                    aria-label={`调整列宽：${column.name}`}
                    aria-orientation="vertical"
                    aria-valuemin={MIN_WIDTH}
                    aria-valuemax={MAX_WIDTH}
                    aria-valuenow={width}
                    title="拖动或使用左右方向键调整列宽，双击恢复"
                    className="absolute top-0 right-0 h-full w-2 cursor-col-resize touch-none select-none border-r border-line hover:bg-accent/20 focus-visible:bg-accent/20"
                    onClick={(event) => event.stopPropagation()}
                    onDoubleClick={() => resize(column.name, DEFAULT_WIDTH)}
                    onPointerDown={(event) => {
                      if (event.button !== 0) return;
                      event.preventDefault();
                      event.stopPropagation();
                      // Freeze the displayed widths before dragging a table that fills its container.
                      const headers = event.currentTarget.closest('tr')?.children;
                      if (headers)
                        setWidths(
                          new Map(
                            columns.map((item, index) => [
                              item.name,
                              headers[index].getBoundingClientRect().width,
                            ]),
                          ),
                        );
                      drag.current = {
                        name: column.name,
                        x: event.clientX,
                        width: event.currentTarget.parentElement!.getBoundingClientRect().width,
                      };
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={(event) => {
                      if (drag.current)
                        resize(drag.current.name, drag.current.width + event.clientX - drag.current.x);
                    }}
                    onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
                    onLostPointerCapture={() => {
                      drag.current = null;
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                        event.preventDefault();
                        resize(
                          column.name,
                          width + (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 40 : 10),
                        );
                      } else if (event.key === 'Home') {
                        event.preventDefault();
                        resize(column.name, DEFAULT_WIDTH);
                      }
                    }}
                  />
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {visible.map((row, index) => (
            <tr key={index} className="odd:bg-page/50 transition-colors hover:bg-accent-soft">
              {columns.map((column) => (
                <td
                  key={column.name}
                  className="truncate border-b px-4 py-2"
                  title={tableValue(row[column.name])}
                >
                  {tableValue(row[column.name])}
                </td>
              ))}
            </tr>
          ))}
          {!visible.length && (
            <tr>
              <td colSpan={Math.max(columns.length, 1)} className="p-8 text-center text-muted">
                暂无数据
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
