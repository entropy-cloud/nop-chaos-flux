import { describe, expect, it } from 'vitest';
import { nopTailwindPreset } from './index';

describe('nopTailwindPreset', () => {
  it('defines the repo dark mode baseline', () => {
    expect(nopTailwindPreset.darkMode).toEqual(['class', '.dark']);
  });

  it('exports key semantic color mappings', () => {
    const colors = nopTailwindPreset.theme?.extend?.colors as Record<string, unknown> | undefined;
    const primary = colors?.primary as Record<string, unknown> | undefined;
    const sidebar = colors?.sidebar as Record<string, unknown> | undefined;
    const destructive = colors?.destructive as Record<string, unknown> | undefined;

    expect(colors).toMatchObject({
      border: 'hsl(var(--border))',
      input: 'hsl(var(--input))',
      ring: 'hsl(var(--ring))',
      background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      success: 'hsl(var(--success))',
      warning: 'hsl(var(--warning))',
    });
    expect(primary).toMatchObject({
      DEFAULT: 'hsl(var(--primary))',
      foreground: 'hsl(var(--primary-foreground))',
    });
    expect(sidebar).toMatchObject({
      DEFAULT: 'var(--sidebar)',
      foreground: 'var(--sidebar-foreground)',
      border: 'var(--sidebar-border)',
      ring: 'var(--sidebar-ring)',
    });
    expect(destructive).toMatchObject({
      DEFAULT: 'hsl(var(--danger))',
      foreground: 'hsl(var(--primary-foreground))',
    });
  });

  it('exports key radius and shadow token mappings', () => {
    expect(nopTailwindPreset.theme?.extend?.borderRadius).toEqual({
      xl: 'var(--radius-xl)',
      lg: 'var(--radius-lg)',
      md: 'var(--radius-md)',
      sm: 'var(--radius-sm)',
    });
    expect(nopTailwindPreset.theme?.extend?.boxShadow).toMatchObject({
      xs: 'var(--shadow-xs)',
      sm: 'var(--shadow-sm)',
      md: 'var(--shadow-md)',
      lg: 'var(--shadow-lg)',
      xl: 'var(--shadow-xl)',
      primary: 'var(--shadow-primary-sm)',
      'primary-md': 'var(--shadow-primary-md)',
    });
  });

  it('registers expected animation extensions and plugin', () => {
    expect(nopTailwindPreset.theme?.extend?.animation).toMatchObject({
      'fade-in-up': 'fadeInUp 0.4s ease forwards',
      float: 'float 22s ease-in-out infinite',
    });
    expect(nopTailwindPreset.plugins).toHaveLength(1);
    expect(nopTailwindPreset.plugins?.[0]).toBeTruthy();
  });
});
