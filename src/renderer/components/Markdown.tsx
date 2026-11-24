import hljs from 'highlight.js/lib/core';
import sql from 'highlight.js/lib/languages/sql';
import MarkdownIt from 'markdown-it';
import { useMemo } from 'react';
import { cn } from '../lib/utils';

hljs.registerLanguage('sql', sql);

const sqlHighlightClassName = cn(
  '[&_:is(.hljs-keyword,.hljs-built_in,.hljs-literal)]:text-[#8250df] dark:[&_:is(.hljs-keyword,.hljs-built_in,.hljs-literal)]:text-[#d2a8ff]',
  '[&_:is(.hljs-string,.hljs-attr,.hljs-attribute)]:text-[#0a7d55] dark:[&_:is(.hljs-string,.hljs-attr,.hljs-attribute)]:text-[#7ee2b8]',
  '[&_.hljs-number]:text-[#b26a00] dark:[&_.hljs-number]:text-[#ffca85] [&_.hljs-comment]:text-muted-foreground',
);

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
  return (
    <div
      className={cn(
        'min-w-0 text-base leading-[1.75] wrap-anywhere [&>:first-child]:mt-0 [&>:last-child]:mb-0',
        '[&_:is(p,ul,ol,pre,table,blockquote)]:mt-0 [&_:is(p,ul,ol,pre,table,blockquote)]:mb-3',
        '[&_:is(h1,h2,h3)]:mt-4 [&_:is(h1,h2,h3)]:mb-2 [&_:is(h1,h2,h3)]:font-semibold',
        '[&_h1]:text-xl [&_h2]:text-lg [&_:is(h3,h4,h5,h6)]:text-base [&_:is(ul,ol)]:pl-5 [&_ul]:list-disc [&_ol]:list-decimal',
        '[&_a]:text-accent [&_a]:underline [&_code]:rounded-[4px] [&_code]:bg-page [&_code]:text-sm [&_table_code]:text-xs [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-[family-name:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace]',
        '[&_pre]:max-w-full [&_pre]:overflow-auto [&_pre]:rounded-[8px] [&_pre]:bg-page [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-sm',
        '[&_table]:block [&_table]:w-full [&_table]:max-w-full [&_table]:border-collapse [&_table]:overflow-x-auto [&_table]:text-xs',
        '[&_:is(th,td)]:border-b [&_:is(th,td)]:border-line [&_:is(th,td)]:p-2 [&_:is(th,td)]:text-left [&_th]:font-medium [&_th]:text-muted-foreground',
        '[&_blockquote]:border-l-[3px] [&_blockquote]:border-line [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
        sqlHighlightClassName,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function SqlBlock({ code }: { code: string }) {
  const html = useMemo(() => hljs.highlight(code, { language: 'sql' }).value, [code]);
  return (
    <pre
      className={cn(
        'm-0 max-w-full overflow-auto rounded-md bg-page p-3 text-sm leading-5 whitespace-pre-wrap text-ink/80',
        sqlHighlightClassName,
      )}
    >
      <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
}
