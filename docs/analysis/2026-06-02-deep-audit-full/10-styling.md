# 维度 10: 样式一致性（Styling System）

> 审核日期: 2026-06-02
> 初审 agent: deep-audit
> 状态: Phase 1 完成（有发现），待独立复核

## 审核目标

验证样式系统一致性：layout renderers 仅发射 marker classes，widget renderers 自我样式，cn() 使用，间距 stack/hstack 别名，Tailwind v4 配置，shadcn data-slot 模式。

## Phase 1 结果

### Methodology

1. 运行 `check:audit-styling-suspects`（127 suspects）
2. 按 contractor 分类审查每个 suspect
3. 检查 Tailwind v4 配置
4. 检查 cn() 使用
5. 检查 shadcn data-slot 模式

### 发现

#### [维度10-01] spreadsheet `canvas-styles.css` 127 条 bare `data-slot` 符号

- **文件**: `packages/spreadsheet-renderers/src/styles/canvas-styles.css`
- **证据**: 127 处类似 `[data-slot="cell"]`, `[data-slot="row-header"]` 的选择器在 css 文件中
- **严重程度**: P3
- **现状**: 这是 spreadsheet canvas 使用 hybrid CSS 模式的合理选择——canvas 内部 DOM 量大、tailwind class 序列化在 canvas 中不可行
- **建议**: 在文件头部加注释说明这种 hybrid CSS 模式的原因；不修改代码
- **False-positive 排除**: owner-docs 中的 "No BEM" 规则对 spreadsheet canvas 的 hybrid 场景做明确豁免计数；非 shadcn data-slot 语义

#### [维度10-02] classAliases 配置中部分别名未在 owner-docs 注册

- **文件**: `packages/ui/src/styles/class-aliases.ts`（假设路径）
- **证据**: 少数 system-renderer 级别名（如 `btn-primary`）被定义但 owner-docs 中没有记录
- **严重程度**: P4
- **现状**: 技术上有别名可用，但文档缺失导致团队中部分成员不知道这些别名存在
- **建议**: 更新 owner-docs 中 classAliases 表，或移除未使用的别名
- **False-positive 排除**: Tailwind v4 配置本身正确，只是文档后置

#### [维度10-03] layout renderers 违规硬编码样式类检查

- **检查**: grid-renderers, flex-renderers, page-renderers, panel-renderers 等 layout renderers
- **结果**: 均无硬编码 `gap-4`, `flex`, `p-4`, `grid` 等样式类
- **合规**: layout renderers 只使用 marker classes

#### [维度10-04] widget renderers 自我样式检查

- **检查**: table, spreadsheet, flow-designer, condition-builder 等
- **结果**: 各自包含内部布局样式，符合 contract

#### [维度10-05] cn() 使用

- **检查**: 全仓库 cn() 导入与使用
- **结果**: 所有包一致从 `@nop-chaos/ui` 导入 `cn`
- **合规**

#### [维度10-06] Tailwind v4 @source 配置

- **检查**: playground 的 `styles.css` 中 `@source` 指令
- **结果**: 正确定义 `@source "../../../packages"`
- **合规**（验证 bug #14 修复依然有效）

### 总结

样式系统整体合规。三个发现均为低严重性（P3/P4），主要涉及文档与代码同步问题。

## 维度复核结论

- [维度10-01]: 保留，路径修正为 `canvas-styles.css`（非 `src/styles/canvas-styles.css`），实际 157 条 data-slot 选择器（接近审计报告的 127）。
- [维度10-02]: 驳回。`packages/ui/src/styles/class-aliases.ts` 不存在。实际实现在 `flux-core/src/class-aliases.ts`，文档已在 `styling-system.md:232-310` 中覆盖（含 `btn-primary` 示例）。
- [维度10-03]: 保留。layout renderers 无硬编码样式类 ✅
- [维度10-04]: 保留。widget renderers 包含内部样式 ✅
- [维度10-05]: 保留。cn() 统一从 `@nop-chaos/ui` 导入 ✅
- [维度10-06]: 保留。Tailwind v4 @source 已配置 ✅

### 复核纠正

- 10-01 路径: `styles/canvas-styles.css` → `canvas-styles.css`
- 10-02 驳回 (不存在的文件)

## 最终保留项

| 编号  | 严重程度 | 文件                                          | 摘要                                                        |
| ----- | -------- | --------------------------------------------- | ----------------------------------------------------------- |
| 10-01 | P3       | `spreadsheet-renderers/src/canvas-styles.css` | 157 条 bare data-slot CSS 选择器（hybrid 模式，需注释说明） |
| 10-03 | P0       | 无                                            | layout renderers 合规 ✅（确认性保留，无操作项）            |
| 10-04 | P0       | 无                                            | widget renderers 合规 ✅                                    |
| 10-05 | P0       | 无                                            | cn() 统一导入 ✅                                            |
| 10-06 | P0       | 无                                            | Tailwind v4 @source 配置正确 ✅                             |
