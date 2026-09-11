"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Single palette. "Signal Room" — dark-first.
 *
 * The multi-theme lab was removed: nine unreachable palettes made the product
 * read as a prototype. Context is kept so consumers compile unchanged.
 */
export type ThemeId = "signal";

export const THEMES: {
  id: ThemeId;
  label: string;
  hint: string;
  swatch: [string, string, string];
}[] = [
  {
    id: "signal",
    label: "Signal",
    hint: "void · ink · electric blue",
    swatch: ["#0a0e13", "#edf2f7", "#4c8dff"],
  },
];

const ThemeCtx = createContext<{
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}>({ theme: "signal", setTheme: () => undefined });

export function useTheme() {
  return useContext(ThemeCtx);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeCtx.Provider value={{ theme: "signal", setTheme: () => undefined }}>
      {children}
    </ThemeCtx.Provider>
  );
}
