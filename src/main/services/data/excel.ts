import { WorkbenchError } from '@shared/errors';
import AdmZip from 'adm-zip';
import { SaxesParser } from 'saxes';
import path from 'node:path';
import type { ExcelSheet } from '@shared/contracts';

// Read only workbook structure. DuckDB remains responsible for values and types.
export function inspectExcel(file: string): ExcelSheet[] {
  const zip = new AdmZip(file);
  function xml(name: string, visit: (parser: SaxesParser) => void) {
    const entry = zip.getEntry(name);
    if (!entry) throw new WorkbenchError('INVALID_INPUT', `Excel 缺少工作表结构：${name}`);
    const parser = new SaxesParser();
    parser.on('doctype', () => {
      throw new WorkbenchError('INVALID_INPUT', 'Excel XML 不支持 DOCTYPE');
    });
    visit(parser);
    parser.write(entry.getData().toString('utf8')).close();
  }
  const targets = new Map<string, string>();
  xml('xl/_rels/workbook.xml.rels', (p) =>
    p.on('opentag', (t) => {
      if (t.name === 'Relationship' && String(t.attributes.Type).endsWith('/worksheet')) {
        const target = String(t.attributes.Target);
        targets.set(
          String(t.attributes.Id),
          target.startsWith('/') ? target.slice(1) : path.posix.join('xl', target),
        );
      }
    }),
  );
  const sheets: { name: string; target: string }[] = [];
  xml('xl/workbook.xml', (p) =>
    p.on('opentag', (t) => {
      if (t.name === 'sheet') {
        const target = targets.get(String(t.attributes['r:id']));
        if (target) sheets.push({ name: String(t.attributes.name), target });
      }
    }),
  );
  if (!sheets.length) throw new WorkbenchError('INVALID_INPUT', 'Excel 中没有可读取的工作表');
  return sheets.map(({ name, target }) => {
    type Cell = { column: string; text: boolean; value: string };
    const rows = new Map<number, Cell[]>();
    let row = 0,
      lastRow = 0,
      current: Cell | undefined,
      capture = false;
    const merges: string[] = [];
    xml(target, (p) => {
      p.on('opentag', (t) => {
        if (t.name === 'row') row = Number(t.attributes.r);
        if (t.name === 'c') {
          current = {
            column: String(t.attributes.r).replace(/\d/g, ''),
            text: ['s', 'inlineStr', 'str'].includes(String(t.attributes.t)),
            value: '',
          };
        }
        capture = t.name === 'v' || t.name === 't';
        if (t.name === 'mergeCell') merges.push(String(t.attributes.ref));
      });
      p.on('text', (text) => {
        if (capture && current) current.value += text;
      });
      p.on('closetag', (t) => {
        if (t.name === 'c' && current) {
          if (current.value.trim()) {
            lastRow = Math.max(lastRow, row);
            if (row <= 30) {
              const cells = rows.get(row) || [];
              cells.push(current);
              rows.set(row, cells);
            }
          }
          current = undefined;
        }
        capture = false;
      });
    });
    const entries = [...rows.entries()].sort(([a], [b]) => a - b);
    if (!entries.length) return { sheet: name, header: true };
    const first = entries[0];
    const candidate = entries.find(([n, cells], i) => {
      const next = entries[i + 1]?.[1];
      return (
        cells.length >= 2 &&
        cells.every((c) => c.text) &&
        new Set(cells.map((c) => c.value)).size === cells.length &&
        !!next &&
        next.length >= cells.length * 0.7 &&
        !merges.some((ref) => {
          const [a, b] = ref.split(':');
          return Number(a?.replace(/\D/g, '')) <= n && Number((b || a)?.replace(/\D/g, '')) >= n;
        })
      );
    });
    if (!candidate || candidate[0] === first[0]) {
      // A title followed by a wider table must never silently become a one-column dataset.
      if (entries.some(([, cells]) => cells.length > first[1].length))
        throw new WorkbenchError(
          'INVALID_INPUT',
          `「${name}」的表头不明确。请将字段名放在首个非空行，移除表头合并后重新导入。`,
        );
      return { sheet: name, header: true };
    }
    if (entries.some(([n, cells]) => n < candidate[0] && cells.length > 1))
      throw new WorkbenchError('INVALID_INPUT', `「${name}」包含多行表头，请整理为单行字段名后导入。`);
    const [headerRow, cells] = candidate;
    // Notes sheets often contain key/value rows, rather than field headers.
    const header = !(cells.length === 2 && /说明|备注|readme/i.test(name));
    return {
      sheet: name,
      header,
      range: `${cells[0].column}${headerRow}:${cells[cells.length - 1].column}${lastRow}`,
      stop_at_empty: false,
    };
  });
}
