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
 * `blob:` is allowed only through the `download` option (anchor carries the
 * `download` attribute): blob: URLs are same-origin object references that
 * cannot execute script and only deliver bytes as a file download. Without
 * `download`, `blob:` stays rejected (conservative fail-safe — a top-frame
 * blob: navigation would render same-origin HTML content).
 *
 * Shared by every renderer that renders an `href` from schema data
 * (content `link`, basic `button`). See `docs/architecture/flux-core.md`.
 */
const SAFE_NAVIGATION_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:', 'data:']);

export interface SafeNavigationUrlOptions {
  /**
   * Whether the consuming anchor carries the `download` attribute. Only the
   * `blob:` scheme is unlockable this way (download-only delivery); the
   * script-execution schemes stay rejected regardless. Omit for renderers
   * without a download concept (e.g. `button`) — behavior identical to the
   * plain scheme allowlist.
   */
  download?: boolean;
}

/**
 * Whether a string is a safe navigation URL (href contract, link/button
 * renderers).
 *
 * - Scheme-less strings (relative paths `#anchor` `/x` `./y` `plain`) are safe.
 * - Only allowlisted schemes are safe; any other explicit scheme is rejected.
 * - `blob:` is safe only when `options.download` is set.
 */
export function isSafeNavigationUrl(
  url: string,
  options?: SafeNavigationUrlOptions,
): boolean {
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(url);
  if (!match) {
    return true;
  }
  const scheme = match[1].toLowerCase() + ':';
  if (scheme === 'blob:' && options?.download === true) {
    return true;
  }
  return SAFE_NAVIGATION_SCHEMES.has(scheme);
}
