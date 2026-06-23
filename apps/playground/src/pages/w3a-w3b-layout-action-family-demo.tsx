import { useMemo } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { Button, Card, CardContent, CardHeader, CardTitle, Toaster, toast } from '@nop-chaos/ui';
import {
  createSchemaRenderer,
  createDefaultRegistry,
} from '@nop-chaos/flux-react';
import type { ApiSchema, RendererEnv } from '@nop-chaos/flux-core';
import type { ApiRequestContext } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';

interface W3aW3bLayoutActionFamilyDemoPageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerDataRenderers(registry);
registerContentRenderers(registry);
registerLayoutRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const env: RendererEnv = {
  fetcher: async function <T>(_api: ApiSchema, _ctx: ApiRequestContext) {
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

export function W3aW3bLayoutActionFamilyDemoPage({ onBack }: W3aW3bLayoutActionFamilyDemoPageProps) {
  const schema = useMemo(
    () => ({
      type: 'page',
      body: [
        {
          type: 'flex',
          direction: 'column',
          gap: 16,
          body: [
            // 1. grid — colSpan demo
            {
              type: 'grid',
              testid: 'demo-grid',
              columns: 3,
              gap: 12,
              items: [
                { body: [{ type: 'text', text: 'cell-1', testid: 'grid-cell-1' }] },
                { body: [{ type: 'text', text: 'cell-2', testid: 'grid-cell-2' }] },
                {
                  body: [{ type: 'text', text: 'wide-cell', testid: 'grid-cell-wide' }],
                  colSpan: 2,
                },
                { body: [{ type: 'text', text: 'cell-3', testid: 'grid-cell-3' }] },
              ],
            },

            // 2. collapse — multiple (default) + scope controlled
            {
              type: 'collapse',
              testid: 'demo-collapse',
              items: [
                {
                  key: 'a',
                  title: 'Panel A',
                  body: [{ type: 'text', text: 'collapse-body-A', testid: 'collapse-body-a' }],
                },
                {
                  key: 'b',
                  title: 'Panel B',
                  body: [{ type: 'text', text: 'collapse-body-B', testid: 'collapse-body-b' }],
                },
              ],
              onChange: {
                action: 'setValue',
                args: { path: 'collapseTouched', value: true },
              },
            },
            {
              type: 'text',
              testid: 'collapse-report',
              text: 'collapse:${collapseTouched ? "touched" : "untouched"}',
            },

            // 3. collapse — single select (multiple=false)
            {
              type: 'collapse',
              testid: 'demo-collapse-single',
              multiple: false,
              items: [
                { key: 'x', title: 'Single X', body: [{ type: 'text', text: 'single-x-body' }] },
                { key: 'y', title: 'Single Y', body: [{ type: 'text', text: 'single-y-body' }] },
              ],
            },

            // 4. button-group — selectionMode toggle
            {
              type: 'button-group',
              testid: 'demo-button-group',
              selectionMode: 'single',
              variant: 'outline',
              items: [
                { key: 'opt1', label: 'Option 1' },
                { key: 'opt2', label: 'Option 2' },
                { key: 'opt3', label: 'Option 3' },
              ],
              onChange: {
                action: 'setValue',
                args: { path: 'bgSelected', value: true },
              },
            },
            {
              type: 'text',
              testid: 'button-group-report',
              text: 'button-group:${bgSelected ? "selected" : "unselected"}',
            },

            // 5. dropdown-button — trigger + menu actions
            {
              type: 'dropdown-button',
              testid: 'demo-dropdown-button',
              label: 'Actions',
              variant: 'outline',
              items: [
                {
                  label: 'Set Flag',
                  action: { action: 'setValue', args: { path: 'ddClicked', value: true } },
                },
                { label: 'View Details' },
                { label: 'Delete', destructive: true },
              ],
            },
            {
              type: 'text',
              testid: 'dropdown-button-report',
              text: 'dropdown:${ddClicked ? "clicked" : "idle"}',
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
        Layout & Action Family (W3a + W3b)
      </p>
      <h1 className="m-0 mb-6">
        布局与动作分组族 — grid / collapse / button-group / dropdown-button
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Live renderer (schema-driven)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              4 个布局/动作族组件通过 <code>SchemaRenderer</code> 真实挂载到
              <code>flux-renderers-layout</code> 包。
            </p>
            <div
              data-testid="w3a-w3b-renderer-host"
              className="rounded-lg border border-dashed border-primary/40 bg-muted/40 p-3"
            >
              <SchemaRenderer
                schemaUrl="demo://w3a-w3b-layout-action-family"
                schema={schema as never}
                env={env}
                formulaCompiler={formulaCompiler}
                registry={registry as React.ComponentProps<typeof SchemaRenderer>['registry']}
                data={{}}
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
                <strong>grid</strong> — 显式二维网格布局 renderer；从 schema 读
                <code>columns</code>/<code>gap</code>/<code>autoFlow</code> 等布局值映射为 CSS Grid；<code>colSpan</code>/<code>rowSpan</code> 归一化。
              </li>
              <li>
                <strong>collapse</strong> — 折叠内容组；展开态经 <code>valueOwnership</code>（local/controlled/scope）分层；<code>multiple:false</code> 单选互斥。
              </li>
              <li>
                <strong>button-group</strong> — 动作按钮组；<code>selectionMode</code>（none/single/multiple）toggle 选中态 local controlled + <code>onChange</code>。
              </li>
              <li>
                <strong>dropdown-button</strong> — 带下拉菜单的动作按钮；<code>trigger</code>（click/hover）；菜单项点击派发 action 并关闭。
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Toaster />
    </main>
  );
}
