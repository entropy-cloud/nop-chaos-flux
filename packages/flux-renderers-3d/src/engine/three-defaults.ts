import * as THREE from 'three';

/**
 * 3D 渲染器默认值单一事实源（plan 533 D1 Phase 1）：散落字面量收敛。
 * 消费方：scene-manager（aspect/尺寸/灯色/hover/pixelRatio）、three-canvas（组件高度）。
 */

/** 初始相机 aspect 回退（容器零尺寸/未挂载时；init 末尾 resizeToContainer 会以容器真实值覆盖）。 */
export const DEFAULT_ASPECT = 800 / 600;
export const FALLBACK_WIDTH = 800;
export const FALLBACK_HEIGHT = 400;
/** 组件容器高度缺省（three-canvas style）。 */
export const DEFAULT_COMPONENT_HEIGHT = '400px';
/** 灯光缺省色（createLight fallback）。 */
export const DEFAULT_LIGHT_COLOR = '#ffffff';
export const DEFAULT_GROUND_COLOR = '#404040';
/** hover 高亮缺省（可经 SceneManagerOptions.hoverHighlight 覆盖；色值属美学，提亮通道与材质类型解耦）。 */
const DEFAULT_HOVER_EMISSIVE = 0x2b4c7e;
const DEFAULT_HOVER_INTENSITY = 0.9;
/** MeshBasicMaterial 白提亮比例（无 emissive 通道的反馈）。 */
export const HOVER_BASIC_LIFT = 0.25;
/** HiDPI 上限（>2x 收益递减、fill-rate 代价线性）。 */
const MAX_PIXEL_RATIO = 2;

export function resolveDevicePixelRatio(): number | null {
  if (typeof window === 'undefined' || typeof window.devicePixelRatio !== 'number') return null;
  const ratio = window.devicePixelRatio;
  if (!Number.isFinite(ratio) || ratio <= 0) return null;
  return Math.min(ratio, MAX_PIXEL_RATIO);
}

export function hoverEmissiveColor(overrides?: { emissive?: string }): THREE.Color {
  if (!overrides?.emissive) return new THREE.Color(DEFAULT_HOVER_EMISSIVE);
  return new THREE.Color(overrides.emissive);
}

export function hoverIntensity(overrides?: { intensity?: number }): number {
  return overrides?.intensity ?? DEFAULT_HOVER_INTENSITY;
}
