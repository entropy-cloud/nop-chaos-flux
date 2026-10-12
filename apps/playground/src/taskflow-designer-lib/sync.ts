import type { GraphDocument, GraphEdge, TreeDocument, TreeNodeBranch } from '@nop-chaos/flow-designer-core';
import type {
  TaskFlowAuthoringModel,
  TaskFlowGraphContainer,
  TaskFlowTreeContainer,
  TaskFlowGraphNode,
  TaskFlowGraphEdge,
  TaskFlowStep,
  TaskFlowEdgeKind,
  SourcePort,
  TaskFlowStepType,
  TaskFlowTreeBranchType,
} from './types.js';
import {
  SOURCE_PORT_TO_EDGE_KIND,
  EDGE_KIND_TO_SOURCE_PORT,
  TASKFLOW_TREE_BRANCH_TYPES,
  findContainerById,
  isTaskFlowStepType,
} from './types.js';

type TaskFlowStepSnapshot = Pick<TaskFlowStep, 'common' | 'props'> & {
  type?: TaskFlowStepType;
};

function isTaskFlowTreeBranchType(value: unknown): value is TaskFlowTreeBranchType {
  return typeof value === 'string' && (TASKFLOW_TREE_BRANCH_TYPES as readonly string[]).includes(value);
}

function createDefaultProps(type: TaskFlowStepType): TaskFlowStep['props'] {
  switch (type) {
    case 'script':
      return { type: 'script', lang: 'js' };
    case 'invoke':
      return { type: 'invoke', bean: '', method: '' };
    case 'parallel':
      return { type: 'parallel' };
    case 'if':
      return { type: 'if' };
    case 'choose':
      return { type: 'choose' };
    case 'delay':
      return { type: 'delay', delayMillisExpr: '1000' };
    case 'end':
      return { type: 'end' };
    case 'sequential':
      return { type: 'sequential' };
    case 'graph':
      return { type: 'graph' };
  }
}

function createDefaultStep(type: TaskFlowStepType, id: string): TaskFlowStep {
  return {
    id,
    type,
    common: { name: id },
    props: createDefaultProps(type),
  };
}

function resolveGraphNodeStepType(nodeType: string, snapshot?: Partial<TaskFlowStepSnapshot>): TaskFlowStepType {
  if (isTaskFlowStepType(snapshot?.props?.type)) {
    return snapshot.props.type;
  }

  if (isTaskFlowStepType(snapshot?.type)) {
    return snapshot.type;
  }

  const normalized = nodeType.startsWith('tf-') ? nodeType.slice(3) : nodeType;
  return isTaskFlowStepType(normalized) ? normalized : 'script';
}

function sanitizeStepSnapshot(step: unknown, fallbackType: TaskFlowStepType): TaskFlowStepSnapshot | undefined {
  if (!step || typeof step !== 'object') {
    return undefined;
  }

  const candidate = step as Partial<TaskFlowStep>;
  const sanitized: TaskFlowStepSnapshot = {
    common:
      candidate.common && typeof candidate.common === 'object'
        ? { ...candidate.common, name: candidate.common.name ?? '' }
        : { name: '' },
    props: createDefaultProps(fallbackType),
  };

  if (candidate.props && typeof candidate.props === 'object') {
    const propsType = isTaskFlowStepType(candidate.props.type) ? candidate.props.type : fallbackType;
    sanitized.props = { ...createDefaultProps(propsType), ...candidate.props, type: propsType } as TaskFlowStep['props'];
  }

  sanitized.type = isTaskFlowStepType(candidate.type) ? candidate.type : undefined;

  return sanitized;
}

function buildStepFromGraphNode(
  nodeId: string,
  nodeType: string,
  existing?: TaskFlowStep,
  rawStep?: unknown,
): TaskFlowStep {
  const snapshot = sanitizeStepSnapshot(rawStep, existing?.type ?? 'script');
  const stepType = resolveGraphNodeStepType(nodeType, snapshot);
  const base = existing && existing.type === stepType ? existing : createDefaultStep(stepType, nodeId);

  return {
    ...base,
    id: nodeId,
    type: stepType,
    common: {
      ...base.common,
      ...(snapshot?.common ?? {}),
      name: snapshot?.common.name || base.common.name || nodeId,
    },
    props: {
      ...createDefaultProps(stepType),
      ...(snapshot?.props?.type === stepType ? snapshot.props : {}),
      type: stepType,
    } as TaskFlowStep['props'],
  };
}

function createBranchData(data: unknown): NonNullable<TaskFlowStep['branches']>[number]['data'] {
  const source = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  return {
    branchType: isTaskFlowTreeBranchType(source.branchType) ? source.branchType : 'then',
    label: typeof source.label === 'string' ? source.label : undefined,
    match: typeof source.match === 'string' ? source.match : undefined,
    to: typeof source.to === 'string' ? source.to : undefined,
    priority: typeof source.priority === 'number' ? source.priority : undefined,
  };
}

function cloneTreeStep(step: TaskFlowStep): TaskFlowStep {
  return {
    ...step,
    common: { ...step.common },
    props: { ...step.props },
    body: step.body,
    branches: step.branches?.map((branch) => ({
      id: branch.id,
      data: { ...branch.data },
      steps: branch.steps.map(cloneTreeStep),
    })),
  };
}

function resolveEdgeKind(
  graphEdge: GraphEdge,
): TaskFlowEdgeKind {
  const fromData = graphEdge.data?.taskflowEdgeKind as TaskFlowEdgeKind | undefined;
  if (fromData && ['taskflow-next', 'taskflow-error', 'taskflow-wait', 'taskflow-wait-error'].includes(fromData)) {
    return fromData;
  }

  const sp = graphEdge.sourcePort as SourcePort | undefined;
  if (sp && SOURCE_PORT_TO_EDGE_KIND[sp]) {
    return SOURCE_PORT_TO_EDGE_KIND[sp];
  }

  return 'taskflow-next';
}

function resolveSourcePort(graphEdge: GraphEdge): SourcePort | undefined {
  const fromData = graphEdge.data?.taskflowEdgeKind as TaskFlowEdgeKind | undefined;
  if (fromData && EDGE_KIND_TO_SOURCE_PORT[fromData]) {
    return EDGE_KIND_TO_SOURCE_PORT[fromData];
  }
  return graphEdge.sourcePort as SourcePort | undefined;
}

export function syncFromGraphDocument(
  authoringModel: TaskFlowAuthoringModel,
  containerId: string,
  graphDoc: GraphDocument,
): TaskFlowAuthoringModel {
  const container = findContainerById(authoringModel, containerId);
  if (!container || container.profile !== 'workflow') {
    throw new Error(`Container not found or not graph mode: ${containerId}`);
  }

  const graphContainer = container as TaskFlowGraphContainer;

  const existingNodeMap = new Map(graphContainer.nodes.map((n) => [n.id, n]));
  const updatedNodes: TaskFlowGraphNode[] = graphDoc.nodes.map((gn) => {
    const existing = existingNodeMap.get(gn.id);
    const step = buildStepFromGraphNode(gn.id, gn.type, existing?.step, gn.data?.step);

    return {
      id: gn.id,
      position: { x: gn.position.x, y: gn.position.y },
      step,
    };
  });

  const updatedEdges: TaskFlowGraphEdge[] = graphDoc.edges.map((ge) => ({
    id: ge.id,
    source: ge.source,
    target: ge.target,
    sourcePort: resolveSourcePort(ge),
    targetPort: (ge.targetPort as 'in') || 'in',
    edgeType: resolveEdgeKind(ge),
    data: ge.data?.label !== undefined ? { label: String(ge.data.label) } : undefined,
  }));

  graphContainer.nodes = updatedNodes;
  graphContainer.edges = updatedEdges;
  graphContainer.viewport = graphDoc.viewport ?? graphContainer.viewport;

  return authoringModel;
}

function collectStepsFromBranch(branch: TreeNodeBranch): TaskFlowStep[] {
  const steps: TaskFlowStep[] = [];
  let current = branch.child;
  while (current) {
    const step = current.data?.step as TaskFlowStep | undefined;
    if (step) {
      const normalizedStep = cloneTreeStep(step);
      if (current.branches && current.branches.length > 0) {
        const branches = current.branches.map((b) => ({
          id: b.id,
          data: createBranchData(b.data),
          steps: collectStepsFromBranch(b),
        }));
        normalizedStep.branches = branches;
      }
      steps.push(normalizedStep);
    }
    current = current.child;
  }
  return steps;
}

export function syncFromTreeDocument(
  authoringModel: TaskFlowAuthoringModel,
  containerId: string,
  treeDoc: TreeDocument,
): TaskFlowAuthoringModel {
  const container = findContainerById(authoringModel, containerId);
  if (!container || container.profile !== 'dingflow') {
    throw new Error(`Container not found or not tree mode: ${containerId}`);
  }

  const treeContainer = container as TaskFlowTreeContainer;
  treeContainer.steps = collectStepsFromBranch(treeDoc.root);

  return authoringModel;
}

// plan 556: branch-capable step types whose projection out-edges are read as
// branch fan-outs in the tree-projection sync below.
const TREE_BRANCH_STEP_TYPES: ReadonlySet<TaskFlowStepType> = new Set<TaskFlowStepType>([
  'if',
  'choose',
  'parallel',
]);

function treeBranchTypeFor(stepType: TaskFlowStepType, index: number, total: number): TaskFlowTreeBranchType {
  if (stepType === 'if') {
    return index === 0 ? 'then' : index === 1 ? 'else' : 'case';
  }
  if (stepType === 'choose') {
    return index === total - 1 ? 'otherwise' : 'case';
  }
  if (stepType === 'parallel') {
    return 'parallel-body';
  }
  return 'case';
}

/**
 * plan 556: sync a dingflow tab's host projection doc (graph-shaped summary:
 * nodes id/type/position + edges in tree-emission order — NO step payloads and
 * NO branch/continuation discriminator, the internal `__fdTree` payload is
 * sanitized away by the host projection) into a dingflow-profile container.
 *
 * V1 contract: chain walk from the synthetic entry; a branch-capable step's
 * out-edges ALL become branches in edge order (`if` → then/else[/case…]);
 * fan-outs terminate the chain (continuation-after-branch is not
 * reconstructable from the sanitized projection). Step payloads are preserved
 * from the existing model by step id, else defaulted from the node type.
 */
export function syncFromTreeProjectionDoc(
  authoringModel: TaskFlowAuthoringModel,
  containerId: string,
  doc: {
    nodes: ReadonlyArray<{ id: string; type: string }>;
    edges: ReadonlyArray<{ source: string; target: string }>;
  },
): TaskFlowAuthoringModel {
  const container = findContainerById(authoringModel, containerId);
  if (!container || container.profile !== 'dingflow') {
    throw new Error(`Container not found or not tree mode: ${containerId}`);
  }
  const treeContainer = container as TaskFlowTreeContainer;

  const existingSteps = new Map<string, TaskFlowStep>();
  const indexExisting = (steps: TaskFlowStep[]) => {
    for (const step of steps) {
      existingSteps.set(step.id, step);
      if (step.branches) {
        for (const branch of step.branches) indexExisting(branch.steps);
      }
    }
  };
  indexExisting(treeContainer.steps);

  const nodeMap = new Map(doc.nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, string[]>();
  const incoming = new Set<string>();
  for (const edge of doc.edges) {
    const targets = outgoing.get(edge.source) ?? [];
    targets.push(edge.target);
    outgoing.set(edge.source, targets);
    incoming.add(edge.target);
  }

  const buildStep = (nodeId: string, visited: Set<string>): TaskFlowStep | null => {
    const node = nodeMap.get(nodeId);
    if (!node) return null;
    const existing = existingSteps.get(nodeId);
    const stepType = resolveGraphNodeStepType(node.type, existing);
    const step = existing ? cloneTreeStep(existing) : createDefaultStep(stepType, nodeId);
    step.id = nodeId;

    if (TREE_BRANCH_STEP_TYPES.has(stepType)) {
      const targets = outgoing.get(nodeId) ?? [];
      step.branches = targets.map((target, index) => ({
        id: `${nodeId}-b${index + 1}`,
        data: createBranchData({ branchType: treeBranchTypeFor(stepType, index, targets.length) }),
        steps: collectChain(target, visited),
      }));
    }
    return step;
  };

  const collectChain = (startId: string, visited: Set<string>): TaskFlowStep[] => {
    const steps: TaskFlowStep[] = [];
    let cursor: string | undefined = startId;
    while (cursor && !visited.has(cursor)) {
      visited.add(cursor);
      const node = nodeMap.get(cursor);
      if (!node) break;
      const stepType = resolveGraphNodeStepType(node.type, existingSteps.get(cursor));
      if (TREE_BRANCH_STEP_TYPES.has(stepType)) {
        const branchStep = buildStep(cursor, visited);
        if (branchStep) steps.push(branchStep);
        // v1: fan-out terminates the chain — out-edges were consumed as branches.
        break;
      }
      const step = buildStep(cursor, visited);
      if (step) steps.push(step);
      cursor = outgoing.get(cursor)?.[0];
    }
    return steps;
  };

  const entryNode = doc.nodes.find((node) => node.type === 'tf-entry');
  const fallbackStart = entryNode
    ? undefined
    : (doc.nodes.find((node) => !incoming.has(node.id))?.id ?? doc.nodes[0]?.id);
  const chainStart = entryNode ? outgoing.get(entryNode.id)?.[0] : fallbackStart;
  const visited = new Set<string>(entryNode ? [entryNode.id] : []);
  treeContainer.steps = chainStart ? collectChain(chainStart, visited) : [];

  return authoringModel;
}
