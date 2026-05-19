import type {
  GraphDocument,
  GraphNode,
  GraphEdge,
  TreeDocument,
  TreeNode,
  TreeNodeBranch,
} from '@nop-chaos/flow-designer-core';
import type {
  TaskFlowAuthoringModel,
  TaskFlowContainer,
  TaskFlowGraphContainer,
  TaskFlowTreeContainer,
  TaskFlowStep,
} from './types.js';

export interface ProjectToGraphOptions {
  containerId: string;
  authoringModel: TaskFlowAuthoringModel;
}

export interface ProjectToTreeOptions {
  containerId: string;
  authoringModel: TaskFlowAuthoringModel;
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

export function projectToGraphDocument(options: ProjectToGraphOptions): GraphDocument | null {
  const { authoringModel, containerId } = options;
  const container = findContainer(authoringModel, containerId);
  if (!container || container.profile !== 'workflow') return null;
  const graphContainer = container as TaskFlowGraphContainer;

  const nodes: GraphNode[] = graphContainer.nodes.map((gn) => ({
    id: gn.id,
    type: gn.step.type,
    position: { x: gn.position.x, y: gn.position.y },
    data: { step: gn.step },
  }));

  const edges: GraphEdge[] = graphContainer.edges.map((ge) => ({
    id: ge.id,
    type: 'tf-next',
    source: ge.source,
    target: ge.target,
    sourcePort: ge.sourcePort,
    targetPort: ge.targetPort,
    data: {
      taskflowEdgeKind: ge.edgeType,
      label: ge.data?.label,
    },
  }));

  return {
    id: container.id,
    kind: 'nop-taskflow-workflow',
    name: container.name ?? 'TaskFlow',
    version: '1.0',
    viewport: container.viewport ?? { x: 0, y: 0, zoom: 1 },
    nodes,
    edges,
  };
}

export function projectToTreeDocument(options: ProjectToTreeOptions): TreeDocument | null {
  const { authoringModel, containerId } = options;
  const container = findContainer(authoringModel, containerId);
  if (!container || container.profile !== 'dingflow') return null;
  const treeContainer = container as TaskFlowTreeContainer;

  const root: TreeNode = buildTreeFromSteps(treeContainer.steps);

  return {
    id: container.id,
    kind: 'nop-taskflow-dingflow',
    name: container.name ?? 'TaskFlow',
    version: '1.0',
    meta: { syntheticRootId: treeContainer.syntheticRootId },
    root,
  };
}

function buildTreeFromSteps(steps: TaskFlowStep[]): TreeNode {
  const syntheticRoot: TreeNode = {
    id: '__synthetic_root__',
    type: 'tf-entry',
    data: {},
  };

  if (steps.length === 0) return syntheticRoot;

  let current = syntheticRoot;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const node = stepToTreeNode(step);
    current.child = node;

    if (node.branches && node.branches.length > 0) {
      break;
    }

    current = node;
  }

  return syntheticRoot;
}

function stepToTreeNode(step: TaskFlowStep): TreeNode {
  const node: TreeNode = {
    id: step.id,
    type: step.type,
    data: { step },
  };

  if (step.branches && step.branches.length > 0) {
    node.branches = step.branches.map((branch) => {
      const tb: TreeNodeBranch = {
        id: branch.id,
        data: { branchType: branch.data.branchType, label: branch.data.label, match: branch.data.match, to: branch.data.to },
      };

      if (branch.steps.length > 0) {
        let current: TreeNode = { id: branch.steps[0].id, type: branch.steps[0].type, data: { step: branch.steps[0] } };
        tb.child = current;
        for (let i = 1; i < branch.steps.length; i++) {
          const next: TreeNode = { id: branch.steps[i].id, type: branch.steps[i].type, data: { step: branch.steps[i] } };
          current.child = next;
          current = next;
        }
      }

      return tb;
    });
  }

  return node;
}

export function extractStepsFromTree(root: TreeNode): TaskFlowStep[] {
  const steps: TaskFlowStep[] = [];
  let current = root.child;
  while (current) {
    const step = current.data?.step as TaskFlowStep | undefined;
    if (step) {
      steps.push(step);
    }
    current = current.child;
  }
  return steps;
}

export function extractStepsFromBranch(branch: TreeNodeBranch): TaskFlowStep[] {
  const steps: TaskFlowStep[] = [];
  let current = branch.child;
  while (current) {
    const step = current.data?.step as TaskFlowStep | undefined;
    if (step) {
      steps.push(step);
    }
    current = current.child;
  }
  return steps;
}
