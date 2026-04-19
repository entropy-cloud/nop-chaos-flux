import { afterEach, describe, expect, it } from 'vitest';
import { changeLanguage, initFluxI18n, resetFluxI18n, t } from './i18n';

describe('flux i18n', () => {
  afterEach(() => {
    resetFluxI18n();
  });

  it('resolves fully-qualified flux keys against the default namespace', async () => {
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');

    expect(t('flux.debugger.console')).toBe('Runtime Console');
    expect(t('flux.debugger.errorsOnly')).toBe('Errors Only');
  });
});
