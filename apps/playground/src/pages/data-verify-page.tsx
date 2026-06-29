import { useMemo } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { Button, toast, Toaster } from '@nop-chaos/ui';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';

interface Props { onBack: () => void; }

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerDataRenderers(registry);
registerContentRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const MOCK = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
  { id: '3', name: 'Carol' },
];

const env: RendererEnv = {
  fetcher: async function <T>(req: { url: string }) {
    console.log('[VERIFY] fetcher called:', req.url);
    if (req.url === '/api/users') return { ok: true, status: 200, data: MOCK as T };
    return { ok: true, status: 200, data: null as T };
  },
  notify: (level, msg) => toast.info(String(msg)),
};

const schema = {
  type: 'page',
  body: [
    { type: 'scope-debug', testid: 'verify-scope' },
    {
      type: 'data-source',
      name: 'users',
      action: 'ajax',
      args: { url: '/api/users' },
      resultMapping: { data: '${payload}' },
      silent: true,
    },
    { type: 'text', text: 'users?.data length = ${users?.data?.length}', testid: 'verify-expr' },
    {
      type: 'button',
      label: 'setValue test',
      testid: 'verify-setvalue',
      onClick: { action: 'setValue', args: { path: 'testVar', value: 'hello from setValue' } },
    },
    { type: 'text', text: 'testVar = ${testVar}', testid: 'verify-setvalue-result' },
    {
      type: 'loop',
      testid: 'verify-loop',
      items: '${users?.data}',
      body: [
        { type: 'text', text: '${$slot.item.name}' },
      ],
    },
  ],
};

export function DataVerifyPage({ onBack }: Props) {
  const s = useMemo(() => schema, []);
  return (
    <main className="min-h-screen p-6">
      <Button variant="outline" onClick={onBack} className="mb-4">Back</Button>
      <h1 className="text-lg font-bold mb-4">Data-Source Mechanism Verify</h1>
      <div className="border rounded-lg p-4" data-testid="verify-root">
        <SchemaRenderer
          schemaUrl="verify://test"
          schema={s as React.ComponentProps<typeof SchemaRenderer>['schema']}
          registry={registry as React.ComponentProps<typeof SchemaRenderer>['registry']}
          env={env}
          formulaCompiler={formulaCompiler}
        />
      </div>
      <Toaster />
    </main>
  );
}
