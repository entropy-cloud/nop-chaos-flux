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
} from './types.js';
import { SOURCE_PORT_TO_EDGE_KIND, EDGE_KIND_TO_SOURCE_PORT } from './types.js';

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
    const step = existing?.step ?? {
      id: gn.id,
      type: gn.type as any,
      common: { name: gn.id },
      props: { type: gn.type as any } as any,
    };

    if (existing) {
      step.common = (gn.data?.step as any)?.common ?? step.common;
      step.props = (gn.data?.step as any)?.props ?? step.props;
      step.type = gn.type as any;
    }

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
      if (current.branches && current.branches.length > 0) {
        const branches = current.branches.map((branch) => ({
          id: branch.id,
          data: {
            branchType: (branch.data?.branchType as any) ?? 'then',
            label: branch.data?.label as string | undefined,
            match: branch.data?.match as string | undefined,
            to: branch.data?.to as string | undefined,
          },
          steps: collectStepsFromBranch(branch),
        }));
        step.branches = branches;
      }
      steps.push(step);
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
      if (current.branches && current.branches.length > 0) {
        const branches = current.branches.map((b) => ({
          id: b.id,
          data: {
            branchType: (b.data?.branchType as any) ?? 'then',
            label: b.data?.label as string | undefined,
            match: b.data?.match as string | undefined,
            to: b.data?.to as string | undefined,
          },
          steps: collectStepsFromBranch(b),
        }));
        step.branches = branches;
      }
      steps.push(step);
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
