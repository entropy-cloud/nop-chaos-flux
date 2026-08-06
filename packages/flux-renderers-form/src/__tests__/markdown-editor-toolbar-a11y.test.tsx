import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';
import { buttonRenderer, env, formTestHarness } from './form-test-support.js';

const { submitCalls } = formTestHarness;

// Decision (20-07): drop the role="toolbar" composite role instead of
// implementing roving tabindex — all 12 buttons are already independent tab
// stops (no WCAG 2.1.1 failure), and the toolbar contains group separators that
// make the APG roving pattern low-value. Removing the role eliminates the
// "toolbar announced, roving navigation absent" mismatch.

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

function renderSchema(schema: BaseSchema) {
  const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);
  return render(
    <SchemaRenderer
      schemaUrl="test://markdown-editor-toolbar-a11y"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function buildForm(name: string, initialValue: string | undefined) {
  return {
    type: 'form',
    id: 'md-form',
    data: initialValue === undefined ? {} : { [name]: initialValue },
    submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
    body: [{ type: 'markdown-editor', name, label: name }],
  } as any;
}

describe('20-07 markdown toolbar composite-role contract', () => {
  it('does not expose role="toolbar" and keeps every toolbar button an independent tab stop', () => {
    renderSchema(buildForm('md', '# hi'));
    void submitCalls;

    const toolbar = document.querySelector('[data-slot="markdown-editor-toolbar"]');
    expect(toolbar).toBeTruthy();
    expect(toolbar?.getAttribute('role')).toBeNull();
    expect(toolbar?.getAttribute('aria-label')).toBeNull();

    const buttons = toolbar?.querySelectorAll('button') ?? [];
    expect(buttons.length).toBe(12);
    for (const button of Array.from(buttons)) {
      // No roving tabindex restriction: every button stays in the tab order.
      expect(button.getAttribute('tabindex')).not.toBe('-1');
      expect(((button as HTMLElement).getAttribute('aria-label') ?? '').length).toBeGreaterThan(0);
    }
  });
});
