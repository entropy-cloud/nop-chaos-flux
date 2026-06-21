# 移动商城 Youzan 控件分析 & Flux 移动端适配方案

> 调研日期: 2026-06-21
> 源码位置: `~/sources/`（newbee-mall-vue3-app、litemall/litemall-vue、yudao-mall-uniapp）
> 关联: `docs/components/mobile-roadmap.md`、`docs/architecture/mobile-responsive-baseline.md`
> 目的: 分析有赞 Vant 控件库在移动商城中的实际使用，评估如何在 Flux 中等价支持
>
> **修订注记（2026-06-21）**：本分析 §3.4 把底部 Tabbar 等同为 "`Tabs` + 固定定位 + `page.footer`" 的措辞**不准确**——Tabbar 是路由级导航（配 `navigate` action），与 `tabs`（内容切换控件）语义不同。页面骨架（Tabbar/NavBar/ActionBar/SubmitBar/Sticky）的标准 schema 模板已落地于 `docs/components/page/design.md` §14 移动端骨架模式。详见 `docs/analysis/2026-06-21-mobile-infra-and-skeleton-proposal.md`。

---

## 1. 概述

`~/sources/` 下有三个完整的移动电商项目。其中两个使用了有赞（Vant）控件库：

| 项目                      | Vue 版本         | Vant 版本        | 状态管理 | 特征                               |
| ------------------------- | ---------------- | ---------------- | -------- | ---------------------------------- |
| **newbee-mall-vue3-app**  | Vue 3            | Vant 4.0.9       | Pinia    | 14 页面，含完整的商城功能          |
| **litemall/litemall-vue** | Vue 2            | Vant 2.0.6       | Vuex     | 20+ 页面，更复杂的商城功能         |
| **yudao-mall-uniapp**     | Vue 3（uni-app） | 无（自定义组件） | Pinia    | 跨端，自定义 `s-*`/`su-*` 组件体系 |

---

## 2. 有赞 Vant 控件完整清单

### 2.1 已用控件总表

> 两个项目所有用到控件的并集

| 控件             | Vant 名称                                                          | 两个项目都用了？ | 对应商城场景                          |
| ---------------- | ------------------------------------------------------------------ | ---------------- | ------------------------------------- |
| 地址编辑         | `van-address-edit`                                                 | ✓                | 新增/编辑收货地址                     |
| 地址列表         | `van-address-list`                                                 | ✓                | 选择收货地址                          |
| 底部操作栏       | `van-action-bar` / `van-action-bar-icon` / `van-action-bar-button` | ✓                | 商品详情页底部（收藏/客服/加购/购买） |
| 底部安全区       | `van-safe-area-bottom`                                             | ✗ litemall       | iPhone X 底部适配                     |
| 按钮             | `van-button`                                                       | ✓                | 登录、提交订单等                      |
| 卡片             | `van-card`                                                         | ✓                | 商品列表、订单列表中的商品项          |
| 单元格           | `van-cell` / `van-cell-group`                                      | ✓                | 用户中心、订单详情信息行              |
| 复选框           | `van-checkbox` / `van-checkbox-group`                              | ✓                | 购物车选择                            |
| 折叠面板         | `van-collapse` / `van-collapse-item`                               | ✗ litemall       | 帮助中心 FAQ                          |
| 联系人卡片       | `van-contact-card`                                                 | ✗ newbee         | 订单确认页联系人                      |
| 优惠券           | `van-coupon-cell` / `van-coupon-list`                              | ✗ litemall       | 优惠券选择/列表                       |
| 日期选择         | `van-datetime-picker`                                              | ✗ litemall       | 日期时间选择                          |
| 对话框           | `van-dialog`                                                       | ✓                | 确认操作弹窗                          |
| 分割线           | `van-divider`                                                      | ✗ newbee         | 登录页社交登录分割                    |
| 表单             | `van-form`                                                         | ✗ newbee         | 地址编辑表单                          |
| 输入框           | `van-field`                                                        | ✓                | 表单输入                              |
| 图标             | `van-icon`                                                         | ✓                | 导航、卡片图标                        |
| 图片懒加载       | `van-lazyload` / `Lazyload`                                        | ✓                | 商品图片延迟加载                      |
| 列表（滚动加载） | `van-list`                                                         | ✓                | 商品列表、订单列表无限滚动            |
| 加载             | `van-loading`                                                      | ✓                | 数据加载状态                          |
| 导航栏           | `van-nav-bar`                                                      | ✗ litemall       | 页面顶部导航                          |
| 数字输入框       | `van-stepper`                                                      | ✓                | 购物车数量调整                        |
| 面板             | `van-panel`                                                        | ✗ litemall       | 订单项面板                            |
| 弹出层           | `van-popup`                                                        | ✓                | SKU 选择、筛选面板                    |
| 遮罩层           | `van-overlay`                                                      | ✗ newbee         | 分类页弹窗背景                        |
| 密码输入         | `van-password-input`                                               | ✗ litemall       | 支付密码                              |
| 选择器（Picker） | `van-picker`                                                       | ✗ litemall       | 信息设置选择                          |
| 下拉刷新         | `van-pull-refresh`                                                 | ✗ newbee         | 下拉刷新商品列表                      |
| 单选框           | `van-radio` / `van-radio-group`                                    | ✗ litemall       | 支付方式选择                          |
| 行/列布局        | `van-row` / `van-col`                                              | ✗ litemall       | 布局排列                              |
| 搜索             | `van-search`                                                       | ✗ litemall       | 商品搜索                              |
| 骨架屏           | `van-skeleton`                                                     | ✗ newbee         | 首页加载占位                          |
| SKU 选择         | `van-sku`                                                          | ✗ litemall       | 商品规格选择                          |
| 滑动单元格       | `van-swipe-cell`                                                   | ✗ newbee         | 购物车左滑删除                        |
| 轮播             | `van-swipe` / `van-swipe-item`                                     | ✓                | 商品详情轮播图、首页 Banner           |
| 标签页           | `van-tab` / `van-tabs`                                             | ✓                | 订单状态切换、分类切换                |
| 标签             | `van-tag`                                                          | ✓                | 订单状态标签                          |
| 提交栏           | `van-submit-bar`                                                   | ✓                | 购物车底部结算栏                      |
| Toast            | `van-toast`                                                        | ✓                | 操作反馈提示                          |
| 上传             | `van-uploader`                                                     | ✗ litemall       | 头像/反馈图片上传                     |

### 2.2 未被使用的 Vant 控件（有赞提供但商城未用）

`van-area`（省市区选择）、`van-calendar`（日历）、`van-count-down`（倒计时）、`van-empty`（空状态）、`van-grid`（宫格）、`van-image`（图片）、`van-index-bar`（索引栏）、`van-notice-bar`（通知栏）、`van-notify`（消息通知）、`van-pagination`（分页）、`van-progress`（进度条）、`van-rate`（评分）、`van-share-sheet`（分享面板）、`van-sidebar`（侧边导航）、`van-signature`（签名）、`van-skeleton`（骨架屏）、`van-slider`（滑块）、`van-steps`（步骤条）、`van-sticky`（粘性布局）、`van-swiper`（滑块）、`van-tree-select`（树形选择）等。

---

## 3. 控件功能等价对照表（Vant → Flux）

> 按优先级分组讨论

### 3.1 Flux 已实现（或已规划）

| Vant 控件              | Flux 等价物（现有或已规划）             | 状态      | 备注                          |
| ---------------------- | --------------------------------------- | --------- | ----------------------------- |
| `van-button`           | `Button`（`@nop-chaos/ui`）             | ✅ 已有   | 需确认是否支持 block 全宽模式 |
| `van-checkbox`         | `Checkbox`（`@nop-chaos/ui`）           | ✅ 已有   |                               |
| `van-dialog`           | `Dialog`（`@nop-chaos/ui`）             | ✅ 已有   |                               |
| `van-field`            | `Input` / `Textarea`（`@nop-chaos/ui`） | ✅ 已有   |                               |
| `van-icon`             | `Icon`（renderer）                      | ✅ 已有   |                               |
| `van-loading`          | `Spinner`（`@nop-chaos/ui`）            | ✅ 已有   |                               |
| `van-popup`            | `Popover` / `Sheet`（`@nop-chaos/ui`）  | ✅ 已有   |                               |
| `van-radio`            | `RadioGroup`（`@nop-chaos/ui`）         | ✅ 已有   |                               |
| `van-search`           | `Input` + 业务封装                      | ✅ 已有   | 搜索框组合                    |
| `van-stepper`          | `InputNumber`（`flux-renderers-form`）  | ✅ 已有   |                               |
| `van-swipe`            | `Carousel`（`flux-renderers-content`）  | ✅ 已有   |                               |
| `van-tab` / `van-tabs` | `Tabs`（`flux-renderers-basic`）        | ✅ 已有   | 需添加移动端 swipe 支持       |
| `van-tag`              | `Badge`（`@nop-chaos/ui`）              | ✅ 已有   |                               |
| `van-uploader`         | `InputFile`（`flux-renderers-form`）    | ✅ 已有   |                               |
| `van-divider`          | `Separator`（`@nop-chaos/ui`）          | ✅ 已有   |                               |
| `van-skeleton`         | `Skeleton`（`@nop-chaos/ui`）           | ✅ 已有   |                               |
| `van-sticky`           | 无直接等价                              | 🟡 需实现 | `position: sticky` 容器       |
| `van-count-down`       | 无直接等价                              | 🟡 需实现 | 倒计时组件                    |
| `van-notice-bar`       | 无直接等价                              | 🟡 需实现 | 通知栏                        |
| `van-share-sheet`      | 无直接等价                              | 🟡 需实现 | 分享面板                      |

### 3.2 Flux 有原型但需移动端适配

| Vant 控件                             | Flux 等价物               | 移动端改造需求                                         |
| ------------------------------------- | ------------------------- | ------------------------------------------------------ |
| `van-action-bar`                      | `Button` 组合             | 底部固定操作栏，在 `page` 添加 `footer` region（需 M3a |
| `van-card`                            | `Card`（`@nop-chaos/ui`） | 移动端商品卡片的布局模板（图片左文字右，含价格/标签）  |
| `van-cell` / `van-cell-group`         | `Card` 或自定义布局       | 移动端列表式信息展示，本质是布局模式而非独立组件       |
| `van-coupon-cell` / `van-coupon-list` | 业务组件                  | 优惠券选择器，属于业务层                               |
| `van-submit-bar`                      | `Button` 组 + 固定定位    | 底部固定结算栏，可复用 `footer` region                 |
| `van-swipe-cell`                      | 无直接等价                | 左滑显示操作按钮，需新增手势支持                       |

### 3.3 需新增的组件

| Vant 控件                               | 建议策略                                  | 优先级    | 理由                           |
| --------------------------------------- | ----------------------------------------- | --------- | ------------------------------ |
| `van-address-edit` / `van-address-list` | 业务组件，组合现有表单控件实现            | M4+       | 收货地址是商城业务，非通用控件 |
| `van-contact-card`                      | 业务组合控件                              | M4+       | 联系人信息卡片                 |
| `van-list`（无限滚动）                  | 新增 `InfiniteScroll` 容器或集成到 `CRUD` | **M1/M4** | 移动端核心交互模式             |
| `van-pull-refresh`                      | 新增 `PullRefresh` 容器                   | **M1**    | AMIS 已有参考实现              |
| `van-sku`                               | 业务组件（规格选择面板）                  | M4+       | 商城特定业务                   |
| `van-coupon-cell` / `van-coupon-list`   | 业务组件                                  | M4+       | 优惠券业务                     |

### 3.4 布局模式（非独立组件，但需要支撑）

> **修订（2026-06-21）**：早期下表把 Tabbar 等同为 "`Tabs` + 固定定位"，措辞不准确。Tabbar 是**路由级导航**（`navigate` action），**≠ `tabs`**（内容切换控件）。5 类页面骨架的标准 schema 模板已落地 `docs/components/page/design.md` §14，统一用 `page.header`/`page.footer` region + `flex`/`button`/`container` 表达，**不新增独立组件**。

| Vant 模式                        | Flux 方案                                                                   | 优先级 | 模板位置                          |
| -------------------------------- | --------------------------------------------------------------------------- | ------ | --------------------------------- |
| 底部 Tabbar（`van-tabbar`）      | `page.footer` + `flex`+`button`+`navigate` action（**≠ `tabs`**，路由导航） | M3a    | `page/design.md` §14.1            |
| 页面顶部 NavBar（`van-nav-bar`） | `page.header` region（返回 `navigate(-1)` + 标题 + 右操作）                 | M3a    | `page/design.md` §14.2            |
| 底部固定操作栏（ActionBar）      | `page.footer` region（图标按钮组 + 大号 CTA）                               | M3a    | `page/design.md` §14.3            |
| 结算栏（SubmitBar）              | `page.footer` region（复选 + 价格 + CTA）                                   | M3a    | `page/design.md` §14.4            |
| 吸顶（Sticky）                   | `container` + `sticky top-{header高}` className                             | M3a    | `page/design.md` §14.5            |
| 商品卡片模板                     | 实现 `Card` 组件的移动端水平变体（图片左文字右）                            | M4     | `cards/design.md`（W2a 范围内补） |
| 全屏选择器                       | `Select` 的小屏 bottom-sheet 模式                                           | M1a    | `select/design.md` 增响应式小节   |

---

## 4. 移动商城页面对应 Flux 组件映射

> 以 newbee-mall-vue3-app 的 14 个页面为例，映射到 Flux 组件

| 商城页面         | 使用的 Vant 控件                                                        | Flux 组件映射                                                  | 实现状态                         |
| ---------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------- |
| 首页（Home）     | `van-skeleton`、`van-icon`、轮播图                                      | `Skeleton` + `Icon` + `Carousel`                               | ✅ 已有                          |
| 登录（Login）    | `van-button`、`van-divider`、`van-icon`                                 | `Button` + `Separator` + `Icon`                                | ✅ 已有                          |
| 用户中心（User） | `van-cell`、`van-cell-group`、`van-icon`                                | 布局 + `Icon` + `Button`                                       | 🟡 布局需组合                    |
| 分类（Category） | `van-tabs`、`van-tab`、`van-list`                                       | `Tabs` + `InfiniteScroll`（需新增）                            | 🟡 缺 InfiniteScroll             |
| 商品列表         | `van-pull-refresh`、`van-list`、`van-card`                              | `PullRefresh`（需新增）+ `InfiniteScroll`（需新增）+ `Card`    | 🟡 缺 PullRefresh/InfiniteScroll |
| 商品详情         | `van-swipe`、`van-action-bar`                                           | `Carousel` + `page.footer`                                     | 🟡 需 M3a footer                 |
| 购物车           | `van-checkbox-group`、`van-swipe-cell`、`van-stepper`、`van-submit-bar` | `Checkbox` + 手势滑动（需新增）+ `InputNumber` + `page.footer` | 🟡 缺手势滑动                    |
| 创建订单         | `van-contact-card`、`van-submit-bar`                                    | 业务组合 + `page.footer`                                       | 🟡 业务组合                      |
| 地址列表         | `van-address-list`                                                      | 业务组件                                                       | M4+                              |
| 地址编辑         | `van-address-edit`、`van-form`、`van-field`                             | 业务组合表单                                                   | M4+                              |
| 订单列表         | `van-tabs`、`van-tab`、`van-card`、`van-list`                           | `Tabs` + `Card` + `InfiniteScroll`（需新增）                   | 🟡 缺 InfiniteScroll             |
| 订单详情         | `van-card`、`van-cell`、`van-dialog`                                    | `Card` + 布局 + `Dialog`                                       | ✅ 已有                          |
| 设置             | `van-cell`、`van-cell-group`                                            | 布局                                                           | 🟡 布局需组合                    |
| 关于             | 无特殊控件                                                              | 静态内容                                                       | ✅                               |

---

## 5. Vant 控件在 Flux 中的处理策略总表

| 分类               | 处理策略                                       | 涉及 Vant 控件数 | 工作量估计 |
| ------------------ | ---------------------------------------------- | ---------------- | ---------- |
| **已有直接等价**   | Flux `@nop-chaos/ui` 组件直接替换              | 14 个            | 0          |
| **需要移动端适配** | 现有组件增加响应式行为（断点 + 触摸）          | 8 个             | 中         |
| **需要新增组件**   | 新增 Flux 组件（PullRefresh、InfiniteScroll）  | 2 个             | 大         |
| **业务组合组件**   | 由上层业务 schema 组合现有控件实现             | 6 个             | 小         |
| **布局模式**       | 完善 `page` 的 header/footer region + 固定定位 | 3 种模式         | 中         |

---

## 6. 使 Flux 支持移动应用的关键缺口

### 6.1 必须新增的组件和交互

#### 6.1.1 PullRefresh（下拉刷新）

**优先级**: M1（高频交互）
**参考实现**: AMIS `PullRefresh.tsx`（277 行），Vant `van-pull-refresh`
**要求**:

- 支持 `direction: 'down' | 'up'`
- 状态机: `normal → pulling → loosing → loading → success`
- 配合 `useTouch` Hook 做手势检测
- 集成到 `Page` 和 `CRUD` renderer

#### 6.1.2 InfiniteScroll（无限滚动）

**优先级**: M1（高频交互）
**参考实现**: Vant `van-list`
**要求**:

- IntersectionObserver 检测底部
- 加载更多回调、loading/error/empty 状态
- 集成到 `CRUD` renderer

#### 6.1.3 Touch 手势 Hook（useTouch）

**优先级**: M0（基础设施）
**参考实现**: AMIS `use-touch.ts`（100 行）
**要求**:

- 追踪 touchstart/touchmove/touchend
- 水平和垂直手势判别（10px 阈值）
- 方向判断（上/下/左/右）
- Swipe 事件

#### 6.1.4 BottomSheet（底部弹出面板）

**优先级**: M1a（Select 移动端变体）
**参考实现**: AMIS `PopUp.tsx`（177 行）
**要求**:

- 从底部滑入的全屏/半屏面板
- 阻止 body 滚动
- 拖拽关闭手势

### 6.2 现有组件需做的移动端适配

| 组件                                 | 移动端改造                           | 对应 roadmap |
| ------------------------------------ | ------------------------------------ | ------------ |
| `Select` / `TreeSelect`              | 小屏使用 BottomSheet 而非下拉浮层    | M1a          |
| `Table`                              | 小屏卡片堆叠模式                     | M1b          |
| `Dialog` / `Drawer`                  | 小屏 Dialog 全屏覆盖                 | M1c          |
| `Tabs`                               | 小屏横向滚动 + 触摸 Swipe            | M1d          |
| `Input` 族                           | 增大触摸目标、适配合适的 `inputmode` | M2a          |
| `Checkbox` / `RadioGroup` / `Switch` | 增大触摸目标                         | M2b          |
| `Button`                             | 小屏 `block` 全宽模式                | M2c          |
| `NumberInput`                        | 增大触摸目标（+/- 按钮）             | M2a          |

### 6.3 Page 布局需要的能力

| 能力                 | 说明                                         | 优先级 |
| -------------------- | -------------------------------------------- | ------ |
| `page.header` region | 页面顶部导航栏（标题 + 返回 + 操作）         | M3a    |
| `page.footer` region | 页面底部固定栏（购物车结算、商品详情操作栏） | M3a    |
| `page.aside` 折叠    | 小屏隐藏/折叠侧边栏                          | M3a    |

### 6.4 屏幕适配基础设施

| 需求           | 说明                                               | 优先级 |
| -------------- | -------------------------------------------------- | ------ |
| 响应式断点规范 | Tailwind 默认断点（sm: 640, md: 768, lg: 1024）    | M0     |
| 安全区域适配   | safe-area-inset-\* 环境变量，适配刘海屏/底部指示条 | M0     |
| 触摸目标尺寸   | 最小 44x44px 触控区域                              | M0     |
| 软键盘处理     | 表单输入时视口滚动、fixed 元素重定位               | M2a    |

---

## 7. 推荐实施路径

### Phase 0: 基础设施（M0，预计 1-2 周）

- [x] 确定响应式断点规范（已有 Tailwind sm/md/lg）
- [ ] 实现 `useTouch` Hook
- [ ] 实现安全区域 CSS 变量适配
- [ ] 制定触摸目标尺寸规范
- [ ] 完成 `mobile-responsive-baseline.md`

### Phase 1: 高频交互组件（M1，预计 2-3 周）

- [ ] 实现 `PullRefresh` 组件
- [ ] 实现 `InfiniteScroll` 组件
- [ ] 实现 `BottomSheet` 组件
- [ ] Select/TreeSelect 移动端 BottomSheet 模式
- [ ] Tabs 移动端触摸 Swipe
- [ ] Dialog 移动端全屏覆盖

### Phase 2: 表单控件触摸适配（M2，预计 1-2 周）

- [ ] Input 族触摸目标增大 + inputmode
- [ ] Checkbox/Radio/Switch 触摸目标增大
- [ ] Button 小屏 block 模式

### Phase 3: 容器与布局（M3，预计 1-2 周）

- [ ] Page header/footer region
- [ ] Flex/Container/Grid 响应式断点

### Phase 4: 数据展示（M4，预计 1-2 周）

- [ ] CRUD 移动端简化
- [ ] Table 卡片堆叠
- [ ] Cards/List 小屏单列

---

## 8. 参考资源

- AMIS 移动端实现: `~/app/amis-react19/packages/amis-core/src/utils/helper.ts`
- AMIS PullRefresh: `~/app/amis-react19/packages/amis-ui/src/components/PullRefresh.tsx`
- AMIS PickerColumn: `~/app/amis-react19/packages/amis-ui/src/components/PickerColumn.tsx`
- AMIS SelectMobile: `~/app/amis-react19/packages/amis-ui/src/components/SelectMobile.tsx`
- AMIS use-touch: `~/app/amis-react19/packages/amis-ui/src/hooks/use-touch.ts`
- Vant 4 文档: https://vant-ui.github.io/vant/#/zh-CN
- Flux mobile-roadmap: `docs/components/mobile-roadmap.md`
- Flux mobile-responsive-baseline: `docs/architecture/mobile-responsive-baseline.md`（占位）
