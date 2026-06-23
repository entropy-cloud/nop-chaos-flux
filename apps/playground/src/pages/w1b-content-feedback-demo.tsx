import { useMemo } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { Button, Card, CardContent, CardHeader, CardTitle, Toaster, toast } from '@nop-chaos/ui';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';

interface W1bContentFeedbackDemoPageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerDataRenderers(registry);
registerContentRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

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

export function W1bContentFeedbackDemoPage({ onBack }: W1bContentFeedbackDemoPageProps) {
  const schema = useMemo(
    () => ({
      type: 'page',
      body: [
        {
          type: 'flex',
          direction: 'column',
          gap: 16,
          body: [
            { type: 'separator', testid: 'demo-separator', label: 'Horizontal divider' },
            {
              type: 'flex',
              direction: 'row',
              align: 'center',
              gap: 12,
              className: 'h-10',
              body: [
                { type: 'text', text: 'Left' },
                {
                  type: 'separator',
                  testid: 'demo-separator-vertical',
                  orientation: 'vertical',
                },
                { type: 'text', text: 'Right' },
              ],
            },
            {
              type: 'spinner',
              testid: 'demo-spinner',
              label: 'Loading…',
              visible: '${spinnerVisible !== false}',
            },
            {
              type: 'button',
              testid: 'toggle-spinner',
              label: 'Hide spinner',
              onClick: { action: 'setValue', args: { path: 'spinnerVisible', value: false } },
            },
            {
              type: 'progress',
              testid: 'demo-progress',
              value: 120,
              max: 100,
              showValue: true,
              label: 'Uploading (value>max must normalize)',
              variant: 'success',
            },
            {
              type: 'empty',
              testid: 'demo-empty',
              title: 'No results',
              description: 'Try a different query.',
              actions: [
                {
                  type: 'button',
                  testid: 'empty-cta',
                  label: 'Reset',
                  onClick: { action: 'setValue', args: { path: 'resetClicked', value: true } },
                },
              ],
            },
            {
              type: 'card',
              testid: 'demo-card',
              title: 'Clickable card',
              onClick: { action: 'setValue', args: { path: 'cardClicked', value: true } },
              header: [{ type: 'text', text: 'Header region', testid: 'card-header-text' }],
              body: [{ type: 'text', text: 'Body region — click the card to flip the flag.', testid: 'card-body-text' }],
              footer: [{ type: 'text', text: 'Footer region', testid: 'card-footer-text' }],
              actions: [
                {
                  type: 'button',
                  testid: 'card-action',
                  label: 'Action',
                  onClick: { action: 'setValue', args: { path: 'actionClicked', value: true } },
                },
              ],
            },
            {
              type: 'text',
              testid: 'card-click-flag',
              text: '${cardClicked ? "clicked" : "pending"}',
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
        Content &amp; Feedback Family (W1b)
      </p>
      <h1 className="m-0 mb-6">
        容器与反馈组 — separator / spinner / progress / empty / card
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Live renderer (schema-driven)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              5 个反馈族组件通过 <code>SchemaRenderer</code> 真实挂载到 <code>flux-renderers-content</code> 包。
            </p>
            <div
              data-testid="w1b-renderer-host"
              className="rounded-lg border border-dashed border-primary/40 bg-muted/40 p-3"
            >
              <SchemaRenderer
                schemaUrl="demo://w1b-content-feedback"
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
            <CardTitle>Component inventory</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <ul className="space-y-2">
              <li>
                <strong>separator</strong> — 分隔线 renderer；<code>orientation</code>/<code>decorative</code>/<code>label</code>。
              </li>
              <li>
                <strong>spinner</strong> — 加载指示；<code>size</code>/<code>label</code>；<code>visible</code> 经 meta.visible 控制。
              </li>
              <li>
                <strong>progress</strong> — 进度；<code>value</code>/<code>max</code> 归一化不溢出；<code>showValue</code>/<code>variant</code>。
              </li>
              <li>
                <strong>empty</strong> — 空态；<code>title</code>/<code>description</code> + <code>actions</code> CTA。
              </li>
              <li>
                <strong>card</strong> — 结构化卡片容器；<code>header</code>/<code>body</code>/<code>footer</code>/<code>actions</code> regions + <code>onClick</code>。
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Toaster />
    </main>
  );
}
