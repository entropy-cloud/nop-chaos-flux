import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ApiRequestContext, RendererEnv } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { buttonRenderer, formTestHarness, formulaCompiler } from '../test-support.js';
import { formAdvancedRendererDefinitions } from '../index.js';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { installFormAdvancedTestHooks } from '../test-support.js';

installFormAdvancedTestHooks();

const { submitCalls } = formTestHarness;

let resolveUpload: ((value: { status: number; data: unknown }) => void) | undefined;

function makeDeferredUploadEnv(): RendererEnv {
  return {
    fetcher: async function <T>(api: any, ctx: ApiRequestContext) {
      if (api?.url === '/api/upload') {
        return (await new Promise((resolve) => {
          resolveUpload = resolve as unknown as (value: { status: number; data: unknown }) => void;
        })) as T;
      }
      submitCalls.push((ctx?.scope?.readOwn?.() ?? {}) as Record<string, unknown>);
      return { status: 0, data: null } as T;
    },
    notify: () => undefined,
  };
}

const allDefinitions = [...formRendererDefinitions, ...formAdvancedRendererDefinitions, buttonRenderer];

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  submitCalls.length = 0;
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

function renderSchema(schema: unknown, env: RendererEnv) {
  const SchemaRenderer = createSchemaRenderer(allDefinitions);
  return render(
    <SchemaRenderer
      schemaUrl="test://upload-disabled-channels"
      schema={schema as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function setFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', { configurable: true, value: files });
  fireEvent.change(input);
}

// [G2-R4-视角3-01] (R2 consistency audit, P2, swept with batch ①): the
// in-flight completion write and the pending-row cancel button ignored the
// disabled gate — a field disabled mid-upload was silently rewritten (family 1).
describe('[G2-R4-视角3-01] upload channels honor the disabled gate', () => {
  function buildForm() {
    return {
      type: 'form',
      id: 'upload-form',
      data: { frozen: false },
      submitAction: { action: 'ajax', args: { url: '/api/submit', method: 'post' } },
      body: [
        {
          type: 'input-file',
          name: 'file',
          label: 'File',
          valueMode: 'url',
          disabled: '${frozen}',
          uploadAction: { action: 'ajax', args: { url: '/api/upload', method: 'post' } },
        },
        {
          type: 'button',
          label: 'Freeze',
          onClick: { action: 'setValue', args: { path: 'frozen', value: true } },
        },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'upload-form' },
        },
      ],
    };
  }

  it('pending cancel button is disabled once the field turns disabled', async () => {
    const env = makeDeferredUploadEnv();
    renderSchema(buildForm(), env);

    const input = document.querySelector<HTMLInputElement>('input[data-testid="nop-input-file-input"]')!;
    setFiles(input, [new File(['hello'], 'doc.txt', { type: 'text/plain' })]);

    await waitFor(() => expect(document.querySelector('[data-slot="upload-cancel"]')).toBeTruthy());

    fireEvent.click(screen.getByText('Freeze'));
    await waitFor(() => {
      const cancel = document.querySelector('[data-slot="upload-cancel"]') as HTMLButtonElement;
      expect(cancel?.disabled).toBe(true);
    });
  });

  it('an in-flight upload does not rewrite the value after the field turned disabled', async () => {
    const env = makeDeferredUploadEnv();
    renderSchema(buildForm(), env);

    const input = document.querySelector<HTMLInputElement>('input[data-testid="nop-input-file-input"]')!;
    setFiles(input, [new File(['hello'], 'doc.txt', { type: 'text/plain' })]);

    await waitFor(() => expect(document.querySelector('[data-slot="upload-cancel"]')).toBeTruthy());

    fireEvent.click(screen.getByText('Freeze'));
    await waitFor(() => {
      const cancel = document.querySelector('[data-slot="upload-cancel"]') as HTMLButtonElement;
      expect(cancel?.disabled).toBe(true);
    });

    resolveUpload?.({ status: 0, data: { url: 'https://cdn.example.com/doc.txt', name: 'doc.txt' } });

    // The in-flight result is discarded: the pending entry disappears and no
    // committed item/value write ever lands.
    await waitFor(() => expect(document.querySelector('[data-slot="upload-cancel"]')).toBeNull());
    expect(document.querySelector('[data-item-status="done"]')).toBeNull();

    // The upload result must not land as a committed item (that item is what
    // writes the field value): the pending row is removed, nothing turns done,
    // and no error row appears either.
    await waitFor(() => expect(document.querySelector('[data-slot="upload-cancel"]')).toBeNull());
    expect(document.querySelector('[data-item-status="done"]')).toBeNull();
    expect(document.querySelector('[data-slot="upload-error"]')).toBeNull();
  });
});
