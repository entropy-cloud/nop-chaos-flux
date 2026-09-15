import { describe, expect, it, vi } from 'vitest';
import { AISchemaGenerator, type LlmProvider } from './schema-generator.js';
import { SchemaValidator } from './schema-validator.js';

describe('AISchemaGenerator.generateSchema (plan 468 Phase 2, deterministic template)', () => {
  it('derives slug ids and binds dataPoints to the first model', () => {
    const config = AISchemaGenerator.generateSchema({
      sceneType: 'industrial',
      models: [{ name: 'Main Valve', kind: 'box' }, { name: 'Tank', kind: 'sphere' }],
      dataPoints: [
        { name: 'valveOpen', type: 'boolean' },
        { name: 'level', type: 'number', range: [0, 100] },
      ],
    });
    expect(config.type).toBe('three-canvas');
    const models = config.scene.models as Array<{ id: string; primitive?: { geometry: { type: string } } }>;
    expect(models.map((m) => m.id)).toEqual(['main-valve', 'tank']);
    expect(models[0].primitive?.geometry.type).toBe('box');
    const bindings = (config.bindings ?? []) as Array<{ id: string; target: { modelId: string; path: string }; source: { expression: string }; transform?: { range?: unknown } }>;
    expect(bindings).toHaveLength(2);
    expect(bindings[0].target).toEqual({ modelId: 'main-valve', path: 'visible', type: 'visible' });
    expect(bindings[0].source.expression).toBe('${sceneState.valveOpen}');
    expect(bindings[1].target.path).toBe('material.color');
    expect(bindings[1].transform?.range).toEqual({ input: [0, 100], output: [0, 1] });
  });

  it('falls back to model-<n> for pure CJK names', () => {
    const config = AISchemaGenerator.generateSchema({
      sceneType: 'industrial',
      models: [{ name: '阀门', kind: 'box' }],
      dataPoints: [],
    });
    const models = config.scene.models as Array<{ id: string }>;
    expect(models[0].id).toBe('model-1');
  });

  it('maps unknown kinds to a glb url fallback', () => {
    const config = AISchemaGenerator.generateSchema({
      sceneType: 'product',
      models: [{ name: 'robot', kind: 'robot-arm' }],
      dataPoints: [],
    });
    const models = config.scene.models as Array<{ id: string; url?: string; primitive?: unknown }>;
    expect(models[0].url).toBe('/models/robot-arm.glb');
    expect(models[0].primitive).toBeUndefined();
  });

  it('empty models input yields an empty scene that passes the validator', () => {
    const config = AISchemaGenerator.generateSchema({
      sceneType: 'custom',
      models: [],
      dataPoints: [{ name: 'x', type: 'number' }],
    });
    expect((config.scene.models as unknown[])).toHaveLength(0);
    expect(config.bindings).toHaveLength(0);
    expect(new SchemaValidator().validate(config).valid).toBe(true);
  });

  it('generator output passes its own validator (invariant)', () => {
    const config = AISchemaGenerator.generateSchema({
      sceneType: 'industrial',
      models: [{ name: 'Pump A', kind: 'cylinder' }],
      dataPoints: [
        { name: 'pressure', type: 'number' },
        { name: 'running', type: 'boolean' },
      ],
      interactions: ['click'],
    });
    const result = new SchemaValidator().validate(config);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
    // interactions → schema 级 onObjectClick
    expect((config.events as { onObjectClick?: unknown }).onObjectClick).toBeDefined();
  });
});

describe('AISchemaGenerator.generateFromPrompt (plan 468 Phase 2, mock provider)', () => {
  const validConfigJson = JSON.stringify({
    type: 'three-canvas',
    scene: {
      camera: { position: [0, 0, 5] },
      lights: [{ type: 'ambient', intensity: 0.5 }],
      models: [{ id: 'valve', primitive: { geometry: { type: 'box' } } }],
    },
  });

  function providerReturning(responses: string[]): LlmProvider {
    let call = 0;
    return {
      complete: vi.fn(() => {
        const response = responses[Math.min(call, responses.length - 1)];
        call++;
        return Promise.resolve(response);
      }),
    };
  }

  it('parses plain and fenced JSON into a validated config', async () => {
    const fenced = '```json\n' + validConfigJson + '\n```';
    for (const response of [validConfigJson, fenced]) {
      const config = await AISchemaGenerator.generateFromPrompt({
        prompt: 'make a valve',
        provider: providerReturning([response]),
      });
      expect(config.type).toBe('three-canvas');
    }
  });

  it('feeds first-round errors back into the repair prompt', async () => {
    const complete = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve('{"type":"three-canvas","scene":{"camera":{"position":[0,0,5]},"lights":[],"models":[{"id":"valve","primitive":{"geometry":{"type":"box"}}}]},"bindings":[{"id":"b1","target":{"modelId":"ghost","path":"position","type":"position"},"source":{"expression":"${x}"}}]}'))
      .mockImplementationOnce(() => Promise.resolve(validConfigJson));
    const config = await AISchemaGenerator.generateFromPrompt({
      prompt: 'make a valve',
      provider: { complete },
      maxRepairRounds: 2,
    });
    expect(config.type).toBe('three-canvas');
    expect(complete).toHaveBeenCalledTimes(2);
    const repairPrompt = complete.mock.calls[1][0] as string;
    expect(repairPrompt).toContain('binding-target-missing');
    expect(repairPrompt).toContain('bindings[0].target.modelId');
  });

  it('rejects with aggregated errors after exhausting repair rounds', async () => {
    const provider = providerReturning(['not-json at all']);
    await expect(
      AISchemaGenerator.generateFromPrompt({ prompt: 'p', provider, maxRepairRounds: 2 }),
    ).rejects.toThrow(/validation failed/i);
    expect(provider.complete).toHaveBeenCalledTimes(3); // 首轮 + 2 修正轮
  });
});
