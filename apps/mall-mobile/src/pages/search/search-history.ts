export const SEARCH_HISTORY_STORAGE_KEY = 'mall-mobile-search-history';
export const SEARCH_HISTORY_MAX = 10;

export function loadSearchHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => typeof x === 'string' && x.trim()).slice(0, SEARCH_HISTORY_MAX);
  } catch {
    return [];
  }
}

export function addSearchHistory(keyword: string): string[] {
  const trimmed = (keyword ?? '').trim();
  if (!trimmed) return loadSearchHistory();
  const current = loadSearchHistory().filter((x) => x !== trimmed);
  const next = [trimmed, ...current].slice(0, SEARCH_HISTORY_MAX);
  persistSearchHistory(next);
  return next;
}

export function removeSearchHistory(keyword: string): string[] {
  const next = loadSearchHistory().filter((x) => x !== keyword);
  persistSearchHistory(next);
  return next;
}

export function clearSearchHistory(): string[] {
  persistSearchHistory([]);
  return [];
}

function persistSearchHistory(list: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // storage unavailable (private mode / quota) — history stays in-memory only for this session
  }
}
