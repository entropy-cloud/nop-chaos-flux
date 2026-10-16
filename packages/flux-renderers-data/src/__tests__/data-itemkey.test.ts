import { describe, expect, expectTypeOf, it } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { registerDataRenderers } from '../index.js';
import type { TableSchema } from '../schemas.js';
import type { CrudSchema } from '../crud-schema.js';

/**
 * RM-13（plan 615）判别钉：data 族行标识 schema 属性统一为 `itemKey`。
 *
 * 判别机制：
 * - 类型面：`TableSchema`/`CrudSchema` 经 `BaseSchema` → `SchemaObject` 带索引签名
 *   `[key: string]: SchemaValue`，直接 `'rowKey' extends keyof T` 恒为 true 零判别力，
 *   故用 key 重映射 `KnownKeys<T>` 剥离索引签名后判别。旧实现下 `KnownKeys` 含
 *   `'rowKey'` 而不含 `'itemKey'`，两组断言均挂（typecheck 红）。
 * - 元数据面：registry 的 `table`/`crud` fields 由 data-renderer-definitions 提供。
 *   旧实现下为 `{ key: 'rowKey', kind: 'prop' }`，断言必挂。
 */
type KnownKeys<T> = keyof {
  [K in keyof T as string extends K ? never : number extends K ? never : K]: never;
};

describe('RM-13 data family itemKey unification', () => {
  it('TableSchema exposes itemKey and no rowKey key', () => {
    expectTypeOf<'itemKey'>().toExtend<KnownKeys<TableSchema>>();
    expectTypeOf<'rowKey'>().not.toExtend<KnownKeys<TableSchema>>();
  });

  it('CrudSchema exposes itemKey and no rowKey key', () => {
    expectTypeOf<'itemKey'>().toExtend<KnownKeys<CrudSchema>>();
    expectTypeOf<'rowKey'>().not.toExtend<KnownKeys<CrudSchema>>();
  });

  it('table/crud registry fields declare itemKey (not rowKey)', () => {
    const registry = createRendererRegistry();
    registerDataRenderers(registry);

    for (const type of ['table', 'crud'] as const) {
      const definition = registry.get(type);
      expect(definition, `${type} registered`).toBeDefined();
      const fields =
        (definition as { fields?: Array<{ key: string; kind: string }> }).fields ?? [];
      const keys = fields.map((field) => field.key);
      expect(keys, `${type} fields`).toContain('itemKey');
      expect(keys, `${type} fields`).not.toContain('rowKey');
    }
  });
});
