import type { Locator, LocatorOptions } from './types.js';
import { createLocator } from './locator.js';

type DocGetter = () => Document;

/** Selector covering explicit `[role=]` and the implicit roles batch-1 specs rely on. */
export function buildRoleSelector(role: string, level?: number): string {
  if (role === 'heading') {
    const tags = level ? [`h${level}`] : ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    return [`[role="heading"]`, ...tags].join(',');
  }
  if (role === 'button') {
    return `[role="button"],button,input[type="button"],input[type="submit"],input[type="reset"]`;
  }
  if (role === 'checkbox') {
    return `[role="checkbox"],input[type="checkbox"]`;
  }
  if (role === 'textbox') {
    return `[role="textbox"],input[type="text"],textarea`;
  }
  return `[role="${role}"]`;
}

/** Playwright-style accessible-name matching: string = full case-insensitive; RegExp = partial. */
export function matchesAccessibleName(element: Element, matcher: string | RegExp): boolean {
  const name = accessibleName(element);
  if (typeof matcher === 'string') return name.trim().toLowerCase() === matcher.trim().toLowerCase();
  return matcher.test(name);
}

export function accessibleName(element: Element): string {
  const labelledby = element.getAttribute('aria-labelledby');
  if (labelledby) {
    const parts = labelledby
      .split(/\s+/)
      .map((id) => element.ownerDocument.getElementById(id)?.textContent ?? '')
      .filter(Boolean);
    if (parts.length > 0) return parts.join(' ');
  }
  const label = element.getAttribute('aria-label');
  if (label) return label;
  return element.textContent ?? '';
}

/** Locator over a role selector with accessible-name post-filtering. */
export function createRoleLocator(getDoc: DocGetter, selector: string, name: string | RegExp, options?: LocatorOptions): Locator {
  return createLocator(getDoc, selector, { ...options, predicate: (element) => matchesAccessibleName(element, name) });
}
