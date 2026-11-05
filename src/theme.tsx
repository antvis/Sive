import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { defaultTheme, themeConfig, themePalette, type ThemeSettings, type ThemeMode } from '../shared/theme';
const Context = createContext({
  settings: defaultTheme,
  dark: false,
  changing: false,
  setMode: async (_mode: ThemeMode) => {},
});
export const useTheme = () => useContext(Context);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(defaultTheme);
  const [changing, setChanging] = useState(false);
  const pending = useRef(false);
  const revision = useRef(0);
  useEffect(() => {
    let live = true;
    const refresh = () => {
      const request = ++revision.current;
      window.workbench
        .state()
        .then((state) => {
          if (live && request === revision.current && !pending.current)
            setSettings((previous) => (previous.mode === state.theme.mode ? previous : state.theme));
        })
        .catch(() => {});
    };
    refresh();
    const off = window.workbench.onChange(refresh);
    return () => {
      live = false;
      off();
    };
  }, []);
  const dark = settings.mode === 'dark';
  useLayoutEffect(() => {
    const root = document.documentElement;
    for (const [name, value] of Object.entries(themePalette(settings)))
      root.style.setProperty('--' + name, value);
    root.style.setProperty('--accent', themeConfig.accent);
    root.style.setProperty('--radius', themeConfig.radius + 'px');
    root.dataset.theme = settings.mode;
    root.style.colorScheme = settings.mode;
  }, [settings]);
  const setMode = async (mode: ThemeMode) => {
    if (pending.current || mode === settings.mode) return;
    pending.current = true;
    revision.current++;
    setChanging(true);
    try {
      await window.workbench.saveTheme({ mode });
      setSettings({ mode });
    } finally {
      pending.current = false;
      setChanging(false);
    }
  };
  return <Context.Provider value={{ settings, dark, changing, setMode }}>{children}</Context.Provider>;
}
