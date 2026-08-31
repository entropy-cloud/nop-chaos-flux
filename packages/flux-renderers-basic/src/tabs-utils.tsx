import type * as React from 'react';
import { unwrapBooleanLiteral } from '@nop-chaos/flux-react';
import { Badge, resolveLucideIcon } from '@nop-chaos/ui';
import type { TabsItemSchema } from './schemas.js';

export const EMPTY_ITEMS: TabsItemSchema[] = [];

export const TABS_SWIPE_THRESHOLD = 50;
export const TABS_SWIPE_DIRECTION_THRESHOLD = 10;

export function isDevTabsRuntime(): boolean {
  const importMeta = import.meta as ImportMeta & { env?: { DEV?: boolean } };
  return importMeta.env?.DEV === true;
}

export function isTabDisabled(input: unknown): boolean {
  return unwrapBooleanLiteral(input);
}

export function getItemValue(item: TabsItemSchema, index: number): string {
  const candidate = item.value ?? item.key;
  return String(candidate ?? index);
}

// design.md §10 candidate-fix: when the active value vanishes from `items`,
// correct it instead of leaving a stale value (which would render no panel).
// Rule: keep → nearest-right (item now at the removed index) → nearest-left
// (previous item) → empty. Returns `undefined` when no correction is needed
// (active value still present, or items empty with no candidate). This is the
// trigger+idempotency guard: once corrected, the value matches `items` and the
// effect no longer writes back.
export function resolveCandidateValue(
  items: TabsItemSchema[],
  currentValue: string,
  prevItems: TabsItemSchema[],
): string | undefined {
  if (items.some((item, index) => getItemValue(item, index) === currentValue)) {
    return undefined;
  }

  const prevIndex = prevItems.findIndex(
    (item, index) => getItemValue(item, index) === currentValue,
  );

  if (prevIndex >= 0) {
    if (prevIndex < items.length) {
      return getItemValue(items[prevIndex]!, prevIndex);
    }
    if (items.length > 0) {
      return getItemValue(items[items.length - 1]!, items.length - 1);
    }
    return undefined;
  }

  if (items.length > 0) {
    return getItemValue(items[0]!, 0);
  }

  return undefined;
}

export function resolveTabsVariant(tabsMode?: string): 'default' | 'line' {
  if (tabsMode === 'line' || tabsMode === 'simple' || tabsMode === 'strong') return 'line';
  return 'default';
}

export function resolveTabsOrientation(
  tabsMode?: string,
  fallback?: 'horizontal' | 'vertical',
): 'horizontal' | 'vertical' {
  if (tabsMode === 'vertical' || tabsMode === 'sidebar') return 'vertical';
  return fallback ?? 'horizontal';
}

export function createTabRegionOptions(item: TabsItemSchema, index: number) {
  const value = getItemValue(item, index);
  return {
    bindings: {
      item,
      index,
      key: value,
    },
    pathSuffix: `items.${index}`,
    scopeKey: `tabs:item:${value}`,
  };
}

export function createTabsChangePayload(items: TabsItemSchema[], nextValue: string) {
  const nextIndex = items.findIndex((item, index) => getItemValue(item, index) === nextValue);
  return {
    type: 'tabs:change',
    value: nextValue,
    activeValue: nextValue,
    index: nextIndex,
    activeIndex: nextIndex,
    item: nextIndex >= 0 ? items[nextIndex] : undefined,
  };
}

export function resolveTabBadge(badge: TabsItemSchema['badge']): React.ReactNode {
  if (badge === undefined || badge === null) {
    return null;
  }
  return <Badge variant="default">{String(badge)}</Badge>;
}

export function resolveTabIcon(icon: TabsItemSchema['icon']): React.ReactNode {
  if (typeof icon !== 'string' || icon.length === 0) {
    return null;
  }
  const IconComp = resolveLucideIcon(icon) as React.ComponentType<Record<string, unknown>>;
  return <IconComp size={14} strokeWidth={1.8} aria-hidden="true" focusable="false" />;
}

export function resolveTabKeepMounted(input: {
  mountOnEnter: boolean;
  unmountOnExit: boolean;
  isActive: boolean;
  activatedOnce: boolean;
}): boolean {
  const { mountOnEnter, unmountOnExit, isActive, activatedOnce } = input;
  if (mountOnEnter) {
    if (!activatedOnce) {
      return false;
    }
    if (unmountOnExit && !isActive) {
      return false;
    }
    return true;
  }
  if (unmountOnExit && !isActive) {
    return false;
  }
  return true;
}
