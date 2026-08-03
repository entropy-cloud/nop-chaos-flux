import { useEffect, useRef } from 'react';
import { diffScadaConfig } from '../../serialization/diff.js';
import type { ScadaConfig, ScadaSymbolNode } from '../../serialization/config-types.js';
import type { ScadaCanvasRuntime } from './use-scada-engine.js';
import type { Bounds } from '../../engine/viewport.js';

export type ScadaSyncStrategy = 'full' | 'diff';

/**
 * config 同步策略判定（Failure Paths `diff-sync-mismatch` 兜底）：
 * 首次/版本变更 → 全量 reset；同版本 → diff 增量。
 */
export function decideSyncStrategy(prev: ScadaConfig | undefined, next: ScadaConfig): ScadaSyncStrategy {
  if (prev === undefined) return 'full';
  if (prev.version !== next.version) return 'full';
  return 'diff';
}

/** 顶层图元包围盒（fit/center 视口命令用；group 子图元坐标相对父组，暂按顶层近似，I11.2 细化）。 */
export function computeSymbolBounds(symbols: ScadaSymbolNode[]): Bounds | undefined {
  let out: Bounds | undefined;
  for (const node of symbols) {
    const width = node.width ?? 0;
    const height = node.height ?? 0;
    const bounds = { x: node.x, y: node.y, width, height };
    if (out === undefined) {
      out = bounds;
      continue;
    }
    const minX = Math.min(out.x, bounds.x);
    const minY = Math.min(out.y, bounds.y);
    const maxX = Math.max(out.x + out.width, bounds.x + bounds.width);
    const maxY = Math.max(out.y + out.height, bounds.y + bounds.height);
    out = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  return out;
}

function applyInitialViewport(
  runtime: ScadaCanvasRuntime,
  config: ScadaConfig,
  policy: { fit?: 'contain' | 'fill'; center?: boolean } | undefined,
): void {
  if (!policy) return;
  const bounds = computeSymbolBounds(config.symbols);
  if (!bounds) return;
  if (policy.fit === 'contain') {
    runtime.engine.fit(bounds, 0);
  } else if (policy.fit === 'fill') {
    const size = runtime.engine.getSize();
    const scale = Math.max(size.width / bounds.width, size.height / bounds.height);
    runtime.engine.setViewport({
      x: size.width / 2 - (bounds.x + bounds.width / 2) * scale,
      y: size.height / 2 - (bounds.y + bounds.height / 2) * scale,
      scale,
    });
  }
  if (policy.center) {
    const size = runtime.engine.getSize();
    const scale = runtime.engine.getViewport().scale;
    runtime.engine.setViewport({
      x: size.width / 2 - (bounds.x + bounds.width / 2) * scale,
      y: size.height / 2 - (bounds.y + bounds.height / 2) * scale,
      scale,
    });
  }
}

export interface UseScadaConfigSyncArgs {
  config: ScadaConfig | undefined;
  runtime: ScadaCanvasRuntime | null;
  reloadBindings: (variables: ScadaConfig['variables'], symbols: ScadaSymbolNode[]) => void;
  viewport?: { fit?: 'contain' | 'fill'; center?: boolean };
  onBuilt?: () => void;
  onBuildError?: (code: string, message: string) => void;
}

/**
 * config props 同步（design-renderer.md §8.3）：parse/validate 由 renderer 完成；
 * 首次/版本变更 → engine.reset 全量构建；同版本 → diffScadaConfig → engine.applyDiff 增量；
 * 点表/绑定变化 → 绑定域重载（reloadBindings）；构建成功 → onBuilt（ready），失败 → onBuildError。
 */
export function useScadaConfigSync(args: UseScadaConfigSyncArgs): void {
  const { config, runtime, reloadBindings, viewport, onBuilt, onBuildError } = args;
  const prevRef = useRef<ScadaConfig | undefined>(undefined);
  const latest = useRef({ viewport, onBuilt, onBuildError });
  useEffect(() => {
    latest.current = { viewport, onBuilt, onBuildError };
  });

  useEffect(() => {
    if (!runtime || !config) return;
    const strategy = decideSyncStrategy(prevRef.current, config);
    try {
      if (strategy === 'full') {
        runtime.engine.reset(config);
        reloadBindings(config.variables, config.symbols);
      } else {
        const diff = diffScadaConfig(prevRef.current as ScadaConfig, config);
        runtime.engine.applyDiff(diff, config);
        if (
          diff.variables !== undefined ||
          diff.added.length > 0 ||
          diff.removed.length > 0 ||
          diff.updated.length > 0
        ) {
          reloadBindings(config.variables, config.symbols);
        }
      }
      applyInitialViewport(runtime, config, latest.current.viewport);
      prevRef.current = config;
      latest.current.onBuilt?.();
    } catch (error) {
      latest.current.onBuildError?.(
        'config-build-failed',
        error instanceof Error ? error.message : String(error),
      );
    }
  }, [config, runtime, reloadBindings]);
}
