import { describe, expect, it } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaCompiler } from './index.js';

const reactionHostRenderer: RendererDefinition = {
  type: 'reaction-host',
  component: () => null,
  fields: [{ key: 'loadAction', kind: 'reaction' }],
};

function createCompiler() {
  return createSchemaCompiler({
    registry: createRendererRegistry([reactionHostRenderer]),
    expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
  });
}

function compileRoot(schema: unknown) {
  const compiler = createCompiler();
  const compiled = compiler.compile(schema as never, {
    diagnostics: { enabled: true, continueOnError: true },
  });
  const root = compiled.root;
  return Array.isArray(root) ? root[0] : root;
}

function validate(schema: unknown) {
  const compiler = createCompiler();
  return compiler.validate?.(schema as never, {}) ?? [];
}

describe('kind: "reaction" field compilation (Phase 3)', () => {
  it('compiles a valid reaction field into reactionPlans with CompiledReactionPlan shape', () => {
    const node = compileRoot({
      type: 'reaction-host',
      loadAction: { action: 'probe:load', dependsOn: ['user'] },
    });

    expect(node.reactionPlans).toBeDefined();
    const plan = node.reactionPlans?.['loadAction'];
    expect(plan).toBeDefined();
    expect(plan?.dependsOn).toEqual(['user']);
    // action is a CompiledActionProgram (has `nodes` array).
    expect(plan?.action).toMatchObject({ nodes: expect.any(Array) });
    // ignoreWritesTo is undefined when not authored.
    expect(plan?.ignoreWritesTo).toBeUndefined();
  });

  it('passes ignoreWritesTo through to the compiled plan', () => {
    const node = compileRoot({
      type: 'reaction-host',
      loadAction: {
        action: 'probe:load',
        dependsOn: ['user'],
        ignoreWritesTo: ['pagination'],
      },
    });

    expect(node.reactionPlans?.['loadAction']?.ignoreWritesTo).toEqual(['pagination']);
  });

  it('does NOT put reaction-kind fields into eventPlans', () => {
    const node = compileRoot({
      type: 'reaction-host',
      loadAction: { action: 'probe:load', dependsOn: ['user'] },
    });

    expect(node.eventPlans).toEqual({});
  });

  it('emits invalid-reaction-deps error when dependsOn is missing', () => {
    const diagnostics = validate({
      type: 'reaction-host',
      loadAction: { action: 'probe:load' },
    });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-reaction-deps',
          severity: 'error',
        }),
      ]),
    );
  });

  it('emits invalid-reaction-deps error when dependsOn is an empty array', () => {
    const diagnostics = validate({
      type: 'reaction-host',
      loadAction: { action: 'probe:load', dependsOn: [] },
    });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-reaction-deps',
          severity: 'error',
        }),
      ]),
    );
  });

  it('emits invalid-reaction-deep-path warning (not error) for deep paths and still compiles', () => {
    const node = compileRoot({
      type: 'reaction-host',
      loadAction: { action: 'probe:load', dependsOn: ['user.name'] },
    });

    // Plan still produced (deep path folds to root at runtime).
    expect(node.reactionPlans?.['loadAction']).toBeDefined();

    const diagnostics = validate({
      type: 'reaction-host',
      loadAction: { action: 'probe:load', dependsOn: ['user.name'] },
    });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-reaction-deep-path',
          severity: 'warning',
        }),
      ]),
    );
  });

  it('emits invalid-reaction-immediate error when immediate:true is authored', () => {
    const diagnostics = validate({
      type: 'reaction-host',
      loadAction: { action: 'probe:load', dependsOn: ['user'], immediate: true },
    });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-reaction-immediate',
          severity: 'error',
        }),
      ]),
    );
  });

  it('rejects v1-unsupported ReactiveActionSchema fields (debounce/once) with invalid-reaction-immediate', () => {
    const diagnostics = validate({
      type: 'reaction-host',
      loadAction: {
        action: 'probe:load',
        dependsOn: ['user'],
        debounce: 200,
        once: true,
      } as never,
    });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-reaction-immediate',
          severity: 'error',
        }),
      ]),
    );
  });
});
