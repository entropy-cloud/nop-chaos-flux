import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { BufferGeometry } from 'three';
import { createPrimitiveMesh, resolvePrimitiveModel } from './primitive-factory.js';
import type { PrimitiveModelConfig } from '../schemas.js';

describe('PrimitiveFactory (plan 466 Phase 3)', () => {
  it('creates the six base geometries with params', () => {
    const cases: Array<[PrimitiveModelConfig, (geo: BufferGeometry) => boolean]> = [
      [{ geometry: { type: 'box', args: { width: 2, height: 3, depth: 4 } } }, (geo) => geo instanceof THREE.BoxGeometry],
      [{ geometry: { type: 'sphere', args: { radius: 2 } } }, (geo) => geo instanceof THREE.SphereGeometry],
      [{ geometry: { type: 'cylinder', args: { height: 3 } } }, (geo) => geo instanceof THREE.CylinderGeometry],
      [{ geometry: { type: 'plane', args: { width: 5, height: 6 } } }, (geo) => geo instanceof THREE.PlaneGeometry],
      [{ geometry: { type: 'cone', args: { radius: 2, height: 4 } } }, (geo) => geo instanceof THREE.ConeGeometry],
      [{ geometry: { type: 'torus', args: { radius: 2, tube: 0.5 } } }, (geo) => geo instanceof THREE.TorusGeometry],
    ];
    for (const [config, check] of cases) {
      const mesh = createPrimitiveMesh(config);
      expect(mesh).toBeInstanceOf(THREE.Mesh);
      expect(check(mesh!.geometry)).toBe(true);
    }
  });

  it('applies material type and properties', () => {
    const standard = createPrimitiveMesh({
      geometry: { type: 'box' },
      material: { type: 'standard', color: '#ff0000', opacity: 0.5, transparent: true, wireframe: false },
    })!;
    const mat = standard.material as THREE.MeshStandardMaterial;
    expect(mat).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(mat.color.getHexString()).toBe('ff0000');
    expect(mat.opacity).toBe(0.5);
    expect(mat.transparent).toBe(true);

    const basic = createPrimitiveMesh({
      geometry: { type: 'sphere' },
      material: { type: 'basic', wireframe: true },
    })!;
    expect(basic.material).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect((basic.material as THREE.MeshBasicMaterial).wireframe).toBe(true);

    const lambert = createPrimitiveMesh({ geometry: { type: 'cone' }, material: { type: 'lambert' } })!;
    expect(lambert.material).toBeInstanceOf(THREE.MeshLambertMaterial);

    const phong = createPrimitiveMesh({ geometry: { type: 'torus' }, material: { type: 'phong' } })!;
    expect(phong.material).toBeInstanceOf(THREE.MeshPhongMaterial);
  });

  it('rejects unknown geometry types (returned error, no throw)', () => {
    expect(createPrimitiveMesh({ geometry: { type: 'knot' as never } })).toBeUndefined();
    expect(() => createPrimitiveMesh({ geometry: { type: 'knot' as never } })).not.toThrow();
  });

  it('resolvePrimitiveModel discriminates url XOR primitive with dual-source precedence', () => {
    const dual: { url?: string; primitive?: PrimitiveModelConfig } = {
      url: 'm.glb',
      primitive: { geometry: { type: 'box' } },
    };
    expect(resolvePrimitiveModel(dual as never)?.kind).toBe('primitive');
    expect(resolvePrimitiveModel({ url: 'm.glb' } as never)?.kind).toBe('gltf');
    expect(resolvePrimitiveModel({} as never)?.kind).toBe('invalid');
  });
});
