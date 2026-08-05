import type { RendererRouteEntry } from './route-model.js';

/**
 * C6.1 content text-family lab routes (markdown/html/json-view/link/image) +
 * C6.2 content status/feedback-family lab routes (card/cards/empty/progress/spinner/separator)
 * + C6.3 content value-mapping-family lab routes (alert/mapping/status)
 * + C6.4 content media-family lab routes (audio/video/carousel/qrcode)
 * + C6.5 content diff-view lab route (diff-view).
 * Extracted from route-model.ts to keep files within the lint max-lines budget.
 *
 * Shared constant across C6.1 (`2026-08-04-0841-2`), C6.2 (`2026-08-04-0841-3`),
 * C6.3 (`2026-08-04-1757-1`), C6.4 (`2026-08-04-1757-2`) and C6.5 (`2026-08-04-1757-3`):
 * C6.1 landed first and created this module; C6.2 appended its entries to 11,
 * C6.3 appended to 14, C6.4 appended to 18, C6.5 appended to 19 (coordination
 * record: `docs/logs/2026/08-04.md` C6.1 节).
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
  {
    id: 'alert',
    title: 'Alert',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    description:
      'Inline feedback block: level variants, title/body value-or-region, optional actions region, custom icon and closable close with onClose {level} payload.',
  },
  {
    id: 'mapping',
    title: 'Mapping',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    description:
      'Value-to-display mapping (display-only): map table lookup with defaultLabel/placeholder precedence, optional item region template and loader-wins source merge.',
  },
  {
    id: 'status',
    title: 'Status',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    description:
      'Business status display (display-only): labelMap/levelMap/iconMap projection onto the Badge primitive with semantic colors and placeholder miss fallback.',
  },
  {
    id: 'audio',
    title: 'Audio',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    description:
      'Audio media renderer: native <audio> element with src/poster/autoPlay/loop/controls passthrough, empty/error fallback states and onLoadError.',
  },
  {
    id: 'video',
    title: 'Video',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    description:
      'Video media renderer: native <video> element with src/poster/muted/width/height passthrough, empty/error fallback states and onLoadError.',
  },
  {
    id: 'carousel',
    title: 'Carousel',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    description:
      'Embla-backed slide carousel: items with image/title/caption, indicators, prev/next controls, WCAG 2.2.2 autoplay and component:next/prev/setValue handles.',
  },
  {
    id: 'qrcode',
    title: 'QR Code',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    description:
      'Canvas-based QR code renderer: value/size/level/foreground/background, label value-or-region, empty/error fallback states and value-change redraw.',
  },
  {
    id: 'diff-view',
    title: 'Diff View',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    description:
      'Read-only text diff comparison: split/unified/three-column views, hunk folding, cross-file navigation, inline diff markers, component handles and CX-9 reaction wiring.',
  },
];
