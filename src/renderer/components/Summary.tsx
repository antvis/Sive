import { Summary as GPTVisSummary } from '@antv/gpt-vis';
import { useContext, useEffect, useRef, useState } from 'react';
import { ChartThemeContext, createChartTheme, ThemeContext } from '../theme';

export function Summary({ syntax }: { syntax: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const themeMode = useContext(ThemeContext);
  const templateTheme = useContext(ChartThemeContext);
  const [failedSyntax, setFailedSyntax] = useState<string>();
  const renderT8 = Boolean(syntax && syntax !== failedSyntax);

  useEffect(() => {
    if (!containerRef.current || !syntax || !renderT8) return;
    const summary = GPTVisSummary({
      container: containerRef.current,
      theme: createChartTheme(themeMode, templateTheme),
    });
    try {
      summary.render(syntax);
    } catch {
      setFailedSyntax(syntax);
    }
    return () => summary.destroy();
  }, [syntax, themeMode, templateTheme, renderT8]);

  return renderT8 ? <div ref={containerRef} /> : <div className="whitespace-pre-wrap">{syntax}</div>;
}
