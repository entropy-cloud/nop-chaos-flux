import * as THREE from 'three';
import type { ModelConfig, PrimitiveModelConfig } from '../schemas.js';

export type PrimitiveResolution =
  | { kind: 'primitive'; config: PrimitiveModelConfig }
  | { kind: 'gltf'; config: ModelConfig & { url: string } }
  | { kind: 'invalid'; code: string; message: string };

/**
 * ModelConfig 判别（plan 466 Phase 3，Failure Paths 契约）：
 * url XOR primitive；双源 primitive 优先（url 忽略 + primitive-dual-source 诊断码归调用方）；
 * 双空 invalid。
 */
export function resolvePrimitiveModel(config: ModelConfig): PrimitiveResolution {
  if (config.primitive) {
    return { kind: 'primitive', config: config.primitive };
  }
  if (typeof config.url === 'string' && config.url.length > 0) {
    return { kind: 'gltf', config: config as ModelConfig & { url: string } };
  }
  return {
    kind: 'invalid',
    code: 'primitive-invalid-config',
    message: `Model '${config.id}' has neither url nor primitive config`,
  };
}

type GeometryFactory = (args: Record<string, number>) => THREE.BufferGeometry;

const GEOMETRIES: Record<string, GeometryFactory> = {
  box: (a) => new THREE.BoxGeometry(a.width ?? 1, a.height ?? 1, a.depth ?? 1),
  sphere: (a) => new THREE.SphereGeometry(a.radius ?? 1, a.widthSegments ?? 32, a.heightSegments ?? 16),
  cylinder: (a) =>
    new THREE.CylinderGeometry(a.radiusTop ?? 1, a.radiusBottom ?? 1, a.height ?? 1, a.radialSegments ?? 32),
  plane: (a) => new THREE.PlaneGeometry(a.width ?? 1, a.height ?? 1),
  cone: (a) => new THREE.ConeGeometry(a.radius ?? 1, a.height ?? 1, a.radialSegments ?? 32),
  torus: (a) =>
    new THREE.TorusGeometry(a.radius ?? 1, a.tube ?? 0.4, a.radialSegments ?? 16, a.tubularSegments ?? 48),
};

type MaterialFactory = (config: NonNullable<PrimitiveModelConfig['material']>) => THREE.Material;

const MATERIALS: Record<string, MaterialFactory> = {
  standard: () => new THREE.MeshStandardMaterial(),
  basic: () => new THREE.MeshBasicMaterial(),
  lambert: () => new THREE.MeshLambertMaterial(),
  phong: () => new THREE.MeshPhongMaterial(),
};

function applyMaterialProps(material: THREE.Material, config: NonNullable<PrimitiveModelConfig['material']>): void {
  const meshMaterial = material as THREE.MeshStandardMaterial;
  if (config.color !== undefined) meshMaterial.color = new THREE.Color(config.color);
  if (config.opacity !== undefined) meshMaterial.opacity = config.opacity;
  if (config.transparent !== undefined) meshMaterial.transparent = config.transparent;
  if (config.wireframe !== undefined) meshMaterial.wireframe = config.wireframe;
  if (config.flatShading !== undefined) meshMaterial.flatShading = config.flatShading;
}

/**
 * 图元网格工厂（plan 466 Phase 3）：六种基础几何 × 四种材质。
 * 未知 geometry type 返回 undefined（调用方走 primitive-invalid-config 诊断，不抛错）。
 */
export function createPrimitiveMesh(config: PrimitiveModelConfig): THREE.Mesh | undefined {
  const geometryFactory = GEOMETRIES[config.geometry.type];
  if (!geometryFactory) return undefined;
  const geometry = geometryFactory(config.geometry.args ?? {});
  const materialConfig = config.material ?? { type: 'standard' as const };
  const materialFactory = MATERIALS[materialConfig.type ?? 'standard'];
  const material = materialFactory(materialConfig);
  applyMaterialProps(material, materialConfig);
  return new THREE.Mesh(geometry, material);
}
