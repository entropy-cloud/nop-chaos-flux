import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { t } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index.js';
import { env } from '../test-support.js';

function renderKeyValue() {
  const SchemaRenderer = createSchemaRenderer([
    ...formRendererDefinitions,
    ...formAdvancedRendererDefinitions,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://flux-renderers-form-advanced/__tests__/key-value-i18n.test.tsx"
      schema={{
        type: 'form',
        data: {
          metadata: [{ key: 'env', value: 'prod' }],
        },
        body: [{ type: 'key-value', name: 'metadata', label: 'Metadata' }],
      }}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

describe('key-value i18n (no hardcoded Key/Value strings)', () => {
  afterEach(() => {
    cleanup();
  });

  it('resolves the key placeholder through flux.form.key', () => {
    renderKeyValue();
    expect(screen.getByPlaceholderText(t('flux.form.key'))).toBeTruthy();
  });

  it('resolves the value placeholder through flux.form.value', () => {
    renderKeyValue();
    expect(screen.getByPlaceholderText(t('flux.form.value'))).toBeTruthy();
  });

  it('resolves the key input aria-label through flux.form.keyEntry with a 1-based index', () => {
    renderKeyValue();
    expect(screen.getByRole('textbox', { name: t('flux.form.keyEntry', { index: 1 }) })).toBeTruthy();
  });

  it('resolves the value input aria-label through flux.form.valueEntry with a 1-based index', () => {
    renderKeyValue();
    expect(screen.getByRole('textbox', { name: t('flux.form.valueEntry', { index: 1 }) })).toBeTruthy();
  });
});
