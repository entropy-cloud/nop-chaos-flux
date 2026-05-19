import { afterEach, describe, expect, it } from 'vitest';
import { setI18nGetter, t } from './i18n.js';

describe('ui i18n fallback', () => {
  afterEach(() => {
    setI18nGetter(null);
  });

  it('uses local defaults when the shared getter returns the original key', () => {
    setI18nGetter((key) => key);
    expect(t('flux.common.close')).toBe('Close');
  });

  it('prefers the shared getter when it resolves a translated value', () => {
    setI18nGetter(() => 'Fermer');
    expect(t('flux.common.close')).toBe('Fermer');
  });
});
