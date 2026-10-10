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

type GeometryFactory = (config: PrimitiveGeometryConfigLike) => THREE.BufferGeometry;

interface PrimitiveGeometryConfigLike {
  type: string;
  args?: Record<string, number>;
  path?: [number, number, number][];
}

const GEOMETRIES: Record<string, GeometryFactory> = {
  box: (c) => new THREE.BoxGeometry(c.args?.width ?? 1, c.args?.height ?? 1, c.args?.depth ?? 1),
  sphere: (c) => new THREE.SphereGeometry(c.args?.radius ?? 1, c.args?.widthSegments ?? 32, c.args?.heightSegments ?? 16),
  cylinder: (c) =>
    new THREE.CylinderGeometry(c.args?.radiusTop ?? 1, c.args?.radiusBottom ?? 1, c.args?.height ?? 1, c.args?.radialSegments ?? 32),
  plane: (c) => new THREE.PlaneGeometry(c.args?.width ?? 1, c.args?.height ?? 1),
  cone: (c) => new THREE.ConeGeometry(c.args?.radius ?? 1, c.args?.height ?? 1, c.args?.radialSegments ?? 32),
  torus: (c) =>
    new THREE.TorusGeometry(c.args?.radius ?? 1, c.args?.tube ?? 0.4, c.args?.radialSegments ?? 16, c.args?.tubularSegments ?? 48),
  // 559 Phase 2：管道布线（工业孪生管线）——CatmullRom 平滑样条沿 path 挤出圆管
  tube: (c) => {
    const points = (c.path ?? []).map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    if (points.length < 2) return new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0)]), 8, c.args?.radius ?? 0.2, 8, false);
    return new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      c.args?.tubularSegments ?? 64,
      c.args?.radius ?? 0.2,
      c.args?.radialSegments ?? 8,
      (c.args?.closed ?? 0) !== 0,
    );
  },
  capsule: (c) => new THREE.CapsuleGeometry(c.args?.radius ?? 0.5, c.args?.length ?? 1, c.args?.capSegments ?? 4, c.args?.radialSegments ?? 16),
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
  // 559 Phase 2：PBR/自发光通道——按材质能力守卫（basic 无 emissive/metalness 等字段）
  if (config.metalness !== undefined && 'metalness' in meshMaterial) meshMaterial.metalness = config.metalness;
  if (config.roughness !== undefined && 'roughness' in meshMaterial) meshMaterial.roughness = config.roughness;
  if (config.emissive !== undefined && 'emissive' in meshMaterial) meshMaterial.emissive = new THREE.Color(config.emissive);
  if (config.emissiveIntensity !== undefined && 'emissiveIntensity' in meshMaterial) meshMaterial.emissiveIntensity = config.emissiveIntensity;
}

/**
 * 图元网格工厂（plan 466 Phase 3；559 Phase 2 扩至 8 种几何 + PBR 材质字段）。
 * 未知 geometry type 返回 undefined（调用方走 primitive-invalid-config 诊断，不抛错）。
 */
export function createPrimitiveMesh(config: PrimitiveModelConfig): THREE.Mesh | undefined {
  const geometryFactory = GEOMETRIES[config.geometry.type];
  if (!geometryFactory) return undefined;
  const geometry = geometryFactory(config.geometry as PrimitiveGeometryConfigLike);
  const materialConfig = config.material ?? { type: 'standard' as const };
  const materialFactory = MATERIALS[materialConfig.type ?? 'standard'];
  const material = materialFactory(materialConfig);
  applyMaterialProps(material, materialConfig);
  return new THREE.Mesh(geometry, material);
}
