import { useCallback, useEffect, useRef } from 'react';
import { diffScadaConfig } from '../../serialization/diff.js';
import type { ScadaConfig, ScadaSymbolNode } from '../../serialization/config-types.js';
import { getScadaSymbolDefinition } from '../../symbols/symbol-registry.js';
import type { ScadaCanvasRuntime } from './use-scada-engine.js';
import type { Bounds } from '../../engine/viewport.js';
import { clampScale } from '../../engine/viewport.js';

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
 * 单图元包围盒（plan 2026-08-04-1558-3 Phase 1 + 2026-08-04-2243-2 D1）：含 `custom.points` 几何族
 * （polygon/line/arrow）从 points 数组计算 min/max 包围盒；无显式 `custom.points` 时 consult
 * 符号定义 `defaultGeometryPoints`（polygon DEFAULT_TRIANGLE、line/arrow 由 width/height 派生），
 * 不退化为 0 尺寸冲到 MAX_SCALE。无 points 几何族时回退 width/height 矩形。
 * points 坐标相对 node.x/y，绝对包围盒 = node 原点 + points 极值。
 */
function boundsOfNode(node: ScadaSymbolNode): Bounds | undefined {
  const explicitPoints = node.custom?.points;
  if (Array.isArray(explicitPoints) && explicitPoints.length > 0) {
    const pointsBounds = boundsFromPoints(node, explicitPoints);
    if (pointsBounds !== undefined) return pointsBounds;
  } else {
    // plan 2026-08-04-2243-2 D1：无显式 custom.points 时 consult 符号定义默认几何
    // （polygon/line/arrow 的 defaultGeometryPoints），使默认几何族 fit/center 不退化。
    const definition = getScadaSymbolDefinition(node.type);
    const defaultPoints = definition?.defaultGeometryPoints?.(node);
    if (Array.isArray(defaultPoints) && defaultPoints.length > 0) {
      const defBounds = boundsFromPoints(node, defaultPoints);
      if (defBounds !== undefined) return defBounds;
    }
  }
  const width = node.width ?? 0;
  const height = node.height ?? 0;
  // plan 2026-08-04-2242-2 Fix-1：省略 x/y 时默认 0（与 interaction-overlay.ts:43-44 一致），
  // 避免 node.x/node.y 原样透传 undefined → NaN bounds → NaN viewport → 静默空白画布。
  return { x: node.x ?? 0, y: node.y ?? 0, width, height };
}

function boundsFromPoints(node: ScadaSymbolNode, raw: unknown[]): Bounds | undefined {
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
  applyViewportPolicy(runtime, bounds, policy);
}

/**
 * 应用声明的 viewport fit/center policy（plan 2026-08-08-1809-3 Phase 3 / P1-5）。
 *
 * 从 `applyInitialViewport` 抽出 bounds→viewport 的核心数学（fit contain/fill + center），
 * 使 mount 期（applyInitialViewportState）与 resize 期（refitViewportOnResize）共用同一实现，
 * 消除双实现漂移（plan 裁定：复用 applyInitialViewport）。无 policy 时调用方应短路（本函数仍兜底 return）。
 */
function applyViewportPolicy(
  runtime: ScadaCanvasRuntime,
  bounds: Bounds,
  policy: { fit?: 'contain' | 'fill'; center?: boolean },
): void {
  if (policy.fit === 'contain') {
    runtime.engine.fit(bounds, 0);
  } else if (policy.fit === 'fill') {
    // P1-6 视口公式修正：引擎约定 screen = (world - vx)·s（viewport.ts worldToViewport），
    // 内容包围盒中心映射到视口中心要求 vx = cx - sw/(2s)。fill 分支保留 max-scale 语义
    // （不可委托 engine.fit——fit 是 min-scale/contain 语义，viewport.ts:60），仅 center 可委托。
    // P2-5 clamp-before-center（plan 2026-08-05-1253-1 Phase 1）：scale 先 clampScale 再算居中 x/y，
    // 与 contain 分支（viewport.ts:67 fit 已 clampScale）对齐。极端 bounds（rawScale 越界 [0.1,20]）
    // 时若用未钳 scale 算居中、引擎 setViewport 才钳 scale → x/y 按未钳 scale、实际 scale 被钳 → 内容漂移。
    const size = runtime.engine.getSize();
    // P2-7 零尺寸方向兜底（plan 2026-08-06-0900-3 Phase 1）：补 1e-6 width/height floor，
    // 与 contain/fit 分支（viewport.ts:65-67 有 floor）方向一致——零尺寸内容 size/0=Infinity →
    // clampScale(Infinity)=MIN_SCALE（zoom OUT，与 contain 反向）；floor 后 size/1e-6=huge →
    // clampScale(huge)=MAX_SCALE（zoom IN，与 contain 一致）。
    const scale = clampScale(
      Math.max(size.width / Math.max(1e-6, bounds.width), size.height / Math.max(1e-6, bounds.height)),
    );
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
 * 计算 / 应用 viewport policy 的公共入口（plan 2026-08-08-1809-3 Phase 3 / P1-5 resize refit 消费）。
 *
 * 由 use-scada-engine 的 ResizeObserver handler 经 runtime.refitViewportOnResize 回调消费：
 * 收到 material resize 后用最新 config + 声明 policy 重算 fit，复用本模块 bounds/policy 数学，
 * 不在 use-scada-engine 重写第二份（避免双实现漂移）。无 policy / 无 bounds 时为 no-op。
 */
export function applyScadaViewportPolicy(
  runtime: ScadaCanvasRuntime,
  config: ScadaConfig,
  policy: { fit?: 'contain' | 'fill'; center?: boolean } | undefined,
): void {
  if (!policy) return;
  const bounds = computeSymbolBounds(config.symbols);
  if (!bounds) return;
  applyViewportPolicy(runtime, bounds, policy);
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
  /**
   * resize refit 注册器（plan 2026-08-08-1809-3 Phase 3 / P1-5）：由 use-scada-engine 提供的稳定 setter，
   * 本 hook 在 runtime 可用时把 refit 闭包经此 setter 注册（不 mutate 任何传入 ref，react-compiler 友好）。
   * use-scada-engine 的 ResizeObserver handler 经 runtime.refitViewportOnResize 调用注册的闭包。
   */
  setResizeRefit?: (fn: (() => void) | undefined) => void;
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
  const { config, runtime, reloadBindings, viewport, onBuilt, onBuildError, setResizeRefit } = args;
  const prevRef = useRef<ScadaConfig | undefined>(undefined);
  const latest = useRef({ viewport, onBuilt, onBuildError, runtime, reloadBindings, config });
  useEffect(() => {
    latest.current = { viewport, onBuilt, onBuildError, runtime, reloadBindings, config };
  });
  // importConfig 汇入 props 同步链（P1-5）：syncImported 后 reloadBindings → setRuntime 会触发
  // effect 重跑（deps [config, runtime, reloadBindings]）；若重跑时用过期 prevRef 对 props config 算
  // diff，非空 diff 会把树刷回 props config——import 变 no-op 闪回。skip-next 标记（per-import nonce
  // + 配置身份匹配）仅吞掉同一次提交内的 self-induced 重跑；其后 props 变更（config 身份变化）照常从
  // imported 基线 diff。
  // plan 2026-08-04-2243-1 Phase 2 L4：pendingSkip 计数器改 per-import nonce——
  // import 时生成 nonce 并标记 skip，effect 首次运行即消费该 nonce（不论是否真正 skip），消除
  // 「identity 不匹配时不递减 → 计数器残留 → 后续 host 新身份巧合匹配 baseline 误 skip」泄漏。
  const lastImportBaselineRef = useRef<ScadaConfig | undefined>(undefined);
  const importSeqRef = useRef(0);
  const pendingSkipNonceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!runtime || !config) return;
    // L4 nonce：single-use。import 标记 pending nonce，effect 首次运行即消费（不论是否真正 skip），
    // 消除计数器泄漏。真正 skip 仅当 config 仍是 import 时的 props 基线（self-induced re-run）；
    // host 并发改了 config（identity 变化）则 nonce 已消费、正常走 sync（不滞留 imported 场景）。
    if (pendingSkipNonceRef.current !== null) {
      pendingSkipNonceRef.current = null;
      if (config === lastImportBaselineRef.current) {
        return;
      }
    }
    // plan 2026-08-09-0121-2 Workstream A 本轮-10（effect identity 抖动）：config 身份未变时早退，
    // 消除 reloadBindings→setRuntime(新对象身份)→effect 再跑空 diff 的冗余第二轮。reloadBindings 已在
    // 首轮于新 runtime（runtimeRef.current）上重建绑定域（loadDeclarations + reverseIndex.build + pipeline），
    // 故 runtime 身份变更但 config 未变时无需再 sync——也避免二轮重应用 applyInitialViewportState（重置用户
    // pan/zoom）与重复 onBuilt。prevRef 仅在成功 sync 后置为 config，故 config===prevRef 精确刻画「已为本
    // config 完成 sync」。host 后续传新身份 config 时 config!==prevRef 正常进入（diff/full）。
    if (config === prevRef.current) {
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
      // L4：per-import nonce（单调递增，唯一标识本次 import 的 self-induced re-run）。
      pendingSkipNonceRef.current = ++importSeqRef.current;
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
      // L4：构建失败时同样消费 nonce（防残留误 skip 下次合法 sync）。
      pendingSkipNonceRef.current = null;
      // SL-4 fix：import 全量构建失败同样强制下次 full 重建（prevRef 置空），避免损坏基线。
      prevRef.current = undefined;
      buildError?.(
        'config-build-failed',
        error instanceof Error ? error.message : String(error),
      );
    }
  }, []);

  // plan 2026-08-08-1809-3 Phase 3 / P1-5：装配 resize refit 回调（复用 applyScadaViewportPolicy）。
  // runtime 可用后把 refit 闭包写入 refitRef.current（不 mutate runtime 对象，react-compiler/immutability 友好）；
  // use-scada-engine 的 ResizeObserver handler 经 runtime.refitViewportOnResize（稳定闭包读 refitRef.current）调用。
  // 回调闭包读 latest.current（始终最新 config + policy）。无声明 policy 时 applyScadaViewportPolicy 短路 no-op
  // → 用户 viewport 保留（不破坏纯浏览场景）。
  useEffect(() => {
    if (!runtime || !setResizeRefit) return;
    setResizeRefit(() => {
      const { config: currentConfig, viewport: currentViewport } = latest.current;
      if (!currentConfig) return;
      applyScadaViewportPolicy(runtime, currentConfig, currentViewport);
    });
    return () => {
      setResizeRefit?.(undefined);
    };
  }, [runtime, setResizeRefit]);

  return { syncImported };
}
