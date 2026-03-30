import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { createDefaultRegistry, createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { conditionBuilderPageSchema } from './ConditionBuilderPage';

describe('ConditionBuilderPage schema', () => {
  const registry = createDefaultRegistry();
  registerBasicRenderers(registry);
  registerFormRenderers(registry);
  registerDataRenderers(registry);
  const formulaCompiler = createFormulaCompiler();
  const SchemaRenderer = createSchemaRenderer();

  const env = {
    async fetcher() { return { ok: true, status: 200, data: null }; },
    notify() {},
  };

  it('all schema renderer types are registered', () => {
    const types = collectTypes(conditionBuilderPageSchema as any);
    for (const t of types) {
      expect(registry.has(t), `renderer type "${t}" not registered`).toBe(true);
    }
  });

  it('compiles and renders without throwing', () => {
    expect(() => {
      render(
        <SchemaRenderer
          schema={conditionBuilderPageSchema}
          data={{}}
          env={env as any}
          registry={registry}
          formulaCompiler={formulaCompiler}
        />
      );
    }).not.toThrow();
  });
});

function collectTypes(node: any, out = new Set<string>()): Set<string> {
  if (node && typeof node === 'object') {
    if (node.type && typeof node.type === 'string') out.add(node.type);
    if (Array.isArray(node.body)) node.body.forEach((c: any) => collectTypes(c, out));
    if (Array.isArray(node.items)) node.items.forEach((c: any) => collectTypes(c, out));
  }
  return out;
}
