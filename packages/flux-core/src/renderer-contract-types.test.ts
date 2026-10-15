import { describe, expectTypeOf, it } from 'vitest';
import type {
  BaseSchema,
  CompiledRendererContract,
  RendererDefinitionShape,
  ValidationContributor,
} from './index.js';

/**
 * RM-1 (plan 603) type pins: the compiled renderer contract must stay a
 * declared-type derivation of the renderer definition shape subset. A
 * reintroduced hand-copy that drifts from `ValidationContributor` /
 * `RendererValidationDefaults` (e.g. missing a future field) must fail here
 * at compile time instead of silently forking the contract.
 */
describe('CompiledRendererContract single-source derivation (RM-1)', () => {
  it('validation channel is exactly ValidationContributor, not a hand-copy', () => {
    expectTypeOf<CompiledRendererContract<BaseSchema>['validation']>().toEqualTypeOf<
      ValidationContributor<BaseSchema> | undefined
    >();
  });

  it('validationDefaults channel is exactly RendererValidationDefaults', () => {
    expectTypeOf<CompiledRendererContract<BaseSchema>['validationDefaults']>().toEqualTypeOf<
      RendererDefinitionShape<BaseSchema>['validationDefaults']
    >();
  });

  it('scopePolicy channel is exactly ScopePolicy', () => {
    expectTypeOf<CompiledRendererContract<BaseSchema>['scopePolicy']>().toEqualTypeOf<
      RendererDefinitionShape<BaseSchema>['scopePolicy']
    >();
  });
});
