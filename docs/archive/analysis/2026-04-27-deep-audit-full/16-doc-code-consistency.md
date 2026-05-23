# 维度 16：文档-代码一致性

## 审核范围

检查架构文档、参考文档、活跃计划的准确性和与代码的一致性。

## 发现清单

### [维度16] flux-runtime-module-boundaries.md 引用不存在的文件路径 ★ 降级为 P2

- **文档路径**: `docs/architecture/flux-runtime-module-boundaries.md:181`
- **代码路径**: `packages/flux-action-core/src/utils/debounce.ts`（不存在）
- **严重程度**: P2（子项复核从 P1 降级）
- **漂移类型**: 路径失效
- **文档描述**:
  ```markdown
  - `packages/flux-action-core/src/utils/debounce.ts`
    - debounce utilities for action execution
  ```
- **代码现状**: 该文件不存在。debounce 实际实现在 `packages/flux-core/src/utils/debounce.ts`，`flux-action-core` 仅 re-export。
- **建议**: 更新为 `packages/flux-core/src/utils/debounce.ts` 并注明 re-export 关系。
- **为什么值得现在做**: 这是唯一 1 条失效路径（其余 75+ 条全部正确），修正成本低。
- **误报排除**: 不是草案——flux-runtime-module-boundaries.md 是当前 baseline 文档。
- **历史模式对应**: debounce 在多次重构中迁移（flux-runtime → flux-core），文档未同步。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 子项复核通过（P1→P2 降级）

### [维度16] form-validation.md 类型名称偏差

- **文档路径**: `docs/architecture/form-validation.md`
- **严重程度**: P2
- **漂移类型**: 行为不一致
- **文档描述**: 使用了部分过时的类型名称和枚举值。
- **代码现状**: 代码中实际类型名称和枚举值与文档描述有出入。
- **建议**: 与代码同步更新类型引用。
- **复核状态**: 维度复核通过

### [维度16] form-validation-runtime-types.md 严重漂移

- **文档路径**: `docs/references/form-validation-runtime-types.md`
- **严重程度**: P2
- **漂移类型**: 行为不一致
- **文档描述**: 该参考文档与代码存在 11 处不一致，但文档自身标记为 "Active" 引用。
- **代码现状**: 代码中验证运行时类型与文档描述有多处分歧。
- **建议**: 全面更新该文档以匹配当前代码，或降级为 "Historical" 参考。
- **复核状态**: 维度复核通过

### [维度16] Plan 138 内部状态矛盾

- **文档路径**: `docs/plans/138-crud-editing-and-request-owned-runtime-successor-plan.md`
- **严重程度**: P2
- **漂移类型**: 计划状态失真
- **文档描述**: 计划标记中存在内部矛盾（状态标记与检查清单完成度不一致）。
- **建议**: 根据实际完成情况统一状态标记。
- **复核状态**: 维度复核通过

### [维度16] form-validation.md 描述 Phase 3 目标类型但未标注

- **文档路径**: `docs/architecture/form-validation.md`
- **严重程度**: P2
- **漂移类型**: 行为不一致
- **文档描述**: 部分描述使用了 Phase 3 目标类型，但未标注 "Phase 3 target" 声明。
- **代码现状**: 代码仍处于 Phase 2 实现阶段。
- **建议**: 对所有 Phase 3 目标描述添加明确的版本标注。
- **复核状态**: 维度复核通过

## 总结评估

1 个 P2（文档路径失效，子项复核从 P1 降级），4 个 P2（类型漂移、参考文档漂移、计划状态矛盾、Phase 标注缺失）。文档整体准确率超过 95%（75+ 条路径仅 1 条失效）。
