# Container 组件设计

## 1. 组件定位

- `container` 是通用内容壳层 renderer，用来承接普通内容分组、轻量 section 包装，以及 `header` / `body` / `footer` 三段式内容组织。
- 它不是 page root、form owner、surface、tabs 或纯布局原语的替代品。
- 它的最佳心智模型是：有最小容器语义，但不拥有独立运行时状态，也不自带 card/panel 视觉协议。

## 2. 容器家族分工

Flux 中常见容器类 renderer 的职责应保持分层明确：

| 类型                | 家族角色                 | 主要职责                                            | 不应替代                |
| ------------------- | ------------------------ | --------------------------------------------------- | ----------------------- |
| `page`              | shell owner              | 页面根壳层、page runtime 边界                       | 普通内容分组            |
| `form`              | semantic lifecycle owner | form runtime、校验、提交、values/status publication | 通用布局壳层            |
| `dialog` / `drawer` | surface owner            | 弹层 surface open-state 与 host stack               | 页面内普通容器          |
| `tabs`              | interaction owner        | 互斥面板切换与激活态                                | 静态 section 容器       |
| `fieldset`          | semantic group container | 表单字段分组、`<fieldset>/<legend>` 语义            | 通用内容包装            |
| `flex`              | pure layout container    | 主轴/交叉轴/justify/wrap/gap 布局                   | header/body/footer 壳层 |
| `fragment`          | no-UI structural node    | `when` / `data` / `isolate` 的结构分组              | 有 UI 容器              |
| `container`         | semantic content shell   | 普通内容壳层、三段式区域、轻量内容分组              | 上述所有专门容器        |

作者选型规则：

- 需要页面根节点，用 `page`。
- 需要表单 owner，用 `form`。
- 需要弹层，用 `dialog` 或 `drawer`。
- 需要 tab 切换，用 `tabs`。
- 需要表单分组，用 `fieldset`。
- 需要纯布局控制，用 `flex`。
- 需要无 UI 结构分组，用 `fragment`。
- 需要普通内容壳层或 `header` / `body` / `footer` 结构时，才用 `container`。

## 3. 与 AMIS 或既有产品的能力对照

- 当前实现已支持 `direction`、`wrap`、`align`、`gap` 以及 `header` / `body` / `footer` 三段式区域。
- Flux 不把 `container` 设计成历史 panel/card 的全集兼容层。更复杂的视觉壳层、响应式断点和装饰能力应交给样式系统或更专门的 renderer。
- `container` 可以承接 card-like 包装，但它本身不是 `Card` renderer，也不默认提供 card padding、分割线或视觉变体协议。

## 4. Flux 中的 renderer/type 定义

- `type: 'container'`
- `category: 'layout'`
- `sourcePackage: '@nop-chaos/flux-renderers-basic'`
- 当前 regions: `header`、`body`、`footer`

## 5. schema 设计

当前 live schema：

```ts
interface ContainerSchema extends BaseSchema {
  type: 'container';
  direction?: 'row' | 'column';
  wrap?: boolean;
  align?: 'start' | 'center' | 'end' | 'stretch';
  gap?: number | string;
  body?: BaseSchema[];
  header?: BaseSchema[];
  footer?: BaseSchema[];
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
}
```

设计原则：

- 保留 `header`、`body`、`footer` 作为显式 regions，确保它与 `flex` 和 `fragment` 的边界清楚。
- 保留 `bodyClassName`、`headerClassName`、`footerClassName` 作为 inner-slot 样式入口，避免把所有控制都挤到 root `className`。
- 不为 `container` 添加 `padding`、`variant`、`collapsible` 之类会把它推向专门壳层组件的字段，除非已有更高优先级 owner doc 明确要求。

## 6. 字段分类

- `direction`、`wrap`、`align`、`gap`: `value`
- `header`、`body`、`footer`: `region`
- `bodyClassName`、`headerClassName`、`footerClassName`: 样式 value
- `visible`、`hidden`、`className`: `meta` 或基础样式字段

## 7. regions 与 slot 约定

- `body` 是默认主内容区。
- `header`、`footer` 是可选结构化 slots，用于标题区、摘要区、状态区、工具补充区等轻量内容壳层需求。
- 需要更复杂的头部工具条、分页壳层、可关闭标签或弹层行为时，应使用更专门的 renderer，而不是继续扩 `container`。

## 8. 默认布局基线

`container` 的默认基线应与 `docs/architecture/container-spacing-design.md` 保持一致：

- `container-body` 默认是纵向内容流，带默认 `gap`
- `container-header` 与 `container-footer` 默认只提供与 body 的分隔间距
- `container` 默认没有 `padding`

这组基线表达的是：

- `container` 是内容分组容器，所以应有最小的内部节奏
- `container` 不是 card/panel 视觉组件，所以不应默认长出内边距或固定 chrome

如果作者需要 card-like 内边距，应显式使用 `className: "p-4"` 或 slot `className`。不要把“看起来像卡片”误读为“应该有默认 padding”。

## 9. 运行期状态归属

- `container` 不创建 scope，也不维护独立 owner 状态。
- 可见性、禁用态和样式都由 resolved meta 或 resolved props 决定。
- 如果后续出现折叠、展开、打开态、激活态等交互诉求，应优先判断是否已经属于 `collapse`、`dialog`、`drawer`、`tabs` 等专门容器的职责。

## 10. 事件、动作与组件句柄能力

- 首版不需要专用句柄。
- `container` 不应演变为通用 imperative 容器。
- 如果未来确有焦点管理、滚动定位等通用能力，应先判断它是否属于更高层 host/inspect 体系，而不是直接给 `container` 增加私有 handle。

## 11. 数据源、表达式、导入能力接入点

- `direction`、`align`、`gap` 可按普通值通道支持表达式。
- 子内容的动态装配通过 `body` region 和外部 loader 解决。
- `container` 不应自行发明数据请求、异步装配或 owner 级状态 publication 协议。

## 12. 样式与 DOM marker 约定

- 根节点保留 `nop-container` marker。
- renderer 只负责输出最小语义类；默认 spacing 基线来自 package CSS，不来自 renderer 组件代码内硬编码 Tailwind。
- root `className` 作用于 `.nop-container` 本身；body/header/footer 的内层样式应优先通过对应 slot `className` 控制。
- `container.align` 在当前 live 实现中是内容整体摆放语义，不是 `flex` 的完整双轴模型：
  - `center` 同时映射内容的水平/垂直居中
  - `start` / `end` 是内容整体靠起始/结束侧
  - 若需要主轴与交叉轴精细分离控制，应改用 `flex`

## 13. 与其他容器的边界

### 13.1 与 `flex`

- `flex` 是纯布局原语；`container` 是内容壳层。
- 需要 `justify`、严格主轴/交叉轴控制、工具条/行布局/网格替代时，用 `flex`。
- 需要 `header` / `body` / `footer` 或普通 section 包装时，用 `container`。

### 13.2 与 `fragment`

- `fragment` 是无 UI 结构分组；`container` 是有容器语义的内容壳层。
- 只是想统一挂 `when`、`data`、`isolate` 时，用 `fragment`。
- 需要真实内容包裹语义时，才用 `container`。

### 13.3 与 `fieldset`

- `fieldset` 是表单字段分组容器，使用 `<fieldset>/<legend>` 语义。
- `container` 不是表单语义分组，不负责字段分组、折叠表单区块或 form mode 语义。

### 13.4 与 `page` / `form`

- `page`、`form` 都是 owner 级容器；`container` 只是普通内容壳层。
- 不要用 `container` 模拟页面根壳层或表单 owner。

### 13.5 与 `tabs` / `dialog` / `drawer`

- `tabs`、`dialog`、`drawer` 都有明确交互状态轴。
- `container` 不负责互斥面板、surface open-state 或 host stack 行为。

## 14. 实现拆分建议

- 布局值解析逻辑放在独立工具文件。
- renderer 本体只负责组装 `header` / `body` / `footer`、slot `className` 和根容器属性。
- 不把 card-like 视觉协议、surface-like 状态桥接或 form-like owner 逻辑混回 `container.tsx`。

## 15. 风险、取舍与后续阶段

- `container` 最容易被误用成“什么都能包的视觉组件全集”；owner doc 需要持续强调它只是通用内容壳层。
- `container` 同时支持轻量布局语义和 slot 壳层，已经覆盖不少日常场景；继续扩字段前，必须先证明 `flex`、`fragment`、`fieldset`、`card`、`collapse` 等边界无法承接。
- 响应式专属 DSL、真正的 `Card` renderer、以及更强的 panel/collapse 协议，应在独立家族里设计，而不是继续堆到 `container` 上。

## 16. 响应式行为

> 响应式基线规范见 `docs/architecture/mobile-responsive-baseline.md`。
>
> 实现落地于 M3b（`docs/plans/2026-06-23-0410-1-m3-container-and-layout-responsive-plan.md`）。`container` 与 `flex` 同源解析 `direction`/`wrap`/`align`/`gap`，**共享同一 per-breakpoint 字段约定**（实现复用 `packages/flux-renderers-basic/src/utils.ts` 的 `resolveResponsiveDirection` / `resolveResponsiveWrap`）。

### 断点字段约定

- 断点 key：`sm` / `md` / `lg` / `xl` / `2xl`（对齐 Tailwind v4 默认断点）。
- `responsiveDirection?: { sm?, md?, lg?, xl?, '2xl'? }: ContainerDirection`（即 `'row' | 'column'`，比 `flex` 少 reverse 枚举，对齐 §5 schema 现状）：per-breakpoint 主轴方向，覆盖 base `direction`。
- `responsiveWrap?: { sm?, md?, lg?, xl?, '2xl'? }: boolean`：per-breakpoint 换行。
- 缺省（无字段）输出与改动前完全一致（无回归）。

### 启用条件（data-flex body）

`container` 默认 body 是普通块流；仅当配置了任一布局字段（`direction` / `wrap` / `align` / `gap` / `responsiveDirection` / `responsiveWrap`）时，body 才切到 flex 容器（`data-slot="container-body" data-flex=""`）。M3b 扩展了 `useFlexChild` 判定：`hasResponsive`（任一 responsive 类输出）也触发 flex body，避免「只配 responsiveDirection 但 body 没切 flex」导致响应式类不生效。

### 类映射（与 `flex` 一致）

| 字段                  | base 输出   | responsive 输出（每断点）               |
| --------------------- | ----------- | --------------------------------------- |
| `direction: 'column'` | `flex-col`  | `sm:flex-col` / `md:flex-row` / ...     |
| `wrap: true`          | `flex-wrap` | `md:flex-wrap` / `sm:flex-nowrap` / ... |

### 示例：小屏纵列、桌面行

```json
{
  "type": "container",
  "direction": "column",
  "responsiveDirection": { "md": "row" },
  "body": [
    { "type": "text", "text": "Column A" },
    { "type": "text", "text": "Column B" }
  ]
}
```

输出类（body div）：`flex flex-col md:flex-row`。

### 触摸适配

- 触摸目标：`container` 是内容壳层，触摸目标由子组件负责（baseline §3）。
- 手势：`container` 不消费手势。
- 软键盘：`container` 不消费 `VisualViewport`。

### Decision（与 `flex` 共享断点字段）

`container` 与 `flex` 都解析 `direction`/`wrap`/`align`/`gap`（见 `container.tsx:8-69`、`flex.tsx`）。M3b 显式让二者共享同一 `responsiveDirection`/`responsiveWrap` 字段约定，避免读者在两个组件之间切换时需要学习两套断点 DSL。`container` 的 `responsiveDirection` 枚举更窄（仅 `'row' | 'column'`，无 reverse），反映 `container` 作为内容壳层不承担反向布局语义的现状。
