import { describe, expect, it } from 'vitest';
import {
  buildCompiledFormValidationModel,
  buildCompiledValidationDependentMap,
  buildCompiledValidationOrder,
  getCompiledValidationField,
  resolveHiddenFieldPolicy,
  type CompiledValidationBehavior,
  type CompiledValidationNode
} from './index';

const defaultBehavior: CompiledValidationBehavior = {
  triggers: ['blur'],
  showErrorOn: ['touched', 'submit']
};

describe('validation-model', () => {
  it('merges hidden field policy from defaults, form, and field', () => {
    expect(resolveHiddenFieldPolicy(undefined, undefined)).toEqual({
      validateWhenHidden: false,
      clearValueWhenHidden: false
    });

    expect(resolveHiddenFieldPolicy(
      { clearValueWhenHidden: true },
      { validateWhenHidden: true }
    )).toEqual({
      validateWhenHidden: true,
      clearValueWhenHidden: true
    });
  });

  it('returns compiled field snapshots with resolved hidden-field policy', () => {
    const nodes: Record<string, CompiledValidationNode> = {
      form: {
        path: 'form',
        kind: 'form',
        rules: [],
        children: ['user.name']
      },
      'user.name': {
        path: 'user.name',
        kind: 'field',
        controlType: 'input-text',
        label: 'User Name',
        rules: [{ id: 'required', rule: { kind: 'required' }, dependencyPaths: [] }],
        behavior: defaultBehavior,
        children: [],
        parent: 'form',
        hiddenFieldPolicy: { clearValueWhenHidden: true }
      }
    };

    const model = buildCompiledFormValidationModel({
      behavior: defaultBehavior,
      nodes,
      rootPath: 'form',
      defaultHiddenFieldPolicy: { validateWhenHidden: true }
    });

    expect(getCompiledValidationField(model, 'user.name')).toEqual({
      path: 'user.name',
      controlType: 'input-text',
      label: 'User Name',
      rules: [{ id: 'required', rule: { kind: 'required' }, dependencyPaths: [] }],
      behavior: defaultBehavior,
      hiddenFieldPolicy: {
        validateWhenHidden: true,
        clearValueWhenHidden: true
      }
    });
  });

  it('builds dependents and traversal order from validation nodes', () => {
    const nodes: Record<string, CompiledValidationNode> = {
      form: {
        path: 'form',
        kind: 'form',
        rules: [],
        children: ['user.name', 'user.email']
      },
      'user.name': {
        path: 'user.name',
        kind: 'field',
        controlType: 'input-text',
        rules: [{ id: 'name-required', rule: { kind: 'required' }, dependencyPaths: [] }],
        behavior: defaultBehavior,
        children: [],
        parent: 'form'
      },
      'user.email': {
        path: 'user.email',
        kind: 'field',
        controlType: 'input-text',
        rules: [{ id: 'email-equals', rule: { kind: 'equalsField', path: 'user.name' }, dependencyPaths: ['user.name'] }],
        behavior: defaultBehavior,
        children: [],
        parent: 'form'
      }
    };

    expect(buildCompiledValidationDependentMap(nodes)).toEqual({
      'user.name': ['user.email']
    });

    expect(buildCompiledValidationOrder(nodes, 'form')).toEqual(['user.name', 'user.email']);
  });
});
