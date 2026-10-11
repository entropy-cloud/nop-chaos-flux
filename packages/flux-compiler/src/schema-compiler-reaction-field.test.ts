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

  it('rejects v1-unsupported ReactiveActionSchema fields (debounce/once) with their own codes', () => {
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
          code: 'invalid-reaction-debounce',
          severity: 'error',
        }),
        expect.objectContaining({
          code: 'invalid-reaction-once',
          severity: 'error',
        }),
      ]),
    );
    // The copy-paste residue (all four fields reusing `invalid-reaction-immediate`)
    // is gone: the immediate code fires only for an authored `immediate`.
    expect(diagnostics.some((diagnostic) => diagnostic.code === 'invalid-reaction-immediate')).toBe(false);
  });

  // WA-compiler-001 (plan 561): copy-paste residue — debounce/once/control used
  // to reuse the `immediate` diagnostic code; each v1-forbidden field carries
  // its own code so code-filtered consumers can tell them apart.
  it('emits invalid-reaction-debounce (own code) for a v1-forbidden debounce field', () => {
    const diagnostics = validate({
      type: 'reaction-host',
      loadAction: { action: 'probe:load', dependsOn: ['user'], debounce: 200 } as never,
    });

    const debounceDiagnostics = diagnostics.filter(
      (diagnostic) => diagnostic.path.endsWith('/debounce'),
    );
    expect(debounceDiagnostics).toEqual([
      expect.objectContaining({
        code: 'invalid-reaction-debounce',
        severity: 'error',
      }),
    ]);
  });

  it('emits invalid-reaction-once (own code) for a v1-forbidden once field', () => {
    const diagnostics = validate({
      type: 'reaction-host',
      loadAction: { action: 'probe:load', dependsOn: ['user'], once: true } as never,
    });

    const onceDiagnostics = diagnostics.filter((diagnostic) => diagnostic.path.endsWith('/once'));
    expect(onceDiagnostics).toEqual([
      expect.objectContaining({
        code: 'invalid-reaction-once',
        severity: 'error',
      }),
    ]);
  });

  it('emits invalid-reaction-control (own code) for a v1-forbidden control field', () => {
    const diagnostics = validate({
      type: 'reaction-host',
      loadAction: { action: 'probe:load', dependsOn: ['user'], control: {} } as never,
    });

    const controlDiagnostics = diagnostics.filter((diagnostic) =>
      diagnostic.path.endsWith('/control'),
    );
    expect(controlDiagnostics).toEqual([
      expect.objectContaining({
        code: 'invalid-reaction-control',
        severity: 'error',
      }),
    ]);
  });

  // Characterization pins for the shared root-path-array primitive extraction:
  // messages, paths, and severities must survive the refactor verbatim.
  it('characterizes ignoreWritesTo diagnostics (not-array / entry / deep-path)', () => {
    const notArray = validate({
      type: 'reaction-host',
      loadAction: { action: 'probe:load', dependsOn: ['user'], ignoreWritesTo: 'pagination' } as never,
    });
    expect(notArray).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-reaction-deps',
          severity: 'error',
          path: '/loadAction/ignoreWritesTo',
          message: 'ignoreWritesTo must be an array of root-level scope paths when provided.',
        }),
      ]),
    );

    const emptyEntry = validate({
      type: 'reaction-host',
      loadAction: { action: 'probe:load', dependsOn: ['user'], ignoreWritesTo: [''] } as never,
    });
    expect(emptyEntry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-reaction-deps',
          severity: 'error',
          path: '/loadAction/ignoreWritesTo/0',
          message: 'ignoreWritesTo entries must be non-empty strings.',
        }),
      ]),
    );

    const deepPath = validate({
      type: 'reaction-host',
      loadAction: {
        action: 'probe:load',
        dependsOn: ['user'],
        ignoreWritesTo: ['form.values'],
      } as never,
    });
    expect(deepPath).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-reaction-deep-path',
          severity: 'warning',
          path: '/loadAction/ignoreWritesTo/0',
          message:
            'ignoreWritesTo entries should be root-level paths; "form.values" will be folded to root "form" at runtime.',
        }),
      ]),
    );
  });

  it('characterizes dependsOn entry diagnostics (entry / deep-path)', () => {
    const entry = validate({
      type: 'reaction-host',
      loadAction: { action: 'probe:load', dependsOn: ['user', ''] },
    });
    expect(entry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-reaction-deps',
          severity: 'error',
          path: '/loadAction/dependsOn/1',
          message: 'dependsOn entries must be non-empty strings.',
        }),
      ]),
    );

    const deepPath = validate({
      type: 'reaction-host',
      loadAction: { action: 'probe:load', dependsOn: ['user.name'] },
    });
    expect(deepPath).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-reaction-deep-path',
          severity: 'warning',
          path: '/loadAction/dependsOn/0',
          message:
            'dependsOn entries should be root-level paths; "user.name" will be folded to root "user" at runtime.',
        }),
      ]),
    );
  });
});
