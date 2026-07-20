import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import type { ApiRequestContext, RendererEnv } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { buttonRenderer, formTestHarness, formulaCompiler } from '../test-support.js';
import { formAdvancedRendererDefinitions } from '../index.js';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';

const { submitCalls } = formTestHarness;

const allDefinitions = [
  ...formRendererDefinitions,
  ...formAdvancedRendererDefinitions,
  buttonRenderer,
];

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

interface UploadFetcherOptions {
  deleteFail?: boolean;
}

function makeUploadEnv(options: UploadFetcherOptions = {}): RendererEnv {
  return {
    fetcher: async function <T>(api: any, ctx: ApiRequestContext) {
      const url = api?.url;
      const body = ctx.scope?.readOwn?.() ?? {};
      if (url === '/api/upload') {
        const file = (body as { __uploadFile?: { name?: string; size?: number } }).__uploadFile ?? { name: 'file.bin', size: 0 };
        return {
          ok: true,
          status: 200,
          data: { url: `https://cdn.example.com/${file.name}`, name: file.name, size: file.size ?? 0 } as T,
        };
      }
      if (url === '/api/delete') {
        return { ok: true, status: 200, data: {} as T };
      }
      if (url === '/api/delete-fail' || options.deleteFail) {
        return { ok: false, status: 500, data: { message: 'Server error' } as T };
      }
      submitCalls.push(ctx.scope.readOwn() as Record<string, unknown>);
      return { ok: true, status: 200, data: ctx.scope.readOwn() as T };
    },
    notify: () => undefined,
  };
}

function renderSchema(schema: unknown, env?: RendererEnv) {
  const SchemaRenderer = createSchemaRenderer(allDefinitions);
  return render(
    <SchemaRenderer
      schemaUrl="test://upload-enhancements"
      schema={schema as never}
      env={env ?? makeUploadEnv()}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function setFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: files,
  });
  fireEvent.change(input);
}

describe('input-file — U5 deleteAction', () => {
  it('calls the deleteAction endpoint when remove button is clicked', async () => {
    let deleteCalled = false;
    const env: RendererEnv = {
      fetcher: async function <T>(api: any) {
        if (api?.url === '/api/delete') {
          deleteCalled = true;
          return { ok: true, status: 200, data: {} as T };
        }
        return { ok: true, status: 200, data: {} as T };
      },
      notify: () => undefined,
    };

    renderSchema({
      type: 'form',
      id: 'uf',
      data: { file: { url: 'https://cdn.example.com/old.pdf', name: 'old.pdf', size: 1024 } },
      body: [
        {
          type: 'input-file',
          name: 'file',
          label: 'File',
          deleteAction: { action: 'ajax', args: { url: '/api/delete', method: 'post' } },
        },
      ],
    } as any, env);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="nop-input-file-item"]')).toBeTruthy();
    });

    fireEvent.click(document.querySelector('[data-testid="nop-input-file-remove-0"]')!);

    await waitFor(() => {
      expect(deleteCalled).toBe(true);
    });
  });

  it('removes the file from the item list after delete', async () => {
    renderSchema({
      type: 'form',
      id: 'uf',
      data: { file: { url: 'https://cdn.example.com/old.pdf', name: 'old.pdf', size: 1024 } },
      body: [
        {
          type: 'input-file',
          name: 'file',
          label: 'File',
          deleteAction: { action: 'ajax', args: { url: '/api/delete', method: 'post' } },
        },
      ],
    } as any);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="nop-input-file-item"]')).toBeTruthy();
    });

    fireEvent.click(document.querySelector('[data-testid="nop-input-file-remove-0"]')!);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="nop-input-file-item"]')).toBeNull();
    });
  });
});

describe('input-file — U6 maxSize + onReject', () => {
  it('rejects a file exceeding maxSize and does not add it to the upload list', async () => {
    renderSchema({
      type: 'form',
      id: 'uf',
      data: {},
      body: [
        {
          type: 'input-file',
          name: 'file',
          label: 'File',
          maxSize: 100,
          uploadAction: { action: 'ajax', args: { url: '/api/upload', method: 'post' } },
        },
      ],
    } as any);

    const input = document.querySelector('input[data-testid="nop-input-file-input"]') as HTMLInputElement;
    const bigFile = new File(['x'.repeat(200)], 'big.bin', { type: 'application/octet-stream' });
    setFiles(input, [bigFile]);

    await waitFor(() => {
      // File should not appear in the list (rejected before upload).
      expect(document.querySelector('[data-testid="nop-input-file-item"]')).toBeNull();
    });
  });

  it('accepts a file within maxSize', async () => {
    renderSchema({
      type: 'form',
      id: 'uf',
      data: {},
      body: [
        {
          type: 'input-file',
          name: 'file',
          label: 'File',
          maxSize: 10000,
          uploadAction: { action: 'ajax', args: { url: '/api/upload', method: 'post' } },
        },
      ],
    } as any);

    const input = document.querySelector('input[data-testid="nop-input-file-input"]') as HTMLInputElement;
    const smallFile = new File(['small'], 'small.txt', { type: 'text/plain' });
    setFiles(input, [smallFile]);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="nop-input-file-item"][data-item-status="done"]')).toBeTruthy();
    });
  });
});
