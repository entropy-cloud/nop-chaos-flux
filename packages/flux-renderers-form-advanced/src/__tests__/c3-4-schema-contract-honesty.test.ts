import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  arrayEditorRendererDefinition,
  iconPickerRendererDefinition,
  keyValueRendererDefinition,
  tagListRendererDefinition,
} from '../index.js';

/**
 * C3.4 P1-1 guard: every schema-declared prop must be either a universal
 * bound-field key (resolved by the framework) or registered in the renderer
 * definition's `fields`. This freezes the adjudication that added the missing
 * registrations (`tags` / `addLabel` / `uniqueKeys` / `minItems` / `maxItems` /
 * `itemLabel`) — the "declared + consumed but never registered" contract gap
 * (generated flux-types and design-time metadata silently dropped the keys).
 * Mirrors the C3.2 composite-family honesty guard in the reverse direction.
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
const iconPickerPath = join(import.meta.dirname, '..', 'icon-picker.tsx');

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

const TARGETS = [
  { schema: 'TagListSchema', definition: tagListRendererDefinition },
  { schema: 'KeyValueSchema', definition: keyValueRendererDefinition },
  { schema: 'ArrayEditorSchema', definition: arrayEditorRendererDefinition },
];

const iconPickerTargets = [
  { schema: 'IconPickerSchema', sourcePath: iconPickerPath, definition: iconPickerRendererDefinition },
];

describe('C3.4 lightweight-editor family schema contract honesty (P1-1)', () => {
  const schemasSource = readFileSync(schemasPath, 'utf8');

  for (const { schema, definition } of TARGETS) {
    it(`every declared ${schema} key is registered or universal`, () => {
      const declared = parseInterfaceKeys(schemasSource, schema);
      const registered = new Set(fieldsKeys(definition));
      const phantom = declared.filter((key) => !UNIVERSAL_KEYS.has(key) && !registered.has(key));

      expect(phantom).toEqual([]);
    });
  }

  for (const { schema, sourcePath, definition } of iconPickerTargets) {
    it(`every declared ${schema} key is registered or universal`, () => {
      const declared = parseInterfaceKeys(readFileSync(sourcePath, 'utf8'), schema);
      const registered = new Set(fieldsKeys(definition));
      const phantom = declared.filter((key) => !UNIVERSAL_KEYS.has(key) && !registered.has(key));

      expect(phantom).toEqual([]);
    });
  }

  it('lightweight editors declare array valueKind validation contributors', () => {
    expect(
      keyValueRendererDefinition.validation && keyValueRendererDefinition.validation.kind === 'field',
    ).toBe(true);
    expect(
      arrayEditorRendererDefinition.validation && arrayEditorRendererDefinition.validation.kind === 'field',
    ).toBe(true);
  });

  it('icon-picker declares a field validation contributor so required is enforced', () => {
    const contributor = iconPickerRendererDefinition.validation;
    expect(contributor && contributor.kind === 'field').toBe(true);
    expect(contributor && contributor.valueKind).toBe('scalar');
  });
});
