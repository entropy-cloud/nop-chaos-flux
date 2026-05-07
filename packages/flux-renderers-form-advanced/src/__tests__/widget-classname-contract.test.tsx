import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index.js';

const SchemaRenderer = createSchemaRenderer([
  ...formRendererDefinitions,
  ...formAdvancedRendererDefinitions,
]);

const env = {
  fetcher: async <T,>() => ({ ok: true, status: 200, data: {} as T }),
  notify: () => undefined,
};

describe('advanced widget root className contract', () => {
  it('merges schema className into condition-builder root', () => {
    cleanup();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://advanced/widget-classname#condition-builder"
        schema={{
          type: 'form',
          body: [
            {
              type: 'condition-builder',
              name: 'rules',
              className: 'custom-condition-builder',
              fields: [{ name: 'status', label: 'Status', type: 'text' }],
            },
          ],
        } as any}
        env={env as any}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(container.querySelector('.nop-condition-builder.custom-condition-builder')).toBeTruthy();
  });

  it('merges schema className into tag-list, key-value, and array-editor roots', () => {
    cleanup();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://advanced/widget-classname#multi"
        schema={{
          type: 'form',
          data: { tags: [], metadata: [], reviewers: [] },
          body: [
            { type: 'tag-list', name: 'tags', tags: ['alpha'], className: 'custom-tag-list' },
            { type: 'key-value', name: 'metadata', className: 'custom-key-value' },
            { type: 'array-editor', name: 'reviewers', className: 'custom-array-editor' },
          ],
        } as any}
        env={env as any}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(container.querySelector('.nop-tag-list.custom-tag-list')).toBeTruthy();
    expect(container.querySelector('.nop-key-value.custom-key-value')).toBeTruthy();
    expect(container.querySelector('.nop-array-editor.custom-array-editor')).toBeTruthy();
  });

  it('merges schema className into input-tree and tree-select roots', () => {
    cleanup();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://advanced/widget-classname#tree-controls"
        schema={{
          type: 'form',
          data: { treeValue: [], departmentId: '' },
          body: [
            {
              type: 'input-tree',
              name: 'treeValue',
              className: 'custom-input-tree',
              options: [{ label: 'Root', value: 'root' }],
            },
            {
              type: 'tree-select',
              name: 'departmentId',
              className: 'custom-tree-select',
              options: [{ label: 'Engineering', value: 'eng' }],
            },
          ],
        } as any}
        env={env as any}
        formulaCompiler={createFormulaCompiler()}
      />, 
    );

    expect(container.querySelector('[data-slot="input-tree-control"].custom-input-tree')).toBeTruthy();
    expect(container.querySelector('[data-slot="tree-select-control"].custom-tree-select')).toBeTruthy();
  });
});
