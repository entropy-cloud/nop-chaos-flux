# 维度12：表单字段与 Slot 建模（初审，待复核）

## 发现清单

### P2 级 (2项)

1. **container 渲染器缺少 field metadata 声明** — basic-renderer-definitions.ts:39-48
2. **tabs 渲染器 items 缺少 region 级声明** — basic-renderer-definitions.ts:277-288

### 确认合规

- value-or-region 使用正确（page.title, dialog.title, table.empty 等）
- FieldFrame 集成正确
- 表单控件 label 通过 formLabelFieldRule 统一声明
