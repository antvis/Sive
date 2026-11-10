import { isNumericColumn, tableValue } from '@shared/tableValues';
import type { AnalysisResponse } from '@antv/ava';

const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escape = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, (character) => htmlEntities[character]);

export function dataTable(result: AnalysisResponse) {
  const fields = new Map(result.schema.map((field) => [field.name, field]));
  for (const row of result.data)
    for (const name of Object.keys(row)) if (!fields.has(name)) fields.set(name, { name });
  const columns = [...fields.values()].map((field) => ({
    name: field.name,
    attributes: isNumericColumn(field, result.data) ? ' class="numeric"' : '',
  }));
  const headers = columns.map(({ name, attributes }) => `<th${attributes}>${escape(name)}</th>`).join('');
  const rows = result.data
    .map((row) => {
      const cells = columns
        .map(({ name, attributes }) => {
          const text = tableValue(row[name]);
          return `<td${attributes}>${escape(text)}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
  return `<div class="table-scroll"><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>${!result.data.length ? '<p class="muted">没有返回数据行。</p>' : ''}`;
}

export const exportTableStyles = `
.table-scroll{width:100%;max-width:100%;overflow-x:auto}
.table-scroll table{width:100%;max-width:none;table-layout:auto;border-collapse:collapse}
.table-scroll th{min-width:6em}
.table-scroll th,.table-scroll td{overflow-wrap:anywhere}
.table-scroll .numeric,.table-scroll [style*="text-align:right"]{width:1%;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
`;
