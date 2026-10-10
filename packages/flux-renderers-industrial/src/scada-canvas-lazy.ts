import { createLazyRendererComponent } from '@nop-chaos/flux-react';
import type { ScadaCanvasSchema } from './schemas.js';

/**
 * scada-canvas 统一延迟加载（flux-react `createLazyRendererComponent`）：
 * leafer-ui（经 renderer/engine/symbols 静态链）只进本异步 chunk，宿主注册路径
 * （renderer-definitions / index）禁止静态触达。
 *
 * 内置图元注册（`registerScadaSymbols`，幂等）随 chunk 装载执行——React.lazy resolve
 * 先于组件挂载，引擎构建时符号注册表必然就绪。宿主若需在首次画布挂载前消费符号
 * 注册表（编辑器图元库面板），显式调用 `registerScadaSymbols()`（design-renderer.md §3）。
 */
export async function loadScadaCanvasRenderer() {
  const [renderer] = await Promise.all([
    import('./renderer/scada-canvas.js'),
    import('./symbols/register-builtin.js').then((m) => {
      m.registerScadaSymbols();
    }),
  ]);
  return renderer.ScadaCanvasRenderer;
}

export const LazyScadaCanvasRenderer = createLazyRendererComponent<ScadaCanvasSchema>(
  loadScadaCanvasRenderer,
);
