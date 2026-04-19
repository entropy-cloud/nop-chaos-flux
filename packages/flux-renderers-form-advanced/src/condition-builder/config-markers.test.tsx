import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { conditionBuilderRendererDefinition } from '../index';
import { baseEnv, formulaCompiler } from '../test-support';

describe('condition-builder markers', () => {
  it('uses data-slot markers for internal group and item structure', async () => {
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      conditionBuilderRendererDefinition,
    ]);

    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/condition-builder/config-markers.test.tsx#1"
        schema={{
          type: 'condition-builder',
          name: 'filters',
          embed: true,
          fields: [{ name: 'status', label: 'Status', type: 'text' }],
        }}
        data={{ filters: { id: 'root', conjunction: 'and', children: [{ id: 'item-1', left: { type: 'field', field: 'status' }, op: 'eq', right: 'active' }] } }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(container.querySelector('.nop-condition-builder')).toBeTruthy();
    expect(container.querySelector('[data-slot="field-control"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="condition-group"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="condition-item"]')).toBeTruthy();
    expect(container.querySelector('.nop-cb-group')).toBeNull();
    expect(container.querySelector('.nop-cb-item')).toBeNull();
  });
});
