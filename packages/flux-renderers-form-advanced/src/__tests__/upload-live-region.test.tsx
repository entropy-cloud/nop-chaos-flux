import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formulaCompiler } from '../test-support.js';
import { formAdvancedRendererDefinitions } from '../index.js';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import type { ApiRequestContext, RendererEnv } from '@nop-chaos/flux-core';
import { installFormAdvancedTestHooks } from '../test-support.js';

installFormAdvancedTestHooks();

const allDefinitions = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

const staticEnv: RendererEnv = {
  fetcher: async <T,>(api: unknown, ctx?: ApiRequestContext) => ({ status: 0, data: ctx?.scope?.readOwn?.() as T }),
  notify: () => undefined,
};

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

// plan 2026-09-29-5 R2-U5: the per-file list (uploading / per-item error) is
// the most important feedback surface for screen-reader users — it must be a
// live region.
describe('upload file list live region (plan 2026-09-29-5 Phase 3)', () => {
  it('renders the file list as an aria-live polite region', () => {
    const SchemaRenderer = createSchemaRenderer(allDefinitions);
    render(
      <SchemaRenderer
        schemaUrl="test://upload-live-region"
        schema={
          {
            type: 'form',
            id: 'f',
            data: { files: [{ url: 'https://example.test/a.png', filename: 'a.png' }] },
            body: [
              {
                type: 'input-file',
                name: 'files',
                label: 'files',
                multiple: true,
                valueMode: 'array',
              },
            ],
          } as never
        }
        env={staticEnv}
        formulaCompiler={formulaCompiler}
      />,
    );
    const list = document.querySelector('[data-testid="nop-input-file-list"]');
    expect(list).toBeTruthy();
    expect(list?.getAttribute('aria-live')).toBe('polite');
  });
});
