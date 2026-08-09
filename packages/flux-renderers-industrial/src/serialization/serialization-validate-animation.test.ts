import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { validateScadaConfig } from './validate.js';
import { rect, baseConfig } from './serialization-fixtures.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));

beforeEach(() => {
  registerBuiltinScadaSymbols();
});

describe('validateScadaConfig', () => {
  it('should validate animations internal structure (m-4 回归：动画字段语义)', () => {
    const badKind = validateScadaConfig(
      baseConfig({ symbols: [rect('a1', { animations: [{ kind: 'spin' as never }] })] }),
    );
    expect(badKind.ok).toBe(false);
    expect((badKind as { errors: string[] }).errors.some((e) => e.includes('kind must be one of'))).toBe(true);
    const badWhen = validateScadaConfig(
      baseConfig({ symbols: [rect('a2', { animations: [{ kind: 'rotate', when: 'sometimes' as never }] })] }),
    );
    expect(badWhen.ok).toBe(false);
    const badPeriod = validateScadaConfig(
      baseConfig({ symbols: [rect('a2b', { animations: [{ kind: 'rotate', period: 'x' as never }] })] }),
    );
    expect(badPeriod.ok).toBe(false);
    const badFrom = validateScadaConfig(
      baseConfig({ symbols: [rect('a2c', { animations: [{ kind: 'flow', from: 'x' as never }] })] }),
    );
    expect(badFrom.ok).toBe(false);
    const ok = validateScadaConfig(
      baseConfig({
        symbols: [
          rect('a3', {
            animations: [
              { kind: 'rotate', period: 1000, when: { state: 'run' }, loop: -1 },
              { kind: 'flow', from: 0, to: 100 },
            ],
          }),
        ],
      }),
    );
    expect(ok).toEqual({ ok: true });
  });
});
