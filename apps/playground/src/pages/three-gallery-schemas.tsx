import * as THREE from 'three';
import type { ThreeCanvasSchema } from '@nop-chaos/flux-renderers-3d';

/**
 * three-gallery 六示例 schema（559 Phase 4）。
 * 薄桥接取向：能用 three 原生能力（SceneJSON/ObjectLoader、GLTF 导出、关键帧 clip）不造自定义层；
 * flux 侧只做「数据 → 命名对象属性」注入与事件回传。
 */

const ENV_DARK = { background: '#101826', toneMapping: 'aces' as const };

export function buildPrimitivesSchema(): ThreeCanvasSchema {
  // metalness × roughness 球格（PBR 材质扫描）
  const models: Record<string, unknown>[] = [];
  const metalness = [0, 0.35, 0.7, 1];
  const roughness = [0.05, 0.35, 0.75];
  metalness.forEach((m, mi) => {
    roughness.forEach((r, ri) => {
      models.push({
        id: `pbr-m${mi}-r${ri}`,
        primitive: {
          geometry: { type: 'sphere', args: { radius: 0.45 } },
          material: { type: 'standard', color: '#9fc3ff', metalness: m, roughness: r },
        },
        position: [ri * 1.2 - 1.2, 1.2 - mi * 0.9, 0],
      });
    });
  });
  models.push(
    {
      id: 'tube-run',
      primitive: {
        geometry: {
          type: 'tube',
          path: [[-2.6, -1.9, -0.8], [-1, -1.6, 0], [0.4, -2.1, 0.8], [2, -1.7, 0.2], [2.8, -1.9, -0.6]],
          args: { radius: 0.14, tubularSegments: 64 },
        },
        material: { type: 'standard', color: '#3f7b5a', metalness: 0.6, roughness: 0.35 },
      },
    },
    {
      id: 'capsule-1',
      primitive: {
        geometry: { type: 'capsule', args: { radius: 0.3, length: 0.9 } },
        material: { type: 'standard', color: '#ffb86b', metalness: 0.2, roughness: 0.5 },
      },
      position: [0, -1.7, 1.8],
      label: 'capsule 新图元',
      labelOffset: [0, 0.9, 0],
    },
    {
      id: 'glow-core',
      primitive: {
        geometry: { type: 'torus', args: { radius: 1.5, tube: 0.06 } },
        material: { type: 'standard', color: '#222833', emissive: '#2dd4bf', emissiveIntensity: 1.6 },
      },
      position: [0, 0.2, 0],
      rotation: [Math.PI / 2.4, 0, 0],
    },
  );
  return {
    type: 'three-canvas',
    testid: 'three-gallery-canvas-primitives',
    height: '460px',
    scene: {
      camera: { position: [4.4, 2.4, 6], fov: 50 },
      environment: ENV_DARK,
      lights: [
        { type: 'ambient', intensity: 0.55 },
        { type: 'directional', position: [5, 8, 4], intensity: 1.5, castShadow: true },
      ],
      models: models as never,
    },
  };
}

export function buildLightsSchema(): ThreeCanvasSchema {
  return {
    type: 'three-canvas',
    testid: 'three-gallery-canvas-lights',
    height: '460px',
    scene: {
      camera: { position: [6, 4, 7], fov: 50, controls: { autoRotate: true, autoRotateSpeed: 1.2, minDistance: 4, maxDistance: 14, maxPolarAngle: 1.45 } },
      environment: { background: '#0d1420' },
      lights: [
        { type: 'ambient', intensity: 0.25 },
        { type: 'directional', position: [6, 9, 4], intensity: 1.6, castShadow: true },
        { type: 'point', position: [-4, 3, -3], intensity: 40, color: '#ff8f6b' },
        { type: 'spot', position: [0, 7, 0], intensity: 120, color: '#7ea6ff', castShadow: true },
      ],
      models: [
        { id: 'floor', primitive: { geometry: { type: 'plane', args: { width: 12, height: 12 } }, material: { type: 'standard', color: '#1b2740', roughness: 0.9 } }, rotation: [-Math.PI / 2, 0, 0], receiveShadow: true },
        { id: 'pillar', primitive: { geometry: { type: 'cylinder', args: { radius: 0.35, height: 2.2 } }, material: { type: 'standard', color: '#cfd8dc', metalness: 0.4, roughness: 0.4 } }, position: [-1.6, 1.1, 0.4], castShadow: true },
        { id: 'block', primitive: { geometry: { type: 'box', args: { width: 1.4, height: 1.4, depth: 1.4 } }, material: { type: 'standard', color: '#42a5f5', metalness: 0.3, roughness: 0.35 } }, position: [1.4, 0.7, -0.6], castShadow: true, label: 'spot + directional 双阴影' },
        { id: 'ball', primitive: { geometry: { type: 'sphere', args: { radius: 0.55 } }, material: { type: 'standard', color: '#ffd54f', metalness: 0.75, roughness: 0.25 } }, position: [0.6, 0.55, 1.6], castShadow: true },
      ],
    },
  };
}

/**
 * 原生 three.js SceneJSON 示例（薄桥接主路径）：用 three 构建一台门式吊车（命名对象），
 * toJSON 导出 SceneJSON → 渲染器经 ObjectLoader 直载；绑定按 name 寻址
 * （crane-arm 旋转 / crane-hook 升降 / 状态灯 emissive）。
 */
export function buildCraneSceneJson(): Record<string, unknown> {
  const make = (name: string, geometry: THREE.BufferGeometry, color: string, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.4 }));
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    return mesh;
  };
  const group = new THREE.Group();
  group.name = 'crane-root';
  group.add(
    make('crane-rail', new THREE.BoxGeometry(7, 0.2, 1.2), '#37474f', 0, 0.1, 0),
    make('crane-leg-a', new THREE.BoxGeometry(0.3, 2.6, 0.3), '#90a4ae', -2.6, 1.5, 0),
    make('crane-leg-b', new THREE.BoxGeometry(0.3, 2.6, 0.3), '#90a4ae', 2.6, 1.5, 0),
    make('crane-beam', new THREE.BoxGeometry(6, 0.3, 0.5), '#ffb300', 0, 2.9, 0),
    make('crane-trolley', new THREE.BoxGeometry(0.5, 0.35, 0.6), '#26a69a', 0, 2.6, 0),
    make('crane-hook', new THREE.ConeGeometry(0.18, 0.4, 12), '#e8443a', 0, 1.7, 0),
    make('crane-status-light', new THREE.SphereGeometry(0.14, 16, 12), '#1b2740', 2.2, 3.25, 0),
  );
  // 旋转臂挂点：trolley 下挂梁（绑定驱动 rotation.z 摆动）
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.12), new THREE.MeshStandardMaterial({ color: '#42a5f5', metalness: 0.6, roughness: 0.3 }));
  arm.name = 'crane-arm';
  arm.position.set(0, 1.9, 0);
  group.add(arm);
  return group.toJSON() as unknown as Record<string, unknown>;
}

export function buildSceneJsonSchema(sceneJson: Record<string, unknown>): ThreeCanvasSchema {
  return {
    type: 'three-canvas',
    testid: 'three-gallery-canvas-scene-json',
    height: '460px',
    scene: {
      json: sceneJson,
      interactiveObjects: ['crane-trolley', 'crane-hook', 'crane-beam'],
      camera: { position: [5.5, 3.6, 6.5], fov: 50 },
      environment: ENV_DARK,
      lights: [
        { type: 'ambient', intensity: 0.5 },
        { type: 'directional', position: [5, 8, 4], intensity: 1.4, castShadow: true },
      ],
    } as never,
    bindings: [
      { id: 'arm-swing', target: { modelId: 'crane-arm', path: 'rotation.z', type: 'rotation' }, source: { expression: '${armSwing}' } },
      { id: 'hook-lift', target: { modelId: 'crane-hook', path: 'position.y', type: 'position' }, source: { expression: '${hookLift}' } },
      { id: 'status-glow', target: { modelId: 'crane-status-light', path: 'material.emissive', type: 'material' }, source: { expression: '${glowColor}' } },
    ] as never,
  };
}

/** GLB round-trip 源场景：小型 ABB 式机械臂组合体（导出 → 第二画布经 url 加载）。 */
export function buildRobotExportGroup(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'robot-arm';
  const metal = (color: string) => new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.3 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.4, 24), metal('#37474f'));
  base.name = 'robot-base';
  base.position.y = 0.2;
  const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.4, 20), metal('#ffb300'));
  shoulder.name = 'robot-shoulder';
  shoulder.position.set(0, 1, 0);
  shoulder.rotation.z = 0.4;
  const elbow = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1, 20), metal('#42a5f5'));
  elbow.name = 'robot-elbow';
  elbow.position.set(0.55, 1.9, 0);
  elbow.rotation.z = -0.9;
  const wrist = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), metal('#26a69a'));
  wrist.name = 'robot-wrist';
  wrist.position.set(0.95, 2.35, 0);
  group.add(base, shoulder, elbow, wrist);
  group.traverse((child) => {
    child.castShadow = true;
  });
  return group;
}

export function buildRobotSourceSchema(): ThreeCanvasSchema {
  return {
    type: 'three-canvas',
    testid: 'three-gallery-canvas-gltf-source',
    height: '440px',
    scene: {
      camera: { position: [4, 3, 5], fov: 50, controls: { minDistance: 2.5, maxDistance: 12 } },
      environment: ENV_DARK,
      lights: [
        { type: 'ambient', intensity: 0.55 },
        { type: 'directional', position: [4, 6, 4], intensity: 1.4 },
      ],
      models: [
        { id: 'floor', primitive: { geometry: { type: 'cylinder', args: { radius: 2.2, height: 0.1 } }, material: { type: 'standard', color: '#1b2740', roughness: 0.85 } }, position: [0, -0.05, 0] },
        { id: 'robot', primitive: { geometry: { type: 'cylinder', args: { radius: 0.5, height: 0.4 } }, material: { type: 'standard', color: '#37474f', metalness: 0.7, roughness: 0.3 } }, position: [0, 0.2, 0], label: '导出源场景（primitives 组合）' },
        { id: 'joint', primitive: { geometry: { type: 'capsule', args: { radius: 0.2, length: 1.2 } }, material: { type: 'standard', color: '#ffb300', metalness: 0.7, roughness: 0.3 } }, position: [0.5, 1.5, 0], rotation: [0, 0, 0.4] },
        { id: 'fore', primitive: { geometry: { type: 'capsule', args: { radius: 0.14, length: 0.9 } }, material: { type: 'standard', color: '#42a5f5', metalness: 0.7, roughness: 0.3 } }, position: [1, 2.1, 0], rotation: [0, 0, -0.9] },
        { id: 'wrist', primitive: { geometry: { type: 'sphere', args: { radius: 0.18 } }, material: { type: 'standard', color: '#26a69a', metalness: 0.7, roughness: 0.3 } }, position: [1.25, 2.5, 0] },
      ],
    },
  };
}

export function buildGltfLoadedSchema(glbUrl: string): ThreeCanvasSchema {
  return {
    type: 'three-canvas',
    testid: 'three-gallery-canvas-gltf-loaded',
    height: '440px',
    scene: {
      camera: { position: [3.6, 2.6, 4.4], fov: 50, controls: { autoRotate: true, autoRotateSpeed: 1.6, minDistance: 2, maxDistance: 10 } },
      environment: ENV_DARK,
      lights: [
        { type: 'ambient', intensity: 0.55 },
        { type: 'directional', position: [4, 6, 4], intensity: 1.4 },
      ],
      models: [{ id: 'robot-glb', url: glbUrl, label: 'GLTFExporter 导出 → url 加载' }],
    },
  };
}

export function buildInteractionsSchema(): ThreeCanvasSchema {
  return {
    type: 'three-canvas',
    testid: 'three-gallery-canvas-keyframes',
    height: '460px',
    scene: {
      camera: { position: [4.5, 3, 5.5], fov: 50 },
      environment: ENV_DARK,
      lights: [
        { type: 'ambient', intensity: 0.5 },
        { type: 'directional', position: [4, 7, 4], intensity: 1.4, castShadow: true },
      ],
      models: [
        { id: 'floor', primitive: { geometry: { type: 'plane', args: { width: 10, height: 10 } }, material: { type: 'standard', color: '#141f33', roughness: 0.9 } }, rotation: [-Math.PI / 2, 0, 0], receiveShadow: true },
        { id: 'spinner', primitive: { geometry: { type: 'torus', args: { radius: 0.7, tube: 0.14 } }, material: { type: 'standard', color: '#7ea6ff', metalness: 0.5, roughness: 0.3 } }, position: [-1.6, 1.2, 0], castShadow: true, label: '数据驱动自旋' },
        { id: 'bobber', primitive: { geometry: { type: 'sphere', args: { radius: 0.5 } }, material: { type: 'standard', color: '#26a69a' } }, position: [0.4, 1, 0], castShadow: true, label: '热度变色 + 点击事件', interactive: true },
        { id: 'spinner-inner', primitive: { geometry: { type: 'torus', args: { radius: 0.42, tube: 0.1 } }, material: { type: 'standard', color: '#ffb86b', emissive: '#ff8f6b', emissiveIntensity: 0.6 } }, position: [-1.6, 1.2, 0] },
      ],
    },
    bindings: [
      { id: 'spinner-spin', target: { modelId: 'spinner', path: 'rotation.y', type: 'rotation' }, source: { expression: '${spin}' } },
      { id: 'bob-color', target: { modelId: 'bobber', path: 'material.color', type: 'material' }, source: { expression: '${heatColor}' } },
      { id: 'bob-scale', target: { modelId: 'bobber', path: 'scale.y', type: 'scale' }, source: { expression: '${heat}' }, transform: { range: { input: [0, 100], output: [0.8, 1.25] } } } as never,
    ] as never,
    events: {
      onObjectClick: { action: 'showToast', args: { message: '点击设备：详情走事件桥接（hover 高亮同步生效）' } },
    },
  };
}

/** 数字孪生泵站场景（ IndustrialAdapter 标签帧 → flux 绑定驱动）。 */
export function buildTwinSchema(): ThreeCanvasSchema {
  return {
    type: 'three-canvas',
    testid: 'three-gallery-canvas-twin',
    height: '460px',
    scene: {
      camera: { position: [7.5, 5, 8], fov: 48, controls: { minDistance: 4, maxDistance: 18, maxPolarAngle: 1.5 } },
      environment: { background: '#0c1322', fog: { color: '#0c1322', near: 14, far: 30 }, toneMapping: 'aces' },
      lights: [
        { type: 'ambient', intensity: 0.45 },
        { type: 'directional', position: [7, 10, 5], intensity: 1.5, castShadow: true },
        { type: 'point', position: [-5, 3, -4], intensity: 30, color: '#2dd4bf' },
      ],
      models: [
        { id: 'floor', primitive: { geometry: { type: 'plane', args: { width: 18, height: 14 } }, material: { type: 'standard', color: '#141f33', roughness: 0.92 } }, rotation: [-Math.PI / 2, 0, 0], receiveShadow: true },
        { id: 'tank-a', primitive: { geometry: { type: 'cylinder', args: { radius: 0.9, height: 2.4 } }, material: { type: 'standard', color: '#4a6fa5', metalness: 0.35, roughness: 0.45 } }, position: [-3.4, 1.2, -1.6], castShadow: true, label: '清水罐 T-01' },
        { id: 'tank-a-core', primitive: { geometry: { type: 'cylinder', args: { radius: 0.78, height: 2.2 } }, material: { type: 'standard', color: '#2dd4bf', emissive: '#0e7fd6', emissiveIntensity: 0.35 } }, position: [-3.4, 1.2, -1.6] },
        { id: 'tank-b', primitive: { geometry: { type: 'cylinder', args: { radius: 0.9, height: 2.4 } }, material: { type: 'standard', color: '#4a6fa5', metalness: 0.35, roughness: 0.45 } }, position: [3.4, 1.2, -1.6], castShadow: true, label: '清水罐 T-02' },
        { id: 'tank-b-core', primitive: { geometry: { type: 'cylinder', args: { radius: 0.78, height: 2.2 } }, material: { type: 'standard', color: '#2dd4bf', emissive: '#0e7fd6', emissiveIntensity: 0.35 } }, position: [3.4, 1.2, -1.6] },
        { id: 'pump-a-base', primitive: { geometry: { type: 'box', args: { width: 1.2, height: 0.3, depth: 0.8 } }, material: { type: 'standard', color: '#37474f' } }, position: [-1.2, 0.15, 1.4], castShadow: true },
        { id: 'pump-a', primitive: { geometry: { type: 'cylinder', args: { radius: 0.42, height: 0.8 } }, material: { type: 'standard', color: '#26a69a', metalness: 0.6, roughness: 0.3 } }, position: [-1.2, 0.85, 1.4], castShadow: true, interactive: true, label: '供水泵 P-101A' },
        { id: 'pump-a-rotor', primitive: { geometry: { type: 'box', args: { width: 0.9, height: 0.1, depth: 0.16 } }, material: { type: 'standard', color: '#ffb300', metalness: 0.7, roughness: 0.3 } }, position: [-1.2, 1.34, 1.4], interactive: true },
        { id: 'pump-b-base', primitive: { geometry: { type: 'box', args: { width: 1.2, height: 0.3, depth: 0.8 } }, material: { type: 'standard', color: '#37474f' } }, position: [1.4, 0.15, 1.4], castShadow: true },
        { id: 'pump-b', primitive: { geometry: { type: 'cylinder', args: { radius: 0.42, height: 0.8 } }, material: { type: 'standard', color: '#90a4ae', metalness: 0.6, roughness: 0.3 } }, position: [1.4, 0.85, 1.4], castShadow: true, interactive: true, label: '供水泵 P-101B（备用）' },
        { id: 'pump-b-rotor', primitive: { geometry: { type: 'box', args: { width: 0.9, height: 0.1, depth: 0.16 } }, material: { type: 'standard', color: '#607d8b' } }, position: [1.4, 1.34, 1.4] },
        {
          id: 'pipe-run-a',
          primitive: {
            geometry: {
              type: 'tube',
              path: [[-1.2, 1.5, 1.4], [-1.2, 2.4, 1.2], [-2.2, 2.9, 0.2], [-3.4, 2.6, -1], [-3.4, 2.4, -1.6]],
              args: { radius: 0.12 },
            },
            material: { type: 'standard', color: '#3f7b5a', metalness: 0.55, roughness: 0.35 },
          },
        },
        {
          id: 'pipe-run-b',
          primitive: {
            geometry: {
              type: 'tube',
              path: [[1.4, 1.5, 1.4], [1.4, 2.4, 1.2], [2.4, 2.9, 0.2], [3.4, 2.6, -1], [3.4, 2.4, -1.6]],
              args: { radius: 0.12 },
            },
            material: { type: 'standard', color: '#546e7a', metalness: 0.55, roughness: 0.35 },
          },
        },
        { id: 'beacon', primitive: { geometry: { type: 'sphere', args: { radius: 0.22 } }, material: { type: 'standard', color: '#1b2740', emissive: '#e53935', emissiveIntensity: 0 } }, position: [0, 3.4, 0], label: '报警信标' },
        { id: 'beacon-pole', primitive: { geometry: { type: 'cylinder', args: { radius: 0.05, height: 0.8 } }, material: { type: 'standard', color: '#37474f' } }, position: [0, 2.9, 0] },
      ],
    },
    bindings: [
      // 泵 A 运行：rotor 转速随 running 布尔帧
      { id: 'pump-a-spin', target: { modelId: 'pump-a-rotor', path: 'rotation.y', type: 'rotation' }, source: { expression: '${tagCount}' }, transform: { range: { input: [0, 100], output: [0, Math.PI * 2] } } } as never,
      { id: 'pump-b-spin', target: { modelId: 'pump-b-rotor', path: 'rotation.y', type: 'rotation' }, source: { expression: '${tagRunning}' }, transform: { range: { input: [0, 1], output: [0, 0.4] } } } as never,
      // 罐液位：core 高度 + 位置随液位帧（0.4..2.2）
      { id: 'tank-a-level', target: { modelId: 'tank-a-core', path: 'scale.y', type: 'scale' }, source: { expression: '${tagTemp}' }, transform: { range: { input: [0, 100], output: [0.15, 1] } } } as never,
      { id: 'tank-b-level', target: { modelId: 'tank-b-core', path: 'scale.y', type: 'scale' }, source: { expression: '${tagCount}' }, transform: { range: { input: [0, 100], output: [0.15, 1] } } } as never,
      // 报警信标：temp > 80 → 高强度红光（convert 表达式注入 value）
      { id: 'beacon-alarm', target: { modelId: 'beacon', path: 'material.emissiveIntensity', type: 'material' }, source: { expression: '${tagTemp}' }, transform: { convert: 'value > 80 ? 2.2 : 0.05' } } as never,
      { id: 'pump-a-color', target: { modelId: 'pump-a', path: 'material.color', type: 'material' }, source: { expression: '${pumpColor}' } } as never,
    ] as never,
    events: {
      onObjectClick: { action: 'showToast', args: { message: '点击设备查看运行参数（标签面板为实时帧值）' } },
    },
  };
}
