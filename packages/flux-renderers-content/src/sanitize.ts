import DOMPurify from 'dompurify';

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
