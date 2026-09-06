import { describe, expect, it, vi } from 'vitest';
import {
  createRendererRegistry,
  type NodeRuntimeState,
  type RuntimeValueState,
} from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { textRenderer, env } from './test-fixtures.js';

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

function createRuntimeStateFromTemplateNode(
  node: import('@nop-chaos/flux-core').TemplateNode,
): NodeRuntimeState {
  const metaEntries: Record<string, RuntimeValueState<unknown>> = {};
  const meta = node.metaProgram;
  for (const key of Object.keys(meta) as Array<keyof typeof meta>) {
    const value = meta[key];
    if (value && typeof value === 'object' && (value as { kind?: string }).kind === 'dynamic') {
      metaEntries[key] = (value as { createState(): RuntimeValueState<unknown> }).createState();
    }
  }
  return {
    meta: metaEntries,
    props: node.propsProgram.kind === 'dynamic' ? node.propsProgram.createState() : undefined,
  };
}

describe('resolveNodeProps — unpublished scope tolerance', () => {
  it('returns a reference-stable pending result instead of throwing when props hit an unpublished variable', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler,
    });

    const schema = { type: 'text', text: '${"共 " + (rawData.total ?? 0) + " 条"}' };
    const compiled = runtime.compile(schema);
    const node = compiled.root as any;
    const state = runtime.schemaCompiler.compileNode(schema, {
      path: '$',
      renderer: runtime.registry.get('text')!,
    });
    const runtimeState = createRuntimeStateFromTemplateNode(state);
    const page = runtime.createPageRuntime({}); // rawData absent

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const first = runtime.resolveNodeProps(node, page.scope, runtimeState);
      expect(first.changed).toBe(false);
      expect(first.reusedReference).toBe(true);
      // Partial dependency must be armed so the scope subscription re-fires
      // on publication (F1 records traversed paths even on throw).
      expect(runtimeState.propsDependencies?.paths).toContain('rawData');

      const second = runtime.resolveNodeProps(node, page.scope, runtimeState);
      // Reference-stable: the equality gate in node-renderer-resolved holds.
      expect(second.value).toBe(first.value);
      expect(second.reusedReference).toBe(true);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('re-resolves to the real value and clears the pending cache once the variable publishes', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler,
    });

    const schema = { type: 'text', text: '${"共 " + (rawData.total ?? 0) + " 条"}' };
    const compiled = runtime.compile(schema);
    const node = compiled.root as any;
    const state = runtime.schemaCompiler.compileNode(schema, {
      path: '$',
      renderer: runtime.registry.get('text')!,
    });
    const runtimeState = createRuntimeStateFromTemplateNode(state);
    const page = runtime.createPageRuntime({});

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const pending = runtime.resolveNodeProps(node, page.scope, runtimeState);
      expect(pending.reusedReference).toBe(true);

      page.scope.update('rawData', { total: 5 });
      const resolved = runtime.resolveNodeProps(node, page.scope, runtimeState);
      expect(String(resolved.value.text)).toBe('共 5 条');
      expect(resolved.reusedReference).toBe(false);
    } finally {
      warnSpy.mockRestore();
    }
  });


  it('tolerates unpublished variables in meta expressions (when/visible/className) with renderer defaults', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler,
    });

    const schema = { type: 'text', text: 'x', visible: '${card.data.showBadge}', className: '${card.data.theme}' };
    const compiled = runtime.compile(schema);
    const node = compiled.root as any;
    const state = runtime.schemaCompiler.compileNode(schema, {
      path: '$',
      renderer: runtime.registry.get('text')!,
    });
    const runtimeState = createRuntimeStateFromTemplateNode(state);
    const page = runtime.createPageRuntime({}); // card absent

    const meta = runtime.resolveNodeMeta(node, page.scope, runtimeState);
    // Renderer defaults apply on the pending pass (visible falls back to true).
    expect(meta.visible).toBe(true);
    expect(meta.className).toBeUndefined();
    // Dependencies armed for recovery.
    expect(runtimeState.metaDependencies?.paths).toContain('card');

    page.scope.update('card', { data: { showBadge: false, theme: 'dark' } });
    const resolved = runtime.resolveNodeMeta(node, page.scope, runtimeState);
    expect(resolved.visible).toBe(false);
    expect(resolved.className).toBe('dark');
  });

  it('still throws for non-sentinel evaluation errors', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler,
    });

    const schema = { type: 'text', text: '${broken()}' };
    const compiled = runtime.compile(schema);
    const node = compiled.root as any;
    const state = runtime.schemaCompiler.compileNode(schema, {
      path: '$',
      renderer: runtime.registry.get('text')!,
    });
    const runtimeState = createRuntimeStateFromTemplateNode(state);
    const page = runtime.createPageRuntime({});

    expect(() => runtime.resolveNodeProps(node, page.scope, runtimeState)).toThrow();
  });
});
