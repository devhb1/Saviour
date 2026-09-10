"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ThemeId =
  | "modular"
  | "ink"
  | "night"
  | "cobalt"
  | "forest"
  | "ember"
  | "violet"
  | "sand"
  | "arctic"
  | "rose";

export const THEMES: {
  id: ThemeId;
  label: string;
  hint: string;
  swatch: [string, string, string];
}[] = [
  {
    id: "modular",
    label: "Modular",
    hint: "mist · navy · teal",
    swatch: ["#f4f7f9", "#0a111f", "#1e8e94"],
  },
  {
    id: "ink",
    label: "Ink",
    hint: "bone · graphite",
    swatch: ["#f3f1ee", "#111111", "#334155"],
  },
  {
    id: "night",
    label: "Night",
    hint: "navy · glow cyan",
    swatch: ["#07101c", "#e8f0f8", "#1ab8c9"],
  },
  {
    id: "cobalt",
    label: "Cobalt",
    hint: "ice · deep blue",
    swatch: ["#f2f5fb", "#0b1b3a", "#2563eb"],
  },
  {
    id: "forest",
    label: "Forest",
    hint: "sage paper · pine",
    swatch: ["#eef3ef", "#122018", "#2f6b4f"],
  },
  {
    id: "ember",
    label: "Ember",
    hint: "warm paper · copper",
    swatch: ["#f7f2ec", "#1a1410", "#c45c26"],
  },
  {
    id: "violet",
    label: "Violet",
    hint: "lilac mist · iris",
    swatch: ["#f5f2fa", "#1a1028", "#6d28d9"],
  },
  {
    id: "sand",
    label: "Sand",
    hint: "desert · olive",
    swatch: ["#f6f1e7", "#1c1914", "#6b7c3c"],
  },
  {
    id: "arctic",
    label: "Arctic",
    hint: "white · steel",
    swatch: ["#f7fafc", "#0f172a", "#0ea5e9"],
  },
  {
    id: "rose",
    label: "Rose",
    hint: "blush · wine",
    swatch: ["#faf5f6", "#1c1014", "#be123c"],
  },
];

const KEY = "saviour.theme.v2";

const ThemeCtx = createContext<{
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}>({ theme: "modular", setTheme: () => undefined });

export function useTheme() {
  return useContext(ThemeCtx);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("modular");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) as ThemeId | null;
      if (saved && THEMES.some((t) => t.id === saved)) {
        setThemeState(saved);
        document.documentElement.setAttribute("data-theme", saved);
        return;
      }
    } catch {
      // ignore
    }
    document.documentElement.setAttribute("data-theme", "modular");
  }, []);

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      // ignore
    }
  }, []);

  return (
    <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>
  );
}

/** Theme lab — only when `?lab=1` (operator). Production UI locks Modular. */
export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [lab, setLab] = useState(false);

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      setLab(q.get("lab") === "1");
    } catch {
      setLab(false);
    }
  }, []);

  useEffect(() => {
    if (!lab) {
      setTheme("modular");
    }
  }, [lab, setTheme]);

  if (!lab) return null;

  return (
    <div
      role="group"
      aria-label="Try color combinations"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        maxWidth: 520,
        justifyContent: "flex-end",
      }}
    >
      {THEMES.map((t) => {
        const active = t.id === theme;
        return (
          <button
            key={t.id}
            type="button"
            title={`${t.label} — ${t.hint}`}
            onClick={() => setTheme(t.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 8px 4px 4px",
              border: active
                ? "1px solid var(--ink)"
                : "1px solid var(--line)",
              borderRadius: 999,
              background: active ? "var(--ink)" : "var(--surface)",
              color: active ? "var(--paper)" : "var(--ink-muted)",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.04em",
              cursor: "pointer",
            }}
          >
            <span
              aria-hidden
              style={{
                display: "inline-flex",
                width: 28,
                height: 14,
                borderRadius: 999,
                overflow: "hidden",
                border: active
                  ? "1px solid rgba(255,255,255,0.35)"
                  : "1px solid var(--line)",
              }}
            >
              {t.swatch.map((c) => (
                <span
                  key={c}
                  style={{ flex: 1, background: c, display: "block" }}
                />
              ))}
            </span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
