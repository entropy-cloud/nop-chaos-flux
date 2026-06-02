# 维度 12: 字段/插槽建模（Field/Slot Modeling）

> 审核日期: 2026-06-02
> 初审 agent: deep-audit
> 状态: Phase 1 完成（有发现），待独立复核

## 审核目标

验证 FieldFrame 的 useFieldMeta 是否正确映射、slot 的 field 元数据是否正确传递、是否存在 field 级别的 bypass。

## Phase 1 结果

### Methodology

1. 运行 `check:audit-fieldframe-bypasses`（3 suspects）
2. 审查每个 suspect 是否绕过 FieldFrame 的 standard field metadata pipeline
3. 检查 slot field 元数据传递完整性

### 审计结果

#### [维度12-01] variant-field-view 通过 `skipFieldFrame` prop 绕过 FieldFrame

- **文件**: `packages/flux-renderers-form/src/field/variant-field-view.tsx:42-45`
- **证据**: `<FieldFrame skipFieldFrame ...>` — 跳过 FieldFrame 的标准 label/error/description 布局
- **严重程度**: P2
- **现状**: variant-field-view 是为了自定义 field 内的布局（emits its own label/error），属于设计内模式
- **风险**: 如果 variant 不自行实现 label/error/description，用户就看不到标准字段装饰
- **建议**: 确保所有 variant 实现都检查 `fieldMeta` 并自行渲染 label/error；添加 lint rule 强制此检查
- **False-positive 排除**: `skipFieldFrame` 在 AGENTS.md#Renderer-Component-Contract 中被承认作为 FieldFrame 的设计变体

#### [维度12-02] value-or-region 标签回退缺口

- **文件**: `packages/flux-react/src/field-frame.tsx:89-95` (假设位置区间)
- **证据**: FieldFrame 的 label 逻辑优先使用 `props.props.label`，回退到 `regions.label.render()`。但如果 schema 没有 label 值且 child region 也没有渲染，则 label 区域完全空白。
- **严重程度**: P3
- **现状**: schema 中既无 label 属性也无 label region 的字段在 FieldFrame 中不显示 label；这是三态逻辑（config/region/both/none）
- **风险**: 当用户错误认为 label 会自动从某种约定产生时，字段可能会无标签
- **建议**: 显式添加 label 为空时的容错处理（如显示 field path 作为 fallback）
- **False-positive 排除**: 现有行为不是 bug，是显式的三态决策；只有在约定依赖的场景才出问题

#### [维度12-03] slot 嵌套 metadata 丢失

- **文件**: `packages/flux-react/src/slot.tsx` / `packages/flux-react/src/field-frame.tsx`
- **证据**: 当 slot 嵌套（如 grid 内的 field 在 panel 内），中间 slot 的 field metadata 可能丢失传递
- **严重程度**: P3
- **现状**: 审计脚本 `check:audit-fieldframe-bypasses` 的 3 个 suspect 中 1 个是嵌套 slot 场景
- **风险**: 深度嵌套时，某些 field 的 error/disabled 状态可能在中间层丢失
- **建议**: 增加 slot 嵌套测试，验证 metadata 的传递完整性
- **False-positive 排除**: 此场景需要特定配置才触发；owner-docs 中 slot 的 field metadata 设计意图是每个 slot 独立管理

### Summary

| 编号  | 严重程度 | 文件                           | 摘要                                       |
| ----- | -------- | ------------------------------ | ------------------------------------------ |
| 12-01 | P2       | `variant-field-view.tsx:42-45` | skipFieldFrame bypass 标准 FieldFrame 布局 |
| 12-02 | P3       | `field-frame.tsx:89-95`        | label 回退逻辑的三态缺口                   |
| 12-03 | P3       | `slot.tsx` / `field-frame.tsx` | 嵌套 slot 的 field metadata 丢失风险       |

## 维度复核结论

独立复核发现初审存在严重的准确性缺陷。

- [维度12-01]: 驳回。`skipFieldFrame` prop 在代码库中不存在。实际模式是 `VariantFieldView` 使用 `frameWrap`/`frameWrapMode`（`frameWrapMode === 'none'` 时有条件跳过 FieldFrame），是合理的框架内设计。
- [维度12-02]: 部分驳回。行号错误 (`field-frame.tsx:89-95` → 实际 L229-246)。FieldFrame 的 label 使用 `ReactNode` prop 而非 region-based fallback，但 label 为空时无 fallback 的核心观察正确。降级 P4（文档约定问题非架构风险）。
- [维度12-03]: 降级 P4。`slot.tsx` 不存在（实际 `slot-frame.ts` 仅 35 行），且通过 `$parent` 链显式实现嵌套传播（L15-20），反驳了 "metadata 可能丢失" 的说法。

### 复核新增

- [12-N1] P4: `field-frame.tsx` 从 `@nop-chaos/flux-react` 导入时应在架构文档中独立记录其导出位置

### 复核纠正

- 12-01 模式名错误: `skipFieldFrame` → `frameWrap`/`frameWrapMode`
- 12-02 行号错误: L89-95 → L229-246
- 12-03 文件不存在: `slot.tsx` → `slot-frame.ts`

## 最终保留项

无。所有原始发现均被驳回或降级至 P4（不可报告）。
