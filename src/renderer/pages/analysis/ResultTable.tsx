import { useState } from 'react';
import type { AnalysisResponse } from '@antv/ava';
import { resultColumns, tableTSV } from '@shared/results';
import { PREVIEW_PAGE_SIZES } from '@shared/api';
import { Button } from '../../components/Button';
import { CopyButton } from '../../components/CopyButton';
import { DataGrid } from '../../components/DataGrid';
import { Select } from '../../components/Select';

export function ResultTable({ analysis }: { analysis: Partial<AnalysisResponse> }) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const rows = analysis.data ?? [];
  if (!rows.length) return null;
  const names = resultColumns(analysis);
  const columns = names.map((name) => ({
    name,
    type: analysis.schema?.find((column) => column.name === name)?.type,
  }));
  const pages = Math.ceil(rows.length / pageSize);
  const current = Math.min(page, pages - 1);
  const offset = current * pageSize;
  return (
    <div className="group/result min-w-0 overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between px-3 py-1 text-xs text-muted">
        <span>
          已返回结果 · {rows.length} 行 · 仅排序当前页{analysis.truncated ? ' · 查询结果已截断' : ''}
        </span>
        <CopyButton
          label="复制全部结果数据"
          text={() => tableTSV(names, rows)}
          className="opacity-0 transition-opacity group-hover/result:opacity-100 group-focus-within/result:opacity-100"
        />
      </div>
      <div className="flex max-h-80 min-h-0 flex-col overflow-auto">
        <DataGrid rows={rows.slice(offset, offset + pageSize)} columns={columns} resetKey={offset} />
      </div>
      {rows.length > PREVIEW_PAGE_SIZES[0] && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t px-3 py-2 text-xs text-muted">
          <span className="mr-auto">
            第 {offset + 1}–{Math.min(offset + pageSize, rows.length)} 行
          </span>
          <Select
            compact
            aria-label="结果每页行数"
            className="w-28"
            value={String(pageSize)}
            onChange={(value) => {
              setPageSize(Number(value));
              setPage(0);
            }}
            options={PREVIEW_PAGE_SIZES.map((size) => ({ value: String(size), label: `${size} 行 / 页` }))}
          />
          {pages > 1 && (
            <>
              <Button disabled={!current} onClick={() => setPage(current - 1)}>
                上一页
              </Button>
              <span>
                {current + 1} / {pages}
              </span>
              <Button disabled={current === pages - 1} onClick={() => setPage(current + 1)}>
                下一页
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
