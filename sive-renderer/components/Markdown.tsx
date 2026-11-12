import hljs from 'highlight.js/lib/core';
import sql from 'highlight.js/lib/languages/sql';
import MarkdownIt from 'markdown-it';
import { useMemo } from 'react';
import './Markdown.css';

hljs.registerLanguage('sql', sql);

const markdown = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  highlight(code, language) {
    return language.toLowerCase() === 'sql' ? hljs.highlight(code, { language: 'sql' }).value : '';
  },
});

export function Markdown({ children }: { children: string }) {
  const html = useMemo(() => markdown.render(children), [children]);
  return <div className="markdown-body min-w-0 text-sm" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function SqlBlock({ code }: { code: string }) {
  const html = useMemo(() => hljs.highlight(code, { language: 'sql' }).value, [code]);
  return (
    <pre className="m-0 max-w-full overflow-auto rounded-md bg-page p-3 text-xs leading-5 whitespace-pre-wrap text-ink/80">
      <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
}
