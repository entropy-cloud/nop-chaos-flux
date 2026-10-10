import * as THREE from 'three';
import type { ModelConfig } from '../schemas.js';
import type { DiagnosticEvent } from './scene-manager.js';
import { createLabelSprite, disposeLabelSprite } from './label-sprite.js';

/**
 * SceneJSON 装配与模型标注（559 Phase 2，从 scene-manager 抽出以守住 700 行门）：
 * - `assembleSceneJsonObjects`：ObjectLoader.parse + traverse 注册 name 非空对象
 *   （首名注册、重名诊断跳过、interactiveObjects 点名拾取）；
 * - `attachModelLabel`：CanvasTexture Sprite 标注（labelOffset 显式定位，缺省锚定包围盒上方）。
 */

export interface SceneJsonAssemblyHandlers {
  interactiveObjects?: string[];
  onDuplicate(name: string): void;
  onError(event: DiagnosticEvent): void;
  /** 注册一个带 name 的装配对象（调用方负责进 models Map + pending 回放）。 */
  register(name: string, object: THREE.Object3D, config: ModelConfig): void;
}

export function assembleSceneJsonObjects(
  json: unknown,
  scene: THREE.Scene,
  handlers: SceneJsonAssemblyHandlers,
): void {
  let loaded: THREE.Object3D;
  try {
    loaded = new THREE.ObjectLoader().parse(json as Record<string, unknown>) as THREE.Object3D;
  } catch (error) {
    handlers.onError({ code: 'scene-json-invalid', message: 'Failed to parse three.js scene JSON', error });
    return;
  }
  scene.add(loaded);
  const seen = new Set<string>();
  loaded.traverse((object) => {
    if (!object.name || seen.has(object.name)) {
      if (object.name) handlers.onDuplicate(object.name);
      return;
    }
    seen.add(object.name);
    const config: ModelConfig = {
      id: object.name,
      interactive: handlers.interactiveObjects?.includes(object.name) ?? false,
    };
    handlers.register(object.name, object, config);
  });
}

/** 559 Phase 2：模型标注 Sprite——labelOffset 显式定位，缺省锚定包围盒上方。 */
export function attachModelLabel(config: ModelConfig, root: THREE.Object3D): THREE.Sprite[] {
  if (!config.label) return [];
  const sprite = createLabelSprite(config.label);
  if (config.labelOffset) {
    sprite.position.set(...config.labelOffset);
  } else {
    root.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(root);
    const height = Math.max(0, box.max.y - box.min.y);
    sprite.position.set(
      (box.max.x + box.min.x) / 2 - root.position.x,
      box.max.y - root.position.y + Math.max(0.2, height * 0.12),
      (box.max.z + box.min.z) / 2 - root.position.z,
    );
  }
  root.add(sprite);
  return [sprite];
}

export { disposeLabelSprite };
