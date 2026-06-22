# Checkbox 组件设计

## 1. 组件定位

- `checkbox` 是单个布尔或二值字段控件。
- 它适合确认、开关式选择和布尔表单项，不负责多项集合选择。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已实现 `option.label` 和基础 field chrome。
- `trueValue`/`falseValue` 自定义值映射已落地（E3）。半选态与描述文本仍作为后续增强。

### Flux 决策表

| AMIS / 候选能力            | 价值评估 | Flux 决策      | 理由                                                                                                                                     |
| -------------------------- | -------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `trueValue` / `falseValue` | 核心     | **实现**（E3） | 布尔控件值契约：表单可存 `1/0`、`"yes"/"no"`、`"Y"/"N"` 等业务值，而非硬编码 `true`/`false`。缺省回退 `true`/`false`（无回归）。         |
| `option` (label/value)     | 常用     | **实现**       | 单 checkbox 内联文案；`option.label` 已落地。`option.value` 不再作为值映射入口（与 `trueValue`/`falseValue` 语义重叠，已拒）。           |
| amis `option` 数组语法     | 低       | 不采纳         | amis 旧式 `option: [{label, value}]` 数组用于多 checkbox 聚合，已被 `checkbox-group` 接管；单 checkbox 只需标量 `trueValue/falseValue`。 |
| `indeterminate` 半选态     | 低       | 不采纳（后续） | 半选态是 UI 显示维度，与值映射维度正交；当前无明确业务需求驱动。归独立增强（见 §12）。                                                   |
| `description` / `remark`   | 低       | 不采纳（后续） | 通用字段 chrome 已在 `formFieldChromeRules` 提供 `hint`/`description`/`remark`，单 checkbox 不再单独开同名字段。                         |
| `name`（amis 多选聚合）    | 低       | 不采纳         | 多 checkbox 聚合归 `checkbox-group`；单 checkbox 只绑一个布尔字段。                                                                      |

## 3. Flux 中的 renderer/type 定义

- `type: 'checkbox'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 fields: `label` 为 `value-or-region`
- 当前 validation contributor: 标准 scalar field

## 4. schema 设计

- 继承 `InputSchema` 并增加 `option`、`trueValue`、`falseValue`。
- `trueValue` / `falseValue`（E3 落地）：标量 `SchemaValue`，缺省回退 `true` / `false`。runtime 读取后用 `booleanMappingAdapter(trueValue, falseValue)` 做表单值 ↔ 内部布尔值的映射：`in` 判 `Object.is(value, trueValue)`，`out` 按 `checked ? trueValue : falseValue`。
- 半选 `indeterminate` 仍列为后续（与值映射维度正交）。

## 5. 字段分类

- `label`: `value-or-region`
- `option`: `value`
- `trueValue` / `falseValue`: `value`（标量，缺省回退 `true` / `false`）
- `required`: `value`

## 6. regions 与 slot 约定

- `label` 是 field frame 标签。
- `option.label` 是选项文案，不应与外层 field label 混为一谈。

## 7. 运行期状态归属

- 选中值归 form runtime 或 scope。
- 半选 UI 如果加入，应作为局部显示态或由上游显式传入。

## 8. 事件、动作与组件句柄能力

- 交互事件遵循标准字段 `onChange`。
- 不建议为单个 checkbox 单独定义复杂句柄。

## 9. 数据源、表达式、导入能力接入点

- `label`、`option.label`、`disabled` 可接表达式。
- option 本身通常是静态值对象，不需要额外 source 协议。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-checkbox` marker。
- 视觉层复用 `@nop-chaos/ui` Checkbox，并服从 field frame 的组布局规则。

## 11. 实现拆分建议

- 单选布尔值映射、字段状态展示和文案渲染应保持分离。

## 12. 风险、取舍与后续阶段

- 需要持续区分 `checkbox` 与 `switch`：前者强调勾选项，后者强调即时开关。

## 13. 响应式行为

> 适用 `checkbox`、`checkbox-group`、`radio-group`（radio/design.md 未单列，响应式约定合入本节）。引用 `docs/architecture/mobile-responsive-baseline.md`（M0 基线 §3 触摸目标、§10.3 haptics）。

| 断点              | 行为                                                                                                                       | 实现方式                                                                                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| < 768px (mobile)  | 每个选项 Label 触摸目标 ≥ 44px（`min-h-11 py-2`）；`nop-haptic` 按压反馈；checkbox-group/radio-group 选项数 > 3 时纵列堆叠 | renderer 内 `useIsMobile()` 分支：item Label 条件加 `min-h-11 py-2`；wrapper 在 `shouldStackChoicesVertically()` 为真时加 `flex flex-col gap-1` + `data-mobile-stack="true"` |
| ≥ 768px (desktop) | item Label 自然高度（不加 `min-h-11`）；`nop-haptic` 仍启用（desktop `:active` 同样适用，baseline §10.3）；布局不变        | 同上条件分支（仅 mobile 加 touch 类）                                                                                                                                        |

### 触摸适配

- **触摸目标**：mobile 视口下每个 checkbox/switch/radio 选项的 Label wrapper 加 `min-h-11`（44px min-height）+ `py-2` padding 扩展 hit area；视觉上 checkbox/switch/radio 控件本身尺寸不变，hit area 经 Label 扩展。
- **nop-haptic**：所有 choice item Label 无条件加 `nop-haptic`（desktop-safe，与 Button/Card 一致）。
- **小屏纵列布局**：`checkbox-group` / `radio-group` 在 mobile 视口 + 选项数 > 3（`MOBILE_CHOICE_STACK_THRESHOLD`）时自动切 `flex flex-col gap-1` 纵列并发布 `data-mobile-stack="true"` marker；选项 ≤ 3 或 desktop 时保持原布局。schema 无 `inline` 字段（默认即为纵列），未来如新增显式横排模式，mobile 仍以此阈值强制纵列。
- **radio-group-item slot 复用**：radio-group 的 item Label 与 `RadioGroupItem` 原语共享 `data-slot="radio-group-item"` 命名空间（前者为 label wrapper、后者为 radio root），hit area 类加在 Label wrapper 上，不影响原语内部样式。
- **无新 schema surface / 无 mobileUI 标志位**：mobile 分支完全在 renderer 内部，由 `useIsMobile()` 决定。
