# Combo 组件设计

## 1. 组件定位

- `combo` 是复合值字段容器，用来编辑重复对象项或小型复合结构。
- 它属于 advanced form family，不是 `array-editor` 的简单别名。
- **边界裁定（W4c 收敛）**：`combo` 是**重复对象/复合项字段编辑器**——item 模板来自 schema `items` region（每项独立复合字段），视觉为卡片/流式堆叠。`array-editor` 是**标量项**编辑器（单一 value 输入）；`array-field` 是**底层 staged owner**（transformIn/Out action，`itemKind:'scalar'|'object'`）。combo 复用 array-field 的 staged owner 内核（`createItemScope`/`createItemFormProxy`/`createProjectedValidationRuntime` + `currentForm.append/remove/moveValue` + staged validation），但提供 `items` region + 复合项卡片 UI + canonical `addItem`/`removeItem`/`moveItem` 句柄，不重造第二套数组操作协议。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `combo`。
- Flux 应优先把它放在当前 object/array/composite field 体系内理解，而不是复制历史表单大组件行为面。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'combo'`
- 归属 `@nop-chaos/flux-renderers-form-advanced`（roadmap 权威；本节早期写作 `flux-renderers-form` 为 drift，W4c 收敛）。随 `registerFormAdvancedRenderers` 注册。

## 4. schema 设计

- 建议正式字段为 `name`、`label`、`items`、`multiple`、`addable`、`removable`、`reorderable`、`minItems`、`maxItems`、`itemKey`、`removeWhen`。
- `removeWhen`（可选）：相对当前 item 求值的布尔表达式字符串（`${...}` 形式，如 `'${value.locked !== true}'`）。声明后，某行仅在表达式对该 item 求值为真时允许删除；求值为假的行删除按钮禁用。未声明时所有行在 `minItems` 地板之上均可删除。求值出错 fail-open。详见 `docs/architecture/array-field.md` 的 _Per-Row Delete Gating_。

## 5. 字段分类

- `label`: `value-or-region`
- `name`、`items`、`multiple`、`addable`、`removable`、`reorderable`、`minItems`、`maxItems`、`itemKey`: `value`
- `items`: `region`（regionKey `items`，参数 `index`/`value`）
- `onAdd`、`onRemove`、`onReorder`: `event`

## 6. regions 与 slot 约定

- `itemSchema` 是单项复合字段模板区域。

## 7. 运行期状态归属

- 值和校验状态归最近表单或 composite-field owner runtime。

## 8. 事件、动作与组件句柄能力

- 推荐句柄为 `component:addItem`、`component:removeItem`、`component:moveItem`（canonical composite handle，method-locked，不扩展句柄工厂）。
- `removeItem` 受 `minItems` field-global 地板与 per-row `removeWhen` 门控叠加约束（取并集禁用）；详见 §4 与 `docs/architecture/array-field.md` 的 _Per-Row Delete Gating_。

## 9. 数据源、表达式、导入能力接入点

- 初值和重复项配置可由表达式驱动。远程候选集走 data-source 请求下沉 successor（首版聚焦静态 `items` + 表达式初值）。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-combo` marker；每项输出 `nop-combo__item` marker。

## 11. 实现拆分建议

- item runtime、数组操作桥接、field chrome 分开实现。

## 12. 风险、取舍与后续阶段

- 主要风险是与现有 object/detail/array family 重复建模——已通过复用 array-field staged owner 内核 + canonical composite handle 收敛，边界见 §1。
