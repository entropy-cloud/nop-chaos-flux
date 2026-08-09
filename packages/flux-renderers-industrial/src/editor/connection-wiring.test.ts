import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { ScadaEditorEngine } from './renderer/editor-engine.js';
import { wireConnectionDrag } from './connection-wiring.js';
import type { EditorRuntimeContext } from './runtime-factories.js';
import type { ScadaConfig } from '../serialization/config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));

const wiringConfig: ScadaConfig = {
  version: 1,
  variables: [],
  symbols: [
    {
      id: 'junction-1',
      type: 'scada-pipe-junction',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      custom: { connections: [] },
    },
    { id: 'device-1', type: 'scada-rect', x: 300, y: 100, width: 80, height: 60 },
  ],
};

let container: HTMLDivElement;
let engine: ScadaEditorEngine | undefined;

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
  container = document.createElement('div');
  document.body.appendChild(container);
  engine = ScadaEditorEngine.create({ container });
  engine.build(wiringConfig);
});

afterEach(() => {
  engine?.destroy();
  engine = undefined;
  container?.remove();
});

function makeCtx(ref: { current: boolean }): EditorRuntimeContext {
  return {
    engine,
    session: { workingConfig: wiringConfig, mode: 'edit' } as EditorRuntimeContext['session'],
    connectionDragActiveRef: ref,
  } as unknown as EditorRuntimeContext;
}

describe('wireConnectionDrag (HCA11-P2-2 pointerup 容器外释放)', () => {
  it('pointerup released outside container is captured at window level (ref resets + drag ends)', () => {
    const ref = { current: false };
    const cleanup = wireConnectionDrag(makeCtx(ref), container, () => undefined);

    // (a) pointerdown within junction-1 body (50,50 ∈ [0,0,100,100]) → enter endpoint drag mode
    container.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: 50, clientY: 50, bubbles: true, pointerId: 1, pointerType: 'mouse' }),
    );
    expect(ref.current).toBe(true);

    // (b) pointerup dispatched on WINDOW (simulating release outside the container, e.g. over inspector)
    // Before fix: container-level listener never fires → ref stays true (drag stuck).
    // After fix: window-level once-listener captures it → ref resets + endDrag.
    window.dispatchEvent(
      new PointerEvent('pointerup', { clientX: 50, clientY: 50, bubbles: true, pointerId: 1, pointerType: 'mouse' }),
    );
    expect(ref.current).toBe(false);

    cleanup();
  });

  it('container pointerup still resets ref when release happens inside container', () => {
    const ref = { current: false };
    const cleanup = wireConnectionDrag(makeCtx(ref), container, () => undefined);

    container.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: 50, clientY: 50, bubbles: true, pointerId: 1, pointerType: 'mouse' }),
    );
    expect(ref.current).toBe(true);
    container.dispatchEvent(
      new PointerEvent('pointerup', { clientX: 50, clientY: 50, bubbles: true, pointerId: 1, pointerType: 'mouse' }),
    );
    expect(ref.current).toBe(false);

    cleanup();
  });

  it('cleanup resets ref and removes window listener (no stuck listener after unmount)', () => {
    const ref = { current: false };
    const cleanup = wireConnectionDrag(makeCtx(ref), container, () => undefined);

    container.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: 50, clientY: 50, bubbles: true, pointerId: 1, pointerType: 'mouse' }),
    );
    expect(ref.current).toBe(true);

    cleanup();
    expect(ref.current).toBe(false);

    // After cleanup, a stray window pointerup must not throw / not resurrect drag.
    expect(() =>
      window.dispatchEvent(
        new PointerEvent('pointerup', { clientX: 1, clientY: 1, bubbles: true, pointerId: 1, pointerType: 'mouse' }),
      ),
    ).not.toThrow();
    expect(ref.current).toBe(false);
  });

  it('pointerdown not on a junction does not activate drag', () => {
    const ref = { current: false };
    const cleanup = wireConnectionDrag(makeCtx(ref), container, () => undefined);

    container.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: 500, clientY: 500, bubbles: true, pointerId: 1, pointerType: 'mouse' }),
    );
    expect(ref.current).toBe(false);

    cleanup();
  });
});
