'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';
const Ctx = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'light', toggle: () => {} });
const KEY = 'ma1_web_theme';

/** Thème de l'accueil web. Persisté dans localStorage, sans effet sur le mobile historique. */
export function ThemeProvider({ children }: { children: (theme: Theme) => ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  useEffect(() => {
    try { if (localStorage.getItem(KEY) === 'dark') setTheme('dark'); } catch {}
  }, []);
  const toggle = () => setTheme(t => {
    const n = t === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, n); } catch {}
    return n;
  });
  return <Ctx.Provider value={{ theme, toggle }}>{children(theme)}</Ctx.Provider>;
}
export const useWebTheme = () => useContext(Ctx);
