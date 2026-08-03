import React from 'react';
import { createSchemaRenderer, createDefaultEnv } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { industrialRendererDefinitions } from './renderer-definitions.js';
import { registerBuiltinScadaSymbols } from './symbols/register-builtin.js';

vi.mock('leafer-ui', () => import('./test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

const validConfig = {
  version: 1,
  symbols: [{ id: 'rect-1', type: 'scada-rect', x: 10, y: 20, width: 100, height: 50, fill: '#ff0000' }],
};

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
  registerBuiltinScadaSymbols();
});

afterEach(() => {
  resetFluxI18n();
  cleanup();
});

describe('scada-canvas render smoke', () => {
  it('compiles and renders the real scada-canvas renderer with scene build', async () => {
    const SchemaRenderer = createSchemaRenderer(industrialRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://industrial/smoke"
        schema={{ type: 'scada-canvas', config: validConfig }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const root = container.querySelector('[data-slot="scada-canvas"]') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.className).toContain('nop-scada-canvas');
    const canvas = container.querySelector('[data-slot="scada-canvas-canvas"]') as HTMLElement;
    expect(canvas).toBeTruthy();
    const handles = Object.keys(window).filter((key) => key.startsWith('__flux_scada_'));
    expect(handles.length).toBeGreaterThan(0);
  });

  it('renders the lightweight loading placeholder while config is missing', () => {
    const SchemaRenderer = createSchemaRenderer(industrialRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://industrial/smoke-loading"
        schema={{ type: 'scada-canvas' }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const root = container.querySelector('[data-slot="scada-canvas"]') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.className).toContain('nop-scada-canvas');
    expect(container.querySelector('[data-slot="scada-canvas-loading"]')).toBeTruthy();
  });
});
