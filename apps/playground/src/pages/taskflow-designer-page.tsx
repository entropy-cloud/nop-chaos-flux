import { useMemo, useState } from 'react';
import type { NopDebuggerController } from '@nop-chaos/nop-debugger';
import type { ImportedLibraryModule, XuiImportSpec } from '@nop-chaos/flux-core';
import type { DesignerConfig } from '@nop-chaos/flow-designer-core';
import {
  createSchemaRenderer,
  createDefaultRegistry,
  createDefaultEnv,
} from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createActionScope } from '@nop-chaos/flux-runtime';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerFlowDesignerRenderers } from '@nop-chaos/flow-designer-renderers';
import { Tabs, TabsList, TabsTrigger } from '@nop-chaos/ui';
import taskflowWorkflowSchema from '../schemas/taskflow-workflow-schema.json';
import taskflowDingflowSchema from '../schemas/taskflow-dingflow-schema.json';
import * as taskflowDesignerLib from '../taskflow-designer-lib/index.js';

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerFormAdvancedRenderers(registry);
registerDataRenderers(registry);
registerFlowDesignerRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const TASKFLOW_LIB_MODULE: ImportedLibraryModule = {
  createNamespace: (context) => taskflowDesignerLib.createNamespace(context),
  createExpressionHelpers: (context) => taskflowDesignerLib.createExpressionHelpers(context),
};

const importLoader = {
  load(spec: XuiImportSpec) {
    if (spec.from === 'taskflow-designer://') {
      return Promise.resolve(TASKFLOW_LIB_MODULE);
    }
    throw new Error(`Unknown import: ${spec.from}`);
  },
};

function resolveImportUrl(_schemaUrl: string, from: string): string {
  if (from === 'taskflow-designer') {
    return 'taskflow-designer://';
  }
  return from;
}

type TFExampleKey = 'taskflow-workflow' | 'taskflow-dingflow';

function injectDesignerHooks(schema: unknown): unknown {
  const s = schema as Record<string, unknown>;
  const config = s?.config as Record<string, unknown> | undefined;
  if (!config) return schema;

  const hooks: DesignerConfig['hooks'] = {
    beforeConnect(input) {
      const taskflowEdgeKind = input.sourcePort === 'error'
        ? 'taskflow-error'
        : input.sourcePort === 'wait'
          ? 'taskflow-wait'
          : input.sourcePort === 'wait-error'
            ? 'taskflow-wait-error'
            : 'taskflow-next';
      return {
        ...input,
        data: {
          ...input.data,
          taskflowEdgeKind,
        },
      };
    },
  };

  return {
    ...s,
    config: {
      ...config,
      hooks,
    },
  };
}

const TF_EXAMPLES: Record<TFExampleKey, { label: string; schema: unknown }> = {
  'taskflow-workflow': {
    label: 'TaskFlow (Graph)',
    schema: injectDesignerHooks(taskflowWorkflowSchema),
  },
  'taskflow-dingflow': {
    label: 'TaskFlow (Tree)',
    schema: injectDesignerHooks(taskflowDingflowSchema),
  },
};

interface TaskFlowDesignerPageProps {
  debuggerController: NopDebuggerController;
  onBack: () => void;
}

export function TaskFlowDesignerPage({ debuggerController, onBack }: TaskFlowDesignerPageProps) {
  const [activeExample, setActiveExample] = useState<TFExampleKey>('taskflow-workflow');

  const actionScope = useMemo(() => {
    const scope = createActionScope({ id: 'taskflow-designer-page-action-scope' });
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
      },
    });
    return scope;
  }, [onBack]);

  const schema = TF_EXAMPLES[activeExample].schema;
  const plugins = useMemo(() => [debuggerController.plugin], [debuggerController]);
  const decoratedEnv = useMemo(
    () =>
      debuggerController.decorateEnv(
        createDefaultEnv({
          importLoader,
          resolveImportUrl,
        }),
      ),
    [debuggerController],
  );

  return (
    <div className="relative h-screen flex flex-col">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
        <Tabs value={activeExample} onValueChange={(v) => setActiveExample(v as TFExampleKey)}>
          <TabsList className="h-8 bg-background/80 backdrop-blur-sm shadow-sm">
            {(Object.entries(TF_EXAMPLES) as [TFExampleKey, { label: string }][]).map(
              ([key, { label }]) => (
                <TabsTrigger key={key} value={key} className="text-xs px-3 h-6">
                  {label}
                </TabsTrigger>
              ),
            )}
          </TabsList>
        </Tabs>
      </div>
      <div className="min-h-0 flex-1">
        <SchemaRenderer
          key={activeExample}
          schemaUrl={`playground://pages/taskflow-designer/${activeExample}`}
          schema={schema as any}
          registry={registry}
          env={decoratedEnv}
          formulaCompiler={formulaCompiler}
          actionScope={actionScope}
          plugins={plugins}
          onRuntimeChange={(runtime) => debuggerController.setRuntime(runtime)}
          onComponentRegistryChange={(componentRegistry) =>
            debuggerController.setComponentRegistry(componentRegistry)
          }
          onActionScopeChange={(nextActionScope) => debuggerController.setActionScope(nextActionScope)}
          onActionError={debuggerController.onActionError}
        />
      </div>
    </div>
  );
}
