import schemaDocument from './threejs-schema.json';

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

type Config = Record<string, unknown>;

/**
 * AI Schema 验证器（design-ai-generation.md §3，I4.1）：
 * 手写结构 + 语义双层校验为**校验来源**（确定性错误码 + JSON Pointer path 精确度所需）；
 * threejs-schema.json 经 getSchema() 供编辑器/AI 提示消费；一致性由常驻测试守卫
 * （generateSchema 类型化输出过 validator + getSchema 与 TS 抽查）。
 * 错误一次聚合返回（不 fail-fast）。ModelConfig 判别口径与 live renderer 一致：
 * 仅拒双空（无 url 无 primitive）；双源沿用 renderer primitive 优先语义，不作门禁违规。
 */
export class SchemaValidator {
  validate(config: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
      return { valid: false, errors: [{ path: '', message: 'Config must be an object' }] };
    }
    const obj = config as Config;
    if (obj.type !== 'three-canvas') {
      errors.push({ path: 'type', message: 'Must be "three-canvas"' });
    }
    const scene = obj.scene;
    if (typeof scene !== 'object' || scene === null || Array.isArray(scene)) {
      errors.push({ path: 'scene', message: 'Scene config is required' });
      return { valid: errors.length === 0, errors };
    }
    const sceneConfig = scene as Config;
    const camera = sceneConfig.camera;
    if (typeof camera !== 'object' || camera === null) {
      errors.push({ path: 'scene.camera', message: 'Camera config is required' });
    } else {
      const position = (camera as Config).position;
      if (
        !Array.isArray(position) ||
        position.length !== 3 ||
        !position.every((v) => typeof v === 'number')
      ) {
        errors.push({ path: 'scene.camera.position', message: 'camera-position-invalid' });
      }
    }
    if (!Array.isArray(sceneConfig.lights)) {
      errors.push({ path: 'scene.lights', message: 'Lights array is required' });
    }
    const models = sceneConfig.models;
    if (!Array.isArray(models)) {
      errors.push({ path: 'scene.models', message: 'Models array is required' });
      return { valid: errors.length === 0, errors };
    }
    // 语义校验：id 唯一、pattern、rotation 三元、source 判别（双空拒绝；双源容忍）
    const seenIds = new Set<string>();
    models.forEach((raw, index) => {
      const path = `scene.models[${index}]`;
      if (typeof raw !== 'object' || raw === null) {
        errors.push({ path, message: 'Model must be an object' });
        return;
      }
      const model = raw as Config;
      const id = model.id;
      if (typeof id !== 'string' || id.length === 0) {
        errors.push({ path: `${path}.id`, message: 'Model id is required' });
      } else {
        if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id)) {
          errors.push({ path: `${path}.id`, message: `Model id '${id}' violates pattern ^[a-zA-Z][a-zA-Z0-9_-]*$` });
        }
        if (seenIds.has(id)) {
          errors.push({ path: `${path}.id`, message: 'model-id-duplicate' });
        }
        seenIds.add(id);
      }
      const rotation = model.rotation;
      if (rotation !== undefined) {
        if (
          !Array.isArray(rotation) ||
          rotation.length !== 3 ||
          !rotation.every((v) => typeof v === 'number')
        ) {
          errors.push({ path: `${path}.rotation`, message: 'model-rotation-invalid' });
        }
      }
      const hasUrl = typeof model.url === 'string' && model.url.length > 0;
      const hasPrimitive = typeof model.primitive === 'object' && model.primitive !== null;
      if (!hasUrl && !hasPrimitive) {
        errors.push({ path, message: 'Model must declare url or primitive' });
      }
      // 双源容忍：primitive 优先（renderer 语义），不作门禁违规
    });
    // 语义校验：binding target 悬挂
    const bindings = obj.bindings;
    if (bindings !== undefined) {
      if (!Array.isArray(bindings)) {
        errors.push({ path: 'bindings', message: 'Bindings must be an array' });
      } else {
        bindings.forEach((raw, index) => {
          if (typeof raw !== 'object' || raw === null) {
            errors.push({ path: `bindings[${index}]`, message: 'Binding must be an object' });
            return;
          }
          const target = (raw as Config).target;
          if (typeof target !== 'object' || target === null) {
            errors.push({ path: `bindings[${index}].target`, message: 'Binding target is required' });
            return;
          }
          const modelId = (target as Config).modelId;
          if (typeof modelId !== 'string' || modelId.length === 0) {
            errors.push({ path: `bindings[${index}].target.modelId`, message: 'Target modelId is required' });
          } else if (!seenIds.has(modelId)) {
            errors.push({ path: `bindings[${index}].target.modelId`, message: 'binding-target-missing' });
          }
        });
      }
    }
    return { valid: errors.length === 0, errors };
  }

  getSchema(): typeof schemaDocument {
    return schemaDocument;
  }
}
