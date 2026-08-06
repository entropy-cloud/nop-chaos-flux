import type { ResponsiveBreakpoint } from './schemas.js';

export function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

/**
 * Collects schema-authored `data-slot` / `data-*` attributes from resolved
 * props for passthrough to the DOM root element. Only string (non-empty) and
 * finite number values are forwarded; booleans, objects, and empty strings
 * are skipped. Non-`data-*` keys are never forwarded.
 */
export function collectDataAttrs(props: Record<string, unknown>): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!key.startsWith('data-')) {
      continue;
    }
    if (typeof value === 'string' && value.length > 0) {
      out[key] = value;
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      out[key] = String(value);
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function resolveDirection(direction?: string) {
  if (direction === 'column') return 'flex-col';
  if (direction === 'row') return 'flex-row';
  if (direction === 'column-reverse') return 'flex-col-reverse';
  if (direction === 'row-reverse') return 'flex-row-reverse';
  return undefined;
}

const BREAKPOINT_ORDER: readonly ResponsiveBreakpoint[] = ['sm', 'md', 'lg', 'xl', '2xl'];

export function resolveResponsiveDirection(
  responsive: Record<string, string | undefined> | undefined,
): string[] {
  if (!responsive) {
    return [];
  }
  const classes: string[] = [];
  for (const bp of BREAKPOINT_ORDER) {
    const value = responsive[bp];
    const cls = resolveDirection(value);
    if (cls) {
      classes.push(`${bp}:${cls}`);
    }
  }
  return classes;
}

export function resolveResponsiveWrap(
  responsive: Record<string, boolean | undefined> | undefined,
): string[] {
  if (!responsive) {
    return [];
  }
  const classes: string[] = [];
  for (const bp of BREAKPOINT_ORDER) {
    const value = responsive[bp];
    if (value === true) {
      classes.push(`${bp}:flex-wrap`);
    } else if (value === false) {
      classes.push(`${bp}:flex-nowrap`);
    }
  }
  return classes;
}
