import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { validateScadaConfig } from './validate.js';
import { rect, baseConfig } from './serialization-fixtures.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));

beforeEach(() => {
  registerBuiltinScadaSymbols();
});

describe('validateScadaConfig', () => {
  it('should validate states internal structure (m-4 回归：状态字段语义)', () => {
    const badStatesValue = validateScadaConfig(
      baseConfig({
        symbols: [rect('s1', { states: { states: { run: 'x' as never } } as never })],
      }),
    );
    expect(badStatesValue.ok).toBe(false);
    const badRange = validateScadaConfig(
      baseConfig({ symbols: [rect('s2', { states: { states: { run: {} }, ranges: [{ min: 'a' as never, state: 'run' }] } })] }),
    );
    expect(badRange.ok).toBe(false);
    const badRangeEntry = validateScadaConfig(
      baseConfig({ symbols: [rect('s2b', { states: { states: { run: {} }, ranges: ['x' as never] } })] }),
    );
    expect(badRangeEntry.ok).toBe(false);
    const badRangeState = validateScadaConfig(
      baseConfig({ symbols: [rect('s2c', { states: { states: { run: {} }, ranges: [{ max: 10, state: 5 as never }] } })] }),
    );
    expect(badRangeState.ok).toBe(false);
    const badBooleanMapShape = validateScadaConfig(
      baseConfig({ symbols: [rect('s2d', { states: { states: { run: {} }, booleanMap: 'x' as never } })] }),
    );
    expect(badBooleanMapShape.ok).toBe(false);
    const badValueMap = validateScadaConfig(
      baseConfig({ symbols: [rect('s2e', { states: { states: { run: {} }, valueMap: 'x' as never } })] }),
    );
    expect(badValueMap.ok).toBe(false);
    const badStatesShape = validateScadaConfig(
      baseConfig({ symbols: [rect('s2f', { states: { states: 'x' as never } as never })] }),
    );
    expect(badStatesShape.ok).toBe(false);
    const badBooleanMap = validateScadaConfig(
      baseConfig({ symbols: [rect('s3', { states: { states: { run: {} }, booleanMap: { true: 'run' } as never } })] }),
    );
    expect(badBooleanMap.ok).toBe(false);
    const ok = validateScadaConfig(
      baseConfig({
        symbols: [
          rect('s4', {
            states: {
              states: { run: { style: { fill: '#00ff00' } }, stop: {} },
              ranges: [{ min: 0, max: 100, state: 'run' }],
              booleanMap: { true: 'run', false: 'stop' },
              valueMap: { 1: 'run' },
            },
          }),
        ],
      }),
    );
    expect(ok).toEqual({ ok: true });
  });

  it('should validate states.stateSource shape (plan 2026-08-05-0653-3 B3)', () => {
    const badStateSource = validateScadaConfig(
      baseConfig({ symbols: [rect('ss1', { states: { states: { run: {} }, stateSource: '' } })] }),
    );
    expect(badStateSource.ok).toBe(false);
    expect((badStateSource as { errors: string[] }).errors.join('; ')).toContain('.stateSource must be a non-empty string');
    const badStateSourceType = validateScadaConfig(
      baseConfig({ symbols: [rect('ss2', { states: { states: { run: {} }, stateSource: 5 as never } })] }),
    );
    expect(badStateSourceType.ok).toBe(false);
    const okStateSource = validateScadaConfig(
      baseConfig({ symbols: [rect('ss3', { states: { states: { run: {} }, stateSource: 'drv.fill' } })] }),
    );
    expect(okStateSource).toEqual({ ok: true });
  });
});
