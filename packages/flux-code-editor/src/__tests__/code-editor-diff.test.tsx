// @vitest-environment happy-dom
import React from 'react';
import { describe, expect, it, afterEach, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv, SchemaInput } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { codeEditorRendererDefinition } from '../index.js';

const env: RendererEnv = {
  fetcher: async <T,>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined,
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerDataRenderers(registry);
registry.register(codeEditorRendererDefinition);

const SchemaRenderer = createSchemaRenderer();

function renderCodeEditorSchema(schema: SchemaInput) {
  return render(
    <SchemaRenderer
      schemaUrl="test://flux-code-editor/diff"
      schema={schema}
      env={env}
      registry={registry}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

async function waitForEditorRoot(container: HTMLElement): Promise<HTMLElement> {
  return waitFor(() => {
    const root = container.querySelector('.nop-code-editor');
    expect(root).toBeTruthy();
    return root as HTMLElement;
  });
}

describe('code-editor diff mode (E2h)', () => {
  it('renders a MergeView with two panes when diffValue is set', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const view = renderCodeEditorSchema({
      type: 'page',
      body: [
        {
          type: 'form',
          name: 'testForm',
          body: [
            {
              type: 'code-editor',
              name: 'script',
              label: 'Diff Editor',
              language: 'javascript',
              value: 'const b = 2;',
              diffValue: 'const a = 1;',
              height: 200,
            },
          ],
        },
      ],
    });

    const root = await waitForEditorRoot(view.container);
    expect(root.getAttribute('data-diff')).toBe('true');

    await waitFor(() => {
      expect(view.container.querySelector('.cm-mergeView')).toBeTruthy();
    });

    const editors = view.container.querySelectorAll('.cm-editor');
    expect(editors.length).toBeGreaterThanOrEqual(2);

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('renders a single editor when diffValue is omitted', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const view = renderCodeEditorSchema({
      type: 'page',
      body: [
        {
          type: 'form',
          name: 'testForm',
          body: [
            {
              type: 'code-editor',
              name: 'script',
              label: 'Single Editor',
              language: 'javascript',
              value: 'const a = 1;',
              height: 200,
            },
          ],
        },
      ],
    });

    const root = await waitForEditorRoot(view.container);
    expect(root.getAttribute('data-diff')).toBeNull();

    await waitFor(() => {
      expect(view.container.querySelectorAll('.cm-editor').length).toBe(1);
    });
    expect(view.container.querySelector('.cm-mergeView')).toBeNull();

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('renders a MergeView when diffValue is empty string (left pane empty)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const view = renderCodeEditorSchema({
      type: 'page',
      body: [
        {
          type: 'form',
          name: 'testForm',
          body: [
            {
              type: 'code-editor',
              name: 'script',
              label: 'Empty Diff',
              language: 'javascript',
              value: 'const a = 1;',
              diffValue: '',
              height: 200,
            },
          ],
        },
      ],
    });

    const root = await waitForEditorRoot(view.container);
    expect(root.getAttribute('data-diff')).toBe('true');

    await waitFor(() => {
      expect(view.container.querySelector('.cm-mergeView')).toBeTruthy();
    });
    expect(view.container.querySelectorAll('.cm-editor').length).toBeGreaterThanOrEqual(2);

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('renders MergeView for a newly added language (python)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const view = renderCodeEditorSchema({
      type: 'page',
      body: [
        {
          type: 'form',
          name: 'testForm',
          body: [
            {
              type: 'code-editor',
              name: 'script',
              label: 'Python Diff',
              language: 'python',
              value: 'print("b")',
              diffValue: 'print("a")',
              height: 200,
            },
          ],
        },
      ],
    });

    await waitForEditorRoot(view.container);

    await waitFor(() => {
      expect(view.container.querySelector('.cm-mergeView')).toBeTruthy();
    });
    expect(view.container.querySelectorAll('.cm-editor').length).toBeGreaterThanOrEqual(2);

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
