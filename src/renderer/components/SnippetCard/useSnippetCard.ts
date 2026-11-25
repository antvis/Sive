import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ThemeSpec } from '@antv/gpt-vis';
import type { SnippetContent, SnippetUpdateInput } from '@shared/schema';
import { errorMessage } from '../../utils';

export function useSnippetCard(
  data: SnippetContent,
  onUpdate?: (input: SnippetUpdateInput) => Promise<void>,
  theme?: ThemeSpec,
) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(data.title);
  const [summary, setSummary] = useState(data.summary);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const titleId = useId();
  const summaryId = useId();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [summaryOverflow, setSummaryOverflow] = useState(false);

  useEffect(() => {
    setSummaryExpanded(false);
    const content = summaryRef.current;
    if (!content) return;
    // Measure the unclipped content, including asynchronously rendered T8 paragraphs.
    const observer = new ResizeObserver(() => {
      const lineHeight = Number.parseFloat(getComputedStyle(content).lineHeight);
      setSummaryOverflow(content.scrollHeight > 3 * lineHeight + 1);
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [data.summary, editing, theme]);
  const tokens = theme?.tokens;
  const style = tokens
    ? ({
        '--surface': tokens.colorBackground,
        '--page': tokens.colorSurface,
        '--ink': tokens.colorText,
        '--muted': tokens.colorTextSecondary,
        '--muted-foreground': tokens.colorTextSecondary,
        '--line': tokens.colorStroke,
        '--accent': tokens.colorDefault,
        '--accent-secondary': tokens.category10?.[1],
        '--accent-soft': tokens.colorSurface,
        '--danger': tokens.colorNegative,
        fontFamily: tokens.fontFamily,
        colorScheme: theme.baseTheme === 'dark' ? 'dark' : 'light',
      } as CSSProperties)
    : undefined;
  const chartSpec = useMemo(
    () =>
      typeof data.spec === 'string'
        ? data.spec
        : {
            ...data.spec,
            title: undefined,
            subtitle: undefined,
            style: { ...data.spec.style, backgroundColor: 'transparent' },
          },
    [data.spec],
  );

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      return true;
    } catch (cause) {
      setError(errorMessage(cause));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const startEditing = () => {
    setTitle(data.title);
    setSummary(data.summary);
    setError('');
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setError('');
  };

  const saveEdits = async () => {
    if (onUpdate && (await run(() => onUpdate({ title: title.trim(), summary: summary.trim() })))) {
      setEditing(false);
    }
  };

  return {
    editing,
    title,
    setTitle,
    summary,
    setSummary,
    busy,
    error,
    titleId,
    summaryId,
    summaryRef,
    summaryExpanded,
    setSummaryExpanded,
    summaryOverflow,
    style,
    chartSpec,
    run,
    startEditing,
    cancelEditing,
    saveEdits,
  };
}
