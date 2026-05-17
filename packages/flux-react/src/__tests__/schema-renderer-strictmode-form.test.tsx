import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '../schema-renderer.js';
import { createDefaultRegistry } from '../defaults.js';
import { env, formRenderer, probeInputRenderer, sharedFormulaCompiler, textRenderer } from '../test-support-core.js';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';

function RegionBindingsHost(props: RendererComponentProps) {
  return (
    <section>
      {props.regions.body?.render({
        bindings: { child: 'child-a' as const },
        pathSuffix: 'fragment',
      }) as React.ReactNode}
    </section>
  );
}

const regionBindingsHostRenderer = {
  type: 'region-bindings-host',
  component: RegionBindingsHost,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
} as const;

describe('SchemaRenderer form behavior in StrictMode', () => {
  it('keeps form inputs writable after StrictMode remount simulation', async () => {
    const SchemaRenderer = createSchemaRenderer([formRenderer, probeInputRenderer]);

    render(
      <React.StrictMode>
        <SchemaRenderer
          schemaUrl="test://schema-renderer-strictmode-form"
          schema={{
            type: 'form',
            data: {
              email: '',
            },
            body: [
              {
                type: 'probe-input',
              },
            ],
          }}
          env={env}
          formulaCompiler={sharedFormulaCompiler}
        />
      </React.StrictMode>,
    );

    const input = screen.getByLabelText('Email') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'hello@example.com' } });

    await waitFor(() => {
      expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('hello@example.com');
    });
  });

  it('commits fragment-scoped region content under StrictMode', async () => {
    const SchemaRenderer = createSchemaRenderer([textRenderer, regionBindingsHostRenderer as any]);

    render(
      <React.StrictMode>
        <SchemaRenderer
          schemaUrl="test://schema-renderer-strictmode-fragment-scope"
          schema={{
            type: 'region-bindings-host',
            body: [
              { type: 'text', text: 'lexical:${shared}' },
              { type: 'text', text: 'own:${child}' },
            ],
          }}
          data={{ shared: 'parent-a' }}
          env={env}
          formulaCompiler={sharedFormulaCompiler}
        />
      </React.StrictMode>,
    );

    await waitFor(() => {
      expect(screen.getByText('lexical:parent-a')).toBeTruthy();
      expect(screen.getByText('own:child-a')).toBeTruthy();
    });
  });

  it('keeps fragment body rendering when using a prebuilt registry', async () => {
    const registry = createDefaultRegistry();
    registerBasicRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    render(
      <React.StrictMode>
        <SchemaRenderer
          schemaUrl="test://schema-renderer-prebuilt-registry-fragment"
          schema={{
            type: 'page',
            body: [
              { type: 'text', text: 'before' },
              {
                type: 'fragment',
                data: { greeting: 'hello' },
                body: [{ type: 'text', text: '${greeting}:${shared}' }],
              },
            ],
          }}
          data={{ shared: 'parent' }}
          env={env}
          registry={registry}
          formulaCompiler={sharedFormulaCompiler}
        />
      </React.StrictMode>,
    );

    await waitFor(() => {
      expect(screen.getByText('before')).toBeTruthy();
      expect(screen.getByText('hello:parent')).toBeTruthy();
    });
  });
});
