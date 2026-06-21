# Page 组件设计

## 1. 组件定位

- `page` 是页面级根 renderer，用来承接 page runtime、页面标题和页面级 regions。
- 它是 `SchemaRenderer` 在业务页面场景下的首选根节点，而不是普通布局容器的放大版。
- 它不是 `container` 的语义增强写法，也不应被 `container` 替代。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已落地的最小能力是 `title` 和 `body`，并已经在 renderer 定义中预留 `header`、`footer` regions。
- 面包屑、页面级 toolbar、生命周期事件和路由协作仍应作为后续阶段补齐，而不是在首版文档里发散出私有协议。

### Flux 决策表（X5 扩展，E3）

| 能力                                                                         | 首版决定               | 理由                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aside?: BaseSchema[]` region（侧边栏布局）                                  | **实现**               | amis page 管理布局迁移的单点最大缺口；与 `body` 并列作为页面侧栏 region，DOM marker `data-slot="page-aside"`；`asidePosition?: 'left' \| 'right'`（缺省 `left`）控制左右；`asideClassName?` 开放样式；空 aside 折叠（不渲染占位列，见 Decision）。 |
| `asidePosition?: 'left' \| 'right'`                                          | **实现**               | 上述 aside region 的方向补充；缺省 `left`，配 `right` 时 aside 在 body 之后（DOM 顺序与视觉顺序一致，便于响应式堆叠）。                                                                                                                            |
| `subTitle?: string`（标题副文案）                                            | **实现**               | 与 `title` 并列的副标题文本，DOM marker `data-slot="page-subtitle"`；纯文本（非 region），避免与 `title` 的 value-or-region 双轨；如需富文本副标题走 `title` region 自定义。                                                                       |
| `remark?: string`（标题旁 Tooltip info）                                     | **实现**               | amis page `remark` 同义；标题旁渲染 info 图标 + `@nop-chaos/ui` Tooltip，DOM marker `data-slot="page-remark"`；hover/focus 显示说明文本，纯文本输入。                                                                                              |
| amis `initApi` / `initFetch` / `interval` / `silentPolling`（页面请求/轮询） | 不采纳                 | Flux 请求下沉 data-source（设计原则 §4「请求下沉」+ plan Non-Goals）；页面级异步装配应落在 `loader`、page runtime 或 `data-source`，page renderer 自身不承担请求型职责（§9 同义）。                                                                |
| amis `toolbar` 独立 region                                                   | 不采纳                 | 当前 `header` region 已 subsume toolbar 用途（amis 同时有 `header` 和 `toolbar` 是历史包袱，本仓库 `header` 渲染为 `data-slot="page-toolbar"` 已涵盖）；新增平行 region 增加契约面而无新能力，归 Deferred。                                        |
| amis `pullRefresh`（下拉刷新）                                               | 归 `mobile-roadmap.md` | 移动端原生交互；归 `flux-renderers-mobile`（mobile-roadmap M3a 已显式列出依赖「改进 roadmap page aside 落地」，本 plan 解锁该依赖）。                                                                                                              |
| amis `css` / `cssVars`（页面级自定义 CSS）                                   | 不采纳                 | 违反 styling contract（`docs/architecture/styling-system.md`）；视觉差异走 `className` / 设计 token，不开运行时 CSS 注入逃逸口（安全 + 可静态分析）。                                                                                              |

**Decision（aside 布局与空 aside 折叠）**：aside 与 body 用 CSS flex 双列布局（aside 左/右、body 占主区）；`asidePosition: 'right'` 时 aside DOM 顺序在 body 之后（视觉在右）。空 aside 折叠：当 `aside` region 配了但实际渲染为空（无子节点或子节点全部 resolved 为空），不渲染 `data-slot="page-aside"` 列，避免空白侧栏占位。该判定复用 `hasRendererSlotContent`（与现有 title/header/footer 折叠逻辑一致）。

## 3. Flux 中的 renderer/type 定义

- `type: 'page'`
- `category: 'layout'`
- `sourcePackage: '@nop-chaos/flux-renderers-basic'`
- 当前 field metadata: `title` 为 `value-or-region`，regions 为 `body`、`header`、`footer`
- `type: 'page'` 是 schema-visible page shell renderer；根级 `PageRuntime` 由 host / `SchemaRenderer` 创建，不是由 `page` renderer 自己创建第二份 runtime

## 4. schema 设计

- 建议正式字段为 `title`、`subTitle`、`remark`、`header`、`body`、`aside`、`asidePosition`、`footer`、`data`。
- 当前 `packages/flux-renderers-basic/src/schemas.ts` 导出 `PageSchema` 含 `title?`、`subTitle?`、`remark?`、`body?`、`header?`、`footer?`、`aside?`、`asidePosition?`（`'left' | 'right'`，缺省 `left`）、`asideClassName?`、`bodyClassName?`、`headerClassName?`、`footerClassName?`、`toolbarClassName?`、`statusPath?`。
- `aside?: BaseSchema[]` 是侧边栏 region，与 `body` 并列；`asidePosition` 控制 DOM 顺序（`left` 在 body 前，`right` 在 body 后）；空 aside（`aside: []`）折叠不渲染。
- `subTitle?: string` 是标题旁副文案（纯文本，非 region）；`remark?: string` 是标题旁 Tooltip info（hover/focus 显示，纯文本）。
- 如果后续 page lifecycle 进入 schema-visible 契约，目标上应优先增加 `statusPath` 一类只读状态摘要发布字段，而不是把 child owner 状态都上卷到 page。

## 5. 字段分类

- `title`: `value-or-region`
- `subTitle`: `value`（纯文本字符串）
- `remark`: `value`（纯文本字符串）
- `data`: `value`
- `header`、`body`、`footer`、`aside`: `region`
- `asidePosition`: `value`（`'left' | 'right'`）
- `className`、`classAliases`、`visible`、`disabled`: 继承 `BaseSchema` 元字段

## 6. regions 与 slot 约定

- `body` 是页面主内容区。
- `header` 和 `footer` 是页面壳层级区域，不应与业务内容中的普通 panel header 混用。
- `title` 若使用 schema 片段，应由编译器转换为匿名 title region，而不是在 renderer 内重新递归解析原始 schema。

## 7. 运行期状态归属

- `page` 自身不维护复杂交互状态。
- 页面级数据归属 `PageRuntime` 和当前根 scope，不应在 renderer 内再创建第二份本地状态树。
- `page.data` 的目标语义是 page root scope 的初始化 patch，而不是第二套局部 props 系统。
- 目标设计中，`page` 只拥有 page shell 自己的状态，例如 initializing / refreshing / route readiness。
- `page` 不应成为 dialog、drawer、form、table、source 这些更具体 owner 的统一状态桶。
- 如果未来需要 schema-visible page shell 状态，外部读取仍应优先通过 `statusPath`；是否增加局部 `$page` 绑定，应等 page lifecycle 语义真正稳定后再决定。

## 8. 事件、动作与组件句柄能力

- 当前没有专用 page 句柄。
- 后续如果需要页面刷新、导航或标题同步，优先走 page runtime 或宿主 action，不建议给 `page` 增加过宽的 imperative API。
- page 若未来提供状态读面，也应保持 data-only summary，不暴露底层 runtime/store。

## 9. 数据源、表达式、导入能力接入点

- `title` 支持表达式和值片段。
- `data` 初始化 page root scope，page subtree 默认继承该 root scope。
- 页面级异步装配应落在 loader、page runtime 或 `data-source`，不应把 `page` 本身设计成请求型组件。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-page` 语义 marker。
- 页面布局、间距和背景来自 schema 样式字段，不应在 renderer 内硬编码页面专属 spacing 规则。
- DOM marker：`data-slot="page-header"`（标题区，含 title + subTitle + remark）、`data-slot="page-subtitle"`（副文案 span）、`data-slot="page-remark"`（Tooltip 触发 button）、`data-slot="page-toolbar"`（header region 内容）、`data-slot="page-body"`（body region）、`data-slot="page-aside"`（aside region）、`data-slot="page-footer"`（footer region）。
- aside 与 body 是 DOM 兄弟节点（aside 在前当 `asidePosition: 'left'`，在后当 `'right'`）；视觉两列布局由 schema `className`（如 `flex`）或全局 CSS 控制。

## 11. 与其他容器的边界

- `page` 是 shell owner；`container` 只是普通内容壳层。
- 页面内的普通 section、卡片包裹、说明区块应使用 `container` 或更专门的内容 renderer，而不是继续嵌套多个 `page`。
- `page` 不负责替代 `form`、`tabs`、`dialog`、`drawer` 这些更窄 owner 语义。

## 12. 实现拆分建议

- `schemas.ts` 维护 `PageSchema`。
- `index.tsx` 维护 renderer definition。
- `page.tsx` 只消费 `props`、`regions` 和 page runtime hook。

## 13. 移动端响应式行为

> 响应式基线规范见 `docs/architecture/mobile-responsive-baseline.md`

| 断点              | header region          | footer region          | body           | aside            |
| ----------------- | ---------------------- | ---------------------- | -------------- | ---------------- |
| < 640px (default) | 顶部固定，安全区域适配 | 底部固定，安全区域适配 | 全宽，无边距   | 折叠，触发式滑出 |
| ≥ 640px (sm)      | 内联，可选固定         | 可选固定               | 两侧留白       | 可选内联或滑出   |
| ≥ 768px (md+)     | 内联                   | 内联                   | 居中 max-width | 侧边栏常显       |

### 移动端 header region 约定

- **定位**：`position: sticky; top: 0` + `padding-top: env(safe-area-inset-top)`
- **内容**：左侧返回按钮（可选）+ 居中标题 + 右侧操作
- **高度**：44px（不含安全区域）
- **z-index**：高于 body 但低于 dialog overlay

### 移动端 footer region 约定

- **定位**：`position: fixed; bottom: 0` + `padding-bottom: env(safe-area-inset-bottom)`
- **内容**：操作按钮栏（如购物车结算、商品详情底部操作栏）
- **高度**：48px（不含安全区域）
- **确保**：body 区域 `padding-bottom` 至少等于 footer 高度，避免内容被遮挡

### 触摸适配

| 控件            | 触摸目标  |
| --------------- | --------- |
| header 返回按钮 | 44×44px   |
| footer 操作按钮 | 48px 高度 |

## 14. 移动端骨架模式（复合模式，非独立组件）

> 来源：`docs/analysis/2026-06-21-flux-vs-vant-full-comparison.md` §4 + mobile-roadmap M3a 修订（2026-06-21）。
>
> **关键决策**：Tabbar / NavBar / ActionBar / SubmitBar / Sticky 这 5 类移动端页面骨架**不新增独立 renderer**，统一用 `page.header` / `page.footer` region + 现有组件（`flex` / `button` / `container`）+ 标准 schema 模板表达。这符合 Flux "page region 复用 + 同组件同属性" 策略。
>
> **重要澄清**：Tabbar ≠ `tabs`。`tabs`（`flux-renderers-basic`）是**内容切换控件**（切换同一页面内的面板）；Tabbar 是**路由级导航**（切换页面，配 `navigate` action）。二者语义不同，不可混用。

### 14.1 Tabbar（底部路由导航）

对应 Vant `van-tabbar` / `van-tabbar-item`。固定在 `page.footer`，点击触发页面跳转。

> className 中的 `nop-safe-bottom` / `nop-haptic` 见 baseline §10（M0.1）。`navigate` args 字段为 `url`（跳转）/ `replace`（替换历史）/ `back`（后退），见 `flux-core` `NavigateActionArgs`。

```json
{
  "type": "page",
  "footer": {
    "type": "flex",
    "justify": "around",
    "className": "nop-tabbar fixed bottom-0 inset-x-0 nop-safe-bottom bg-background border-t",
    "items": [
      {
        "type": "button",
        "variant": "ghost",
        "className": "flex-col h-14 w-16 nop-haptic",
        "label": "首页",
        "icon": "home",
        "onClick": { "action": "navigate", "args": { "url": "/home" } }
      },
      {
        "type": "button",
        "variant": "ghost",
        "className": "flex-col h-14 w-16 nop-haptic",
        "label": "分类",
        "icon": "grid",
        "onClick": { "action": "navigate", "args": { "url": "/category" } }
      }
    ]
  },
  "body": { "type": "container", "body": "/* 当前页内容 */" }
}
```

- **active 态**：不应依赖"navigate 后新页面 schema 决定"——Tabbar 是同一段 schema 在多个页面复用，active 项应由**当前页路径**驱动。推荐用表达式 className：`className: "flex-col h-14 w-16 nop-haptic ${currentPath === '/home' ? 'text-primary' : ''}"`，或由 `page` 发布 `statusPath` 让 Tabbar 读取。具体表达式语法待 M3a 实现时落地。
- 红点角标：在 `button` 外包 `badge`。
- 与 `tabs` 的区别重申：Tabbar 切页面（navigate），`tabs` 切面板（同页面 region）。

### 14.2 NavBar（顶部返回栏）

对应 Vant `van-nav-bar`。固定在 `page.header`，左侧返回 + 居中标题 + 右侧操作。

> `navigate { back: true }` = 浏览器/宿主路由后退（`NavigateActionArgs.back`）。

```json
{
  "type": "page",
  "header": {
    "type": "flex",
    "justify": "between",
    "align": "center",
    "className": "nop-navbar sticky top-0 h-11 px-2 nop-safe-top bg-background",
    "items": [
      {
        "type": "button",
        "variant": "ghost",
        "icon": "arrow-left",
        "className": "w-11 h-11 nop-haptic",
        "onClick": { "action": "navigate", "args": { "back": true } }
      },
      { "type": "text", "text": "页面标题", "className": "flex-1 text-center font-medium" },
      {
        "type": "button",
        "variant": "ghost",
        "label": "更多",
        "className": "w-11 h-11 nop-haptic"
      }
    ]
  },
  "body": { "type": "container", "body": "/* */" }
}
```

### 14.3 ActionBar（商品详情底部操作栏）

对应 Vant `van-action-bar` / `van-action-bar-icon` / `van-action-bar-button`。固定在 `page.footer`，左侧图标按钮组（客服/收藏）+ 右侧大号 CTA（加购/立即购买）。

```json
{
  "type": "page",
  "footer": {
    "type": "flex",
    "align": "center",
    "className": "nop-action-bar fixed bottom-0 inset-x-0 h-14 nop-safe-bottom bg-background border-t",
    "items": [
      {
        "type": "flex",
        "direction": "col",
        "align": "center",
        "className": "w-14",
        "items": [
          { "type": "icon", "icon": "customer-service", "className": "nop-haptic" },
          { "type": "text", "text": "客服", "className": "text-xs" }
        ]
      },
      {
        "type": "flex",
        "direction": "col",
        "align": "center",
        "className": "w-14",
        "items": [
          { "type": "icon", "icon": "star", "className": "nop-haptic" },
          { "type": "text", "text": "收藏", "className": "text-xs" }
        ]
      },
      {
        "type": "button",
        "variant": "solid",
        "label": "加入购物车",
        "className": "flex-1 h-12 nop-haptic"
      },
      {
        "type": "button",
        "variant": "solid",
        "label": "立即购买",
        "className": "flex-1 h-12 nop-haptic bg-red-500"
      }
    ]
  },
  "body": { "type": "container", "body": "/* 商品详情 */" }
}
```

### 14.4 SubmitBar（购物车结算栏）

对应 Vant `van-submit-bar`。固定在 `page.footer`，全选复选 + 价格展示 + 结算 CTA。

```json
{
  "type": "page",
  "footer": {
    "type": "flex",
    "align": "center",
    "justify": "between",
    "className": "nop-submit-bar fixed bottom-0 inset-x-0 h-14 nop-safe-bottom bg-background border-t px-3",
    "items": [
      { "type": "checkbox", "label": "全选", "name": "selectAll" },
      {
        "type": "flex",
        "align": "center",
        "items": [
          { "type": "text", "text": "合计：", "className": "text-sm" },
          { "type": "text", "text": "¥199.00", "className": "text-red-500 font-bold" }
        ]
      },
      {
        "type": "button",
        "variant": "solid",
        "label": "结算(3)",
        "className": "h-12 px-6 nop-haptic bg-red-500"
      }
    ]
  },
  "body": { "type": "container", "body": "/* 购物车列表 */" }
}
```

### 14.5 Sticky（吸顶容器）

对应 Vant `van-sticky`。不是 page region，是任意内容容器加 sticky className。分类页筛选条、列表头吸顶常用。

> `top-[2.75rem]` 让出 navbar 高度（navbar `sticky top-0 h-11` = 2.75rem；含 safe-area 时 navbar 实际更高，需 M0.1a 落地后用 CSS 变量统一）。`z-10` 见 baseline §10.4 分层约定（固定栏层）。

```json
{
  "type": "container",
  "className": "nop-sticky sticky top-[2.75rem] z-10 bg-background",
  "body": {
    "type": "flex",
    "items": [{ "type": "text", "text": "筛选条件" }]
  }
}
```

- 与 page header sticky 的关系：page header 已是 `sticky top-0`，内容区 sticky 需 `top-{header高度}` 让位。
- 滚动容器：当 page body 是可滚动容器时，sticky 相对该容器生效。

### 14.6 与 baseline / M0.1 的依赖

| 模式      | 依赖的 baseline / M0.1 子项         |
| --------- | ----------------------------------- |
| Tabbar    | M0.1a safe-area、M0.1c haptics      |
| NavBar    | M0.1a safe-area、M0.1c haptics      |
| ActionBar | M0.1a safe-area、M0.1c haptics      |
| SubmitBar | M0.1a safe-area、M0.1c haptics      |
| Sticky    | M0.1d z-index 分层（固定栏层 z-10） |

> 这些 className（`nop-haptic`、`nop-safe-bottom`）当前是 baseline §10 的契约（M0.1，`todo` 未落地）。M0.1 落地前可用 Tailwind 等价类临时替代（如 `pb-[env(safe-area-inset-bottom)]`、`active:opacity-70`），落地后切换为语义 class。

## 15. 风险、取舍与后续阶段

- 当前 TS schema 与 renderer regions 有轻微不一致，需要后续收敛。
- 页面级导航、面包屑和 toolbar DSL 建议在有真实宿主需求后再补充，避免首版契约过重。
- header/footer region 的 sticky/fixed 定位需要在 renderer 内通过 className 开放，不硬编码。
- §14 移动端骨架模式是 schema 模板（非独立组件），若后续发现 5 类模式在某场景拼装成本过高，可回到人确认评估是否提升为独立 renderer（违反 M3a "不新增 `*-mobile` 组件"原则时需显式人审）。
