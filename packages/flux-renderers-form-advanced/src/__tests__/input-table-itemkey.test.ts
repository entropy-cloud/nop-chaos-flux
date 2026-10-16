import { describe, expect, expectTypeOf, it } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { registerFormAdvancedRenderers } from '../index.js';
import type { InputTableSchema } from '../composite-field/composite-schemas.js';

/**
 * RM-12（plan 614）判别钉：数组容器行键 schema 属性统一为 `itemKey`。
 *
 * 判别机制：
 * - 类型面：`InputTableSchema` 经 `BoundFieldSchemaBase` → `BaseSchema` → `SchemaObject`
 *   带索引签名 `[key: string]: SchemaValue`，直接 `'rowKey' extends keyof T` 恒为 true
 *   零判别力，故用 `KnownKeys<T>` 剥离索引签名后判别。旧实现下 `KnownKeys` 含
 *   `'rowKey'` 而不含 `'itemKey'`，两条断言均挂。
 * - 元数据面：registry 的 `input-table` fields 由 `input-table-renderer.tsx` 的
 *   definition 提供（含 prop 覆盖声明）。旧实现下为 `{ key: 'rowKey', kind: 'prop' }`，
 *   断言必挂。
 */
// Key remapping drops the `[key: string]: SchemaValue` index-signature keys.
// (The naive `{ [K in keyof T]: string extends K ? never : K }[keyof T]` form
// degenerates to the *value* type when T carries an index signature, so it
// would silently assert against `SchemaValue` instead of the literal keys —
// verified live: with the naive form the `'rowKey'` negative pin does not even
// compile because the assertion is evaluated against the wrong type.)
type KnownKeys<T> = keyof {
  [K in keyof T as string extends K ? never : number extends K ? never : K]: never;
};

describe('RM-12 input-table itemKey unification', () => {
  it('InputTableSchema exposes itemKey and no rowKey key (index-signature-stripped)', () => {
    expectTypeOf<'itemKey'>().toExtend<KnownKeys<InputTableSchema>>();
    expectTypeOf<'rowKey'>().not.toExtend<KnownKeys<InputTableSchema>>();

    const schema: Pick<InputTableSchema, 'type' | 'item'> & { itemKey?: string } = {
      type: 'input-table',
      item: { type: 'text' },
      itemKey: 'sku',
    };
    expect(schema.itemKey).toBe('sku');
  });

  it('input-table registry fields declare itemKey (not rowKey)', () => {
    const registry = createRendererRegistry();
    registerFormAdvancedRenderers(registry);
    const definition = registry.get('input-table');
    expect(definition, 'input-table registered').toBeDefined();

    const fields = (definition as { fields?: Array<{ key: string; kind: string }> }).fields ?? [];
    const keys = fields.map((field) => field.key);
    expect(keys).toContain('itemKey');
    expect(keys).not.toContain('rowKey');
    expect(fields.find((field) => field.key === 'itemKey')?.kind).toBe('prop');
  });
});
