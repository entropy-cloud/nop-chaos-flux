import { useMemo, useState } from 'react';
import { notifyWithToast } from './notify-toast.js';
import type { NopDebuggerController } from '@nop-chaos/nop-debugger';
import type { ActionResult, ImportedLibraryModule, XuiImportSpec } from '@nop-chaos/flux-core';
import type { DesignerConfig } from '@nop-chaos/flow-designer-core';
import {
  createSchemaRenderer,
  createDefaultEnv,
} from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createActionScope } from '@nop-chaos/flux-runtime';
import { Button, Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle, Tabs, TabsList, TabsTrigger, Textarea } from '@nop-chaos/ui';
import taskflowWorkflowSchema from '../schemas/taskflow-workflow-schema.json';
import taskflowDingflowSchema from '../schemas/taskflow-dingflow-schema.json';
import * as taskflowDesignerLib from '../taskflow-designer-lib/index.js';
import { createDesignerRegistry, TASKFLOW_DESIGNER_PAGE_RECIPE } from '../designer-hosts/registry-factory.js';

const registry = createDesignerRegistry(TASKFLOW_DESIGNER_PAGE_RECIPE);

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

// plan 556 (taskflow-002): page-owned lib instance used as a stateless import
// parser — the injected document remounts the SchemaRenderer, whose own import
// frame re-creates its namespace instance fresh, so no state is shared.
const importParser = taskflowDesignerLib.createNamespace({} as never);

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

const TF_DOC_KEY: Record<TFExampleKey, 'document' | 'treeDocument'> = {
  'taskflow-workflow': 'document',
  'taskflow-dingflow': 'treeDocument',
};

function countImportedNodes(doc: unknown): number {
  const graph = doc as { nodes?: unknown[] } | null;
  if (Array.isArray(graph?.nodes)) {
    return graph.nodes.length;
  }
  const tree = doc as { root?: { child?: unknown } } | null;
  let count = 0;
  const walk = (node: unknown) => {
    const n = node as { branches?: Array<{ child?: unknown }>; child?: unknown } | null;
    if (!n) return;
    count += 1;
    walk(n.child);
    for (const branch of n.branches ?? []) walk(branch.child);
  };
  walk(tree?.root);
  return Math.max(count - 1, 0);
}

interface TaskFlowDesignerPageProps {
  debuggerController: NopDebuggerController;
  onBack: () => void;
}

export function TaskFlowDesignerPage({ debuggerController, onBack }: TaskFlowDesignerPageProps) {
  const [activeExample, setActiveExample] = useState<TFExampleKey>('taskflow-workflow');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importedDocs, setImportedDocs] = useState<Partial<Record<TFExampleKey, unknown>>>({});
  const [importEpoch, setImportEpoch] = useState(0);

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
    // plan 556 (taskflow-002): a page-owned namespace (NOT the designer body's
    // contract-table `designer` namespace, which shadows it on the child
    // scope). The toolbar channel passes no payload, so Import opens the
    // page-level paste dialog instead of dispatching taskflow:import-json
    // with an undefined payload.
    scope.registerNamespace('taskflow-page', {
      kind: 'host',
      listMethods() {
        return ['request-import'];
      },
      invoke(method) {
        if (method === 'request-import') {
          setImportDialogOpen(true);
          return { ok: true };
        }
        return { ok: false, error: new Error(`Unknown taskflow-page method: ${method}`) };
      },
    });
    return scope;
  }, [onBack]);

  const handleConfirmImport = () => {
    const result = importParser.invoke('import-json', { json: importText }, {} as never) as ActionResult;
    if (!result.ok) {
      notifyWithToast('error', `导入失败：${(result.error as Error | undefined)?.message ?? 'Invalid nop-taskflow DSL'}`);
      return;
    }
    const data = result.data as {
      projectedDoc?: unknown;
      projectedTreeDoc?: unknown;
      profile?: string;
    };
    const doc = activeExample === 'taskflow-workflow' ? data.projectedDoc : data.projectedTreeDoc;
    if (!doc) {
      notifyWithToast('error', `导入失败：未返回 ${TF_DOC_KEY[activeExample]} 文档投影`);
      return;
    }
    setImportedDocs((prev) => ({ ...prev, [activeExample]: doc }));
    setImportEpoch((epoch) => epoch + 1);
    setImportDialogOpen(false);
    setImportText('');
    notifyWithToast('success', `导入成功：${countImportedNodes(doc)} 个节点`);
  };

  const schema = useMemo(() => {
    const base = TF_EXAMPLES[activeExample].schema as Record<string, unknown>;
    const doc = importedDocs[activeExample];
    if (!doc) return base;
    return { ...base, [TF_DOC_KEY[activeExample]]: doc };
  }, [activeExample, importedDocs]);

  const plugins = useMemo(() => [debuggerController.plugin], [debuggerController]);
  const decoratedEnv = useMemo(
    () =>
      debuggerController.decorateEnv(
        createDefaultEnv({
        notify: notifyWithToast,
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
          key={`${activeExample}:${importEpoch}`}
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
      <Dialog open={importDialogOpen} onOpenChange={(open) => { if (!open) setImportDialogOpen(false); }}>
        <DialogContent size="sm" data-testid="taskflow-import-dialog">
          <DialogHeader>
            <DialogTitle>Import TaskFlow DSL</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Textarea
              data-testid="taskflow-import-input"
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              rows={10}
              placeholder={'粘贴 nop-taskflow DSL JSON，例如：\n{"kind":"nop-taskflow","task":{"graphMode":false},"steps":[{"type":"script","name":"step1"}]}'}
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              取消
            </Button>
            <Button data-testid="taskflow-import-confirm" onClick={handleConfirmImport}>
              确认导入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
