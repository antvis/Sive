import { useI18n } from '../i18n';
import type { Profile, QueryColumn } from '@antv/ava';
import clsx from 'clsx';
import { ArrowDownIcon, ArrowDownUpIcon, ArrowUpIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { compareTableColumn, tableValue } from '../utils/table';

const MIN_WIDTH = 80;
const MAX_WIDTH = 1000;
const DEFAULT_WIDTH = 160;

export function DataGrid({
  rows,
  columns,
  profile,
  resetKey,
}: {
  rows: Record<string, unknown>[];
  columns: QueryColumn[];
  profile: Profile['models'][number] | undefined;
  resetKey: number;
}) {
  const i18n = useI18n();
  const [sorting, setSorting] = useState<{ name: string; descending: boolean } | null>(null);
  const [widths, setWidths] = useState(new Map<string, number>());
  const drag = useRef<{ name: string; x: number; width: number } | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const visible = useMemo(() => {
    if (!sorting) return rows;
    const column = profile?.columns.find((column) => column.name === sorting.name);
    return [...rows].sort((a, b) =>
      compareTableColumn(a[sorting.name], b[sorting.name], column, sorting.descending),
    );
  }, [rows, profile, sorting, i18n.locale]);

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
        className="table-fixed border-collapse text-base"
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
        <thead className="sticky top-0 z-10 bg-surface text-sm">
          <tr>
            {columns.map((column) => {
              const sorted = sorting?.name === column.name ? sorting : null;
              const SortIcon = sorted ? (sorted.descending ? ArrowDownIcon : ArrowUpIcon) : ArrowDownUpIcon;
              const width = widths.get(column.name) ?? DEFAULT_WIDTH;
              return (
                <th
                  key={column.name}
                  scope="col"
                  className="relative border-b border-line px-4 py-2 text-left font-medium text-muted-foreground"
                  aria-sort={sorted ? (sorted.descending ? 'descending' : 'ascending') : 'none'}
                >
                  <button
                    type="button"
                    className="group/sort flex w-full items-center gap-2 rounded-sm text-left hover:text-accent focus-visible:text-accent"
                    aria-label={i18n('dataGrid.sort.label', [column.name])}
                    title={i18n('dataGrid.sort.currentPageOnly', [column.name])}
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
                    <SortIcon
                      aria-hidden
                      size={12}
                      className={clsx(
                        'shrink-0 transition-opacity',
                        !sorted &&
                          'opacity-0 group-hover/sort:opacity-70 group-focus-visible/sort:opacity-100',
                      )}
                    />
                  </button>
                  <span
                    role="separator"
                    tabIndex={0}
                    aria-label={i18n('dataGrid.resize.label', [column.name])}
                    aria-orientation="vertical"
                    aria-valuemin={MIN_WIDTH}
                    aria-valuemax={MAX_WIDTH}
                    aria-valuenow={width}
                    title={i18n('dataGrid.resize.instructions')}
                    className="absolute top-0 right-0 h-full w-2 cursor-col-resize touch-none select-none after:absolute after:inset-y-1 after:end-0 after:w-px after:rounded-full after:bg-focus/65 after:opacity-0 hover:after:opacity-100 focus-visible:after:opacity-100"
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
            <tr key={index} className="transition-colors even:bg-page hover:bg-selected/60">
              {columns.map((column) => (
                <td
                  key={column.name}
                  className="truncate px-4 py-2 tabular-nums"
                  title={tableValue(row[column.name])}
                >
                  {tableValue(row[column.name])}
                </td>
              ))}
            </tr>
          ))}
          {!visible.length && (
            <tr>
              <td colSpan={Math.max(columns.length, 1)} className="p-8 text-center text-muted-foreground">
                {i18n('common.empty.noData')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
