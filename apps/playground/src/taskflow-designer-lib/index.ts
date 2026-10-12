import type {
  ActionNamespaceProvider,
  ImportedLibraryModule,
  ActionContext,
  ActionResult,
  ImportedNamespaceContext,
} from '@nop-chaos/flux-core';
import type { GraphDocument, TreeDocument } from '@nop-chaos/flow-designer-core';
import type {
  TaskFlowAuthoringModel,
  TaskFlowContainer,
} from './types.js';
import { createContainerStack, findContainerById, type TaskFlowContainerStack } from './types.js';
import { projectToGraphDocument, projectToTreeDocument } from './projection.js';
import { syncFromGraphDocument, syncFromTreeDocument, syncFromTreeProjectionDoc } from './sync.js';
import { lowerToTaskFlowDSL } from './lowering.js';
import { validateAuthoringModel } from './validation.js';
import { parseNopTaskDSL, tryParseJson as parseTaskflowJson, type NopTaskDSLInput } from './dsl.js';

interface DesignerProjection {
  doc: {
    id: string;
    kind: string;
    name: string;
    version: string;
    nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data?: Record<string, unknown>;
    }>;
    edges: Array<{ id: string; source: string; target: string; sourcePort?: string; taskflowEdgeKind?: string }>;
    viewport: { x: number; y: number; zoom: number };
    nodeCount: number;
    edgeCount: number;
  };
}

function getDesignerDoc(ctx: ActionContext): DesignerProjection['doc'] | null {
  try {
    // plan 547 (taskflow-1): the imported-library namespace scope IS
    // `$page.imports.designer` — the designer projection doc lives in its own
    // data (there is no '$designer' key; the old lookup never resolved).
    const own = ctx.scope.readOwn() as { doc?: DesignerProjection['doc'] };
    if (own.doc) return own.doc;
    const viaGet = ctx.scope.get('doc') as DesignerProjection['doc'] | undefined;
    if (viaGet) return viaGet;
    return null;
  } catch {
    return null;
  }
}

function buildGraphDocFromProjection(doc: DesignerProjection['doc']): GraphDocument {
  return {
    id: doc.id,
    kind: doc.kind,
    name: doc.name,
    version: doc.version,
    viewport: doc.viewport,
    nodes: doc.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: { x: n.position.x, y: n.position.y },
      data: n.data ?? {},
    })),
    edges: doc.edges.map((e) => ({
      id: e.id,
      type: 'tf-next',
      source: e.source,
      target: e.target,
      sourcePort: e.sourcePort,
      targetPort: 'in',
      data: e.taskflowEdgeKind ? { taskflowEdgeKind: e.taskflowEdgeKind } : {},
    })),
  };
}

function bootstrapTreeModel(doc: DesignerProjection['doc']): TaskFlowAuthoringModel {
  const model: TaskFlowAuthoringModel = {
    kind: 'nop-taskflow',
    schemaVersion: '1.0',
    task: { version: 1, graphMode: false, restartable: false, defaultSaveState: true, useParentBeanContainer: false, recordMetrics: false },
    root: { id: 'root', profile: 'dingflow', name: doc.name, steps: [], syntheticRootId: '__synthetic_root__' },
  };
  return model;
}

function flushDesignerProjectionIntoModel(
  ctx: ActionContext,
  model: TaskFlowAuthoringModel | null,
  containerId: string | null,
): TaskFlowAuthoringModel | null {
  const designerDoc = getDesignerDoc(ctx);
  if (!designerDoc) return model;
  // plan 547 (taskflow-1): a fresh page has no authoring model until
  // set-authoring-model is dispatched — bootstrap a minimal model and let the
  // projection sync fill.
  if (designerDoc.kind !== 'nop-taskflow-workflow') {
    // plan 556 (taskflow-002): tree (dingflow) documents take the
    // tree-projection sync; the host projection is graph-shaped without step
    // payloads, so the sync is structure-level (see syncFromTreeProjectionDoc
    // v1 contract in sync.ts).
    if (designerDoc.kind !== 'nop-taskflow-dingflow') {
      return model;
    }
    const effectiveModel = model ?? bootstrapTreeModel(designerDoc);
    return syncFromTreeProjectionDoc(effectiveModel, containerId ?? 'root', designerDoc);
  }
  const bootstrapped = !model;
  const bootstrapModel: TaskFlowAuthoringModel = {
    kind: 'nop-taskflow',
    schemaVersion: '1.0',
    task: { version: 1, graphMode: true, restartable: false, defaultSaveState: true, useParentBeanContainer: false, recordMetrics: false },
    root: { id: 'root', profile: 'workflow', enterStepRefs: [], exitStepRefs: [], nodes: [], edges: [] },
  };
  const effectiveModel = model ?? bootstrapModel;
  const effectiveContainerId = containerId ?? 'root';

  const synced = syncFromGraphDocument(effectiveModel, effectiveContainerId, buildGraphDocFromProjection(designerDoc));
  if (bootstrapped) {
    // syncFromGraphDocument syncs nodes/edges only — a fresh model's entry/exit
    // refs must be derived from the graph structure (nodes with no incoming
    // edges are entries; no outgoing edges are exits).
    const graphRoot = synced.root as { enterStepRefs: string[]; exitStepRefs: string[] };
    const targets = new Set(designerDoc.edges.map((e) => e.target));
    const sources = new Set(designerDoc.edges.map((e) => e.source));
    graphRoot.enterStepRefs = designerDoc.nodes.filter((n) => !targets.has(n.id)).map((n) => n.id);
    graphRoot.exitStepRefs = designerDoc.nodes.filter((n) => !sources.has(n.id)).map((n) => n.id);
  }
  return synced;
}

function resolveInvokePayload(
  payload: Record<string, unknown> | undefined,
  authoringModel: TaskFlowAuthoringModel | null,
  activeContainerId: string | null,
): { model: TaskFlowAuthoringModel | null; containerId: string | null } {
  return {
    model: (payload?.model ?? authoringModel) as TaskFlowAuthoringModel | null,
    containerId: (payload?.containerId ?? activeContainerId) as string | null,
  };
}

export function createNamespace(_context: ImportedNamespaceContext): ActionNamespaceProvider {
  let authoringModel: TaskFlowAuthoringModel | null = null;
  let activeContainerId: string | null = null;
  const containerStack = createContainerStack();

  return {
    kind: 'import',
    listMethods() {
      return [
        'project-to-graph',
        'project-to-tree',
        'sync-from-graph',
        'sync-from-tree',
        'lower-to-dsl',
        'validate',
        'export-json',
        'import-json',
        'save',
        'enter-container',
        'exit-container',
        'get-active-container',
        'push-container',
        'pop-container',
        'set-authoring-model',
        'get-authoring-model',
      ];
    },
    invoke(method: string, payload: Record<string, unknown> | undefined, ctx: ActionContext): ActionResult {
      try {
        switch (method) {
          case 'set-authoring-model': {
            authoringModel = (payload?.model as TaskFlowAuthoringModel) ?? null;
            activeContainerId = (payload?.containerId as string) ?? null;
            if (authoringModel && activeContainerId) {
              containerStack.clear();
              containerStack.push(activeContainerId, authoringModel.root);
            }
            return { ok: true };
          }
          case 'get-authoring-model': {
            return { ok: true, data: { model: authoringModel, containerId: activeContainerId } };
          }
          case 'project-to-graph': {
            const { model, containerId } = resolveInvokePayload(payload, authoringModel, activeContainerId);
            if (!model || !containerId) {
              return { ok: false, error: new Error('project-to-graph requires model and containerId') };
            }
            const doc = projectToGraphDocument({ authoringModel: model, containerId });
            return { ok: true, data: doc };
          }
          case 'project-to-tree': {
            const { model, containerId } = resolveInvokePayload(payload, authoringModel, activeContainerId);
            if (!model || !containerId) {
              return { ok: false, error: new Error('project-to-tree requires model and containerId') };
            }
            const doc = projectToTreeDocument({ authoringModel: model, containerId });
            return { ok: true, data: doc };
          }
          case 'sync-from-graph': {
            const { model, containerId } = resolveInvokePayload(payload, authoringModel, activeContainerId);
            const graphDoc = (payload?.graphDoc ?? payload?.document) as GraphDocument | undefined;
            if (!model || !containerId || !graphDoc) {
              return { ok: false, error: new Error('sync-from-graph requires model, containerId, and graphDoc') };
            }
            const result = syncFromGraphDocument(model, containerId, graphDoc);
            authoringModel = result;
            return { ok: true, data: result };
          }
          case 'sync-from-tree': {
            const { model, containerId } = resolveInvokePayload(payload, authoringModel, activeContainerId);
            const treeDoc = (payload?.treeDoc ?? payload?.document) as TreeDocument | undefined;
            if (!model || !containerId || !treeDoc) {
              return { ok: false, error: new Error('sync-from-tree requires model, containerId, and treeDoc') };
            }
            const result = syncFromTreeDocument(model, containerId, treeDoc);
            authoringModel = result;
            return { ok: true, data: result };
          }
          case 'lower-to-dsl':
          case 'export-json': {
            let model = (payload?.model ?? authoringModel) as TaskFlowAuthoringModel | null;
            model = flushDesignerProjectionIntoModel(ctx, model, activeContainerId);
            authoringModel = model;

            if (!model) {
              return { ok: false, error: new Error('No authoring model available. Call set-authoring-model first.') };
            }

            const errors = validateAuthoringModel(model);
            const hasFatalErrors = errors.some((e) => e.severity === 'error');
            const dsl = lowerToTaskFlowDSL(model);

            return {
              ok: true,
              data: {
                dsl: JSON.parse(JSON.stringify(dsl)),
                errors,
                valid: !hasFatalErrors,
              },
            };
          }
          case 'validate': {
            const model = (payload?.model ?? authoringModel) as TaskFlowAuthoringModel | null;
            if (!model) {
              return { ok: false, error: new Error('validate requires model') };
            }
            const errors = validateAuthoringModel(model);
            return { ok: true, data: errors };
          }
          case 'save': {
            let model = (payload?.model ?? authoringModel) as TaskFlowAuthoringModel | null;
            model = flushDesignerProjectionIntoModel(ctx, model, activeContainerId);
            authoringModel = model;

            if (!model) {
              return { ok: false, error: new Error('No authoring model available.') };
            }

            const errors = validateAuthoringModel(model);
            const hasFatalErrors = errors.some((e) => e.severity === 'error');
            if (hasFatalErrors) {
              return { ok: false, error: new Error('Validation failed'), data: errors };
            }

            const dsl = lowerToTaskFlowDSL(model);
            return { ok: true, data: { dsl: JSON.parse(JSON.stringify(dsl)), saved: true } };
          }
          case 'enter-container': {
            const containerId = (payload?.containerId ?? payload?.id) as string;
            if (!containerId) {
              return { ok: false, error: new Error('enter-container requires containerId') };
            }

            if (!authoringModel) {
              return { ok: false, error: new Error('No authoring model') };
            }

            authoringModel = flushDesignerProjectionIntoModel(ctx, authoringModel, activeContainerId);
            if (!authoringModel) {
              return { ok: false, error: new Error('No authoring model') };
            }
            const currentAuthoringModel: TaskFlowAuthoringModel = authoringModel;

            const container = findContainerById(currentAuthoringModel, containerId);
            if (!container) {
              return { ok: false, error: new Error(`Container not found: ${containerId}`) };
            }

            if (activeContainerId) {
              containerStack.push(
                activeContainerId,
                findContainerById(currentAuthoringModel, activeContainerId)!,
              );
            }
            activeContainerId = containerId;
            containerStack.push(containerId, container);

            const projectedDoc = container.profile === 'workflow'
              ? projectToGraphDocument({ authoringModel: currentAuthoringModel, containerId })
              : null;

            return {
              ok: true,
              data: {
                containerId,
                profile: container.profile,
                projectedDoc,
                stackSize: containerStack.size(),
                breadcrumb: getBreadcrumb(containerStack),
              },
            };
          }
          case 'exit-container': {
            if (containerStack.size() <= 1) {
              return { ok: false, error: new Error('Already at root container') };
            }

            authoringModel = flushDesignerProjectionIntoModel(ctx, authoringModel, activeContainerId);

            containerStack.pop();
            const parentEntry = containerStack.peek();
            if (!parentEntry) {
              return { ok: false, error: new Error('No parent container') };
            }

            activeContainerId = parentEntry.containerId;
            const container = parentEntry.container;
            const projectedDoc = container.profile === 'workflow'
              ? projectToGraphDocument({ authoringModel: authoringModel!, containerId: activeContainerId })
              : null;

            return {
              ok: true,
              data: {
                containerId: activeContainerId,
                profile: container.profile,
                projectedDoc,
                stackSize: containerStack.size(),
                breadcrumb: getBreadcrumb(containerStack),
                canExit: containerStack.size() > 1,
              },
            };
          }
          case 'push-container': {
            const containerId = (payload?.containerId ?? payload?.id) as string;
            const container = payload?.container as TaskFlowContainer;
            if (!containerId || !container) {
              return { ok: false, error: new Error('push-container requires containerId and container') };
            }
            containerStack.push(containerId, container);
            return { ok: true, data: { size: containerStack.size() } };
          }
          case 'pop-container': {
            const entry = containerStack.pop();
            return { ok: true, data: entry ?? null };
          }
          case 'import-json': {
            const rawJson = payload?.json ?? payload?.dsl ?? payload?.data;
            const dsl = typeof rawJson === 'string' ? parseTaskflowJson(rawJson) : rawJson;
            if (!dsl || typeof dsl !== 'object') {
              return { ok: false, error: new Error('import-json requires a valid nop-task JSON payload') };
            }

            const parsed = parseNopTaskDSL(dsl as NopTaskDSLInput, payload?.name as string);
            if (!parsed) {
              return { ok: false, error: new Error('Failed to parse nop-task DSL JSON') };
            }

            authoringModel = parsed.model;
            activeContainerId = parsed.model.root.id;
            containerStack.clear();
            containerStack.push(activeContainerId, parsed.model.root);

            const projectedDoc = parsed.model.root.profile === 'workflow'
              ? projectToGraphDocument({ authoringModel: parsed.model, containerId: activeContainerId })
              : null;
            // plan 556 (taskflow-002): tree-profile imports project a
            // TreeDocument too so the host can inject it into the designer's
            // `treeDocument` schema key (graph imports inject `document`).
            const projectedTreeDoc = parsed.model.root.profile === 'workflow'
              ? null
              : projectToTreeDocument({ authoringModel: parsed.model, containerId: activeContainerId });

            return {
              ok: true,
              data: {
                model: parsed.model,
                containerId: activeContainerId,
                profile: parsed.model.root.profile,
                projectedDoc,
                projectedTreeDoc,
              },
            };
          }
          case 'get-active-container': {
            const entry = containerStack.peek();
            return {
              ok: true,
              data: entry ? { containerId: entry.containerId, container: entry.container, stackSize: containerStack.size(), canExit: containerStack.size() > 1, breadcrumb: getBreadcrumb(containerStack) } : null,
            };
          }
          default:
            return { ok: false, error: new Error(`Unknown taskflow method: ${method}`) };
        }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
      }
    },
  };
}

function getBreadcrumb(stack: TaskFlowContainerStack): string[] {
  return stack.stack.map((e) => e.container.name ?? e.containerId);
}

export function createExpressionHelpers(_context: ImportedNamespaceContext): Record<string, unknown> {
  return {
    $tf: {
      projectToGraph: (model: TaskFlowAuthoringModel, containerId: string) =>
        projectToGraphDocument({ authoringModel: model, containerId }),
      projectToTree: (model: TaskFlowAuthoringModel, containerId: string) =>
        projectToTreeDocument({ authoringModel: model, containerId }),
      lowerToDSL: (model: TaskFlowAuthoringModel) => lowerToTaskFlowDSL(model),
      validate: (model: TaskFlowAuthoringModel) => validateAuthoringModel(model),
    },
  };
}

const _module: ImportedLibraryModule = {
  createNamespace,
  createExpressionHelpers,
};
export default _module;
