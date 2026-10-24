import React from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { contentRendererDefinitions } from '../content-renderer-definitions.js';
import type { RegisteredRendererDefinition, RendererEnv } from '@nop-chaos/flux-core';

const pageRenderer: RegisteredRendererDefinition = {
  type: 'page',
  component: (props) => <section>{props.regions.body?.render() as React.ReactNode}</section>,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

const env = {
  fetcher: async function <T>() {
    return { status: 0, data: null as T };
  },
  notify: () => undefined,
} as unknown as RendererEnv;

function renderMarkdown(content: string, extra: Record<string, unknown> = {}) {
  const SchemaRenderer = createSchemaRenderer([pageRenderer, ...contentRendererDefinitions]);
  return render(
    <SchemaRenderer
      schemaUrl="test://markdown-code-highlight"
      schema={{ type: 'page', body: [{ type: 'markdown', content, ...extra }] } as never}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function queryHighlight(): HTMLElement | null {
  return document.querySelector('[data-code-highlight="true"]');
}

beforeAll(async () => {
  // Warm the lazy chunk: the module-level React.lazy wraps this same dynamic
  // import, so the first fenced render does not suspend on a cold transform.
  await import('@nop-chaos/flux-code-editor');
});

afterEach(() => {
  cleanup();
});

describe('markdown codeHighlight (G4I)', () => {
  it('renders highlighted fence with marker when enabled (discriminating: fails without implementation)', async () => {
    renderMarkdown(
      '```js\nconst answer = 42;\n```',
      { codeHighlight: true },
    );
    await waitFor(() => {
      const marker = queryHighlight();
      expect(marker).toBeTruthy();
      // ColorizeView emits highlight token spans for a known language
      expect(marker?.querySelectorAll('span').length).toBeGreaterThan(0);
    }, { timeout: 15000 });
  });

  it('falls back to a plain text pre for unknown languages (marker still present)', async () => {
    renderMarkdown(
      '```whitespace\nv .v .v\n```',
      { codeHighlight: true },
    );
    await waitFor(() => {
      const marker = queryHighlight();
      expect(marker).toBeTruthy();
      expect(marker?.querySelector('pre')).toBeTruthy();
      expect(marker?.querySelectorAll('span').length).toBe(0);
    });
  });

  it('renders bare fences (no language tag) as plain pre with marker', async () => {
    renderMarkdown('```\nplain fence\n```', { codeHighlight: true });
    await waitFor(() => {
      const marker = queryHighlight();
      expect(marker).toBeTruthy();
      expect(marker?.textContent).toContain('plain fence');
    });
  });

  it('resolves language aliases (md → markdown)', async () => {
    renderMarkdown('```md\n# Title\n```', { codeHighlight: true });
    await waitFor(() => {
      const marker = queryHighlight();
      expect(marker?.querySelector('[data-colorize-language="markdown"]')).toBeTruthy();
    });
  });

  it('keeps default rendering when codeHighlight is not declared (regression guard)', () => {
    renderMarkdown('```js\nconst answer = 42;\n```');
    expect(queryHighlight()).toBeNull();
    expect(document.body.textContent).toContain('const answer = 42;');
  });

  it('does not highlight inline code', () => {
    renderMarkdown('Run `npm install` now.', { codeHighlight: true });
    expect(queryHighlight()).toBeNull();
    expect(document.body.textContent).toContain('npm install');
  });
});
