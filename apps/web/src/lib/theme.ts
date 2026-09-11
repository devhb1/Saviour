/**
 * Theme constants. Framework-free on purpose: the root layout (a server
 * component) and the client provider both import from here, so the bootstrap
 * script and the React state can never disagree about the default.
 */
export type ThemeId = "light" | "dark";

export const THEME_STORAGE_KEY = "saviours.theme";

/** Daylight by default — a first-time visitor should not be handed a terminal. */
export const DEFAULT_THEME: ThemeId = "light";

/** Inlined in <head> so the first painted frame is already the stored theme. */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");var t=(s==="light"||s==="dark")?s:"${DEFAULT_THEME}";document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","${DEFAULT_THEME}");}})();`;
