import { useMemo } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { Button, Card, CardContent, CardHeader, CardTitle, Toaster, toast } from '@nop-chaos/ui';
import {
  createSchemaRenderer,
  createDefaultRegistry,
} from '@nop-chaos/flux-react';
import type { ApiSchema, ApiRequestContext, RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';

interface W4bProcessDisplayFamilyDemoPageProps {
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

export function W4bProcessDisplayFamilyDemoPage({
  onBack,
}: W4bProcessDisplayFamilyDemoPageProps) {
  const schema = useMemo(
    () => ({
      type: 'page',
      body: [
        {
          type: 'flex',
          direction: 'column',
          gap: 16,
          body: [
            // 1. steps — horizontal, current step value driven
            {
              type: 'steps',
              testid: 'demo-steps',
              value: 'review',
              items: [
                { value: 'draft', title: 'Draft', description: 'Compose content' },
                { value: 'review', title: 'Review', description: 'Awaiting approval' },
                { value: 'done', title: 'Done', description: 'Published' },
              ],
            },

            // 2. steps — vertical + scope controlled
            {
              type: 'steps',
              testid: 'demo-steps-vertical',
              orientation: 'vertical',
              valueOwnership: 'scope',
              valueStatePath: 'vstep',
              defaultValue: 'a',
              items: [
                { value: 'a', title: 'Step A' },
                { value: 'b', title: 'Step B' },
                { value: 'c', title: 'Step C' },
              ],
            },
            {
              type: 'text',
              testid: 'steps-report',
              text: 'steps:${vstep ?? "a"}',
            },

            // 3. steps — local controlled + onChange report
            {
              type: 'steps',
              testid: 'demo-steps-local',
              defaultValue: 's1',
              items: [
                { value: 's1', title: 'One' },
                { value: 's2', title: 'Two' },
              ],
              onChange: {
                action: 'setValue',
                args: { path: 'stepsTouched', value: true },
              },
            },
            {
              type: 'text',
              testid: 'steps-touched-report',
              text: 'steps-touched:${stepsTouched ? "yes" : "no"}',
            },

            // 4. timeline — vertical, default left mode
            {
              type: 'timeline',
              testid: 'demo-timeline',
              items: [
                { time: '09:00', title: '任务创建', detail: '由 Alice 创建' },
                { time: '11:30', title: '审核通过', detail: '由 Bob 审核', level: 'success' },
                { time: '14:00', title: '已发布', detail: '已上线', level: 'primary' },
              ],
            },

            // 5. timeline — reversed order
            {
              type: 'timeline',
              testid: 'demo-timeline-reverse',
              reverse: true,
              items: [
                { time: '1', title: 'First' },
                { time: '2', title: 'Second' },
                { time: '3', title: 'Third' },
              ],
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
        Process Display Family (W4b)
      </p>
      <h1 className="m-0 mb-6">
        流程展示组 — steps / timeline
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Live renderer (schema-driven)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              流程展示族组件通过 <code>SchemaRenderer</code> 真实挂载到{' '}
              <code>flux-renderers-layout</code> 包。steps 是轻量步骤进度展示（当前步骤值经
              valueOwnership 三态分层，不承担流程提交 lifecycle）。
            </p>
            <div
              data-testid="w4b-renderer-host"
              className="rounded-lg border border-dashed border-primary/40 bg-muted/40 p-3"
            >
              <SchemaRenderer
                schemaUrl="demo://w4b-process-display-family"
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
                <strong>steps</strong> — 轻量步骤进度 renderer；item 含 title/description/status；
                当前步骤值复用 <code>valueOwnership</code>（local/controlled/scope）三态分层；
                <code>orientation</code> 横/纵；value 越界 clamp。不承担多步流程提交 lifecycle（由 wizard 承担）。
              </li>
              <li>
                <strong>timeline</strong> — 时间线展示集合 renderer；item 含 time/title/detail/icon/level；
                <code>mode</code>（left/right/alternate）+ <code>orientation</code> 横/纵 + <code>reverse</code> 反转；
                展示型无 owner 状态；缺字段项降级不崩。
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Toaster />
    </main>
  );
}
