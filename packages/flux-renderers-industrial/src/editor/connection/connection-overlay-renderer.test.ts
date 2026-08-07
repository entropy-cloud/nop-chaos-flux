import { describe, expect, it, vi } from 'vitest';
import { ConnectionOverlayRenderer } from './connection-overlay-renderer.js';
import type { ConnectionOverlayState } from './connection-overlay.js';

vi.mock('leafer-ui', () => import('../../test-support/leafer-ui-mock.js'));

/** ConnectionOverlayRenderer 单测（E8 M-1：sky 层 overlay 渲染器分支覆盖）。 */
function makeEngine(skyAdd: ((node: unknown) => void) | undefined) {
  return {
    sky: skyAdd ? { add: skyAdd } : undefined,
    getViewportPoint: (p: { x: number; y: number }) => p,
  } as never;
}

describe('ConnectionOverlayRenderer (E8 M-1)', () => {
  it('update renders drag-line + snap-dot nodes on sky layer', () => {
    const added: unknown[] = [];
    const renderer = new ConnectionOverlayRenderer(makeEngine((n) => added.push(n)));
    const state: ConnectionOverlayState = {
      highlights: [{ kind: 'snap-dot', world: { x: 10, y: 20 }, tooltip: 't', nodeId: 'n' }],
      dragLines: [{ kind: 'drag-line', from: { x: 0, y: 0 }, to: { x: 10, y: 20 } }],
    };
    renderer.update(state);
    expect(added).toHaveLength(2);
  });

  it('update with empty state adds nothing', () => {
    const added: unknown[] = [];
    const renderer = new ConnectionOverlayRenderer(makeEngine((n) => added.push(n)));
    renderer.update({ highlights: [], dragLines: [] });
    expect(added).toHaveLength(0);
  });

  it('update is a noop when sky layer missing', () => {
    const renderer = new ConnectionOverlayRenderer(makeEngine(undefined));
    expect(() =>
      renderer.update({
        highlights: [{ kind: 'snap-dot', world: { x: 1, y: 1 }, tooltip: 't', nodeId: 'n' }],
        dragLines: [],
      }),
    ).not.toThrow();
  });

  it('clear destroys previously added nodes', () => {
    const added: Array<{ destroyed?: boolean }> = [];
    const renderer = new ConnectionOverlayRenderer(makeEngine((n) => added.push(n as { destroyed?: boolean })));
    renderer.update({
      highlights: [{ kind: 'snap-dot', world: { x: 1, y: 1 }, tooltip: 't', nodeId: 'n' }],
      dragLines: [{ kind: 'drag-line', from: { x: 0, y: 0 }, to: { x: 1, y: 1 } }],
    });
    renderer.clear();
    expect(added.every((n) => n.destroyed === true)).toBe(true);
  });

  it('repeated update clears old nodes before adding new', () => {
    const added: Array<{ destroyed?: boolean }> = [];
    const renderer = new ConnectionOverlayRenderer(makeEngine((n) => added.push(n as { destroyed?: boolean })));
    renderer.update({
      highlights: [{ kind: 'snap-dot', world: { x: 1, y: 1 }, tooltip: 't', nodeId: 'n' }],
      dragLines: [],
    });
    const firstBatch = [...added];
    renderer.update({
      highlights: [],
      dragLines: [{ kind: 'drag-line', from: { x: 0, y: 0 }, to: { x: 1, y: 1 } }],
    });
    // first-batch nodes destroyed on second update
    expect(firstBatch.every((n) => n.destroyed === true)).toBe(true);
    expect(added.length).toBeGreaterThan(firstBatch.length);
  });
});
