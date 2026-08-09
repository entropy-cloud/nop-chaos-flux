import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetLeaferMock, MockRect } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from './register-builtin.js';
import { clearScadaSymbolRegistry, registerScadaSymbol, unregisterScadaSymbol } from './symbol-registry.js';
import { instantiateSymbol } from './symbol-factory.js';
import type { ScadaSymbolDefinition, ScadaSymbolProps } from './symbol-types.js';
import { validateScadaConfig } from '../serialization/validate.js';
import { ScadaCanvasEngine } from '../engine/scada-engine.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

const makeContainer = () => {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 600, configurable: true });
  return el;
};

const customDef = (type: string, index: number): ScadaSymbolDefinition => ({
  type,
  name: `Custom Symbol ${index}`,
  category: 'shape',
  props: {
    x: { type: 'number' },
    y: { type: 'number' },
    width: { type: 'number' },
    height: { type: 'number' },
    fill: { type: 'string' },
  },
  defaults: { x: 0, y: 0, width: 40 + index, height: 20 + index, fill: '#00ff00' },
  create: ({ props }) => new MockRect(props as unknown as Record<string, unknown>) as never,
});

const customTypes = (count: number): string[] =>
  Array.from({ length: count }, (_, index) => `scada-test-custom-${index + 1}`);

describe('V5 custom symbol registration (I5.4, design-symbols.md §12.1)', () => {
  beforeEach(() => {
    resetLeaferMock();
    clearScadaSymbolRegistry();
    registerBuiltinScadaSymbols();
  });

  it('should register 20+ parameterized custom symbols and full-path load them', () => {
    const types = customTypes(24);
    types.forEach((type, index) => registerScadaSymbol(customDef(type, index)));

    const config = {
      version: 1 as const,
      symbols: types.map((type, index) => ({
        id: `inst-${index + 1}`,
        type,
        x: index * 10,
        y: 0,
        width: 60,
        height: 30,
      })),
    };

    const result = validateScadaConfig(config);
    expect(result).toEqual({ ok: true });

    const node = instantiateSymbol(types[0], {
      id: 'inst-1',
      props: { x: 5, y: 5 },
      engine: {},
      config: { world: { x: 0, y: 0, scale: 1 } },
    });
    expect((node as { width?: number }).width).toBe(40);
    expect((node as { fill?: string }).fill).toBe('#00ff00');

    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset(config as never);
    expect(engine.registry.size()).toBe(24);
    for (const type of types) {
      expect(engine.getSymbols().some((leaf) => leaf.definition?.type === type)).toBe(true);
    }
    engine.destroy();

    for (const type of types) {
      expect(unregisterScadaSymbol(type)).toBe(true);
    }
    for (const type of types) {
      expect(validateScadaConfig({ version: 1, symbols: [{ id: 'x', type, x: 0, y: 0 }] }).ok).toBe(false);
    }
  });

  it('should override a previously registered type with override flag', () => {
    const type = 'scada-test-custom-override';
    registerScadaSymbol(customDef(type, 1));
    registerScadaSymbol({ ...customDef(type, 2), name: 'Overridden' }, { override: true });
    expect(validateScadaConfig({ version: 1, symbols: [{ id: 'o', type, x: 0, y: 0 }] }).ok).toBe(true);
    unregisterScadaSymbol(type);
  });

  it('should keep custom props typed as ScadaSymbolProps custom extension', () => {
    const type = 'scada-test-custom-props';
    const props: ScadaSymbolProps = { x: 1, y: 2, custom: { points: [1, 2], tag: 'x' } };
    registerScadaSymbol(customDef(type, 3));
    const node = instantiateSymbol(type, {
      id: 'p',
      props,
      engine: {},
      config: { world: { x: 0, y: 0, scale: 1 } },
    });
    expect((node as { custom?: unknown }).custom).toEqual(props.custom);
    unregisterScadaSymbol(type);
  });
});
