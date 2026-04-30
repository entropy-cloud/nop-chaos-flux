import { describe, expect, it } from 'vitest';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRegistry, createRendererRuntime } from '../index';
import { formRenderer, inputRenderer, env } from './test-fixtures';

describe('createRendererRuntime', () => {
  it('compiles field validation triggers with field override and form fallback', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([formRenderer, inputRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const _c1 = runtime.compile({
      type: 'form',
      validateOn: 'submit',
      body: [
        {
          type: 'input-text',
          name: 'username',
          label: 'Username',
          required: true,
          validateOn: ['blur', 'change'],
        },
        {
          type: 'input-text',
          name: 'nickname',
          label: 'Nickname',
          required: true,
        },
      ],
    });
    const node = (Array.isArray(_c1.root) ? _c1.root[0] : _c1.root) as any;

    expect(node.validationPlan.behavior.triggers).toEqual(['submit']);
    expect(node.validationPlan.behavior.showErrorOn).toEqual(['touched', 'submit']);
    expect(node.validationPlan.nodes.username.behavior.triggers).toEqual(['blur', 'change']);
    expect(node.validationPlan.nodes.username.behavior.showErrorOn).toEqual(['touched', 'submit']);
    expect(node.validationPlan.nodes.nickname.behavior.triggers).toEqual(['submit']);
    expect(node.validationPlan.nodes.nickname.behavior.showErrorOn).toEqual(['touched', 'submit']);
  });

  it('compiles error visibility policy with field override and form fallback', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([formRenderer, inputRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const _c3 = runtime.compile({
      type: 'form',
      validateOn: 'submit',
      showErrorOn: 'submit',
      body: [
        {
          type: 'input-text',
          name: 'username',
          label: 'Username',
          required: true,
          showErrorOn: ['visited', 'dirty'],
        },
        {
          type: 'input-text',
          name: 'nickname',
          label: 'Nickname',
          required: true,
        },
      ],
    });
    const node = (Array.isArray(_c3.root) ? _c3.root[0] : _c3.root) as any;

    expect(node.validationPlan.behavior.showErrorOn).toEqual(['submit']);
    expect(node.validationPlan.nodes.username.behavior.showErrorOn).toEqual(['visited', 'dirty']);
    expect(node.validationPlan.nodes.nickname.behavior.showErrorOn).toEqual(['submit']);
  });

  it('reuses pooled validation behavior objects for equivalent field policies', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([formRenderer, inputRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const _c2 = runtime.compile({
      type: 'form',
      validateOn: 'submit',
      showErrorOn: ['touched', 'submit'],
      body: [
        {
          type: 'input-text',
          name: 'username',
          label: 'Username',
          required: true,
        },
        {
          type: 'input-text',
          name: 'nickname',
          label: 'Nickname',
          required: true,
        },
        {
          type: 'input-text',
          name: 'email',
          label: 'Email',
          required: true,
          validateOn: ['blur', 'change'],
        },
      ],
    });
    const node = (Array.isArray(_c2.root) ? _c2.root[0] : _c2.root) as any;

    expect(node.validationPlan.nodes.username.behavior).toBe(
      node.validationPlan.nodes.nickname.behavior,
    );
    expect(node.validationPlan.nodes.username.behavior).not.toBe(
      node.validationPlan.nodes.email.behavior,
    );
    expect(node.validationPlan.nodes.username.behavior).toBe(
      node.validationPlan.nodes.username.behavior,
    );
  });

  it('compiles relational validation rules and dependency metadata', () => {
    const registry = createRendererRegistry([formRenderer, inputRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const _c4 = runtime.compile({
      type: 'form',
      body: [
        {
          type: 'input-text',
          name: 'password',
          label: 'Password',
        },
        {
          type: 'input-text',
          name: 'confirmPassword',
          label: 'Confirm Password',
          equalsField: 'password',
        },
        {
          type: 'input-text',
          name: 'adminCode',
          label: 'Admin Code',
          requiredWhen: {
            path: 'role',
            equals: 'admin',
            message: 'Admin code required for admins',
          },
        },
      ],
    });
    const node = (Array.isArray(_c4.root) ? _c4.root[0] : _c4.root) as any;

    expect(node.validationPlan.nodes.confirmPassword.rules[0].rule).toMatchObject({
      kind: 'equalsField',
      path: 'password',
    });
    expect(node.validationPlan.nodes.confirmPassword.rules[0].dependencyPaths).toEqual([
      'password',
    ]);
    expect(node.validationPlan.nodes.adminCode.rules[0].rule).toMatchObject({
      kind: 'requiredWhen',
      path: 'role',
      equals: 'admin',
    });
    expect(node.validationPlan.dependents.password).toEqual(['confirmPassword']);
    expect(node.validationPlan.dependents.role).toEqual(['adminCode']);
  });
});
