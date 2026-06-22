# Flex 组件设计

## 1. 组件定位

- `flex` 是显式的弹性布局 renderer，用来表达一组子节点的主轴、交叉轴和换行规则。
- 它是 `container` 的布局特化版，不承载业务数据语义。
- 它是纯布局原语，不负责 `header` / `body` / `footer` 壳层，也不承担普通内容分组语义。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已支持 `direction`、`wrap`、`align`、`justify`、`gap`。
- 文档建议保留 `items` 作为等价 region 名，以兼容未来更接近设计器的集合式建模。

### Flux 决策表（X5 扩展，E3）

| 能力                                                                                                  | 首版决定       | 理由                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `direction: 'row-reverse' / 'column-reverse'`（反向主轴）                                             | **实现**       | amis flex schema 常见枚举值；Tailwind `flex-row-reverse` / `flex-col-reverse` 一一映射；纯 class 映射无运行时副作用，解锁 amis flex schema 直接迁移。                                               |
| `justify: 'evenly'`（`space-evenly`）                                                                 | **实现**       | 与现有 `between`/`around` 同族；Tailwind `justify-evenly`；两侧等距分布在工具栏/操作组场景常见。                                                                                                    |
| `align: 'baseline'`（基线对齐）                                                                       | **实现**       | 与现有 `start`/`center`/`end`/`stretch` 同族；Tailwind `items-baseline`；文字混排基线对齐是 P2 高频需求。                                                                                           |
| `alignContent?: 'start'\|'center'\|'end'\|'between'\|'around'\|'evenly'\|'stretch'`（多行交叉轴分布） | **实现**       | 与 CSS flex `align-content` 一致；`align` 单行交叉轴、`alignContent` 多行交叉轴（与 CSS 语义一致，见 Decision）；仅在 `wrap` 多行时生效，单行场景无副作用；Tailwind `content-*`。                   |
| amis `flex-item`（per-child flex/basis/grow）                                                         | 不采纳（后续） | per-child 弹性参数需独立子 schema（子节点声明 `flex`/`basis`/`grow`/`order`），与当前 region-only body 模型不同架构；当前可用嵌套 flex + className 组合绕过；归后续独立增强（详见 plan Deferred）。 |
| 自由 `style` 内联样式 prop                                                                            | 不采纳         | 违反 styling contract（`docs/architecture/styling-system.md`）—— layout renderer 仅输出 marker class + 语义字段，不开 style 透传逃逸口。视觉差异应通过 `className` / 设计 token 表达。              |
| amis `draggable`（拖拽排序子项）                                                                      | 不采纳         | `flex` 是纯布局原语，不承载 children 列表的可变性（§7「子节点增删排布应由外部 schema/loader 负责」）；拖拽排序应作为独立组件或设计器能力处理，与 `flex` 解耦。                                      |

**Decision（`alignContent` 与 `align` 语义边界）**：与 CSS flex 一致 —— `align`（单行/单元素交叉轴对齐，Tailwind `items-*`）与 `alignContent`（多行交叉轴整体分布，Tailwind `content-*`）是两条独立的语义轴。单行场景下 `alignContent` 不生效（与 CSS 一致，无回归）；当 `wrap=true` 且内容溢出产生多行时，`alignContent` 控制行间分布。两者并存、互不覆盖。

## 3. Flux 中的 renderer/type 定义

- `type: 'flex'`
- `category: 'layout'`
- `sourcePackage: '@nop-chaos/flux-renderers-basic'`
- 当前 regions: `body`、`items`

## 4. schema 设计

- 当前导出字段为 `direction`（`'row' | 'column' | 'row-reverse' | 'column-reverse'`）、`wrap`、`align`（`'start' | 'center' | 'end' | 'stretch' | 'baseline'`）、`justify`（`'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'`）、`alignContent`（`'start' | 'center' | 'end' | 'between' | 'around' | 'evenly' | 'stretch'`）、`gap`、`className`。
- 推荐正式契约允许 `body` 或 `items` 二选一作为子项集合输入，但对外只保留一个主集合字段更利于长期收敛；当前阶段优先以 `body` 为主、`items` 为兼容 region。
- `alignContent` 仅在 `wrap=true` 且内容溢出产生多行时生效（与 CSS flex `align-content` 一致）；单行场景下不应用 `content-*` class。

## 5. 字段分类

- `direction`、`wrap`、`align`、`justify`、`alignContent`、`gap`: `value`
- `body`、`items`: `region`

## 6. regions 与 slot 约定

- `body` 适合和其他容器保持一致。
- `items` 更适合设计器和未来工具链的显式布局集合语义。
- 实现上不应同时要求两个 region 都有值。

## 7. 运行期状态归属

- `flex` 不维护内部交互状态。
- 子节点增删排布应由外部 schema/loader 负责，而不是在布局组件里维护可变 children 列表。

## 8. 事件、动作与组件句柄能力

- 首版无需专用事件。
- 拖拽排序等高级能力应作为独立组件或设计器能力处理，而不是加进 `flex`。

## 9. 数据源、表达式、导入能力接入点

- 布局字段支持表达式值。
- 动态子项推荐由 `dynamic-renderer`、loader 或上游迭代机制产出最终 region 内容。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-flex` marker。
- `direction`/`justify`/`align`/`alignContent` 是布局语义，不应再发明第二套 `flexMode` 或 `layoutMode` 命名。
- 枚举到 Tailwind class 的映射：`direction: row-reverse → flex-row-reverse`、`column-reverse → flex-col-reverse`；`justify: evenly → justify-evenly`；`align: baseline → items-baseline`；`alignContent: *` → `content-*`（如 `content-center`/`content-between`）。

## 11. 与其他容器的边界

- 与 `container`：需要纯布局控制时用 `flex`；需要普通内容壳层或三段式 slot 时用 `container`。
- 与 `fragment`：需要无 UI 结构分组时用 `fragment`；需要真实布局盒模型时用 `flex`。
- 与 `fieldset`：`fieldset` 是表单语义分组；`flex` 只负责布局，可作为 `fieldset.body` 内部的行布局工具。

## 12. 实现拆分建议

- 布局 class 计算应在工具层完成。
- renderer 本体只负责 root 和 child region 渲染。

## 13. 风险、取舍与后续阶段

- `body` 和 `items` 的双 region 需要后续收敛为更清晰的外部契约。
- 响应式断点支持应与全局 styling system 一起设计，不宜让 `flex` 单独扩展。
- 要避免因为 `container` 也支持部分布局字段，就把 `flex` 降级成“可有可无的别名”。两者必须继续保持“纯布局”与“内容壳层”的边界。

## 14. 响应式行为

> 响应式基线规范见 `docs/architecture/mobile-responsive-baseline.md`。
>
> 实现落地于 M3b（`docs/plans/2026-06-23-0410-1-m3-container-and-layout-responsive-plan.md`）。采用 **per-breakpoint 字段**（`responsiveDirection` / `responsiveWrap`），实现走 Tailwind 响应式类（baseline §7 主力策略）；容器查询仅在 Tailwind 类无法表达时启用（当前不需要）。

### 断点字段约定

`flex` 与 `container` 共享同一断点字段约定（见 `container/design.md` §16）：

- 断点 key：`sm` / `md` / `lg` / `xl` / `2xl`（对齐 Tailwind v4 默认断点）。
- `responsiveDirection?: { sm?, md?, lg?, xl?, '2xl'? }: FlexDirection`：per-breakpoint 主轴方向，覆盖 base `direction`。
- `responsiveWrap?: { sm?, md?, lg?, xl?, '2xl'? }: boolean`：per-breakpoint 换行。`true` → `<bp>:flex-wrap`、`false` → `<bp>:flex-nowrap`。
- 缺省（无字段）输出与改动前完全一致（无回归）。

### 类映射

| 字段                       | base 输出          | responsive 输出（每断点）               |
| -------------------------- | ------------------ | --------------------------------------- |
| `direction: 'column'`      | `flex-col`         | `sm:flex-col` / `md:flex-row` / ...     |
| `direction: 'row-reverse'` | `flex-row-reverse` | `lg:flex-row-reverse` / ...             |
| `wrap: true`               | `flex-wrap`        | `md:flex-wrap` / `sm:flex-nowrap` / ... |

实现位置：`packages/flux-renderers-basic/src/utils.ts` `resolveResponsiveDirection` / `resolveResponsiveWrap`，输出顺序固定 `sm → md → lg → xl → 2xl`，`cn()`（tailwind-merge）保证 base 与断点类不冲突。

### 示例：小屏纵列、桌面行

```json
{
  "type": "flex",
  "direction": "column",
  "responsiveDirection": { "md": "row" },
  "gap": "md",
  "body": [
    { "type": "text", "text": "Card A" },
    { "type": "text", "text": "Card B" }
  ]
}
```

输出类：`nop-flex flex-col md:flex-row gap-md`。小屏（<768px）纵列堆叠，桌面（≥768px）行排列。

### 触摸适配

- 触摸目标：`flex` 是纯布局原语，触摸目标由子组件负责（baseline §3）。
- 手势：`flex` 不消费手势。
- 软键盘：`flex` 不消费 `VisualViewport`（footer fixed 栏的处理在 `page` renderer，见 `page/design.md` §13）。

### Decision（容器查询延后）

baseline §7 标「容器查询为辅助/未来」。M3b 需求（per-breakpoint direction/wrap）完全由 Tailwind 响应式类表达，因此**不引入 `@container`**。未来若出现「父容器宽度」驱动的自适应（与视口宽度解耦），再评估容器查询。
