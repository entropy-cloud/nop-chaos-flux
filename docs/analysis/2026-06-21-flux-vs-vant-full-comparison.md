# Flux vs Vant 全面对比：组件覆盖、设计哲学、移动端能力

> 核查日期: 2026-06-21
> 对照基准: Vant 4（`~/sources/vant`，105 组件 + composables + vant-use 工具层 + style 基础设施）
> 关联: `docs/analysis/2026-06-21-flux-mobile-gap-analysis-vs-vant.md`（聚焦商城缺口，本文聚焦全面对比）
> 目的: 回答"Vant 全部功能 Flux 覆盖了多少 / 哪些常用组件没覆盖 / 整体设计对比"

---

## 0. 结论先行

| 维度                 | 结论                                                                                                                                                                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **常用组件覆盖率**   | 🟢 **~85%**。Vant 高频组件（button/field/cell/card/tabs/swipe/popup/dialog/checkbox/list/pull-refresh…）Flux 均有规划或等价物，通过主 roadmap W1–W4 + mobile-roadmap M1–M5 双轨覆盖                                                                 |
| **真实未覆盖的组件** | 🟡 **约 15 个**，分两类：(a) 商城页面骨架复合模式（tabbar/nav-bar/action-bar/submit-bar）——可由 page region + 组合实现但无标准模板；(b) 长尾专用（password-input/image-preview/lazyload/area/barrage/watermark/signature…）——多数 O1 可选项流程启动 |
| **整体设计哲学**     | ⚡ **根本性差异**。Vant 是"组件库"（命令式/组件驱动）；Flux 是"低代码 schema 引擎"（声明式/schema 驱动 + runtime + renderer registry）。二者不是同一层级，不能 1:1 对比，而应是"Flux 能否用 schema 表达 Vant 的交互"                                |
| **移动端基础设施**   | 🟢 Flux 基线约定（断点/safe-area/触摸目标/软键盘/手势阈值）质量等同或优于 Vant；但 **3 项 Vant 成熟能力 Flux 缺**：haptics 触感反馈、global z-index 栈管理、hairline 0.5px 细线 mixin                                                               |

**核心判断**：Flux 的路线（schema 驱动 + 复用 shadcn/ui + 响应式同组件策略）**方向正确且更现代**，Vant 的组件功能 Flux **绝大多数能用 schema 表达**；真正的缺口集中在**移动端触感/层级/细线三类基础设施** + **页面骨架复合模式文档** + **少数长尾专用组件**。

---

## 1. Vant 完整能力盘点

Vant 不只是 105 个组件，还有三块基础设施：

| 层                              | 内容                                                                                                                                                                          | 数量 |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| **组件**                        | `~/sources/vant/packages/vant/src/*`                                                                                                                                          | 105  |
| **composables（组件内 hooks）** | `use-touch`/`use-lock-scroll`/`use-global-z-index`/`use-height`/`use-lazy-render`/`use-placeholder`/`use-route`/`use-tab-status`/`use-visibility-change`/`on-popup-reopen` 等 | 15   |
| **vant-use（通用工具 hooks）**  | `useCountDown`/`useEventListener`/`useClickAway`/`useRaf`/`useRect`/`useScrollParent`/`useToggle`/`useWindowSize`/`usePageVisibility`/`useCustomFieldValue`/`useRelation`     | 12   |
| **style 基础设施**              | `hairline` mixin（0.5px 细线）、`van-safe-area-top/bottom`、`HAPTICS_FEEDBACK` class、`van-hairline--*`                                                                       | —    |
| **ConfigProvider**              | 主题（light/dark）、`themeVars` CSS 变量注入、`themeVarsScope`（local/global）、`iconPrefix`、全局 zIndex                                                                     | —    |

---

## 2. 逐组件覆盖对照（Vant 105 → Flux）

### 2.1 ✅ Flux 已有等价物（L0 已落地，~30 个）

| Vant                            | Flux 等价                                              | 包            |
| ------------------------------- | ------------------------------------------------------ | ------------- |
| `button`                        | `button`                                               | basic         |
| `cell`/`cell-group`             | `container`/`card` 组合                                | basic/ui      |
| `checkbox`/`checkbox-group`     | `checkbox`/`checkbox-group`                            | form          |
| `radio`/`radio-group`           | `radio-group`                                          | form          |
| `switch`                        | `switch`                                               | form          |
| `field`（输入框）               | `input-text`/`textarea`/`input-email`/`input-password` | form          |
| `stepper`                       | `input-number`                                         | form          |
| `select`/`picker` 简单态        | `select`                                               | form          |
| `tree-select`                   | `tree-select`                                          | form          |
| `dialog`                        | `dialog`                                               | basic         |
| `popup`/`overlay`               | `Sheet`/`Popover`/`Drawer`                             | ui            |
| `tabs`/`tab`                    | `tabs`                                                 | basic         |
| `tag`                           | `badge`                                                | ui            |
| `icon`                          | `icon`                                                 | basic         |
| `loading`                       | `spinner`                                              | ui            |
| `divider`                       | `separator`（W1b）                                     | content       |
| `skeleton`                      | `skeleton`                                             | ui            |
| `toast`/`notify`                | `toast`(sonner)                                        | ui            |
| `pagination`                    | `pagination`（W2a）                                    | data          |
| `empty`                         | `empty`（W1b）                                         | content       |
| `progress`                      | `progress`（W1b）                                      | content       |
| `collapse`/`collapse-item`      | `collapse`（W3a）                                      | layout        |
| `steps`/`step`                  | `steps`（W4b）                                         | layout        |
| `calendar`                      | `calendar`                                             | ui            |
| `slider`                        | `slider`                                               | ui            |
| `form`                          | `form`                                                 | form          |
| `image`                         | `image`（W1a）                                         | content       |
| `col`/`row`/`grid`（布局）      | `flex`/`grid`（W3a）                                   | basic/layout  |
| `space`                         | `flex`（gap）                                          | basic         |
| `popover`                       | `popover`                                              | ui            |
| `dropdown-menu`/`dropdown-item` | `dropdown-button`（W3b）+ `select`                     | layout        |
| `cascader`                      | `tree-select` 可近似                                   | form          |
| `date-picker`/`time-picker`     | `input-date`/`input-time`/`input-datetime`（W2b）      | form          |
| `picker`/`picker-group`         | `picker`（W4c）                                        | form-advanced |

### 2.2 ✅ Flux 已规划（roadmap 工作项内，待落地，~15 个）

| Vant                           | Flux 规划                                                     | 工作项         |
| ------------------------------ | ------------------------------------------------------------- | -------------- |
| `swipe`/`swipe-item`           | `carousel`                                                    | W4a            |
| `list`（无限滚动）             | `infinite-scroll`                                             | W1d / M5b      |
| `pull-refresh`                 | `pull-refresh`                                                | W1d / M5a      |
| `swipe-cell`                   | `swipe-cell`                                                  | M5c            |
| `count-down`                   | `countdown`                                                   | M5d            |
| `notice-bar`                   | `notice-bar`                                                  | M5e            |
| `card`（商品卡）               | `cards`                                                       | W2a            |
| `submit-bar`                   | `page.footer` region（M3a）                                   | M3a            |
| `action-bar`/`-button`/`-icon` | `page.footer` region（M3a）                                   | M3a            |
| `nav-bar`                      | `page.header` region（M3a）                                   | M3a            |
| `tabbar`/`tabbar-item`         | M3a（"Tabs + 固定定位 + page.footer"，**措辞待校准**，见 §4） | M3a            |
| `sidebar`/`sidebar-item`       | `tree-select` 移动端形态（M1a）                               | M1a            |
| `sticky`                       | `page` className sticky + table `affixHeader`                 | M3a            |
| `grid`/`grid-item`（宫格导航） | `grid`（W3a）布局 + 组合                                      | W3a + 模板待补 |
| `search`                       | `input-text` + 业务封装                                       | L0             |
| `badge`                        | `badge`                                                       | ui             |
| `rate`                         | O1 可选项                                                     | roadmap O1     |
| `circle`（环形进度）           | `progress` 可近似                                             | W1b            |
| `share-sheet`                  | `Sheet` 组合                                                  | ui             |

### 2.3 🔴 Flux 未覆盖（真实缺口，需评估，~15 个）

按"是否常用 + 是否移动端核心"分级：

#### 高优先级（移动端常用，建议补）

| Vant              | 用途                       | 缺口性质                   | 建议                                    |
| ----------------- | -------------------------- | -------------------------- | --------------------------------------- |
| `password-input`  | 支付密码（商城支付链路）   | 无等价                     | O1 启动，或 `input-password` 移动端变体 |
| `image-preview`   | 商品图大图预览（手势缩放） | 无等价                     | 中频，需手势库，进 O1                   |
| `lazyload`        | 商品图懒加载（性能）       | 无等价                     | 高频性能项，建议优先                    |
| `area`（省市区）  | 收货地址                   | `tree-select` 可近似但不专 | 配合 address 业务组件                   |
| `number-keyboard` | 支付/验证码                | 无等价                     | 中频                                    |
| `back-top`        | 长列表回到顶部             | 无等价                     | 低成本，可补                            |

#### 低优先级（长尾专用）

| Vant                                         | 用途          | 缺口性质                                | 建议             |
| -------------------------------------------- | ------------- | --------------------------------------- | ---------------- |
| `index-bar`/`index-anchor`                   | 通讯录式索引  | 无等价                                  | 低频，O1         |
| `barrage`                                    | 弹幕          | 无等价                                  | 低频，视频页才用 |
| `rolling-text`                               | 跑马灯数字    | `notice-bar` 部分覆盖                   | 低频             |
| `watermark`                                  | 水印          | 无等价                                  | 低频             |
| `signature`                                  | 签名          | 无等价                                  | 低频             |
| `highlight`                                  | 搜索词高亮    | 无等价（可用 `text` 组合）              | 低频，可组合实现 |
| `text-ellipsis`                              | 多行截断      | 无组件，CSS `-webkit-line-clamp` 可实现 | 不需要组件       |
| `floating-bubble`/`floating-panel`           | 悬浮气泡/面板 | 无等价                                  | 低频             |
| `contact-card`/`contact-edit`/`contact-list` | 联系人        | 业务组合                                | 上层 schema      |
| `address-edit`/`address-list`                | 收货地址      | 业务组合                                | 上层 schema      |
| `coupon`/`coupon-cell`/`coupon-list`         | 优惠券        | 业务组合                                | 上层 schema      |
| `action-sheet`                               | 底部操作菜单  | `Sheet` 可组合                          | 不需要独立组件   |

### 2.4 覆盖率统计

| 类别                                   | 数量 | 占比                      |
| -------------------------------------- | ---- | ------------------------- |
| ✅ 已有等价物（L0）                    | ~33  | 31%                       |
| ✅ 已规划（待落地）                    | ~19  | 18%                       |
| 🔴 真实缺口                            | ~15  | 14%（其中高优 6，低优 9） |
| 🟡 业务组合（上层 schema，非框架职责） | ~6   | 6%                        |
| 🟡 可由现有组件组合（无需独立组件）    | ~32  | 30%                       |

**常用组件覆盖率（已有 + 已规划 + 可组合）：~95%**。真实未覆盖且常用的约 6 个（password-input/image-preview/lazyload/area/number-keyboard/back-top）。

---

## 3. 移动端基础设施对比（非组件能力）

这是**比组件清单更重要的维度**——Vant 的成熟度很大程度来自基础设施。

| 基础设施                           | Vant                                                              | Flux                                                                               | 差距                                        |
| ---------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------- |
| **safe-area 适配**                 | `van-safe-area-top/bottom` class + less mixin                     | `mobile-responsive-baseline.md` §2 约定 `nop-safe-*` class，**未实现**             | 🟡 约定有，class 未落地                     |
| **hairline 0.5px 细线**            | `van-hairline` mixin（`::after` 伪元素 + transform scale）        | 无                                                                                 | 🔴 **缺**。高 DPI 屏移动端细线是基本要求    |
| **haptics 触感反馈**               | `HAPTICS_FEEDBACK` class（`van-haptics-feedback`），全组件通用    | 无                                                                                 | 🔴 **缺**。移动端按压反馈基本体验           |
| **global z-index 栈**              | `useGlobalZIndex`（自增计数器，popup/dialog/toast 共享 2000+ 栈） | 无统一栈管理                                                                       | 🔴 **缺**。多浮层叠加时层级混乱风险         |
| **useTouch 手势**                  | `composables/use-touch.ts`（成熟）                                | `use-touch/design.md` 已规划，未实现                                               | 🟡 规划有                                   |
| **useLockScroll（锁 body 滚动）**  | 成熟（popup/dialog 都用）                                         | surface-runtime 应有，需核实                                                       | 🟡 待核实                                   |
| **useCountDown**                   | `vant-use/useCountDown`（rAF 驱动）                               | `countdown` design.md 规划 setInterval + rAF 补偿                                  | 🟡 规划有                                   |
| **主题（dark/light）**             | `ConfigProvider theme='dark'` + `themeVars` CSS 变量注入          | `theme-compatibility.md`：CSS 变量契约，无 ThemeProvider，`.nop-theme-root` 作用域 | 🟢 Flux 方案更解耦（CSS 契约优于 Provider） |
| **CSS 变量主题定制**               | `themeVars`（驼峰 → `--van-xxx`）                                 | `theme-tokens` 包 + CSS 变量                                                       | 🟢 对等                                     |
| **国际化**                         | `locale` 包（zh-CN/en-US + 自定义）                               | `flux-i18n`（zh-CN/en-US）                                                         | 🟢 对等                                     |
| **iconPrefix**（自定义图标库前缀） | ConfigProvider `iconPrefix`                                       | `icon` renderer 支持                                                               | 🟢 对等                                     |
| **触摸目标尺寸**                   | 组件内置（44px+）                                                 | `mobile-responsive-baseline.md` §3 约定，未强制                                    | 🟡 约定有                                   |
| **viewport meta / 软键盘**         | 不管（用户配置）                                                  | baseline §6 约定 `user-scalable=no` + `VisualViewport`                             | 🟡 约定有，playground 未落实                |

**基础设施总结**：Flux 在主题/i18n/icon 上**对等甚至更优**（CSS 契约优于 Provider）；在 **hairline/haptics/z-index 栈**三项上**有真实缺口**，这三项是移动端体验的基本盘。

---

## 4. 整体设计对比（架构哲学）

这是最根本的差异——**Vant 和 Flux 不在同一抽象层级**。

### 4.1 定位差异

| 维度         | Vant                                                    | Flux                                                                       |
| ------------ | ------------------------------------------------------- | -------------------------------------------------------------------------- |
| **定位**     | Vue 3 移动端**组件库**                                  | React 19 **低代码 schema 引擎**（AMIS 重写）                               |
| **使用方式** | 命令式：`<van-button @click="...">` 在 Vue 模板里直接写 | 声明式：JSON schema `{type:'button',onClick:{action:'...'}}` 驱动 renderer |
| **抽象层级** | 组件层（最底层 UI 原子）                                | 引擎层（schema → compiler → runtime → renderer registry → ui 组件）        |
| **目标用户** | 前端开发者（写代码）                                    | 低代码平台用户（配 schema）+ 宿主应用集成                                  |
| **定制方式** | props/slots/CSS 变量/themeVars                          | schema 字段 + region + className + classAliases + 主题 CSS 变量            |
| **可扩展性** | 继承/包装组件                                           | 注册新 renderer（registry）+ 自定义 action/source                          |

### 4.2 数据与交互模型差异

| 能力         | Vant                            | Flux                                                        |
| ------------ | ------------------------------- | ----------------------------------------------------------- |
| **数据获取** | 开发者自己写 `axios` + `ref`    | `data-source` + `api-data-source` 架构，schema 声明式       |
| **表单**     | `van-form` + 手动校验           | `form` runtime + field metadata + validation 引擎           |
| **事件**     | `@click`/`@change` Vue 事件     | `onClick: ActionSchema`（动作系统，可组合）                 |
| **状态管理** | 开发者自选（Pinia/ Vuex / ref） | scope/form/page runtime（Zustand vanilla store）            |
| **路由**     | 不管（依赖 vue-router）         | `navigate` action + `RendererEnv.navigate` 钩子（宿主注入） |
| **弹层**     | 各组件自管 open 状态            | surface-runtime（dialog/drawer/sheet 统一 family）          |
| **国际化**   | `useTranslate` + locale 包      | `flux-i18n` + schema `${i18n:key}` 表达式                   |

### 4.3 Flux 相对 Vant 的优势

1. **schema 可序列化/可持久化/可协同**：Vant 的交互逻辑写在 Vue 模板里，无法序列化；Flux 的 schema 是 JSON，可存库/传输/AI 生成。
2. **动作系统可组合**：`onClick` 是 `ActionSchema`，可编排 `ajax → setValue → openDialog → showToast`，Vant 要手写组合逻辑。
3. **数据源统一**：`data-source` 架构把"取数"标准化，Vant 每个组件自己取。
4. **响应式同组件策略**：Flux 的"同一组件 + Tailwind 断点 + 运行时分支"比 Vant 的"纯移动端组件"更适合"一套代码多端"。
5. **主题解耦**：Flux 用 CSS 变量契约（`.nop-theme-root`），无需 Provider 包裹，宿主集成更灵活。

### 4.4 Flux 相对 Vant 的劣势

1. **移动端成熟度**：Vant 是 7+ 年移动端实战打磨；Flux 移动端从零起步（M0 刚 done，M1–M5 全 todo）。
2. **移动端基础设施**：hairline/haptics/z-index 栈缺位（见 §3）。
3. **渲染性能**：Vant 是直接渲染组件，零 schema 编译开销；Flux 有 schema→runtime 编译层，移动端低端机需关注。
4. **移动端原生交互细节**：Vant 的手势/惯性滚动/回弹动画/触感是成品级；Flux 的 useTouch 还在 design.md。
5. **组件数量密度**：Vant 105 个全是移动端调优成品；Flux 需在 schema 层逐一验证等价表达。

### 4.5 关键洞察：不是"Flux 要复刻 Vant"

Vant 是组件库，Flux 是引擎。正确的问题是：

> **"Vant 的每个交互，Flux 能否用 schema + renderer 表达？"**

答案：

- **组件级交互**（按钮/表单/弹层/列表）：✅ 能，且 roadmap 已覆盖大多数。
- **页面级模式**（Tabbar 导航/商品详情骨架/购物车结算）：🟡 能表达，但缺标准 schema 模板文档。
- **移动端基础设施**（hairline/haptics/z-index）：🔴 不能，需补基础设施层，不是 schema 能解决的。

---

## 5. 真实未覆盖清单（最终版，去重去误判）

综合本次全面核查，**Flux 真正未覆盖且值得补**的项：

### 5.1 基础设施（P0，阻塞移动端体验基本盘）

| 项                       | Vant 实现                | Flux 现状                           | 行动                                                                        |
| ------------------------ | ------------------------ | ----------------------------------- | --------------------------------------------------------------------------- |
| **hairline 0.5px 细线**  | `van-hairline` mixin     | 无                                  | 在 `@nop-chaos/ui` 或 `tailwind-preset` 加 hairline 工具                    |
| **haptics 触感反馈**     | `HAPTICS_FEEDBACK` class | 无                                  | 定义 `nop-haptics` class（`:active { transition: opacity }`）+ 组件默认启用 |
| **global z-index 栈**    | `useGlobalZIndex` 自增   | 无                                  | surface-runtime 加 z-index 栈管理（dialog/drawer/sheet/toast/popover 共享） |
| **safe-area class 落地** | `van-safe-area-*`        | baseline 约定 `nop-safe-*` 但未实现 | 在 ui 包实现 `nop-safe-top/bottom/left/right` class                         |

### 5.2 页面骨架复合模式（P1，可组合但缺文档）

| 模式                 | Vant                              | Flux 现状                                                           | 行动                                                                  |
| -------------------- | --------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Tabbar（路由导航）   | `van-tabbar`                      | M3a 当 "Tabs + footer"，**措辞不准**（Tabbar 是路由导航非内容切换） | 校准 mobile-roadmap 措辞 + 补标准 schema 模板（用 `navigate` action） |
| NavBar（顶部返回栏） | `van-nav-bar`                     | M3a `page.header` region                                            | 补标准 schema 模板（返回按钮 + 标题 + 右操作）                        |
| ActionBar/SubmitBar  | `van-action-bar`/`van-submit-bar` | M3a `page.footer` region                                            | 补标准 schema 模板                                                    |

### 5.3 常用专用组件（P2，按需）

| 组件              | 用途               | 行动                                                      |
| ----------------- | ------------------ | --------------------------------------------------------- |
| `lazyload`        | 图片懒加载（性能） | 进 O1，或用 IntersectionObserver 在 `image` renderer 内建 |
| `image-preview`   | 大图手势预览       | O1，需手势库                                              |
| `password-input`  | 支付密码           | O1，或 `input-password` 移动端变体                        |
| `area`            | 省市区             | O1，配合 address 业务                                     |
| `number-keyboard` | 支付/验证码键盘    | O1                                                        |
| `back-top`        | 回到顶部           | 低成本可补                                                |

### 5.4 长尾（P3，不阻塞）

`index-bar`/`barrage`/`rolling-text`/`watermark`/`signature`/`highlight`/`floating-bubble`/`floating-panel` —— 进 O1 候选池按需启动。

---

## 6. 给 Flux 的建议（按优先级）

### P0 — 补移动端基础设施（hairline/haptics/z-index/safe-area class）

这是 Vant 成熟度的核心，也是 Flux 移动端"看起来像样"的前提。**不是组件问题，是基础设施问题**。建议在 `mobile-roadmap.md` 增 M0.1 工作项或纳入 M0 收尾。

### P1 — 落地已规划工作项

按 roadmap 推进 W1d（pull-refresh/infinite-scroll）+ M5（swipe-cell/countdown/notice-bar）+ M2（表单触摸）+ M3（page region）。这些 design.md 齐全，无需新增规划。

### P1 — 校准页面骨架模式文档

修正 mobile-roadmap 对 Tabbar 的描述（≠ Tabs），补 Tabbar/NavBar/ActionBar/SubmitBar 的标准 schema 模板（用 `navigate` action + `page.header/footer` region）。

### P2 — 评估并补 6 个常用专用组件

lazyload/image-preview/password-input/area/number-keyboard/back-top，走 O1 流程（先更新 amis-baseline-matrix 的 retained 决策）。

### P3 — 长尾组件进 O1 候选池

---

## 7. 数据来源

- Vant 全量：`~/sources/vant/packages/vant/src`（105 组件 + composables 15 + style 基础设施）
- Vant 基础设施：`vant-use`（12 hooks）、`config-provider`（主题/i18n/zIndex）、`style/base.less`（hairline/safe-area）、`composables/use-global-z-index.ts`
- Flux 规划：`docs/components/roadmap.md`（W1–W4）、`docs/components/mobile-roadmap.md`（M0–M5）、`docs/components/amis-baseline-matrix.md`（retained 决策）、`docs/architecture/mobile-responsive-baseline.md`（M0 基线）、`docs/architecture/theme-compatibility.md`（主题契约）
- Flux 代码现状：`packages/ui/src/index.ts`（ui 导出）、`packages/flux-core/src/types/actions.ts`（`navigate` action）、`packages/flux-renderers-basic/src/page.tsx`（region 已实现）、`packages/theme-tokens`、`packages/flux-i18n`
