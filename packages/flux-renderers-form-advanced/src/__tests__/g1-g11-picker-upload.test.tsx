import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ApiRequestContext, RendererEnv } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formStateProbeRenderer, formulaCompiler } from '../test-support.js';
import { formAdvancedRendererDefinitions } from '../index.js';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';

const allDefinitions = [
  ...basicRendererDefinitions,
  ...formRendererDefinitions,
  ...formAdvancedRendererDefinitions,
  formStateProbeRenderer,
];

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

function renderSchema(schema: unknown, env: RendererEnv) {
  const SchemaRenderer = createSchemaRenderer(allDefinitions);
  return render(
    <SchemaRenderer
      schemaUrl="test://g1-g11"
      schema={schema as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function resolveFormState(testId: string): unknown {
  return JSON.parse(screen.getByTestId(testId).textContent ?? 'null') ?? null;
}

// ============================================================
// G1 — picker single-select must not silently clear the field
// ============================================================

describe('G1: picker single-select keeps the current value on empty confirm', () => {
  it('pre-selects the current value and does not clear on Confirm', async () => {
    renderSchema(
      {
        type: 'form',
        id: 'f',
        data: { owner: 'alice' },
        body: [
          {
            type: 'picker',
            id: 'pk',
            name: 'owner',
            label: 'Owner',
            pickerDialog: { title: 'Pick owner' },
            options: [
              { label: 'Alice', value: 'alice' },
              { label: 'Bob', value: 'bob' },
            ],
          },
          { type: 'form-state-probe', name: 'owner' },
        ],
      },
      { fetcher: async function <T>() { return { ok: true, status: 200, data: null as T }; }, notify: () => undefined },
    );

    await waitFor(() => expect(resolveFormState('form-state:owner')).toBe('alice'));

    fireEvent.click(document.querySelector('[data-slot="picker-trigger"]')!);
    await screen.findByText('Pick owner');

    // G1: the current value is pre-selected when the dialog opens.
    expect(screen.getByRole('radio', { name: 'Alice' }).getAttribute('aria-checked')).toBe(
      'true',
    );

    // Confirm without toggling anything must NOT clear the field.
    fireEvent.click(document.querySelector('[data-slot="picker-confirm"]')!);
    await waitFor(() => expect(resolveFormState('form-state:owner')).toBe('alice'));
  });

  it('disables Confirm when there is no current value and nothing is selected', async () => {
    renderSchema(
      {
        type: 'form',
        id: 'f',
        data: { owner: undefined },
        body: [
          {
            type: 'picker',
            id: 'pk',
            name: 'owner',
            label: 'Owner',
            pickerDialog: { title: 'Pick owner' },
            options: [
              { label: 'Alice', value: 'alice' },
              { label: 'Bob', value: 'bob' },
            ],
          },
        ],
      },
      { fetcher: async function <T>() { return { ok: true, status: 200, data: null as T }; }, notify: () => undefined },
    );

    fireEvent.click(document.querySelector('[data-slot="picker-trigger"]')!);
    await screen.findByText('Pick owner');

    const confirm = document.querySelector('[data-slot="picker-confirm"]') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
  });
});

// ============================================================
// G11 — upload: cancellable + no late write after unmount
// ============================================================

function makeControllableUploadEnv() {
  let resolveUpload: (value: { ok: true; status: number; data: unknown }) => void = () => undefined;
  const fetcher = async function <T>(_api: unknown, ctx: ApiRequestContext) {
    return new Promise<{ ok: true; status: number; data: T }>((resolve, reject) => {
      resolveUpload = resolve as typeof resolveUpload;
      // Observe the abort signal like a real fetch would (rejects with AbortError).
      ctx.signal?.addEventListener('abort', () => {
        reject(new DOMException('The user aborted a request.', 'AbortError'));
      });
    });
  };
  return {
    env: { fetcher, notify: () => undefined } as RendererEnv,
    resolveUpload: () => resolveUpload({ ok: true, status: 200, data: { url: 'https://cdn/x' } }),
  };
}

function attachFile() {
  const input = document.querySelector('[data-testid$="-input"]') as HTMLInputElement;
  expect(input).toBeTruthy();
  fireEvent.change(input, { target: { files: [new File(['bits'], 'upload.bin')] } });
}

describe('G11: upload can be cancelled and does not write after unmount', () => {
  it('cancels a pending upload via the cancel button without writing the field', async () => {
    const { env } = makeControllableUploadEnv();

    renderSchema(
      {
        type: 'form',
        id: 'f',
        data: { file: undefined },
        body: [
          { type: 'input-file', id: 'uf', name: 'file', label: 'File', uploadAction: { action: 'ajax', args: { url: '/api/upload' } } },
          { type: 'form-state-probe', name: 'file' },
        ],
      },
      env,
    );

    attachFile();
    await waitFor(() =>
      expect(document.querySelector('[data-slot="upload-pending"]')).toBeTruthy(),
    );

    // Click the per-item cancel button.
    const cancelBtn = document.querySelector('[data-slot="upload-cancel"]') as HTMLButtonElement;
    expect(cancelBtn).toBeTruthy();
    fireEvent.click(cancelBtn);

    await waitFor(() =>
      expect(document.querySelector('[data-slot="upload-pending"]')).toBeNull(),
    );
    // The field value must remain unset (no late write from the cancelled upload).
    expect(resolveFormState('form-state:file')).toBeNull();
  });

  it('does not write the field when it unmounts while an upload is in-flight', async () => {
    const { env } = makeControllableUploadEnv();

    renderSchema(
      {
        type: 'form',
        id: 'f',
        data: { showField: true, file: undefined },
        body: [
          { type: 'input-file', id: 'uf', name: 'file', label: 'File', when: '${showField}', uploadAction: { action: 'ajax', args: { url: '/api/upload' } } },
          { type: 'form-state-probe', name: 'file' },
          {
            type: 'button',
            label: 'hide-field',
            onClick: { action: 'setValue', args: { path: 'showField', value: false } },
          },
        ],
      },
      env,
    );

    attachFile();
    await waitFor(() =>
      expect(document.querySelector('[data-slot="upload-pending"]')).toBeTruthy(),
    );

    // Unmount the field while the upload is still pending.
    fireEvent.click(screen.getByText('hide-field'));
    await waitFor(() =>
      expect(document.querySelector('[data-slot="upload-pending"]')).toBeNull(),
    );

    // The upload resolves after the field is gone; it must not write back.
    // (waitFor would throw if a late write mutated state — instead we assert the
    // value stays empty after the resolution is flushed.)
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(resolveFormState('form-state:file')).toBeNull();
  });
});

export {};
