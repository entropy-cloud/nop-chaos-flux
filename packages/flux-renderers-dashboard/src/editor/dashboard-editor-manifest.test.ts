import { describe, expect, it } from 'vitest';
import {
  DASHBOARD_EDITOR_MANIFEST_V1,
  DASHBOARD_EDITOR_COMMAND_TYPES,
} from './dashboard-editor-manifest.js';
import { dashboardEditorRendererDefinition } from './dashboard-editor-definitions.js';

describe('dashboard-editor host manifest (P3.1)', () => {
  it('declares family dashboard-editor at version 1.0 with reserved empty capabilities', () => {
    expect(DASHBOARD_EDITOR_MANIFEST_V1.family).toBe('dashboard-editor');
    expect(DASHBOARD_EDITOR_MANIFEST_V1.version).toBe('1.0');
    expect(DASHBOARD_EDITOR_MANIFEST_V1.capabilities.namespace).toBe('dashboard-editor');
    expect(Object.keys(DASHBOARD_EDITOR_MANIFEST_V1.capabilities.methods)).toEqual([]);
    // reservation note is visible to tooling via metadata
    expect(DASHBOARD_EDITOR_MANIFEST_V1.metadata?.description).toContain('component handles');
  });

  it('projects the editor-core session shape (layout/selection/mode/runtime)', () => {
    const fields = DASHBOARD_EDITOR_MANIFEST_V1.projection.fields;
    expect(Object.keys(fields).sort()).toEqual(['layout', 'mode', 'runtime', 'selection']);
    expect(fields.layout?.schema.kind).toBe('unknown');
    expect(fields.selection?.schema.kind).toBe('array');
    expect(fields.mode?.schema.kind).toBe('string');
    const runtime = fields.runtime?.schema as { kind: string; fields?: Record<string, { kind: string }> };
    expect(runtime.fields?.canUndo?.kind).toBe('boolean');
    expect(runtime.fields?.canRedo?.kind).toBe('boolean');
    expect(runtime.fields?.dirty?.kind).toBe('boolean');
  });

  it('attaches hostContract to the renderer definition with domain-host-renderer class', () => {
    const definition = dashboardEditorRendererDefinition.type === 'dashboard-editor' ? dashboardEditorRendererDefinition : undefined;
    expect(definition).toBeDefined();
    expect(definition?.rendererClass).toBe('domain-host-renderer');
    expect(definition?.hostContract?.family).toBe('dashboard-editor');
    expect(definition?.hostContract?.defaultVersion).toBe('1.0');
    // resolve round-trip for every selector variant
    for (const selector of ['1.0', '1', 'latest']) {
      expect(definition?.hostContract?.resolveManifest(selector)?.family).toBe('dashboard-editor');
    }
    expect(definition?.hostContract?.resolveManifest('9.9')).toBeUndefined();
  });

  it('capability type set derives from the manifest methods (empty → empty, parity by construction)', () => {
    expect(DASHBOARD_EDITOR_COMMAND_TYPES).toEqual([]);
  });
});
