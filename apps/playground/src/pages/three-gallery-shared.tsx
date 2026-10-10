import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerThreeRenderers } from '@nop-chaos/flux-renderers-3d';
import type { ExecutableApiRequest, RendererEnv } from '@nop-chaos/flux-core';

/**
 * three-gallery 共享基建（559 Phase 4）：registry/env 单例 + 页面骨架常量。
 * three.js 仅经本懒加载演示页进入浏览器（three-canvas-demo 同法），主 bundle 不加载 three。
 */

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerThreeRenderers(registry);

export const galleryRegistry = registry;
export const GallerySchemaRenderer = createSchemaRenderer();
export const galleryFormulaCompiler = createFormulaCompiler();

export function makeGalleryEnv(): RendererEnv {
  return {
    fetcher: async <T,>(api: ExecutableApiRequest) => {
      console.log('[three-gallery] ajax', api.method ?? 'GET', api.url);
      return { status: 0, data: { ok: true } as T };
    },
    notify: (level, message) => console.log('[three-gallery] notify', level, message),
    navigate: (to) => {
      if (typeof to === 'string') window.location.hash = to;
      else window.history.back();
    },
  };
}

export interface GalleryExampleMeta {
  id: 'primitives' | 'lights' | 'scene-json' | 'gltf' | 'keyframes' | 'twin';
  label: string;
  testid: string;
  description: string;
}

export const GALLERY_EXAMPLES: GalleryExampleMeta[] = [
  { id: 'primitives', label: '图元与材质', testid: 'three-gallery-tab-primitives', description: '8 种图元（含 tube 管道/capsule）+ PBR 材质（metalness/roughness 球格）+ emissive + toneMapping + label 标注' },
  { id: 'lights', label: '灯光与阴影', testid: 'three-gallery-tab-lights', description: '三点布光（directional/point/spot）+ 阴影 + 相机 controls（autoRotate/距离限制）' },
  { id: 'scene-json', label: '原生 three.js JSON', testid: 'three-gallery-tab-scene-json', description: 'three.js SceneJSON 经 ObjectLoader 直载（薄桥接）：绑定按对象 name 寻址驱动吊车臂旋转/吊钩升降' },
  { id: 'gltf', label: 'GLB 加载', testid: 'three-gallery-tab-gltf', description: 'GLTFExporter 现场导出组合场景 → GLB url 喂给第二画布（模型加载全链路，零外部资产）' },
  { id: 'keyframes', label: '关键帧与交互', testid: 'three-gallery-tab-keyframes', description: 'time/state/event 三种触发关键帧 clip + hover 高亮 + 点击事件 + label 标注' },
  { id: 'twin', label: '数字孪生泵站', testid: 'three-gallery-tab-twin', description: 'IndustrialAdapter + 合成 openSocket 标签帧 → flux 绑定 → 泵旋转/罐液位/告警发光/点击详情（数据源端到端打通）' },
];
