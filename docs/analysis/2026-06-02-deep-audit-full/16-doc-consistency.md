# 维度 16: 文档与代码一致性

> 审核日期: 2026-06-02
> 初审 agent: deep-audit
> 状态: Phase 1 完成（有发现），待独立复核

## 审核目标

验证架构文档（`docs/architecture/`）中的描述是否与实际代码行为一致，文档中引用的文件名、路径、类型名是否准确。

## Phase 1 结果

### Methodology

1. 交叉检查 `docs/architecture/` 主要文档与对应代码
2. 检查文档中引用的路径是否存在
3. 检查文档中描述的行为是否与代码一致
4. 检查 `docs/references/` 的一致性与完整性

### 发现

#### [维度16-01] terminology.md 缺少 6 个关键术语

- **文件**: `docs/references/terminology.md`
- **证据**: 代码中存在的 `ActionScope`, `ComponentRegistry`, `RuntimeContext`, `FieldFrame`, `Slot`, `ScopeSelector` 没有在 terminology.md 中定义
- **严重程度**: P3
- **现状**: 6 个核心术语在代码和文档中广泛使用（如架构文档引用 "ActionScope"），但新 contributor 无法在术语表中查到
- **建议**: 添加缺失的术语定义。每项至少包含：确切定义、和相近术语的区别、典型使用场景
- **False-positive 排除**: 文档缺失不是代码 bug，但影响项目可维护性

#### [维度16-02] report-designer design.md 中 workbook scope data 的 acknowledge 过时

- **文件**: `docs/architecture/report-designer/design.md` (假设位置 - section about scope data)
- **证据**: 文档描述 workbook scope data 是"单一真源"，但实际代码（host-data.ts:195-233）沿两个路径发布 workbook（交叉参照 dim04 发现 04-02）
- **严重程度**: P2
- **现状**: 文档承诺单一真源，代码存在双路径——这是一个 doc-code gap
- **建议**: 更新 design.md 以反映实际的 dual-path 设计，或修改代码以匹配文档（后者更优但工作量更大）
- **False-positive 排除**: 非 doc-only 发现——doc-code gap 反映实际架构偏差

### 路径引用检查

| 文档                              | 引用路径                                  | 检查结果 |
| --------------------------------- | ----------------------------------------- | -------- |
| flux-core.md                      | `packages/flux-core/src/compiler/`        | ✅ 存在  |
| flux-runtime-module-boundaries.md | `packages/flux-runtime/src/form-store/`   | ✅ 存在  |
| renderer-runtime.md               | `packages/flux-react/src/`                | ✅ 存在  |
| form-validation.md                | `packages/flux-react/src/field-frame.tsx` | ✅ 存在  |
| styling-system.md                 | `packages/ui/src/styles/`                 | ✅ 存在  |
| report-designer/design.md         | `packages/report-designer-renderers/src/` | ✅ 存在  |
| flow-designer/design.md           | `packages/flow-designer-core/src/`        | ✅ 存在  |

所有文档引用的路径都有效。

### 其他检查

- **styling-system.md vs code**: classAliases 列表中 2 个别名在代码中有但文档中未记录（交叉参照 dim10 发现 10-02）
- **action-scope-and-imports.md vs code**: 所有描述的 action scope 类型与代码一致

### Summary

| 编号  | 严重程度 | 文件                        | 摘要                                        |
| ----- | -------- | --------------------------- | ------------------------------------------- |
| 16-01 | P3       | `terminology.md`            | 缺失 6 个关键术语定义                       |
| 16-02 | P2       | `report-designer/design.md` | document-code gap about workbook scope data |

## 维度复核结论

- [维度16-01]: 保留（数据修正）。实际 5 个术语完全缺失 (`ComponentRegistry`, `RuntimeContext`, `FieldFrame`, `Slot`, `ScopeSelector`)，`ActionScope` 在第 203 行被提及但无独立条目。应修正为 "5 完全缺失 + 1 被提及未定义"。
- [维度16-02]: 保留。确认存在真实的 doc-code gap：`buildReportDesignerScopeData` (host-data.ts:189-246) 发布两条 workbook 路径，`design.md` 第 11 节主张单一真源但代码允许两者共存。

### 复核纠正

- 16-01 统计: "6 个缺失" → "5 个完全缺失 + 1 个被提及未定义"

## 最终保留项

| 编号  | 严重程度 | 文件                                          | 摘要                                                 |
| ----- | -------- | --------------------------------------------- | ---------------------------------------------------- |
| 16-01 | P3       | `docs/references/terminology.md`              | 5 个关键术语完全缺失，1 个被提及但未定义             |
| 16-02 | P2       | `docs/architecture/report-designer/design.md` | doc-code gap: workbook scope data 单一真源 vs 双路径 |
