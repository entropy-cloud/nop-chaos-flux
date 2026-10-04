import { describe, expect, it, vi } from 'vitest';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));
import {
  SCADA_EDITOR_MANIFEST_COMMAND_TYPES,
  SCADA_EDITOR_MANIFEST_V1,
} from './scada-editor-manifest.js';
import { industrialEditorRendererDefinitions } from './renderer-definitions.js';

describe('scada-editor host manifest (P3.1)', () => {
  it('declares family scada-editor at version 1.0 with reserved empty capabilities', () => {
    expect(SCADA_EDITOR_MANIFEST_V1.family).toBe('scada-editor');
    expect(SCADA_EDITOR_MANIFEST_V1.version).toBe('1.0');
    expect(SCADA_EDITOR_MANIFEST_V1.capabilities.namespace).toBe('scada-editor');
    expect(Object.keys(SCADA_EDITOR_MANIFEST_V1.capabilities.methods)).toEqual([]);
    expect(SCADA_EDITOR_MANIFEST_V1.metadata?.description).toContain('component handles');
  });

  it('projects the session shape (config/selection/mode/runtime)', () => {
    const fields = SCADA_EDITOR_MANIFEST_V1.projection.fields;
    expect(Object.keys(fields).sort()).toEqual(['config', 'mode', 'runtime', 'selection']);
    expect(fields.config?.schema.kind).toBe('unknown');
    expect(fields.selection?.schema.kind).toBe('array');
    const runtime = fields.runtime?.schema as { fields?: Record<string, { kind: string }> };
    expect(runtime.fields?.canUndo?.kind).toBe('boolean');
    expect(runtime.fields?.canRedo?.kind).toBe('boolean');
  });

  it('attaches hostContract to the renderer definition with domain-host-renderer class', () => {
    const definition = industrialEditorRendererDefinitions.find((d) => d.type === 'scada-editor-canvas');
    expect(definition).toBeDefined();
    expect(definition?.rendererClass).toBe('domain-host-renderer');
    expect(definition?.hostContract?.family).toBe('scada-editor');
    expect(definition?.hostContract?.defaultVersion).toBe('1.0');
    for (const selector of ['1.0', '1', 'latest']) {
      expect(definition?.hostContract?.resolveManifest(selector)?.family).toBe('scada-editor');
    }
    expect(definition?.hostContract?.resolveManifest('9.9')).toBeUndefined();
  });

  it('capability type set derives from the manifest methods (empty → empty, parity by construction)', () => {
    expect(SCADA_EDITOR_MANIFEST_COMMAND_TYPES).toEqual([]);
  });
});
