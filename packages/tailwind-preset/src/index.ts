import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

type TailwindThemeExtension = NonNullable<NonNullable<Config['theme']>['extend']>;
type HostTailwindThemeExtension = Record<string, unknown>;

const baseThemeExtension: TailwindThemeExtension = {
  colors: {
    border: 'hsl(var(--border))',
    input: 'hsl(var(--input))',
    ring: 'hsl(var(--ring))',
    background: 'hsl(var(--background))',
    foreground: 'hsl(var(--foreground))',
    primary: {
      DEFAULT: 'hsl(var(--primary))',
      foreground: 'hsl(var(--primary-foreground))',
    },
    secondary: {
      DEFAULT: 'hsl(var(--secondary))',
      foreground: 'hsl(var(--secondary-foreground))',
    },
    muted: {
      DEFAULT: 'hsl(var(--muted))',
      foreground: 'hsl(var(--muted-foreground))',
    },
    accent: {
      DEFAULT: 'hsl(var(--accent))',
      foreground: 'hsl(var(--accent-foreground))',
    },
    card: {
      DEFAULT: 'hsl(var(--card))',
      foreground: 'hsl(var(--card-foreground))',
    },
    popover: {
      DEFAULT: 'hsl(var(--popover, var(--card)))',
      foreground: 'hsl(var(--popover-foreground, var(--card-foreground)))',
    },
    sidebar: {
      DEFAULT: 'hsl(var(--sidebar, var(--card)))',
      foreground: 'hsl(var(--sidebar-foreground, var(--foreground)))',
      primary: 'hsl(var(--sidebar-primary, var(--primary)))',
      'primary-foreground': 'hsl(var(--sidebar-primary-foreground, var(--primary-foreground)))',
      accent: 'hsl(var(--sidebar-accent, var(--accent)))',
      'accent-foreground': 'hsl(var(--sidebar-accent-foreground, var(--accent-foreground)))',
      border: 'hsl(var(--sidebar-border, var(--border)))',
      ring: 'hsl(var(--sidebar-ring, var(--ring)))',
    },
    destructive: {
      DEFAULT: 'hsl(var(--destructive, var(--danger)))',
      foreground: 'hsl(var(--destructive-foreground, var(--primary-foreground)))',
    },
    success: 'hsl(var(--success))',
    warning: 'hsl(var(--warning))',
  },
  backgroundColor: {
    surface: 'var(--surface-primary)',
    'surface-secondary': 'var(--surface-secondary)',
    'surface-ghost': 'var(--surface-ghost)',
    'surface-highlight': 'var(--surface-highlight)',
    'surface-hover': 'var(--surface-hover)',
    'surface-overlay': 'var(--surface-overlay)',
  },
  borderRadius: {
    xl: 'var(--radius-xl)',
    lg: 'var(--radius-lg)',
    md: 'var(--radius-md)',
    sm: 'var(--radius-sm)',
  },
  boxShadow: {
    xs: 'var(--shadow-xs)',
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
    xl: 'var(--shadow-xl)',
    primary: 'var(--shadow-primary-sm)',
    'primary-md': 'var(--shadow-primary-md)',
  },
  fontFamily: {
    sans: ['Inter', 'Noto Sans SC', 'sans-serif'],
  },
  animation: {
    'caret-blink': 'caretBlink 1s steps(2, start) infinite',
    'fade-in-up': 'fadeInUp 0.4s ease forwards',
    float: 'float 22s ease-in-out infinite',
  },
  keyframes: {
    caretBlink: {
      '0%, 49%': { opacity: '1' },
      '50%, 100%': { opacity: '0' },
    },
    fadeInUp: {
      from: { opacity: '0', transform: 'translateY(10px)' },
      to: { opacity: '1', transform: 'translateY(0)' },
    },
    float: {
      '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
      '50%': { transform: 'translate3d(16px, -18px, 0)' },
    },
  },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeThemeExtension(
  base: TailwindThemeExtension,
  extension?: HostTailwindThemeExtension,
): TailwindThemeExtension {
  if (!extension) {
    return base;
  }

  const merged: TailwindThemeExtension = { ...base };
  const mergedRecord = merged as Record<string, unknown>;

  for (const [key, value] of Object.entries(extension)) {
    const baseValue = mergedRecord[key];
    if (isPlainObject(baseValue) && isPlainObject(value)) {
      mergedRecord[key] = { ...baseValue, ...value };
      continue;
    }

    mergedRecord[key] = value;
  }

  return merged;
}

export function createNopTailwindPreset(
  extension?: HostTailwindThemeExtension,
): Partial<Config> {
  return {
    darkMode: ['class', '.dark'],
    theme: {
      extend: mergeThemeExtension(baseThemeExtension, extension),
    },
    plugins: [animate],
  };
}

export const nopTailwindPreset: Partial<Config> = createNopTailwindPreset();
