import { useMemo, useState } from 'react';
import { createSchemaRenderer, createDefaultRegistry, createDefaultEnv } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createActionScope } from '@nop-chaos/flux-runtime';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerFlowDesignerRenderers } from '@nop-chaos/flow-designer-renderers';
import { Tabs, TabsList, TabsTrigger } from '@nop-chaos/ui';
import workflowDesignerSchema from '../schemas/workflow-designer-schema.json';
import dingtalkWorkflowTreeSchema from '../schemas/dingtalk-workflow-tree-schema.json';
import actionFlowTreeSchema from '../schemas/action-flow-tree-schema.json';

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerDataRenderers(registry);
registerFlowDesignerRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const env = createDefaultEnv();
const formulaCompiler = createFormulaCompiler();

type ExampleKey = 'workflow' | 'dingtalk' | 'action-flow';

const EXAMPLES: Record<ExampleKey, { label: string; schema: unknown }> = {
  'workflow': { label: '工作流', schema: workflowDesignerSchema },
  'dingtalk': { label: '钉钉审批流', schema: dingtalkWorkflowTreeSchema },
  'action-flow': { label: 'Action 编排', schema: actionFlowTreeSchema },
};

interface FlowDesignerPageProps {
  onBack: () => void;
}

export function FlowDesignerPage({ onBack }: FlowDesignerPageProps) {
  const [activeExample, setActiveExample] = useState<ExampleKey>('workflow');

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

  const schema = EXAMPLES[activeExample].schema;

  return (
    <div className="relative h-screen flex flex-col">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
        <Tabs value={activeExample} onValueChange={(v) => setActiveExample(v as ExampleKey)}>
          <TabsList className="h-8 bg-background/80 backdrop-blur-sm shadow-sm">
            {(Object.entries(EXAMPLES) as [ExampleKey, { label: string }][]).map(([key, { label }]) => (
              <TabsTrigger key={key} value={key} className="text-xs px-3 h-6">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <SchemaRenderer
        key={activeExample}
        schema={schema as any}
        registry={registry}
        env={env}
        formulaCompiler={formulaCompiler}
        actionScope={actionScope}
      />
    </div>
  );
}
