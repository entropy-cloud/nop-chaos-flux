import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { validateScadaConfig } from './validate.js';
import { baseConfig } from './serialization-fixtures.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));

beforeEach(() => {
  registerBuiltinScadaSymbols();
});

describe('validateScadaConfig', () => {
  it('should reject duplicate point ids and invalid source fields', () => {
    const config = baseConfig({
      variables: [
        { id: 'p1', source: 'static', value: 1 },
        { id: 'p1', source: 'static', value: 2 },
      ],
    });
    const result = validateScadaConfig(config);
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('duplicate point declaration id: p1'))).toBe(
      true,
    );
  });

  it('should validate per-source point declaration requirements', () => {
    const missingStaticValue = validateScadaConfig(baseConfig({ variables: [{ id: 'p1', source: 'static' }] }));
    expect(missingStaticValue.ok).toBe(false);
    const missingExpression = validateScadaConfig(
      baseConfig({ variables: [{ id: 'p2', source: 'expression', expression: '' }] }),
    );
    expect(missingExpression.ok).toBe(false);
    const missingFlux = validateScadaConfig(baseConfig({ variables: [{ id: 'p3', source: 'flux' }] }));
    expect(missingFlux.ok).toBe(false);
    const badSource = validateScadaConfig(baseConfig({ variables: [{ id: 'p4', source: 'websocket' as never }] }));
    expect(badSource.ok).toBe(false);
    const badPointShape = validateScadaConfig(baseConfig({ variables: ['x' as never] }));
    expect(badPointShape.ok).toBe(false);
    const badScale = validateScadaConfig(baseConfig({ variables: [{ id: 'p5', source: 'static', value: 1, scale: 'x' as never }] }));
    expect(badScale.ok).toBe(false);
    const badDeadband = validateScadaConfig(baseConfig({ variables: [{ id: 'p6', source: 'static', value: 1, deadband: 'x' as never }] }));
    expect(badDeadband.ok).toBe(false);
    const badUnit = validateScadaConfig(baseConfig({ variables: [{ id: 'p7', source: 'static', value: 1, unit: 3 as never }] }));
    expect(badUnit.ok).toBe(false);
    const badFormat = validateScadaConfig(baseConfig({ variables: [{ id: 'p8', source: 'static', value: 1, format: 3 as never }] }));
    expect(badFormat.ok).toBe(false);
    const ok = validateScadaConfig(
      baseConfig({
        variables: [
          { id: 's1', source: 'static', value: true },
          { id: 'e1', source: 'expression', expression: '${s1 > 1}' },
          { id: 'f1', source: 'flux', flux: '${tank.level}', deadband: 0.5 },
        ],
      }),
    );
    expect(ok).toEqual({ ok: true });
  });
});
