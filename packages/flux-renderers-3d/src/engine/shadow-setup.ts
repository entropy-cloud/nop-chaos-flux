import * as THREE from 'three';
import type { LightConfig, ModelConfig } from '../schemas.js';

/**
 * Shadow wiring (plan 473, visual-quality V3-F2) — extracted from
 * scene-manager to honour the oversized-file gate (M-2 strategy).
 *
 * `shadowMap.enabled` is set in init before the first render so depth maps
 * are produced; the directional shadow frustum widens the three.js default
 * (±5) which clips typical 16×16 demo grounds; `light.target` must join the
 * scene graph for its position to take effect.
 */

const SHADOW_FRUSTUM = 14;
const SHADOW_MAP_SIZE = 1024;

export function hasShadowCastingLights(lights: LightConfig[]): boolean {
  return lights.some((light) => light.castShadow);
}

export function enableRendererShadows(renderer: THREE.WebGLRenderer): void {
  if (renderer.shadowMap) {
    renderer.shadowMap.enabled = true;
  }
}

export function configureDirectionalShadows(light: THREE.DirectionalLight): void {
  light.castShadow = true;
  const cam = light.shadow.camera as THREE.OrthographicCamera;
  cam.left = -SHADOW_FRUSTUM;
  cam.right = SHADOW_FRUSTUM;
  cam.top = SHADOW_FRUSTUM;
  cam.bottom = -SHADOW_FRUSTUM;
  cam.near = 0.5;
  cam.far = 60;
  light.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
}

export function applyMeshShadowFlags(
  root: THREE.Object3D,
  config: Pick<ModelConfig, 'castShadow' | 'receiveShadow'>,
): void {
  if (!config.castShadow && !config.receiveShadow) return;
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (config.castShadow) mesh.castShadow = true;
    if (config.receiveShadow) mesh.receiveShadow = true;
  });
}
