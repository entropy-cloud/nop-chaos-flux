import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  ActionSchema,
  ActionResult,
  CompiledActionProgram,
  CompiledReactionPlan,
  ForceableReactionRegistration,
  ReactionHandle,
  ReactionHandleDebugState,
  ReactionRegistration,
  ReactiveActionSchema,
  RendererComponentProps,
  SchemaFieldKind,
} from './index.js';

describe('kind: "reaction" type contract (Phase 2)', () => {
  it('SchemaFieldKind includes "reaction"', () => {
    const kind: SchemaFieldKind = 'reaction';
    expect(kind).toBe('reaction');
    expectTypeOf<'reaction'>().toMatchTypeOf<SchemaFieldKind>();
  });

  it('exposes ReactiveActionSchema extending ActionSchema with required dependsOn and optional ignoreWritesTo', () => {
    const schema: ReactiveActionSchema = {
      action: 'probe:load',
      dependsOn: ['user'],
    };
    expect(schema.action).toBe('probe:load');
    expect(schema.dependsOn).toEqual(['user']);

    // ReactiveActionSchema is assignable to ActionSchema (consumers can still treat it as an action).
    const asAction: ActionSchema = schema;
    expect(asAction.action).toBe('probe:load');

    expectTypeOf<ReactiveActionSchema>().toExtend<ActionSchema>();
    expectTypeOf<ReactiveActionSchema>().toMatchTypeOf<ActionSchema>();
    // dependsOn is required (not optional).
    expectTypeOf<ReactiveActionSchema['dependsOn']>().toEqualTypeOf<string[]>();
    // ignoreWritesTo is optional.
    expectTypeOf<ReactiveActionSchema>().toHaveProperty('ignoreWritesTo').toEqualTypeOf<string[] | undefined>();
  });

  it('exposes CompiledReactionPlan with action + dependsOn + optional ignoreWritesTo', () => {
    const program = { nodes: [] } as unknown as CompiledActionProgram;
    const plan: CompiledReactionPlan = {
      action: program,
      dependsOn: ['user'],
    };
    expect(plan.dependsOn).toEqual(['user']);

    expectTypeOf<CompiledReactionPlan>().toHaveProperty('action').toEqualTypeOf<CompiledActionProgram>();
    expectTypeOf<CompiledReactionPlan>().toHaveProperty('dependsOn').toEqualTypeOf<readonly string[]>();
    expectTypeOf<CompiledReactionPlan>().toHaveProperty('ignoreWritesTo').toEqualTypeOf<readonly string[] | undefined>();
  });

  it('keeps ReactionRegistration as the base type without force (preserves existing callers)', () => {
    const base: ReactionRegistration = {
      id: 'r1',
      dispose() {},
    };
    expect(base.id).toBe('r1');
    expectTypeOf(base).toHaveProperty('id').toEqualTypeOf<string>();
    expectTypeOf(base).toHaveProperty('dispose').toEqualTypeOf<() => void>();
    // base must NOT expose force.
    expectTypeOf<ReactionRegistration>().not.toHaveProperty('force');
  });

  it('exposes ForceableReactionRegistration as an extension that adds force(paths?)', () => {
    const extended: ForceableReactionRegistration = {
      id: 'r2',
      dispose() {},
      force(paths) {
        expect(Array.isArray(paths ?? [])).toBe(true);
      },
    };
    extended.force();
    extended.force(['user']);

    expectTypeOf<ForceableReactionRegistration>().toExtend<ReactionRegistration>();
    expectTypeOf<ForceableReactionRegistration>().toHaveProperty('force').toEqualTypeOf<
      (paths?: readonly string[]) => void
    >();
    // ReactionRegistration is assignable to ForceableReactionRegistration? No, force missing.
    expectTypeOf<ReactionRegistration>().not.toMatchTypeOf<ForceableReactionRegistration>();
  });

  it('exposes ReactionHandle with dispatch/force/ready/pause/resume/dispose/getDebugState', () => {
    const handle: ReactionHandle = {
      dispatch() {
        return Promise.resolve({ ok: true } as ActionResult);
      },
      force() {},
      ready() {},
      pause() {},
      resume() {},
      dispose() {},
      getDebugState() {
        return {
          phase: 'ready',
          fireCount: 0,
          pauseCount: 0,
          pendingChange: false,
          pendingChangedPaths: [],
          disposed: false,
        };
      },
    };

    // Touch the handle so eslint doesn't flag it as unused; the real
    // verification is the type-level expectTypeOf assertions below.
    expect(typeof handle.dispatch).toBe('function');

    expectTypeOf<ReactionHandle>().toHaveProperty('dispatch').toEqualTypeOf<
      (ctx?: { signal?: AbortSignal; evaluationBindings?: Record<string, unknown> }) => Promise<ActionResult>
    >();
    expectTypeOf<ReactionHandle>().toHaveProperty('force').toEqualTypeOf<(paths?: readonly string[]) => void>();
    expectTypeOf<ReactionHandle>().toHaveProperty('ready').toEqualTypeOf<() => void>();
    expectTypeOf<ReactionHandle>().toHaveProperty('pause').toEqualTypeOf<() => void>();
    expectTypeOf<ReactionHandle>().toHaveProperty('resume').toEqualTypeOf<() => void>();
    expectTypeOf<ReactionHandle>().toHaveProperty('dispose').toEqualTypeOf<() => void>();
    expectTypeOf<ReactionHandle>().toHaveProperty('getDebugState').toEqualTypeOf<() => ReactionHandleDebugState>();
  });

  it('RendererComponentProps exposes reactions channel (non-optional, defaults to {})', () => {
    expectTypeOf<RendererComponentProps>().toHaveProperty('reactions').toEqualTypeOf<
      Readonly<Record<string, ReactionHandle>>
    >();
  });
});
