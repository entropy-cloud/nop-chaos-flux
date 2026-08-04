import type { RendererRouteEntry } from './route-model.js';

/**
 * C6.1 content text-family lab routes (markdown/html/json-view/link/image) +
 * C6.2 content status/feedback-family lab routes (card/cards/empty/progress/spinner/separator).
 * Extracted from route-model.ts to keep files within the lint max-lines budget.
 *
 * Shared constant between C6.1 (`2026-08-04-0841-2`) and C6.2
 * (`2026-08-04-0841-3`): C6.1 landed first and created this module; C6.2
 * appended its entries (coordination record: `docs/logs/2026/08-04.md` C6.1 节).
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
  {
    id: 'card',
    title: 'Card',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    description:
      'Structured card container: title/header/body/footer/actions regions, optional image, variant, whole-card onClick.',
  },
  {
    id: 'cards',
    title: 'Cards',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    description:
      'Card collection with per-row card region scope; local-controlled selection (none/single/multiple) with onSelectionChange.',
  },
  {
    id: 'empty',
    title: 'Empty',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    description:
      'Empty state shell: title/description (value-or-region), optional icon, and an actions CTA region.',
  },
  {
    id: 'progress',
    title: 'Progress',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    description:
      'Linear progress with clamped value/max normalization, variant, label and numeric value display.',
  },
  {
    id: 'spinner',
    title: 'Spinner',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    description:
      'Lightweight loading indicator with size variants, optional label and meta.visible control.',
  },
  {
    id: 'separator',
    title: 'Separator',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    description:
      'Divider with orientation, decorative (aria-hidden) mapping and an optional labelled variant.',
  },
];
