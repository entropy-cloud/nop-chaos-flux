import { createSchemaRenderer, createDefaultRegistry, createDefaultEnv } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerFlowDesignerRenderers } from '@nop-chaos/flow-designer-renderers';
import workflowDesignerSchema from '../schemas/workflow-designer-schema.json';

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerDataRenderers(registry);
registerFlowDesignerRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const env = createDefaultEnv();
const formulaCompiler = createFormulaCompiler();

interface FlowDesignerPageProps {
  onBack: () => void;
}

export function FlowDesignerPage({ onBack }: FlowDesignerPageProps) {
  return (
    <div className="playground-flow-page">
      <button type="button" className="page-back page-back--floating" onClick={onBack}>
        Back to Home
      </button>
      <SchemaRenderer schema={workflowDesignerSchema as any} registry={registry} env={env} formulaCompiler={formulaCompiler} />
    </div>
  );
}
