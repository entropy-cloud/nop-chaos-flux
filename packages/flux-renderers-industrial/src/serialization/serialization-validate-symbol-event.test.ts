import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { validateScadaConfig } from './validate.js';
import { rect, baseConfig } from './serialization-fixtures.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));

beforeEach(() => {
  registerBuiltinScadaSymbols();
});

describe('validateScadaConfig', () => {
  it('should validate events declaration shape (I11.1：on 枚举 + action 形状)', () => {
    const badOn = validateScadaConfig(
      baseConfig({ symbols: [rect('e1', { events: [{ on: 'drag' as never, action: { action: 'noop' } }] })] }),
    );
    expect(badOn.ok).toBe(false);
    expect((badOn as { errors: string[] }).errors.join('; ')).toContain('.on must be one of');

    const badAction = validateScadaConfig(
      baseConfig({ symbols: [rect('e2', { events: [{ on: 'click', action: 'noop' }] })] }),
    );
    expect(badAction.ok).toBe(false);
    expect((badAction as { errors: string[] }).errors.join('; ')).toContain('.action must be an object');

    const missingActionField = validateScadaConfig(
      baseConfig({ symbols: [rect('e3', { events: [{ on: 'click', action: {} }] })] }),
    );
    expect(missingActionField.ok).toBe(false);
    expect((missingActionField as { errors: string[] }).errors.join('; ')).toContain('action string');

    const nonObjectEvent = validateScadaConfig(
      baseConfig({ symbols: [rect('e4', { events: ['nope' as never] })] }),
    );
    expect(nonObjectEvent.ok).toBe(false);

    const ok = validateScadaConfig(
      baseConfig({
        symbols: [
          rect('e5', {
            events: [
              { on: 'click', action: { action: 'openDialog', args: { dialogId: 'd' } } },
              { on: 'dblclick', action: { action: 'navigate', args: { url: '#/x' } } },
              { on: 'hover', action: { action: 'showToast' } },
            ],
          }),
        ],
      }),
    );
    expect(ok).toEqual({ ok: true });
  });
});
