import { useMemo } from 'react';
import { Button, Toaster } from '@nop-chaos/ui';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';
import { registerAiRenderers } from '@nop-chaos/flux-renderers-ai';
import { createCoverageConnectors } from '../ai/coverage-connectors.js';
import { COVERAGE_SCHEMA } from '../ai/ai-coverage-example.js';

interface Props {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerContentRenderers(registry);
registerLayoutRenderers(registry);
registerAiRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const PROBE_SEEDS = {
  completeProbe: '',
  errorProbe: '',
  promptProbe: '',
  feedbackProbe: '',
  tokenProbe: '',
  suggestionProbe: '',
  toolProbe: '',
  citationProbe: '',
  attachmentErrorProbe: '',
  ctrlSendProbe: '',
  shiftSendProbe: '',
  convCreateProbe: '',
  convRenameProbe: '',
  convDeleteProbe: '',
  convClickProbe: '',
  covActiveId: 'cc1',
  voiceResultProbe: '',
};

/**
 * E2E coverage page for the gantt/ai e2e plan (docs/plans/2026-07-25-2):
 * deterministic connectors (slow / flaky / eof / mock) plus every AI widget
 * edge scenario the focused demo pages do not host. See
 * ai/ai-coverage-example.ts for the scenario inventory.
 */
export function AiCoverageDemoPage({ onBack }: Props) {
  const { connectors, env, importLoader, resolveImportUrl } = useMemo(() => createCoverageConnectors(), []);

  const decoratedEnv = useMemo(
    () => ({ ...env, importLoader, resolveImportUrl }),
    [env, importLoader, resolveImportUrl],
  );

  // Connectors are handed to the schema through page data instead of a page
  // level `xui:imports` — the import overlay currently detaches schema-event
  // scope writes on this page (see docs/bugs/15 for the runtime defect).
  const pageData = useMemo(
    () => ({ ...PROBE_SEEDS, connectors, engines: { nullEngine: null } }),
    [connectors],
  );

  return (
    <div className="nop-theme-root min-h-screen flex flex-col">
      <Toaster />
      <header className="flex items-center gap-3 p-3 border-b bg-background">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <h1 className="text-lg font-semibold">AI Coverage — states, widgets & edge cases</h1>
      </header>
      <main className="flex-1 p-4 space-y-4 max-w-3xl mx-auto w-full">
        <SchemaRenderer
          schemaUrl="playground://pages/ai-coverage-demo"
          schema={COVERAGE_SCHEMA as never}
          registry={registry}
          env={decoratedEnv}
          formulaCompiler={formulaCompiler}
          data={pageData}
        />
      </main>
    </div>
  );
}
