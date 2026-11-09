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
 * renderers, navigate action).
 *
 * - The scheme is decided by the WHATWG URL parser, exactly as the browser
 *   will resolve it: the parser strips leading/trailing C0 controls and spaces
 *   and removes tab/LF/CR anywhere, so a regex on the raw string is bypassable
 *   (`" javascript:…"`, `"java\nscript:…"`; plan 861).
 * - Scheme-less strings (relative paths `#anchor` `/x` `./y` `plain`, and
 *   protocol-relative `//host/x`) resolve against a fixed https base and are safe.
 * - Only allowlisted schemes are safe; any other scheme is rejected.
 * - `blob:` is safe only when `options.download` is set.
 * - Input the parser cannot resolve is rejected (fail-closed).
 */
export function isSafeNavigationUrl(
  url: string,
  options?: SafeNavigationUrlOptions,
): boolean {
  let scheme: string;
  try {
    scheme = new URL(url, RELATIVE_URL_BASE).protocol;
  } catch {
    return false;
  }
  if (scheme === 'blob:' && options?.download === true) {
    return true;
  }
  return SAFE_NAVIGATION_SCHEMES.has(scheme);
}

// Never fetched: only gives scheme-less input a scheme to resolve against.
const RELATIVE_URL_BASE = 'https://relative.invalid/';
