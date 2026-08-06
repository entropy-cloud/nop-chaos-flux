import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { changeLanguage, initFluxI18n, resetFluxI18n, t } from '@nop-chaos/flux-i18n';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index.js';
import { baseEnv, formulaCompiler } from '../test-support.js';

function createTestRenderer() {
  return createSchemaRenderer([
    ...basicRendererDefinitions,
    ...formRendererDefinitions,
    ...formAdvancedRendererDefinitions,
  ]);
}

describe('icon-picker default placeholder i18n', () => {
  afterEach(() => {
    cleanup();
    resetFluxI18n();
  });

  async function renderPicker(lng: 'en-US' | 'zh-CN') {
    resetFluxI18n();
    initFluxI18n({ lng, fallbackLng: lng });
    await changeLanguage(lng);
    const SchemaRenderer = createTestRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://icon-picker-i18n"
        schema={{
          type: 'form',
          body: [{ type: 'icon-picker', name: 'icon' }],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );
  }

  it('resolves the default placeholder through flux.form.selectIcon (en-US)', async () => {
    await renderPicker('en-US');
    expect(screen.getByRole('button', { name: 'Select icon' })).toBeTruthy();
    expect(t('flux.form.selectIcon')).toBe('Select icon');
  });

  it('resolves the default placeholder through flux.form.selectIcon (zh-CN)', async () => {
    await renderPicker('zh-CN');
    expect(screen.getByRole('button', { name: '选择图标' })).toBeTruthy();
    expect(t('flux.form.selectIcon')).toBe('选择图标');
  });
});
