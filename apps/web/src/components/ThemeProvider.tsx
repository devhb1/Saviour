"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  type ThemeId,
} from "../lib/theme";

/**
 * Two lights, one meaning.
 *
 * "Daylight" is the default because a first-time visitor should not be handed a
 * terminal. "Signal Room" is the film theme. Both carry the same five colour
 * jobs — a theme may change the light, never what a colour means.
 */
export type { ThemeId };
export { DEFAULT_THEME, THEME_STORAGE_KEY };

export const THEMES: {
  id: ThemeId;
  label: string;
  hint: string;
  swatch: [string, string, string];
}[] = [
  {
    id: "light",
    label: "Daylight",
    hint: "paper · ink · deep blue",
    swatch: ["#fafaf8", "#0f1318", "#1f5fd6"],
  },
  {
    id: "dark",
    label: "Signal Room",
    hint: "void · ink · electric blue",
    swatch: ["#0b0e14", "#f2f5f9", "#4c8dff"],
  },
];

const ThemeCtx = createContext<{
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  toggleTheme: () => void;
}>({
  theme: DEFAULT_THEME,
  setTheme: () => undefined,
  toggleTheme: () => undefined,
});

export function useTheme() {
  return useContext(ThemeCtx);
}

function readStoredTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "light" || raw === "dark") return raw;
  } catch {
    // private mode / storage disabled
  }
  return DEFAULT_THEME;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Start on the server-rendered default; the bootstrap script has already
  // painted the real one, so this only reconciles React's view of it.
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    setThemeState(readStoredTheme());
  }, []);

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  return (
    <ThemeCtx.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}
