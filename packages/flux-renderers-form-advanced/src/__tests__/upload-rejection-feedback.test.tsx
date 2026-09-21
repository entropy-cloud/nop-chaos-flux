import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import type { ApiRequestContext, RendererEnv } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formulaCompiler } from '../test-support.js';
import { formAdvancedRendererDefinitions } from '../index.js';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { installFormAdvancedTestHooks } from '../test-support.js';

installFormAdvancedTestHooks();

const allDefinitions = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

/**
 * G2-视角5-02 (V12b plan 485 Phase 2): client-side rejections (maxSize /
 * maxFiles truncation) previously dispatched the onReject schema event with
 * zero render feedback. They must surface a visible destructive notice.
 */
function uploadEnv(): RendererEnv {
  return {
    fetcher: async function <T>(api: any, ctx: ApiRequestContext) {
      if (api?.url === '/api/upload') {
        const file = ((ctx.scope?.readOwn?.() ?? {}) as { __uploadFile?: { name?: string; size?: number } }).__uploadFile ?? {};
        return {
          status: 0,
          data: { url: `https://cdn.example.com/${file.name ?? 'x'}`, name: file.name, size: file.size } as T,
        };
      }
      return { status: 0, data: ctx.scope?.readOwn?.() as T };
    },
    notify: () => undefined,
  };
}

function renderSchema(schema: unknown) {
  const SchemaRenderer = createSchemaRenderer(allDefinitions);
  return render(
    <SchemaRenderer
      schemaUrl="test://upload-rejection"
      schema={schema as never}
      env={uploadEnv()}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function setFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', { configurable: true, value: files });
  fireEvent.change(input);
}

function rejectionNotice() {
  return document.querySelector('[data-slot="upload-rejection"]');
}

describe('input-file — visible rejection feedback (G2-视角5-02)', () => {
  it('shows a visible notice when a file exceeds maxSize', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: {},
      body: [
        {
          type: 'input-file',
          name: 'file',
          label: 'file',
          maxSize: 10,
          uploadAction: { action: 'ajax', args: { url: '/api/upload' } },
        },
      ],
    });
    const input = document.querySelector<HTMLInputElement>('input[data-testid="nop-input-file-input"]')!;
    setFiles(input, [new File(new Array(64).fill('x'), 'huge.bin')]);

    await waitFor(() => {
      const notice = rejectionNotice();
      expect(notice).not.toBeNull();
      expect(notice!.getAttribute('role')).toBe('alert');
      expect(notice!.textContent).toContain('huge.bin');
      expect(notice!.textContent).toContain('File exceeds maximum size');
    });
    // No upload row was created for the rejected file.
    expect(document.querySelector('[data-testid="nop-input-file-item"]')).toBeNull();
  });

  it('shows a visible notice when maxFiles truncates the selection', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: {
        files: [{ url: 'https://cdn.example.com/one', name: 'one' }],
      },
      body: [
        {
          type: 'input-file',
          name: 'files',
          label: 'files',
          multiple: true,
          maxFiles: 1,
          valueMode: 'array',
          uploadAction: { action: 'ajax', args: { url: '/api/upload' } },
        },
      ],
    });
    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="nop-input-file-item"]').length).toBe(1);
    });
    const input = document.querySelector<HTMLInputElement>('input[data-testid="nop-input-file-input"]')!;
    setFiles(input, [new File(['x'], 'second.txt'), new File(['y'], 'third.txt')]);

    await waitFor(() => {
      const notice = rejectionNotice();
      expect(notice).not.toBeNull();
      expect(notice!.getAttribute('role')).toBe('alert');
      expect(notice!.textContent).toContain('Too many files');
      expect(notice!.textContent).toContain('1');
    });
    // The committed list is unchanged (both files truncated).
    expect(document.querySelectorAll('[data-testid="nop-input-file-item"]').length).toBe(1);
  });

  it('does not render a notice when every file is accepted', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: {},
      body: [
        {
          type: 'input-file',
          name: 'file',
          label: 'file',
          uploadAction: { action: 'ajax', args: { url: '/api/upload' } },
        },
      ],
    });
    const input = document.querySelector<HTMLInputElement>('input[data-testid="nop-input-file-input"]')!;
    setFiles(input, [new File(['x'], 'ok.txt')]);

    await waitFor(() => {
      expect(
        document.querySelector('[data-testid="nop-input-file-item"][data-item-status="done"]'),
      ).toBeTruthy();
    });
    expect(rejectionNotice()).toBeNull();
  });
});
