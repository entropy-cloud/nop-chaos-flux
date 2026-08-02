import { describe, expect, it } from 'vitest';
import type { FluxSchemaDefinitionShape } from './manifest.js';
import type { SchemaFieldKind, SchemaFieldRule } from '../types/schema.js';
import { matchesFluxValueShape } from './value-shape-runtime.js';

const dropdownItemShape: FluxSchemaDefinitionShape = {
  kind: 'schema-definition',
  fieldRules: {
    label: 'value',
    disabled: 'value',
    destructive: 'value',
    action: 'event',
    onClick: 'event',
  },
};

describe('schema-definition shape matching', () => {
  it('matches fully static dropdown items with enveloped action fields', () => {
    const items = [
      {
        label: 'Edit',
        action: { action: 'openDialog', args: { title: 'Edit' } },
      },
      {
        label: 'Delete',
        onClick: { action: 'confirm', args: { message: 'Sure?' } },
        destructive: true,
      },
    ];

    expect(matchesFluxValueShape(items, { kind: 'array', item: dropdownItemShape })).toBe(true);
    expect(matchesFluxValueShape(items[0], dropdownItemShape)).toBe(true);
  });

  it('rejects items whose action field is not action-shaped', () => {
    const bad = [{ label: 'Edit', action: { args: { title: 'no action key' } } }];

    expect(matchesFluxValueShape(bad, { kind: 'array', item: dropdownItemShape })).toBe(false);
  });

  it('rejects non-object, non-array values', () => {
    expect(matchesFluxValueShape('edit', dropdownItemShape)).toBe(false);
    expect(matchesFluxValueShape(42, dropdownItemShape)).toBe(false);
  });

  it('passes unknown keys (loose mode) and expression-evaluated value fields', () => {
    expect(
      matchesFluxValueShape(
        [{ label: '${row.label}', icon: 'Pencil', action: { action: 'openDialog' } }],
        { kind: 'array', item: dropdownItemShape },
      ),
    ).toBe(true);
  });

  it('honors required object-form rules', () => {
    const shape: FluxSchemaDefinitionShape = {
      kind: 'schema-definition',
      fieldRules: {
        url: { kind: 'value', required: true, valueType: 'string', nonEmpty: true },
        method: { kind: 'value' },
      },
    };

    expect(matchesFluxValueShape({ method: 'post' }, shape)).toBe(false);
    expect(matchesFluxValueShape({ url: '/r/entity', method: 'post' }, shape)).toBe(true);
    expect(matchesFluxValueShape({ url: '/r/entity', method: 'post', extra: 1 }, shape)).toBe(true);
  });

  it('matches schema and schema-array fields by container form', () => {
    const shape: FluxSchemaDefinitionShape = {
      kind: 'schema-definition',
      fieldRules: {
        body: 'schema',
        actions: 'schema-array',
        onClose: 'action',
      },
    };

    expect(
      matchesFluxValueShape(
        {
          body: { type: 'form', body: [{ type: 'input-text', name: 'x' }] },
          actions: [{ type: 'button', label: 'OK' }],
          onClose: [{ action: 'closeSurface' }],
        },
        shape,
      ),
    ).toBe(true);

    expect(
      matchesFluxValueShape(
        {
          body: { type: 'form' },
          actions: { type: 'button', label: 'OK' },
        },
        shape,
      ),
    ).toBe(false);
  });

  it('supports actionValue whole-value semantics (single ActionSchema)', () => {
    const actionValueShape: FluxSchemaDefinitionShape = {
      kind: 'schema-definition',
      fieldRules: {},
      actionValue: true,
    };

    expect(
      matchesFluxValueShape({ action: 'ajax', args: { url: '/r/x' } }, actionValueShape),
    ).toBe(true);

    expect(matchesFluxValueShape({ args: { url: '/r/x' } }, actionValueShape)).toBe(false);
    expect(matchesFluxValueShape('/r/x', actionValueShape)).toBe(false);
  });
});

describe('unified SchemaFieldKind vocabulary', () => {
  it('covers the nested classification kinds within the unified vocabulary', () => {
    const kinds: SchemaFieldKind[] = [
      'meta',
      'prop',
      'value',
      'region',
      'value-or-region',
      'schema',
      'schema-array',
      'event',
      'action',
      'literal',
      'reaction',
      'ignored',
    ];

    const spec: SchemaFieldRule | SchemaFieldKind = kinds[0];
    expect(typeof spec).toBe('string');
    expect(kinds.length).toBe(12);
  });

  it('accepts object-form rules in fieldRules', () => {
    const shape: FluxSchemaDefinitionShape = {
      kind: 'schema-definition',
      fieldRules: {
        url: { kind: 'prop', required: true, valueType: 'string', nonEmpty: true },
        data: { kind: 'prop', valueType: 'object' },
      },
    };

    expect(matchesFluxValueShape({ url: '/r/x', data: { a: 1 } }, shape)).toBe(true);
  });

  it('accepts SchemaFieldRule object form carrying params/isolate/regionKey', () => {
    const shape: FluxSchemaDefinitionShape = {
      kind: 'schema-definition',
      fieldRules: {
        title: {
          kind: 'value-or-region',
          regionKey: 'titleRegionKey',
          params: ['item', 'index', 'key'],
          isolate: false,
        },
        body: {
          kind: 'region',
          regionKey: 'bodyRegionKey',
          regionKeySuffix: 'body',
          params: ['item', 'index', 'key'],
        },
        disabled: 'literal',
      },
    };

    expect(matchesFluxValueShape({ title: 'A', disabled: true }, shape)).toBe(true);
    expect(matchesFluxValueShape({ title: { type: 'text' }, disabled: false }, shape)).toBe(true);
  });

  it('supports value-or-region fields (either value or schema input)', () => {
    const shape: FluxSchemaDefinitionShape = {
      kind: 'schema-definition',
      fieldRules: {
        searchable: 'value-or-region',
      },
    };

    expect(matchesFluxValueShape({ searchable: true }, shape)).toBe(true);
    expect(matchesFluxValueShape({ searchable: { type: 'input-text', name: 'q' } }, shape)).toBe(
      true,
    );
  });
});
