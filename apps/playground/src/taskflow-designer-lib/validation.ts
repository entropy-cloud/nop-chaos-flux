import type {
  TaskFlowAuthoringModel,
  TaskFlowGraphContainer,
  TaskFlowTreeContainer,
  TaskFlowStep,
  TaskFlowValidationError,
} from './types.js';

export function validateAuthoringModel(model: TaskFlowAuthoringModel): TaskFlowValidationError[] {
  const errors: TaskFlowValidationError[] = [];

  if (model.root.profile === 'workflow') {
    validateGraphContainer(model.root, errors, 'root');
  } else {
    validateTreeSteps((model.root as TaskFlowTreeContainer).steps, errors, 'root.steps');
  }

  return errors;
}

export function validateGraphContainer(
  container: TaskFlowGraphContainer,
  errors: TaskFlowValidationError[],
  path: string,
): void {
  const nameSet = new Set<string>();
  const nodeIdSet = new Set(container.nodes.map((n) => n.id));

  for (const node of container.nodes) {
    const nodePath = `${path}.nodes[${node.id}]`;
    validateStep(node.step, errors, nodePath, container);

    if (nameSet.has(node.step.common.name)) {
      errors.push({
        path: `${nodePath}.common.name`,
        message: `Duplicate step name: "${node.step.common.name}"`,
        severity: 'error',
      });
    }
    nameSet.add(node.step.common.name);

    if (node.step.type !== node.step.props.type) {
      errors.push({
        path: `${nodePath}.type`,
        message: `Step type mismatch: step.type="${node.step.type}" !== step.props.type="${node.step.props.type}"`,
        severity: 'error',
      });
    }
  }

  if (container.enterStepRefs.length === 0) {
    errors.push({
      path: `${path}.enterStepRefs`,
      message: 'Graph container must have at least one enterStepRef',
      severity: 'error',
    });
  } else {
    for (const ref of container.enterStepRefs) {
      if (!nodeIdSet.has(ref)) {
        errors.push({
          path: `${path}.enterStepRefs`,
          message: `enterStepRef "${ref}" does not match any node id`,
          severity: 'error',
        });
      }
    }
  }

  if (container.exitStepRefs.length === 0) {
    errors.push({
      path: `${path}.exitStepRefs`,
      message: 'Graph container must have at least one exitStepRef',
      severity: 'error',
    });
  } else {
    for (const ref of container.exitStepRefs) {
      if (!nodeIdSet.has(ref)) {
        errors.push({
          path: `${path}.exitStepRefs`,
          message: `exitStepRef "${ref}" does not match any node id`,
          severity: 'error',
        });
      }
    }
  }

  for (const edge of container.edges) {
    if (!nodeIdSet.has(edge.source)) {
      errors.push({
        path: `${path}.edges[${edge.id}].source`,
        message: `Edge source "${edge.source}" does not match any node id`,
        severity: 'error',
      });
    }
    if (!nodeIdSet.has(edge.target)) {
      errors.push({
        path: `${path}.edges[${edge.id}].target`,
        message: `Edge target "${edge.target}" does not match any node id`,
        severity: 'error',
      });
    }
  }
}

function validateStep(
  step: TaskFlowStep,
  errors: TaskFlowValidationError[],
  path: string,
  _container: TaskFlowGraphContainer,
): void {
  if (!step.common.name || step.common.name.trim() === '') {
    errors.push({
      path: `${path}.common.name`,
      message: 'Step name is required',
      severity: 'error',
    });
  }

  if (step.body) {
    if (step.body.profile === 'workflow') {
      validateGraphContainer(step.body, errors, `${path}.body`);
    } else {
      validateTreeSteps((step.body as TaskFlowTreeContainer).steps, errors, `${path}.body.steps`);
    }
  }

  if (step.branches && step.branches.length > 0) {
    const matchSet = new Set<string>();
    let otherwiseCount = 0;

    for (const branch of step.branches) {
      if (branch.data.branchType === 'case') {
        if (branch.data.match) {
          if (matchSet.has(branch.data.match)) {
            errors.push({
              path: `${path}.branches[${branch.id}].match`,
              message: `Duplicate case match: "${branch.data.match}"`,
              severity: 'error',
            });
          }
          matchSet.add(branch.data.match);
        }
      }
      if (branch.data.branchType === 'otherwise') {
        otherwiseCount++;
      }
    }

    if (otherwiseCount > 1) {
      errors.push({
        path: `${path}.branches`,
        message: 'At most one "otherwise" branch is allowed',
        severity: 'error',
      });
    }
  }
}

function validateTreeSteps(
  steps: TaskFlowStep[],
  errors: TaskFlowValidationError[],
  path: string,
): void {
  const nameSet = new Set<string>();

  for (const step of steps) {
    const stepPath = `${path}[${step.id}]`;

    if (nameSet.has(step.common.name)) {
      errors.push({
        path: `${stepPath}.common.name`,
        message: `Duplicate step name: "${step.common.name}"`,
        severity: 'error',
      });
    }
    nameSet.add(step.common.name);

    if (step.type !== step.props.type) {
      errors.push({
        path: `${stepPath}.type`,
        message: `Step type mismatch: step.type="${step.type}" !== step.props.type="${step.props.type}"`,
        severity: 'error',
      });
    }

    if (step.branches && step.branches.length > 0) {
      const matchSet = new Set<string>();
      let otherwiseCount = 0;

      for (const branch of step.branches) {
        if (branch.data.branchType === 'case' && branch.data.match) {
          if (matchSet.has(branch.data.match)) {
            errors.push({
              path: `${stepPath}.branches[${branch.id}].match`,
              message: `Duplicate case match: "${branch.data.match}"`,
              severity: 'error',
            });
          }
          matchSet.add(branch.data.match);
        }
        if (branch.data.branchType === 'otherwise') {
          otherwiseCount++;
        }
      }

      if (otherwiseCount > 1) {
        errors.push({
          path: `${stepPath}.branches`,
          message: 'At most one "otherwise" branch is allowed',
          severity: 'error',
        });
      }
    }

    if (step.type === 'sequential' || step.type === 'graph' || step.type === 'parallel') {
      if (step.body) {
        if (step.body.profile === 'workflow') {
          validateGraphContainer(step.body, errors, `${stepPath}.body`);
        } else if (step.body.profile === 'dingflow') {
          validateTreeSteps((step.body as TaskFlowTreeContainer).steps, errors, `${stepPath}.body.steps`);
        }
      }
    }
  }
}
