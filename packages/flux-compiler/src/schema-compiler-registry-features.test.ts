import { describe, expect, it } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import {
  importHostRenderer,
  createTestCompiler,
} from './schema-compiler-registry-fixtures.js';

describe('createSchemaCompiler', () => {
  it('preserves xui:imports on compiled schema for runtime registration', () => {
    const compiler = createTestCompiler([importHostRenderer]);

    const compiled = compiler.compile({
      type: 'import-host',
      'xui:imports': [
        {
          from: 'demo-lib',
          as: 'demo',
        },
      ],
    });
    const node = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;

    expect(node.schema['xui:imports']).toEqual([{ from: 'demo-lib', as: 'demo' }]);
  });

  it('extracts table operation buttons into compiled regions', () => {
    const tableRenderer: RendererDefinition = {
      type: 'table',
      component: () => null,
    };
    const buttonRenderer: RendererDefinition = {
      type: 'button',
      component: () => null,
    };
    const compiler = createTestCompiler([tableRenderer, buttonRenderer]);

    const compiled = compiler.compile({
      type: 'table',
      columns: [
        {
          type: 'operation',
          label: 'Actions',
          buttons: [{ type: 'button', label: 'Inspect' }],
        },
      ],
    });
    const node = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;

    expect(node.regions['columns.0.buttons']?.node).toBeTruthy();
    expect(node.propsProgram.value.columns[0].buttons).toBeUndefined();
    expect(node.propsProgram.value.columns[0].buttonsRegionKey).toBe('columns.0.buttons');
  });

  it('extracts table column label fragments into compiled regions', () => {
    const tableRenderer: RendererDefinition = {
      type: 'table',
      component: () => null,
    };
    const textRendererLocal: RendererDefinition = {
      type: 'text',
      component: () => null,
    };
    const compiler = createTestCompiler([tableRenderer, textRendererLocal]);

    const compiled = compiler.compile({
      type: 'table',
      columns: [
        {
          label: { type: 'text', text: 'Member header' },
          name: 'name',
        },
      ],
    });
    const node = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;

    expect(node.regions['columns.0.label']?.node).toBeTruthy();
    expect(node.propsProgram.value.columns[0].label).toBeUndefined();
    expect(node.propsProgram.value.columns[0].labelRegionKey).toBe('columns.0.label');
  });

  it('extracts table column cell fragments into compiled regions', () => {
    const tableRenderer: RendererDefinition = {
      type: 'table',
      component: () => null,
    };
    const textRendererLocal: RendererDefinition = {
      type: 'text',
      component: () => null,
    };
    const compiler = createTestCompiler([tableRenderer, textRendererLocal]);

    const compiled = compiler.compile({
      type: 'table',
      columns: [
        {
          label: 'Member',
          name: 'name',
          cell: { type: 'text', text: 'User ${$slot.record.name}' },
        },
      ],
    });
    const node = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;

    expect(node.regions['columns.0.cell']?.node).toBeTruthy();
    expect(node.propsProgram.value.columns[0].cell).toBeUndefined();
    expect(node.propsProgram.value.columns[0].cellRegionKey).toBe('columns.0.cell');
  });

  it('treats table empty as a plain prop or compiled region based on field metadata', () => {
    const tableRenderer: RendererDefinition = {
      type: 'table',
      component: () => null,
      fields: [{ key: 'empty', kind: 'value-or-region', regionKey: 'empty' }],
    };
    const textRendererLocal: RendererDefinition = {
      type: 'text',
      component: () => null,
    };
    const compiler = createTestCompiler([tableRenderer, textRendererLocal]);

    const plainCompiled = compiler.compile({
      type: 'table',
      empty: 'Nothing here',
    });
    const regionCompiled = compiler.compile({
      type: 'text',
      empty: { type: 'text', text: 'No rows' },
    });
    const plainNode = Array.isArray(plainCompiled.root)
      ? plainCompiled.root[0]
      : plainCompiled.root;
    const regionNode = Array.isArray(regionCompiled.root)
      ? regionCompiled.root[0]
      : regionCompiled.root;

    expect(plainNode.propsProgram.value.empty).toBe('Nothing here');
    expect(plainNode.regions.empty).toBeUndefined();
    expect(regionNode.propsProgram?.value?.empty).toEqual({ type: 'text', text: 'No rows' });
    expect(regionNode.regions?.empty).toBeUndefined();
  });
});
