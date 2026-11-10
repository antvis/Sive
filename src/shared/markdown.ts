import MarkdownIt from 'markdown-it';
// Model output is untrusted. Raw HTML and embedded images are never rendered.
const markdown = new MarkdownIt({ html: false, linkify: false, breaks: true });
markdown.renderer.rules.link_open = () => '<span>';
markdown.renderer.rules.link_close = () => '</span>';
markdown.renderer.rules.image = (tokens, index) => markdown.utils.escapeHtml(tokens[index].content);
markdown.renderer.rules.table_open = (tokens, index, options, { collapseTables }, renderer) => {
  // Keep the original model table available; it is not the authoritative query result.
  const wrapper = collapseTables
    ? '<details><summary>查看总结中的表格</summary><div class="summary-table-scroll">'
    : '<div class="table-scroll">';
  return wrapper + renderer.renderToken(tokens, index, options);
};
markdown.renderer.rules.table_close = (tokens, index, options, { collapseTables }, renderer) =>
  renderer.renderToken(tokens, index, options) + (collapseTables ? '</div></details>' : '</div>');

export function renderMarkdown(text: string, collapseTables = false) {
  return markdown.render(text, { collapseTables });
}
