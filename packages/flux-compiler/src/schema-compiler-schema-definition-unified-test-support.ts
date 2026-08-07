import type { RendererDefinition, TemplateNode } from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createSchemaCompiler } from './schema-compiler.js';

export const PRESERVE_LITERAL_MARKER = '__nopPreserveLiteral';

/**
 * Phase 2 contract tests: the propContracts.shape pipeline fully takes over
 * region extraction (params/isolate via SchemaFieldRule carrier), literal
 * envelope, and compiledKey semantics — matching the legacy deepFields
 * normalize output exactly (对照语义). The unified pipeline is now the only
 * nested-handling entry point.
 */

export function compileFixture(
  definition: RendererDefinition,
  authored: Record<string, unknown>,
  extraRenderers: RendererDefinition[] = [],
): TemplateNode {
  const registry = createRendererRegistry([
    definition,
    {
      type: 'text',
      displayName: 'Text',
      component: () => null,
      fields: [{ key: 'text', kind: 'prop' }],
    },
    {
      type: 'button',
      displayName: 'Button',
      component: () => null,
      fields: [{ key: 'label', kind: 'prop' }],
    },
    {
      type: 'form',
      displayName: 'Form',
      component: () => null,
      fields: [{ key: 'submitAction', kind: 'prop' }],
    },
    ...extraRenderers,
  ]);
  const compiler = createSchemaCompiler({ registry });
  return compiler.compileNode({ type: definition.type, ...authored } as never, {
    path: '$',
    renderer: definition,
  });
}

export function compiledPropValue<T>(node: TemplateNode, key: string): T | undefined {
  const propsRuntime = node.propsProgram.node as { kind: string; value?: Record<string, unknown> };
  if (propsRuntime.kind === 'static-node') {
    return propsRuntime.value?.[key] as T | undefined;
  }
  const entries = (propsRuntime as { entries?: Record<string, unknown> }).entries;
  const entry = entries?.[key];
  if (!entry) return undefined;
  if ((entry as { kind?: string }).kind === 'static-node') {
    return (entry as { value?: unknown }).value as T;
  }
  return entry as unknown as T;
}
