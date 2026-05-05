// @vitest-environment jsdom

import React from 'react';
import { getMessageFormatter } from '@nop-chaos/flux-core';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  addResources,
  changeLanguage,
  getCurrentLanguage,
  initFluxI18n,
  resetFluxI18n,
  t,
} from './i18n';
import { useFluxTranslation } from './hooks';

describe('flux i18n', () => {
  afterEach(() => {
    cleanup();
    resetFluxI18n();
  });

  it('reuses a singleton instance and wires the shared formatter', async () => {
    const first = initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    const second = initFluxI18n({ lng: 'zh-CN', fallbackLng: 'zh-CN' });

    await changeLanguage('en-US');

    expect(second).toBe(first);
    expect(getMessageFormatter()('flux.common.save')).toBe('Save');
  });

  it('resolves fully-qualified and namespace-relative keys against the flux namespace', async () => {
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');

    expect(t('common.save')).toBe('Save');
    expect(t('flux.debugger.console')).toBe('Runtime Console');
    expect(t('flux.debugger.errorsOnly')).toBe('Errors Only');
  });

  it('changes language and preserves interpolation semantics', async () => {
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

    await changeLanguage('zh-CN');

    expect(getCurrentLanguage()).toBe('zh-CN');
    expect(t('pagination.page', { current: 2, total: 5 })).toBe('第 2 页，共 5 页');
    expect(t('reportDesigner.noSelection')).toBe('选择一个目标进行检查。');
  });

  it('adds resources into the active instance without reinitializing', async () => {
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    addResources('en-US', 'flux', {
      custom: {
        greeting: 'Hello {{name}}',
      },
    });

    await changeLanguage('en-US');

    expect(t('custom.greeting', { name: 'Flux' })).toBe('Hello Flux');
  });

  it('resets the shared formatter back to identity', async () => {
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

    await changeLanguage('en-US');

    expect(getMessageFormatter()('flux.common.save')).toBe('Save');

    resetFluxI18n();

    expect(getMessageFormatter()('flux.common.save')).toBe('flux.common.save');
  });

  it('keeps useFluxTranslation bound to the shared instance across language changes', async () => {
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

    function Probe() {
      const { t: translate, i18n } = useFluxTranslation();
      return React.createElement(
        React.Fragment,
        null,
        React.createElement('div', { 'data-testid': 'label' }, translate('common.save')),
        React.createElement('div', { 'data-testid': 'language' }, i18n.language),
      );
    }

    render(React.createElement(Probe));

    expect(screen.getByTestId('label').textContent).toBe('Save');
    expect(screen.getByTestId('language').textContent).toBe('en-US');

    await changeLanguage('zh-CN');

    await waitFor(() => {
      expect(screen.getByTestId('label').textContent).toBe('保存');
      expect(screen.getByTestId('language').textContent).toBe('zh-CN');
    });
  });
});
