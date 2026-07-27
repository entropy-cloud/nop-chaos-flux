import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createSchemaRenderer } from '../schema-renderer.js';
import { env, pageRenderer, textRenderer, sharedFormulaCompiler } from '../test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('cross-layer e2e: compile→runtime→react→renderer', () => {
  it('compiles a page schema, creates runtime, renders with React, and verifies the output', () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://e2e-schema"
        schema={{
          type: 'page',
          body: [{ type: 'text', text: 'Hello from e2e' }],
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    expect(screen.getByText('Hello from e2e')).toBeTruthy();
  });

  it('re-renders when schema changes and preserves runtime', () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer]);

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://rerender"
        schema={{
          type: 'page',
          body: [{ type: 'text', text: 'Version 1' }],
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    expect(screen.getByText('Version 1')).toBeTruthy();

    rerender(
      <SchemaRenderer
        schemaUrl="test://rerender"
        schema={{
          type: 'page',
          body: [{ type: 'text', text: 'Version 2' }],
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    expect(screen.getByText('Version 2')).toBeTruthy();
    expect(screen.queryByText('Version 1')).toBeNull();
  });

  it('renders multiple nodes inside a page body', () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://multi"
        schema={{
          type: 'page',
          body: [
            { type: 'text', text: 'First' },
            { type: 'text', text: 'Second' },
          ],
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.getByText('Second')).toBeTruthy();
  });
});
