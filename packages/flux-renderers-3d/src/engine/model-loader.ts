import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { ModelConfig } from '../schemas.js';

export interface LoadedModel {
  scene: import('three').Object3D;
  animations: import('three').AnimationClip[];
}

export type GltfLike = { scene: import('three').Object3D; animations: import('three').AnimationClip[] };

export type LoaderFactory = () => { loadAsync(url: string): Promise<GltfLike> };

/**
 * GLTF 加载器（design-renderer.md §6，D5）：
 * three r186 `loadAsync(url, onProgress)` 仅 2 参、无 AbortSignal——取消用 generation-guard：
 * generation 仅由 `cancel()`/场景重建路径 bump，`load()` 只读捕获当代；迟到结果判弃
 * （判弃点尚无 GPU 资源上传，直接丢弃；已注册进场景的资源由 SceneManager dispose 链回收）。
 */
export class ModelLoader {
  private generation = 0;

  /* v8 ignore next */
  constructor(private loaderFactory: LoaderFactory = () => new GLTFLoader()) {}

  async load(config: ModelConfig & { url: string }, onLoaded: (gltf: LoadedModel) => void, onError?: (error: unknown) => void): Promise<void> {
    const gen = this.generation;
    try {
      const gltf = await this.loaderFactory().loadAsync(config.url);
      if (gen !== this.generation) return;
      onLoaded({ scene: gltf.scene, animations: gltf.animations ?? [] });
    } catch (error) {
      if (gen !== this.generation) return;
      onError?.(error);
    }
  }

  cancel(): void {
    this.generation++;
  }
}
