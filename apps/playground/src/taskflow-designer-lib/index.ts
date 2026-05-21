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
  TaskFlowGraphContainer,
  TaskFlowTreeContainer,
  TaskFlowStep,
  TaskFlowGraphNode,
  TaskFlowGraphEdge,
  TaskFlowTreeBranch,
  TaskFlowStepType,
} from './types.js';
import { createContainerStack, type TaskFlowContainerStack } from './types.js';
import { projectToGraphDocument, projectToTreeDocument } from './projection.js';
import { syncFromGraphDocument, syncFromTreeDocument } from './sync.js';
import { lowerToTaskFlowDSL } from './lowering.js';
import { validateAuthoringModel } from './validation.js';

interface DesignerProjection {
  doc: {
    id: string;
    kind: string;
    name: string;
    version: string;
    nodes: Array<{ id: string; type: string; position: { x: number; y: number } }>;
    edges: Array<{ id: string; source: string; target: string; sourcePort?: string; taskflowEdgeKind?: string }>;
    viewport: { x: number; y: number; zoom: number };
    nodeCount: number;
    edgeCount: number;
  };
}

function getDesignerDoc(ctx: ActionContext): DesignerProjection['doc'] | null {
  try {
    const designer = (ctx.scope as any)?.get?.('$designer') as DesignerProjection | undefined;
    if (designer?.doc) return designer.doc;
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
      data: {},
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

function flushDesignerProjectionIntoModel(
  ctx: ActionContext,
  model: TaskFlowAuthoringModel | null,
  containerId: string | null,
): TaskFlowAuthoringModel | null {
  const designerDoc = getDesignerDoc(ctx);
  if (!designerDoc || !model || !containerId) {
    return model;
  }

  return syncFromGraphDocument(model, containerId, buildGraphDocFromProjection(designerDoc));
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
            const model = (payload?.model ?? authoringModel) as TaskFlowAuthoringModel;
            const containerId = (payload?.containerId ?? activeContainerId) as string;
            if (!model || !containerId) {
              return { ok: false, error: new Error('project-to-graph requires model and containerId') };
            }
            const doc = projectToGraphDocument({ authoringModel: model, containerId });
            return { ok: true, data: doc };
          }
          case 'project-to-tree': {
            const model = (payload?.model ?? authoringModel) as TaskFlowAuthoringModel;
            const containerId = (payload?.containerId ?? activeContainerId) as string;
            if (!model || !containerId) {
              return { ok: false, error: new Error('project-to-tree requires model and containerId') };
            }
            const doc = projectToTreeDocument({ authoringModel: model, containerId });
            return { ok: true, data: doc };
          }
          case 'sync-from-graph': {
            const model = (payload?.model ?? authoringModel) as TaskFlowAuthoringModel;
            const containerId = (payload?.containerId ?? activeContainerId) as string;
            const graphDoc = (payload?.graphDoc ?? payload?.document) as GraphDocument | undefined;
            if (!model || !containerId || !graphDoc) {
              return { ok: false, error: new Error('sync-from-graph requires model, containerId, and graphDoc') };
            }
            const result = syncFromGraphDocument(model, containerId, graphDoc);
            authoringModel = result;
            return { ok: true, data: result };
          }
          case 'sync-from-tree': {
            const model = (payload?.model ?? authoringModel) as TaskFlowAuthoringModel;
            const containerId = (payload?.containerId ?? activeContainerId) as string;
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

            const container = findContainerById(currentAuthoringModel.root, containerId);
            if (!container) {
              return { ok: false, error: new Error(`Container not found: ${containerId}`) };
            }

            if (activeContainerId) {
              containerStack.push(
                activeContainerId,
                findContainerById(currentAuthoringModel.root, activeContainerId)!,
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
            const dsl = typeof rawJson === 'string' ? tryParseJson(rawJson) : rawJson;
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

            return {
              ok: true,
              data: {
                model: parsed.model,
                containerId: activeContainerId,
                profile: parsed.model.root.profile,
                projectedDoc,
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

function findContainerById(container: TaskFlowContainer, targetId: string): TaskFlowContainer | undefined {
  if (container.id === targetId) return container;
  if (container.profile === 'workflow') {
    for (const node of container.nodes) {
      if (node.step.body) {
        const found = findContainerById(node.step.body, targetId);
        if (found) return found;
      }
    }
  } else {
    for (const step of container.steps) {
      if (step.body) {
        const found = findContainerById(step.body, targetId);
        if (found) return found;
      }
    }
  }
  return undefined;
}

function getBreadcrumb(stack: TaskFlowContainerStack): string[] {
  return stack.stack.map((e) => e.container.name ?? e.containerId);
}

function tryParseJson(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

interface NopTaskDSLInput {
  kind?: string;
  schemaVersion?: string;
  task?: {
    version?: number;
    graphMode?: boolean;
    restartable?: boolean;
    defaultSaveState?: boolean;
    useParentBeanContainer?: boolean;
    recordMetrics?: boolean;
    name?: string;
  };
  steps?: NopDSLStep[];
  enterSteps?: string[];
  exitSteps?: string[];
}

interface NopDSLStep {
  type: string;
  id?: string;
  name: string;
  displayName?: string;
  description?: string;
  disabled?: boolean;
  allowFailure?: boolean;
  sync?: boolean;
  internal?: boolean;
  timeout?: number;
  executor?: string;
  when?: string;
  tagSet?: string[];
  inputs?: unknown[];
  outputs?: unknown[];
  retry?: unknown;
  throttle?: unknown;
  rateLimit?: unknown;
  source?: string;
  lang?: string;
  bean?: string;
  method?: string;
  delayMillisExpr?: string;
  condition?: string;
  decider?: string;
  joinType?: string;
  autoCancelUnfinished?: boolean;
  aggregator?: string;
  next?: string;
  nextOnError?: string;
  waitSteps?: string[];
  waitErrorSteps?: string[];
  steps?: NopDSLStep[];
  then?: NopDSLStep[];
  else?: NopDSLStep[];
  cases?: { match?: string; to?: string; steps?: NopDSLStep[] }[];
  otherwise?: { match?: string; to?: string; steps?: NopDSLStep[] };
  parallel?: NopDSLStep[][];
}

function parseNopTaskDSL(dsl: NopTaskDSLInput, fallbackName?: string): { model: TaskFlowAuthoringModel } | null {
  if (!dsl.steps || !Array.isArray(dsl.steps)) return null;

  const stepMap = new Map<string, NopDSLStep>();
  for (const s of dsl.steps) {
    if (s.name) stepMap.set(s.name, s);
  }

  const graphMode = dsl.task?.graphMode ?? true;
  const containerId = 'imported-root';

  if (graphMode) {
    const nodes: TaskFlowGraphNode[] = dsl.steps.map((s, i) => {
      const step = dslStepToTaskFlowStep(s);
      return {
        id: step.id,
        position: { x: 50 + i * 200, y: 200 + (i % 3) * 80 },
        step,
      };
    });

    const nameSet = new Set(dsl.steps.map((s) => s.name));
    const edges: TaskFlowGraphEdge[] = [];

    for (const s of dsl.steps) {
      const sourceNode = nodes.find((n) => n.step.common.name === s.name);
      if (!sourceNode) continue;

      if (s.next && nameSet.has(s.next)) {
        edges.push({ id: `e-import-${s.name}-next`, source: sourceNode.id, target: nodes.find((n) => n.step.common.name === s.next)!.id, sourcePort: 'next', edgeType: 'taskflow-next' });
      }
      if (s.nextOnError && nameSet.has(s.nextOnError)) {
        edges.push({ id: `e-import-${s.name}-error`, source: sourceNode.id, target: nodes.find((n) => n.step.common.name === s.nextOnError)!.id, sourcePort: 'error', edgeType: 'taskflow-error' });
      }
      if (s.waitSteps) {
        for (const ws of s.waitSteps) {
          if (nameSet.has(ws)) {
            edges.push({ id: `e-import-${s.name}-wait-${ws}`, source: sourceNode.id, target: nodes.find((n) => n.step.common.name === ws)!.id, sourcePort: 'wait', edgeType: 'taskflow-wait' });
          }
        }
      }
      if (s.waitErrorSteps) {
        for (const wes of s.waitErrorSteps) {
          if (nameSet.has(wes)) {
            edges.push({ id: `e-import-${s.name}-wait-error-${wes}`, source: sourceNode.id, target: nodes.find((n) => n.step.common.name === wes)!.id, sourcePort: 'wait-error', edgeType: 'taskflow-wait-error' });
          }
        }
      }
    }

    const root: TaskFlowGraphContainer = {
      id: containerId,
      profile: 'workflow',
      name: fallbackName ?? dsl.task?.name ?? 'Imported TaskFlow',
      enterStepRefs: dsl.enterSteps ?? nodes.length > 0 ? [nodes[0].id] : [],
      exitStepRefs: dsl.exitSteps ?? nodes.length > 0 ? [nodes[nodes.length - 1].id] : [],
      nodes,
      edges,
    };

    const model: TaskFlowAuthoringModel = {
      kind: 'nop-taskflow',
      schemaVersion: '1.0',
      task: {
        version: dsl.task?.version ?? 1,
        graphMode: true,
        restartable: dsl.task?.restartable ?? false,
        defaultSaveState: dsl.task?.defaultSaveState ?? true,
        useParentBeanContainer: dsl.task?.useParentBeanContainer ?? false,
        recordMetrics: dsl.task?.recordMetrics ?? false,
        common: { name: dsl.task?.name },
      },
      root,
    };

    return { model };
  } else {
    const steps = dsl.steps.map((s) => dslStepToTaskFlowStep(s, true));
    const root: TaskFlowTreeContainer = {
      id: containerId,
      profile: 'dingflow',
      name: fallbackName ?? dsl.task?.name ?? 'Imported TaskFlow',
      steps,
      syntheticRootId: '__synthetic_root__',
    };

    const model: TaskFlowAuthoringModel = {
      kind: 'nop-taskflow',
      schemaVersion: '1.0',
      task: {
        version: dsl.task?.version ?? 1,
        graphMode: false,
        restartable: dsl.task?.restartable ?? false,
        defaultSaveState: dsl.task?.defaultSaveState ?? true,
        useParentBeanContainer: dsl.task?.useParentBeanContainer ?? false,
        recordMetrics: dsl.task?.recordMetrics ?? false,
        common: { name: dsl.task?.name },
      },
      root,
    };

    return { model };
  }
}

function dslStepToTaskFlowStep(dsl: NopDSLStep, parseTree = false): TaskFlowStep {
  const stepType = isValidStepType(dsl.type) ? dsl.type : 'script';
  const id = dsl.id ?? `step-${dsl.name}-${Date.now()}`;

  const step: TaskFlowStep = {
    id,
    type: stepType,
    common: {
      name: dsl.name ?? 'unnamed',
    },
    props: buildProps(stepType, dsl),
  };

  if (dsl.displayName) step.common.displayName = dsl.displayName;
  if (dsl.description) step.common.description = dsl.description;
  if (dsl.disabled) step.common.disabled = true;
  if (dsl.allowFailure) step.common.allowFailure = true;
  if (dsl.sync) step.common.sync = true;
  if (dsl.internal) step.common.internal = true;
  if (dsl.timeout !== undefined) step.common.timeout = dsl.timeout;
  if (dsl.executor) step.common.executor = dsl.executor;
  if (dsl.when) step.common.when = dsl.when;
  if (dsl.tagSet) step.common.tagSet = dsl.tagSet;
  if (dsl.inputs) step.common.inputs = dsl.inputs as never[];
  if (dsl.outputs) step.common.outputs = dsl.outputs as never[];
  if (dsl.retry) step.common.retry = dsl.retry as never;
  if (dsl.throttle) step.common.throttle = dsl.throttle as never;
  if (dsl.rateLimit) step.common.rateLimit = dsl.rateLimit as never;

  if (parseTree) {
    if (dsl.then || dsl.else || dsl.cases || dsl.otherwise || dsl.parallel) {
      const branches: TaskFlowTreeBranch[] = [];
      if (dsl.then) {
        branches.push({ id: `${id}-then`, data: { branchType: 'then', label: 'Then' }, steps: dsl.then.map((s) => dslStepToTaskFlowStep(s, true)) });
      }
      if (dsl.else) {
        branches.push({ id: `${id}-else`, data: { branchType: 'else', label: 'Else' }, steps: dsl.else.map((s) => dslStepToTaskFlowStep(s, true)) });
      }
      if (dsl.cases) {
        for (let i = 0; i < dsl.cases.length; i++) {
          const c = dsl.cases[i];
          branches.push({ id: `${id}-case-${i}`, data: { branchType: 'case', label: c.match ?? `Case ${i}`, match: c.match, to: c.to }, steps: (c.steps ?? []).map((s) => dslStepToTaskFlowStep(s, true)) });
        }
      }
      if (dsl.otherwise) {
        branches.push({ id: `${id}-otherwise`, data: { branchType: 'otherwise', label: 'Otherwise', match: dsl.otherwise.match, to: dsl.otherwise.to }, steps: (dsl.otherwise.steps ?? []).map((s) => dslStepToTaskFlowStep(s, true)) });
      }
      if (dsl.parallel) {
        for (let i = 0; i < dsl.parallel.length; i++) {
          const p = dsl.parallel[i];
          branches.push({ id: `${id}-parallel-${i}`, data: { branchType: 'parallel-body', label: `Branch ${i + 1}` }, steps: (p ?? []).map((s) => dslStepToTaskFlowStep(s, true)) });
        }
      }
      step.branches = branches;
    }

    if (stepType === 'sequential' || stepType === 'graph' || stepType === 'parallel') {
      if (dsl.steps) {
        step.body = {
          id: `${id}-body`,
          profile: 'dingflow',
          name: `${dsl.name}-body`,
          steps: dsl.steps.map((s) => dslStepToTaskFlowStep(s, true)),
          syntheticRootId: '__synthetic__',
        };
      }
    }
  }

  return step;
}

function buildProps(stepType: TaskFlowStepType, dsl: NopDSLStep): TaskFlowStep['props'] {
  switch (stepType) {
    case 'script':
      return { type: 'script', lang: dsl.lang ?? 'js', source: dsl.source };
    case 'invoke':
      return { type: 'invoke', bean: dsl.bean ?? '', method: dsl.method ?? '' };
    case 'delay':
      return { type: 'delay', delayMillisExpr: dsl.delayMillisExpr ?? '1000' };
    case 'if':
      return { type: 'if', condition: dsl.condition };
    case 'choose':
      return { type: 'choose', decider: dsl.decider };
    case 'parallel':
      return { type: 'parallel', joinType: dsl.joinType, autoCancelUnfinished: dsl.autoCancelUnfinished, aggregator: dsl.aggregator };
    case 'sequential':
      return { type: 'sequential' };
    case 'graph':
      return { type: 'graph' };
    default:
      return { type: stepType } as TaskFlowStep['props'];
  }
}

function isValidStepType(type: string): type is TaskFlowStepType {
  return ['script', 'invoke', 'sequential', 'graph', 'parallel', 'if', 'choose', 'delay'].includes(type);
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
