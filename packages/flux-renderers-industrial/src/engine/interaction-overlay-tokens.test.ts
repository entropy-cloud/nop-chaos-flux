import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { ScadaCanvasEngine } from './scada-engine.js';
import { InteractionOverlay, INTERACTION_STYLE_PRESETS } from './interaction-overlay.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { clearScadaSymbolRegistry } from '../symbols/symbol-registry.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

const makeContainer = () => {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 600, configurable: true });
  return el;
};

function stubComputedStyles(tokens: Record<string, string>) {
  return vi
    .spyOn(window, 'getComputedStyle')
    .mockReturnValue({ getPropertyValue: (name: string) => tokens[name] ?? '' } as unknown as CSSStyleDeclaration);
}

function readOverlayRect(engine: ScadaCanvasEngine): Record<string, unknown> {
  const sky = engine.sky as unknown as { children: Array<{ children?: Array<Record<string, unknown>> }> };
  const group = sky.children[0] as unknown as { children: Array<Record<string, unknown>> };
  return group.children[0];
}

beforeEach(() => {
  resetLeaferMock();
  clearScadaSymbolRegistry();
  registerBuiltinScadaSymbols();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('InteractionOverlay 令牌接线（plan 530 S1 Phase 1）', () => {
  it('should resolve the default highlight style from --ind-* tokens (distinguishing: 旧常量实现下注入值不生效必挂)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
    engine.reset({ version: 1, symbols: [{ id: 'r', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 }] });
    const restore = stubComputedStyles({
      '--ind-interaction-hover': '#101112',
      '--ind-interaction-hover-fill': 'rgba(16, 17, 18, 0.2)',
    });
    expect(restore).toBeDefined();
    (engine.interactionOverlay as InteractionOverlay).highlight('r');
    const rect = readOverlayRect(engine);
    expect(rect.stroke).toBe('#101112');
    expect(rect.fill).toBe('rgba(16, 17, 18, 0.2)');
    expect(rect.strokeWidth).toBe(2);
    engine.destroy();
  });

  it('should fall back to preset constants when no tokens are present', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
    engine.reset({ version: 1, symbols: [{ id: 'r', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 }] });
    (engine.interactionOverlay as InteractionOverlay).highlight('r');
    const rect = readOverlayRect(engine);
    expect(rect.stroke).toBe(INTERACTION_STYLE_PRESETS.hover.stroke);
    expect(rect.fill).toBe(INTERACTION_STYLE_PRESETS.hover.fill);
    engine.destroy();
  });

  it('should keep explicit style arguments winning over resolved tokens', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
    engine.reset({ version: 1, symbols: [{ id: 'r', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 }] });
    const restore = stubComputedStyles({ '--ind-interaction-hover': '#101112' });
    expect(restore).toBeDefined();
    (engine.interactionOverlay as InteractionOverlay).highlight('r', { stroke: '#ff0000' });
    const rect = readOverlayRect(engine);
    expect(rect.stroke).toBe('#ff0000');
    engine.destroy();
  });

  it('should keep the shadow key across refresh (white-list coverage)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
    engine.reset({ version: 1, symbols: [{ id: 'r', type: 'scada-rect', x: 0, y: 0, width: 100, height: 50 }] });
    const overlay = engine.interactionOverlay as InteractionOverlay;
    overlay.highlight('r', INTERACTION_STYLE_PRESETS.selected);
    expect(readOverlayRect(engine).shadow).toBe(INTERACTION_STYLE_PRESETS.selected.shadow);
    overlay.refresh();
    expect(readOverlayRect(engine).shadow).toBe(INTERACTION_STYLE_PRESETS.selected.shadow);
    engine.destroy();
  });

  it('should expose the selected formula (ring + fill + shadow) through the presets surface', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
    engine.reset({ version: 1, symbols: [{ id: 'r', type: 'scada-rect', x: 0, y: 0, width: 100, height: 50 }] });
    const overlay = engine.interactionOverlay as InteractionOverlay;
    overlay.highlight('r', INTERACTION_STYLE_PRESETS.selected);
    const rect = readOverlayRect(engine);
    expect(rect.stroke).toBe(INTERACTION_STYLE_PRESETS.selected.stroke);
    expect(rect.fill).toBe(INTERACTION_STYLE_PRESETS.selected.fill);
    expect(rect.shadow).toBe(INTERACTION_STYLE_PRESETS.selected.shadow);
    engine.destroy();
  });
});
