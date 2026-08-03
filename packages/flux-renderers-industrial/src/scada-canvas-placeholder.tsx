import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import type { ScadaCanvasSchema } from './schemas.js';

/**
 * `scada-canvas` 空壳占位渲染（I4.2）：仅建立根容器 DOM 契约
 * （`nop-scada-canvas` marker + `data-slot="scada-canvas"`，design-renderer.md §10），
 * 引擎/场景构建属 I5，完整桥接组件 I10.1 落地后替换本占位。
 */
export function ScadaCanvasPlaceholder(props: RendererComponentProps<ScadaCanvasSchema>) {
  return (
    <div
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="scada-canvas"
      className={cn('nop-scada-canvas h-full w-full', props.meta.className)}
    />
  );
}
