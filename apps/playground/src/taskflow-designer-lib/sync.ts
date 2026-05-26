import type { GraphDocument, GraphEdge, TreeDocument, TreeNode, TreeNodeBranch } from '@nop-chaos/flow-designer-core';
import type {
  TaskFlowAuthoringModel,
  TaskFlowContainer,
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
  TASKFLOW_STEP_TYPES,
  TASKFLOW_TREE_BRANCH_TYPES,
} from './types.js';

type TaskFlowStepSnapshot = Pick<TaskFlowStep, 'common' | 'props'> & {
  type?: TaskFlowStepType;
};

function isTaskFlowStepType(value: unknown): value is TaskFlowStepType {
  return typeof value === 'string' && (TASKFLOW_STEP_TYPES as readonly string[]).includes(value);
}

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

function findContainer(model: TaskFlowAuthoringModel, containerId: string): TaskFlowContainer | undefined {
  if (model.root.id === containerId) return model.root;
  return findContainerRecursive(model.root, containerId);
}

function findContainerRecursive(container: TaskFlowContainer, targetId: string): TaskFlowContainer | undefined {
  if (container.profile === 'workflow') {
    for (const node of container.nodes) {
      if (node.step.body && findContainerRecursive(node.step.body, targetId)) {
        return findContainerRecursive(node.step.body, targetId);
      }
    }
  } else {
    for (const step of container.steps) {
      if (step.body) {
        if (step.body.id === targetId) return step.body;
        const found = findContainerRecursive(step.body, targetId);
        if (found) return found;
      }
    }
  }
  return undefined;
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
  const container = findContainer(authoringModel, containerId);
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

function collectStepsFromTree(root: TreeNode): TaskFlowStep[] {
  const steps: TaskFlowStep[] = [];
  let current = root.child;
  while (current) {
    const step = current.data?.step as TaskFlowStep | undefined;
    if (step) {
      const normalizedStep = cloneTreeStep(step);
      if (current.branches && current.branches.length > 0) {
        const branches = current.branches.map((branch) => ({
          id: branch.id,
          data: createBranchData(branch.data),
          steps: collectStepsFromBranch(branch),
        }));
        normalizedStep.branches = branches;
      }
      steps.push(normalizedStep);
    }
    current = current.child;
  }
  return steps;
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
  const container = findContainer(authoringModel, containerId);
  if (!container || container.profile !== 'dingflow') {
    throw new Error(`Container not found or not tree mode: ${containerId}`);
  }

  const treeContainer = container as TaskFlowTreeContainer;
  treeContainer.steps = collectStepsFromTree(treeDoc.root);

  return authoringModel;
}
