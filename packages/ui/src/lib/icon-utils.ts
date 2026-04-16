import { Circle, icons } from 'lucide-react';
import type { ComponentType } from 'react';

export type LucideIconComponent = ComponentType<Record<string, unknown>>;

const ICON_ALIAS_MAP: Record<string, string> = {
  house: 'home',
  language: 'languages',
  'puzzle-piece': 'puzzle',
  gear: 'settings-2',
  cog: 'settings-2'
};

export function toIconLookupKey(value: string): string {
  return value
    .trim()
    .replace(/^fa[srlbdt]?\s+/i, '')
    .replace(/^fa-(solid|regular|light|thin|duotone|brands)\s+/i, '')
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .toLowerCase();
}

export function normalizeIconName(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = toIconLookupKey(value);
  return ICON_ALIAS_MAP[normalized] ?? normalized;
}

export function toLucideKey(iconName: string): string {
  return iconName
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export function resolveLucideIcon(iconName: string | undefined): LucideIconComponent {
  const normalizedIconName = normalizeIconName(iconName);
  if (!normalizedIconName) {
    return Circle;
  }

  const key = toLucideKey(normalizedIconName);
  return (icons as Record<string, LucideIconComponent>)[key] ?? (Circle as unknown as LucideIconComponent);
}
