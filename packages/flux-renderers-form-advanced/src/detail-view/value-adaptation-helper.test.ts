import { describe, expect, it, vi } from 'vitest';
import {
  publishValidateResultErrors,
  runTransformIn,
  runTransformOut,
  runValidate,
} from './value-adaptation-helper.js';

describe('detail value adaptation helpers', () => {
  it('falls back to raw and working values when no action is provided', async () => {
    const runner = vi.fn();

    await expect(
      runTransformIn(undefined, { rawValue: 'raw', name: 'field', readOnly: false }, runner),
    ).resolves.toBe('raw');
    await expect(
      runTransformOut(
        undefined,
        { workingValue: 'working', originalValue: 'raw', name: 'field', readOnly: false },
        runner,
      ),
    ).resolves.toBe('working');
    await expect(
      runValidate(
        undefined,
        { workingValue: 'working', originalValue: 'raw', name: 'field' },
        runner,
      ),
    ).resolves.toEqual({ valid: true });
    expect(runner).not.toHaveBeenCalled();
  });

  it('injects default args when action args are omitted', async () => {
    const runner = vi.fn(async (_actionSchema) => ({ ok: true, data: 'draft' }));

    await runTransformIn(
      { action: 'demo:in' },
      { rawValue: 'raw', name: 'field', readOnly: true },
      runner,
    );
    await runTransformOut(
      { action: 'demo:out' },
      { workingValue: 'working', originalValue: 'raw', name: 'field', readOnly: true },
      runner,
    );
    await runValidate(
      { action: 'demo:validate' },
      { workingValue: 'working', originalValue: 'raw', name: 'field' },
      runner,
    );

    expect(runner.mock.calls[0]?.[0]).toEqual({
      action: 'demo:in',
      args: { value: 'raw', name: 'field', readOnly: true },
    });
    expect(runner.mock.calls[1]?.[0]).toEqual({
      action: 'demo:out',
      args: { value: 'working', originalValue: 'raw', name: 'field', readOnly: true },
    });
    expect(runner.mock.calls[2]?.[0]).toEqual({
      action: 'demo:validate',
      args: { value: 'working', originalValue: 'raw', name: 'field' },
    });
  });

  it('falls back when actions fail and preserves validation error mapping', async () => {
    const runner = vi.fn(async () => ({ ok: false, error: 'boom' }));

    await expect(
      runTransformIn(
        { action: 'demo:in' },
        { rawValue: 'raw', name: 'field', readOnly: false },
        runner,
      ),
    ).rejects.toThrow('[flux] transformIn failed: boom');
    await expect(
      runTransformOut(
        { action: 'demo:out' },
        { workingValue: 'working', originalValue: 'raw', name: 'field', readOnly: false },
        runner,
      ),
    ).rejects.toThrow('[flux] transformOut failed: boom');
    await expect(
      runValidate(
        { action: 'demo:validate' },
        { workingValue: 'working', originalValue: 'raw', name: 'field' },
        runner,
      ),
    ).resolves.toEqual({
      valid: false,
      issues: [{ level: 'error', message: 'boom' }],
    });
  });

  it('publishes validate issues onto the form with field-path fallback', () => {
    const form = {
      clearErrors: vi.fn(),
      applyExternalErrors: vi.fn(),
    } as any;

    publishValidateResultErrors(
      {
        valid: false,
        issues: [
          { level: 'error', message: 'invalid field' },
          { level: 'warning', message: 'nested issue', path: 'profile.name' },
        ],
      },
      'profile',
      form,
    );

    expect(form.applyExternalErrors).toHaveBeenCalledWith({
      sourceId: 'value-adaptation:profile',
      errors: [
        {
          path: 'profile',
          message: 'invalid field',
          rule: 'async',
          sourceKind: 'runtime-overlay',
        },
        {
          path: 'profile.name',
          message: 'nested issue',
          rule: 'async',
          sourceKind: 'runtime-overlay',
        },
      ],
      replace: true,
    });
  });

  it('clears only the value-adaptation overlay source on success', () => {
    const form = {
      clearErrors: vi.fn(),
      applyExternalErrors: vi.fn(),
    } as any;

    publishValidateResultErrors({ valid: true }, 'profile', form);

    expect(form.clearErrors).not.toHaveBeenCalled();
    expect(form.applyExternalErrors).toHaveBeenCalledWith({
      sourceId: 'value-adaptation:profile',
      errors: [],
      replace: true,
    });
  });
});
