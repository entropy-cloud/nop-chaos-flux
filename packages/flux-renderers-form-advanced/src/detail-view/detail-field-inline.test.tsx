import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  baseEnv,
  createFormSchemaRenderer,
  createPageSchemaRenderer,
  formulaCompiler,
  formStateProbeRenderer,
  installFormAdvancedTestHooks,
} from '../test-support.js';

installFormAdvancedTestHooks();

function queryInlineEditor(): HTMLElement | null {
  return document.querySelector('[data-slot="detail-field-inline-editor"]');
}

function getInlineInput(): HTMLInputElement {
  const input = queryInlineEditor()?.querySelector('input');
  if (!input) {
    throw new Error('Expected inline editor input to be rendered');
  }
  return input;
}

function clickViewer() {
  const viewer = document.querySelector('[data-slot="detail-field-viewer"]');
  if (!viewer) {
    throw new Error('Expected detail-field-viewer to be rendered');
  }
  fireEvent(viewer, new MouseEvent('click', { bubbles: true }));
}

function renderInlineForm(extraBody: Record<string, any> = {}, extraFields: Array<Record<string, any>> = []) {
  cleanup();
  const SchemaRenderer = createPageSchemaRenderer([formStateProbeRenderer]);
  const rendered = render(
    <SchemaRenderer
      schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-field-inline.test.tsx"
      schema={{
        type: 'form',
        data: { nickname: 'Pilot' },
        body: [
          {
            type: 'detail-field',
            name: 'nickname',
            label: 'Nickname',
            content: [{ type: 'input-text', name: 'nickname', label: 'Nickname' }],
            ...extraBody,
          },
          ...extraFields,
          { type: 'form-state-probe', name: 'nickname' },
        ],
      }}
      env={baseEnv}
      formulaCompiler={formulaCompiler}
    />,
  );
  return rendered;
}

function probeText(): string {
  const probe = document.querySelector('[data-testid="form-state:nickname"]');
  return probe?.textContent ?? '';
}

describe('detail-field — editable inline editing (G2I)', () => {
  it('enters inline editing on viewer click and commits on Enter (discriminating: fails without implementation)', async () => {
    renderInlineForm({ editable: true });
    await waitFor(() => expect(document.querySelector('[data-slot="detail-field-viewer"]')).toBeTruthy());
    expect(queryInlineEditor()).toBeNull();

    clickViewer();
    const input = getInlineInput();
    expect(queryInlineEditor()).toBeTruthy();
    expect(input.value).toBe('Pilot');
    expect(document.activeElement).toBe(input);

    fireEvent.change(input, { target: { value: 'Ace' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(queryInlineEditor()).toBeNull();
      expect(probeText()).toBe('"Ace"');
    });
  });

  it('discards changes on Escape without writeback', async () => {
    renderInlineForm({ editable: true });
    await waitFor(() => expect(document.querySelector('[data-slot="detail-field-viewer"]')).toBeTruthy());

    clickViewer();
    const input = getInlineInput();
    fireEvent.change(input, { target: { value: 'Changed' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => expect(queryInlineEditor()).toBeNull());
    expect(probeText()).toBe('"Pilot"');
  });

  it('exits without writeback when blur happens with unchanged value', async () => {
    renderInlineForm({ editable: true });
    await waitFor(() => expect(document.querySelector('[data-slot="detail-field-viewer"]')).toBeTruthy());

    clickViewer();
    const input = getInlineInput();
    fireEvent.blur(input);

    await waitFor(() => expect(queryInlineEditor()).toBeNull());
    expect(probeText()).toBe('"Pilot"');
  });

  it('does not enter inline editing by default (regression guard)', async () => {
    renderInlineForm({});
    await waitFor(() => expect(document.querySelector('[data-slot="detail-field-viewer"]')).toBeTruthy());
    clickViewer();
    expect(queryInlineEditor()).toBeNull();
  });

  it('degrades to the dialog path when a transform action is declared (mutual exclusion)', async () => {
    renderInlineForm({
      editable: true,
      transformInAction: { action: 'ajax', args: { url: '/api/x' } },
    });
    await waitFor(() => {
      const trigger = document.querySelector('.nop-detail-field button');
      expect(trigger).toBeTruthy();
    });
    clickViewer();
    expect(queryInlineEditor()).toBeNull();
  });

  it('stays static in readOnly mode', async () => {
    renderInlineForm({ editable: true, readOnly: true });
    await waitFor(() => expect(document.querySelector('[data-slot="detail-field-viewer"]')).toBeTruthy());
    clickViewer();
    expect(queryInlineEditor()).toBeNull();
  });

  it('honors editTrigger dblclick (single click does not edit)', async () => {
    cleanup();
    const SchemaRenderer = createPageSchemaRenderer([formStateProbeRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-field-inline.test.tsx#dblclick"
        schema={{
          type: 'form',
          data: { nickname: 'Pilot' },
          body: [
            {
              type: 'detail-field',
              name: 'nickname',
              label: 'Nickname',
              editable: true,
              editTrigger: 'dblclick',
              content: [{ type: 'input-text', name: 'nickname', label: 'Nickname' }],
            },
            { type: 'form-state-probe', name: 'nickname' },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(document.querySelector('[data-slot="detail-field-viewer"]')).toBeTruthy());

    clickViewer();
    expect(queryInlineEditor()).toBeNull();

    const viewer = document.querySelector('[data-slot="detail-field-viewer"]');
    if (!viewer) throw new Error('Expected viewer');
    fireEvent(viewer, new MouseEvent('dblclick', { bubbles: true }));
    expect(queryInlineEditor()).toBeTruthy();
    expect(probeText()).toBe('"Pilot"');
  });

  it('does not enter editing when clicking interactive child content inside the viewer region', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-field-inline.test.tsx#interactive-viewer"
        schema={{
          type: 'form',
          data: { nickname: 'Pilot' },
          body: [
            {
              type: 'detail-field',
              name: 'nickname',
              label: 'Nickname',
              editable: true,
              content: [{ type: 'input-text', name: 'nickname', label: 'Nickname' }],
              viewer: [
                { type: 'button', label: 'Viewer Action', onClick: { action: 'ajax', args: { url: '/api/x' } } },
              ],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(screen.getByText('Viewer Action')).toBeTruthy());

    fireEvent.click(screen.getByText('Viewer Action'));
    expect(queryInlineEditor()).toBeNull();
  });
});
