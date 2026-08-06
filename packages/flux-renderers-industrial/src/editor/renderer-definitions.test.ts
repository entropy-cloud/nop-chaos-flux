import { describe, it, expect, vi } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { industrialEditorRendererDefinitions } from './renderer-definitions.js';
import { registerScadaEditorRenderers } from './index.js';
import { ScadaEditorCanvasRenderer } from './scada-editor-canvas.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));

describe('industrialEditorRendererDefinitions (E5.1 完整 fields)', () => {
  it('should export an array of RendererDefinition', () => {
    expect(Array.isArray(industrialEditorRendererDefinitions)).toBe(true);
  });

  it('should contain exactly 1 definition (scada-editor-canvas)', () => {
    expect(industrialEditorRendererDefinitions).toHaveLength(1);
  });

  it('scada-editor-canvas definition should have required fields', () => {
    const def = industrialEditorRendererDefinitions[0];
    expect(def.type).toBe('scada-editor-canvas');
    expect(def.displayName).toEqual(expect.any(String));
    expect(def.category).toBe('industrial');
    expect(def.sourcePackage).toBe('@nop-chaos/flux-renderers-industrial');
    expect(def.defaultSchema).toEqual({
      type: 'scada-editor-canvas',
      config: { version: 1, variables: [], symbols: [] },
      mode: 'edit',
      commitPolicy: 'manual',
    });
    expect(def.component).toBe(ScadaEditorCanvasRenderer);
    expect(def.rendererClass).toBe('instance-renderer');
  });

  it('scada-editor-canvas complete fields registered (E5.1: props + regions + events whole-object)', () => {
    const fields = industrialEditorRendererDefinitions[0].fields ?? [];
    const byKey = new Map(fields.map((field) => [field.key, field]));
    // props
    expect(byKey.get('config')).toMatchObject({ key: 'config', kind: 'prop' });
    expect(byKey.get('width')).toMatchObject({ key: 'width', kind: 'prop' });
    expect(byKey.get('height')).toMatchObject({ key: 'height', kind: 'prop' });
    expect(byKey.get('mode')).toMatchObject({ key: 'mode', kind: 'prop' });
    expect(byKey.get('commitPolicy')).toMatchObject({ key: 'commitPolicy', kind: 'prop' });
    expect(byKey.get('viewport')).toMatchObject({ key: 'viewport', kind: 'prop' });
    // D-1 裁定：events 为整体 prop（非 events.* event 规则）
    expect(byKey.get('events')).toMatchObject({ key: 'events', kind: 'prop' });
    // regions
    expect(byKey.get('palette')).toMatchObject({ key: 'palette', kind: 'region' });
    expect(byKey.get('inspector')).toMatchObject({ key: 'inspector', kind: 'region' });
    expect(byKey.get('toolbox')).toMatchObject({ key: 'toolbox', kind: 'region' });
    expect(byKey.get('statusBar')).toMatchObject({ key: 'statusBar', kind: 'region' });
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
