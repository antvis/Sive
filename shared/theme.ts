import { WorkbenchError } from './errors';

export type ThemeMode = 'light' | 'dark';
export type ThemeSettings = { mode: ThemeMode };
export const defaultTheme: ThemeSettings = { mode: 'light' };

// Edit this configuration to change the app and exported chart colors.
export const themeConfig = {
  accent: '#177c72',
  density: 'compact' as 'compact' | 'comfortable',
  radius: 6,
  chartPalette: ['#177c72', '#5b8ff9', '#65789b', '#f6bd16', '#7262fd', '#78d3f8'],
  light: { background: '#f5f6f8', surface: '#ffffff', text: '#243039', muted: '#687682', border: '#dde3e8' },
  dark: { background: '#15191e', surface: '#20262d', text: '#edf1f5', muted: '#a4afba', border: '#38434e' },
};
export function validateTheme(value: ThemeSettings): ThemeSettings {
  if (!value || !['light', 'dark'].includes(value.mode))
    throw new WorkbenchError('INVALID_INPUT', '请选择亮色或暗色主题');
  return { mode: value.mode };
}
export function themePalette(settings: ThemeSettings) {
  return themeConfig[settings.mode];
}
