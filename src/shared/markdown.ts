import MarkdownIt from 'markdown-it';
// Model output is untrusted. Raw HTML and embedded images are never rendered.
const markdown = new MarkdownIt({ html: false, linkify: false, breaks: true });
markdown.renderer.rules.link_open = () => '<span>';
markdown.renderer.rules.link_close = () => '</span>';
markdown.renderer.rules.image = (tokens, index) => markdown.utils.escapeHtml(tokens[index].content);
markdown.renderer.rules.table_open = (tokens, index, options, {}, renderer) => {
  // Keep the original model table available; it is not the authoritative query result.
  return '<div class="table-scroll">' + renderer.renderToken(tokens, index, options);
};
markdown.renderer.rules.table_close = (tokens, index, options, { collapseTables }, renderer) =>
  renderer.renderToken(tokens, index, options) + (collapseTables ? '</div></details>' : '</div>');

export function renderMarkdown(text: string, collapseTables = false) {
  return markdown.render(text, { collapseTables });
}
