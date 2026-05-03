import { afterEach, beforeEach } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererEnv, createTestConfig, ensureResizeObserverMock } from './test-support';

export const textRenderer: RendererDefinition = {
  type: 'text',
  component: (props) => <span>{String(props.props.text ?? '')}</span>,
};

export const pageRenderer: RendererDefinition = {
  type: 'page',
  component: (props) => <section>{props.regions.body?.render() as React.ReactNode}</section>,
  regions: ['body'],
};

export const basicTestRendererDefinitions: RendererDefinition[] = [pageRenderer, textRenderer];
export const formulaCompiler = createFormulaCompiler();

export function installFlowDesignerTestHooks() {
  beforeEach(async () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');
  });

  afterEach(() => {
    resetFluxI18n();
  });

  ensureResizeObserverMock();
}

export { createRendererEnv, createTestConfig };
