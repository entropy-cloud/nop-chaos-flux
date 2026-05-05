import { describe, expect, it } from 'vitest';
import {
  createRendererRegistry,
  type CompiledFormValidationModel,
  type RendererDefinition,
  getCompiledValidationDependents,
  getCompiledValidationField,
  getCompiledValidationNode,
  getCompiledValidationNodeMap,
  getCompiledValidationRootPath,
  getCompiledValidationTraversalOrder,
  hasCompiledValidationNodes,
  buildCompiledValidationDependentMap,
  buildCompiledValidationOrder,
  buildCompiledFormValidationModel,
} from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index';
import { formRenderer, inputRenderer, env, compiledRule } from './test-fixtures';

describe('createRendererRuntime', () => {
  it('compiles validation nodes with array metadata', () => {
    const arrayRenderer: RendererDefinition = {
      type: 'array-editor',
      component: () => null,
      validation: {
        kind: 'field',
        valueKind: 'array',
        getFieldPath(schema) {
          return typeof schema.name === 'string' ? schema.name : undefined;
        },
        collectRules() {
          return [];
        },
      },
    };
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([formRenderer, inputRenderer, arrayRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const _c5 = runtime.compile({
      type: 'form',
      body: [
        {
          type: 'array-editor',
          name: 'reviewers',
          label: 'Reviewers',
          minItems: 1,
        },
      ],
    });
    const node = (Array.isArray(_c5.root) ? _c5.root[0] : _c5.root) as any;

    expect(node.validationPlan.nodes.reviewers.kind).toBe('array');
    expect(node.validationPlan.nodes[''].children).toContain('reviewers');
    expect(node.validationPlan.nodes.reviewers.rules[0].rule).toMatchObject({
      kind: 'minItems',
      value: 1,
    });
  });

  it('exposes validation compatibility accessors from canonical model data', () => {
    const validation: CompiledFormValidationModel = {
      behavior: {
        triggers: ['blur'],
        showErrorOn: ['touched', 'submit'],
      },
      order: ['reviewers'],
      dependents: {
        role: ['adminCode'],
      },
      nodes: {
        '': {
          path: '',
          kind: 'form',
          rules: [],
          children: ['reviewers'],
        },
        reviewers: {
          path: 'reviewers',
          kind: 'array',
          controlType: 'array-editor',
          label: 'Reviewers',
          behavior: {
            triggers: ['change'],
            showErrorOn: ['dirty'],
          },
          rules: [
            compiledRule({ kind: 'minItems', value: 1, message: 'Need one reviewer' }, 'reviewers'),
          ],
          children: [],
          parent: '',
        },
        adminCode: {
          path: 'adminCode',
          kind: 'field',
          controlType: 'input-text',
          label: 'Admin Code',
          behavior: {
            triggers: ['blur'],
            showErrorOn: ['touched', 'submit'],
          },
          rules: [
            compiledRule({ kind: 'requiredWhen', path: 'role', value: 'admin' }, 'adminCode'),
          ],
          children: [],
          parent: '',
        },
      },
      rootPath: '',
    };

    expect(getCompiledValidationTraversalOrder(validation)).toEqual(['reviewers']);
    expect(getCompiledValidationDependents(validation, 'role')).toEqual(['adminCode']);
    expect(getCompiledValidationDependents(validation, 'missing')).toEqual([]);
    expect(getCompiledValidationNodeMap(validation)).toBe(validation.nodes);
    expect(getCompiledValidationNode(validation, 'reviewers')).toBe(validation.nodes?.reviewers);
    expect(getCompiledValidationNode(validation, 'missing')).toBeUndefined();
    expect(getCompiledValidationRootPath(validation)).toBe('');
    expect(hasCompiledValidationNodes(validation)).toBe(true);
    expect(hasCompiledValidationNodes(undefined)).toBe(false);
    expect(buildCompiledValidationDependentMap(validation.nodes)).toEqual({
      role: ['adminCode'],
    });
    expect(buildCompiledValidationOrder(validation.nodes, '')).toEqual(['reviewers', 'adminCode']);
    expect(
      buildCompiledFormValidationModel({
        behavior: validation.behavior,
        nodes: validation.nodes,
        rootPath: '',
      }),
    ).toMatchObject({
      order: ['reviewers', 'adminCode'],
      dependents: {
        role: ['adminCode'],
      },
    });
    expect(getCompiledValidationField(validation, 'reviewers')).toMatchObject({
      path: 'reviewers',
      controlType: 'array-editor',
      label: 'Reviewers',
      behavior: {
        triggers: ['change'],
        showErrorOn: ['dirty'],
      },
    });
  });
});
