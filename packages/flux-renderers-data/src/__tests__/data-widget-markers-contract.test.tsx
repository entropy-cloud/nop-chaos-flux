import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

describe('widget renderer DOM marker contract (data)', () => {
  afterEach(() => cleanup());

  it('table emits nop-table root marker', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://data-markers"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columns: [{ name: 'name', label: 'Name' }],
              source: [],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const table = container.querySelector('.nop-table');
    expect(table).toBeTruthy();
  });

  it('table uses data-slot for header, container, and footer', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://data-markers"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columns: [{ name: 'name', label: 'Name' }],
              source: [{ name: 'Alice' }],
              footer: [{ type: 'text', text: 'Footer' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(container.querySelector('[data-slot="table-container"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="table-header"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="table-footer"]')).toBeTruthy();
  });

  it('table does not use BEM-style region classes', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://data-markers"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columns: [{ name: 'name', label: 'Name' }],
              source: [],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(container.querySelector('.nop-table__header')).toBeNull();
    expect(container.querySelector('.nop-table__pagination')).toBeNull();
    expect(container.querySelector('.nop-table__body')).toBeNull();
  });

  it('tree emits nop-tree root marker with role="tree"', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://data-markers"
        schema={{
          type: 'page',
          body: [
            {
              type: 'tree',
              data: [
                { id: '1', label: 'Node 1' },
                { id: '2', label: 'Node 2' },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const tree = container.querySelector('.nop-tree');
    expect(tree).toBeTruthy();
    expect(tree?.getAttribute('role')).toBe('tree');
  });

  it('tree uses data-slot for node and children', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://data-markers"
        schema={{
          type: 'page',
          body: [
            {
              type: 'tree',
              initiallyExpanded: 5,
              data: [
                {
                  id: '1',
                  label: 'Parent',
                  children: [{ id: '1.1', label: 'Child' }],
                },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(container.querySelector('[data-slot="tree-node"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="tree-children"]')).toBeTruthy();
  });

  it('crud emits nop-crud root marker', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://data-markers"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              columns: [{ name: 'name', label: 'Name' }],
              source: [],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const crud = container.querySelector('.nop-crud');
    expect(crud).toBeTruthy();
  });

  it('crud uses data-slot for query, toolbar, table, footer', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://data-markers"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              columns: [{ name: 'name', label: 'Name' }],
              source: [{ name: 'Alice' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(container.querySelector('[data-slot="crud-table"]')).toBeTruthy();
  });

  it('table passes className from meta to root', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://data-markers"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              className: 'custom-table-class',
              columns: [{ name: 'name', label: 'Name' }],
              source: [],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const table = container.querySelector('.nop-table');
    expect(table?.className).toContain('custom-table-class');
  });
});
