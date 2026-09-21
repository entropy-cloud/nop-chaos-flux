import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';
import { buttonRenderer, env } from './form-test-support.js';

const allDefinitions = [...formRendererDefinitions, buttonRenderer];

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

function renderSchema(schema: BaseSchema) {
  const SchemaRenderer = createSchemaRenderer(allDefinitions);
  return render(
    <SchemaRenderer
      schemaUrl="test://input-time-clear-icon"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

/**
 * V12f Phase 3 wave B — [G2-视角1-01] the clear affordance rendered the raw
 * '✕' text glyph; the family contract (input-number steppers, diff-header,
 * calendar header) is lucide icons, so the clear button must render the
 * XIcon svg instead of a text glyph.
 */
describe('[G2-视角1-01] input-time clear affordance iconography', () => {
  it('renders the clear button as an X icon (svg), not the ✕ text glyph', () => {
    const { container } = renderSchema({
      type: 'form',
      data: { at: '08:30' },
      body: [{ type: 'input-time', name: 'at', label: 'At', clearable: true }],
    });
    const clear = container.querySelector('[data-testid="time-clear"]') as HTMLElement | null;
    expect(clear, 'clearable + filled value must render the clear button').toBeTruthy();
    expect(clear!.querySelector('svg'), 'clear button content must be an icon svg').toBeTruthy();
    expect(clear!.textContent).not.toContain('✕');
    expect(clear!.getAttribute('aria-label')).toBeTruthy();
  });
});
