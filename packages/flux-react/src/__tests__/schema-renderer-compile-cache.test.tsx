import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '../schema-renderer.js';
import { env, pageRenderer } from '../test-support-core.js';

// FM-2 plan 643 P1-1 render-path guard. NOTE: this test exercises the
// schema-renderer per-instance useMemo root-compile path, which BYPASSES the
// module-level compile cache — it pins that the render path keeps registries
// separate, but has NO discriminating power over the module cache (it passes
// on the old single-level cache too). The real discriminator for the module
// cache is `compile-cache-runtime-identity.test.ts` (calls normalizeNodeInput
// directly; red on the old cache — closure audit R1 Major-1).

afterEach(cleanup);

function markerRenderer(mark: string): RegisteredRendererDefinition {
  return {
    type: 'text',
    component: (props: any) => (
      <span data-testid="registry-mark">
        {mark}:{String(props.props.text ?? '')}
      </span>
    ),
  };
}

describe('compile cache runtime-identity contract (FM-2 plan 643 P1-1)', () => {
  it('recompiles the same schema object per runtime instead of reusing another registry nodes', () => {
    const sharedSchema = {
      type: 'page',
      body: [{ type: 'text', text: 'shared' }],
    };

    const RendererA = createSchemaRenderer([pageRenderer, markerRenderer('A')]);
    const RendererB = createSchemaRenderer([pageRenderer, markerRenderer('B')]);

    render(
      <RendererA
        schemaUrl="test://cache-a.json"
        schema={sharedSchema}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    render(
      <RendererB
        schemaUrl="test://cache-b.json"
        schema={sharedSchema}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const marks = screen.getAllByTestId('registry-mark');
    expect(marks).toHaveLength(2);
    expect(marks[0]!.textContent).toContain('A:');
    // Old cache: the second runtime hit the first runtime's compiled nodes and
    // rendered "A:shared" too.
    expect(marks[1]!.textContent).toContain('B:');
  });
});
