import { cleanup, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import {
  configProp,
  createScadaTestEnvironment,
  makeScadaCanvasProps,
  renderScadaCanvas,
} from '../test-support/renderer-test-support.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
});

afterEach(() => {
  cleanup();
});

/**
 * WA-industrial-002 (plan 569): the runtime canvas tagged its slot marker
 * with a one-shot querySelector effect — the exact race the editor twin
 * already fixed via W7 MutationObserver robustification (fe5636a09): if
 * leafer creates/recreates the canvas after that effect runs (or replaces
 * it internally), the `data-slot="scada-canvas-canvas"` anchor that host
 * and e2e geometry assertions rely on never lands. The shared
 * `observeFirstCanvasTagging` re-tags via MutationObserver — this test
 * replaces the mounted canvas and requires the marker to re-land.
 */
describe('scada-canvas marker race (WA-industrial-002)', () => {
  it('re-tags the canvas when leafer recreates it after mount', async () => {
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(
      makeScadaCanvasProps({
        cid: 7,
        props: {
          config: configProp({
            version: 1,
            variables: [],
            symbols: [
              { id: 'rect-1', type: 'scada-rect', x: 10, y: 20, width: 100, height: 50, fill: '#ff0000' },
            ],
          }),
        },
      }),
      environment,
    );
    const tagged = await waitFor(() => {
      const canvas = document.querySelector('[data-slot="scada-canvas-canvas"]');
      expect(canvas).toBeTruthy();
      return canvas!;
    });

    // Simulate leafer internally recreating the canvas element.
    const fresh = document.createElement('canvas');
    tagged.replaceWith(fresh);

    // The shared fallback must re-tag the replacement.
    await waitFor(() => {
      expect(fresh.hasAttribute('data-slot')).toBe(true);
      expect(fresh.classList.contains('nop-scada-canvas-canvas')).toBe(true);
    });
  });
});
