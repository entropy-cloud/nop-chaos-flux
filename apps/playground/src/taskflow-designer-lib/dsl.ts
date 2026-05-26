import type {
  TaskFlowAuthoringModel,
  TaskFlowGraphContainer,
  TaskFlowGraphEdge,
  TaskFlowGraphNode,
  TaskFlowStep,
  TaskFlowStepType,
  TaskFlowTreeBranch,
  TaskFlowTreeContainer,
} from './types.js';
import { TASKFLOW_STEP_TYPES } from './types.js';

export interface NopTaskDSLInput {
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

export interface NopDSLStep {
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

export function tryParseJson(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function getUnsupportedStepTypes(steps: NopDSLStep[] | undefined): string[] {
  if (!steps) {
    return [];
  }

  const unsupported = new Set<string>();

  const visit = (step: NopDSLStep) => {
    if (!isValidStepType(step.type)) {
      unsupported.add(step.type);
    }

    step.steps?.forEach(visit);
    step.then?.forEach(visit);
    step.else?.forEach(visit);
    step.cases?.forEach((branch) => branch.steps?.forEach(visit));
    step.otherwise?.steps?.forEach(visit);
    step.parallel?.forEach((branch) => branch?.forEach(visit));
  };

  steps.forEach(visit);
  return [...unsupported];
}

export function parseNopTaskDSL(
  dsl: NopTaskDSLInput,
  fallbackName?: string,
): { model: TaskFlowAuthoringModel } | null {
  if (!dsl.steps || !Array.isArray(dsl.steps)) return null;

  const unsupportedTypes = getUnsupportedStepTypes(dsl.steps);
  if (unsupportedTypes.length > 0) {
    throw new Error(`Unsupported TaskFlow step types: ${unsupportedTypes.join(', ')}`);
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
        edges.push({
          id: `e-import-${s.name}-next`,
          source: sourceNode.id,
          target: nodes.find((n) => n.step.common.name === s.next)!.id,
          sourcePort: 'next',
          edgeType: 'taskflow-next',
        });
      }
      if (s.nextOnError && nameSet.has(s.nextOnError)) {
        edges.push({
          id: `e-import-${s.name}-error`,
          source: sourceNode.id,
          target: nodes.find((n) => n.step.common.name === s.nextOnError)!.id,
          sourcePort: 'error',
          edgeType: 'taskflow-error',
        });
      }
      if (s.waitSteps) {
        for (const ws of s.waitSteps) {
          if (nameSet.has(ws)) {
            edges.push({
              id: `e-import-${s.name}-wait-${ws}`,
              source: sourceNode.id,
              target: nodes.find((n) => n.step.common.name === ws)!.id,
              sourcePort: 'wait',
              edgeType: 'taskflow-wait',
            });
          }
        }
      }
      if (s.waitErrorSteps) {
        for (const wes of s.waitErrorSteps) {
          if (nameSet.has(wes)) {
            edges.push({
              id: `e-import-${s.name}-wait-error-${wes}`,
              source: sourceNode.id,
              target: nodes.find((n) => n.step.common.name === wes)!.id,
              sourcePort: 'wait-error',
              edgeType: 'taskflow-wait-error',
            });
          }
        }
      }
    }

    const root: TaskFlowGraphContainer = {
      id: containerId,
      profile: 'workflow',
      name: fallbackName ?? dsl.task?.name ?? 'Imported TaskFlow',
      enterStepRefs: dsl.enterSteps ?? (nodes.length > 0 ? [nodes[0].id] : []),
      exitStepRefs: dsl.exitSteps ?? (nodes.length > 0 ? [nodes[nodes.length - 1].id] : []),
      nodes,
      edges,
    };

    return {
      model: {
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
      },
    };
  }

  const steps = dsl.steps.map((s) => dslStepToTaskFlowStep(s, true));
  const root: TaskFlowTreeContainer = {
    id: containerId,
    profile: 'dingflow',
    name: fallbackName ?? dsl.task?.name ?? 'Imported TaskFlow',
    steps,
    syntheticRootId: '__synthetic_root__',
  };

  return {
    model: {
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
    },
  };
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
        branches.push({
          id: `${id}-then`,
          data: { branchType: 'then', label: 'Then' },
          steps: dsl.then.map((s) => dslStepToTaskFlowStep(s, true)),
        });
      }
      if (dsl.else) {
        branches.push({
          id: `${id}-else`,
          data: { branchType: 'else', label: 'Else' },
          steps: dsl.else.map((s) => dslStepToTaskFlowStep(s, true)),
        });
      }
      if (dsl.cases) {
        for (let i = 0; i < dsl.cases.length; i++) {
          const c = dsl.cases[i];
          branches.push({
            id: `${id}-case-${i}`,
            data: { branchType: 'case', label: c.match ?? `Case ${i}`, match: c.match, to: c.to },
            steps: (c.steps ?? []).map((s) => dslStepToTaskFlowStep(s, true)),
          });
        }
      }
      if (dsl.otherwise) {
        branches.push({
          id: `${id}-otherwise`,
          data: {
            branchType: 'otherwise',
            label: 'Otherwise',
            match: dsl.otherwise.match,
            to: dsl.otherwise.to,
          },
          steps: (dsl.otherwise.steps ?? []).map((s) => dslStepToTaskFlowStep(s, true)),
        });
      }
      if (dsl.parallel) {
        for (let i = 0; i < dsl.parallel.length; i++) {
          const p = dsl.parallel[i];
          branches.push({
            id: `${id}-parallel-${i}`,
            data: { branchType: 'parallel-body', label: `Branch ${i + 1}` },
            steps: (p ?? []).map((s) => dslStepToTaskFlowStep(s, true)),
          });
        }
      }
      step.branches = branches;
    }

    if ((stepType === 'sequential' || stepType === 'graph' || stepType === 'parallel') && dsl.steps) {
      step.body = {
        id: `${id}-body`,
        profile: 'dingflow',
        name: `${dsl.name}-body`,
        steps: dsl.steps.map((s) => dslStepToTaskFlowStep(s, true)),
        syntheticRootId: '__synthetic__',
      };
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
      return {
        type: 'parallel',
        joinType: dsl.joinType,
        autoCancelUnfinished: dsl.autoCancelUnfinished,
        aggregator: dsl.aggregator,
      };
    case 'end':
      return { type: 'end' };
    case 'sequential':
      return { type: 'sequential' };
    case 'graph':
      return { type: 'graph' };
    default:
      return { type: stepType } as TaskFlowStep['props'];
  }
}

function isValidStepType(type: string): type is TaskFlowStepType {
  return (TASKFLOW_STEP_TYPES as readonly string[]).includes(type);
}
