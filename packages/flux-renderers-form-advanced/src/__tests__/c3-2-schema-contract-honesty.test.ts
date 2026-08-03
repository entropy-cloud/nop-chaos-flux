import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  arrayFieldRendererDefinition,
  detailFieldRendererDefinition,
  detailViewRendererDefinition,
  objectFieldRendererDefinition,
  variantFieldRendererDefinition,
} from '../index.js';

/**
 * C3.2 P1-1/P1-2 guard: every schema-declared prop must be either a universal
 * bound-field key (resolved by the framework) or registered in the renderer
 * definition's `fields`. This freezes the adjudication that removed the phantom
 * declarations (schema type says X but zero implementation consumes X) from
 * `composite-schemas.ts` — the same contract-drift class as C3.1 P1-1.
 *
 * Deliberate exceptions:
 * - VariantFieldSchema transformInAction/transformOutAction/validateValueAction:
 *   top-level zero behavior but explicitly registered as `kind: 'ignored'`
 *   (per-variant declarations own the semantics) — recorded as variant-field
 *   card P3-2.
 * - VariantOption: nested option shape consumed via `propContracts.fieldRules`
 *   (content/viewer → region, match → literal) — declared here for the guard.
 */
const UNIVERSAL_KEYS = new Set([
  // BaseSchema
  'type', 'id', 'name', 'label', 'title', 'className', 'frameClassName',
  'classAliases', 'when', 'visible', 'hidden', 'disabled', 'testid',
  'frameWrap', 'validateOn', 'showErrorOn', 'onMount', 'onUnmount',
  'xui:imports',
  // BoundFieldSchemaBase
  'readOnly', 'required', 'mode', 'labelAlign', 'labelWidth', 'hint',
  'description', 'remark', 'labelRemark', 'labelClassName', 'inputClassName',
  'descriptionClassName',
  // formFieldRules extras
  'value',
]);

const ADJUDICATED_EXCEPTIONS: Record<string, string[]> = {
  VariantFieldSchema: ['transformInAction', 'transformOutAction', 'validateValueAction'],
  VariantOption: ['key', 'label', 'viewer', 'content', 'match', 'initialValue', 'transformInAction'],
};

const schemasPath = join(import.meta.dirname, '..', 'composite-field', 'composite-schemas.ts');
const schemasSource = readFileSync(schemasPath, 'utf8');

function parseInterfaceKeys(interfaceName: string): string[] {
  const pattern = new RegExp(`export interface ${interfaceName}[^{]*\\{([\\s\\S]*?)\\n\\}`, 'm');
  const match = schemasSource.match(pattern);
  if (!match) {
    throw new Error(`interface ${interfaceName} not found in composite-schemas.ts`);
  }

  const keys: string[] = [];
  for (const line of match[1].split('\n')) {
    const keyMatch = line.match(/^\s{2}(?:'([^']+)'|([A-Za-z0-9_-]+))\??:/);
    if (keyMatch) {
      keys.push(keyMatch[1] ?? keyMatch[2]);
    }
  }
  return keys;
}

function fieldsKeys(definition: { fields?: ReadonlyArray<{ key?: string }> }): string[] {
  return (definition.fields ?? []).flatMap((field) => (field.key ? [field.key] : []));
}

const TARGETS = [
  { schema: 'ObjectFieldSchema', definition: objectFieldRendererDefinition },
  { schema: 'ArrayFieldSchema', definition: arrayFieldRendererDefinition },
  { schema: 'VariantFieldSchema', definition: variantFieldRendererDefinition },
  { schema: 'DetailFieldSchema', definition: detailFieldRendererDefinition },
  { schema: 'DetailViewSchema', definition: detailViewRendererDefinition },
];

describe('C3.2 composite-family schema contract honesty (P1-1/P1-2)', () => {
  for (const { schema, definition } of TARGETS) {
    it(`every declared ${schema} key is registered or universal`, () => {
      const declared = parseInterfaceKeys(schema);
      const registered = new Set(fieldsKeys(definition));
      const exceptions = new Set(ADJUDICATED_EXCEPTIONS[schema] ?? []);
      const phantom = declared.filter(
        (key) => !UNIVERSAL_KEYS.has(key) && !registered.has(key) && !exceptions.has(key),
      );

      expect(phantom).toEqual([]);
    });
  }

  it('nested VariantOption carries no unregistered behavior keys', () => {
    const declared = parseInterfaceKeys('VariantOption');
    const allowed = new Set([...(ADJUDICATED_EXCEPTIONS.VariantOption ?? [])]);
    const phantom = declared.filter((key) => !allowed.has(key));

    expect(phantom).toEqual([]);
  });

  it('DetailSurfaceConfig declares only keys the detail surface implements', () => {
    const declared = parseInterfaceKeys('DetailSurfaceConfig');
    const allowed = new Set(['mode', 'title', 'size', 'placement']);
    const phantom = declared.filter((key) => !allowed.has(key));

    expect(phantom).toEqual([]);
  });
});
