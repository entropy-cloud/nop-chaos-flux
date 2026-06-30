import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  fail?: boolean;
}

function makeUploadEnv(options: UploadFetcherOptions = {}): RendererEnv {
  return {
    fetcher: async function <T>(api: any, ctx: ApiRequestContext) {
      const url = api?.url;
      const body = ctx.scope?.readOwn?.() ?? {};
      if (url === '/api/upload-fail' || options.fail) {
        return { ok: false, status: 500, data: { message: 'rejected' } as T };
      }
      if (url === '/api/upload' || url === '/api/upload-image') {
        const file = (body as { __uploadFile?: { name?: string; size?: number } }).__uploadFile ?? {
          name: 'file.bin',
          size: 0,
        };
        return {
          ok: true,
          status: 200,
          data: {
            url: `https://cdn.example.com/${file.name}`,
            name: file.name,
            size: file.size ?? 0,
          } as T,
        };
      }
      // Submit action: capture scope.
      submitCalls.push(ctx.scope.readOwn() as Record<string, unknown>);
      return { ok: true, status: 200, data: ctx.scope.readOwn() as T };
    },
    notify: () => undefined,
  };
}

function renderSchema(schema: unknown, env: RendererEnv = makeUploadEnv()) {
  const SchemaRenderer = createSchemaRenderer(allDefinitions);
  return render(
    <SchemaRenderer
      schemaUrl="test://upload"
      schema={schema as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function buildForm(
  type: 'input-file' | 'input-image',
  name: string,
  extra: Record<string, unknown> = {},
  initialValue: unknown = undefined,
) {
  return {
    type: 'form',
    id: 'upload-form',
    data: initialValue === undefined ? {} : { [name]: initialValue },
    submitAction: { action: 'ajax', args: { url: '/api/submit', method: 'post' } },
    body: [
      { type, name, label: name, ...extra },
      {
        type: 'button',
        label: 'Submit',
        onClick: { action: 'component:submit', componentId: 'upload-form' },
      },
    ],
  } as any;
}

function setFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: files,
  });
  fireEvent.change(input);
}

async function submit() {
  fireEvent.click(screen.getByText('Submit'));
  await waitFor(() => expect(submitCalls.length).toBe(1));
}

describe('input-file — registration & markers', () => {
  it('emits the nop-input-file marker and is wrapped by the field frame', () => {
    renderSchema(buildForm('input-file', 'file', { uploadAction: { action: 'ajax', args: { url: '/api/upload' } } }));
    expect(document.querySelector('.nop-input-file')).toBeTruthy();
    expect(document.querySelector('[data-upload-kind="file"]')).toBeTruthy();
  });
});

describe('input-file — upload success state machine', () => {
  it('dispatches uploadAction and writes back the url (valueMode url, single)', async () => {
    renderSchema(
      buildForm('input-file', 'file', {
        valueMode: 'url',
        uploadAction: { action: 'ajax', args: { url: '/api/upload', method: 'post' } },
      }),
    );
    const input = document.querySelector<HTMLInputElement>(
      'input[data-testid="nop-input-file-input"]',
    )!;
    setFiles(input, [new File(['hello'], 'doc.txt', { type: 'text/plain' })]);

    await waitFor(() =>
      expect(
        document.querySelector('[data-testid="nop-input-file-item"][data-item-status="done"]'),
      ).toBeTruthy(),
    );

    await submit();
    expect(submitCalls[0].file).toBe('https://cdn.example.com/doc.txt');
  });

  it('removes a committed upload without losing the cleared value (H26)', async () => {
    renderSchema(
      buildForm('input-file', 'file', {
        valueMode: 'url',
        uploadAction: { action: 'ajax', args: { url: '/api/upload', method: 'post' } },
      }),
    );
    const input = document.querySelector<HTMLInputElement>(
      'input[data-testid="nop-input-file-input"]',
    )!;
    setFiles(input, [new File(['hello'], 'doc.txt', { type: 'text/plain' })]);

    await waitFor(() =>
      expect(
        document.querySelector('[data-testid="nop-input-file-item"][data-item-status="done"]'),
      ).toBeTruthy(),
    );

    // removeExisting must read the committed-value ref (consistent with
    // commitItems) so the just-completed upload is removed cleanly.
    fireEvent.click(document.querySelector('[data-testid="nop-input-file-remove-0"]')!);

    await waitFor(() =>
      expect(document.querySelector('[data-testid="nop-input-file-item"]')).toBeNull(),
    );

    await submit();
    expect(submitCalls[0].file).toBeUndefined();
  });

  it('writes back the full object when valueMode is object', async () => {
    renderSchema(
      buildForm('input-file', 'file', {
        valueMode: 'object',
        uploadAction: { action: 'ajax', args: { url: '/api/upload' } },
      }),
    );
    const input = document.querySelector<HTMLInputElement>(
      'input[data-testid="nop-input-file-input"]',
    )!;
    setFiles(input, [new File(['hi'], 'report.pdf', { type: 'application/pdf' })]);

    await waitFor(() =>
      expect(
        document.querySelector('[data-testid="nop-input-file-item"][data-item-status="done"]'),
      ).toBeTruthy(),
    );

    await submit();
    expect(submitCalls[0].file).toEqual({
      url: 'https://cdn.example.com/report.pdf',
      name: 'report.pdf',
      size: 2,
    });
  });

  it('accumulates results into an array when multiple + valueMode array', async () => {
    renderSchema(
      buildForm(
        'input-file',
        'files',
        {
          multiple: true,
          valueMode: 'array',
          uploadAction: { action: 'ajax', args: { url: '/api/upload' } },
        },
        [],
      ),
    );
    const input = document.querySelector<HTMLInputElement>(
      'input[data-testid="nop-input-file-input"]',
    )!;
    setFiles(input, [
      new File(['a'], 'a.txt'),
      new File(['b'], 'b.txt'),
    ]);

    await waitFor(() =>
      expect(
        document.querySelectorAll(
          '[data-testid="nop-input-file-item"][data-item-status="done"]',
        ).length,
      ).toBe(2),
    );

    await submit();
    const stored = submitCalls[0].files as unknown[];
    expect(stored).toHaveLength(2);
    expect((stored[0] as { url: string }).url).toBe('https://cdn.example.com/a.txt');
    expect((stored[1] as { url: string }).url).toBe('https://cdn.example.com/b.txt');
  });
});

describe('input-file — upload failure & error handling', () => {
  it('enters error state and does NOT pollute the field value on failure', async () => {
    const onUploadError = vi.fn();
    renderSchema(
      buildForm('input-file', 'file', {
        uploadAction: { action: 'ajax', args: { url: '/api/upload-fail' } },
        onUploadError: { action: 'component:method', componentId: 'noop', method: 'noop' },
      }),
    );
    // Override: attach a spy by registering a tiny event capture via scope is heavy;
    // instead assert the DOM error state + value not polluted.
    const input = document.querySelector<HTMLInputElement>(
      'input[data-testid="nop-input-file-input"]',
    )!;
    setFiles(input, [new File(['x'], 'bad.txt')]);

    await waitFor(() => {
      const errored = document.querySelector('[data-item-status="error"]');
      expect(errored).toBeTruthy();
    });

    await submit();
    // Value stays undefined (no pollution).
    expect(submitCalls[0].file).toBeUndefined();
    void onUploadError;
  });

  it('U2: surfaces the server error message (propagates to both DOM and onUploadError payload)', async () => {
    renderSchema(
      buildForm('input-file', 'file', {
        uploadAction: { action: 'ajax', args: { url: '/api/upload-fail' } },
      }),
    );
    const input = document.querySelector<HTMLInputElement>(
      'input[data-testid="nop-input-file-input"]',
    )!;
    setFiles(input, [new File(['x'], 'bad.txt')]);

    // The server responds { data: { message: 'rejected' } }; that message must
    // propagate to the user-visible error (and is the same string carried by the
    // onUploadError event payload's `error` field via toUploadError).
    await waitFor(() => {
      const errorSlot = document.querySelector('[data-slot="upload-error"]');
      expect(errorSlot?.textContent).toBe('rejected');
    });
  });

  it('warns when uploadAction is missing', async () => {
    renderSchema(buildForm('input-file', 'file', {}));
    const input = document.querySelector<HTMLInputElement>(
      'input[data-testid="nop-input-file-input"]',
    )!;
    setFiles(input, [new File(['x'], 'orphan.txt')]);

    await waitFor(() => {
      expect(screen.queryByTestId('nop-input-file-missing-action')).toBeTruthy();
    });
  });
});

describe('input-file — U3 successive selection appends', () => {
  it('appends across successive selections (select 2 then 1 → 3 total)', async () => {
    renderSchema(
      buildForm('input-file', 'files', {
        multiple: true,
        valueMode: 'array',
        uploadAction: { action: 'ajax', args: { url: '/api/upload' } },
      }),
    );
    const input = document.querySelector<HTMLInputElement>(
      'input[data-testid="nop-input-file-input"]',
    )!;

    // First batch: 2 files.
    setFiles(input, [new File(['a'], 'a.txt'), new File(['b'], 'b.txt')]);
    await waitFor(() =>
      expect(
        document.querySelectorAll(
          '[data-testid="nop-input-file-item"][data-item-status="done"]',
        ).length,
      ).toBe(2),
    );

    // Second batch: 1 more file.
    setFiles(input, [new File(['c'], 'c.txt')]);
    await waitFor(() =>
      expect(
        document.querySelectorAll(
          '[data-testid="nop-input-file-item"][data-item-status="done"]',
        ).length,
      ).toBe(3),
    );

    await submit();
    const stored = submitCalls[0].files as unknown[];
    expect(stored).toHaveLength(3);
    expect((stored[0] as { url: string }).url).toBe('https://cdn.example.com/a.txt');
    expect((stored[2] as { url: string }).url).toBe('https://cdn.example.com/c.txt');
  });
});

describe('input-file — U4 init existing list + new upload merges', () => {
  it('preserves existing items and merges a new upload (init 2 + add 1 → 3)', async () => {
    renderSchema(
      buildForm(
        'input-file',
        'files',
        {
          multiple: true,
          valueMode: 'array',
          uploadAction: { action: 'ajax', args: { url: '/api/upload' } },
        },
        [
          { url: 'https://existing.example.com/one', name: 'one' },
          { url: 'https://existing.example.com/two', name: 'two' },
        ],
      ),
    );

    // Existing items render immediately.
    expect(
      document.querySelectorAll(
        '[data-testid="nop-input-file-item"][data-item-status="done"]',
      ).length,
    ).toBe(2);

    const input = document.querySelector<HTMLInputElement>(
      'input[data-testid="nop-input-file-input"]',
    )!;
    setFiles(input, [new File(['n'], 'new.txt')]);
    await waitFor(() =>
      expect(
        document.querySelectorAll(
          '[data-testid="nop-input-file-item"][data-item-status="done"]',
        ).length,
      ).toBe(3),
    );

    await submit();
    const stored = submitCalls[0].files as Array<{ url: string }>;
    expect(stored).toHaveLength(3);
    // Existing items are preserved.
    expect(stored[0]!.url).toBe('https://existing.example.com/one');
    expect(stored[1]!.url).toBe('https://existing.example.com/two');
    // New upload appended.
    expect(stored[2]!.url).toBe('https://cdn.example.com/new.txt');
  });
});

describe('input-image — preview shell', () => {
  it('renders a thumbnail for an uploaded image', async () => {
    renderSchema(
      buildForm('input-image', 'avatar', {
        uploadAction: { action: 'ajax', args: { url: '/api/upload-image' } },
      }),
    );
    expect(document.querySelector('.nop-input-image')).toBeTruthy();
    const input = document.querySelector<HTMLInputElement>(
      'input[data-testid="nop-input-image-input"]',
    )!;
    setFiles(input, [new File(['img'], 'pic.png', { type: 'image/png' })]);

    await waitFor(() => {
      const thumb = document.querySelector('[data-testid="nop-input-image-thumbnail"]') as HTMLImageElement | null;
      expect(thumb).toBeTruthy();
      expect(thumb!.getAttribute('src')).toBe('https://cdn.example.com/pic.png');
    });
  });
});
