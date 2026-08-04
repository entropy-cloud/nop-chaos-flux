import { useCallback, useEffect, useRef } from 'react';
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
    // P1-6 视口公式修正：引擎约定 screen = (world - vx)·s（viewport.ts worldToViewport），
    // 内容包围盒中心映射到视口中心要求 vx = cx - sw/(2s)。fill 分支保留 max-scale 语义
    // （不可委托 engine.fit——fit 是 min-scale/contain 语义，viewport.ts:60），仅 center 可委托。
    const size = runtime.engine.getSize();
    const scale = Math.max(size.width / bounds.width, size.height / bounds.height);
    runtime.engine.setViewport({
      x: bounds.x + bounds.width / 2 - size.width / (2 * scale),
      y: bounds.y + bounds.height / 2 - size.height / (2 * scale),
      scale,
    });
  }
  if (policy.center) {
    // P1-6 center 分支同公式：委托 engine.center(bounds)（viewport.ts:70-78，vx = cx - sw/(2s)），
    // 消除双实现漂移；scale 取当前视口（fill 先跑时即 fill scale，纯 center 时保持 1）。
    runtime.engine.center(bounds);
  }
}

/**
 * 初始视口应用（open-audit P1-A 接线）：props `viewport` policy 为显式首选项；
 * 无 props policy 时 `config.viewport {x,y,scale}` 作为组态默认初始视口应用（full/reset 路径）。
 * 两者都无时保持现状。plan `{3}` Phase 2 修正 `applyInitialViewport` 公式后本路径共用。
 */
function applyInitialViewportState(
  runtime: ScadaCanvasRuntime,
  config: ScadaConfig,
  policy: { fit?: 'contain' | 'fill'; center?: boolean } | undefined,
): void {
  if (policy) {
    applyInitialViewport(runtime, config, policy);
    return;
  }
  if (config.viewport !== undefined) {
    runtime.engine.setViewport({
      x: config.viewport.x,
      y: config.viewport.y,
      scale: config.viewport.scale,
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
 * onBuilt 走 change 基准守卫（plan `{2}` Phase 2 语义）：仅实际执行非空构建（full reset 或非空 diff）
 * 时触发；空 diff 重跑（宿主重传同值新对象身份、reloadBindings → setRuntime 引起的 effect 重跑）不触发。
 */
export function useScadaConfigSync(
  args: UseScadaConfigSyncArgs,
): { syncImported: (config: ScadaConfig) => void } {
  const { config, runtime, reloadBindings, viewport, onBuilt, onBuildError } = args;
  const prevRef = useRef<ScadaConfig | undefined>(undefined);
  const latest = useRef({ viewport, onBuilt, onBuildError, runtime, reloadBindings, config });
  useEffect(() => {
    latest.current = { viewport, onBuilt, onBuildError, runtime, reloadBindings, config };
  });
  // importConfig 汇入 props 同步链（P1-5）：syncImported 后 reloadBindings → setRuntime 会触发
  // effect 重跑（deps [config, runtime, reloadBindings]）；若重跑时用过期 prevRef 对 props config 算
  // diff，非空 diff 会把树刷回 props config——import 变 no-op 闪回。skip-next 标记（计数 + 配置身份
  // 匹配）仅吞掉同一次提交内的 self-induced 重跑；其后 props 变更（config 身份变化）照常从 imported 基线 diff。
  const lastImportBaselineRef = useRef<ScadaConfig | undefined>(undefined);
  const pendingSkipRef = useRef(0);

  useEffect(() => {
    if (!runtime || !config) return;
    if (pendingSkipRef.current > 0 && config === lastImportBaselineRef.current) {
      pendingSkipRef.current -= 1;
      return;
    }
    const strategy = decideSyncStrategy(prevRef.current, config);
    try {
      if (strategy === 'full') {
        runtime.engine.reset(config);
        reloadBindings(config.variables, config.symbols);
        // 初始视口策略只在全量（reset）路径应用：diff 增量重应用会重置用户在画布上的平移/缩放，
        // 且绑定域重建（setRuntime 新对象）触发的 effect 重跑应为 diff 空增量不重复执行（gate-4-review m-B）
        applyInitialViewportState(runtime, config, latest.current.viewport);
        prevRef.current = config;
        latest.current.onBuilt?.();
      } else {
        const diff = diffScadaConfig(prevRef.current as ScadaConfig, config);
        const nonEmpty =
          diff.variables !== undefined ||
          diff.added.length > 0 ||
          diff.removed.length > 0 ||
          diff.updated.length > 0;
        if (nonEmpty) {
          runtime.engine.applyDiff(diff, config);
          reloadBindings(config.variables, config.symbols);
          prevRef.current = config;
          latest.current.onBuilt?.();
        } else {
          // 空 diff 重跑：仅维护基线，不触碰树、不触发 onBuilt
          prevRef.current = config;
        }
      }
    } catch (error) {
      latest.current.onBuildError?.(
        'config-build-failed',
        error instanceof Error ? error.message : String(error),
      );
    }
  }, [config, runtime, reloadBindings]);

  /** importConfig 汇入（I10.2 句柄）：基线统一 + skip-next 防回刷 + change 守卫 onBuilt。 */
  const syncImported = useCallback((imported: ScadaConfig) => {
    const { runtime: currentRuntime, reloadBindings: reload, onBuilt: built, onBuildError: buildError } =
      latest.current;
    if (!currentRuntime) return;
    try {
      lastImportBaselineRef.current = latest.current.config;
      pendingSkipRef.current += 1;
      prevRef.current = imported;
      currentRuntime.engine.reset(imported);
      reload(imported.variables, imported.symbols);
      // import 恒为全量构建：初始视口（props policy 优先，config.viewport 兜底）同样在 reset 期应用
      applyInitialViewportState(currentRuntime, imported, latest.current.viewport);
      // import 恒为全量构建：change 基准守卫天然满足
      built?.();
    } catch (error) {
      pendingSkipRef.current = Math.max(0, pendingSkipRef.current - 1);
      buildError?.(
        'config-build-failed',
        error instanceof Error ? error.message : String(error),
      );
    }
  }, []);

  return { syncImported };
}
