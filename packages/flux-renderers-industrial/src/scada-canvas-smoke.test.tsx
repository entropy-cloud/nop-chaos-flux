import React from 'react';
import { createSchemaRenderer, createDefaultEnv } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { industrialRendererDefinitions } from './renderer-definitions.js';

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  resetFluxI18n();
  cleanup();
});

describe('scada-canvas empty shell render smoke', () => {
  it('compiles and renders a minimal scada-canvas schema without errors', () => {
    const SchemaRenderer = createSchemaRenderer(industrialRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://industrial/shell"
        schema={{ type: 'scada-canvas' }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const root = container.querySelector('[data-slot="scada-canvas"]') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.className).toContain('nop-scada-canvas');
  });
});
