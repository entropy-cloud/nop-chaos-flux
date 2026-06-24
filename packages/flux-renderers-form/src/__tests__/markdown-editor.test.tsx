import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { BaseSchema, RendererDefinition } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';
import { buttonRenderer, env, formTestHarness } from './form-test-support.js';

const { submitCalls } = formTestHarness;

/**
 * Stub `markdown` renderer so the form package tests never depend on
 * `flux-renderers-content` (the W3d Phase 2 Decision forbids a form→content
 * workspace edge). The editor composes a child `{ type: 'markdown', content }`
 * node at runtime; this stub surfaces the resolved content via a data attribute,
 * letting tests assert the editor→preview composition contract.
 */
const stubMarkdownRenderer: RendererDefinition = {
  type: 'markdown',
  fields: [{ key: 'content', kind: 'prop' }],
  component: (props) => (
    <div data-testid="stub-markdown" data-content={String(props.props.content ?? '')} />
  ),
};

const allDefinitions = [...formRendererDefinitions, stubMarkdownRenderer, buttonRenderer];

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

function renderSchema(schema: BaseSchema) {
  const SchemaRenderer = createSchemaRenderer(allDefinitions);
  return render(
    <SchemaRenderer
      schemaUrl="test://markdown-editor"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function buildForm(
  name: string,
  initialValue: string | undefined,
  extra: Record<string, unknown> = {},
) {
  return {
    type: 'form',
    id: 'md-form',
    data: initialValue === undefined ? {} : { [name]: initialValue },
    submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
    body: [
      { type: 'markdown-editor', name, label: name, ...extra },
      {
        type: 'button',
        label: 'Submit',
        onClick: { action: 'component:submit', componentId: 'md-form' },
      },
    ],
  } as any;
}

async function submit() {
  fireEvent.click(screen.getByText('Submit'));
  await waitFor(() => expect(submitCalls.length).toBe(1));
}

describe('markdown-editor — registration & markers', () => {
  it('emits the nop-markdown-editor marker and is wrapped by the field frame', () => {
    renderSchema(buildForm('md', '# hi'));
    expect(document.querySelector('.nop-markdown-editor')).toBeTruthy();
    expect(document.querySelector('.nop-field')).toBeTruthy();
    expect(document.querySelector('[data-view-mode="split"]')).toBeTruthy();
  });
});

describe('markdown-editor — split/edit/preview view modes', () => {
  it('split renders both the editor textarea and the preview area', () => {
    renderSchema(buildForm('md', '# hi', { viewMode: 'split' }));
    expect(screen.getByTestId('markdown-editor-textarea')).toBeTruthy();
    expect(screen.getByTestId('markdown-editor-preview')).toBeTruthy();
  });

  it('edit renders only the editor textarea (no preview area)', () => {
    renderSchema(buildForm('md', '# hi', { viewMode: 'edit' }));
    expect(screen.getByTestId('markdown-editor-textarea')).toBeTruthy();
    expect(screen.queryByTestId('markdown-editor-preview')).toBeNull();
    expect(document.querySelector('[data-view-mode="edit"]')).toBeTruthy();
  });

  it('preview renders only the preview area (no textarea)', () => {
    renderSchema(buildForm('md', '# hi', { viewMode: 'preview' }));
    expect(screen.queryByTestId('markdown-editor-textarea')).toBeNull();
    expect(screen.getByTestId('markdown-editor-preview')).toBeTruthy();
    expect(document.querySelector('[data-view-mode="preview"]')).toBeTruthy();
  });
});

describe('markdown-editor — edit/preview composition & writeback', () => {
  it('feeds the current source to the composed markdown preview node', () => {
    renderSchema(buildForm('md', '# Hello'));
    const preview = screen.getByTestId('stub-markdown');
    expect(preview.getAttribute('data-content')).toBe('# Hello');
  });

  it('writes the edited source back to scope on change', async () => {
    renderSchema(buildForm('md', 'before'));
    const textarea = screen.getByTestId('markdown-editor-textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '# after' } });
    await submit();
    expect(submitCalls[0].md).toBe('# after');
  });

  it('keeps the preview in sync with the edited source', () => {
    renderSchema(buildForm('md', 'start'));
    const textarea = screen.getByTestId('markdown-editor-textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '**bold**' } });
    const preview = screen.getByTestId('stub-markdown');
    expect(preview.getAttribute('data-content')).toBe('**bold**');
  });
});

describe('markdown-editor — toolbar inserts markdown syntax', () => {
  it('inserts bold syntax around the current selection', async () => {
    renderSchema(buildForm('md', 'hello world'));
    const textarea = screen.getByTestId('markdown-editor-textarea') as HTMLTextAreaElement;
    // Select "world" then run the bold toolbar action.
    textarea.setSelectionRange(6, 11);
    fireEvent.click(screen.getByTestId('md-toolbar-bold'));
    await submit();
    expect(submitCalls[0].md).toBe('hello **world**');
  });

  it('can be hidden via toolbar: false', () => {
    renderSchema(buildForm('md', 'hi', { toolbar: false }));
    expect(screen.queryByTestId('md-toolbar-bold')).toBeNull();
  });
});
