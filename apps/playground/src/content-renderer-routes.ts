import type { RendererRouteEntry } from './route-model.js';

/**
 * C6.1 content text-family lab routes (markdown/html/json-view/link/image).
 * Extracted from route-model.ts to keep files within the lint max-lines budget.
 *
 * Shared constant with C6.2 (`2026-08-04-0841-3`): the plan that lands first
 * creates this module; the later plan appends its entries (coordination record:
 * `docs/logs/2026/08-04.md` C6.1 节).
 */
export const CONTENT_RENDERER_ROUTES: RendererRouteEntry[] = [
  {
    id: 'markdown',
    title: 'Markdown',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    description:
      'Markdown content renderer (react-markdown + GFM) with allowHtml sanitize gate and env.fetcher remote src.',
  },
  {
    id: 'html',
    title: 'HTML',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    description:
      'Raw HTML display with DOMPurify sanitize gate (default on) and explicit trusted escape hatch.',
  },
  {
    id: 'json-view',
    title: 'JSON View',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    description:
      'Structured JSON tree viewer with empty state, collapse levels and a copy button.',
  },
  {
    id: 'link',
    title: 'Link',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    description:
      'Semantic navigation link with URL-protocol-guarded href, target/rel and coexist onClick dispatch.',
  },
  {
    id: 'image',
    title: 'Image',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    description:
      'Image display with object-fit, lazy loading, preview, error fallback + retry, and fetcher-backed auth mode.',
  },
];
