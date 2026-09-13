#!/usr/bin/env node
/**
 * Three.js 场景图 CPU 侧性能基准（threejs-integration I0.1，plan 463）。
 *
 * node 直跑：`node scripts/three-perf/bench-scene-graph.mjs`
 * 机器可读：`node scripts/three-perf/bench-scene-graph.mjs --json`
 *
 * 场景：
 *  (a) geometry-material  几何+材质批量构建与 dispose 吞吐（资源生命周期成本）
 *  (b) property-write     Object3D 属性写入路径（模拟绑定引擎 updateProperty：
 *                         点分路径导航 + Vector3/Euler/Color.set——「状态更新→渲染
 *                         延迟 <16ms」目标的 CPU 段）
 *  (c) scene-assembly     场景+灯光组装成本（schema→scene 解析下限）
 *
 * 基线记录：docs/analysis/threejs-integration-analysis.md §10.3。
 * node 无 GL 上下文，本脚本不覆盖 GPU 渲染帧率（见分析文档 §10.4）。
 */

import * as THREE from 'three';

const MACRO_TIME = 200; // 每场景最少采样时长（ms）
const MACRO_MIN_ITER = 5; // 每场景最少采样轮数

function bench(name, fn) {
  // 预热
  fn(1);
  const batch = 100;
  const samples = [];
  const deadline = performance.now() + MACRO_TIME;
  let iters = 0;
  while (iters < MACRO_MIN_ITER || performance.now() < deadline) {
    const start = performance.now();
    fn(batch);
    samples.push(batch / ((performance.now() - start) / 1000));
    iters++;
  }
  samples.sort((a, b) => a - b);
  const median = samples[Math.floor(samples.length / 2)];
  const mean = samples.reduce((sum, s) => sum + s, 0) / samples.length;
  return {
    name,
    medianOpsPerSec: Math.round(median),
    meanOpsPerSec: Math.round(mean),
    samples: samples.length,
  };
}

function makePathResolver() {
  // 模拟绑定引擎 updateProperty 的点分路径导航：解析一次，写入时复用
  const cache = new Map();
  return (root, path) => {
    let target = cache.get(path);
    if (!target) {
      target = { parts: path.split('.') };
      cache.set(path, target);
    }
    let node = root;
    const { parts } = target;
    for (let i = 0; i < parts.length - 1; i++) node = node[parts[i]];
    return { container: node, leaf: parts[parts.length - 1] };
  };
}

const results = [];

results.push(
  bench('geometry-material: Box+MeshStandardMaterial 构建+dispose', (n) => {
    for (let i = 0; i < n; i++) {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshStandardMaterial({ color: 0x3f7f3f });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.dispose();
      geo.dispose();
      mat.dispose();
    }
  }),
);

results.push(
  bench('geometry-material: Sphere(32,16)+MeshPhong+dispose', (n) => {
    for (let i = 0; i < n; i++) {
      const geo = new THREE.SphereGeometry(1, 32, 16);
      const mat = new THREE.MeshPhongMaterial({ color: '#2060c0' });
      geo.dispose();
      mat.dispose();
      void mat;
    }
  }),
);

{
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
  const resolve = makePathResolver();
  // sink 消费写入值，防止 JIT 死代码消除把基准优化成空转
  const sink = { x: 0, r: 0, c: '' };
  results.push(
    bench('property-write: 位置导航+Vector3.set (position)', (n) => {
      for (let i = 0; i < n; i++) {
        const { container, leaf } = resolve(mesh, 'position');
        container[leaf].set(i % 10, (i * 2) % 10, (i * 3) % 10);
        sink.x += container[leaf].x;
      }
    }),
  );
  results.push(
    bench('property-write: 旋转 Euler.set (rotation, z 必填)', (n) => {
      for (let i = 0; i < n; i++) {
        const { container, leaf } = resolve(mesh, 'rotation');
        container[leaf].set(0, (i % 360) * (Math.PI / 180), 0);
        sink.r = container[leaf].y;
      }
    }),
  );
  results.push(
    bench('property-write: 材质颜色 Color.set hex 串 (material.color)', (n) => {
      for (let i = 0; i < n; i++) {
        const { container, leaf } = resolve(mesh, 'material.color');
        container[leaf].set(`#${(i % 0xffffff).toString(16).padStart(6, '0')}`);
        sink.c = `#${container[leaf].getHexString()}`;
      }
    }),
  );
  results.push(
    bench('property-write: visible 布尔直赋', (n) => {
      let hits = 0;
      for (let i = 0; i < n; i++) {
        mesh.visible = (i & 1) === 0;
        if (mesh.visible) hits++;
      }
      sink.x += hits;
    }),
  );
  void sink;
}

results.push(
  bench('scene-assembly: Scene+fog+5 灯+10 网格+清理', (n) => {
    for (let i = 0; i < n; i++) {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#101820');
      scene.fog = new THREE.Fog('#101820', 10, 100);
      scene.add(new THREE.AmbientLight('#ffffff', 0.4));
      const dir = new THREE.DirectionalLight('#ffffff', 0.8);
      dir.position.set(5, 5, 5);
      dir.castShadow = true;
      scene.add(dir);
      scene.add(new THREE.HemisphereLight('#ffffff', '#404040', 0.5));
      scene.add(new THREE.PointLight('#ffcc88', 0.6, 50));
      const spot = new THREE.SpotLight('#ffffff', 0.7, 100, Math.PI / 6, 0.4);
      spot.position.set(0, 10, 0);
      scene.add(spot);
      for (let m = 0; m < 10; m++) {
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshStandardMaterial({ color: `#${(m * 111935).toString(16).padStart(6, '0')}` });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(m, 0, 0);
        scene.add(mesh);
      }
      scene.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          child.material.dispose();
        }
      });
    }
  }),
);

const isJson = process.argv.includes('--json');
if (isJson) {
  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        threeVersion: THREE.REVISION,
        node: process.version,
        unit: 'ops/sec (median of samples, batch-normalized)',
        results,
      },
      null,
      2,
    ),
  );
} else {
  console.log(`three r${THREE.REVISION} / node ${process.version} / ${MACRO_TIME}ms per scenario\n`);
  console.log('scenario'.padEnd(62) + 'median ops/s');
  console.log('-'.repeat(78));
  for (const r of results) {
    console.log(r.name.padEnd(62) + String(r.medianOpsPerSec));
  }
}
