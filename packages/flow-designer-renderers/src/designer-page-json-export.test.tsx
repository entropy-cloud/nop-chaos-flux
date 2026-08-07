import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fluxCore from '@nop-chaos/flux-core';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { formulaCompiler } from './index-test-support.js';
import {
  createDesignerPageSchemaRenderer,
  createGraphTestConfig,
  createRendererEnv,
  getLatestCreatedDesignerCore,
} from './designer-page.test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('designer-page JSON export dialog - parse failure (19-3)', () => {
  it('reports JSON.parse failures through reportHostIssue and shows an error message instead of silent empty content', async () => {
    const reportSpy = vi
      .spyOn(fluxCore, 'reportRuntimeHostIssue')
      .mockImplementation(() => undefined);
    const SchemaRenderer = createDesignerPageSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flow/index-json-parse-failure"
        schema={{
          type: 'designer-page',
          document: {
            id: 'doc-1',
            kind: 'flow',
            name: 'Example',
            version: '1.0.0',
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
          config: {
            ...createGraphTestConfig(),
            toolbar: {
              items: [{ type: 'button', action: 'designer:export', label: 'Export' }],
            },
          },
        }}
        env={createRendererEnv() as RendererEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    const core = getLatestCreatedDesignerCore();
    expect(core).toBeTruthy();
    vi.spyOn(core, 'exportDocument').mockReturnValue('{ not valid json');

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() => {
      expect(reportSpy).toHaveBeenCalled();
    });
    const reportCall = reportSpy.mock.calls.at(-1)?.[0] as {
      message?: string;
      details?: { reason?: string };
    };
    expect(reportCall?.details?.reason).toBe('designer-json-export-parse-failed');

    await waitFor(() => {
      expect(globalThis.document.querySelector('[data-slot="designer-json-panel-error"]')).toBeTruthy();
    });
  });

  it('renders the parsed document in the JSON panel on the happy path (behavior unchanged)', async () => {
    const reportSpy = vi
      .spyOn(fluxCore, 'reportRuntimeHostIssue')
      .mockImplementation(() => undefined);
    const SchemaRenderer = createDesignerPageSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flow/index-json-parse-ok"
        schema={{
          type: 'designer-page',
          document: {
            id: 'doc-1',
            kind: 'flow',
            name: 'Example',
            version: '1.0.0',
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
          config: {
            ...createGraphTestConfig(),
            toolbar: {
              items: [{ type: 'button', action: 'designer:export', label: 'Export' }],
            },
          },
        }}
        env={createRendererEnv() as RendererEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() => {
      expect(globalThis.document.querySelector('[data-slot="designer-json-panel"]')).toBeTruthy();
    });
    await waitFor(() => {
      expect(
        globalThis.document.querySelector('[data-slot="designer-json-panel-body"]')?.textContent ?? '',
      ).toContain('doc-1');
    });
    expect(reportSpy).not.toHaveBeenCalled();
  });
});
