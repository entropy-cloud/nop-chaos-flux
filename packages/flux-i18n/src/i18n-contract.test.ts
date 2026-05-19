import { getMessageFormatter, setMessageFormatter } from '@nop-chaos/flux-core';
import { afterEach, describe, expect, it } from 'vitest';
import {
  addResources,
  changeLanguage,
  getCurrentLanguage,
  initFluxI18n,
  resetFluxI18n,
  t,
} from './i18n.js';

async function getUiT() {
  const uiI18n = await import('../../ui/src/lib/i18n.js');
  return uiI18n.t;
}

describe('i18n sink contracts', () => {
  afterEach(() => {
    resetFluxI18n();
  });

  it('default formatter is identity: returns key unchanged', () => {
    const fmt = getMessageFormatter();
    expect(fmt('any.key.here')).toBe('any.key.here');
    expect(fmt('any.key.here', { a: 1 })).toBe('any.key.here');
  });

  it('setMessageFormatter replaces the global formatter', () => {
    setMessageFormatter((key, params) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
    );
    const fmt = getMessageFormatter();
    expect(fmt('hello')).toBe('hello');
    expect(fmt('hello', { x: 1 })).toBe('hello:{"x":1}');
  });

  it('getMessageFormatter returns the latest setter result', () => {
    setMessageFormatter(() => 'first');
    expect(getMessageFormatter()('x')).toBe('first');
    setMessageFormatter(() => 'second');
    expect(getMessageFormatter()('x')).toBe('second');
  });

  it('resetFluxI18n restores identity formatter', () => {
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    expect(getMessageFormatter()('flux.common.save')).toBe('Save');
    resetFluxI18n();
    expect(getMessageFormatter()('flux.common.save')).toBe('flux.common.save');
  });

  it('routes ui fallback keys through the current flux i18n instance', async () => {
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');
    const uiT = await getUiT();
    expect(uiT('flux.common.close')).toBe('Close');
  });

  it('falls back to ui local defaults when flux i18n has no matching key', async () => {
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');
    const uiT = await getUiT();
    expect(uiT('flux.sidebar.toggle')).toBe('Toggle Sidebar');
  });
});

describe('i18n key handling contracts', () => {
  afterEach(() => {
    resetFluxI18n();
  });

  it('missing key returns the key string itself (i18next fallback)', async () => {
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');
    expect(t('nonexistent.deep.key')).toBe('nonexistent.deep.key');
  });

  it('empty string key returns empty string', async () => {
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');
    expect(t('')).toBe('');
  });

  it('key with special characters (dots, hyphens) is handled', async () => {
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    addResources('en-US', 'flux', { 'a-b': { 'c.d': 'value' } });
    await changeLanguage('en-US');
    expect(t('a-b.c.d')).toBe('value');
  });

  it('flux. prefix is stripped when resolving keys', async () => {
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');
    expect(t('flux.common.save')).toBe('Save');
    expect(t('common.save')).toBe('Save');
  });

  it('flux.flux. prefix strips only the first flux.', async () => {
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    addResources('en-US', 'flux', { flux: { nested: 'deep-value' } });
    await changeLanguage('en-US');
    expect(t('flux.flux.nested')).toBe('deep-value');
  });

  it('param interpolation substitutes correctly via the shared formatter', async () => {
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    addResources('en-US', 'flux', { greet: 'Hello {{name}}!' });
    await changeLanguage('en-US');
    const fmt = getMessageFormatter();
    expect(fmt('greet', { name: 'World' })).toBe('Hello World!');
    expect(t('greet', { name: 'World' })).toBe('Hello World!');
  });

  it('missing interpolation params keep {{placeholder}} in output', async () => {
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    addResources('en-US', 'flux', { greet: 'Hello {{name}}!' });
    await changeLanguage('en-US');
    expect(t('greet')).toBe('Hello {{name}}!');
  });

  it('unicode keys work', async () => {
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    addResources('en-US', 'flux', { '中文': 'chinese-value' });
    await changeLanguage('en-US');
    expect(t('中文')).toBe('chinese-value');
  });
});

describe('i18n lifecycle contracts', () => {
  afterEach(() => {
    resetFluxI18n();
  });

  it('getFluxI18n auto-initializes if not yet initialized', () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    expect(getCurrentLanguage()).toBe('en-US');
  });

  it('initFluxI18n ignores second call with different options (singleton)', () => {
    const first = initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    const second = initFluxI18n({ lng: 'zh-CN', fallbackLng: 'zh-CN' });
    expect(first).toBe(second);
    expect(getCurrentLanguage()).toBe('en-US');
  });

  it('addResources merges into existing bundle without overwriting other keys', async () => {
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    addResources('en-US', 'flux', { extra: { key: 'extra-value' } });
    await changeLanguage('en-US');
    expect(t('extra.key')).toBe('extra-value');
    expect(t('common.save')).toBe('Save');
  });

  it('changeLanguage updates getCurrentLanguage', async () => {
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    expect(getCurrentLanguage()).toBe('en-US');
    await changeLanguage('zh-CN');
    expect(getCurrentLanguage()).toBe('zh-CN');
  });
});
