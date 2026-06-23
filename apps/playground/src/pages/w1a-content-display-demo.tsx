import { useMemo } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { Button, Card, CardContent, CardHeader, CardTitle, Toaster, toast } from '@nop-chaos/ui';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';

interface W1aContentDisplayDemoPageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerDataRenderers(registry);
registerContentRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const DATA_URI_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="100%" height="100%" fill="#6366f1"/><text x="50%" y="55%" fill="white" font-size="14" text-anchor="middle">demo</text></svg>',
  );

const env: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: (level, message) => {
    const text = typeof message === 'string' ? message : String(message ?? '');
    if (level === 'error') toast.error(text || 'Error');
    else if (level === 'success') toast.success(text || 'Success');
    else if (level === 'warning') toast.warning?.(text || 'Warning');
    else toast.info?.(text || 'Info');
  },
};

export function W1aContentDisplayDemoPage({ onBack }: W1aContentDisplayDemoPageProps) {
  const schema = useMemo(
    () => ({
      type: 'page',
      body: [
        {
          type: 'flex',
          direction: 'column',
          gap: 16,
          body: [
            {
              type: 'markdown',
              testid: 'demo-markdown',
              content: '## Release notes\n\n- Supports **Markdown**\n- GFM table below\n\n| a | b |\n| --- | --- |\n| 1 | 2 |',
            },
            {
              type: 'html',
              testid: 'demo-html',
              content:
                '<p>Sanitized <strong>HTML</strong> — the script tag below is stripped at render.</p><script>window.__W1A_XSS_HTML__ = true;</script>',
              sanitize: true,
            },
            {
              type: 'html',
              testid: 'demo-html-empty',
              content: '',
              empty: 'No HTML content',
            },
            {
              type: 'link',
              testid: 'demo-link',
              label: 'View detail',
              href: '#/w1a-content',
              target: '_self',
              onClick: {
                action: 'setValue',
                args: { path: 'linkClicked', value: true },
              },
            },
            {
              type: 'image',
              testid: 'demo-image',
              src: DATA_URI_IMAGE,
              alt: 'demo image',
              lazy: true,
              fit: 'cover',
              width: 160,
              height: 90,
            },
            {
              type: 'image',
              testid: 'demo-image-error',
              src: '/this-does-not-exist.png',
              alt: 'missing image',
            },
            {
              type: 'json-view',
              testid: 'demo-json-view',
              value: { id: 'u-1001', name: 'Alice', roles: ['admin', 'editor'] },
              showCopy: true,
            },
            {
              type: 'json-view',
              testid: 'demo-json-view-empty',
              value: null,
              empty: 'No data to inspect',
            },
            {
              type: 'text',
              testid: 'link-click-flag',
              text: '${linkClicked ? "clicked" : "pending"}',
            },
          ],
        },
      ],
    }),
    [],
  );

  return (
    <main className="min-h-screen p-6">
      <Button variant="outline" onClick={onBack} className="mb-4">
        Back to Home
      </Button>
      <p className="mb-3 uppercase tracking-[0.16em] text-xs text-muted-foreground">
        Content Display Family (W1a)
      </p>
      <h1 className="m-0 mb-6">
        内容展示组 — markdown / html / link / image / json-view
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Live renderer (schema-driven, with XSS gate)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              5 个内容族组件通过 <code>SchemaRenderer</code> 真实挂载到 <code>flux-renderers-content</code>。
              <code>html</code> 默认经 DOMPurify sanitize（<code>&lt;script&gt;</code> 被 strip，不执行）。
            </p>
            <div
              data-testid="w1a-renderer-host"
              className="rounded-lg border border-dashed border-primary/40 bg-muted/40 p-3"
            >
              <SchemaRenderer
                schemaUrl="demo://w1a-content-display"
                schema={schema as never}
                env={env}
                formulaCompiler={formulaCompiler}
                registry={registry as React.ComponentProps<typeof SchemaRenderer>['registry']}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Component inventory &amp; security gate</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <ul className="space-y-2">
              <li>
                <strong>markdown</strong> — react-markdown + remark-gfm；<code>allowHtml</code> 默认 off（转义），on 时过 sanitize 门禁。
              </li>
              <li>
                <strong>html</strong> — DOMPurify sanitize 默认 on；<code>&lt;script&gt;</code>/事件处理器/<code>javascript:</code> 被 strip。
              </li>
              <li>
                <strong>link</strong> — 导航文本；<code>href</code>/<code>target</code>/<code>rel</code>；<code>onClick</code> 与导航并存。
              </li>
              <li>
                <strong>image</strong> — 原生 <code>loading=lazy</code> + 预览 + 错误回退；<code>fit</code>/尺寸。
              </li>
              <li>
                <strong>json-view</strong> — 复用 ui JsonViewer；空态/<code>collapsed</code>/<code>showCopy</code>。
              </li>
            </ul>
            <p className="text-xs text-muted-foreground">
              受控渲染安全门禁独立于 W1b 薄适配层，是 W1a 的高风险 closure 单元。
            </p>
          </CardContent>
        </Card>
      </div>

      <Toaster />
    </main>
  );
}
