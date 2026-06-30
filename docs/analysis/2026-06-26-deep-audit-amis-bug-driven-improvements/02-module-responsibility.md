# 维度 02：模块职责与文件边界

## 第 1 轮（初审）

### [维度02-01] form-store.ts 超 >700 硬门禁且存在零耦合提取缝（page/surface store 完全独立）

- **文件**: `packages/flux-runtime/src/form-store.ts:636-743`（page store 636-661，surface store 663-743）
- **证据片段**:
  ```ts
  // 636
  export function createPageStore(initialData: Record<string, any>): PageStoreApi {
    const store = createStore<PageStoreState>(() => ({ data: initialData, refreshTick: 0 }));
    return { getState(){...}, subscribe(listener){...}, setData(data){...}, updateData(path,value){...}, refresh(){...} };
  }
  // 663
  export function createSurfaceStore(): SurfaceStoreApi {
    const store = createStore<SurfaceStoreState>(() => ({ entries: [], uncontrolledOpenById: {} }));
    return { ... push/upsert/remove/setUncontrolledOpen/getUncontrolledOpen/clearUncontrolledOpen ... };
  }
  ```
- **严重程度**: P2
- **现状**: 单文件承载三个独立工厂：form store 主体 + 私有 path-listener/change-diff/diagnostics（约 593 行）；page store（约 26 行）；surface store（约 81 行）。grep 验证 `createPageStore`/`createSurfaceStore` 不引用任何 form-store 内部助手，零耦合。
- **风险**: `check:oversized-code-files` 退出码 1（>700 硬门禁红态，CI 可见）；page/surface store 演进需在 744 行文件穿梭。
- **建议**: 提取 `page-store.ts` + `surface-store.ts`；可选再抽 `form-store-helpers.ts`（计数/diagnostics 助手约 120 行）。同步更新 `flux-runtime-module-boundaries.md` 所有权映射。
- **为什么值得现在做**: 3 个 >700 源文件里唯一无"不拆分"决策注释、非单一 orchestrator/builder 的文件；提取缝零耦合（机械验证），改动风险极低，可把红态门禁转绿。
- **误报排除**: 非 orchestrator（三个独立 `export function`）；命中 calibration pattern #1 的 keep 条件（越过 >700 硬规则 + 存在可独立提取的职责混合）。
- **历史模式对应**: 呼应本仓"曾成功拆分 index.ts(1183)/types.ts(904)"模式，"第一轮提取后停下"原则适用。
- **复核状态**: 维度复核降级——">700 门禁失败"基础并入 P0（AUDIT-01）；仅保留"提取点"为 P2。

## 维度复核结论

- [维度02-01]: 降级。门禁红态部分并入 P0 [AUDIT-01]；createPageStore/createSurfaceStore 零耦合提取观察保留 P2 → 映射为 AUDIT-04。

其余 >700 源文件（form-runtime-owner.ts 728、node-compiler.ts 701）经核实分别为单一 orchestrator builder 与显式 Plan 444 决策注释文件，命中 calibration pattern #1 降级（但其行数仍计入 P0 门禁 ERROR 清单）。input-choice-renderers.tsx（675，>500 WARN）保留 P3 人工评估。

## 最终保留项

| 编号  | 严重程度 | 文件                                     | 摘要                                                   |
| ----- | -------- | ---------------------------------------- | ------------------------------------------------------ |
| 02-01 | P2       | `flux-runtime/src/form-store.ts:636-743` | page/surface store 零耦合可提取（门禁红并入 AUDIT-01） |

入口文件：零发现（19/21 包纯 re-export，无 >50 导出异常）。目录结构：P3 风格建议（flux-react/flow-designer-renderers 顶层文件最多 57）。文档-代码偏离：0（boundary doc 所有权映射与代码一致）。
