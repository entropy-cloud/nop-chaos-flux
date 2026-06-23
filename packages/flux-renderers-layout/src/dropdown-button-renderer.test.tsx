// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createLayoutSchemaRenderer, env, formulaCompiler } from './test-support.js';

function dropdownTrigger() {
  return document.querySelector('[data-slot="dropdown-button-trigger"]') as HTMLElement;
}

describe('DropdownButtonRenderer (W3b — menu-style action trigger)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders nop-dropdown-button marker with label and trigger button', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/dropdown-button-basic"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dropdown-button',
              testid: 'demo-ddb',
              label: 'Actions',
              items: [
                { label: 'Edit' },
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

    const trigger = dropdownTrigger();
    expect(trigger).toBeTruthy();
    expect(trigger.getAttribute('data-slot')).toBe('dropdown-button-trigger');
    expect(trigger.getAttribute('data-trigger')).toBe('click');
    expect(screen.getByText('Actions')).toBeTruthy();
  });

  it('opens the menu on click and renders menu items', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/dropdown-button-open"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dropdown-button',
              label: 'More',
              items: [
                { label: 'Edit' },
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

    fireEvent.click(dropdownTrigger());
    await waitFor(() => expect(screen.getByText('Edit')).toBeTruthy());
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('dispatches item action and closes the menu on item click', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/dropdown-button-action"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dropdown-button',
              label: 'Menu',
              items: [
                {
                  label: 'Set Value',
                  action: { action: 'setValue', args: { path: 'clicked', value: true } },
                },
              ],
            },
            { type: 'text', text: 'clicked:${clicked ? "yes" : "no"}' },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(dropdownTrigger());
    await waitFor(() => expect(screen.getByText('Set Value')).toBeTruthy());

    fireEvent.click(screen.getByText('Set Value'));
    await waitFor(() => expect(screen.getByText('clicked:yes')).toBeTruthy());
  });

  it('disables the trigger button when disabled=true', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/dropdown-button-disabled"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dropdown-button',
              label: 'Locked',
              disabled: true,
              items: [{ label: 'Item' }],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const trigger = dropdownTrigger();
    expect((trigger as HTMLButtonElement).disabled).toBe(true);
    expect(trigger.getAttribute('data-disabled')).toBe('true');
  });

  it('renders label as value-or-region (region content when schema array provided)', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/dropdown-button-label-region"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dropdown-button',
              label: [{ type: 'text', text: 'RegionLabel' }],
              items: [{ label: 'Item' }],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('RegionLabel')).toBeTruthy();
  });

  it('uses hover trigger when trigger=hover', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/dropdown-button-hover"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dropdown-button',
              label: 'Hover Me',
              trigger: 'hover',
              items: [{ label: 'Item' }],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(dropdownTrigger().getAttribute('data-trigger')).toBe('hover');
  });
});
