import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  loadSearchHistory,
  addSearchHistory,
  removeSearchHistory,
  clearSearchHistory,
  SEARCH_HISTORY_STORAGE_KEY,
  SEARCH_HISTORY_MAX,
} from './search-history';

function seedHistory(list: string[]) {
  window.localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(list));
}

describe('search history (localStorage)', () => {
  beforeEach(() => {
    window.localStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
  });

  afterEach(() => {
    window.localStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
  });

  it('loadSearchHistory returns [] when empty', () => {
    expect(loadSearchHistory()).toEqual([]);
  });

  it('addSearchHistory prepends and dedups', () => {
    seedHistory(['apple', 'banana']);
    const next = addSearchHistory('apple');
    expect(next).toEqual(['apple', 'banana']);
    expect(loadSearchHistory()).toEqual(['apple', 'banana']);
  });

  it('addSearchHistory moves existing keyword to top', () => {
    seedHistory(['apple', 'banana', 'cherry']);
    const next = addSearchHistory('cherry');
    expect(next).toEqual(['cherry', 'apple', 'banana']);
  });

  it('addSearchHistory caps at SEARCH_HISTORY_MAX (10)', () => {
    seedHistory(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    const next = addSearchHistory('11');
    expect(next).toHaveLength(SEARCH_HISTORY_MAX);
    expect(next[0]).toBe('11');
    expect(next).not.toContain('10');
  });

  it('addSearchHistory ignores blank keyword', () => {
    seedHistory(['apple']);
    const next = addSearchHistory('   ');
    expect(next).toEqual(['apple']);
  });

  it('removeSearchHistory removes a single entry', () => {
    seedHistory(['apple', 'banana']);
    const next = removeSearchHistory('apple');
    expect(next).toEqual(['banana']);
  });

  it('clearSearchHistory empties storage', () => {
    seedHistory(['apple', 'banana']);
    const next = clearSearchHistory();
    expect(next).toEqual([]);
    expect(loadSearchHistory()).toEqual([]);
  });

  it('loadSearchHistory tolerates corrupted JSON', () => {
    window.localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, '{not json');
    expect(loadSearchHistory()).toEqual([]);
  });
});
