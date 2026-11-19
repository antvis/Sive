import type { ThemeSpec } from '@antv/gpt-vis';
import { createContext } from 'react';

export const ThemeContext = createContext<'light' | 'dark'>('light');

// Read the active client palette after App applies data-theme, before rendering charts.
export function createChartTheme(mode: 'light' | 'dark'): ThemeSpec {
  const styles = getComputedStyle(document.documentElement);

  const color = (name: string) => styles.getPropertyValue(`--${name}`).trim();

  const palette = (name: string) =>
    color(name)
      .split(',')
      .map((value) => value.trim());

  return {
    id: `sive-desktop-${mode}`,
    label: 'Sive Desktop',
    description:
      '适配 Sive 客户端的清爽便签主题：系统字体与灰白底色，青绿搭配蓝色、杏色和珊瑚色，以柔和层次统一统计图、关系图、表格和叙述摘要。',
    baseTheme: mode === 'dark' ? 'dark' : 'default',
    tokens: {
      colorDefault: color('accent'),
      colorBackground: color('surface'),
      colorSurface: color('page'),
      colorText: color('ink'),
      colorTextSecondary: color('muted'),
      colorTextInverse: color(mode === 'dark' ? 'page' : 'surface'),
      colorStroke: color('line'),
      colorPositive: color('accent'),
      colorNegative: color('danger'),
      colorNeutral: color('muted'),
      category10: palette('chart-palette'),
      fontFamily: styles.fontFamily,
      fontSize: 12,
      fontWeight: 400,
      lineHeight: 20,
      spacingSmall: 6,
      spacingMedium: 12,
      lineWidth: 1,
      radius: 6,
    },
    style: {
      title: {
        align: 'left',
        titleFontSize: 16,
        titleFontWeight: 600,
        subtitleFontSize: 12,
        subtitleFontWeight: 400,
        spacing: 6,
      },
      axis: {
        line: false,
        tick: false,
        gridLineWidth: 0.75,
        gridLineDash: [3, 4],
        gridStrokeOpacity: 0.8,
        labelFontSize: 12,
        labelFontWeight: 400,
        titleFontSize: 12,
        titleFontWeight: 400,
      },
      legend: {
        titleFontWeight: 600,
        itemLabelFontSize: 12,
        itemLabelFontWeight: 400,
        itemLabelLineHeight: 20,
        itemMarkerSize: 8,
        itemSpacing: 6,
        rowPadding: 8,
        colPadding: 16,
      },
      label: {
        fontSize: 12,
        fontWeight: 500,
        lineHeight: 20,
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
        liquid: { contentFontSize: 30, contentFontWeight: 600, outlineBorder: 1 },
        treemap: { stroke: color('surface'), lineWidth: 2, radius: 4 },
        sankey: { nodeLineWidth: 1, linkFillOpacity: 0.25, linkLineWidth: 0, labelFontSize: 12 },
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
        header: { fontWeight: 600, padding: [10, 12], lineHeight: 20 },
        cell: { backgroundColor: color('surface'), padding: [9, 12], lineHeight: 20 },
        border: { width: 1, style: 'solid', radius: 8 },
      },
      summary: { fontSize: 14, lineHeight: 28 },
    },
    charts: {
      pie: { style: { mark: { interval: { stroke: color('surface'), lineWidth: 2, radius: 0 } } } },
      scatter: { style: { mark: { point: { size: 4, fillOpacity: 0.85 } } } },
      radar: { style: { mark: { line: { shape: 'line' } } } },
      'word-cloud': {
        style: { palette: palette('chart-text-palette') },
      },
      'flow-diagram': {
        style: { palette: palette('chart-node-palette') },
      },
      venn: { style: { mark: { path: { fillOpacity: 0.3 } }, label: { fill: color('ink') } } },
      waterfall: { style: { palette: [color('accent'), color('danger'), palette('chart-palette')[1]] } },
    },
  };
}
