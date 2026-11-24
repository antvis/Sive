import type { ThemeRegistration } from 'shiki';

export const sqlHighlightTheme = {
  name: 'sive-sql',
  type: 'light',
  colors: {
    'editor.background': '#00000000',
    'editor.foreground': 'var(--foreground)',
  },
  tokenColors: [
    { scope: ['keyword', 'storage'], settings: { foreground: 'var(--sql-keyword)' } },
    { scope: 'keyword.operator', settings: { foreground: 'var(--foreground)' } },
    { scope: ['support.function', 'entity.name.function'], settings: { foreground: 'var(--sql-function)' } },
    { scope: 'string', settings: { foreground: 'var(--sql-string)' } },
    { scope: ['constant.numeric', 'constant.language'], settings: { foreground: 'var(--sql-literal)' } },
    { scope: 'comment', settings: { foreground: 'var(--sql-comment)' } },
  ],
} satisfies ThemeRegistration;
