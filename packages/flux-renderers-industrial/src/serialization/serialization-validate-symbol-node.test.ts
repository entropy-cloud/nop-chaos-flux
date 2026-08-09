import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { validateScadaConfig } from './validate.js';
import { rect, baseConfig } from './serialization-fixtures.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));

beforeEach(() => {
  registerBuiltinScadaSymbols();
});

describe('validateScadaConfig', () => {
  it('should reject duplicate symbol ids across nested children', () => {
    const config = baseConfig({
      symbols: [rect('dup', { children: [rect('child'), rect('dup')] })],
    });
    const result = validateScadaConfig(config);
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('duplicate symbol id: dup'))).toBe(true);
  });

  it('should recurse into children with structural checks', () => {
    const config = baseConfig({
      symbols: [rect('g', { type: 'scada-group', children: [rect('c1'), { ...rect('c2'), x: 'bad' as unknown as number }] })],
    });
    const result = validateScadaConfig(config);
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('symbols[0].children[1].x'))).toBe(true);
  });

  it('should reject unknown symbol types but accept scada-group as structural container', () => {
    const unknown = validateScadaConfig(baseConfig({ symbols: [rect('x', { type: 'scada-nope' })] }));
    expect(unknown.ok).toBe(false);
    expect((unknown as { errors: string[] }).errors).toContain('unknown symbol type: scada-nope');
    const group = validateScadaConfig(baseConfig({ symbols: [rect('g', { type: 'scada-group' })] }));
    expect(group.ok).toBe(true);
  });
});
