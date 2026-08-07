import { describe, expect, it, vi } from 'vitest';
import {
  ConnectionDragController,
  type ConnectionDragControllerDeps,
} from './connection-drag-controller.js';
import type { ScadaConfig, ScadaSymbolNode } from '../../serialization/config-types.js';
import { EMPTY_OVERLAY_STATE } from './connection-overlay.js';

/**
 * ConnectionDragController 单测（E8 M-1 修正：状态机生产驱动器）。
 *
 * 验证控制器驱动纯逻辑状态机（beginConnectionDrag → updateDragCandidate → commitConnectionDrag）
 * + overlay 投影（deriveOverlayState）+ 提交回调的完整流程。mock deps（不依赖 leafer / React）。
 */
function makeConfig(): ScadaConfig {
  return {
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
}

function makeDeps(config: ScadaConfig): ConnectionDragControllerDeps {
  return {
    getSymbols: () => config.symbols,
    findNode: (id) => findNode(config.symbols, id),
    viewportToWorld: (p) => p, // identity（视口 scale=1 offset=0）
  };
}

function findNode(symbols: ScadaSymbolNode[], id: string): ScadaSymbolNode | undefined {
  for (const node of symbols) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

describe('ConnectionDragController (E8 M-1)', () => {
  it('hitTestJunction returns junction when pointer within bounds', () => {
    const config = makeConfig();
    const controller = new ConnectionDragController(makeDeps(config), {
      onOverlayUpdate: () => {},
      onCommit: () => {},
    });
    expect(controller.hitTestJunction({ x: 50, y: 50 })?.id).toBe('junction-1');
    expect(controller.hitTestJunction({ x: 150, y: 50 })).toBeUndefined();
  });

  it('beginDrag activates drag mode for a pipe-junction', () => {
    const config = makeConfig();
    const controller = new ConnectionDragController(makeDeps(config), {
      onOverlayUpdate: () => {},
      onCommit: () => {},
    });
    expect(controller.isActive).toBe(false);
    expect(controller.beginDrag('junction-1')).toBe(true);
    expect(controller.isActive).toBe(true);
  });

  it('beginDrag rejects non-junction / nonexistent node', () => {
    const config = makeConfig();
    const controller = new ConnectionDragController(makeDeps(config), {
      onOverlayUpdate: () => {},
      onCommit: () => {},
    });
    expect(controller.beginDrag('device-1')).toBe(false);
    expect(controller.beginDrag('nope')).toBe(false);
    expect(controller.isActive).toBe(false);
  });

  it('moveDrag updates overlay with snap-dot when near a candidate anchor', () => {
    const config = makeConfig();
    const overlays: unknown[] = [];
    const controller = new ConnectionDragController(makeDeps(config), {
      onOverlayUpdate: (s) => overlays.push(s),
      onCommit: () => {},
    });
    controller.beginDrag('junction-1');
    // device-1 right-middle anchor world = (380, 130)；阈值 8px 内。
    controller.moveDrag({ x: 380, y: 130 });
    const last = overlays[overlays.length - 1] as { highlights: unknown[]; dragLines: unknown[] };
    expect(last.highlights).toHaveLength(1);
    expect(last.dragLines).toHaveLength(1);
  });

  it('moveDrag overlay has no snap-dot when no candidate', () => {
    const config = makeConfig();
    const overlays: unknown[] = [];
    const controller = new ConnectionDragController(makeDeps(config), {
      onOverlayUpdate: (s) => overlays.push(s),
      onCommit: () => {},
    });
    controller.beginDrag('junction-1');
    // 远离任何候选锚点。
    controller.moveDrag({ x: 5000, y: 5000 });
    const last = overlays[overlays.length - 1] as { highlights: unknown[]; dragLines: unknown[] };
    expect(last.highlights).toHaveLength(0);
    expect(last.dragLines).toHaveLength(1);
  });

  it('endDrag commits connection when candidate snapped and clears overlay', () => {
    const config = makeConfig();
    const commits: unknown[] = [];
    const overlays: unknown[] = [];
    const controller = new ConnectionDragController(makeDeps(config), {
      onOverlayUpdate: (s) => overlays.push(s),
      onCommit: (r) => commits.push(r),
    });
    controller.beginDrag('junction-1');
    controller.moveDrag({ x: 380, y: 130 });
    controller.endDrag();

    expect(controller.isActive).toBe(false);
    expect(commits).toHaveLength(1);
    const result = commits[0] as { junctionId: string; written: { target: string; id: string }; kind: string };
    expect(result.junctionId).toBe('junction-1');
    expect(result.written.target).toBe('device-1');
    expect(result.kind).toBe('create');
    // overlay 最终清空。
    const last = overlays[overlays.length - 1] as typeof EMPTY_OVERLAY_STATE;
    expect(last.highlights).toHaveLength(0);
    expect(last.dragLines).toHaveLength(0);
  });

  it('endDrag is a noop (no commit) when no candidate', () => {
    const config = makeConfig();
    const commits: unknown[] = [];
    const controller = new ConnectionDragController(makeDeps(config), {
      onOverlayUpdate: () => {},
      onCommit: (r) => commits.push(r),
    });
    controller.beginDrag('junction-1');
    controller.moveDrag({ x: 5000, y: 5000 });
    controller.endDrag();
    expect(commits).toHaveLength(0);
    expect(controller.isActive).toBe(false);
  });

  it('cancel aborts drag without committing', () => {
    const config = makeConfig();
    const commits: unknown[] = [];
    const overlays: unknown[] = [];
    const controller = new ConnectionDragController(makeDeps(config), {
      onOverlayUpdate: (s) => overlays.push(s),
      onCommit: (r) => commits.push(r),
    });
    controller.beginDrag('junction-1');
    controller.moveDrag({ x: 380, y: 130 });
    controller.cancel();
    expect(commits).toHaveLength(0);
    expect(controller.isActive).toBe(false);
    const last = overlays[overlays.length - 1] as typeof EMPTY_OVERLAY_STATE;
    expect(last.highlights).toHaveLength(0);
  });

  it('hitTestJunction finds junction nested inside a group (children recursion)', () => {
    const config: ScadaConfig = {
      version: 1,
      variables: [],
      symbols: [
        {
          id: 'group-1',
          type: 'scada-group',
          x: 0,
          y: 0,
          children: [
            {
              id: 'nested-junction',
              type: 'scada-pipe-junction',
              x: 10,
              y: 10,
              width: 50,
              height: 50,
              custom: { connections: [] },
            },
          ],
        },
      ],
    };
    const controller = new ConnectionDragController(makeDeps(config), {
      onOverlayUpdate: () => {},
      onCommit: () => {},
    });
    expect(controller.hitTestJunction({ x: 30, y: 30 })?.id).toBe('nested-junction');
    expect(controller.hitTestJunction({ x: 100, y: 100 })).toBeUndefined();
  });

  it('moveDrag / endDrag are noop when drag not active', () => {
    const config = makeConfig();
    const onCommit = vi.fn();
    const onOverlay = vi.fn();
    const controller = new ConnectionDragController(makeDeps(config), {
      onOverlayUpdate: onOverlay,
      onCommit,
    });
    controller.moveDrag({ x: 10, y: 10 });
    controller.endDrag();
    expect(onCommit).not.toHaveBeenCalled();
  });
});
