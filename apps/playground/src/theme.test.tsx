import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeSwitcher } from './theme-switcher';
import {
  applyTheme,
  getThemeState,
  readStoredTheme,
  setThemeMode,
  setThemeTheme,
  subscribeTheme,
  type ThemeState,
} from './theme';

const STORAGE_KEY = 'flux.theme';

beforeEach(() => {
  localStorage.clear();
  localStorage.removeItem(STORAGE_KEY);
  applyTheme({ theme: 'classic', mode: 'light' });
});

afterEach(() => {
  cleanup();
});

describe('theme store (plan 471 V1-F3)', () => {
  it('readStoredTheme falls back to classic/light on absent and invalid values', () => {
    expect(readStoredTheme()).toEqual({ theme: 'classic', mode: 'light' });

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: 'neon', mode: 'dark' }));
    expect(readStoredTheme()).toEqual({ theme: 'classic', mode: 'light' });

    localStorage.setItem(STORAGE_KEY, 'not-json{');
    expect(readStoredTheme()).toEqual({ theme: 'classic', mode: 'light' });

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: 'glass' }));
    expect(readStoredTheme()).toEqual({ theme: 'classic', mode: 'light' });
  });

  it('readStoredTheme survives a throwing localStorage (privacy mode)', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(readStoredTheme()).toEqual({ theme: 'classic', mode: 'light' });
    spy.mockRestore();
  });

  it('setThemeMode / setThemeTheme update attributes, persist, and notify subscribers', () => {
    const seen: ThemeState[] = [];
    const unsubscribe = subscribeTheme(() => seen.push(getThemeState()));

    setThemeMode('dark');
    expect(document.documentElement.getAttribute('data-mode')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('classic');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({ theme: 'classic', mode: 'dark' });

    setThemeTheme('glass');
    expect(document.documentElement.getAttribute('data-theme')).toBe('glass');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({ theme: 'glass', mode: 'dark' });
    expect(seen).toEqual([
      { theme: 'classic', mode: 'dark' },
      { theme: 'glass', mode: 'dark' },
    ]);

    // same-value commits are no-ops (no redundant notifications)
    setThemeMode('dark');
    expect(seen).toHaveLength(2);

    unsubscribe();
    setThemeMode('light');
    expect(seen).toHaveLength(2);
    expect(document.documentElement.getAttribute('data-mode')).toBe('light');
  });
});

describe('ThemeSwitcher (G-I minimal four-state switch)', () => {
  it('switches theme and mode through the two selects, updating attributes and persistence', () => {
    render(<ThemeSwitcher />);

    const themeSelect = screen.getByLabelText('主题') as HTMLSelectElement;
    const modeSelect = screen.getByLabelText('模式') as HTMLSelectElement;

    fireEvent.change(themeSelect, { target: { value: 'glass' } });
    expect(document.documentElement.getAttribute('data-theme')).toBe('glass');
    fireEvent.change(modeSelect, { target: { value: 'dark' } });
    expect(document.documentElement.getAttribute('data-mode')).toBe('dark');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({ theme: 'glass', mode: 'dark' });
    expect(getThemeState()).toEqual({ theme: 'glass', mode: 'dark' });
  });

  it('re-renders from the global store when the state changes underneath (subscribe path)', () => {
    render(<ThemeSwitcher />);
    expect((screen.getByLabelText('模式') as HTMLSelectElement).value).toBe('light');

    act(() => {
      applyTheme({ theme: 'classic', mode: 'dark' });
    });
    expect((screen.getByLabelText('模式') as HTMLSelectElement).value).toBe('dark');
  });
});
