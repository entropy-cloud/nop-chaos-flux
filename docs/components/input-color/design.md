# input-color

> Status: runtime（missing-components L1，plan 503，2026-09-25 flip）
> Owner package: `@nop-chaos/flux-renderers-form`
> ui primitive: `@nop-chaos/ui` `ColorPicker`（flip 时新建，shadcn 约定）

## 1. 组件定位

颜色选择表单控件：swatch 触发钮 + 弹层面板（预设色板 + 自由输入），提交一个规范化颜色字符串。table editable 的 `color-picker` 请求沿 `gd-cell-edit-no-editor` 只读回退——本 type 落地后单元格内联编辑另评。

## 2. 与 AMIS 或既有产品的能力对照

- AMIS `input-color`：format、presetColors、allowCustomColor。本实现对齐：`valueFormat`（'hex' 默认 / 'rgba'）+ `presetColors`；命名取 `valueFormat`（date 族先例）因 `format` 已被 BoundFieldSchemaBase 的值校验通道占用。
- alpha 编辑经 rgba 文本输入承载；独立透明度滑杆 v1 裁决出 scope（plan 503 Phase 4）。

## 3. Flux 中的 renderer/type 定义

`type: 'input-color'`，定义于 `renderers/form-atoms-renderer-definitions.ts`，组件 `InputColorRenderer`，`wrap: true`。

## 4. schema 设计

```json
{
  "type": "input-color",
  "name": "accent",
  "label": "主题色",
  "valueFormat": "rgba",
  "presetColors": ["#0f172a", "#f97316"]
}
```

- `valueFormat`：提交格式。`'hex'`（默认）→ `#rrggbb`（alpha 丢弃）；`'rgba'` → `rgba(r, g, b, a)`。
- `presetColors`：预设色板数组（hex/rgba 字符串）。
- 值协议：接受 `#rgb`/`#rrggbb`/`rgb()/rgba()` 输入，提交前规范化；非法输入不提交（回退空 + 不崩）。

## 5. 字段分类

| 字段                          | 归属          | 说明                 |
| ----------------------------- | ------------- | -------------------- |
| valueFormat/presetColors      | `props.props` | propContracts 已登记 |
| value                         | 三态字符串    | `stringAdapter` 绑定 |
| readOnly/disabled/placeholder | presentation  | 只读禁触发           |

## 6. regions 与 slot 约定

无 regions。弹层面板（色板 + 输入）是 ui 基元内部结构，非 schema 编排面。

## 7. 运行期状态归属

值归属 form store；弹层开合/输入草稿（draft）是 ui 内部瞬时态。

## 8. 事件、动作与组件句柄能力

- 事件：`onChange`（提交规范化值）/`onBlur` 共享通道。
- 句柄：`clear` / `reset` / `focus`（focus 落触发钮）。

## 9. 数据源、表达式、导入能力接入点

value 支持 `${...}` 初值；无 IO。SCADA inspector 私有色板复用评估：inspector 面板为编辑器内部紧凑实现（无值规范化协议、无 a11y radiogroup 契约），v1 不迁移（plan 503 Phase 4 结论），待 industrial 线需要值协议统一时复用本 type。

## 10. 样式与 DOM marker 约定

- 根 marker：`nop-input-color`。
- ui 侧 `data-slot="color-picker|color-picker-swatch|color-picker-panel|color-picker-preset"`。
- 弹层复用 ui `Popover`（全局 z-index 栈）。

## 11. 实现拆分建议

ui `color-picker.tsx`（`normalizeColorValue` 纯函数导出便于测试）+ renderer（字段绑定/句柄）+ definitions/schemas/contracts。

## 12. 风险、取舍与后续阶段

- 非 sRGB 颜色（oklch 等）输入不识别（返回 null 不提交）——按 demand 升级解析器。
- 原生 `<input type="color">` 不采用：值协议与跨浏览器外观不可控。

## 13. 响应式行为

触发钮 `w-full` 填充字段宽；面板固定内容宽（swatch 10 列网格），小屏不溢出（Popover 自带边界翻转）。
