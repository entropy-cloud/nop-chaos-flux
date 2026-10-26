import { describe, expect, it } from 'vitest';
import type { NopSchemaPatch } from './types.js';
import {
  MAX_PATCH_OPS,
  validateSchemaPatchShape,
  type PatchTargetResolvers,
} from './schema-patch.js';

function makePatch(overrides: Partial<NopSchemaPatch> = {}): NopSchemaPatch {
  return {
    id: 'patch-1',
    createdAt: 1_700_000_000_000,
    scope: { controllerId: 'ctrl-a', target: { cid: 42 } },
    ops: [{ type: 'set-prop', field: 'label', value: 'New label' }],
    reason: 'fix wrong label',
    ...overrides,
  };
}

function makeResolvers(overrides: Partial<PatchTargetResolvers> = {}): PatchTargetResolvers {
  return {
    inspectByCid: (cid) => (cid === 42 ? { cid: 42 } : undefined),
    getComponentTree: () => [
      { cid: 42, nodeId: 'node_42', path: '/page/form/name' },
      { cid: 43, nodeId: 'node_43', path: '/page/form/age' },
    ],
    ...overrides,
  };
}

function validate(patch: NopSchemaPatch, resolvers = makeResolvers()) {
  return validateSchemaPatchShape(patch, { controllerId: 'ctrl-a' }, resolvers);
}

describe('schema patch validation (contract)', () => {
  it('accepts a well-formed patch with a resolvable cid target', () => {
    const result = validate(makePatch());
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.resolvedTarget).toMatchObject({ cid: 42 });
  });

  it('rejects cross-controller scope (越权拒绝 discriminator)', () => {
    const result = validate(makePatch({ scope: { controllerId: 'ctrl-b', target: { cid: 42 } } }));
    expect(result.ok).toBe(false);
    expect(result.errors.join('; ')).toContain('cross-controller');
  });

  it('rejects structurally-expressible op types at runtime (untrusted JSON)', () => {
    const patch = makePatch();
    (patch.ops as Array<Record<string, unknown>>).push({ type: 'remove-node', field: 'x' });
    const result = validate(patch);
    expect(result.ok).toBe(false);
    expect(result.errors.join('; ')).toContain('unsupported op type');
  });

  it('rejects set-prop/set-expression payload conflicts (mutual exclusion)', () => {
    const withExpression = validate(
      makePatch({
        ops: [{ type: 'set-prop', field: 'label', value: 'x', expression: 'foo' } as never],
      }),
    );
    expect(withExpression.ok).toBe(false);
    expect(withExpression.errors.join('; ')).toContain('op field conflict');

    const withValue = validate(
      makePatch({
        ops: [{ type: 'set-expression', field: 'visible', value: true, expression: 'a > 1' } as never],
      }),
    );
    expect(withValue.ok).toBe(false);
    expect(withValue.errors.join('; ')).toContain('op field conflict');
  });

  it('rejects empty and oversized ops arrays', () => {
    const empty = validate(makePatch({ ops: [] }));
    expect(empty.errors.join('; ')).toContain('ops empty');

    const tooMany = validate(
      makePatch({
        ops: Array.from({ length: MAX_PATCH_OPS + 1 }, (_, i) => ({
          type: 'set-prop' as const,
          field: `f${i}`,
          value: i,
        })),
      }),
    );
    expect(tooMany.errors.join('; ')).toContain('too many ops');
  });

  it('rejects patches with missing id or createdAt', () => {
    const noId = validate(makePatch({ id: '' }));
    expect(noId.errors.join('; ')).toContain('id');

    const noCreatedAt = validate(makePatch({ createdAt: 'x' as never }));
    expect(noCreatedAt.errors.join('; ')).toContain('createdAt');
  });

  it('rejects targets with no selector', () => {
    const result = validate(makePatch({ scope: { controllerId: 'ctrl-a', target: {} } }));
    expect(result.ok).toBe(false);
    expect(result.errors.join('; ')).toContain('target not resolved');
  });

  it('fails closed on absent or non-record scope.target (closure-audit M1 discriminator)', () => {
    const absent = makePatch();
    delete (absent.scope as { target?: unknown }).target;
    const absentResult = validate(absent);
    expect(absentResult.ok).toBe(false);
    expect(absentResult.errors.join('; ')).toContain('target not resolved');

    const nullTarget = validate(
      makePatch({ scope: { controllerId: 'ctrl-a', target: null as never } }),
    );
    expect(nullTarget.ok).toBe(false);
    expect(nullTarget.errors.join('; ')).toContain('target not resolved');
  });

  it('rejects unresolvable cid and unresolvable nodeId/path', () => {
    const badCid = validate(makePatch({ scope: { controllerId: 'ctrl-a', target: { cid: 999 } } }));
    expect(badCid.errors.join('; ')).toContain('target not resolved');

    const badPath = validate(
      makePatch({ scope: { controllerId: 'ctrl-a', target: { path: '/nope' } } }),
    );
    expect(badPath.errors.join('; ')).toContain('target not resolved');
  });

  it('resolves nodeId/path through the live component tree', () => {
    const result = validate(
      makePatch({ scope: { controllerId: 'ctrl-a', target: { nodeId: 'node_43' } } }),
    );
    expect(result.ok).toBe(true);
    expect(result.resolvedTarget).toMatchObject({ cid: 43, nodeId: 'node_43' });
  });

  it('rejects ambiguous targets (cid vs nodeId mismatch; multi-hit path)', () => {
    const mismatch = validate(
      makePatch({ scope: { controllerId: 'ctrl-a', target: { cid: 42, nodeId: 'node_43' } } }),
    );
    expect(mismatch.ok).toBe(false);
    expect(mismatch.errors.join('; ')).toContain('ambiguous target');

    const multiPath = validate(
      makePatch({
        scope: { controllerId: 'ctrl-a', target: { path: '/page/form/name' } },
      }),
      makeResolvers({
        getComponentTree: () => [
          { cid: 42, nodeId: 'node_42', path: '/page/form/name' },
          { cid: 44, nodeId: 'node_44', path: '/page/form/name' },
        ],
      }),
    );
    expect(multiPath.ok).toBe(false);
    expect(multiPath.errors.join('; ')).toContain('ambiguous target');
  });

  it('rejects non-string/empty field names', () => {
    const result = validate(
      makePatch({ ops: [{ type: 'set-prop', field: '', value: 1 }] }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors.join('; ')).toContain('field');
  });
});
