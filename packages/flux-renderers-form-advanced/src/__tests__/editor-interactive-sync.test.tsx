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
 * G2-R3-视角3-02 (V12e plan 487 Phase 1, proof-first): the editor readOnly
 * sync effect compared/deps-ed on the SCHEMA readOnly flag only. When the
 * merged readOnly flips via the interactive channel (schema `disabled`
 * resolving true at runtime — presentation.interactive → false), the effect
 * never re-ran and the TipTap editor stayed editable even though the field
 * was disabled (handlers.onChange no-ops; typed content silently dropped).
 */
describe('editor — interactive flip syncs editable state (G2-R3-视角3-02)', () => {
  it('a runtime disabled flip makes the editor content non-editable', async () => {
    const SchemaRenderer = createSchemaRenderer([
      ...formRendererDefinitions,
      ...formAdvancedRendererDefinitions,
      buttonRenderer,
    ]);
    render(
      <SchemaRenderer
        schemaUrl="test://editor-interactive-sync"
        schema={
          {
            type: 'form',
            id: 'editor-lock-form',
            data: { locked: false, doc: '<p>editable text</p>' },
            body: [
              { type: 'editor', name: 'doc', label: 'doc', disabled: '${locked}' },
              {
                type: 'button',
                label: 'Lock',
                onClick: {
                  action: 'setValue',
                  args: { path: 'locked', value: true },
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
    await waitFor(() => expect(content.textContent).toContain('editable text'));

    // Baseline: editable while unlocked.
    expect(content.getAttribute('contenteditable')).toBe('true');

    // Flip ONLY the disabled channel (schema readOnly stays false).
    fireEvent.click(screen.getByText('Lock'));

    // The frame's merged readOnly marker flips…
    const frame = document.querySelector('[data-slot="editor"]') as HTMLElement;
    await waitFor(() => expect(frame.getAttribute('data-readonly')).toBe(''));
    // …and the TipTap instance itself must follow (previously stuck editable).
    await waitFor(() => expect(content.getAttribute('contenteditable')).toBe('false'));
  });
});
