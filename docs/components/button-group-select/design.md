# Button Group Select 组件设计

## 1. 组件定位

- `button-group-select` 是按钮组形态的选择字段控件（AMIS button-group-select 的 flux 实现）。
- single 模式等价「按钮形态的 radio-group」；multiple 模式等价「按钮形态的 checkbox-group」。
- 适合少量选项的直接展示与快速切换（如角色授权的 siteId 选择），不负责下拉式大数据选择。

## 2. 与 AMIS 或既有产品的能力对照

### Flux 决策表

| AMIS / 候选能力                        | 价值评估 | Flux 决策 | 理由                                                                                                                                                                                 |
| -------------------------------------- | -------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `options` (`{label, value}`)           | 核心     | **实现**  | 选项集合字段契约；与 radio-group/checkbox-group 共用 `ChoiceOption` 归一化（`sanitizeChoiceOptions`）。                                                                              |
| `multiple`                             | 核心     | **实现**  | multiple=true 时值为 `string[]`（`checkboxGroupAdapter` 保数组身份），点击 toggle；single 时值为标量 option.value（`choiceSingleAdapter` 值保真，number/boolean 选中态 echo 正确）。 |
| `direction`                            | 常用     | **实现**  | `horizontal`/`vertical` 布局方向。                                                                                                                                                   |
| `dict`                                 | 常用     | **实现**  | 字典名经 `env.loadDict` 解析（INV-1 边界，与 select.dict 同语义）；加载失败展示 error 槽（`button-group-select-error` role=alert）。                                                 |
| amis `option` 数组旧语法               | 低       | 不采纳    | 统一扁平 `options: [{label, value}]`，不保留 amis 旧别名。                                                                                                                           |
| `optionType`/`btnActiveLevel` 视觉变体 | 低       | 后续      | 视觉字段，归独立增强（不改值契约）。                                                                                                                                                 |

## 3. Flux 中的 renderer/type 定义

- `type: 'button-group-select'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 注册定义：`packages/flux-renderers-form/src/renderers/input.tsx`（fields: options/multiple/direction/dict）
- 渲染器：`packages/flux-renderers-form/src/renderers/button-group-select-renderer.tsx`
- `componentCapabilityContracts: ['focus']`（FOCUS_ONLY_METHODS）

## 4. schema 设计

- 继承 `InputSchema` 并增加：
  - `options`: `SelectOptionsValue`（source-enabled value，`allowSource`）
  - `multiple`: `boolean`，缺省 `false`
  - `direction`: `'horizontal' | 'vertical'`，缺省 `horizontal`
  - `dict`: `string`，字典名（经 `env.loadDict` 解析，缺省无）
- `options` 与 `dict` 互斥语义：`dict` 优先（与 select 一致）。

## 5. 字段分类

- `label`: `value-or-region`
- `options`: `value`（allowSource）
- `multiple` / `direction` / `dict`: `value`（标量 prop）

## 6. regions 与 slot 约定

- 不开放 option 级 schema slot；选项内容为扁平 `{label, value}` 标量。

## 7. 运行期状态归属

- 选中值归 form runtime（single 标量 / multiple 数组）。
- hover/按压视觉状态归 UI 组件（`@nop-chaos/ui` Button/ButtonGroup）本地处理。

## 8. 事件、动作与组件句柄能力

- 主要交互：item `onClick` → toggle（multiple 增删 / single 替换）→ `handlers.onChange`。
- `onFocus`/`onBlur` 走 field handlers；item 按钮原生键盘（Enter/Space 触发 click）。
- X1 起落地 `component:focus` handle；不暴露 clear/reset。

## 9. 数据源、表达式、导入能力接入点

- `options` 具备 source-enabled 能力（`optionsSourceState`：loading/error 槽）。
- `dict` 经 `env.loadDict`（INV-1 IO 边界），`useDictOptions` generation 守卫防竞态。

## 10. 样式与 DOM marker 约定

- 根节点 marker `nop-button-group-select` + `data-slot="button-group-select-wrapper"`。
- 选项容器 `[data-slot="button-group-select-options"][role="group"]`。
- 每项 `[data-slot="button-group-select-item"]`，选中态 `data-selected` + `aria-pressed`。
- loading 槽 `[data-slot="button-group-select-loading"]` role=status；error 槽 `[data-slot="button-group-select-error"]` role=alert。
- 视觉层复用 `@nop-chaos/ui` ButtonGroup/Button；widget 自样式。

## 11. 实现拆分建议

- 选项归一化（`sanitizeChoiceOptions`）与 dict 加载（`useDictOptions`）为族内共享模块（与 select/radio-group/checkbox-group 共用）。

## 12. 风险、取舍与后续阶段

- form 内 Enter 提交排除：item 为原生 `role="button"` 按钮，已含于 C2.1 排除清单（无需扩展）。
- 大数据选项不适用（无虚拟滚动）；大集合请用 `select` + `virtual`。
- 避免把「分组/搜索/自定义按钮内容」叠加进本组件（选 select 组合能力）。

## 13. 响应式行为

引用 `docs/architecture/mobile-responsive-baseline.md`（M0 基线 §3 触摸目标、§10.3 haptics）。

| 断点              | 行为                                                            | 实现方式                                              |
| ----------------- | --------------------------------------------------------------- | ----------------------------------------------------- |
| < 768px (mobile)  | ButtonGroup 横向可能溢出 → 依赖 Button 自身 touch 目标（≥44px） | Button/ButtonGroup 由 `@nop-chaos/ui` 提供 touch 基线 |
| ≥ 768px (desktop) | 按钮自然尺寸，direction 按 schema                               | 同上                                                  |

> 注：本组件无独立 mobile 分支（2026-08-02 注册时点），与 select 的移动端 sheet 不同；触摸基线依赖 ui 层 Button。
