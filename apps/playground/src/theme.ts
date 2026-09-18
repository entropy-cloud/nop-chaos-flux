export type ThemeName = 'classic' | 'glass';
export type ThemeMode = 'light' | 'dark';

export interface ThemeState {
  theme: ThemeName;
  mode: ThemeMode;
}

export const THEME_NAMES: readonly ThemeName[] = ['classic', 'glass'];
export const THEME_MODES: readonly ThemeMode[] = ['light', 'dark'];

const STORAGE_KEY = 'flux.theme';
const DEFAULT_THEME_STATE: ThemeState = { theme: 'classic', mode: 'light' };

let state: ThemeState = DEFAULT_THEME_STATE;
const listeners = new Set<() => void>();

function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && (THEME_NAMES as readonly string[]).includes(value);
}

function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && (THEME_MODES as readonly string[]).includes(value);
}

function persist(next: ThemeState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode/quota): session-only theme, ignore.
  }
}

function commit(next: ThemeState): void {
  state = next;
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', next.theme);
    document.documentElement.setAttribute('data-mode', next.mode);
  }
  persist(next);
  for (const listener of listeners) {
    listener();
  }
}

/** Reads and validates the persisted theme; invalid/absent values fall back to classic/light. */
export function readStoredTheme(): ThemeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_THEME_STATE;
    }
    const parsed = JSON.parse(raw) as Partial<ThemeState> | null;
    if (parsed && isThemeName(parsed.theme) && isThemeMode(parsed.mode)) {
      return { theme: parsed.theme, mode: parsed.mode };
    }
  } catch {
    // Corrupt JSON or storage access failure: fall through to default.
  }
  return DEFAULT_THEME_STATE;
}

export function getThemeState(): ThemeState {
  return state;
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function applyTheme(next: ThemeState): void {
  commit(next);
}

export function setThemeTheme(theme: ThemeName): void {
  if (theme === state.theme) {
    return;
  }
  commit({ ...state, theme });
}

export function setThemeMode(mode: ThemeMode): void {
  if (mode === state.mode) {
    return;
  }
  commit({ ...state, mode });
}
