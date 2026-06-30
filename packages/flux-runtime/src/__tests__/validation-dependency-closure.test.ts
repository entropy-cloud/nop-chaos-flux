import { describe, expect, it, vi } from 'vitest';
import type {
  CompiledFormValidationModel,
  CompiledValidationNode,
  CompiledValidationRule,
  ScopeRef,
  ValidationError,
} from '@nop-chaos/flux-core';
import { buildCompiledFormValidationModel } from '@nop-chaos/flux-core';
import { createManagedFormRuntime } from '../form-runtime.js';
import { createScopeRef, createScopeStore } from '../scope.js';
import { validateRule as realValidateRule } from '../validation-runtime.js';

function createStubScope(initialValues: Record<string, unknown> = {}): ScopeRef {
  const store = createScopeStore(initialValues);
  return createScopeRef({ id: 'parent', path: '$', store });
}

function makeFieldNode(
  path: string,
  rules: CompiledValidationNode['rules'],
  behavior: CompiledValidationNode['behavior'] = {
    triggers: ['change', 'blur'],
    showErrorOn: ['touched', 'submit'],
  },
): CompiledValidationNode {
  return {
    path,
    kind: 'field',
    controlType: 'input-text',
    rules,
    behavior,
    children: [],
    parent: '',
  };
}

function makeFormModel(fields: Record<string, CompiledValidationNode>): CompiledFormValidationModel {
  return buildCompiledFormValidationModel({
    behavior: { triggers: ['change', 'blur'], showErrorOn: ['touched', 'submit'] },
    nodes: {
      '': {
        path: '',
        kind: 'form',
        rules: [],
        children: Object.keys(fields),
        parent: undefined,
      },
      ...fields,
    },
    rootPath: '',
  })!;
}

function requiredRule(path: string): CompiledValidationRule {
  return {
    id: `${path}#0:required`,
    rule: { kind: 'required', message: `${path} is required` },
    dependencyPaths: [],
  };
}

async function flushMicrotasks(rounds = 20): Promise<void> {
  for (let i = 0; i < rounds; i += 1) {
    await Promise.resolve();
  }
}

describe('V1: change-triggered error clearing', () => {
  it('clears the field error when a renderer change makes the rule pass and reflects it in canSubmit', async () => {
    const form = createManagedFormRuntime({
      id: 'v1-form',
      parentScope: createStubScope({ name: '' }),
      initialValues: { name: '' },
      validation: makeFormModel({ name: makeFieldNode('name', [requiredRule('name')]) }),
      validateRule: realValidateRule,
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
    });

    form.touchField('name');
    await form.validateField('name', 'blur');

    expect(form.getFieldState('name').errors).toHaveLength(1);
    expect(form.getFieldState('name').errors?.[0].rule).toBe('required');
    expect(form.canSubmit).toBe(false);

    form.setValue('name', 'Alice');
    await form.validateField('name', 'change');

    expect(form.getFieldState('name').errors).toEqual([]);
    expect(form.canSubmit).toBe(true);
  });

  it('clears the underlying error state even under a showErrorOn:"touched" delayed-display path (untouched field)', async () => {
    const form = createManagedFormRuntime({
      id: 'v1-delayed-form',
      parentScope: createStubScope({ name: '' }),
      initialValues: { name: '' },
      validation: makeFormModel({
        name: makeFieldNode('name', [requiredRule('name')], {
          triggers: ['change', 'blur'],
          showErrorOn: ['touched', 'submit'],
        }),
      }),
      validateRule: realValidateRule,
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
    });

    await form.validateField('name', 'manual');

    expect(form.getFieldState('name').errors).toHaveLength(1);
    expect(form.isTouched('name')).toBe(false);

    form.setValue('name', 'Alice');
    await form.validateField('name', 'change');

    expect(form.getFieldState('name').errors).toEqual([]);
  });
});

describe('V2: mutual cross-field constraint bidirectional clearing (real rules, no mock validateField)', () => {
  it('clears the peer error through the dependency closure when one side is fixed and converges cycle-safely', async () => {
    let validateRuleCalls = 0;
    const form = createManagedFormRuntime({
      id: 'v2-form',
      parentScope: createStubScope({ a: 0, b: 0 }),
      initialValues: { a: 10, b: 5 },
      validation: makeFormModel({
        a: makeFieldNode('a', [
          {
            id: 'a#0:lt-b',
            rule: { kind: 'equalsField', path: 'b' },
            dependencyPaths: ['b'],
          },
        ]),
        b: makeFieldNode('b', [
          {
            id: 'b#0:gt-a',
            rule: { kind: 'equalsField', path: 'a' },
            dependencyPaths: ['a'],
          },
        ]),
      }),
      validateRule: (_compiledRule, value, field, scope): ValidationError | undefined => {
        validateRuleCalls += 1;
        if (validateRuleCalls > 1000) {
          throw new Error('dependency closure did not converge (infinite recursion)');
        }

        if (field.path === 'a') {
          const b = scope.get('b');
          if (typeof value === 'number' && typeof b === 'number' && !(value < b)) {
            return { path: 'a', message: 'a must be less than b', rule: 'equalsField' };
          }
        }

        if (field.path === 'b') {
          const a = scope.get('a');
          if (typeof value === 'number' && typeof a === 'number' && !(value > a)) {
            return { path: 'b', message: 'b must be greater than a', rule: 'equalsField' };
          }
        }

        return undefined;
      },
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
    });

    await form.validateField('a', 'blur');
    await form.validateField('b', 'blur');

    expect(form.getFieldState('a').errors).toHaveLength(1);
    expect(form.getFieldState('b').errors).toHaveLength(1);

    form.setValue('b', 20);
    await flushMicrotasks();

    expect(form.getFieldState('a').errors).toEqual([]);

    await form.validateField('b', 'change');

    expect(form.getFieldState('b').errors).toEqual([]);

    expect(validateRuleCalls).toBeLessThan(50);
  });
});
