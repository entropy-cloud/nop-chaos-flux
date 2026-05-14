// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { createDefaultRegistry, createSchemaRenderer } from '@nop-chaos/flux-react';
import './word-editor-page-host-scope.test-support.js';
import { registerWordEditorRenderers, defineWordEditorPageSchema } from '../index.js';
import {
  createEnv,
  defaultWordEditorConfig,
  renderWordEditor,
  resetMockStores,
} from './word-editor-page-host-scope.test-support.js';
import { wordEditorRendererDefinitions } from '../index.js';

describe('WordEditorPage host scope', () => {
  afterEach(() => {
    cleanup();
  });

  it('hides override regions when no panel config resolves that side', () => {
    resetFluxI18n();
    initFluxI18n();
    resetMockStores();

    const HiddenProbe: RendererDefinition = {
      type: 'hidden-probe',
      component: () => <span>Hidden probe</span>,
    };

    renderWordEditor({
      schema: {
        type: 'word-editor-page',
        leftPanel: { type: 'hidden-probe' },
        rightPanel: { type: 'hidden-probe' },
      },
      extraRenderers: [HiddenProbe],
    });

    expect(screen.queryByText('Hidden probe')).toBeNull();
    expect(screen.queryByTestId('left-panel-expanded')).toBeNull();
    expect(screen.queryByTestId('right-panel-expanded')).toBeNull();
  });

  it('renders default generators only when config resolves side panels', () => {
    resetFluxI18n();
    initFluxI18n();
    resetMockStores();

    renderWordEditor({
      schema: {
        type: 'word-editor-page',
        config: { leftPanel: { generator: 'default' }, rightPanel: { generator: 'default' } },
      },
    });

    expect(screen.getByTestId('dataset-panel')).toBeTruthy();
    expect(screen.getByTestId('outline-panel')).toBeTruthy();
  });

  it('exposes shared collapse controls for expanded workbench sides', async () => {
    resetFluxI18n();
    initFluxI18n();
    resetMockStores();

    renderWordEditor({
      schema: {
        type: 'word-editor-page',
        config: defaultWordEditorConfig,
      },
    });

    expect(screen.getByTestId('left-panel-expanded')).toBeTruthy();
    expect(screen.getByTestId('right-panel-expanded')).toBeTruthy();

    fireEvent.click(screen.getByTestId('collapse-field-panel'));
    fireEvent.click(screen.getByTestId('collapse-outline-panel'));

    await waitFor(() => {
      expect(screen.getByTestId('left-panel-collapsed')).toBeTruthy();
      expect(screen.getByTestId('right-panel-collapsed')).toBeTruthy();
    });
  });

  it('clears word-editor host status on unmount', async () => {
    resetFluxI18n();
    initFluxI18n();
    resetMockStores();

    const StatusProbe: RendererDefinition = {
      type: 'status-probe',
      component: function StatusProbeComponent() {
        return <span data-testid="word-editor-status" />;
      },
    };

    const pageRenderer: RendererDefinition = {
      type: 'page',
      component: (props) => <section>{props.regions.body?.render() as React.ReactNode}</section>,
      fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
    };

    const registry = createDefaultRegistry([pageRenderer, StatusProbe]);
    registerWordEditorRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    const view = render(
      <SchemaRenderer
        schemaUrl="test://word-editor/status-unmount"
        schema={
          {
            type: 'page',
            body: [
              defineWordEditorPageSchema({
                type: 'word-editor-page',
                statusPath: 'wordEditorStatus',
              }),
              { type: 'status-probe' },
            ],
          } as any
        }
        env={createEnv()}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
        data={{}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('word-editor-status')).toBeTruthy();
    });

    view.unmount();
  });

  it('exposes domain host metadata on the registered renderer definition', () => {
    const definition = wordEditorRendererDefinitions.find(
      (candidate) => candidate.type === 'word-editor-page',
    );

    expect(definition?.rendererClass).toBe('domain-host-renderer');
    expect(definition?.rendererTraits).toEqual(
      expect.arrayContaining(['workbench-shell', 'builder-facing']),
    );
    expect(definition?.propContracts?.statusPath?.shape.kind).toBe('string');
    expect(definition?.eventContracts?.onBack?.displayName).toBe('Back');
  });
});
