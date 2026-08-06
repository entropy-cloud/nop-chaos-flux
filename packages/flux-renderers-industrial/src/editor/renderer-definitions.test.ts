import { describe, it, expect } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { industrialEditorRendererDefinitions } from './renderer-definitions.js';
import { registerScadaEditorRenderers } from './index.js';
import { ScadaEditorCanvasRenderer } from './scada-editor-canvas.js';

describe('industrialEditorRendererDefinitions (E4.2 空壳)', () => {
  it('should export an array of RendererDefinition', () => {
    expect(Array.isArray(industrialEditorRendererDefinitions)).toBe(true);
  });

  it('should contain exactly 1 definition (scada-editor-canvas)', () => {
    expect(industrialEditorRendererDefinitions).toHaveLength(1);
  });

  it('scada-editor-canvas definition should have required fields (E4.2 空壳期最小)', () => {
    const def = industrialEditorRendererDefinitions[0];
    expect(def.type).toBe('scada-editor-canvas');
    expect(def.displayName).toEqual(expect.any(String));
    expect(def.category).toBe('industrial');
    // sourcePackage 仍是主包（方案 A 裁定：编辑器放入既有包，经 /editor subpath 隔离）。
    expect(def.sourcePackage).toBe('@nop-chaos/flux-renderers-industrial');
    // defaultSchema 含合法空场景 config（__FLUX_STRICT_VALIDATION__ 不拦截）。
    expect(def.defaultSchema).toEqual({
      type: 'scada-editor-canvas',
      config: { version: 1, variables: [], symbols: [] },
    });
    expect(def.component).toBe(ScadaEditorCanvasRenderer);
    expect(def.rendererClass).toBe('instance-renderer');
  });

  it('scada-editor-canvas minimal fields registered (config/width/height; 完整属 E5.1)', () => {
    const fields = industrialEditorRendererDefinitions[0].fields ?? [];
    const byKey = new Map(fields.map((field) => [field.key, field]));
    expect(byKey.get('config')).toMatchObject({ key: 'config', kind: 'prop' });
    expect(byKey.get('width')).toMatchObject({ key: 'width', kind: 'prop' });
    expect(byKey.get('height')).toMatchObject({ key: 'height', kind: 'prop' });
  });

  it('should register via registerScadaEditorRenderers without conflicts', () => {
    const registry = createRendererRegistry();
    registerScadaEditorRenderers(registry);
    expect(registry.has('scada-editor-canvas')).toBe(true);
    expect(registry.list()).toHaveLength(1);
    const def = registry.get('scada-editor-canvas');
    expect(def?.type).toBe('scada-editor-canvas');
    expect(def?.sourcePackage).toBe('@nop-chaos/flux-renderers-industrial');
    expect(def?.component).toBe(ScadaEditorCanvasRenderer);
  });

  it('registerScadaEditorRenderers is independent of registerScadaRenderers (隔离纪律)', () => {
    // 编辑器注册函数只注册 scada-editor-canvas，不注册 runtime scada-canvas。
    // 主入口 registerScadaRenderers 不 import 本模块（模块图隔离，design-architecture.md §4.4.1）。
    const registry = createRendererRegistry();
    registerScadaEditorRenderers(registry);
    expect(registry.has('scada-editor-canvas')).toBe(true);
    expect(registry.has('scada-canvas')).toBe(false);
  });

  it('registerScadaEditorRenderers is idempotent', () => {
    const registry = createRendererRegistry();
    registerScadaEditorRenderers(registry);
    registerScadaEditorRenderers(registry);
    expect(registry.list()).toHaveLength(1);
  });
});
