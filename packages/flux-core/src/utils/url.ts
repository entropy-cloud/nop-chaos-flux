/**
 * Navigation schemes allowed for schema-driven `href` values. Everything else
 * (javascript:/vbscript:/file:/blob: …) is rejected so a data-bound href can
 * never execute script in the current page context on click.
 *
 * `data:` is allowed: it is the framework's established download-link
 * mechanism (CRUD export flow, `crud-views-export.json`), and data: navigation
 * opens an opaque-origin document that cannot access the opener — unlike
 * `javascript:`, which runs in the page's own context.
 *
 * Shared by every renderer that renders an `href` from schema data
 * (content `link`, basic `button`). See `docs/architecture/flux-core.md`.
 */
const SAFE_NAVIGATION_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:', 'data:']);

/**
 * Whether a string is a safe navigation URL (href contract, link/button
 * renderers).
 *
 * - Scheme-less strings (relative paths `#anchor` `/x` `./y` `plain`) are safe.
 * - Only allowlisted schemes are safe; any other explicit scheme is rejected.
 */
export function isSafeNavigationUrl(url: string): boolean {
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(url);
  if (!match) {
    return true;
  }
  return SAFE_NAVIGATION_SCHEMES.has(match[1].toLowerCase() + ':');
}
