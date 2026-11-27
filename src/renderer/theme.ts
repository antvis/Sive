import type { ThemeSpec } from '@antv/gpt-vis';
import { mergeTheme } from '@antv/gpt-vis/dist/esm/theme/merge';
import { DEFAULT_PREFERENCES } from '@shared/api';
import { createContext } from 'react';

type Theme = { mode: 'light' | 'dark'; fontSize: number };

export const ThemeContext = createContext<Theme>({
  mode: 'light',
  fontSize: DEFAULT_PREFERENCES.theme.fontSize,
});

export const ChartThemeContext = createContext<ThemeSpec | undefined>(undefined);

// Read the active client palette after App applies data-theme, before rendering charts.
export function createChartTheme(
  { mode, fontSize: rootFontSize }: Theme,
  templateTheme?: ThemeSpec,
): ThemeSpec {
  const styles = getComputedStyle(document.documentElement);

  // Chart renderers need pixels; derive them from the text-* rem scale.
  const fontSize = (name: 'xs' | 'sm' | 'lg' | '3xl') =>
    Number.parseFloat(styles.getPropertyValue(`--text-${name}`)) * rootFontSize;

  const lineHeight = rootFontSize * 1.5;

  const typography: Pick<ThemeSpec, 'tokens' | 'style'> = {
    tokens: { fontSize: fontSize('sm') },
    style: {
      title: { titleFontSize: fontSize('lg'), subtitleFontSize: fontSize('xs') },
      axis: { labelFontSize: fontSize('xs'), titleFontSize: fontSize('xs') },
      legend: { titleFontSize: fontSize('xs'), itemLabelFontSize: fontSize('xs') },
      label: { fontSize: fontSize('xs') },
      mark: {
        liquid: { contentFontSize: fontSize('3xl') },
        sankey: { labelFontSize: fontSize('xs') },
      },
      node: { labelFontSize: fontSize('xs') },
      edge: { labelFontSize: fontSize('xs') },
      table: { header: { fontSize: fontSize('xs') }, cell: { fontSize: fontSize('xs') } },
      summary: { fontSize: rootFontSize },
    },
  };

  const color = (name: string) => styles.getPropertyValue(`--${name}`).trim();

  const palette = (name: string) =>
    color(name)
      .split(',')
      .map((value) => value.trim());

  const theme: ThemeSpec = {
    id: `sive-desktop-${mode}`,
    label: 'Sive Desktop',
    description:
      '适配 Sive 客户端的清爽便签主题：系统字体与灰白底色，青绿搭配蓝色、杏色和珊瑚色，以柔和层次统一统计图、关系图、表格和叙述摘要。',
    baseTheme: mode === 'dark' ? 'dark' : 'default',
    tokens: {
      colorDefault: color('accent-fill'),
      colorBackground: color('surface'),
      colorSurface: color('page'),
      colorText: color('ink'),
      colorTextSecondary: color('muted-foreground'),
      colorTextInverse: color(mode === 'dark' ? 'page' : 'surface'),
      colorStroke: color('line'),
      colorPositive: color('accent'),
      colorNegative: color('danger'),
      colorNeutral: color('muted-foreground'),
      category10: palette('chart-palette'),
      fontFamily: styles.fontFamily,
      fontWeight: 400,
      lineHeight,
      spacingSmall: 6,
      spacingMedium: 12,
      lineWidth: 1,
      radius: 6,
    },
    style: {
      title: {
        align: 'left',
        titleFontWeight: 600,
        subtitleFontWeight: 400,
        spacing: 6,
      },
      axis: {
        line: false,
        tick: false,
        gridLineWidth: 0.75,
        gridLineDash: [3, 4],
        gridStrokeOpacity: 0.8,
        labelFontWeight: 400,
        titleFontWeight: 400,
      },
      legend: {
        titleFontWeight: 600,
        itemLabelFontWeight: 400,
        itemLabelLineHeight: lineHeight,
        itemMarkerSize: 8,
        itemSpacing: 6,
        rowPadding: 8,
        colPadding: 16,
      },
      label: {
        fontWeight: 500,
        lineHeight,
      },
      mark: {
        line: { shape: 'line', lineWidth: 2.25, lineCap: 'round', lineJoin: 'round' },
        area: { shape: 'area', fillOpacity: 0.14 },
        point: { shape: 'point', size: 3, lineWidth: 1 },
        interval: { fillOpacity: 1, lineWidth: 0 },
        box: { fillOpacity: 0.16, lineWidth: 1.25 },
        density: { fillOpacity: 0.2, lineWidth: 1.25 },
        connector: { lineWidth: 1 },
        link: { lineWidth: 1, strokeOpacity: 0.6 },
        liquid: { contentFontWeight: 600, outlineBorder: 1 },
        treemap: { stroke: color('surface'), lineWidth: 2, radius: 4 },
        sankey: { nodeLineWidth: 1, linkFillOpacity: 0.25, linkLineWidth: 0 },
      },
      node: {
        fillOpacity: 0.2,
        stroke: color('chart-stroke'),
        lineWidth: 1,
        radius: 6,
        labelFontWeight: 500,
        shadowColor: 'rgba(0, 0, 0, 0.06)',
        shadowBlur: 4,
        shadowOffsetY: 2,
      },
      edge: {
        stroke: color('chart-stroke'),
        lineWidth: 1,
        labelFontWeight: 400,
      },
      table: {
        header: { fontWeight: 600, padding: [10, 12], lineHeight },
        cell: { backgroundColor: color('surface'), padding: [9, 12], lineHeight },
        border: { width: 1, style: 'solid', radius: 8 },
      },
      summary: { lineHeight },
    },
    charts: {
      pie: { style: { mark: { interval: { stroke: color('surface'), lineWidth: 2, radius: 0 } } } },
      scatter: { style: { mark: { point: { size: 4, fillOpacity: 0.85 } } } },
      radar: { style: { mark: { line: { shape: 'line' } } } },
      'word-cloud': {
        style: { palette: palette('chart-text-palette') },
      },
      'flow-diagram': {
        style: { palette: palette('chart-text-palette') },
      },
      venn: { style: { mark: { path: { fillOpacity: 0.3 } }, label: { fill: color('ink') } } },
      waterfall: { style: { palette: [color('accent'), color('danger'), palette('chart-palette')[1]] } },
    },
  };

  return mergeTheme(templateTheme ?? theme, typography) as ThemeSpec;
}
