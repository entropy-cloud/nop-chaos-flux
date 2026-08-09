import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { validateScadaConfig } from './validate.js';
import { rect, baseConfig } from './serialization-fixtures.js';
import type { ScadaStateDeclaration, ScadaAnimation, ScadaSymbolEvent } from './config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));

beforeEach(() => {
  registerBuiltinScadaSymbols();
});

describe('validateScadaConfig', () => {
  it('should accept a valid config', () => {
    expect(validateScadaConfig(baseConfig())).toEqual({ ok: true });
  });

  it('should reject non-object input', () => {
    expect(validateScadaConfig(null).ok).toBe(false);
    expect(validateScadaConfig('nope').ok).toBe(false);
    expect(validateScadaConfig([]).ok).toBe(false);
  });

  it('should reject a non-1 version', () => {
    const result = validateScadaConfig({ ...baseConfig(), version: 2 });
    expect(result).toEqual({
      ok: false,
      errors: expect.arrayContaining(['config.version must be 1']),
    });
  });

  it('should reject missing symbols array', () => {
    const result = validateScadaConfig({ version: 1 });
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors).toContain('config.symbols must be an array');
  });

  it('should validate optional numeric/string fields', () => {
    const badOpacity = validateScadaConfig(baseConfig({ symbols: [rect('o', { opacity: 'high' as unknown as number })] }));
    expect(badOpacity.ok).toBe(false);
    const badViewport = validateScadaConfig({ ...baseConfig(), viewport: { x: 'a' as unknown as number } });
    expect(badViewport.ok).toBe(false);
    const badVariablesShape = validateScadaConfig({ ...baseConfig(), variables: 'nope' as never });
    expect(badVariablesShape.ok).toBe(false);
  });

  it('should validate string fields and background/viewport shapes', () => {
    const badFill = validateScadaConfig(baseConfig({ symbols: [rect('s', { fill: 42 as unknown as string })] }));
    expect((badFill as { errors: string[] }).errors).toContain('symbols[0].fill must be a string');
    const badVisible = validateScadaConfig(baseConfig({ symbols: [rect('v', { visible: 1 as unknown as boolean })] }));
    expect(badVisible.ok).toBe(false);
    const badCustom = validateScadaConfig(baseConfig({ symbols: [rect('c', { custom: 'x' as unknown as Record<string, unknown> })] }));
    expect(badCustom.ok).toBe(false);
    const badBackground = validateScadaConfig({ ...baseConfig(), background: 'nope' as never });
    expect(badBackground.ok).toBe(false);
    const badViewportShape = validateScadaConfig({ ...baseConfig(), viewport: 'nope' as never });
    expect(badViewportShape.ok).toBe(false);
    const badViewportField = validateScadaConfig({ ...baseConfig(), viewport: { x: 1, y: 2, scale: 'big' as unknown as number } });
    expect(badViewportField.ok).toBe(false);
    const badStates = validateScadaConfig(baseConfig({ symbols: [rect('st', { states: 5 as unknown as ScadaStateDeclaration })] }));
    expect(badStates.ok).toBe(false);
    const badAnimations = validateScadaConfig(baseConfig({ symbols: [rect('an', { animations: {} as unknown as ScadaAnimation[] })] }));
    expect(badAnimations.ok).toBe(false);
    const badEvents = validateScadaConfig(baseConfig({ symbols: [rect('ev', { events: {} as unknown as ScadaSymbolEvent[] })] }));
    expect(badEvents.ok).toBe(false);
    const badBindings = validateScadaConfig(baseConfig({ symbols: [rect('bi', { bindings: [] as unknown as Record<string, never> })] }));
    expect(badBindings.ok).toBe(false);
    const badSymbolShape = validateScadaConfig(baseConfig({ symbols: ['x' as never] }));
    expect(badSymbolShape.ok).toBe(false);
  });
});
