import { afterEach, describe, expect, it } from 'vitest';
import { resolveFluxEChartsTheme } from '../echarts-theme.js';

const TOKEN_VARS = [
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
  '--foreground',
  '--muted-foreground',
  '--border',
  '--popover',
  '--popover-foreground',
] as const;

function setTokenVars(values: Record<string, string>) {
  for (const [name, value] of Object.entries(values)) {
    document.documentElement.style.setProperty(name, value);
  }
}

function clearTokenVars() {
  for (const name of TOKEN_VARS) {
    document.documentElement.style.removeProperty(name);
  }
}

afterEach(() => {
  clearTokenVars();
});

describe('resolveFluxEChartsTheme', () => {
  it('reads chart palette CSS variables and wraps raw HSL channel values in hsl(...)', () => {
    setTokenVars({
      '--chart-1': '12 76% 61%',
      '--chart-2': '173 58% 39%',
      '--chart-3': '197 37% 24%',
      '--chart-4': '43 74% 66%',
      '--chart-5': '27 87% 67%',
      '--foreground': '222 47% 11%',
      '--muted-foreground': '215 16% 47%',
      '--border': '214 32% 91%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '222 47% 11%',
    });
    const theme = resolveFluxEChartsTheme();
    expect(theme.color).toEqual([
      'hsl(12 76% 61%)',
      'hsl(173 58% 39%)',
      'hsl(197 37% 24%)',
      'hsl(43 74% 66%)',
      'hsl(27 87% 67%)',
    ]);
    expect((theme.textStyle as Record<string, unknown>).color).toBe('hsl(222 47% 11%)');
    expect((theme.tooltip as Record<string, unknown>).backgroundColor).toBe('hsl(0 0% 100%)');
  });

  it('keeps values that already carry a color function as-is', () => {
    setTokenVars({
      '--chart-1': '#2563eb',
      '--chart-2': 'rgb(16 185 129)',
      '--chart-3': 'hsl(43 74% 66%)',
      '--chart-4': '#f59e0b',
      '--chart-5': '#10b981',
    });
    const theme = resolveFluxEChartsTheme();
    expect(theme.color).toEqual(['#2563eb', 'rgb(16 185 129)', 'hsl(43 74% 66%)', '#f59e0b', '#10b981']);
  });

  it('falls back to the static palette when variables are missing (or document is unavailable)', () => {
    clearTokenVars();
    const theme = resolveFluxEChartsTheme();
    const color = theme.color as string[];
    expect(color).toHaveLength(5);
    for (const entry of color) {
      expect(typeof entry).toBe('string');
      expect(entry.length).toBeGreaterThan(0);
    }
    expect((theme.textStyle as Record<string, unknown>).color).toBeTruthy();
    expect((theme.tooltip as Record<string, unknown>).borderColor).toBeTruthy();
  });

  it('exposes the axis, legend, and tooltip token groups', () => {
    const theme = resolveFluxEChartsTheme() as Record<string, any>;
    for (const group of ['legend', 'categoryAxis', 'valueAxis', 'tooltip', 'textStyle'] as const) {
      expect(theme[group], `theme.${group} missing`).toBeTruthy();
    }
    expect(theme.categoryAxis.axisLine?.lineStyle?.color).toBeTruthy();
    expect(theme.valueAxis.splitLine?.lineStyle?.color).toBeTruthy();
    expect(theme.legend.textStyle?.color).toBeTruthy();
    expect(theme.tooltip.backgroundColor).toBeTruthy();
    expect(theme.tooltip.textStyle?.color).toBeTruthy();
  });
});
