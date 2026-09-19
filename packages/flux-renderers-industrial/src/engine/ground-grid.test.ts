import { afterEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { ScadaCanvasEngine } from '../engine/scada-engine.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

function makeContainer(): HTMLElement {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 0 });
  Object.defineProperty(el, 'clientHeight', { value: 0 });
  document.body.appendChild(el);
  return el;
}

function gridGroup(engine: ScadaCanvasEngine): { children: unknown[] } | null {
  const ground = (engine as unknown as { ground: { children?: Array<{ name?: string; children?: unknown[] }> } }).ground;
  const group = ground?.children?.find((child) => child.name === 'scada-ground-grid');
  return (group as { children: unknown[] }) ?? null;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ground grid runtime consumption (plan 474 V4-F1/A1)', () => {
  it('draws grid lines on the ground layer from background.grid at construction', () => {
    const engine = ScadaCanvasEngine.create({
      container: makeContainer(),
      width: 480,
      height: 240,
      background: { color: '#101820', grid: { size: 24, color: '#2c3a4d' } },
    });
    const group = gridGroup(engine);
    expect(group).not.toBeNull();
    // 480/24 = 20 columns → 19 interior verticals; 240/24 = 10 rows → 9 horizontals
    expect(group!.children.length).toBe(28);
  });

  it('clears then redraws on reset without stacking line nodes', () => {
    const engine = ScadaCanvasEngine.create({
      container: makeContainer(),
      width: 480,
      height: 240,
      background: { grid: { size: 24, color: '#2c3a4d' } },
    });
    const before = gridGroup(engine)!.children.length;
    engine.reset({
      background: { grid: { size: 48, color: '#405060' } },
      symbols: [],
    } as unknown as Parameters<ScadaCanvasEngine['reset']>[0]);
    const after = gridGroup(engine)!.children.length;
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThan(0);
    // repeated resets stay flat (clear-then-draw, no stacking)
    engine.reset({
      background: { grid: { size: 48, color: '#405060' } },
      symbols: [],
    } as unknown as Parameters<ScadaCanvasEngine['reset']>[0]);
    expect(gridGroup(engine)!.children.length).toBe(after);
  });

  it('clears the grid when a reset omits background.grid (backwards compatible)', () => {
    const engine = ScadaCanvasEngine.create({
      container: makeContainer(),
      width: 480,
      height: 240,
      background: { grid: { size: 24, color: '#2c3a4d' } },
    });
    expect(gridGroup(engine)).not.toBeNull();
    engine.reset({ symbols: [] } as unknown as Parameters<ScadaCanvasEngine['reset']>[0]);
    expect(gridGroup(engine)).toBeNull();
  });

  it('redraws the grid against the new size on setSize', () => {
    const engine = ScadaCanvasEngine.create({
      container: makeContainer(),
      width: 480,
      height: 240,
      background: { grid: { size: 24, color: '#2c3a4d' } },
    });
    const before = gridGroup(engine)!.children.length;
    engine.setSize(960, 480);
    const after = gridGroup(engine)!.children.length;
    expect(after).toBeGreaterThan(before);
  });
});
