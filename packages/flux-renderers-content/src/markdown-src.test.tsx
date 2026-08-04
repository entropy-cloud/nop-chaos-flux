// @vitest-environment jsdom

import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { contentRendererDefinitions } from './content-renderer-definitions.js';

const pageRenderer: RendererDefinition = {
  type: 'page',
  component: (props) => <section>{props.regions.body?.render() as React.ReactNode}</section>,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

function createContentSchemaRenderer() {
  return createSchemaRenderer([pageRenderer, ...contentRendererDefinitions]);
}

const formulaCompiler = createFormulaCompiler();

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// DD9 remote src fetch must go through env.fetcher (INV-1 env IO boundary) —
// direct browser fetch() is a hard red line (renderer-env.md §6 rule 1).
describe('MarkdownRenderer — DD9 remote src fetch via env.fetcher (INV-1)', () => {
  it('fetches content through env.fetcher (never global fetch) and renders it', async () => {
    const globalFetchSpy = vi.fn();
    vi.stubGlobal('fetch', globalFetchSpy);

    const env = {
      fetcher: async function <T>(api: { url?: string; responseType?: string }) {
        expect(api.url).toBe('https://example.com/doc.md');
        expect(api.responseType).toBe('text');
        return { ok: true, status: 200, data: '# Hello from remote' as T };
      },
      notify: () => undefined,
    } as unknown as RendererEnv;

    const SchemaRenderer = createContentSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://content/markdown-src"
        schema={
          {
            type: 'page',
            body: [{ type: 'markdown', testid: 'md-src', src: 'https://example.com/doc.md' }],
          } as never
        }
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      const root = document.querySelector('[data-testid="md-src"]');
      expect(root?.querySelector('h1')?.textContent).toBe('Hello from remote');
    });
    // INV-1: the renderer must never call the browser fetch directly.
    expect(globalFetchSpy).not.toHaveBeenCalled();
  });

  it('shows error state when env.fetcher fails', async () => {
    const env = {
      fetcher: async function () {
        throw new Error('Not found');
      },
      notify: () => undefined,
    } as unknown as RendererEnv;

    const SchemaRenderer = createContentSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://content/markdown-src-error"
        schema={
          {
            type: 'page',
            body: [
              { type: 'markdown', testid: 'md-src-err', src: 'https://example.com/missing.md' },
            ],
          } as never
        }
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      const root = document.querySelector('[data-testid="md-src-err"]');
      expect(root?.getAttribute('data-state')).toBe('error');
    });
  });

  it('treats a non-ok envelope as an error', async () => {
    const env = {
      fetcher: async function <T>() {
        return { ok: false, status: 404, data: null as T };
      },
      notify: () => undefined,
    } as unknown as RendererEnv;

    const SchemaRenderer = createContentSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://content/markdown-src-notfound"
        schema={
          {
            type: 'page',
            body: [
              { type: 'markdown', testid: 'md-src-404', src: 'https://example.com/404.md' },
            ],
          } as never
        }
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      const root = document.querySelector('[data-testid="md-src-404"]');
      expect(root?.getAttribute('data-state')).toBe('error');
    });
  });

  it('aborts the in-flight fetcher on unmount', async () => {
    let capturedSignal: AbortSignal | undefined;
    const env = {
      fetcher: async function <T>(_api: unknown, ctx: { signal?: AbortSignal }) {
        capturedSignal = ctx?.signal;
        return new Promise<T>(() => {}); // never resolves
      },
      notify: () => undefined,
    } as unknown as RendererEnv;

    const SchemaRenderer = createContentSchemaRenderer();
    const { unmount } = render(
      <SchemaRenderer
        schemaUrl="test://content/markdown-src-abort"
        schema={
          {
            type: 'page',
            body: [{ type: 'markdown', testid: 'md-src-abort', src: 'https://example.com/slow.md' }],
          } as never
        }
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(capturedSignal).toBeDefined();
    });
    unmount();
    expect(capturedSignal?.aborted).toBe(true);
  });

  it('prefers inline content over src when both are present', () => {
    const env = {
      fetcher: async function () {
        throw new Error('must not be called');
      },
      notify: () => undefined,
    } as unknown as RendererEnv;

    const SchemaRenderer = createContentSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://content/markdown-src-inline"
        schema={
          {
            type: 'page',
            body: [
              {
                type: 'markdown',
                testid: 'md-inline',
                content: '# Inline',
                src: 'https://example.com/doc.md',
              },
            ],
          } as never
        }
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = document.querySelector('[data-testid="md-inline"]');
    expect(root?.querySelector('h1')?.textContent).toBe('Inline');
  });
});
