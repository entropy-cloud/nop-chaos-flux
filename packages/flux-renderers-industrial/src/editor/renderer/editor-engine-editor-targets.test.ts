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

// Editor 选区与模式开关的判别性断言（plan 858：原套件调方法后零断言，变异必挂）。
describe('ScadaEditorEngine editor targets & mode (plan 858 discrimination)', () => {
  it('setEditorTargets sets single node as target', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithRect);
    const r1 = engine.getSymbol('r1');
    engine.setEditorTargets([r1!.node]);
    const editor = engine.editor as { target?: unknown };
    expect(editor.target).toBe(r1!.node);
    engine.setEditorTargets([]);
    expect(editor.target).toBeUndefined();
    engine.destroy();
  });

  it('setEditorTargets with multiple nodes', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithRect);
    const nodes = engine.getSymbols().map((s) => s.node);
    engine.setEditorTargets(nodes);
    const editor = engine.editor as { target?: unknown };
    expect(editor.target).toBe(nodes);
    engine.destroy();
  });

  it('setEditorTargets with empty array clears selection', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithRect);
    const editor = engine.editor as { target?: unknown; cancel?: () => void };
    const first = engine.getSymbol('r1');
    engine.setEditorTargets([first!.node]);
    expect(editor.target).toBe(first!.node);
    const cancelSpy = vi.spyOn(editor as { cancel?: () => void }, 'cancel');
    engine.setEditorTargets([]);
    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(editor.target).toBeUndefined();
    cancelSpy.mockRestore();
    engine.destroy();
  });

  it('setMode on group config covers group-vs-leaf editable branch', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithGroup);
    engine.setMode('preview');
    expect(engine.currentMode).toBe('preview');
    // 仅叶子图元（有 definition）拿 editable 开关；group 容器不被触碰
    const child = engine.getSymbol('child-a')!.node as { editable?: boolean };
    const group = engine.getSymbol('g1')!.node as { editable?: boolean };
    expect(child.editable).toBe(false);
    expect(group.editable).toBeUndefined();
    engine.setMode('edit');
    expect(engine.currentMode).toBe('edit');
    expect(child.editable).toBe(true);
    engine.destroy();
  });

  it('setMode(preview) clears the editor selection once; repeated/edit transitions do not', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(configWithGroup);
    const editor = engine.editor as { cancel?: () => void };
    const cancelSpy = vi.spyOn(editor as { cancel: () => void }, 'cancel');
    engine.setMode('preview');
    expect(cancelSpy).toHaveBeenCalledTimes(1);
    engine.setMode('preview');
    expect(cancelSpy).toHaveBeenCalledTimes(1);
    engine.setMode('edit');
    expect(cancelSpy).toHaveBeenCalledTimes(1);
    cancelSpy.mockRestore();
    engine.destroy();
  });
});
