import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index.js';
import { baseEnv, formulaCompiler } from '../test-support.js';
import { installFormAdvancedTestHooks } from '../test-support.js';

/**
 * CX-11 (plan 589) Phase 1 characterization pins — form-advanced faces the
 * consolidation batch must preserve byte-identically:
 *   1. injected-aria matrix C-tier (upload-field trigger);
 *   2. tree-controls source-error chain (both instances, name-only id strings
 *      VERBATIM) + the loadingId leg;
 *   3. writeFieldValue gated-write behavior (gate off / change depth /
 *      blur+keyPath mismatch / owner form vs parentForm).
 *
 * Zero declared behavior change: these pins must stay green across every
 * phase of the consolidation.
 */

installFormAdvancedTestHooks();

const SchemaRenderer = createSchemaRenderer([
  ...basicRendererDefinitions,
  ...formRendererDefinitions,
  ...formAdvancedRendererDefinitions,
]);

afterEach(() => cleanup());

function renderForm(body: Record<string, unknown>[], extra: Record<string, unknown> = {}) {
  return render(
    <SchemaRenderer
      schemaUrl="test://cx11-fadv-consumer-contract-pins"
      schema={
        {
          type: 'form',
          ...extra,
          body,
        } as React.ComponentProps<typeof SchemaRenderer>['schema']
      }
      env={baseEnv}
      formulaCompiler={formulaCompiler}
    />,
  );
}

// ── 1. injected-aria matrix C-tier (upload-field) ─────────────────────────

describe('CX-11 matrix pins — C-tier injected error chain (upload-field)', () => {
  it('error state: upload trigger aria-describedby == the live frame error element id', async () => {
    const { container } = renderForm([
      { type: 'input-file', name: 'doc', label: 'Doc', required: true },
      { type: 'button', label: 'Submit', onClick: { action: 'submitForm' } },
    ]);
    const trigger = container.querySelector('[data-testid="nop-input-file-trigger"]') as HTMLElement;
    expect(trigger).toBeTruthy();
    fireEvent.click(screen.getByText('Submit'));

    const errorSpan = await waitFor(() => {
      const span = container.querySelector('[data-slot="field-error"]');
      expect(span).toBeTruthy();
      return span as HTMLElement;
    });
    expect(errorSpan.id).toMatch(/^doc-\d+-error$/);
    expect(trigger.getAttribute('aria-describedby')).toBe(errorSpan.id);
    expect(document.getElementById(errorSpan.id)).toBe(errorSpan);
  });

  it('no error state: upload trigger carries no aria-describedby', () => {
    const { container } = renderForm([
      { type: 'input-file', name: 'doc', label: 'Doc' },
    ]);
    const trigger = container.querySelector('[data-testid="nop-input-file-trigger"]') as HTMLElement;
    expect(trigger).toBeTruthy();
    expect(trigger.getAttribute('aria-describedby')).toBeNull();
  });
});

// ── 2. tree-controls source-error chain (id strings VERBATIM) ─────────────

const SOURCE_ERROR_STATE = {
  loading: false,
  status: 'error',
  error: 'Tree options failed',
};

const LOADING_STATE = {
  loading: true,
  status: 'loading',
};

describe('CX-11 source-error chain pins — tree-controls instances', () => {
  it('input-tree: error span id is the VERBATIM name-only `${name}-source-error` (no cid suffix) and the tree list references it', () => {
    renderForm([
      {
        type: 'input-tree',
        name: 'tree',
        label: 'Tree',
        options: [],
        optionsSourceState: SOURCE_ERROR_STATE,
      },
    ]);
    const alert = document.querySelector('[data-slot="input-tree-source-error"]') as HTMLElement;
    expect(alert).toBeTruthy();
    // cid exists on mounted instances — the id must STILL be name-only.
    expect(alert.id).toBe('tree-source-error');
    expect(alert.textContent).toBe('Tree options failed');
    expect(document.getElementById('tree-source-error')).toBe(alert);
    const list = document.querySelector('[data-slot="tree-option-items"]') as HTMLElement;
    expect(list.getAttribute('aria-describedby')).toBe('tree-source-error');
    expect(list.getAttribute('aria-errormessage')).toBe('tree-source-error');
  });

  it('input-tree loading leg: loading span id is the name-only `${name}-source-loading`', () => {
    renderForm([
      {
        type: 'input-tree',
        name: 'tree',
        label: 'Tree',
        options: [],
        optionsSourceState: LOADING_STATE,
      },
    ]);
    const loading = document.querySelector('[data-slot="input-tree-source-loading"]') as HTMLElement;
    expect(loading).toBeTruthy();
    expect(loading.id).toBe('tree-source-loading');
    expect(document.getElementById('tree-source-loading')).toBe(loading);
  });

  it('tree-select: trigger references the VERBATIM name-only source-error id (list sits in the closed popover)', () => {
    renderForm([
      {
        type: 'tree-select',
        name: 'tsel',
        label: 'Tsel',
        options: [],
        optionsSourceState: SOURCE_ERROR_STATE,
      },
    ]);
    const alert = document.querySelector('[data-slot="tree-select-source-error"]') as HTMLElement;
    expect(alert).toBeTruthy();
    expect(alert.id).toBe('tsel-source-error');
    expect(alert.textContent).toBe('Tree options failed');
    expect(document.getElementById('tsel-source-error')).toBe(alert);
    const trigger = document.querySelector(
      '[data-slot="tree-select-trigger-row"] button',
    ) as HTMLElement;
    expect(trigger).toBeTruthy();
    expect(trigger.getAttribute('aria-describedby')).toBe('tsel-source-error');
    expect(trigger.getAttribute('aria-errormessage')).toBe('tsel-source-error');
  });

  it('input-tree without a source error emits no source-error aria and no paired span', () => {
    renderForm([
      {
        type: 'input-tree',
        name: 'tree',
        label: 'Tree',
        options: [{ label: 'Root', value: 'root' }],
      },
    ]);
    expect(document.querySelector('[data-slot="input-tree-source-error"]')).toBeNull();
    const list = document.querySelector('[data-slot="tree-option-items"]') as HTMLElement;
    expect(list.getAttribute('aria-describedby')).toBeNull();
    expect(list.getAttribute('aria-errormessage')).toBeNull();
  });
});

// ── 3. writeFieldValue gated-write behavior ───────────────────────────────

describe('CX-11 writeFieldValue pins', () => {
  it('gate: with validateOn [submit], key-value add-row writes do NOT trigger change validation, submit does', async () => {
    renderForm(
      [
        { type: 'key-value', name: 'pairs', label: 'Pairs', minItems: 2 },
        { type: 'button', label: 'Submit', onClick: { action: 'submitForm' } },
      ],
      { validateOn: ['submit'], data: { pairs: [] } },
    );
    fireEvent.click(screen.getByText('Add entry'));
    await new Promise((r) => setTimeout(r, 30));
    // gated off: the change-path write ran, but validation did not fire.
    expect(screen.queryByText(/must contain at least 2 item\(s\)/)).toBeNull();
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => {
      expect(screen.getByText(/must contain at least 2 item\(s\)/)).toBeTruthy();
    });
  });

  it('change depth + parentForm owner: input-table add-row triggers validation on change', async () => {
    renderForm(
      [
        {
          type: 'input-table',
          name: 'rows',
          label: 'Rows',
          minItems: 2,
          columns: [{ label: 'SKU' }],
          item: [{ type: 'input-text', name: 'sku', placeholder: 'SKU' }],
        },
      ],
      { validateOn: ['change'], data: { rows: [] } },
    );
    fireEvent.click(screen.getByText('Add row'));
    await waitFor(() => {
      expect(screen.getByText(/must contain at least 2 item\(s\)/)).toBeTruthy();
    });
  });

  it('blur depth + keyPath mismatch (currentForm owner): key row blur gates on name but validates `name.0.key`', async () => {
    renderForm(
      [
        {
          type: 'key-value',
          name: 'pairs',
          label: 'Pairs',
          minItems: 1,
        },
      ],
      { data: { pairs: [{ key: '', value: 'x' }] } },
    );
    const keyInput = screen.getByPlaceholderText('Key') as HTMLInputElement;
    fireEvent.focus(keyInput);
    fireEvent.blur(keyInput);
    await waitFor(() => {
      expect(screen.getByText('Entry 1 key is required')).toBeTruthy();
    });
    // the error is addressed to the key child path input
    expect(keyInput.getAttribute('aria-describedby')).toBeTruthy();
    expect(keyInput.getAttribute('aria-errormessage')).toBeTruthy();
  });
});
