import { useSyncExternalStore } from 'react';
import { NativeSelect } from '@nop-chaos/ui';
import { getThemeState, setThemeMode, setThemeTheme, subscribeTheme, type ThemeMode, type ThemeName } from './theme';

/**
 * G-I minimal runtime theme switch (plan 471 V1-F3): classic/glass × light/dark.
 * Deliberately NOT named 「暗色」/「亮色」 to avoid accessible-name collisions with
 * page-level toggles (pivot spec getByRole chains).
 */
export function ThemeSwitcher() {
  const state = useSyncExternalStore(subscribeTheme, getThemeState);

  return (
    <div
      data-testid="theme-switcher"
      className="fixed right-3 bottom-3 z-50 flex items-center gap-1.5 rounded-full border bg-card/90 px-2 py-1 shadow-md backdrop-blur"
    >
      <NativeSelect
        aria-label="主题"
        data-size="xs"
        className="w-24"
        value={state.theme}
        onChange={(event) => setThemeTheme(event.target.value as ThemeName)}
      >
        <option value="classic">classic</option>
        <option value="glass">glass</option>
      </NativeSelect>
      <NativeSelect
        aria-label="模式"
        data-size="xs"
        className="w-20"
        value={state.mode}
        onChange={(event) => setThemeMode(event.target.value as ThemeMode)}
      >
        <option value="light">light</option>
        <option value="dark">dark</option>
      </NativeSelect>
    </div>
  );
}
