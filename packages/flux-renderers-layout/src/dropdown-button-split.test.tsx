import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createLayoutSchemaRenderer, env, formulaCompiler } from './test-support.js';

function mainSegment() {
  return document.querySelector('[data-slot="dropdown-button-main"]') as HTMLButtonElement;
}

function caretSegment() {
  return document.querySelector('[data-slot="dropdown-button-caret-trigger"]') as HTMLElement;
}

describe('DropdownButtonRenderer split mode (arc-component-gap G5I discriminant)', () => {
  afterEach(() => {
    cleanup();
  });

  function renderSplit(
    extra: Record<string, unknown> = {},
    data: Record<string, unknown> = {},
    omitMainAction = false,
  ) {
    const SchemaRenderer = createLayoutSchemaRenderer();
    const node: Record<string, unknown> = {
      type: 'dropdown-button',
      testid: 'split-ddb',
      label: 'Save',
      split: true,
      items: [{ label: 'Save as draft' }],
      ...extra,
    };
    if (!omitMainAction) {
      node.mainAction = { action: 'setValue', args: { path: 'saved', value: true } };
    }
    render(
      <SchemaRenderer
        schemaUrl="test://layout/dropdown-button-split"
        schema={{
          type: 'page',
          body: [
            node as never,
            { type: 'text', text: 'saved:${saved ? "yes" : "no"}' },
          ],
        }}
        data={data}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
  }

  it('renders split DOM: data-mode, group, main and caret-trigger slots; merged trigger slot absent', () => {
    renderSplit();
    const root = document.querySelector('[data-slot="dropdown-button-root"]') as HTMLElement;
    expect(root.getAttribute('data-mode')).toBe('split');
    expect(document.querySelector('[data-slot="dropdown-button-group"]')).toBeTruthy();
    expect(mainSegment()).toBeTruthy();
    expect(caretSegment()).toBeTruthy();
    expect(document.querySelector('[data-slot="dropdown-button-trigger"]')).toBeNull();
    // §10 discriminator: the merged-mode caret slot must not leak into split mode
    expect(document.querySelector('[data-slot="dropdown-button-caret"]')).toBeNull();
    expect(mainSegment().getAttribute('aria-haspopup')).toBeNull();
    expect(caretSegment().getAttribute('aria-haspopup')).toBe('menu');
    expect(caretSegment().getAttribute('aria-label')).toBe('Save');
  });

  it('main segment click dispatches mainAction against node scope (evaluationBindings without item/index)', async () => {
    renderSplit();
    fireEvent.click(mainSegment());
    await waitFor(() => expect(document.body.textContent).toContain('saved:yes'));
    // degradation guard: menu must NOT have opened as a side effect
    expect(screen.queryByText('Save as draft')).toBeNull();
  });

  it('caret segment click opens the menu', async () => {
    renderSplit();
    fireEvent.click(caretSegment());
    await waitFor(() => expect(screen.getByText('Save as draft')).toBeTruthy());
    // main action must not have fired via caret path
    expect(document.body.textContent).toContain('saved:no');
  });

  it('degrades to opening the menu when mainAction is absent', async () => {
    renderSplit({}, {}, true);
    fireEvent.click(mainSegment());
    await waitFor(() => expect(screen.getByText('Save as draft')).toBeTruthy());
  });

  it('disables both segments when disabled=true', () => {
    renderSplit({ disabled: true });
    expect(mainSegment().disabled).toBe(true);
    expect((caretSegment() as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(mainSegment());
    fireEvent.click(caretSegment());
    expect(screen.queryByText('Save as draft')).toBeNull();
  });

  it('hover trigger does not open the menu from the main segment but does from the caret', async () => {
    renderSplit({ trigger: 'hover' });
    fireEvent.mouseEnter(mainSegment());
    // give any (incorrect) immediate open a tick
    await waitFor(() => expect(caretSegment()).toBeTruthy());
    expect(screen.queryByText('Save as draft')).toBeNull();

    // §7: in split mode hover acts on the caret segment only
    fireEvent.mouseEnter(caretSegment());
    await waitFor(() => expect(screen.getByText('Save as draft')).toBeTruthy());
    fireEvent.mouseLeave(caretSegment());
  });
});

describe('DropdownButtonRenderer split regression pins (merged default path)', () => {
  afterEach(() => {
    cleanup();
  });

  it('schema without split keeps merged DOM: trigger + caret slots, no data-mode, no split slots', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/dropdown-button-merged-pin"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dropdown-button',
              label: 'Actions',
              items: [{ label: 'Edit' }],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = document.querySelector('[data-slot="dropdown-button-root"]') as HTMLElement;
    expect(root.getAttribute('data-mode')).toBeNull();
    expect(document.querySelector('[data-slot="dropdown-button-trigger"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="dropdown-button-caret"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="dropdown-button-main"]')).toBeNull();
    expect(document.querySelector('[data-slot="dropdown-button-caret-trigger"]')).toBeNull();
    expect(document.querySelector('[data-slot="dropdown-button-group"]')).toBeNull();

    fireEvent.click(document.querySelector('[data-slot="dropdown-button-trigger"]') as HTMLElement);
    await waitFor(() => expect(screen.getByText('Edit')).toBeTruthy());
  });
});
