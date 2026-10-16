import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ActionSchema, BaseSchema, ReactionSchema, SourceActionSchema } from '../index.js';

type CoreExports = typeof import('../index.js');

/**
 * RM-10（plan 612）判别钉：action 形状类型单源 `ActionSchema`，事件字段声明类型
 * 单一形态 `ActionSchema | ActionSchema[]`。
 */
describe('RM-10 event field type unification', () => {
  it('event fields accept both single and array action forms (union face)', () => {
    const single: BaseSchema['onMount'] = { action: 'toast', args: { message: 'hi' } };
    const array: BaseSchema['onUnmount'] = [{ action: 'toast' }, { action: 'refreshNearest' }];
    expect(single).toBeDefined();
    expect(array).toHaveLength(2);

    expectTypeOf<NonNullable<BaseSchema['onMount']>>().toEqualTypeOf<ActionSchema | ActionSchema[]>();
    expectTypeOf<NonNullable<BaseSchema['onUnmount']>>().toEqualTypeOf<ActionSchema | ActionSchema[]>();
  });

  it('chain fields (parallel/then/onError/onSettled) self-reference ActionSchema', () => {
    const chained: ActionSchema = {
      action: 'ajax',
      args: {} as never,
      then: [{ action: 'toast' }],
      onError: { action: 'toast' },
      parallel: [{ action: 'toast' }],
    };
    expect(chained.action).toBe('ajax');

    expectTypeOf<ActionSchema['then']>().toEqualTypeOf<ActionSchema | ActionSchema[] | undefined>();
    expectTypeOf<ActionSchema['parallel']>().toEqualTypeOf<ActionSchema[] | undefined>();
  });

  it('Like aliases are deleted from the public export surface (negative import probe)', () => {
    expectTypeOf<'ActionSchemaLike' extends keyof CoreExports ? true : false>().toEqualTypeOf<false>();
    expectTypeOf<'ActionShapeLikeFields' extends keyof CoreExports ? true : false>().toEqualTypeOf<false>();
  });

  it('source/formula data-source configs and reactions ride the single ActionSchema shape', () => {
    const source: SourceActionSchema = { action: 'fetch', formula: 'x' };
    const reaction: ReactionSchema = {
      type: 'reaction',
      watch: 'query',
      actions: { action: 'setValue', args: {} as never },
    };
    expect(source.formula).toBe('x');
    expect(reaction.actions.action).toBe('setValue');

    expectTypeOf<ReactionSchema['actions']>().toEqualTypeOf<ActionSchema>();
    expectTypeOf<SourceActionSchema>().toExtend<{ action?: string; formula?: unknown }>();
  });
});
