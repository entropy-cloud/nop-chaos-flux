// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { contentRendererDefinitions } from './content-renderer-definitions.js';

const env: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: () => undefined,
};

const pageRenderer: RendererDefinition = {
  type: 'page',
  component: (props) => <section>{props.regions.body?.render() as React.ReactNode}</section>,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

const textRenderer: RendererDefinition = {
  type: 'text',
  component: (props) => <span>{String(props.props.text ?? '')}</span>,
};

const buttonRenderer: RendererDefinition = {
  type: 'button',
  component: (props) => (
    <button type="button" onClick={() => void props.events.onClick?.({}, {})}>
      {String(props.props.label ?? 'Button')}
    </button>
  ),
  fields: [{ key: 'label', kind: 'prop' }, { key: 'onClick', kind: 'event' }],
};

function createContentSchemaRenderer() {
  return createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer, ...contentRendererDefinitions]);
}

const formulaCompiler = createFormulaCompiler();

afterEach(() => {
  cleanup();
});

// DD8 regression anchor: `content` is `kind:'prop'`, so it re-resolves through
// the propsProgram against the live scope — mutating the bound scope value must
// update the rendered markdown (not a mount-time snapshot).
describe('MarkdownRenderer — scope reactivity (DD8)', () => {
  it('re-renders markdown when the bound scope content changes', async () => {
    const SchemaRenderer = createContentSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://content/markdown-reactive"
        schema={{
          type: 'page',
          body: [
            { type: 'markdown', content: '${md}' },
            {
              type: 'button',
              label: 'Update',
              onClick: { action: 'setValue', args: { path: 'md', value: '## Updated Title' } },
            },
          ],
        } as any}
        data={{ md: '## Original Title' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-slot="markdown"] h2')?.textContent).toBe('Original Title');
    });

    fireEvent.click(screen.getByText('Update'));

    await waitFor(() => {
      expect(document.querySelector('[data-slot="markdown"] h2')?.textContent).toBe('Updated Title');
    });
  });
});
