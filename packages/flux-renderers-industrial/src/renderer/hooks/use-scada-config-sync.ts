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
    const bounds = boundsOfNode(node);
    if (bounds === undefined) continue;
    if (out === undefined) {
      out = bounds;
      continue;
    }
    out = unionBounds(out, bounds);
  }
  return out;
}

function unionBounds(a: Bounds, b: Bounds): Bounds {
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxX = Math.max(a.x + a.width, b.x + b.width);
  const maxY = Math.max(a.y + a.height, b.y + b.height);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * 单图元包围盒（plan 2026-08-04-1558-3 Phase 1）：含 `custom.points` 几何族（polygon/line/arrow）
 * 从 points 数组计算 min/max 包围盒；无 width/height 但有 points 时不退化为 0 尺寸。
 * points 坐标相对 node.x/y，绝对包围盒 = node 原点 + points 极值。
 * custom.points 存在时以其为几何源（polygon/line 几何不取 width/height 矩形）。
 */
function boundsOfNode(node: ScadaSymbolNode): Bounds | undefined {
  const pointsBounds = boundsFromCustomPoints(node);
  if (pointsBounds !== undefined) return pointsBounds;
  const width = node.width ?? 0;
  const height = node.height ?? 0;
  // plan 2026-08-04-2242-2 Fix-1：省略 x/y 时默认 0（与 interaction-overlay.ts:43-44 一致），
  // 避免 node.x/node.y 原样透传 undefined → NaN bounds → NaN viewport → 静默空白画布。
  return { x: node.x ?? 0, y: node.y ?? 0, width, height };
}

function boundsFromCustomPoints(node: ScadaSymbolNode): Bounds | undefined {
  const raw = node.custom?.points;
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  if (typeof raw[0] === 'object' && raw[0] !== null) {
    for (const p of raw as Array<{ x?: unknown; y?: unknown }>) {
      if (typeof p.x !== 'number' || typeof p.y !== 'number') return undefined;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  } else {
    const flat = raw as unknown[];
    for (let i = 0; i + 1 < flat.length; i += 2) {
      const px = flat[i];
      const py = flat[i + 1];
      if (typeof px !== 'number' || typeof py !== 'number') return undefined;
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }
  }
  if (!Number.isFinite(minX)) return undefined;
  // plan 2026-08-04-2242-2 Fix-2：省略 x/y 时原点默认 0（undefined + number = NaN 防御）。
  return { x: (node.x ?? 0) + minX, y: (node.y ?? 0) + minY, width: maxX - minX, height: maxY - minY };
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
  reloadBindings: (
    variables: ScadaConfig['variables'],
    symbols: ScadaSymbolNode[],
    options?: { preserveValues?: boolean },
  ) => void;
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
      // SL-4 fix：full/reset 构建失败后强制下次 full 重建（prevRef 置空）——避免树半构建 +
      // 绑定旧导致下次 diff 基于损坏基线。
      prevRef.current = undefined;
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
      // import 为显式全量替换契约（author 意图是换画面）：重置为 init，不保留 props 路径的 live 值
      // （plan 2026-08-04-1558-2 Phase 1 Decision：props full/diff 按保留、import 重置）。
      reload(imported.variables, imported.symbols, { preserveValues: false });
      // import 恒为全量构建：初始视口（props policy 优先，config.viewport 兜底）同样在 reset 期应用
      applyInitialViewportState(currentRuntime, imported, latest.current.viewport);
      // import 恒为全量构建：change 基准守卫天然满足
      built?.();
    } catch (error) {
      pendingSkipRef.current = Math.max(0, pendingSkipRef.current - 1);
      // SL-4 fix：import 全量构建失败同样强制下次 full 重建（prevRef 置空），避免损坏基线。
      prevRef.current = undefined;
      buildError?.(
        'config-build-failed',
        error instanceof Error ? error.message : String(error),
      );
    }
  }, []);

  return { syncImported };
}
