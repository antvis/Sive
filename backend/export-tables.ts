import { renderMarkdown } from '../shared/markdown';

export const exportTableStyles = `
.table-scroll{width:100%;max-width:100%;overflow-x:auto}
.table-scroll table{width:100%;max-width:none;table-layout:auto;border-collapse:collapse}
.table-scroll th{min-width:6em}
.table-scroll th,.table-scroll td{overflow-wrap:anywhere}
.table-scroll .numeric,.table-scroll [style*="text-align:right"]{width:1%;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
`;

export function exportMarkdown(text: string) {
  // The renderer escapes raw HTML, so these are only renderer-generated table tags.
  return renderMarkdown(text)
    .replace(/<table>/g, '<div class="table-scroll"><table>')
    .replace(/<\/table>/g, '</table></div>');
}
