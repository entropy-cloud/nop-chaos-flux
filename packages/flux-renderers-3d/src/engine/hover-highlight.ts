import * as THREE from 'three';

/**
 * Hover emissive highlight (plan 473, visual-quality V3-F1).
 *
 * Boosts `emissive` on the hovered model's meshes and restores the original
 * values on leave/unload/dispose. Materials are tracked per instance so
 * shared materials restore exactly once. `MeshBasicMaterial` (no emissive)
 * is skipped — hover events still fire, only the visual boost is absent.
 */

interface HighlightOriginal {
  emissive: THREE.Color;
  emissiveIntensity: number;
}

const HIGHLIGHT_EMISSIVE = new THREE.Color(0x2b4c7e);
const HIGHLIGHT_INTENSITY = 0.9;

export class HoverHighlighter {
  private originals = new Map<THREE.Material, HighlightOriginal>();
  private activeRoot: THREE.Object3D | null = null;

  apply(root: THREE.Object3D): void {
    if (this.activeRoot === root) return;
    this.revert();
    this.activeRoot = root;
    root.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        const standard = material as THREE.MeshStandardMaterial;
        if (!standard || !standard.emissive || typeof standard.emissiveIntensity !== 'number') continue;
        if (this.originals.has(standard)) continue;
        this.originals.set(standard, {
          emissive: standard.emissive.clone(),
          emissiveIntensity: standard.emissiveIntensity,
        });
        standard.emissive.copy(HIGHLIGHT_EMISSIVE);
        standard.emissiveIntensity = HIGHLIGHT_INTENSITY;
      }
    });
  }

  revert(): void {
    if (this.originals.size === 0) {
      this.activeRoot = null;
      return;
    }
    for (const [material, original] of this.originals) {
      const standard = material as THREE.MeshStandardMaterial;
      standard.emissive.copy(original.emissive);
      standard.emissiveIntensity = original.emissiveIntensity;
    }
    this.originals.clear();
    this.activeRoot = null;
  }
}
