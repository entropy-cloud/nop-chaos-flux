# 维度 18: 跨包一致性

> 审核日期: 2026-06-02
> 初审 agent: deep-audit
> 状态: Phase 1 完成（有发现），待独立复核

## 审核目标

验证相同层面的包（core runtimes、renderers、designer cores）是否使用一致的模式：state management、error handling、file naming、type export convention。

## Phase 1 结果

### 方法论

1. 对比 core runtime 包: `flux-core`, `flux-runtime`, `flow-designer-core`, `spreadsheet-core`
2. 对比 renderer 包: 所有 `flux-renderers-*`
3. 对比 designer 包: `flow-designer-*`, `report-designer-renderers`, `spreadsheet-renderers`

### 发现

#### [维度18-01] flow-designer-core 使用自定义闭包状态而非 zustand/vanilla

- **文件**: `packages/flow-designer-core/src/core.ts`
- **证据**: 所有其他 core runtime 包（flux-core, flux-runtime 等）都使用 `zustand/vanilla` store。flow-designer-core 使用 1200+ 行自定义闭包状态管理
- **严重程度**: P2
- **现状**: flow-designer-core 的状态管理是自创的闭包+事件模式，不是 zustand/vanilla `createStore`
- **风险**:
  - 团队需要维护两套状态模式
  - flow-designer-core 不能使用 zustand 的 devtools/middleware
  - 1200+ 行核心文件难以测试和维护
- **建议**: 重构 flow-designer-core 状态管理至 zustand/vanilla，复用 flux-core 模式
- **False-positive 排除**: flow-designer-core 的闭包模式功能完整，这是模式选择问题

#### [维度18-02] eslint-disable 不一致

- **文件**: 跨多包
- **证据**: 部分文件使用 `// eslint-disable-next-line @typescript-eslint/no-explicit-any` 而在其他文件中使用 `// eslint-disable-line`
- **严重程度**: P4
- **现状**: ESLint disable 注释风格不统一
- **建议**: 统一为 `// eslint-disable-next-line` 风格（推荐），或在 lint config 中统一 rule 豁免
- **False-positive 排除**: 不影响功能，纯代码风格

### 模式一致性检查

| 模式             | 期望方式                | flux-runtime | flow-designer-core | spreadsheet-renderers |
| ---------------- | ----------------------- | ------------ | ------------------ | --------------------- |
| state management | zustand/vanilla         | ✅           | ❌ 自定义闭包      | ✅ (部分)             |
| error handling   | structured catch+report | ✅           | ⚠️ 混合            | ✅                    |
| file naming      | camelCase               | ✅           | ✅                 | ✅                    |
| type export      | index.ts re-export      | ✅           | ✅                 | ✅                    |
| action dispatch  | StandardAction          | ✅           | ✅                 | N/A                   |

### Summary

| 编号  | 严重程度 | 文件                             | 摘要                               |
| ----- | -------- | -------------------------------- | ---------------------------------- |
| 18-01 | P2       | `flow-designer-core/src/core.ts` | 自定义闭包状态替代 zustand/vanilla |
| 18-02 | P4       | 跨多包                           | eslint-disable 注释风格不统一      |

## 维度复核结论

- [维度18-01]: 保留 P2。确认 `core.ts` 使用闭包可变状态（`let doc = ...`, `let selectionState = ...`, `listeners = new Set()`），无 zustand/vanilla `createStore`。行数纠正为 ~616（非 1200+）。
- [维度18-02]: 保留 P4。

### 复核纠正

- 18-01 行数: 1200+ → 616

## 最终保留项

| 编号  | 严重程度 | 文件                             | 摘要                               |
| ----- | -------- | -------------------------------- | ---------------------------------- |
| 18-01 | P2       | `flow-designer-core/src/core.ts` | 自定义闭包状态替代 zustand/vanilla |
| 18-02 | P4       | 跨多包                           | eslint-disable 注释风格不统一      |
