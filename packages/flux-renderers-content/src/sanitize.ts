import DOMPurify from 'dompurify';
import { isSafeNavigationUrl } from '@nop-chaos/flux-core';

export { isSafeNavigationUrl };

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

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const UNSAFE_HAST_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'base',
  'link',
  'meta',
  'noscript',
  'template',
]);

const URL_HAST_PROPERTIES = new Set(['href', 'src', 'action', 'formAction', 'xLinkHref', 'poster', 'cite', 'background']);

function stripUnsafeHastProperties(properties: Record<string, unknown>): void {
  for (const name of Object.keys(properties)) {
    const value = properties[name];
    if (/^on/i.test(name) || name === 'srcDoc' || name === 'srcdoc') {
      delete properties[name];
    } else if (URL_HAST_PROPERTIES.has(name) && typeof value === 'string' && !isSafeNavigationUrl(value)) {
      delete properties[name];
    }
  }
}

function stripUnsafeHastChildren(node: HastNode): void {
  if (!node.children) {
    return;
  }
  node.children = node.children.filter(
    (child) => !(child.type === 'element' && child.tagName && UNSAFE_HAST_TAGS.has(child.tagName.toLowerCase())),
  );
  for (const child of node.children) {
    if (child.type === 'element' && child.properties) {
      stripUnsafeHastProperties(child.properties);
    }
    stripUnsafeHastChildren(child);
  }
}

/**
 * Rehype plugin that re-checks the parsed HTML tree after `rehype-raw`.
 * `sanitizeHtml` cleans the markdown source as a string, but `rehype-raw`
 * re-parses that string with a different parser, so a parser-differential
 * mutation could reconstitute markup between the two steps. This pass removes
 * executable elements, inline event-handler properties and unsafe URL
 * properties from the final tree that React will render.
 */
export function rehypeStripUnsafeHtml() {
  return (tree: HastNode) => {
    stripUnsafeHastChildren(tree);
  };
}
