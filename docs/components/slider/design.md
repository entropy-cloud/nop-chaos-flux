# slider

> Status: runtime（missing-components L1，plan 503，2026-09-25 flip）
> Owner package: `@nop-chaos/flux-renderers-form`
> ui primitive: `@nop-chaos/ui` `Slider`（Base UI 包装，flip 前 ui 已有——registration debt 收割）

## 1. 组件定位

拖动选择数值的标量表单控件。与 `input-number` 互补：slider 强调"在界定的连续区间内快速取值"，不承载文本输入与精度编辑（需要精确数值时用 `input-number`）。

## 2. 与 AMIS 或既有产品的能力对照

- AMIS `slider`：min/max/step、showInput、ticks、marks、range 双值。本实现取 v1 核心：min/max/step + 键盘步进 + 禁用/只读；双值 range 与 ticks/marks 不在 v1（无 host 需求，demand-gated）。
- 与 AntD Slider 对照：AntD 的 tooltip/ marks 等富装饰不采纳；保留 value 三态语义。

## 3. Flux 中的 renderer/type 定义

`type: 'slider'`，定义于 `renderers/form-atoms-renderer-definitions.ts`（`formAtomsRendererDefinitions`），组件 `SliderRenderer`，`wrap: true`（标准字段 frame 承载 label/description/校验态）。

## 4. schema 设计

```json
{
  "type": "slider",
  "name": "volume",
  "label": "Volume",
  "min": 0,
  "max": 100,
  "step": 1,
  "value": 40
}
```

- `min`（默认 0）/ `max`（默认 100）：界定区间。
- `step`（默认 1）：步进粒度；`<= 0` 回退 `1`（容错不崩）。
- 继承 `BoundFieldSchemaBase`：name/label/description/readOnly/required/value 三态/validate/hiddenFieldPolicy。

## 5. 字段分类

| 字段                         | 归属          | 说明                                         |
| ---------------------------- | ------------- | -------------------------------------------- |
| min/max/step                 | `props.props` | 数值契约，propContracts 已登记               |
| name                         | 绑定入口      | 经 `useFormFieldFromProps` + `numberAdapter` |
| value                        | 三态值        | undefined 不提交                             |
| readOnly/disabled            | meta/props    | presentation 承载                            |
| validate / hiddenFieldPolicy | 校验/隐藏     | 共享通道                                     |

## 6. regions 与 slot 约定

无 regions——纯标量控件，无子 schema。

## 7. 运行期状态归属

值归属 form store（经 name 绑定）；拖动中间态由 ui Slider 内部消化，松手即提交 onChange。

## 8. 事件、动作与组件句柄能力

- 事件：`onChange`/`onBlur` 走共享 field 事件通道。
- 句柄：`clear` / `reset` / `focus`（`useInputComponentHandle`，focus 落 thumb 元素）。

## 9. 数据源、表达式、导入能力接入点

value 支持 `${...}` 表达式初值；无 IO（不接 env.fetcher）——纯受控 UI。

## 10. 样式与 DOM marker 约定

- 根 marker：`nop-slider-field` + `props.meta.className`。
- ui 侧 `data-slot="slider|slider-track|slider-range|slider-thumb"`；值回显 `data-slot="slider-value"`。
- 无内联色值/无 BEM。

## 11. 实现拆分建议

`slider-renderer.tsx`（组件）+ `form-atoms-renderer-definitions.ts`（定义）+ `input-contracts.ts`（min/max/step 契约）+ `schemas.ts`（`SliderSchema`）。

## 12. 风险、取舍与后续阶段

- jsdom 无布局：base-ui 拖动/键盘数学在单测中不可驱动，交互证明在 e2e（真实 Chromium）。
- range 双值 / ticks：demand-gated，不预设。

## 13. 响应式行为

水平轨道 `w-full` 自适应容器；移动端保持 ≥ 触控最小命中的 thumb 尺寸（ui 侧 after 扩展命中区）。
