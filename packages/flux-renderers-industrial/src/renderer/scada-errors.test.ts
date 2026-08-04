import { describe, expect, it, vi } from 'vitest';
import { resolveScadaErrorText, scadaErrorI18nKey, SCADA_ERROR_CODES, errorMessage, toError } from './scada-errors.js';

describe('scada-errors utilities', () => {
  it('errorMessage extracts message from Error and stringifies non-Error', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage('plain string')).toBe('plain string');
    expect(errorMessage({ custom: 'object' })).toBe('[object Object]');
    expect(errorMessage(null)).toBe('null');
  });

  it('toError wraps non-Error values and passes through Error instances', () => {
    const original = new Error('native');
    expect(toError(original)).toBe(original);
    const wrapped = toError('failure message');
    expect(wrapped).toBeInstanceOf(Error);
    expect(wrapped.message).toBe('failure message');
    const wrappedObj = toError({ code: 42 });
    expect(wrappedObj).toBeInstanceOf(Error);
    expect(wrappedObj.message).toBe('[object Object]');
  });
});

describe('scada error code registry (plan 2026-08-04-1558-2 Phase 4 WD-6)', () => {
  it('SCADA_ERROR_CODES covers all documented codes', () => {
    // 注册表为 closed set——新增码必须在此登记，防散落字符串
    expect(SCADA_ERROR_CODES).toContain('config-parse');
    expect(SCADA_ERROR_CODES).toContain('config-invalid');
    expect(SCADA_ERROR_CODES).toContain('config-build-failed');
    expect(SCADA_ERROR_CODES).toContain('engine-create-failed');
    expect(SCADA_ERROR_CODES).toContain('flux-compile-failed');
    expect(SCADA_ERROR_CODES).toContain('flux-evaluate-failed');
    // plan 2026-08-05-0325-1：flux-deps-empty 登记进注册表（非升级诊断码）
    expect(SCADA_ERROR_CODES).toContain('flux-deps-empty');
    expect(SCADA_ERROR_CODES).toContain('handler-error');
    expect(SCADA_ERROR_CODES).toContain('not-visible');
    expect(SCADA_ERROR_CODES).toContain('not-mounted');
    expect(SCADA_ERROR_CODES).toContain('symbol-not-found');
    expect(SCADA_ERROR_CODES).toContain('point-not-found');
    expect(SCADA_ERROR_CODES).toContain('invalid-config');
  });

  it('scadaErrorI18nKey maps registered codes to industrial.scada.error.<code>', () => {
    expect(scadaErrorI18nKey('config-parse')).toBe('industrial.scada.error.config-parse');
    expect(scadaErrorI18nKey('not-visible')).toBe('industrial.scada.error.not-visible');
    // plan 2026-08-05-0325-1：flux-deps-empty 经 scadaErrorI18nKey 映射到 industrial.scada.error.flux-deps-empty
    expect(scadaErrorI18nKey('flux-deps-empty')).toBe('industrial.scada.error.flux-deps-empty');
  });

  it('scadaErrorI18nKey falls back to .unknown for unregistered codes', () => {
    expect(scadaErrorI18nKey('whatever-not-registered')).toBe('industrial.scada.error.unknown');
    expect(scadaErrorI18nKey('')).toBe('industrial.scada.error.unknown');
  });

  it('resolveScadaErrorText returns the localized message when i18n key resolves', () => {
    const t = (key: string) =>
      key === 'industrial.scada.error.not-visible' ? '画布无可见图元' : key;
    expect(resolveScadaErrorText({ code: 'not-visible', message: 'fallback' }, t)).toBe('画布无可见图元');
  });

  it('resolveScadaErrorText falls back to raw message when i18n returns the key itself', () => {
    // 模拟 i18next 缺失 key 行为：返回 key 本身
    const t = (key: string) => key;
    expect(resolveScadaErrorText({ code: 'config-parse', message: 'raw parse error' }, t)).toBe(
      'raw parse error',
    );
  });

  it('resolveScadaErrorText returns empty for undefined error', () => {
    const t = vi.fn();
    expect(resolveScadaErrorText(undefined, t)).toBe('');
    expect(t).not.toHaveBeenCalled();
  });
});
