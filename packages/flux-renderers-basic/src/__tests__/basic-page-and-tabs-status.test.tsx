import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createSchemaCompiler } from '@nop-chaos/flux-compiler';
import { createExpressionCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createRendererRuntime } from '@nop-chaos/flux-runtime';
import { basicRendererDefinitions } from '../index.js';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';
import { scopeStateProbeRenderer } from './basic-page-layout.test-support.js';

describe('basicRendererDefinitions page and tabs status ownership', () => {
  afterEach(() => {
    cleanup();
  });

  it('publishes page status summary through statusPath', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'page',
          statusPath: 'pageStatus',
          body: [{ type: 'text', text: '${pageStatus?.refreshTick}' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(screen.getByText('0')).toBeTruthy());
  });

  it('reroutes dynamic page statusPath publications by clearing the old target and publishing the new target', async () => {
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, scopeStateProbeRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout-reroute"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Switch page status path',
              onClick: {
                action: 'setValue',
                args: {
                  path: 'activeStatusKey',
                  value: 'b',
                },
              },
            },
            {
              type: 'page',
              statusPath: 'ui.${activeStatusKey}',
              body: [{ type: 'text', text: 'Inner page' }],
            },
            { type: 'scope-state-probe', name: 'ui.a' },
            { type: 'scope-state-probe', name: 'ui.b' },
          ],
        }}
        data={{ activeStatusKey: 'a', ui: {} }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('scope-state:ui.a').textContent).toBe('{"refreshTick":0}');
      expect(screen.getByTestId('scope-state:ui.b').textContent).toBe('null');
    });

    fireEvent.click(screen.getByText('Switch page status path'));

    await waitFor(() => {
      expect(screen.getByTestId('scope-state:ui.a').textContent).toBe('null');
      expect(screen.getByTestId('scope-state:ui.b').textContent).toBe('{"refreshTick":0}');
    });
  });

  it('treats page and tabs statusPath as resolved prop fields rather than static structural paths', () => {
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry(basicRendererDefinitions),
      expressionCompiler: createExpressionCompiler(formulaCompiler),
    });

    expect(
      compiler.validate?.({
        type: 'page',
        statusPath: '${pageStatusPath}',
      } as any),
    ).toEqual([]);

    expect(
      compiler.validate?.({
        type: 'tabs',
        statusPath: '${tabsStatusPath}',
        items: [{ key: 'first', title: 'First' }],
      } as any),
    ).toEqual([]);

    const runtime = createRendererRuntime({
      registry: createRendererRegistry(basicRendererDefinitions),
      env,
      expressionCompiler: createExpressionCompiler(formulaCompiler),
    });
    const pageCompiled = runtime.compile({
      type: 'page',
      statusPath: '${pageStatusPath}',
    });
    const tabsCompiled = runtime.compile({
      type: 'tabs',
      statusPath: '${tabsStatusPath}',
      items: [{ key: 'first', title: 'First' }],
    });
    const pageScope = runtime.createPageRuntime({
      pageStatusPath: 'ui.pageStatus',
      tabsStatusPath: 'ui.tabsStatus',
    }).scope;
    const rootProps = runtime.resolveNodeProps(pageCompiled.root as any, pageScope).value as Record<string, unknown>;
    const resolvedTabs = runtime.resolveNodeProps(tabsCompiled.root as any, pageScope);

    expect(rootProps.statusPath).toBe('ui.pageStatus');
    expect((resolvedTabs.value as Record<string, unknown>).statusPath).toBe('ui.tabsStatus');
  });

  it('publishes tabs status and supports scope ownership', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'page',
          body: [
            {
              type: 'tabs',
              valueOwnership: 'scope',
              valueStatePath: 'ui.activeTab',
              statusPath: 'ui.tabsStatus',
              items: [
                { key: 'first', title: 'First', body: [{ type: 'text', text: 'First body' }] },
                { key: 'second', title: 'Second', body: [{ type: 'text', text: 'Second body' }] },
              ],
            },
            {
              type: 'text',
              text: '${ui.tabsStatus?.activeValue}:${ui.tabsStatus?.activeIndex}:${ui.activeTab}',
            },
          ],
        }}
        data={{ ui: { activeTab: 'first' } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(screen.getByText('first:0:first')).toBeTruthy());
    fireEvent.click(screen.getByText('Second'));
    await waitFor(() => {
      expect(screen.getByText('second:1:second')).toBeTruthy();
      expect(screen.getByText('Second body')).toBeTruthy();
    });
  });
});
