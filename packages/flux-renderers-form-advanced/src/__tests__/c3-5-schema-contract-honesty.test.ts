import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { treeControlRendererDefinitions } from '../tree-controls.js';

/**
 * C3.5 P1-1 guard (C3.4 P1-1 same-type): every schema-declared key of
 * InputTreeSchema / TreeSelectSchema must be either a universal bound-field
 * key (resolved by the framework) or registered in the renderer definition's
 * `fields` — otherwise the generated flux-types and design-time metadata
 * silently drop the consumed keys.
 *
 * The audited gap: `treeMode/childrenKey/labelField/valueField/cascade/
 * searchable/onlyLeaf/showPathLabel` (input-tree) and additionally
 * `clearable/placeholder` (tree-select) were consumed at runtime
 * (`tree-controls.tsx`) but never registered, so `flux-guide` generated
 * `InputTreeSchema`/`TreeSelectSchema` lost those keys.
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

const schemasPath = join(import.meta.dirname, '..', '..', '..', 'flux-renderers-form', 'src', 'schemas.ts');

function parseInterfaceKeys(source: string, interfaceName: string): string[] {
  const pattern = new RegExp(`export interface ${interfaceName}[^{]*\\{([\\s\\S]*?)\\n\\}`, 'm');
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`interface ${interfaceName} not found`);
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

const TREE_DEFINITIONS = {
  'InputTreeSchema': treeControlRendererDefinitions[0]!,
  'TreeSelectSchema': treeControlRendererDefinitions[1]!,
} as const;

describe('C3.5 tree family schema contract honesty (P1-1)', () => {
  const schemasSource = readFileSync(schemasPath, 'utf8');

  for (const [schemaName, definition] of Object.entries(TREE_DEFINITIONS)) {
    it(`every declared ${schemaName} key is registered or universal`, () => {
      const declared = parseInterfaceKeys(schemasSource, schemaName);
      const registered = new Set(fieldsKeys(definition));
      const phantom = declared.filter((key) => !UNIVERSAL_KEYS.has(key) && !registered.has(key));

      expect(phantom).toEqual([]);
    });
  }

  it('searchSource/childrenSource keep the actionValue contract (08-02 classification)', () => {
    for (const definition of Object.values(TREE_DEFINITIONS)) {
      const contracts = definition.propContracts ?? {};
      const searchShape = contracts.searchSource?.shape as
        | { kind?: string; actionValue?: boolean }
        | undefined;
      const childrenShape = contracts.childrenSource?.shape as
        | { kind?: string; actionValue?: boolean }
        | undefined;
      expect(searchShape).toBeDefined();
      expect(childrenShape).toBeDefined();
      expect(searchShape?.kind).toBe('schema-definition');
      expect(searchShape?.actionValue).toBe(true);
      expect(childrenShape?.actionValue).toBe(true);
    }
  });

  it('no deepFields declared on tree definitions (08-02 residual check)', () => {
    for (const definition of Object.values(TREE_DEFINITIONS)) {
      expect((definition as { deepFields?: unknown }).deepFields).toBeUndefined();
    }
  });
});
