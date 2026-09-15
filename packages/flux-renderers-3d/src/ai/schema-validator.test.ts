import { describe, expect, it } from 'vitest';
import { SchemaValidator } from './schema-validator.js';

function validConfig() {
  return {
    type: 'three-canvas',
    scene: {
      camera: { position: [0, 0, 5] },
      lights: [{ type: 'ambient', intensity: 0.5 }],
      models: [
        {
          id: 'valve',
          url: 'valve.glb',
          rotation: [0, 0, 0],
        },
      ],
    },
    bindings: [
      {
        id: 'b1',
        target: { modelId: 'valve', path: 'position', type: 'position' },
        source: { expression: '${sceneState.x}' },
      },
    ],
  };
}

function errorsOf(config: unknown): Array<{ path: string; message: string }> {
  return new SchemaValidator().validate(config).errors;
}

describe('SchemaValidator (plan 468 Phase 1)', () => {
  it('accepts a minimal valid configuration', () => {
    const result = new SchemaValidator().validate(validConfig());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('accepts an empty models array as structurally valid (renders empty state)', () => {
    const config = validConfig();
    (config.scene as { models: unknown[] }).models = [];
    (config as { bindings?: unknown }).bindings = [];
    const result = new SchemaValidator().validate(config);
    expect(result.valid).toBe(true);
  });

  it('aggregates multiple errors in one pass with paths', () => {
    const config = validConfig();
    delete (config as { scene?: unknown }).scene;
    delete (config as { type?: unknown }).type;
    const result = new SchemaValidator().validate(config);
    expect(result.valid).toBe(false);
    const paths = result.errors.map((e) => e.path);
    expect(paths).toContain('type');
    expect(paths).toContain('scene');
  });

  it('reports non-triple camera.position as camera-position-invalid', () => {
    const config = validConfig();
    (config.scene as { camera: { position: unknown } }).camera.position = [0, 0];
    const errors = errorsOf(config);
    expect(errors.some((e) => e.message === 'camera-position-invalid')).toBe(true);
  });

  it('reports duplicate model ids as model-id-duplicate', () => {
    const config = validConfig();
    (config.scene as { models: Array<Record<string, unknown>> }).models.push({
      id: 'valve',
      url: 'other.glb',
    });
    const errors = errorsOf(config);
    expect(errors.some((e) => e.message === 'model-id-duplicate')).toBe(true);
  });

  it('reports bindings referencing missing models as binding-target-missing', () => {
    const config = validConfig();
    (config.bindings as Array<{ target: { modelId: string } }>)[0].target.modelId = 'ghost';
    const errors = errorsOf(config);
    expect(errors.some((e) => e.message === 'binding-target-missing')).toBe(true);
  });

  it('reports model id pattern violations', () => {
    const config = validConfig();
    (config.scene as { models: Array<{ id: string }> }).models[0].id = '1-bad-id';
    const errors = errorsOf(config);
    expect(errors.some((e) => e.path === 'scene.models[0].id')).toBe(true);
  });

  it('reports non-triple rotation', () => {
    const config = validConfig();
    ((config.scene as { models: Array<Record<string, unknown>> }).models[0] as Record<string, unknown>).rotation = [0, 0];
    const errors = errorsOf(config);
    expect(errors.some((e) => e.message === 'model-rotation-invalid')).toBe(true);
  });

  it('tolerates dual-source (url + primitive) per renderer semantics (primitive precedence)', () => {
    const config = validConfig();
    (config.scene as { models: Array<Record<string, unknown>> }).models[0].primitive = {
      geometry: { type: 'box' },
    };
    const result = new SchemaValidator().validate(config);
    expect(result.valid).toBe(true);
  });

  it('rejects dual-empty model (no url and no primitive)', () => {
    const config = validConfig();
    delete ((config.scene as { models: Array<Record<string, unknown>> }).models[0] as Record<string, unknown>).url;
    const errors = errorsOf(config);
    expect(errors.some((e) => e.path === 'scene.models[0]')).toBe(true);
  });

  it('getSchema exposes the draft-07 document for editor/AI consumption', () => {
    const schema = new SchemaValidator().getSchema() as { $schema?: string; definitions?: Record<string, unknown> };
    expect(schema.$schema).toContain('draft-07');
    expect(Object.keys(schema.definitions ?? {}).length).toBeGreaterThan(0);
  });
});
