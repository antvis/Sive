import MarkdownIt from 'markdown-it';
// Model output is untrusted. Raw HTML and embedded images are never rendered.
const markdown = new MarkdownIt({ html: false, linkify: false, breaks: true });
markdown.renderer.rules.link_open = () => '<span>';
markdown.renderer.rules.link_close = () => '</span>';
markdown.renderer.rules.image = (tokens, index) => markdown.utils.escapeHtml(tokens[index].content);
export function renderMarkdown(text: string, collapseTables = false) {
  const tokens = markdown.parse(text, {});
  if (!collapseTables) return markdown.renderer.render(tokens, markdown.options, {});
  // Keep the original model table available; it is not the authoritative query result.
  let html = '';
  for (let index = 0; index < tokens.length; index++) {
    if (tokens[index].type === 'table_open') {
      const start = index;
      while (index < tokens.length && tokens[index].type !== 'table_close') index++;
      html +=
        '<details class="summary-table"><summary>查看总结中的表格</summary><div class="summary-table-scroll">' +
        markdown.renderer.render(tokens.slice(start, index + 1), markdown.options, {}) +
        '</div></details>';
    } else html += markdown.renderer.render([tokens[index]], markdown.options, {});
  }
  return html;
}
