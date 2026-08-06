import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { createLayoutSchemaRenderer, env, formulaCompiler } from './test-support.js';

function wizardRoot() {
  return document.querySelector('.nop-wizard') as HTMLElement;
}

describe('WizardRenderer — schema event dispatch ctx (CX-10 / bug-83 family)', () => {
  afterEach(() => {
    cleanup();
  });

  function urlCaptureEnv(urls: string[]): RendererEnv {
    return {
      fetcher: async function <T>(api: { url?: string }) {
        urls.push(api?.url ?? '');
        return { ok: true, status: 200, data: null as T };
      },
      notify: () => undefined,
    };
  }

  it('resolves ${currentStepKey} in onChange/onStepCommit/onComplete action args via ctx', async () => {
    const urls: string[] = [];
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-ctx"
        schema={{
          type: 'page',
          body: [
            {
              type: 'wizard',
              steps: [
                { key: 'account', title: 'Account', body: [{ type: 'text', text: 'A' }] },
                { key: 'profile', title: 'Profile', body: [{ type: 'text', text: 'B' }] },
                { key: 'done', title: 'Done', body: [{ type: 'text', text: 'C' }] },
              ],
              onChange: { action: 'ajax', args: { url: '/change-${currentStepKey}' } },
              onStepCommit: { action: 'ajax', args: { url: '/commit-${currentStepKey}' } },
              onComplete: { action: 'ajax', args: { url: '/complete-${currentStepKey}' } },
            },
          ],
        }}
        data={{}}
        env={urlCaptureEnv(urls)}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByTestId('wizard-next'));
    await waitFor(() => expect(urls).toContain('/commit-account'));
    await waitFor(() => expect(urls).toContain('/change-profile'));

    fireEvent.click(screen.getByTestId('wizard-next'));
    await waitFor(() => expect(urls).toContain('/commit-profile'));

    fireEvent.click(screen.getByTestId('wizard-next'));
    await waitFor(() => expect(urls).toContain('/commit-done'));
    await waitFor(() => expect(urls).toContain('/complete-done'));
  });

  it('resolves ${currentStepKey} in onStepError action args when commit fails', async () => {
    const urls: string[] = [];
    const fetcher = vi.fn(async (api: { url?: string }) => {
      urls.push(api?.url ?? '');
      return { ok: api?.url !== '/api/commit-fail', status: 200, data: null as never };
    }) as unknown as RendererEnv['fetcher'];
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-ctx-error"
        schema={{
          type: 'page',
          body: [
            {
              type: 'wizard',
              steps: [
                { key: 'account', title: 'Account', body: [{ type: 'text', text: 'A' }] },
                { key: 'profile', title: 'Profile', body: [{ type: 'text', text: 'B' }] },
              ],
              onStepCommit: { action: 'ajax', args: { url: '/api/commit-fail' } },
              onStepError: { action: 'ajax', args: { url: '/step-error-${currentStepKey}' } },
            },
          ],
        }}
        data={{}}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByTestId('wizard-next'));

    await waitFor(() => expect(urls).toContain('/step-error-account'));
    expect(wizardRoot().getAttribute('data-current-step-index')).toBe('0');
  });
});
