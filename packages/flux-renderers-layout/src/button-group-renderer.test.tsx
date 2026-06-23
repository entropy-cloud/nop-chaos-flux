// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createLayoutSchemaRenderer, env, formulaCompiler } from './test-support.js';

function groupRoot() {
  return document.querySelector('.nop-button-group') as HTMLElement;
}

function groupItems() {
  return document.querySelectorAll('[data-slot="button-group-item"]');
}

describe('ButtonGroupRenderer (W3b — grouped action container)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders nop-button-group marker with N items from schema', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/button-group-basic"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button-group',
              testid: 'demo-bg',
              items: [
                { label: 'Save' },
                { label: 'Cancel' },
                { label: 'Delete' },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = groupRoot();
    expect(root).toBeTruthy();
    expect(root.getAttribute('data-slot')).toBe('button-group-root');
    expect(root.getAttribute('data-selection-mode')).toBe('none');
    expect(root.getAttribute('data-orientation')).toBe('horizontal');
    expect(groupItems().length).toBe(3);
    expect(screen.getByText('Save')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('dispatches item action via helpers.dispatch on click', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/button-group-action"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button-group',
              items: [
                {
                  label: 'Set Flag',
                  action: { action: 'setValue', args: { path: 'flag', value: true } },
                },
              ],
            },
            { type: 'text', text: 'flag:${flag ? "set" : "unset"}' },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('flag:unset')).toBeTruthy();
    fireEvent.click(groupItems()[0]);
    await waitFor(() => expect(screen.getByText('flag:set')).toBeTruthy());
  });

  it('renders static buttons without throwing when item has no action', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/button-group-no-action"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button-group',
              items: [{ label: 'Static' }],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(groupItems()[0]);
    expect(screen.getByText('Static')).toBeTruthy();
  });

  it('toggles single selection (mutual exclusion) when selectionMode=single', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/button-group-single"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button-group',
              selectionMode: 'single',
              items: [
                { key: 'a', label: 'A' },
                { key: 'b', label: 'B' },
              ],
              onChange: {
                action: 'setValue',
                args: { path: 'bgChanged', value: true },
              },
            },
            { type: 'text', text: 'changed:${bgChanged ? "yes" : "no"}' },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(groupRoot().getAttribute('data-selection-mode')).toBe('single');

    fireEvent.click(groupItems()[0]);
    await waitFor(() => expect(screen.getByText('changed:yes')).toBeTruthy());
    expect(groupItems()[0].getAttribute('data-selected')).toBe('true');
    expect(groupItems()[1].getAttribute('data-selected')).toBeNull();

    fireEvent.click(groupItems()[1]);
    expect(groupItems()[1].getAttribute('data-selected')).toBe('true');
    expect(groupItems()[0].getAttribute('data-selected')).toBeNull();
  });

  it('toggles multiple selection when selectionMode=multiple', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/button-group-multiple"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button-group',
              selectionMode: 'multiple',
              items: [
                { key: 'a', label: 'A' },
                { key: 'b', label: 'B' },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(groupItems()[0]);
    fireEvent.click(groupItems()[1]);
    expect(groupItems()[0].getAttribute('data-selected')).toBe('true');
    expect(groupItems()[1].getAttribute('data-selected')).toBe('true');

    // Toggle off
    fireEvent.click(groupItems()[0]);
    expect(groupItems()[0].getAttribute('data-selected')).toBeNull();
    expect(groupItems()[1].getAttribute('data-selected')).toBe('true');
  });

  it('projects orientation=vertical to the ButtonGroup', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/button-group-vertical"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button-group',
              orientation: 'vertical',
              items: [{ label: 'Up' }, { label: 'Down' }],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(groupRoot().getAttribute('data-orientation')).toBe('vertical');
  });

  it('disables items with disabled=true', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/button-group-disabled"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button-group',
              items: [
                { label: 'OK' },
                { label: 'Nope', disabled: true },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const items = groupItems();
    expect((items[0] as HTMLButtonElement).disabled).toBe(false);
    expect((items[1] as HTMLButtonElement).disabled).toBe(true);
    expect(items[1].getAttribute('data-disabled')).toBe('true');
  });
});
