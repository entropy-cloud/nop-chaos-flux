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

interface W2aDataCompositionDemoPageProps {
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
  fetcher: async function <T>(api: ApiSchema, _ctx: ApiRequestContext) {
    // Stub fetcher for the playground: returns deterministic mock data per URL
    // so the service + data-source request-sink demo is observable without a server.
    if (api.url.includes('/api/tasks')) {
      return {
        ok: true,
        status: 200,
        data: {
          items: [
            { id: 1, title: 'Design schema contract', status: 'done' },
            { id: 2, title: 'Wire playground demo', status: 'doing' },
            { id: 3, title: 'Add e2e coverage', status: 'todo' },
          ],
        } as T,
      };
    }
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

export function W2aDataCompositionDemoPage({ onBack }: W2aDataCompositionDemoPageProps) {
  const schema = useMemo(
    () => ({
      type: 'page',
      body: [
        {
          type: 'flex',
          direction: 'column',
          gap: 16,
          body: [
            // 1. pagination
            {
              type: 'pagination',
              testid: 'demo-pagination',
              currentPage: 1,
              pageSize: 10,
              total: 95,
              onChange: {
                action: 'setValue',
                args: { path: 'paginationTouched', value: true },
              },
            },
            {
              type: 'text',
              testid: 'pagination-report',
              text: 'pagination:${paginationTouched ? "touched" : "untouched"}',
            },

            // 3. cards
            {
              type: 'cards',
              testid: 'demo-cards',
              selectionMode: 'single',
              items: [
                { id: 'c1', title: 'Card A', detail: 'First card' },
                { id: 'c2', title: 'Card B', detail: 'Second card' },
                { id: 'c3', title: 'Card C', detail: 'Third card' },
              ],
              card: [
                {
                  type: 'flex',
                  direction: 'column',
                  gap: 4,
                  body: [
                    { type: 'text', text: '${$slot.item.title}', testid: 'card-title' },
                    { type: 'text', text: '${$slot.item.detail}' },
                  ],
                },
              ],
              onSelectionChange: {
                action: 'setValue',
                args: { path: 'cardSelected', value: true },
              },
              empty: { type: 'text', text: 'No cards' },
            },
            {
              type: 'text',
              testid: 'card-selection-report',
              text: 'card:${cardSelected ? "selected" : "unselected"}',
            },

            // 4. alert (closable)
            {
              type: 'alert',
              testid: 'demo-alert',
              level: 'warning',
              title: 'Heads up',
              body: 'This is an inline feedback block. Click the X to dismiss.',
              closable: true,
              onClose: {
                action: 'setValue',
                args: { path: 'alertClosed', value: true },
              },
            },
            {
              type: 'text',
              testid: 'alert-report',
              text: 'alert:${alertClosed ? "closed" : "open"}',
            },

            // 5. wizard
            {
              type: 'wizard',
              testid: 'demo-wizard',
              statusPath: 'wizardStatus',
              steps: [
                {
                  title: 'Account',
                  body: [{ type: 'text', text: 'Step 1: Account details', testid: 'wizard-step-1' }],
                },
                {
                  title: 'Profile',
                  body: [{ type: 'text', text: 'Step 2: Profile setup', testid: 'wizard-step-2' }],
                },
                {
                  title: 'Confirm',
                  body: [{ type: 'text', text: 'Step 3: Review & submit', testid: 'wizard-step-3' }],
                },
              ],
              onStepCommit: {
                action: 'setValue',
                args: { path: 'wizardCommitted', value: true },
              },
              onComplete: {
                action: 'setValue',
                args: { path: 'wizardComplete', value: true },
              },
            },
            {
              type: 'text',
              testid: 'wizard-report',
              text: 'wizard:step=${wizardStatus?.currentStepIndex ?? 0}:commit:${wizardStatus?.lastCommitStatus ?? "idle"}:complete:${wizardComplete ? "yes" : "no"}',
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
        Data Composition Family (W2a)
      </p>
      <h1 className="m-0 mb-6">
        数据组合组 — pagination / cards / alert / wizard
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Live renderer (schema-driven)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              4 个数据组合族组件通过 <code>SchemaRenderer</code> 真实挂载：
              <code>flux-renderers-data</code>（pagination）、
              <code>flux-renderers-content</code>（cards/alert）、
              <code>flux-renderers-layout</code>（wizard）。
            </p>
            <div
              data-testid="w2a-renderer-host"
              className="rounded-lg border border-dashed border-primary/40 bg-muted/40 p-3"
            >
              <SchemaRenderer
                schemaUrl="demo://w2a-data-composition"
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
                <strong>pagination</strong> — 独立分页交互 owner；复用 ui <code>Pagination</code>；边界归一 + 页大小重置到第 1 页。
              </li>
              <li>
                <strong>cards</strong> — 卡片集合 renderer；单一 <code>items</code> + <code>card</code> region + 选择态。
              </li>
              <li>
                <strong>alert</strong> — 内联反馈块；<code>level</code>/<code>closable</code>/<code>onClose</code>。
              </li>
              <li>
                <strong>wizard</strong> — 分步式任务容器；interaction（stepIndex）与 lifecycle（committing）状态分层；不引入 <code>$wizard</code>。
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Toaster />
    </main>
  );
}
