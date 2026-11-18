import { useEffect, useState } from 'react';
import type { Preferences } from '../types';

export function useAppearance(appearance: Preferences['theme'] | undefined) {
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  const theme =
    appearance?.mode === 'system' ? (systemDark ? 'dark' : 'light') : (appearance?.mode ?? 'light');
  const fontSize = appearance?.fontSize ?? 14;

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const update = () => setSystemDark(media.matches);

    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  return theme;
}
