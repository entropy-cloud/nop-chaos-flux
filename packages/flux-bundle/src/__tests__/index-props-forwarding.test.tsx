import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  ActionScope,
  ComponentHandleRegistry,
  ModuleCache,
  PageStoreApi,
  RendererPlugin,
  ScopeRef,
  SurfaceRuntime,
} from '@nop-chaos/flux-core';

const { capturedProps } = vi.hoisted(() => {
  const capturedProps: Array<Record<string, unknown>> = [];
  return { capturedProps };
});

vi.mock('@nop-chaos/flux-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/flux-react')>();
  const ReactModule = await import('react');
  const MockSchemaRenderer = (props: Record<string, unknown>) => {
    capturedProps.push(props);
    return ReactModule.createElement('div', { 'data-testid': 'mock-schema-renderer' });
  };
  return {
    ...actual,
    createSchemaRenderer: () => MockSchemaRenderer,
  };
});

import { createFluxSchemaRendererWithRegistry } from '../index.js';
import type { FluxRendererEnv, FluxRendererRegistry } from '../index.js';

describe('FluxSchemaRenderer props forwarding contract', () => {
  it('forwards every type-passable prop to the underlying SchemaRenderer (no silent no-ops)', () => {
    capturedProps.length = 0;

    const registry = {} as FluxRendererRegistry;
    const Renderer = createFluxSchemaRendererWithRegistry(registry);

    const onActionError = (error: unknown) => void error;
    const onRuntimeChange = () => undefined;
    const onComponentRegistryChange = () => undefined;
    const onActionScopeChange = () => undefined;
    const env = { __fluxMockEnv: true } as unknown as FluxRendererEnv;

    const props = {
      schema: { type: 'page', body: [] },
      schemaUrl: 'test://props-forwarding.json',
      env,
      data: { initial: 1 },
      strictValidation: true,
      onActionError,
      plugins: [{ name: 'fixture-plugin' }] as unknown as RendererPlugin[],
      pageStore: { __pageStore: true } as unknown as PageStoreApi,
      surfaceRuntime: { __surfaceRuntime: true } as unknown as SurfaceRuntime,
      moduleCache: { __moduleCache: true } as unknown as ModuleCache,
      parentScope: { __parentScope: true } as unknown as ScopeRef,
      actionScope: { __actionScope: true } as unknown as ActionScope,
      componentRegistry: { __componentRegistry: true } as unknown as ComponentHandleRegistry,
      onRuntimeChange,
      onComponentRegistryChange,
      onActionScopeChange,
    };

    render(<Renderer {...props} />);

    expect(capturedProps.length).toBe(1);
    const forwarded = capturedProps[0];

    for (const [key, value] of Object.entries(props)) {
      expect(forwarded[key]).toBe(value);
    }

    expect(forwarded.registry).toBe(registry);
    expect(typeof forwarded.formulaCompiler).toBe('object');
    expect(forwarded.formulaCompiler).not.toBeNull();
  });
});
