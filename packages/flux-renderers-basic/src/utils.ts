import type { ResponsiveBreakpoint } from './schemas.js';

export function classNames(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(' ');
}

export function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
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
