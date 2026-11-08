import { createContext, useContext } from 'react';
import { defaultTheme, type ThemeMode } from '@shared/theme';
export const ThemeContext = createContext({
  settings: defaultTheme,
  dark: false,
  changing: false,
  setMode: async (_mode: ThemeMode) => {},
});
export const useTheme = () => useContext(ThemeContext);
