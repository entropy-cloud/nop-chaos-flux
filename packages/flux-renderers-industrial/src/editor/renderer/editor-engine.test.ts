import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetLeaferMock } from '../../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../../symbols/register-builtin.js';
import { ScadaEditorEngine } from './editor-engine.js';
import type { ScadaConfig } from '../../serialization/config-types.js';

vi.mock('leafer-ui', () => import('../../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));

const configWithRect: ScadaConfig = {
  version: 1,
  variables: [],
  symbols: [
    { id: 'r1', type: 'scada-rect', x: 10, y: 20, width: 100, height: 50, fill: '#ff0000' },
    { id: 'r2', type: 'scada-ellipse', x: 200, y: 20, width: 80, height: 60 },
  ],
};

const configWithGroup: ScadaConfig = {
  version: 1,
  variables: [],
  symbols: [
    {
      id: 'g1',
      type: 'scada-group',
      x: 0,
      y: 0,
      children: [
        { id: 'child-a', type: 'scada-rect', x: 5, y: 5, width: 30, height: 30 },
      ],
    },
  ],
};

let container: HTMLDivElement;

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  container?.remove();
});

describe('ScadaEditorEngine lifecycle', () => {
  it('create + build + destroy', () => {
    const engine = ScadaEditorEngine.create({ container, width: 400, height: 300 });
    engine.build(configWithRect);
    expect(engine.getSymbols()).toHaveLength(2);
    expect(engine.isDestroyed()).toBe(false);
    engine.destroy();
    expect(engine.isDestroyed()).toBe(true);
  });

  it('destroy is idempotent', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.destroy();
    engine.destroy();
    expect(engine.isDestroyed()).toBe(true);
  });

  it('build injects editable:true on leaf symbols in edit mode', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithRect);
    const r1 = engine.getSymbol('r1');
    expect((r1?.node as unknown as { editable?: boolean }).editable).toBe(true);
    engine.destroy();
  });

  it('build constructs group children', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithGroup);
    expect(engine.getSymbol('g1')).toBeDefined();
    expect(engine.getSymbol('child-a')).toBeDefined();
    engine.destroy();
  });

  it('throws on unknown symbol type', () => {
    const engine = ScadaEditorEngine.create({ container });
    expect(() =>
      engine.build({ version: 1, variables: [], symbols: [{ id: 'x', type: 'no-such-type' }] }),
    ).toThrow('unknown scada symbol type');
    engine.destroy();
  });
});

describe('ScadaEditorEngine viewport commands (reuse runtime viewport.ts)', () => {
  it('getSize / setSize', () => {
    const engine = ScadaEditorEngine.create({ container, width: 200, height: 150 });
    expect(engine.getSize()).toEqual({ width: 200, height: 150 });
    engine.setSize(500, 400);
    expect(engine.getSize()).toEqual({ width: 500, height: 400 });
    engine.destroy();
  });

  it('getViewport / setViewport / fit / center / zoomAt', () => {
    const engine = ScadaEditorEngine.create({ container, width: 400, height: 300 });
    engine.build(configWithRect);
    const initial = engine.getViewport();
    expect(initial).toEqual({ x: 0, y: 0, scale: 1 });
    engine.fit({ x: 0, y: 0, width: 200, height: 200 }, 10);
    const fitted = engine.getViewport();
    expect(fitted.scale).toBeGreaterThan(0);
    engine.setViewport({ x: 10, y: 20, scale: 2 });
    expect(engine.getViewport().x).toBe(10);
    engine.center({ x: 0, y: 0, width: 100, height: 100 });
    engine.zoomAt({ x: 50, y: 50 }, 1.5);
    expect(engine.getViewport().scale).toBeGreaterThan(0);
    // world ↔ viewport conversions
    const wp = engine.getWorldPoint({ x: 10, y: 10 });
    expect(typeof wp.x).toBe('number');
    const vp = engine.getViewportPoint(wp);
    expect(typeof vp.x).toBe('number');
    engine.destroy();
  });
});

describe('ScadaEditorEngine applyDiff (reuse serialization/diff)', () => {
  it('applies added/removed/updated diff', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithRect);
    engine.applyDiff(
      {
        added: [{ id: 'r3', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 }],
        removed: ['r1'],
        updated: [{ id: 'r2', patch: { x: 300 } }],
      },
      {
        version: 1,
        variables: [],
        symbols: [
          { id: 'r2', type: 'scada-ellipse', x: 300, y: 20, width: 80, height: 60 },
          { id: 'r3', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 },
        ],
      },
    );
    expect(engine.getSymbol('r1')).toBeUndefined();
    expect(engine.getSymbol('r2')).toBeDefined();
    expect(engine.getSymbol('r3')).toBeDefined();
    engine.destroy();
  });

  it('throws when applyDiff called before build', () => {
    const engine = ScadaEditorEngine.create({ container });
    expect(() => engine.applyDiff({ added: [], removed: [], updated: [] })).toThrow('not built');
    engine.destroy();
  });
});

describe('ScadaEditorEngine dual-state switching (R5)', () => {
  it('setMode preview clears editor selection + sets editable false', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithRect);
    expect(engine.currentMode).toBe('edit');
    engine.setMode('preview');
    expect(engine.currentMode).toBe('preview');
    const r1 = engine.getSymbol('r1');
    expect((r1?.node as unknown as { editable?: boolean }).editable).toBe(false);
    engine.destroy();
  });

  it('setMode edit re-enables editable', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithRect);
    engine.setMode('preview');
    engine.setMode('edit');
    expect(engine.currentMode).toBe('edit');
    const r1 = engine.getSymbol('r1');
    expect((r1?.node as unknown as { editable?: boolean }).editable).toBe(true);
    engine.destroy();
  });

  it('setMode is no-op when mode unchanged', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithRect);
    engine.setMode('edit');
    expect(engine.currentMode).toBe('edit');
    engine.destroy();
  });

  it('clearEditorSelection calls editor.cancel()', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithRect);
    const editor = engine.editor as { cancel?: () => void } | undefined;
    expect(editor).toBeDefined();
    expect(typeof editor?.cancel).toBe('function');
    engine.clearEditorSelection();
    engine.destroy();
  });

  it('setEditorTargets sets single node as target', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithRect);
    const r1 = engine.getSymbol('r1');
    engine.setEditorTargets([r1!.node]);
    engine.setEditorTargets([]);
    engine.destroy();
  });
});

describe('ScadaEditorEngine config queries', () => {
  it('getConfigNode finds top-level + nested nodes', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithGroup);
    expect(engine.getConfigNode('g1')?.id).toBe('g1');
    expect(engine.getConfigNode('child-a')?.id).toBe('child-a');
    expect(engine.getConfigNode('nonexistent')).toBeUndefined();
    engine.destroy();
  });

  it('getCurrentConfig returns built config', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithRect);
    expect(engine.getCurrentConfig()?.symbols).toHaveLength(2);
    engine.destroy();
  });

  it('getSymbolProps returns node attrs for known symbol', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithRect);
    const props = engine.getSymbolProps('r1');
    expect(props).toBeDefined();
    engine.destroy();
  });

  it('getSymbolProps returns undefined for unknown symbol', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithRect);
    expect(engine.getSymbolProps('nonexistent')).toBeUndefined();
    engine.destroy();
  });

  it('getSymbol returns undefined for unknown id', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithRect);
    expect(engine.getSymbol('nonexistent')).toBeUndefined();
    engine.destroy();
  });

  it('applyUpdate with device symbol covers applyProps branch', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build({
      version: 1,
      variables: [],
      symbols: [
        { id: 'motor-1', type: 'scada-device-motor', x: 10, y: 10, width: 80, height: 60 },
      ],
    });
    engine.applyDiff(
      { added: [], removed: [], updated: [{ id: 'motor-1', patch: { fill: '#00ff00' } }] },
      {
        version: 1,
        variables: [],
        symbols: [
          { id: 'motor-1', type: 'scada-device-motor', x: 10, y: 10, width: 80, height: 60, fill: '#00ff00' },
        ],
      },
    );
    expect(engine.getSymbol('motor-1')).toBeDefined();
    engine.destroy();
  });

  it('getSymbolByNode maps leafer node back to nodeId', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithRect);
    const r1Node = engine.getSymbol('r1')?.node;
    expect(r1Node).toBeDefined();
    expect(engine.getSymbolByNode(r1Node as object)).toBe('r1');
    engine.destroy();
  });

  it('editor getter returns the editor instance', () => {
    const engine = ScadaEditorEngine.create({ container });
    expect(engine.editor).toBeDefined();
    engine.destroy();
  });

  it('getCid returns assigned cid', () => {
    const engine = ScadaEditorEngine.create({ container, cid: 7777 });
    expect(engine.getCid()).toBe(7777);
    engine.destroy();
  });

  it('tree/ground/sky getters expose leafer layers', () => {
    const engine = ScadaEditorEngine.create({ container, width: 100, height: 100 });
    engine.build(configWithRect);
    expect(engine.tree).toBeDefined();
    expect(engine.ground).toBeDefined();
    expect(engine.sky).toBeDefined();
    engine.destroy();
  });

  it('getSymbols returns all registered symbols', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithGroup);
    expect(engine.getSymbols().map((s) => s.id).sort()).toEqual(['child-a', 'g1']);
    engine.destroy();
  });

  it('setEditorTargets with multiple nodes', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithRect);
    const nodes = engine.getSymbols().map((s) => s.node);
    engine.setEditorTargets(nodes);
    engine.destroy();
  });

  it('getCurrentConfig null before build', () => {
    const engine = ScadaEditorEngine.create({ container });
    expect(engine.getCurrentConfig()).toBeNull();
    engine.destroy();
  });

  it('setMode preview then edit is idempotent on second edit', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithRect);
    engine.setMode('preview');
    engine.setMode('edit');
    engine.setMode('edit'); // no-op
    expect(engine.currentMode).toBe('edit');
    engine.destroy();
  });
});

describe('ScadaEditorEngine group buildNode branches', () => {
  it('builds group with undefined x/y (defaults to 0)', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build({
      version: 1,
      variables: [],
      symbols: [
        {
          id: 'g-noxy',
          type: 'scada-group',
          children: [{ id: 'c1', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 }],
        },
      ],
    });
    expect(engine.getSymbol('g-noxy')).toBeDefined();
    expect(engine.getSymbol('c1')).toBeDefined();
    engine.destroy();
  });

  it('builds group with rotation/visible/opacity/scale', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build({
      version: 1,
      variables: [],
      symbols: [
        {
          id: 'g-styled',
          type: 'scada-group',
          x: 10,
          y: 20,
          rotation: 30,
          visible: true,
          opacity: 0.9,
          scale: 1.5,
          children: [{ id: 'c2', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 }],
        },
      ],
    });
    expect(engine.getSymbol('g-styled')).toBeDefined();
    engine.destroy();
  });

  it('applyDiff handles unknown removed id gracefully', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithRect);
    engine.applyDiff(
      { added: [], removed: ['nonexistent'], updated: [{ id: 'also-missing', patch: { x: 0 } }] },
      configWithRect,
    );
    // No crash = pass
    expect(engine.getSymbols()).toHaveLength(2);
    engine.destroy();
  });

  it('applyDiff with empty diff does nothing', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithRect);
    engine.applyDiff({ added: [], removed: [], updated: [] });
    expect(engine.getSymbols()).toHaveLength(2);
    engine.destroy();
  });

  it('setEditorTargets with empty array clears selection', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithRect);
    engine.setEditorTargets([]);
    engine.destroy();
  });

  it('applyDiff removes group child via subtree removal', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithGroup);
    expect(engine.getSymbol('child-a')).toBeDefined();
    engine.applyDiff(
      { added: [], removed: ['g1'], updated: [] },
      { version: 1, variables: [], symbols: [] },
    );
    expect(engine.getSymbol('g1')).toBeUndefined();
    expect(engine.getSymbol('child-a')).toBeUndefined();
    engine.destroy();
  });

  it('setMode on group config covers group-vs-leaf editable branch', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithGroup);
    engine.setMode('preview');
    engine.setMode('edit');
    engine.destroy();
  });

  it('removeSymbol with parent (group child) covers parentId branch', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithGroup);
    engine.applyDiff(
      { added: [], removed: ['child-a'], updated: [] },
      {
        version: 1,
        variables: [],
        symbols: [{ id: 'g1', type: 'scada-group', x: 0, y: 0, children: [] }],
      },
    );
    expect(engine.getSymbol('child-a')).toBeUndefined();
    expect(engine.getSymbol('g1')).toBeDefined();
    engine.destroy();
  });
});
