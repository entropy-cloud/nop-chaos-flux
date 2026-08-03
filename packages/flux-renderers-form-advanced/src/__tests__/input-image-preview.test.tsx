import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

function makeUploadEnv(fail = false): RendererEnv {
  return {
    fetcher: async function <T>(api: any, ctx: ApiRequestContext) {
      const url = api?.url;
      const body = ctx.scope?.readOwn?.() ?? {};
      if (url === '/api/upload-image' && !fail) {
        const file = (body as { __uploadFile?: { name?: string; size?: number } }).__uploadFile ?? {
          name: 'img.bin',
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
      schemaUrl="test://input-image"
      schema={schema as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function buildForm(
  name: string,
  extra: Record<string, unknown> = {},
  initialValue: unknown = undefined,
) {
  return {
    type: 'form',
    id: 'image-form',
    data: initialValue === undefined ? {} : { [name]: initialValue },
    submitAction: { action: 'ajax', args: { url: '/api/submit', method: 'post' } },
    body: [
      { type: 'input-image', name, label: name, ...extra },
      {
        type: 'button',
        label: 'Submit',
        onClick: { action: 'component:submit', componentId: 'image-form' },
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

describe('input-image — P2-1 preview contract (C3.5)', () => {
  it('renders existing stored value as thumbnails (echo path)', async () => {
    renderSchema(
      buildForm('avatar', { multiple: true }, [
        { url: 'https://cdn.example.com/a.png', name: 'a.png' },
        { url: 'https://cdn.example.com/b.png', name: 'b.png' },
      ]),
    );
    const thumbs = document.querySelectorAll('[data-testid="nop-input-image-thumbnail"]');
    expect(thumbs).toHaveLength(2);
    expect((thumbs[0] as HTMLImageElement).getAttribute('src')).toBe(
      'https://cdn.example.com/a.png',
    );
    expect((thumbs[1] as HTMLImageElement).getAttribute('src')).toBe(
      'https://cdn.example.com/b.png',
    );
    await submit();
    expect((submitCalls[0].avatar as unknown[]).length).toBe(2);
  });

  it('previewMode fill applies the fill sizing class', () => {
    renderSchema(
      buildForm('avatar', { previewMode: 'fill' }, { url: 'https://cdn.example.com/a.png' }),
    );
    const thumb = document.querySelector(
      '[data-testid="nop-input-image-thumbnail"]',
    ) as HTMLImageElement | null;
    expect(thumb).toBeTruthy();
    expect(thumb!.className).toContain('h-20');
    expect(thumb!.className).toContain('w-full');
  });

  it('thumbnail mode keeps the compact size', () => {
    renderSchema(
      buildForm('avatar', { previewMode: 'thumbnail' }, { url: 'https://cdn.example.com/a.png' }),
    );
    const thumb = document.querySelector(
      '[data-testid="nop-input-image-thumbnail"]',
    ) as HTMLImageElement | null;
    expect(thumb!.className).toContain('size-12');
  });

  it('readOnly hides remove buttons and disables the trigger', async () => {
    renderSchema(
      buildForm(
        'avatar',
        { readOnly: true },
        { url: 'https://cdn.example.com/a.png', name: 'a.png' },
      ),
    );
    expect(document.querySelector('[data-testid="nop-input-image-remove-0"]')).toBeNull();
    expect(document.querySelector('[data-testid="nop-input-image-clear"]')).toBeNull();
    const trigger = document.querySelector<HTMLButtonElement>(
      '[data-testid="nop-input-image-trigger"]',
    );
    expect(trigger?.disabled).toBe(true);
    await submit();
    expect((submitCalls[0].avatar as { url: string }).url).toBe(
      'https://cdn.example.com/a.png',
    );
  });

  it('failed upload shows an error item, no thumbnail, and does not pollute the value', async () => {
    renderSchema(buildForm('avatar', {}), makeUploadEnv(true));
    const input = document.querySelector<HTMLInputElement>(
      'input[data-testid="nop-input-image-input"]',
    )!;
    setFiles(input, [new File(['x'], 'bad.png', { type: 'image/png' })]);
    await waitFor(() => {
      const errorItem = document.querySelector(
        '[data-testid="nop-input-image-item"][data-item-status="error"]',
      );
      expect(errorItem).toBeTruthy();
    });
    expect(document.querySelector('[data-testid="nop-input-image-thumbnail"]')).toBeNull();
    await submit();
    expect(submitCalls[0].avatar).toBeUndefined();
  });

  it('string-only stored values render thumbnails with the item as the url', () => {
    renderSchema(buildForm('avatar', {}, 'https://cdn.example.com/solo.png'));
    const thumb = document.querySelector(
      '[data-testid="nop-input-image-thumbnail"]',
    ) as HTMLImageElement | null;
    expect(thumb).toBeTruthy();
    expect(thumb!.getAttribute('src')).toBe('https://cdn.example.com/solo.png');
    expect(thumb!.getAttribute('alt')).toBe('https://cdn.example.com/solo.png');
  });
});
