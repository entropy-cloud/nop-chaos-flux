import type { BaseSchema, RendererEnv } from '@nop-chaos/flux-core';

/**
 * C6.1 Phase 3 host-scenario schemas + fetchers (real-browser surfaces).
 * Extracted to keep the lab pages within the lint max-lines budget.
 *
 * Covers the plan failure paths:
 *   host-md-sanitize   — dynamic markdown content update containing
 *                        <script>/HTML → sanitize gate on the UPDATE path
 *                        (bug 73 pattern; XSS must not execute)
 *   host-html-sanitize — dynamic html content update containing <script>
 *   host-img-lifecycle — image src fail → error fallback → src update retry
 *   host-link-click    — link onClick + href coexist; javascript: href stripped
 *   host-json-empty    — json-view null empty state + scope-driven value update
 *   host-md-src        — markdown remote src loaded via env.fetcher
 */

const DATA_URI_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="100%" height="100%" fill="#10b981"/><text x="50%" y="55%" fill="white" font-size="14" text-anchor="middle">ok</text></svg>',
  );

export const c6c1MarkdownSanitizeSchema = {
  type: 'page',
  body: [
    {
      type: 'markdown',
      testid: 'c6c1-md',
      allowHtml: true,
      content: '${mdContent}',
    },
    {
      type: 'flex',
      direction: 'row',
      gap: 8,
      body: [
        {
          type: 'button',
          label: 'Set safe content',
          onClick: {
            action: 'setValue',
            args: { path: 'mdContent', value: '## Safe\n\n<b>bold ok</b>' },
          },
        },
        {
          type: 'button',
          label: 'Set malicious content',
          onClick: {
            action: 'setValue',
            args: {
              path: 'mdContent',
              value: '<script>window.__C6C1_MD_XSS__ = true;</script>## Evil\n\n<b>still bold</b>',
            },
          },
        },
      ],
    },
  ],
} as unknown as BaseSchema;

export const c6c1MarkdownSrcSchema = {
  type: 'page',
  body: [
    {
      type: 'markdown',
      testid: 'c6c1-md-src',
      src: '/api/markdown-doc',
    },
    {
      type: 'markdown',
      testid: 'c6c1-md-src-err',
      src: '/api/markdown-missing',
    },
  ],
} as unknown as BaseSchema;

/** env.fetcher: /api/markdown-doc returns text, /api/markdown-missing fails. */
export const c6c1MarkdownSrcFetcher = (async (api: { url?: string }) => {
  const url = api.url ?? '';
  if (url.includes('markdown-doc')) {
    return { ok: true, status: 200, data: '# Fetched from env.fetcher' };
  }
  if (url.includes('markdown-missing')) {
    return { ok: false, status: 404, data: null };
  }
  return { ok: true, status: 200, data: null };
}) as unknown as RendererEnv['fetcher'];

export const c6c1HtmlSanitizeSchema = {
  type: 'page',
  body: [
    {
      type: 'html',
      testid: 'c6c1-html',
      content: '${htmlContent}',
    },
    {
      type: 'flex',
      direction: 'row',
      gap: 8,
      body: [
        {
          type: 'button',
          label: 'Set safe content',
          onClick: {
            action: 'setValue',
            args: { path: 'htmlContent', value: '<p>Safe <strong>html</strong></p>' },
          },
        },
        {
          type: 'button',
          label: 'Set malicious content',
          onClick: {
            action: 'setValue',
            args: {
              path: 'htmlContent',
              value: '<script>window.__C6C1_HTML_XSS__ = true;</script><p>Evil <strong>html</strong></p>',
            },
          },
        },
      ],
    },
  ],
} as unknown as BaseSchema;

export const c6c1LinkHostSchema = {
  type: 'page',
  body: [
    {
      type: 'link',
      testid: 'c6c1-link',
      label: 'Navigate + dispatch',
      href: '/#/lab/link',
      target: '_self',
      onClick: {
        action: 'setValue',
        args: { path: 'c6c1LinkClicked', value: true },
      },
    },
    {
      type: 'link',
      testid: 'c6c1-link-evil',
      label: 'Unsafe javascript href',
      href: 'javascript:window.__C6C1_LINK_XSS__ = true;',
    },
    {
      type: 'text',
      text: 'link-clicked:${c6c1LinkClicked ?? "pending"}',
      testid: 'c6c1-link-report',
    },
  ],
} as unknown as BaseSchema;

export const c6c1ImageLifecycleSchema = {
  type: 'page',
  body: [
    {
      type: 'image',
      testid: 'c6c1-image',
      src: '${imgSrc}',
      alt: 'lifecycle image',
      width: 160,
      height: 90,
    },
    {
      type: 'flex',
      direction: 'row',
      gap: 8,
      body: [
        {
          type: 'button',
          label: 'Set missing src',
          onClick: {
            action: 'setValue',
            args: { path: 'imgSrc', value: '/c6c1-does-not-exist.png' },
          },
        },
        {
          type: 'button',
          label: 'Set valid src',
          onClick: {
            action: 'setValue',
            args: { path: 'imgSrc', value: DATA_URI_IMAGE },
          },
        },
      ],
    },
  ],
} as unknown as BaseSchema;

export const c6c1JsonHostSchema = {
  type: 'page',
  body: [
    {
      type: 'json-view',
      testid: 'c6c1-json',
      value: '${jsonValue}',
      empty: 'No data to inspect',
    },
    {
      type: 'flex',
      direction: 'row',
      gap: 8,
      body: [
        {
          type: 'button',
          label: 'Set object value',
          onClick: {
            action: 'setValue',
            args: { path: 'jsonValue', value: { id: 1, name: 'Alice', tags: ['a', 'b'] } },
          },
        },
        {
          type: 'button',
          label: 'Set null',
          onClick: {
            action: 'setValue',
            args: { path: 'jsonValue', value: null },
          },
        },
      ],
    },
  ],
} as unknown as BaseSchema;
