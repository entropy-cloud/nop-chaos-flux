export type TaskFlowStepType =
  | 'script'
  | 'invoke'
  | 'sequential'
  | 'graph'
  | 'parallel'
  | 'if'
  | 'choose'
  | 'delay';

export type TaskFlowEdgeKind =
  | 'taskflow-next'
  | 'taskflow-error'
  | 'taskflow-wait'
  | 'taskflow-wait-error';

export type SourcePort = 'next' | 'error' | 'wait' | 'wait-error';

export const SOURCE_PORT_TO_EDGE_KIND: Record<SourcePort, TaskFlowEdgeKind> = {
  'next': 'taskflow-next',
  'error': 'taskflow-error',
  'wait': 'taskflow-wait',
  'wait-error': 'taskflow-wait-error',
};

export const EDGE_KIND_TO_SOURCE_PORT: Record<TaskFlowEdgeKind, SourcePort> = {
  'taskflow-next': 'next',
  'taskflow-error': 'error',
  'taskflow-wait': 'wait',
  'taskflow-wait-error': 'wait-error',
};

export interface TaskFlowAuthoringModel {
  kind: 'nop-taskflow';
  schemaVersion: '1.0';
  task: TaskFlowTaskMeta;
  root: TaskFlowContainer;
}

export interface TaskFlowTaskMeta {
  version: number;
  graphMode: boolean;
  restartable: boolean;
  defaultSaveState: boolean;
  defaultUseParentScope?: boolean;
  useParentBeanContainer: boolean;
  recordMetrics: boolean;
  imports?: TaskImportConfig[];
  common?: TaskFlowRootCommonConfig;
  raw?: Record<string, unknown>;
}

export interface TaskFlowRootCommonConfig {
  name?: string;
}

export interface TaskImportConfig {
  as: string;
  class: string;
}

export type TaskFlowContainer = TaskFlowGraphContainer | TaskFlowTreeContainer;

export interface TaskFlowContainerBase {
  id: string;
  name?: string;
  ownerStepId?: string;
  viewport?: { x: number; y: number; zoom: number };
}

export interface TaskFlowGraphContainer extends TaskFlowContainerBase {
  profile: 'workflow';
  enterStepRefs: string[];
  exitStepRefs: string[];
  nodes: TaskFlowGraphNode[];
  edges: TaskFlowGraphEdge[];
}

export interface TaskFlowTreeContainer extends TaskFlowContainerBase {
  profile: 'dingflow';
  steps: TaskFlowStep[];
  syntheticRootId: string;
}

export interface TaskFlowGraphNode {
  id: string;
  position: { x: number; y: number };
  step: TaskFlowStep;
}

export interface TaskFlowGraphEdge {
  id: string;
  source: string;
  target: string;
  sourcePort?: SourcePort;
  targetPort?: 'in';
  edgeType: TaskFlowEdgeKind;
  data?: { label?: string };
}

export interface TaskFlowStep {
  id: string;
  type: TaskFlowStepType;
  common: TaskFlowCommonStepConfig;
  props: TaskFlowStepProps;
  body?: TaskFlowContainer;
  branches?: TaskFlowTreeBranch[];
  raw?: Record<string, unknown>;
}

export interface TaskFlowCommonStepConfig {
  name: string;
  displayName?: string;
  description?: string;
  disabled?: boolean;
  allowFailure?: boolean;
  sync?: boolean;
  internal?: boolean;
  runOnContext?: boolean;
  saveState?: boolean;
  useParentScope?: boolean;
  executor?: string;
  timeout?: number;
  inputs?: TaskFlowInput[];
  outputs?: TaskFlowOutput[];
  retry?: TaskFlowRetry;
  throttle?: TaskFlowThrottle;
  rateLimit?: TaskFlowRateLimit;
  when?: string;
  tagSet?: string[];
  next?: string;
  nextOnError?: string;
  waitSteps?: string[];
  waitErrorSteps?: string[];
}

export type TaskFlowStepProps =
  | { type: 'script'; lang: string; source?: string }
  | { type: 'invoke'; bean: string; method: string }
  | { type: 'sequential' }
  | { type: 'graph' }
  | { type: 'parallel'; joinType?: string; autoCancelUnfinished?: boolean; aggregator?: string }
  | { type: 'if'; condition?: string }
  | { type: 'choose'; decider?: string }
  | { type: 'delay'; delayMillisExpr: string };

export interface TaskFlowTreeBranch {
  id: string;
  data: {
    branchType: 'then' | 'else' | 'case' | 'otherwise' | 'parallel-body';
    label?: string;
    match?: string;
    to?: string;
    priority?: number;
  };
  steps: TaskFlowStep[];
}

export interface TaskFlowInput {
  name: string;
  type?: string;
  mandatory?: boolean;
  optional?: boolean;
  defaultValue?: unknown;
  description?: string;
}

export interface TaskFlowOutput {
  name: string;
  type?: string;
  description?: string;
}

export interface TaskFlowRetry {
  maxRetryCount: number;
  retryDelay?: number;
  maxRetryDelay?: number;
  exponentialDelay?: boolean;
}

export interface TaskFlowThrottle {
  maxConcurrency: number;
  maxWait?: number;
  keyExpr?: string;
}

export interface TaskFlowRateLimit {
  requestPerSecond: number;
  maxWait?: number;
  keyExpr?: string;
}

export interface TaskFlowValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface TaskFlowContainerStackEntry {
  containerId: string;
  container: TaskFlowContainer;
}

export interface TaskFlowContainerStack {
  stack: TaskFlowContainerStackEntry[];
  push(containerId: string, container: TaskFlowContainer): void;
  pop(): TaskFlowContainerStackEntry | undefined;
  peek(): TaskFlowContainerStackEntry | undefined;
  peekParent(): TaskFlowContainerStackEntry | undefined;
  size(): number;
  clear(): void;
}

export function createContainerStack(): TaskFlowContainerStack {
  const stack: TaskFlowContainerStackEntry[] = [];
  return {
    stack,
    push(containerId: string, container: TaskFlowContainer) {
      stack.push({ containerId, container });
    },
    pop() {
      return stack.pop();
    },
    peek() {
      return stack.length > 0 ? stack[stack.length - 1] : undefined;
    },
    peekParent() {
      return stack.length > 1 ? stack[stack.length - 2] : undefined;
    },
    size() {
      return stack.length;
    },
    clear() {
      stack.length = 0;
    },
  };
}
