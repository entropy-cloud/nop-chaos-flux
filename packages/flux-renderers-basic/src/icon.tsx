import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { IconSchema } from './schemas';
import { classNames } from './utils';
import { Circle, icons } from 'lucide-react';

type LucideIconComponent = React.ComponentType<Record<string, unknown>>;

const ICON_ALIAS_MAP: Record<string, string> = {
  house: 'home',
  language: 'languages',
  'puzzle-piece': 'puzzle',
  gear: 'settings-2',
  cog: 'settings-2'
};

function toIconLookupKey(value: string): string {
  return value
    .trim()
    .replace(/^fa[srlbdt]?\s+/i, '')
    .replace(/^fa-(solid|regular|light|thin|duotone|brands)\s+/i, '')
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .toLowerCase();
}

function normalizeIconName(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = toIconLookupKey(value);
  return ICON_ALIAS_MAP[normalized] ?? normalized;
}

function toLucideKey(iconName: string): string {
  return iconName
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function resolveLucideIcon(iconName: string | undefined): LucideIconComponent {
  const normalizedIconName = normalizeIconName(iconName);
  if (!normalizedIconName) {
    return Circle;
  }

  const key = toLucideKey(normalizedIconName);
  return (icons as Record<string, LucideIconComponent>)[key] ?? (Circle as unknown as LucideIconComponent);
}

export function IconRenderer(props: RendererComponentProps<IconSchema>) {
  const icon = typeof props.props.icon === 'string' ? props.props.icon : undefined;
  const Icon = resolveLucideIcon(icon);

  const IconComp = Icon as React.ComponentType<Record<string, unknown>>;

  return (
    <IconComp
      className={classNames('nop-icon', `nop-icon--${icon}`, props.meta.className)}
      data-icon={icon}
      data-testid={props.meta.testid || undefined}
      size={16}
      strokeWidth={1.8}
      aria-hidden="true"
      focusable="false"
    />
  );
}
