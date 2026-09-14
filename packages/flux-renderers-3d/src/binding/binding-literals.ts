import { unwrapPreservedLiteral } from '@nop-chaos/flux-react';
import type { DataBinding } from '../schemas.js';

/**
 * schema 面字面量保留位解包（plan 469 Fix）。
 *
 * renderer-definitions 的 `bindings` propContract 以 schema-definition + literal
 * fieldRules（sourceKey: expression/convert）声明字面量保留位：编译器将
 * `source.expression` / `condition.expression` / `transform.convert` 包成
 * `{ __nopPreserveLiteral: true, value }` 信封，阻止 props 表达式求值机制把
 * `${expr}` 在 props 层吃掉（表达式一元化：绑定桥才是求值入口，design-data-binding.md §1）。
 * 渲染器侧在绑定桥入口统一解包；非信封值原样透传（JS 直调/hook 级单测不受影响）。
 */

function unwrapLiteral(input: unknown): unknown {
  const unwrapped = unwrapPreservedLiteral(input);
  return unwrapped === undefined ? input : unwrapped;
}

export function normalizePreservedBinding(input: unknown): DataBinding {
  const binding = input as DataBinding;
  const source = {
    ...binding.source,
    expression: unwrapLiteral(binding.source?.expression) as string,
  };
  const condition = binding.condition
    ? {
        ...binding.condition,
        expression: unwrapLiteral(binding.condition.expression) as string,
      }
    : undefined;
  const transform =
    binding.transform && binding.transform.convert !== undefined
      ? {
          ...binding.transform,
          convert: unwrapLiteral(binding.transform.convert) as string,
        }
      : binding.transform;
  return { ...binding, source, condition, transform };
}

export function normalizePreservedBindings(bindings: readonly DataBinding[] | undefined): DataBinding[] | undefined {
  return bindings?.map((binding) => normalizePreservedBinding(binding));
}
