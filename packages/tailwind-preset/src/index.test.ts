import { describe, expect, it } from 'vitest';
import { createNopTailwindPreset, nopTailwindPreset } from './index';

describe('nopTailwindPreset', () => {
  it('defines the repo dark mode baseline', () => {
    expect(nopTailwindPreset.darkMode).toEqual(['class', '.dark']);
  });

  it('exports key semantic color mappings', () => {
    const colors = nopTailwindPreset.theme?.extend?.colors as Record<string, unknown> | undefined;
    const primary = colors?.primary as Record<string, unknown> | undefined;
    const sidebar = colors?.sidebar as Record<string, unknown> | undefined;
    const destructive = colors?.destructive as Record<string, unknown> | undefined;
    const popover = colors?.popover as Record<string, unknown> | undefined;

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
      DEFAULT: 'hsl(var(--sidebar, var(--card)))',
      foreground: 'hsl(var(--sidebar-foreground, var(--foreground)))',
      border: 'hsl(var(--sidebar-border, var(--border)))',
      ring: 'hsl(var(--sidebar-ring, var(--ring)))',
    });
    expect(popover).toMatchObject({
      DEFAULT: 'hsl(var(--popover, var(--card)))',
      foreground: 'hsl(var(--popover-foreground, var(--card-foreground)))',
    });
    expect(destructive).toMatchObject({
      DEFAULT: 'hsl(var(--destructive, var(--danger)))',
      foreground: 'hsl(var(--destructive-foreground, var(--primary-foreground)))',
    });
    expect(nopTailwindPreset.theme?.extend?.backgroundColor).toMatchObject({
      surface: 'var(--surface-primary)',
      'surface-secondary': 'var(--surface-secondary)',
      'surface-hover': 'var(--surface-hover)',
      'surface-overlay': 'var(--surface-overlay)',
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
      'caret-blink': 'caretBlink 1s steps(2, start) infinite',
      'fade-in-up': 'fadeInUp 0.4s ease forwards',
      float: 'float 22s ease-in-out infinite',
    });
    expect(nopTailwindPreset.plugins).toHaveLength(1);
    expect(nopTailwindPreset.plugins?.[0]).toBeTruthy();
  });

  it('merges host tailwind extensions through the factory entrypoint', () => {
    const preset = createNopTailwindPreset({
      colors: {
        host: {
          primary: 'hsl(var(--host-primary))',
        },
      },
    });

    expect(preset.theme?.extend).toMatchObject({
      colors: {
        host: {
          primary: 'hsl(var(--host-primary))',
        },
      },
      backgroundColor: {
        surface: 'var(--surface-primary)',
      },
    });
  });
});
