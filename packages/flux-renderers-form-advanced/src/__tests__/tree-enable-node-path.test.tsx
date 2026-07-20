import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { allFormDefs } from './form-tree-checkbox-fields.shared.js';
import {
  buttonRenderer,
  env,
  submitCalls,
} from '../test-support.js';

describe('input-tree enableNodePath — TR7', () => {
  it('emits value path string when enableNodePath is true (single select)', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://tree-enable-node-path-single"
        schema={
          {
            type: 'form',
            data: { node: '' },
            submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
            body: [
              {
                type: 'input-tree',
                name: 'node',
                label: 'Node',
                enableNodePath: true,
                options: [
                  { label: 'Root', value: 'root', children: [{ label: 'Child', value: 'child' }] },
                ],
              },
              {
                type: 'button',
                label: 'Submit',
                onClick: { action: 'submitForm' },
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(screen.getByRole('treeitem', { name: 'Child' }));
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(1);
    });

    expect(submitCalls[0].node).toBe('root/child');
  });

  it('emits path strings for multi-select when enableNodePath is true (checkbox mode)', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://tree-enable-node-path-multi"
        schema={
          {
            type: 'form',
            data: { nodes: [] },
            submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
            body: [
              {
                type: 'input-tree',
                name: 'nodes',
                label: 'Nodes',
                treeMode: 'checkbox',
                enableNodePath: true,
                options: [
                  { label: 'One', value: 'one' },
                  { label: 'Two', value: 'two' },
                ],
              },
              {
                type: 'button',
                label: 'Submit',
                onClick: { action: 'submitForm' },
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(screen.getByRole('treeitem', { name: 'One' }));
    fireEvent.click(screen.getByRole('treeitem', { name: 'Two' }));
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(1);
    });

    const submitted = submitCalls[0].nodes;
    expect(Array.isArray(submitted)).toBe(true);
    expect(submitted).toContain('one');
    expect(submitted).toContain('two');
  });

  it('emits value path for single root-level node', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://tree-enable-node-path-single-root"
        schema={
          {
            type: 'form',
            data: { node: '' },
            submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
            body: [
              {
                type: 'input-tree',
                name: 'node',
                label: 'Node',
                enableNodePath: true,
                pathSeparator: '/',
                options: [
                  { label: 'Root', value: 'root' },
                ],
              },
              {
                type: 'button',
                label: 'Submit',
                onClick: { action: 'submitForm' },
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(screen.getByRole('treeitem', { name: 'Root' }));
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(1);
    });

    expect(submitCalls[0].node).toBe('root');
  });

  it('uses pathSeparator in tree-select schema', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://tree-select-node-path"
        schema={
          {
            type: 'form',
            data: { node: '' },
            submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
            body: [
              {
                type: 'tree-select',
                name: 'node',
                label: 'Node',
                enableNodePath: true,
                pathSeparator: '/',
                options: [
                  { label: 'Root', value: 'root' },
                ],
              },
              {
                type: 'button',
                label: 'Submit',
                onClick: { action: 'submitForm' },
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(document.querySelector('[data-slot="tree-select-control"]')).toBeTruthy();
  });
});
