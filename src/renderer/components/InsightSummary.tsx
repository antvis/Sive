import { Summary } from '@antv/gpt-vis';
import { useContext, useEffect, useRef, useState } from 'react';
import { createChartTheme, ThemeContext } from '../theme';
import { Markdown } from './Markdown';

export function InsightSummary({ text, syntax }: { text: string; syntax?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const themeMode = useContext(ThemeContext);
  const [failedSyntax, setFailedSyntax] = useState<string>();
  const renderT8 = Boolean(syntax && syntax !== failedSyntax);

  useEffect(() => {
    if (!containerRef.current || !syntax || !renderT8) return;
    const summary = Summary({ container: containerRef.current, theme: createChartTheme(themeMode) });
    try {
      summary.render(syntax);
    } catch {
      setFailedSyntax(syntax);
    }
    return () => summary.destroy();
  }, [syntax, themeMode, renderT8]);

  return renderT8 ? <div ref={containerRef} /> : <Markdown>{text}</Markdown>;
}
