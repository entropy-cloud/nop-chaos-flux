import { useMemo } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';

interface W3cValueMappingDemoPageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerContentRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const env: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: () => undefined,
};

export function W3cValueMappingDemoPage({ onBack }: W3cValueMappingDemoPageProps) {
  const schema = useMemo(
    () => ({
      type: 'page',
      body: [
        {
          type: 'flex',
          direction: 'column',
          gap: 16,
          body: [
            // ── mapping：命中 / 未命中 / defaultLabel / placeholder / item region ──
            {
              type: 'mapping',
              testid: 'mapping-hit',
              value: 'active',
              map: { active: 'Active', idle: 'Idle', archived: 'Archived' },
            },
            {
              type: 'mapping',
              testid: 'mapping-miss-default',
              value: 'ghost',
              map: { active: 'Active' },
              defaultLabel: 'Unknown state',
              placeholder: 'N/A',
            },
            {
              type: 'mapping',
              testid: 'mapping-miss-placeholder',
              value: 'ghost',
              map: { active: 'Active' },
              placeholder: 'Placeholder fallback',
            },
            {
              type: 'mapping',
              testid: 'mapping-empty',
              value: null,
              map: { active: 'Active' },
              placeholder: 'No value',
            },
            {
              type: 'mapping',
              testid: 'mapping-item-region',
              value: 'active',
              map: { active: 'Active' },
              item: [{ type: 'text', text: '★ Custom hit template ★' }],
            },
            // mapping value bound from expression + scope data
            {
              type: 'mapping',
              testid: 'mapping-expr',
              value: '${taskStatus}',
              map: { done: 'Completed', doing: 'In Progress', todo: 'To Do' },
              defaultLabel: 'Unmapped',
            },

            // ── status：labelMap / levelMap→Badge 语义色 / iconMap ──
            {
              type: 'status',
              testid: 'status-success',
              value: 'done',
              labelMap: { done: 'Completed', doing: 'Running', failed: 'Failed', pending: 'Pending' },
              levelMap: { done: 'success', doing: 'info', failed: 'error', pending: 'warning' },
            },
            {
              type: 'status',
              testid: 'status-warning',
              value: 'pending',
              labelMap: { done: 'Completed', doing: 'Running', failed: 'Failed', pending: 'Pending' },
              levelMap: { done: 'success', doing: 'info', failed: 'error', pending: 'warning' },
            },
            {
              type: 'status',
              testid: 'status-error',
              value: 'failed',
              labelMap: { done: 'Completed', doing: 'Running', failed: 'Failed', pending: 'Pending' },
              levelMap: { done: 'success', doing: 'info', failed: 'error', pending: 'warning' },
            },
            {
              type: 'status',
              testid: 'status-icon',
              value: 'done',
              labelMap: { done: 'Completed' },
              levelMap: { done: 'success' },
              iconMap: { done: 'check' },
            },
            {
              type: 'status',
              testid: 'status-miss',
              value: 'unknown',
              labelMap: { done: 'Completed' },
              placeholder: 'Unknown status',
            },
            // status value bound from expression + scope data
            {
              type: 'status',
              testid: 'status-expr',
              value: '${deployState}',
              labelMap: { running: 'Running', stopped: 'Stopped' },
              levelMap: { running: 'success', stopped: 'error' },
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
        Value Mapping Family (W3c)
      </p>
      <h1 className="m-0 mb-6">值映射组 — mapping / status</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Live renderer (schema-driven)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              2 个值映射族组件通过 <code>SchemaRenderer</code> 真实挂载到 <code>flux-renderers-content</code>：
              <code>mapping</code>（值→展示结果，命中/未命中/defaultLabel/placeholder + item region）、
              <code>status</code>（value→Badge 语义色 + label + icon，强业务语义层）。
            </p>
            <div
              data-testid="w3c-renderer-host"
              className="rounded-lg border border-dashed border-primary/40 bg-muted/40 p-3"
            >
              <SchemaRenderer
                schemaUrl="demo://w3c-value-mapping"
                schema={schema as never}
                env={env}
                formulaCompiler={formulaCompiler}
                registry={registry as React.ComponentProps<typeof SchemaRenderer>['registry']}
                data={{
                  taskStatus: 'doing',
                  deployState: 'running',
                }}
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
                <strong>mapping</strong> — 值到展示结果的映射 renderer；<code>value</code>/<code>map</code> 命中→文本/片段，未命中→<code>defaultLabel</code> 优先→<code>placeholder</code> 兜底；<code>item</code> region 为命中项可选模板。
              </li>
              <li>
                <strong>status</strong> — 业务状态展示 renderer；投影到 ui <code>Badge</code>，<code>levelMap</code>→语义色（success/warning/error/info），<code>labelMap</code>→文本，<code>iconMap</code>→图标；不退化为 <code>badge</code> 别名。
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
