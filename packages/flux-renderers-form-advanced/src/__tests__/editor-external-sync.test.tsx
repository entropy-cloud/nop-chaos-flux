import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { buttonRenderer, formulaCompiler } from '../test-support.js';
import { formAdvancedRendererDefinitions } from '../index.js';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { installFormAdvancedTestHooks } from '../test-support.js';

installFormAdvancedTestHooks();

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

const noopEnv: RendererEnv = {
  fetcher: async function <T>() {
    return { status: 0, data: null as T };
  },
  notify: () => undefined,
};

/**
 * G2-R4-视角5-01 (V12b plan 485 Phase 2, proof-first): an external value
 * change arriving while the editor is FOCUSED must not be dropped — it is
 * queued and applied on blur (no stale commit, no lost sync).
 */
describe('editor — external sync while focused (G2-R4-视角5-01)', () => {
  it('applies an external value change received while focused after blur', async () => {
    const SchemaRenderer = createSchemaRenderer([
      ...formRendererDefinitions,
      ...formAdvancedRendererDefinitions,
      buttonRenderer,
    ]);
    render(
      <SchemaRenderer
        schemaUrl="test://editor-external-sync"
        schema={
          {
            type: 'form',
            id: 'editor-form',
            data: { doc: '<p>v1</p>' },
            body: [
              { type: 'editor', name: 'doc', label: 'doc' },
              {
                type: 'button',
                label: 'SetV2',
                onClick: {
                  action: 'setValue',
                  args: { path: 'doc', value: '<p>v2-external</p>' },
                },
              },
            ],
          } as never
        }
        env={noopEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    const content = document.querySelector('[data-testid="editor-content"]') as HTMLElement;
    expect(content).toBeTruthy();
    await waitFor(() => expect(content.textContent).toContain('v1'));

    // Focus the editor (user is editing), then an external write changes the
    // field value while focus is held.
    fireEvent.focus(content);
    fireEvent.click(screen.getByText('SetV2'));
    // Let the value change propagate through the form state → renderer props.
    await new Promise((resolve) => setTimeout(resolve, 30));

    // While focused the caret must not be clobbered (content stays v1).
    expect(content.textContent).toContain('v1');

    // On blur the queued external value MUST be applied (previously dropped).
    fireEvent.blur(content);
    await waitFor(() => {
      expect(content.textContent).toContain('v2-external');
    });
  });
});
