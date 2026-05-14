import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createSchemaRenderer } from '../schema-renderer.js';
import { useRendererRuntime } from '../hooks.js';
import { env, pageRenderer, sharedFormulaCompiler, textRenderer } from '../test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SchemaRenderer re-render contracts', () => {
  it('H7: re-compiles when schema identity changes', () => {
    const SchemaRenderer = createSchemaRenderer([textRenderer]);

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'text', text: 'First schema' }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );
    expect(screen.getByText('First schema')).toBeTruthy();

    rerender(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'text', text: 'Second schema' }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );
    expect(screen.getByText('Second schema')).toBeTruthy();
    expect(screen.queryByText('First schema')).toBeNull();
  });

  it('H10: preserves runtime instance across env identity changes', () => {
    const runtimeIds: string[] = [];

    function RuntimeIdProbe() {
      const rt = useRendererRuntime();
      runtimeIds.push(rt.runtimeId);
      return <span data-testid="runtime-id">{rt.runtimeId}</span>;
    }

    const runtimeProbeRenderer = {
      type: 'runtime-id-probe',
      component: RuntimeIdProbe,
    };

    const SchemaRenderer = createSchemaRenderer([pageRenderer, runtimeProbeRenderer]);

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'page', body: [{ type: 'runtime-id-probe' }] }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );
    const firstId = screen.getByTestId('runtime-id').textContent;
    expect(firstId).toBeTruthy();

    const newEnv = { ...env, notify: vi.fn() };
    rerender(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'page', body: [{ type: 'runtime-id-probe' }] }}
        env={newEnv}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );
    const secondId = screen.getByTestId('runtime-id').textContent;
    expect(secondId).toBe(firstId);
  });
});
