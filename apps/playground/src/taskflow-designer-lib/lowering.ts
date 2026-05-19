import type {
  TaskFlowAuthoringModel,
  TaskFlowGraphContainer,
  TaskFlowTreeContainer,
  TaskFlowGraphNode,
  TaskFlowGraphEdge,
  TaskFlowStep,
} from './types.js';

interface NopTaskStep {
  type: string;
  id?: string;
  name?: string;
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
  steps?: NopTaskStep[];
  enterSteps?: string[];
  exitSteps?: string[];
  next?: string;
  nextOnError?: string;
  waitSteps?: string[];
  waitErrorSteps?: string[];
  then?: NopTaskStep[];
  else?: NopTaskStep[];
  cases?: NopTaskCase[];
  otherwise?: NopTaskCase;
  parallel?: NopTaskStep[][];
}

interface NopTaskCase {
  match?: string;
  to?: string;
  steps?: NopTaskStep[];
}

interface NopTaskFlowDSL {
  kind: 'nop-taskflow';
  schemaVersion: '1.0';
  task: {
    version: number;
    graphMode: boolean;
    restartable: boolean;
    defaultSaveState: boolean;
    useParentBeanContainer: boolean;
    recordMetrics: boolean;
    name?: string;
  };
  steps?: NopTaskStep[];
  enterSteps?: string[];
  exitSteps?: string[];
}

function buildNodeNameMap(graphContainer: TaskFlowGraphContainer): Map<string, string> {
  const map = new Map<string, string>();
  for (const node of graphContainer.nodes) {
    map.set(node.id, node.step.common.name);
  }
  return map;
}

function lowerGraphStep(step: TaskFlowStep, _nameMap: Map<string, string>): NopTaskStep {
  return lowerCommonStep(step);
}

function lowerCommonStep(step: TaskFlowStep): NopTaskStep {
  const result: NopTaskStep = {
    type: step.type,
    name: step.common.name,
  };

  if (step.common.displayName) result.displayName = step.common.displayName;
  if (step.common.description) result.description = step.common.description;
  if (step.common.disabled) result.disabled = true;
  if (step.common.allowFailure) result.allowFailure = true;
  if (step.common.sync) result.sync = true;
  if (step.common.internal) result.internal = true;
  if (step.common.timeout !== undefined) result.timeout = step.common.timeout;
  if (step.common.executor) result.executor = step.common.executor;
  if (step.common.when) result.when = step.common.when;
  if (step.common.tagSet) result.tagSet = step.common.tagSet;
  if (step.common.inputs) result.inputs = step.common.inputs;
  if (step.common.outputs) result.outputs = step.common.outputs;
  if (step.common.retry) result.retry = step.common.retry;
  if (step.common.throttle) result.throttle = step.common.throttle;
  if (step.common.rateLimit) result.rateLimit = step.common.rateLimit;

  switch (step.props.type) {
    case 'script':
      result.lang = step.props.lang;
      if (step.props.source) result.source = step.props.source;
      break;
    case 'invoke':
      result.bean = step.props.bean;
      result.method = step.props.method;
      break;
    case 'delay':
      result.delayMillisExpr = step.props.delayMillisExpr;
      break;
    case 'if':
      if (step.props.condition) result.condition = step.props.condition;
      break;
    case 'choose':
      if (step.props.decider) result.decider = step.props.decider;
      break;
    case 'parallel':
      if (step.props.joinType) result.joinType = step.props.joinType;
      if (step.props.autoCancelUnfinished) result.autoCancelUnfinished = true;
      if (step.props.aggregator) result.aggregator = step.props.aggregator;
      break;
  }

  return result;
}

function lowerGraphEdgesToStepRefs(
  node: TaskFlowGraphNode,
  edges: TaskFlowGraphEdge[],
  nameMap: Map<string, string>,
): void {
  const nextEdges = edges.filter((e) => e.source === node.id);
  for (const edge of nextEdges) {
    const targetName = nameMap.get(edge.target);
    if (!targetName) continue;

    switch (edge.edgeType) {
      case 'taskflow-next':
        node.step.common.next = targetName;
        break;
      case 'taskflow-error':
        node.step.common.nextOnError = targetName;
        break;
      case 'taskflow-wait': {
        const targetStep = node.step;
        if (!targetStep.common.waitSteps) targetStep.common.waitSteps = [];
        if (!targetStep.common.waitSteps.includes(targetName)) {
          targetStep.common.waitSteps.push(targetName);
        }
        break;
      }
      case 'taskflow-wait-error': {
        const targetStepErr = node.step;
        if (!targetStepErr.common.waitErrorSteps) targetStepErr.common.waitErrorSteps = [];
        if (!targetStepErr.common.waitErrorSteps.includes(targetName)) {
          targetStepErr.common.waitErrorSteps.push(targetName);
        }
        break;
      }
    }
  }
}

function lowerGraphContainer(container: TaskFlowGraphContainer): { steps: NopTaskStep[]; enterSteps: string[]; exitSteps: string[] } {
  const nameMap = buildNodeNameMap(container);

  const steps: NopTaskStep[] = container.nodes.map((node) => {
    lowerGraphEdgesToStepRefs(node, container.edges, nameMap);
    return lowerGraphStep(node.step, nameMap);
  });

  const enterSteps = container.enterStepRefs
    .map((ref) => nameMap.get(ref))
    .filter((n): n is string => !!n);

  const exitSteps = container.exitStepRefs
    .map((ref) => nameMap.get(ref))
    .filter((n): n is string => !!n);

  return { steps, enterSteps, exitSteps };
}

function lowerTreeContainerSteps(steps: TaskFlowStep[]): NopTaskStep[] {
  return steps.map((step) => lowerTreeStep(step));
}

function lowerTreeStep(step: TaskFlowStep): NopTaskStep {
  const result = lowerCommonStep(step);

  if (step.branches && step.branches.length > 0) {
    for (const branch of step.branches) {
      const branchSteps = branch.steps.length > 0 ? branch.steps.map((s) => lowerTreeStep(s)) : undefined;
      switch (branch.data.branchType) {
        case 'then':
          result.then = branchSteps;
          break;
        case 'else':
          result.else = branchSteps;
          break;
        case 'case': {
          if (!result.cases) result.cases = [];
          result.cases.push({ match: branch.data.match, to: branch.data.to, steps: branchSteps });
          break;
        }
        case 'otherwise':
          result.otherwise = { match: branch.data.match, to: branch.data.to, steps: branchSteps };
          break;
        case 'parallel-body': {
          if (!result.parallel) result.parallel = [];
          result.parallel.push(branchSteps ?? []);
          break;
        }
      }
    }
  }

  if (step.type === 'sequential' || step.type === 'graph' || step.type === 'parallel') {
    if (step.body) {
      if (step.body.profile === 'dingflow') {
        result.steps = lowerTreeContainerSteps((step.body as TaskFlowTreeContainer).steps);
      }
    }
  }

  return result;
}

export function lowerToTaskFlowDSL(authoringModel: TaskFlowAuthoringModel): NopTaskFlowDSL {
  const result: NopTaskFlowDSL = {
    kind: 'nop-taskflow',
    schemaVersion: '1.0',
    task: {
      version: authoringModel.task.version,
      graphMode: authoringModel.task.graphMode,
      restartable: authoringModel.task.restartable,
      defaultSaveState: authoringModel.task.defaultSaveState,
      useParentBeanContainer: authoringModel.task.useParentBeanContainer,
      recordMetrics: authoringModel.task.recordMetrics,
      name: authoringModel.task.common?.name,
    },
  };

  if (authoringModel.root.profile === 'workflow') {
    const graphResult = lowerGraphContainer(authoringModel.root);
    result.steps = graphResult.steps;
    result.enterSteps = graphResult.enterSteps;
    result.exitSteps = graphResult.exitSteps;
  } else {
    result.steps = lowerTreeContainerSteps((authoringModel.root as TaskFlowTreeContainer).steps);
  }

  return result;
}
