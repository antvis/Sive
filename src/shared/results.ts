import type { AnalysisResponse, VisualizeResponse } from '@antv/ava';
import type { AnalysisMessage } from './messages';
import type { Snippet, SnippetSpec } from './snippets';

export type ResultTarget = { kind: 'analysis' | 'snippet'; id: string };

export type ExportFormat = 'html' | 'pdf' | 'png';

export type ResultSection =
  | { type: 'markdown'; text: string }
  | { type: 'sql'; text: string }
  | { type: 'notice'; text: string }
  | { type: 'table'; columns: string[]; rows: Record<string, unknown>[] }
  | { type: 'chart'; spec: SnippetSpec };

export type ResultDocument = { title: string; updatedAt: string; sections: ResultSection[] };

export function resultColumns(analysis: Partial<AnalysisResponse>): string[] {
  return [
    ...new Set([
      ...(analysis.schema ?? []).map((column) => column.name),
      ...(analysis.data ?? []).flatMap(Object.keys),
    ]),
  ];
}

export function analysisSections(content: Partial<AnalysisResponse>): ResultSection[] {
  const sections: ResultSection[] = [];
  if (content.query) sections.push({ type: 'markdown', text: `### ${content.query.replace(/\r?\n/g, ' ')}` });
  const text = content.markdown || content.text;
  if (text) sections.push({ type: 'markdown', text });
  if (content.sql) sections.push({ type: 'sql', text: content.sql });
  if (content.truncated)
    sections.push({ type: 'notice', text: '此查询结果已截断，以下仅包含已返回的数据。' });
  if (content.data?.length)
    sections.push({ type: 'table', columns: resultColumns(content), rows: content.data });
  return sections;
}

export function messageDocument(message: AnalysisMessage, question: string): ResultDocument {
  const sections: ResultSection[] = [];
  const parts = message.content.parts ?? [];
  let previousWasText = false;
  for (const part of parts) {
    if (part.type === 'text-delta') {
      const previous = sections.at(-1);
      if (previousWasText && previous?.type === 'markdown') previous.text += part.text;
      else sections.push({ type: 'markdown', text: part.text });
    } else if (part.type === 'tool-result' && part.output) {
      if (part.toolName === 'analyze') sections.push(...analysisSections(part.output as AnalysisResponse));
      if (part.toolName === 'visualize') {
        const result = part.output as VisualizeResponse & { spec?: SnippetSpec };
        sections.push({ type: 'chart', spec: result.spec ?? result.config });
      }
    } else if (part.type === 'tool-error') {
      sections.push({ type: 'notice', text: `工具执行失败：${part.toolName}` });
    }
    previousWasText = part.type === 'text-delta';
  }
  if (!parts.length) {
    sections.push(...analysisSections(message.content));
    if (message.content.chartHtml)
      sections.push({
        type: 'notice',
        text: '此历史图表仅保存了 HTML，无法作为离线图表导出。请重新生成图表。',
      });
  }
  return { title: question || '分析结果', updatedAt: message.updatedAt, sections };
}

export function snippetDocument(snippet: Snippet): ResultDocument {
  return {
    title: snippet.title,
    updatedAt: snippet.updatedAt,
    sections: [
      { type: 'markdown', text: snippet.content.summary },
      { type: 'chart', spec: snippet.content.spec },
    ],
  };
}

export function resultValue(value: unknown): string {
  if (value == null) return '';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

export function tableTSV(columns: string[], rows: Record<string, unknown>[]): string {
  const cell = (value: unknown) => {
    const text = resultValue(value);
    return /[\t\r\n"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [
    columns.map(cell).join('\t'),
    ...rows.map((row) => columns.map((column) => cell(row[column])).join('\t')),
  ].join('\n');
}

export function documentMarkdown(document: ResultDocument): string {
  const code = (text: string, language: string) => {
    const fence = '`'.repeat(Math.max(3, ...[...text.matchAll(/`+/g)].map((match) => match[0].length + 1)));
    return `${fence}${language}\n${text}\n${fence}`;
  };
  return [
    `# ${document.title}`,
    ...document.sections.map((section) => {
      if (section.type === 'sql') return code(section.text, 'sql');
      if (section.type === 'table') return code(tableTSV(section.columns, section.rows), 'tsv');
      if (section.type === 'chart') return code(JSON.stringify(section.spec, null, 2), 'json');
      return section.text;
    }),
  ].join('\n\n');
}
