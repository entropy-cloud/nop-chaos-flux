import DOMPurify from 'dompurify';

/**
 * Navigation schemes allowed for schema-driven `href` values. Everything else
 * (javascript:/vbscript:/file:/blob: …) is rejected so a data-bound href can
 * never execute script in the current page context on click.
 *
 * `data:` is allowed: it is the framework's established download-link
 * mechanism (CRUD export flow, `crud-views-export.json`), and data: navigation
 * opens an opaque-origin document that cannot access the opener — unlike
 * `javascript:`, which runs in the page's own context.
 */
const SAFE_NAVIGATION_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:', 'data:']);

/**
 * Whether a string is a safe navigation URL (href contract, link renderer).
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

export interface SanitizeOptions {
  /**
   * When `false`, the input is returned unchanged as an explicit trusted
   * escape hatch. The caller assumes full responsibility for the content.
   * Defaults to `true` (sanitize on).
   */
  sanitize?: boolean;
}

/**
 * Sanitize an HTML string against XSS payloads using DOMPurify.
 *
 * Strategy (controlled-rendering security gate):
 * - `sanitize: false` (explicit trusted) → passthrough, caller's risk.
 * - default (`sanitize` omitted / `true`) → run DOMPurify with its safe HTML
 *   allowlist, which strips `<script>`, inline event handlers (`onerror` …)
 *   and dangerous URIs (`javascript:`). Common presentational tags
 *   (a/p/img/table/code/b …) are preserved.
 * - SSR / no-DOM environment → fail-closed: strip every tag so no markup can
 *   leak when there is no live DOM to sanitize against.
 *
 * This fills the content-rendering XSS sanitize dimension that
 * `docs/architecture/security-design-requirements.md` (permission / dynamic
 * execution / fail-closed) does not itself cover.
 */
export function sanitizeHtml(html: string, options: SanitizeOptions = {}): string {
  if (options.sanitize === false) {
    return html;
  }

  if (typeof window === 'undefined' || !DOMPurify.isSupported) {
    // Fail-closed when no DOM is available (SSR): drop all markup.
    return html.replace(/<\/?[a-zA-Z][^>]*>/g, '');
  }

  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style'],
  });
}
