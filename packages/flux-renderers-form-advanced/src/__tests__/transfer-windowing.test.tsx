import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { env, formulaCompiler } from '../test-support.js';
import { formAdvancedRendererDefinitions } from '../index.js';
import { TRANSFER_PANE_VIRTUAL_THRESHOLD } from '../transfer-renderer.js';

// plan 2026-09-29-6 Phase 3: transfer pane windowing above the threshold,
// full mount below it, and the O(S+N) selected-label index. Two layers:
// below-threshold cases render for real (happy-dom); the windowed branch
// mocks @tanstack/react-virtual with a deterministic window (happy-dom has
// no layout engine — the real-browser path is covered by the e2e spec).
const virtualMock = vi.hoisted(() => ({ windowSize: 20 }));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: (options: { count: number; estimateSize: () => number }) => {
    const count = options.count ?? 0;
    const size = options.estimateSize();
    const end = Math.min(count, virtualMock.windowSize);
    const items = Array.from({ length: end }, (_, index) => ({
      index,
      start: index * size,
      end: (index + 1) * size,
      size,
      key: String(index),
      lane: 0,
    }));
    return {
      getVirtualItems: () => items,
      getTotalSize: () => count * size,
      measureElement: () => undefined,
      scrollToIndex: () => undefined,
    };
  },
}));

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(cleanup);

function makeOptions(n: number) {
  return Array.from({ length: n }, (_, i) => ({ label: `Option ${i}`, value: `opt-${i}` }));
}

function renderTransfer(options: unknown[], value: string[] = []) {
  const onChange = vi.fn();
  const SchemaRenderer = createSchemaRenderer([
    ...basicRendererDefinitions,
    ...formRendererDefinitions,
    ...formAdvancedRendererDefinitions,
  ]);
  render(
    <SchemaRenderer
      schemaUrl="test://transfer-windowing"
      schema={
        {
          type: 'form',
          id: 'f',
          data: { picked: value },
          body: [
            {
              type: 'transfer',
              name: 'picked',
              label: 'Pick',
              multiple: true,
              options,
              onChange,
            },
          ],
        } as never
      }
      data={{ picked: value }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
  return { onChange };
}

function mountedCount(kind: 'candidate' | 'selected'): number {
  return document.querySelectorAll(`[data-slot="transfer-option-${kind}"]`).length;
}

describe('transfer pane windowing (plan 2026-09-29-6 Phase 3)', () => {
  it(`mounts every option below the threshold (${TRANSFER_PANE_VIRTUAL_THRESHOLD})`, () => {
    const count = TRANSFER_PANE_VIRTUAL_THRESHOLD - 1;
    renderTransfer(makeOptions(count));
    expect(mountedCount('candidate')).toBe(count);
  });

  it('gates windowing exactly at the threshold: above it only the pane window mounts', async () => {
    const count = TRANSFER_PANE_VIRTUAL_THRESHOLD + 200;
    renderTransfer(makeOptions(count));
    await waitFor(() => {
      // mocked virtual layer exposes a 20-item window
      expect(mountedCount('candidate')).toBe(20);
    });
    // the absolute-positioned window keeps the roving-tabindex UL intact
    expect(document.querySelector('ul[tabindex="0"]')).toBeTruthy();
  });

  it('keeps the selected pane labels resolved through the value index (end-to-end)', async () => {
    const count = 150;
    const value = ['opt-120', 'opt-40', 'opt-0'];
    renderTransfer(makeOptions(count), value);
    await waitFor(() => {
      expect(mountedCount('selected')).toBe(value.length);
      expect(screen.getByText('Option 120')).toBeTruthy();
      expect(screen.getByText('Option 40')).toBeTruthy();
      expect(screen.getByText('Option 0')).toBeTruthy();
    });
  });
});
