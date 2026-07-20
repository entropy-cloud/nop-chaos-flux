import { Button, Card, CardContent, CardHeader } from '@nop-chaos/ui';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerSchedulingRenderers } from '@nop-chaos/flux-renderers-scheduling';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { ArrowLeft } from 'lucide-react';

interface BarcodeDemoPageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerSchedulingRenderers(registry);
registerFormRenderers(registry);
registerFormAdvancedRenderers(registry);
const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const env: RendererEnv = {
  fetcher: async function <T>(_req: { url: string }) {
    return { ok: true, status: 200, data: null as T };
  },
  notify: (level, msg) => console.log(`[${level}] ${msg}`),
};

const SAMPLE_BARCODE_SCHEMA = {
  type: 'form',
  body: [
    {
      type: 'barcode-input',
      name: 'barcode',
      label: 'Scan Barcode',
      placeholder: 'Scan or type barcode...',
      scanButton: true,
      clearable: true,
      torchButton: true,
    },
  ],
};

const BATCH_BARCODE_SCHEMA = {
  type: 'form',
  body: [
    {
      type: 'barcode-input',
      name: 'batchBarcode',
      label: 'Batch Scan',
      placeholder: 'Batch scan items...',
      scanButton: true,
      batchMode: true,
      clearable: true,
    },
  ],
};

export function BarcodeDemoPage({ onBack }: BarcodeDemoPageProps) {

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-white shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-semibold">Barcode Scanner Demo</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">Single Scan Mode</h2>
          </CardHeader>
          <CardContent>
            <SchemaRenderer
              schemaUrl="barcode://demo-single"
              schema={SAMPLE_BARCODE_SCHEMA as any}
              registry={registry as any}
              env={env}
              formulaCompiler={formulaCompiler}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">Batch Scan Mode</h2>
          </CardHeader>
          <CardContent>
            <SchemaRenderer
              schemaUrl="barcode://demo-batch"
              schema={BATCH_BARCODE_SCHEMA as any}
              registry={registry as any}
              env={env}
              formulaCompiler={formulaCompiler}
            />
          </CardContent>
        </Card>


      </div>
    </div>
  );
}
