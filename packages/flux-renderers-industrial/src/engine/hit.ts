export interface HitResolverOptions {
  /** leafer `selector.getByPoint`（A3 固化：O(候选) 包围盒预检，不引空间索引）。 */
  getByPoint: (point: { x: number; y: number }, padding?: number) => unknown;
  /** 命中节点 → symbolId（tree-registry 反查）。 */
  idOf: (leaf: unknown) => string | undefined;
  /** 视口尺寸（屏外点立即排除，0ms 预检语义）。 */
  getSize?: () => { width: number; height: number };
}

/**
 * 命中解析（I6.4，design-engine.md §11 hit.ts）：
 * 事件视口坐标 → `selector.getByPoint` → 最深命中节点 → symbolId；屏外点立即排除（O(候选) 预检）。
 */
export class HitResolver {
  constructor(private readonly options: HitResolverOptions) {}

  resolveSymbolId(viewX: number, viewY: number): string | undefined {
    const size = this.options.getSize?.();
    if (size && (viewX < 0 || viewY < 0 || viewX > size.width || viewY > size.height)) {
      return undefined;
    }
    const hit = this.options.getByPoint({ x: viewX, y: viewY });
    if (hit === undefined || hit === null) return undefined;
    // leafer `selector.getByPoint` 恒返回 `IPickResult { target, path }`（ISelector.ts；spike demo.js `result.target` 解包）——先解包 target 再反查；无 target 键时视原始返回为节点（gate-3-review §3 抽查项 3 / M-2）
    const target = 'target' in (hit as object) ? (hit as { target?: unknown }).target : hit;
    if (target === null || target === undefined) return undefined;
    return this.options.idOf(target);
  }
}
