import { useMemo } from 'react';
import { createSchemaRenderer, createDefaultRegistry, createDefaultEnv } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createActionScope } from '@nop-chaos/flux-runtime';
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
  const actionScope = useMemo(() => {
    const scope = createActionScope({ id: 'flow-designer-page-action-scope' });
    scope.registerNamespace('designer', {
      kind: 'host',
      listMethods() {
        return ['navigate-back'];
      },
      invoke(method) {
        if (method === 'navigate-back') {
          onBack();
          return { ok: true };
        }
        return { ok: false, error: new Error(`Unknown designer method: ${method}`) };
      }
    });
    return scope;
  }, [onBack]);

  return (
    <div className="playground-flow-page">
      <SchemaRenderer
        schema={workflowDesignerSchema as any}
        registry={registry}
        env={env}
        formulaCompiler={formulaCompiler}
        actionScope={actionScope}
      />
    </div>
  );
}
