export const BASE_TOKEN_NAMES = {
  BACKGROUND: '--background',
  FOREGROUND: '--foreground',
  CARD: '--card',
  CARD_FOREGROUND: '--card-foreground',
  POPOVER: '--popover',
  POPOVER_FOREGROUND: '--popover-foreground',
  MUTED: '--muted',
  MUTED_FOREGROUND: '--muted-foreground',
  ACCENT: '--accent',
  ACCENT_FOREGROUND: '--accent-foreground',
  BORDER: '--border',
  INPUT: '--input',
  RING: '--ring',
  PRIMARY: '--primary',
  PRIMARY_FOREGROUND: '--primary-foreground',
  SECONDARY: '--secondary',
  SECONDARY_FOREGROUND: '--secondary-foreground',
  SUCCESS: '--success',
  WARNING: '--warning',
  DANGER: '--danger',
  SURFACE_PRIMARY: '--surface-primary',
  SURFACE_SECONDARY: '--surface-secondary',
  SURFACE_GHOST: '--surface-ghost',
  SURFACE_HIGHLIGHT: '--surface-highlight',
  SURFACE_HOVER: '--surface-hover',
  SURFACE_OVERLAY: '--surface-overlay',
} as const;

export type BaseTokenName = (typeof BASE_TOKEN_NAMES)[keyof typeof BASE_TOKEN_NAMES];

export interface HostTokenExtension {
  tokens?: Record<string, `--${string}`>;
  cssFile?: string;
  tailwindThemeExtension?: Record<string, unknown>;
}

export function defineHostTokenExtension<T extends HostTokenExtension>(extension: T): T {
  return extension;
}
