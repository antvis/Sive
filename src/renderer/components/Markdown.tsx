import hljs from 'highlight.js/lib/core';
import sql from 'highlight.js/lib/languages/sql';
import MarkdownIt from 'markdown-it';
import { CaretRight } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import './Markdown.css';
import { CopyButton } from './CopyButton';

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
  const [expanded, setExpanded] = useState(false);
  const html = useMemo(() => hljs.highlight(code, { language: 'sql' }).value, [code]);
  return (
    <div className="min-w-0 rounded-md bg-page">
      <div className="flex items-center gap-1 pr-3 text-xs text-muted">
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? '收起 SQL' : '展开 SQL'}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-3 py-2 text-left hover:text-ink"
          onClick={() => setExpanded((current) => !current)}
        >
          <CaretRight size={14} className={`shrink-0 ${expanded ? 'rotate-90' : ''}`} />
          <span>SQL</span>
        </button>
        <CopyButton label="复制 SQL" text={code} />
      </div>
      {expanded && (
        <pre className="m-0 max-w-full overflow-auto p-3 pt-0 text-xs leading-5 whitespace-pre-wrap text-ink/80">
          <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
      )}
    </div>
  );
}
