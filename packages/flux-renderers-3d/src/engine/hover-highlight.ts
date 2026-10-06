import * as THREE from 'three';
import {
  HOVER_BASIC_LIFT,
  hoverEmissiveColor,
  hoverIntensity,
} from './three-defaults.js';

/**
 * Hover highlight (plan 473 V3-F1; plan 533 D1 configurable + basic-material
 * feedback channel).
 *
 * Two channels, both tracked per instance (shared materials restore exactly
 * once) and reverted on leave/unload/dispose:
 * - `emissive` boost for materials with an emissive channel (MeshStandard
 *   family) — color/intensity configurable via `SceneManagerOptions.hoverHighlight`.
 * - white-lift for `MeshBasicMaterial` (no emissive): color lerped toward
 *   white by HOVER_BASIC_LIFT. Enabled by default — feedback decoupled from
 *   material type (plan 533, roadmap「默认与材质解耦」交付形态).
 */

interface HighlightOriginal {
  emissive?: THREE.Color;
  emissiveIntensity?: number;
  color?: THREE.Color;
}

const WHITE = new THREE.Color(0xffffff);

export interface HoverHighlightOptions {
  emissive?: string;
  intensity?: number;
}

export class HoverHighlighter {
  private readonly emissiveColor: THREE.Color;
  private readonly intensity: number;
  private originals = new Map<THREE.Material, HighlightOriginal>();
  private activeRoot: THREE.Object3D | null = null;

  constructor(options?: HoverHighlightOptions) {
    this.emissiveColor = hoverEmissiveColor(options);
    this.intensity = hoverIntensity(options);
  }

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
        if (standard && standard.emissive && typeof standard.emissiveIntensity === 'number') {
          if (this.originals.has(material)) continue;
          this.originals.set(material, {
            emissive: standard.emissive.clone(),
            emissiveIntensity: standard.emissiveIntensity,
          });
          standard.emissive.copy(this.emissiveColor);
          standard.emissiveIntensity = this.intensity;
          continue;
        }
        // MeshBasicMaterial 白提亮通道（默认启用，plan 533）：无 emissive 亦有悬停反馈。
        const basic = material as THREE.MeshBasicMaterial;
        if (!basic || !basic.color || this.originals.has(material)) continue;
        this.originals.set(material, { color: basic.color.clone() });
        basic.color.lerp(WHITE, HOVER_BASIC_LIFT);
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
      if (original.emissive && original.emissiveIntensity !== undefined) {
        standard.emissive.copy(original.emissive);
        standard.emissiveIntensity = original.emissiveIntensity;
      }
      if (original.color) {
        (material as THREE.MeshBasicMaterial).color.copy(original.color);
      }
    }
    this.originals.clear();
    this.activeRoot = null;
  }
}
