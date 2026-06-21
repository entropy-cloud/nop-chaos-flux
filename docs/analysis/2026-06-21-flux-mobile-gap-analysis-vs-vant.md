# Flux 移动端能力核查：Vant 对照与缺口分析

> 核查日期: 2026-06-21
> 核查范围: 确认 nop-chaos-flux 能否覆盖"移动商城全部需求"与"一般移动端前端界面要求"
> 对照基准: `~/sources/vant`（Vant 4，105 个组件）+ `~/sources/{newbee-mall-vue3-app, litemall, yudao-mall-uniapp}`（三个真实商城项目）
> 关联文档:
>
> - `docs/components/mobile-roadmap.md`（M0–M5 状态索引）
> - `docs/analysis/2026-06-21-mobile-mall-component-analysis-for-flux.md`（商城控件对照）
> - `docs/architecture/mobile-responsive-baseline.md`（响应式基线）

---

## 0. 结论先行（TL;DR）

> **核查更正说明**：初版报告误判 `grid`"完全零覆盖"。经核实，`grid` 已在主 `roadmap.md` W3a 规划且有 `design.md`（属布局族）。本报告已更正——区分"二维布局 grid"（已规划）与"宫格导航 grid-item"（Vant `van-grid` 语义，未规划），二者非同一组件。

| 维度                     | 现状                      | 风险                                                                                                                                                                                           |
| ------------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **已规划组件的文档覆盖** | 🟢 良好                   | 主 roadmap W1a–W4c + mobile-roadmap M0–M5 已系统规划 60+ 组件，pull-refresh/infinite-scroll/swipe-cell/countdown/notice-bar、grid、carousel、collapse、steps、tabs 等均有 design.md            |
| **商城页面骨架复合模式** | 🟡 文档缺口               | Tabbar/NavBar/ActionBar/SubmitBar/Sticky 这 5 类在两份 roadmap 中均未列为独立工作项，mobile-mall analysis 只作为"`page.header`/`page.footer` 布局模式"一笔带过，无组件级或复合模式级 design.md |
| **代码实现**             | 🔴 尚未开始               | `flux-renderers-mobile` 包**尚未创建**；M1–M5 全部为 `todo`；主 roadmap W1–W4 全部 `todo`；只有 L0 基线（~55 renderer）+ M0 基线文档完成                                                       |
| **基础设施**             | 🟢 可用                   | `useIsMobile`、`Sheet`、`Carousel`、`Dialog`、`Drawer`、`Popover`、`Tabs` 在 `@nop-chaos/ui` 已有，page renderer 已支持 `header`/`footer` region                                               |
| **能实现移动商城吗**     | 🟡 规划可覆盖，实现待落地 | 见 §4。按规划路线推进 W1d（pull-refresh/infinite-scroll）+ M5c（swipe-cell）+ 补页面骨架模式文档后，可覆盖商城核心交易链路                                                                     |

**一句话**：架构方向正确（拒绝 `mobileUI` 标志位、拒绝 `*-mobile` 双实现），**组件层面的规划基本充分**（移动端原生交互组件在 mobile-roadmap M5 + 主 roadmap W1d 双重规划），主要待补的是：(a) 实现代码；(b) 商城页面骨架（Tabbar/NavBar/ActionBar/SubmitBar/Sticky）的复合模式文档化。

---

## 1. 核查方法

1. 读取 Flux 全部移动端相关文档（4 份）：`mobile-roadmap.md`、`mobile-responsive-baseline.md`、`mobile-mall-component-analysis-for-flux.md`、`amis-mobile-support-research.md`。
2. 读取 5 份移动端原生组件 design.md：`pull-refresh`、`infinite-scroll`、`swipe-cell`、`countdown`、`notice-bar`、`use-touch`、`bottom-sheet`。
3. 对照 Vant 4 全部 105 个组件（`~/sources/vant/packages/vant/src`）。
4. 统计三个真实商城项目的实际控件使用频次（grep `<van-*` / `<s-*` / `<su-*`），按"实际用了什么"而非"Vant 提供什么"定优先级。
5. 核查 Flux 代码层：`@nop-chaos/ui` 导出、`flux-renderers-*` 包目录、`page.tsx` region 支持。

---

## 2. Vant → Flux 映射全景表（按商城实际使用频次排序）

> 频次来自 newbee-mall（14 页）+ litemall-vue（20+ 页）的实际 grep 统计，是"真实需求强度"的硬证据。

### 2.1 高频控件（两个项目都用，商城核心）

| Vant 控件                     | 使用频次              | Flux 现状                         | 实现状态            |
| ----------------------------- | --------------------- | --------------------------------- | ------------------- |
| `van-cell` / `van-cell-group` | **79 次**（litemall） | `container`/`card` 组合，无专用   | 🟡 布局模式，无组件 |
| `van-button`                  | 38 次                 | `Button`（ui）                    | ✅ 已有             |
| `van-field`                   | 20 次                 | `Input`/`Textarea`（ui）          | ✅ 已有             |
| `van-icon`                    | 25 次                 | `icon`（basic）                   | ✅ 已有             |
| `van-card`（商品卡片）        | 15 次                 | `card`（ui），缺移动端水平变体    | 🟡 需模板           |
| `van-list`（无限滚动）        | 13 次                 | `infinite-scroll`（design.md 有） | 🔴 未实现           |
| `van-tabs` / `van-tab`        | 6+9 次                | `tabs`（basic），缺 swipe         | 🟡 M1d todo         |
| `van-popup`                   | 7 次                  | `Sheet`/`Popover`（ui）           | ✅ 已有             |
| `van-checkbox`                | 5 次                  | `Checkbox`（ui）                  | ✅ 已有             |
| `van-swipe`（轮播）           | 4 次                  | `Carousel`（ui）                  | ✅ 已有             |

### 2.2 中频控件（单项目深度使用）

| Vant 控件                    | 使用频次              | Flux 现状                          | 实现状态    |
| ---------------------------- | --------------------- | ---------------------------------- | ----------- |
| `van-pull-refresh`           | 2 次（newbee）        | `pull-refresh`（design.md 有）     | 🔴 未实现   |
| `van-swipe-cell`（左滑删除） | 1 次（newbee 购物车） | `swipe-cell`（design.md 有）       | 🔴 未实现   |
| `van-stepper`（数量步进）    | 2 次                  | `input-number`（form）             | ✅ 已有     |
| `van-submit-bar`（结算栏）   | 4 次                  | 无，靠 `page.footer` region        | 🟡 布局模式 |
| `van-action-bar`（操作栏）   | 3 次（newbee 详情页） | 无，靠 `page.footer` region        | 🟡 布局模式 |
| `van-search`                 | 3 次（litemall）      | `Input` + 业务封装                 | ✅ 已有     |
| `van-picker`                 | 2 次                  | `picker`（design.md 有，retained） | 🟡 未实现   |
| `van-grid`（宫格导航）       | 2 次                  | 无                                 | 🔴 缺失     |
| `van-tag`                    | 8 次                  | `Badge`（ui）                      | ✅ 已有     |
| `van-panel`                  | 9 次（litemall）      | `container`/`card`                 | 🟡 布局模式 |

### 2.3 商城业务专用控件（单项目用，强业务）

| Vant 控件                               | 使用     | Flux 策略    | 状态 |
| --------------------------------------- | -------- | ------------ | ---- |
| `van-address-edit` / `van-address-list` | 收货地址 | 业务组合表单 | M4+  |
| `van-sku`（规格选择）                   | 商品规格 | 业务组件     | M4+  |
| `van-coupon-cell` / `van-coupon-list`   | 优惠券   | 业务组件     | M4+  |
| `van-contact-card`                      | 联系人   | 业务组合     | M4+  |

### 2.4 yudao-mall-uniapp 自定义组件印证的需求

yudao 不用 Vant，用 uni-app 自定义组件（92 页），高频项揭示了商城**通用**需求：

| yudao 组件                        | 频次  | 对应的通用需求                      | Flux 覆盖              |
| --------------------------------- | ----- | ----------------------------------- | ---------------------- |
| `s-layout`                        | 55    | 页面骨架（含 header/footer/sticky） | ✅ `page` + region     |
| `s-goods-column` / `s-goods-item` | 34+15 | 商品列表项模板                      | 🟡 缺模板              |
| `s-empty`                         | 31    | 空状态                              | ✅ `empty`（retained） |
| `su-popup`                        | 23    | 弹层                                | ✅ `Sheet`             |
| `su-fixed`                        | 20    | 底部固定栏（结算/操作栏）           | 🟡 `page.footer`       |
| `su-sticky`                       | 11    | 吸顶容器                            | 🔴 缺失                |
| `su-tabs`                         | 11    | 标签页                              | ✅ `tabs`              |
| `su-swiper`                       | 5     | 轮播                                | ✅ `Carousel`          |
| `su-number-box`                   | 4     | 数量步进                            | ✅ `input-number`      |
| `su-tabbar`                       | 1     | 底部 Tab 导航                       | 🔴 缺失                |
| `su-status-bar`                   | 7     | 状态栏占位（safe-area-top）         | 🟡 基线有约定，无组件  |
| `s-custom-navbar`                 | 2     | 自定义导航栏                        | 🔴 缺失                |

---

## 3. 缺口诊断（核心发现）

### 3.1 🟢 移动端原生交互组件：规划充分，待实现

**规划状态（已双重规划）：**

- 主 `roadmap.md` **W1d 移动端交互组（2）**：`pull-refresh`、`infinite-scroll`，归属 `flux-renderers-mobile`。
- `mobile-roadmap.md` **M5 移动端原生组件（5）**：`pull-refresh`、`infinite-scroll`、`swipe-cell`、`countdown`、`notice-bar`，归属 `flux-renderers-mobile`，每个都有 `design.md`。
- `useTouch` Hook 在 W1d 明确为共用基础设施。

**实现状态：** `flux-renderers-mobile` 包**尚未创建**，W1d/M5 全部 `todo`。这是"规划就绪、实现待落地"，**不是规划缺口**。design.md 已就绪，可直接进入 execution plan。

### 3.2 🟢 商城页面骨架复合模式：已有 page.region 载体，模板已补

**核查更正（2026-06-21 第二次修订）**：初版本节标题为"唯一真实文档缺口"，经核查该表述**过强**——这 5 类模式在 `mobile-roadmap.md` M3a 与 `page.tsx` 已实现的 `header`/`footer` region 中已有载体，只是缺标准 schema 模板。本次（2026-06-21）已在 `docs/components/page/design.md` §14 补齐 5 个模板，并在 `mobile-roadmap.md` M3a 修订措辞。**不再是缺口**。

以下 5 类模式统一决策为**不新增独立 renderer**，走 `page.header`/`page.footer` region + 标准 schema 模板：

| 模式                                | 商城场景                      | 处理方式                                                             | 模板位置               |
| ----------------------------------- | ----------------------------- | -------------------------------------------------------------------- | ---------------------- |
| **Tabbar（底部 Tab 导航）**         | 首页/分类/购物车/我的         | `page.footer` + `flex`+`button`+`navigate`（**≠ `tabs`**，路由导航） | `page/design.md` §14.1 |
| **NavBar（顶部导航栏）**            | 内页"返回 + 标题 + 操作"      | `page.header` region（返回 `navigate(-1)` + 标题 + 右操作）          | `page/design.md` §14.2 |
| **ActionBar（商品详情底部操作栏）** | 商品详情"客服/收藏/加购/购买" | `page.footer`（图标按钮组 + 大号 CTA）                               | `page/design.md` §14.3 |
| **SubmitBar（购物车结算栏）**       | 购物车"全选 + 合计 + 结算"    | `page.footer`（复选 + 价格展示 + CTA）                               | `page/design.md` §14.4 |
| **Sticky（吸顶容器）**              | 滚动时分类/筛选吸顶           | `container` + `sticky top-{header高}` className                      | `page/design.md` §14.5 |

**决策依据**：Flux 已有 `page.header`/`page.footer` region（`packages/flux-renderers-basic/src/page.tsx` 已实现），是这些固定栏的天然载体；独立组件会重复 region 的定位/安全区逻辑，违反 DRY 与"不建 `*-mobile` 组件"策略。

**修正记录**：mobile-mall analysis §3.4 早期把 Tabbar 等同为 "`Tabs` + 固定定位"，措辞不准确（Tabbar 是路由导航 ≠ `tabs` 内容切换），已在本次修订。

### 3.3 🟡 宫格导航（Grid 导航）：概念需澄清

**核查更正**：`grid` 已在主 `roadmap.md` **W3a 布局组**规划，`docs/components/grid/design.md` 已存在。

**但需澄清概念差异**：

| 概念                   | 对应                              | Flux 状态                                                           |
| ---------------------- | --------------------------------- | ------------------------------------------------------------------- |
| **二维 CSS 网格布局**  | Flux `grid`（W3a）/ AMIS `grid`   | ✅ 已规划（W3a），design.md 定位为 `columns`/`gap`/`items` 布局语义 |
| **宫格导航**（金刚位） | Vant `van-grid` + `van-grid-item` | 🟡 **未规划**。`grid/design.md` 不含"图标+文字导航项"语义           |

Vant `van-grid` 在 litemall 用于首页金刚位/分类九宫格，是"图标按钮网格导航"而非纯布局网格。Flux 现有 `grid` 规划是布局语义，不覆盖此导航场景。**这可由 `grid`（布局）+ `button`/`icon` 组合实现**，但无标准模板文档。

**结论**：不是"零覆盖"，是"可通过组合实现但无模板文档"。建议在 `grid/design.md` 增"宫格导航模式"示例，或单独评估是否需要 `grid-nav` 组件。

### 3.4 🟢 商品卡片：已有规划载体

`van-card`（图片左 + 标题/价格/标签右）在商城用了 15+ 次。

**核查**：主 roadmap **W2a 数据组合组**已规划 `cards`（归属 `flux-renderers-content`），`docs/components/cards/design.md` 已存在。商品行卡片可作为 `cards` 的 item 模板实现，载体已规划。`mobile-mall analysis` 提到的"移动端商品卡片布局模板"可在 `cards/design.md` 增移动端变体章节。

### 3.5 🟡 表单移动端适配：M2 已规划，待实现

`van-field` 商城用 20 次。Flux `Input` 已有（L0），M2a–M2c（input 族触摸适配、44px 触摸目标、inputmode、软键盘视口）在 `mobile-roadmap.md` 已规划为 `todo`。`mobile-responsive-baseline.md` §6 已约定 viewport meta/`VisualViewport`，但 playground 未落实。**这是实现待落地，非规划缺口**。

### 3.6 🟢 已覆盖良好的部分（确认无缺口）

- **基础控件**：Button/Input/Checkbox/RadioGroup/Switch/Select/Textarea/Icon/Badge/Spinner/Skeleton/Separator/Progress —— ui 层齐备。
- **弹层体系**：Dialog/Drawer/Popover/Sheet/Tooltip —— ui 层齐备，`bottom-sheet/design.md` 明确复用 Sheet。
- **轮播**：`Carousel`（W4a 规划，ui 已有基础）覆盖 `van-swipe`。
- **集合展示**：`list`（W1c）、`cards`（W2a）、`table`/`crud`（L0）已覆盖商城列表场景。
- **响应式基线**：M0 文档质量高，断点/safe-area/触摸目标/软键盘/手势阈值全部约定清楚。
- **页面 region**：`page.tsx` 已实现 `header`/`footer`/`body` region（见代码），为底部操作栏提供了槽位。
- **架构决策正确**：拒绝 amis 的 `mobileUI` 标志位和 `*-mobile` 双实现，采用 Tailwind 响应式 + 运行时分支策略。

---

## 4. 商城页面逐页可达性核查

以 newbee-mall 14 页为例，标注"按规划落地后能否实现"（**注意：是规划可达性，非现状**——现状因 W1d/M5 未实现而全部阻塞）：

| 商城页面      | 关键控件                                           | 规划可达    | 待落地工作项                                                  |
| ------------- | -------------------------------------------------- | ----------- | ------------------------------------------------------------- |
| 首页          | Skeleton + Icon + Carousel + **Grid（金刚位）**    | 🟡          | W4a(carousel)；grid 宫格导航模式待补（§3.3）                  |
| 登录          | Button + Separator + Icon                          | ✅          | W1b(separator)                                                |
| 用户中心      | **Cell 列表** + Icon                               | 🟡          | Cell 无专用组件，靠 container/card 拼                         |
| 分类          | Tabs + InfiniteScroll + 侧边分类导航               | 🟡          | W1d(infinite-scroll)；侧边导航用 `tree-select`(L0) 或 sidebar |
| 商品列表      | **PullRefresh** + **InfiniteScroll** + Card        | ✅ 规划可达 | W1d + W2a(cards)                                              |
| 商品详情      | Carousel + **ActionBar**                           | 🟡          | W4a(carousel)；ActionBar 复合模式待补（§3.2）                 |
| 购物车        | Checkbox + **SwipeCell** + Stepper + **SubmitBar** | 🟡          | M5c(swipe-cell)；SubmitBar 复合模式待补（§3.2）               |
| 创建订单      | ContactCard + SubmitBar                            | 🟡          | SubmitBar 复合模式待补                                        |
| 地址列表/编辑 | address-list/address-edit/form                     | 🟡          | 业务组合（M4+），上层 schema                                  |
| 订单列表      | Tabs + Card + InfiniteScroll                       | ✅ 规划可达 | W1d + W2a                                                     |
| 订单详情      | Card + Cell + Dialog                               | ✅          | L0(dialog)                                                    |
| 设置/关于     | Cell 列表                                          | 🟡          | Cell 无专用组件                                               |

**规划可达页面**：约 9/14（含 🟡）。**核心交易链路（列表→详情→购物车→下单）在 W1d + M5c + 页面骨架模式补齐后可达**。当前阻塞纯因实现未落地，非规划缺失。

---

## 5. 一般移动端前端 UI 要求核查（超出商城）

对照 Vant 4 全 105 组件，标注 Flux 规划状态（**关键更正**：已规划的项标注其工作项）：

| 能力                 | Vant                        | Flux 规划状态                                                     | 优先级 | 说明                                            |
| -------------------- | --------------------------- | ----------------------------------------------------------------- | ------ | ----------------------------------------------- |
| 宫格导航             | `van-grid`                  | 🟡 `grid`(W3a)是布局语义，导航模式未规划                          | 中     | 见 §3.3                                         |
| 吸顶容器             | `van-sticky`                | 🟡 `page` className 开放但无复合模式                              | 高     | 见 §3.2                                         |
| 底部 Tab 导航        | `van-tabbar`                | 🟡 无独立组件/模式（mobile-mall analysis 当 `Tabs` 等价，不准确） | 高     | 见 §3.2                                         |
| 顶部导航栏           | `van-nav-bar`               | 🟡 `page.header` region 但无标准模板                              | 高     | 见 §3.2                                         |
| 操作面板（底部菜单） | `van-action-sheet`          | ✅ 可用 `Sheet`(ui)                                               | 低     | —                                               |
| 索引栏（通讯录式）   | `van-index-bar`             | 🔴 未规划                                                         | 低     | 通讯录/城市选择                                 |
| 步骤条               | `van-steps`                 | ✅ `steps`(W4b) 已规划                                            | —      | —                                               |
| 时间线               | `van-timeline`              | ✅ `timeline`(W4b) 已规划                                         | —      | —                                               |
| 级联选择             | `van-cascader`              | 🟡 `tree-select`(L0)可近似                                        | 中     | 省市区                                          |
| 数字键盘             | `van-number-keyboard`       | 🔴 未规划                                                         | 低     | 支付/验证码                                     |
| 密码输入框           | `van-password-input`        | 🔴 未规划                                                         | 中     | 支付密码（商城用到）                            |
| 图片预览（手势缩放） | `van-image-preview`         | 🔴 未规划                                                         | 中     | 商品图大图预览                                  |
| 懒加载               | `van-lazyload`              | 🔴 未规划                                                         | 中     | 商品图性能                                      |
| 回到顶部             | `van-back-top`              | 🔴 未规划                                                         | 低     | 长列表                                          |
| 文本省略             | `van-text-ellipsis`         | 🔴 未规划                                                         | 低     | 商品标题多行截断（可 CSS `-webkit-line-clamp`） |
| 环形进度             | `van-circle`                | 🟡 `progress`(W1b)可近似                                          | 低     | —                                               |
| 浮动气泡/面板        | `van-floating-bubble/panel` | 🔴 未规划                                                         | 低     | 悬浮客服/工具                                   |
| 弹幕                 | `van-barrage`               | 🔴 未规划                                                         | 低     | 视频页                                          |
| 滚动文字             | `van-rolling-text`          | 🔴 未规划                                                         | 低     | 跑马灯数字（`notice-bar` M5e 可部分覆盖）       |
| 水印                 | `van-watermark`             | 🔴 未规划                                                         | 低     | —                                               |
| 签名                 | `van-signature`             | 🔴 未规划                                                         | 低     | —                                               |
| 高亮搜索词           | `van-highlight`             | 🔴 未规划                                                         | 低     | 搜索结果                                        |
| 日历                 | `van-calendar`              | ✅ `calendar`(ui) 已有                                            | —      | —                                               |
| 省市区选择           | `van-area`                  | 🔴 未规划                                                         | 中     | 收货地址（address-edit 依赖）                   |
| 分割线               | `van-divider`               | ✅ `separator`(W1b) 已规划                                        | —      | —                                               |
| 骨架屏               | `van-skeleton`              | ✅ `Skeleton`(ui) 已有                                            | —      | —                                               |
| 评分                 | `van-rate`                  | 🔴 O1 可选项（roadmap.md L272）                                   | 低     | —                                               |
| 滑块                 | `van-slider`                | 🟡 O1 可选项（`slider`）+ ui `Slider` 已有                        | 低     | —                                               |
| 空状态               | `van-empty`                 | ✅ `empty`(W1b) 已规划                                            | —      | —                                               |
| 通知/消息            | `van-notify`                | ✅ `toast`(ui sonner) 已有                                        | —      | —                                               |
| 通知栏               | `van-notice-bar`            | ✅ `notice-bar`(M5e) 已规划                                       | —      | —                                               |
| 倒计时               | `van-count-down`            | ✅ `countdown`(M5d) 已规划                                        | —      | —                                               |

**核查结论**：高频移动端通用能力（步骤条/时间线/分割线/骨架屏/空状态/通知/通知栏/倒计时/日历）**全部已规划**；缺口集中在：(1) 商城页面骨架（§3.2）；(2) 支付/图片预览/懒加载等中等频次能力；(3) 弹幕/水印/签名等长尾能力。

---

## 6. 改进建议（按优先级）

### P0 — 推进已规划工作项（实现待落地，非新增规划）

1. **实现 `flux-renderers-mobile` 包 + W1d/M5**：`pull-refresh`、`infinite-scroll`、`swipe-cell` + 共享 `useTouch` Hook。design.md 已就绪，按主 roadmap W1d（移动端交互组）执行即可。countdown/notice-bar 随 M5 推进。
2. **CRUD loadMore 分页模式**（M4a 的一部分）：移动端商品列表/订单列表标准形态是"PullRefresh + CRUD(loadMore) + InfiniteScroll"，需确认 `crud-schema.ts` 的分页模式契约。

### P1 — 补商城页面骨架复合模式文档（唯一真实文档缺口）

3. **补 Tabbar/NavBar/ActionBar/SubmitBar/Sticky 的复合模式文档**（需人确认是独立组件还是 page 复合模式）：
   - 若独立组件 → 新增工作项进 `flux-renderers-mobile` 或 `flux-renderers-basic`，建 design.md
   - 若复合模式 → 在 `page/design.md` 增"移动端骨架模式"章节，提供标准 schema 片段模板（返回栏/底部导航/结算栏/操作栏/吸顶）
4. **澄清 Tabbar ≠ Tabs**：mobile-mall analysis §3.4 把 `van-tabbar` 等同为 "`Tabs` + 固定定位" 是不准确的，Tabbar 是路由级导航，需修正该分析文档。

### P2 — 澄清与补充

5. **`grid` 宫格导航模式**：在 `grid/design.md`(W3a) 增"宫格导航（金刚位）"示例章节，说明 `grid` + `button`/`icon` 组合如何实现 `van-grid` 导航；或评估是否需独立 `grid-nav`。
6. **`cards` 移动端商品行模板**：在 `cards/design.md`(W2a) 增移动端水平商品卡片变体（图片左+文字右+价格/标签）。
7. **M2a–M2c 表单触摸适配落地** + playground viewport meta（`mobile-responsive-baseline.md` §6 已约定但未落实）。

### P3 — 通用移动端补全（按需，多数已可由组合覆盖）

8. `password-input`（支付场景）、`image-preview`（商品大图）、`lazyload`（性能）、`area`（省市区）按实际项目需求补，多数可由 O1 可选项流程启动。
9. `index-bar`/`back-top`/`text-ellipsis`(可用 CSS)/`highlight` 等长尾，纳入主 `roadmap.md` O1 候选池评估。

### P4 — 文档一致性

10. `docs/components/index.md` 第 559–566 行"移动端原生组件"列表与 `mobile-roadmap.md` M5 一致；但 **Tabbar/NavBar/ActionBar/SubmitBar/Sticky 当前在两份 roadmap 中均悬空**（既不在移动端原生列表，也不在主 roadmap 工作项），需明确归位。

---

## 7. 架构决策复核（值得肯定，无需改）

| 决策                                                        | 评价                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------- |
| 拒绝 `mobileUI` 全局标志位                                  | ✅ 正确。amis 的双实现是公认坏设计                      |
| 拒绝 `*-mobile` 双组件                                      | ✅ 正确。Select 小屏走 BottomSheet 而非 `select-mobile` |
| 复用 `@nop-chaos/ui` Sheet 做 BottomSheet                   | ✅ 正确。避免重复造浮层体系                             |
| Tailwind 响应式断点 + `useMediaQuery` 运行时分支            | ✅ 正确。move-first，符合现代实践                       |
| 移动端原生组件独立成包                                      | ✅ 正确。隔离触摸手势依赖，桌面项目可 opt-out           |
| `page.footer` region 承载底部固定栏                         | ✅ 正确方向，但需配套 ActionBar/SubmitBar 复合模式文档  |
| **组件规划分层**（主 roadmap W1-W4 + mobile-roadmap M0-M5） | ✅ 覆盖充分，移动端原生交互组件双重规划，无遗漏         |

架构无需调整，缺的是**实现落地**和**商城页面骨架复合模式的文档化**。

---

## 8. 行动清单（交付移动商城的最小集合）

要实现一个完整移动商城（参照 newbee-mall 14 页），最小必做项（**多数为推进已规划工作项**）：

- [ ] 创建 `packages/flux-renderers-mobile` 包（含 `package.json`/`tsconfig.json`/`vite.workspace-alias.ts` 注册/`tsconfig.json` project references）—— **W1d 前置**
- [ ] 实现 `useTouch` Hook（W1d/M0 收尾，design.md 已就绪）
- [ ] 实现 `pull-refresh`（W1d / M5a）
- [ ] 实现 `infinite-scroll`（W1d / M5b）+ CRUD loadMore 集成
- [ ] 实现 `swipe-cell`（M5c）
- [ ] **【需人确认】** 补 Tabbar/NavBar/ActionBar/SubmitBar/Sticky 复合模式文档（独立组件 or page 模式）
- [ ] **【需人确认】** 补 `grid` 宫格导航模式 or `grid-nav`
- [ ] 补 `cards` 移动端商品行卡片模板（W2a 范围内）
- [ ] playground viewport meta（`user-scalable=no`）+ 软键盘处理（M2 范围内）
- [ ] 每个 W1d/M1-M5 工作项配 Playwright `setViewportSize` e2e（两份 roadmap Cross-Cutting 已要求）

countdown / notice-bar（M5d/M5e）可延后（非商城核心）。address/sku/coupon 等业务组件由上层 schema 组合，不进框架。

---

## 9. 数据来源

- Vant 组件清单：`~/sources/vant/packages/vant/src`（105 个组件目录）
- 商城实际使用：`grep <van-*` on `~/sources/newbee-mall-vue3-app/src` + `~/sources/litemall/litemall-vue`；`grep <s-*/<su-*` on `~/sources/yudao-mall-uniapp`（92 页）
- Flux 现状：`packages/` 目录、`packages/ui/src/index.ts`、`packages/flux-renderers-basic/src/page.tsx`、`docs/components/*/design.md`、`docs/components/mobile-roadmap.md`
