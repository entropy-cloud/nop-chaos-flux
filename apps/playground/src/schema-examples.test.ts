import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { validateSchema } from '@nop-chaos/flux-compiler';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';

function extractJsonExample(markdown: string) {
  const match = markdown.match(/```json\s*([\s\S]*?)```/);

  if (!match) {
    throw new Error('Expected a fenced json example in the markdown document.');
  }

  return JSON.parse(match[1]);
}

describe('docs schema examples', () => {
  it('validate the user-management schema example with the shared compiler diagnostics path', () => {
    const registry = createRendererRegistry();
    registerBasicRenderers(registry);
    registerFormRenderers(registry);
    registerFormAdvancedRenderers(registry);
    registerDataRenderers(registry);

    const markdown = readFileSync(
      resolve(process.cwd(), '../../docs/examples/user-management-schema.md'),
      'utf8',
    );
    const schema = extractJsonExample(markdown);
    const diagnostics = validateSchema({
      schema,
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
      options: {
        validation: {
          unknownBarePropertyPolicy: 'error',
        },
      },
    });

    expect(diagnostics).toEqual([]);
  });
});
