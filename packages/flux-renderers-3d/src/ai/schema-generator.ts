import type { AnimationConfig, DataBinding, LightConfig, PrimitiveGeometryType, ThreeCanvasSchema } from '../schemas.js';
import type { SchemaObject } from '@nop-chaos/flux-core';
import { SchemaValidator, type ValidationError } from './schema-validator.js';

/** LLM 提供方注入面（design-ai-generation.md §4）：返回原始文本（可能含围栏），解析归本管线。 */
export interface LlmProvider {
  complete(prompt: string): Promise<string>;
}

export interface SceneGenerationInput {
  sceneType: 'industrial' | 'architectural' | 'product' | 'custom';
  models: Array<{ name: string; kind: string; position?: [number, number, number] }>;
  dataPoints: Array<{ name: string; type: 'number' | 'boolean' | 'enum'; range?: [number, number] }>;
  interactions?: Array<'click' | 'hover'>;
}

export interface GenerateFromPromptInput {
  prompt: string;
  provider: LlmProvider;
  maxRepairRounds?: number;
}

const PRIMITIVE_KINDS = new Set<PrimitiveGeometryType>([
  'box',
  'sphere',
  'cylinder',
  'plane',
  'cone',
  'torus',
]);

/** name → id：slug 化（空白转 -、小写、去非法字符）；空串/非字母开头回退 `model-<序号>`；冲突追加序号。 */
function slugify(name: string, used: Set<string>, index: number): string {
  let slug = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
  slug = slug.replace(/^-+|-+$/g, '');
  if (!/^[a-zA-Z]/.test(slug)) slug = `model-${index + 1}`;
  let candidate = slug;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${slug}-${suffix++}`;
  }
  used.add(candidate);
  return candidate;
}

/**
 * AI 场景生成器（design-ai-generation.md §4，I4.1）：
 * - `generateSchema`：确定性模板（无 LLM 依赖）——few-shot 示例源 / 测试夹具 / 降级路径；
 *   kind 命中图元六类 → primitive 模型（无外链 GLB），未知 kind → url 回退。
 * - `generateFromPrompt`：provider 注入 + 围栏剥离 + SchemaValidator 门禁 + errors 回喂修正回路。
 *   LLM 输出一律不可信：先剥围栏、再 parse、再 validate，任何字段不做动态执行。
 */
export class AISchemaGenerator {
  static generateSchema(input: SceneGenerationInput): ThreeCanvasSchema {
    const usedIds = new Set<string>();
    const models = input.models.map((model, index) => {
      const id = slugify(model.name, usedIds, index);
      const base: { id: string; position: [number, number, number]; url?: string; primitive?: { geometry: { type: PrimitiveGeometryType } } } = {
        id,
        position: model.position ?? [index * 2, 0, 0],
      };
      if (PRIMITIVE_KINDS.has(model.kind as PrimitiveGeometryType)) {
        base.primitive = { geometry: { type: model.kind as PrimitiveGeometryType } };
      } else {
        base.url = `/models/${model.kind}.glb`;
      }
      return base;
    });
    const firstModelId = models[0]?.id;
    // 无模型时不生成 bindings（target 悬挂必被 validator 拒绝）
    const bindings: DataBinding[] = firstModelId
      ? input.dataPoints.map((point) => ({
          id: `binding-${point.name}`,
          target: {
            modelId: firstModelId,
            path: point.type === 'boolean' ? 'visible' : 'material.color',
            type: point.type === 'boolean' ? 'visible' : 'material',
          },
          source: { expression: `\${sceneState.${point.name}}` },
          transform:
            point.type === 'boolean'
              ? undefined
              : { range: { input: point.range ?? [0, 100], output: [0, 1] } },
        }))
      : [];
    const lights: LightConfig[] = [
      { type: 'ambient', intensity: 0.4 },
      { type: 'directional', position: [5, 5, 5], intensity: 0.8, castShadow: true },
    ];
    const events: Record<string, unknown> = {};
    if (input.interactions?.includes('click')) {
      events.onObjectClick = {
        action: 'setValue',
        args: { path: 'sceneState.selectedObject', value: '${event.modelId}' },
      };
    }
    if (input.interactions?.includes('hover')) {
      events.onObjectHover = {
        action: 'setValue',
        args: { path: 'sceneState.hoveredObject', value: '${event.modelId}' },
      };
    }
    return {
      type: 'three-canvas',
      scene: {
        camera: { position: [5, 3, 5], fov: 75 },
        lights,
        models,
      } as unknown as ThreeCanvasSchema['scene'],
      bindings: bindings as (DataBinding & SchemaObject)[],
      animations: [] as (AnimationConfig & SchemaObject)[],
      events: events as ThreeCanvasSchema['events'],
    };
  }

  static async generateFromPrompt(input: GenerateFromPromptInput): Promise<ThreeCanvasSchema> {
    const maxRounds = input.maxRepairRounds ?? 2;
    let prompt = input.prompt;
    let lastErrors: ValidationError[] = [];
    for (let attempt = 0; attempt <= maxRounds; attempt++) {
      const text = await input.provider.complete(prompt);
      const parsed = this.parseJsonCandidate(text);
      if (parsed.ok) {
        const result = new SchemaValidator().validate(parsed.value);
        if (result.valid) return parsed.value as ThreeCanvasSchema;
        lastErrors = result.errors;
      } else {
        lastErrors = [{ path: '', message: `Response is not valid JSON: ${parsed.error}` }];
      }
      // errors 以 path/message 回喂修正轮
      prompt = `${input.prompt}\n\nYour previous response failed schema validation. Fix these issues and return the full corrected JSON:\n${lastErrors
        .map((e) => `- [${e.path}] ${e.message}`)
        .join('\n')}`;
    }
    throw new Error(
      `AI scene validation failed after ${maxRounds + 1} attempts: ${lastErrors
        .map((e) => `[${e.path}] ${e.message}`)
        .join('; ')}`,
    );
  }

  private static parseJsonCandidate(text: string):
    | { ok: true; value: unknown }
    | { ok: false; error: string } {
    const stripped = text
      .replace(/^\s*```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();
    try {
      return { ok: true, value: JSON.parse(stripped) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
