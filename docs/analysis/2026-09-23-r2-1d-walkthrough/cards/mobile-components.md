# [card] page:mobile-components

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/mobile-components` ｜ **载体**: 域页面（M5 移动端原生渲染器：pull-refresh / infinite-scroll / swipe-cell / countdown / notice-bar，SchemaRenderer 实挂）
- **矩阵裁剪**: full −（裁掉项：glass 皮肤（本波统一）；disabled 态（无样本）。拖拽/手势中间态为本页必查项已全做（touch 事件模拟）；375 主分析 + 1280 一轮；A8 手势替代为第一重点）

## 1. 截图清单（状态矩阵）

| 状态                                    | light                                                                                                                          | dark                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| 默认 375×812                            | `_tmp/visual-inspection-2026-09-23/r2-1d/mobile-components/mc-default-375-light.png`                                           | `…/mc-default-375-dark.png`    |
| pull-refresh 拖拽中间态（释放立即刷新） | `…/mc-pullrefresh-mid-375-light.png`                                                                                           | —（状态机与主题无关）          |
| pull-refresh 释放后（刷新成功）         | `…/mc-pullrefresh-loading-375-light.png`                                                                                       | —                              |
| swipe-cell 滑开态（删除钮露出）         | `…/mc-swipecell-open-375-light.png`                                                                                            | —                              |
| infinite-scroll loading / finished      | `…/mc-infscroll-loading-375-light.png`（永久 loading 证据） / `…/mc-infscroll-finished-375-light.png`（finished 永不出现证据） | dark 默认图内同现 loading 卡死 |
| notice-bar 关闭后                       | `…/mc-notice-closed-375-light.png`                                                                                             | —                              |
| 默认 1280×800                           | `…/mc-default-1280-light.png`                                                                                                  | `…/mc-default-1280-dark.png`   |

## 2. A–H 维度勾选表

- A 交互：A1 ✔ A2 ✔ A3 ✔（滑出按钮 48×28、notice 关闭钮 28×28，扫描零 <24 命中） A4 n/a A5 **fail(R2-1d-A9-01)**（infinite-scroll 永久 loading）＋ warn(R2-1d-A5-04)（notice 截断） A6 ✔（pull/swipe 拖拽实时跟手，无 ghost 需求） A7 n/a A8 **fail(R2-1d-A8-01)**（swipe/pull 无单指针外替代） A9 **fail(R2-1d-A9-01)**
- B 颜色：B1 ✔ B2 ✔ B3 ✔（删除钮 destructive 语义、notice info 语义） B4 ✔ B5 ✔（dark 五组件平价目视） B6 ✔
- C 布局：C1 ✔（375 无文档级横滚；组件内 overflow 为有意设计） C2 ✔（swipe 滑出层与本体无叠压异常） C3 ✔ C4 ✔ C5 ✔ C6 n/a
- D 间隔：D1–D8 ✔（列表行距/hairline 分隔节奏一致）
- E 排布：E1 ✔ E2 ✔ E3 ✔ E4 ✔ E5 ✔ E6 n/a
- F 一致性：F3 ✔（loading spinner 形态与全站 Spinner 同构） F1/F2/F4/F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1d-A9-01] infinite-scroll 演示永久卡在「加载中...」，永不加载下一页、永不出现 finished

- **页面/路由**: `#/mobile-components`（InfiniteScrollDemoHost 直挂 `InfiniteScrollRenderer`，MAX_PAGES=3、PAGE_SIZE=4、LOAD_DELAY_MS=400）
- **主题/视口/状态**: light+dark / 375×812 / 挂载后即卡死（无需滚动触发）
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/mobile-components/mc-infscroll-loading-375-light.png`（条目 1–4 下方 spinner+加载中...）；`…/mc-infscroll-finished-375-light.png`（14 次滚动迭代后 items 仍 4、无「没有更多了」）
- **目视描述**: 页面挂载即显示「加载中...」，之后无论滚动多少次，条目恒为 4 条，「没有更多了」永远不出现。
- **程序化证据**:
  - 探针 A（时间线）: `_tmp/r2-1d-probes/mc-infscroll-trace.json`——14 个采样点（跨 ~10s、滚动至页底）`items:4, loading:true, finished:false` 恒定；
  - 探针 B（根因排障）: `_tmp/r2-1d-probes/mc-infscroll-rootcause.json`——DOM 节点身份稳定（`sameNode/hostSame: true`，排除 remount 循环）、console 零错误（排除 DEV 诊断的 reject/throw）、loading 从首采样即 true——宿主 `setLoading(true)` 已生效而 400ms 定时回调的 `setItems/setLoading(false)` 效果从未呈现；
  - 涉及源码: 渲染器 `packages/flux-renderers-mobile/src/infinite-scroll.tsx`（MA-13 本地 in-flight guard `isLoadingRef`，MM-16 声称「仅当 loading/error 真实跃迁才释放」）× 宿主 `apps/playground/src/pages/mobile-components-demo.tsx` L205（`useCallback` 依赖 [loading, hasMore, page] 的 handleLoadMore + setTimeout）——guard 释放条件与宿主状态回写链路存在失配（OA-07/OA-16 回归位）。
- **对照基准**: 检查提示词 A5（loading 态收敛）/A9（交互反馈非静默挂起）；组件自身测试口径（infinite-scroll.test.tsx 仿宿主应收敛）。
- **严重程度**: P1（组件核心演示在真实页面条件下失效；「加载中」永久挂起属误导性反馈）
- **用户影响**: 演示页向使用者传递「该组件会卡死」的直接观感；真实接入方复制该宿主模式将复现同一挂起。
- **修复方向**: 以最小宿主复现定位：① 核对 MM-16 释放 effect 对 `loading: false→true→false` 序列的判定；② 核对宿主 `events.onLoadMore` 引用更新（`onLoadMoreRef` L67–70 每渲染同步）与 `fireLoadMore` 闭包时序；修复后在本页加「滚动加载至 finished」e2e 断言。
- **归族**: local → R2-4 批（mobile-components demo × 渲染器 guard 集成；若定位为渲染器 guard 缺陷则升 R2-3）
- **复核状态**: 未复核

### [R2-1d-A8-01] swipe-cell / pull-refresh 手势操作无单指针替代与桌面指针路径（WCAG 2.5.7）

- **页面/路由**: `#/mobile-components`（swipe-cell 删除/归档、pull-refresh 刷新）；`#/m5-showcase` home tab pull-refresh 同构
- **主题/视口/状态**: 全主题 / 375 / 手势交互面
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/mobile-components/mc-swipecell-open-375-light.png`（删除钮仅经水平 touch 拖拽可达）
- **目视描述**: swipe-cell 的删除/归档操作唯一暴露路径是水平滑动手势；pull-refresh 的刷新唯一路径是下拉手势。demo 文案明示「触摸设备上拖拽触发交互；桌面端可在 DevTools 设备模拟器内验证」——鼠标拖拽不响应。
- **程序化证据**:
  - 探针: DOM 扫描未发现任何可替代入口（无「更多/操作」按钮、无长按菜单、无键盘等价物；`_tmp/r2-1d-probes/mc-out.json` static.swipeButtonsInDom 初始态即存在于 DOM 但视觉锁定于滑出位）；本探针亦须以 `TouchEvent` 合成才能驱动（`probe-mc.mjs`），桌面 mouse 路径不存在。
  - 输出: 删除钮初始 x=306（锁定）、仅 touch 拖拽后 x=258（露出）。
- **对照基准**: WCAG 2.5.7 拖拽功能须有单指针替代途径；NN/g 直接操作（操作可发现性）。
- **严重程度**: P2
- **用户影响**: 无法执行滑动手势的用户（运动障碍/辅助指针）永远无法触达删除/归档与刷新；桌面鼠标用户同样无法操作（demo 场景下直接影响可演示性）。
- **修复方向**: ① swipe-cell 增加 fallback 触发器（body 右缘「···」按钮或长按菜单，展开同一 action 区域）；② pull-refresh 提供显式刷新按钮位（或接受宿主通过外部 action 触发同一 onRefresh 的契约并写入 flux-guide）；③ 渲染器补 Pointer Events 以覆盖鼠标拖拽。
- **归族**: systemic → R2-3 批（移动渲染器族手势可及性契约，pull/swipe 两组件同根因）
- **复核状态**: 未复核

### [R2-1d-A5-04] notice-bar 长文案静态拦腰截断，无 marquee/省略处理

- **页面/路由**: `#/mobile-components`（notice-bar demo：`closable: true` 未声明 `scrollable`）
- **主题/视口/状态**: light+dark / 375 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/mobile-components/mc-default-375-light.png`（「📣 Notice: M5 移动端原生」在关闭钮前被切半个字）
- **程序化证据**:
  - 探针: 动画与几何扫描（`_tmp/r2-1d-probes/mc-out.json` static）
  - 输出: `notice-bar-content w=614 > cw=153`（内容宽超容器 4 倍）、组件内 `animationName: none`（无 marquee）、无 ellipsis 类——文本在 X 处被硬裁，中文字符切半。
- **对照基准**: 检查提示词 C1/E6；Vant notice-bar 惯例（溢出时默认滚动播放）。
- **严重程度**: P3
- **用户影响**: 通知文案不可读全、截断位砍在字形中间观感差；信息损失但无任务阻塞。
- **修复方向**: `flux-renderers-mobile` notice-bar：内容溢出且未显式 `scrollable: false` 时默认启用 CSS marquee（或至少 text-overflow: ellipsis）。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

## 4. 正向取证（pass 面记录）

- **pull-refresh 状态机全链路**: touch 下拉过程指示器实时跟手（`pull-refresh-indicator` h=60、transform 随位移），过阈值文案「下拉刷新→释放立即刷新」切换，释放后进入「刷新成功」成功态（`hasSuccess: true`）——A6 拖拽反馈合格。
- **swipe-cell**: 滑开露出删除钮（48×28 destructive）、`closeOnOutside` 点击外部后复位（x=258→306）。
- **countdown**: 「剩余 00:27 结束」mm:ss 格式实时递减（跨截图 00:28→00:24 持续走秒）。
- **notice-bar 关闭**: 点击 X 后组件移除（`removed: true`），onClose action 通路正常。

## 5. 误报排除记录

| 疑点                                      | 排除理由                                                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| swipe-cell 初始态 DOM 中即存在删除/归档钮 | 视觉锁定在滑出位（组件容器裁切），属滑出层标准实现；问题仅在替代路径（A8-01 立项），非 DOM 冗余                |
| infinite-scroll 首帧无数据闪现            | 有 spinner+文案（A5 合格），挂起才是缺陷本体（A9-01）                                                          |
| demo 滚动宿主 overflowY visible           | IntersectionObserver 以视口/rootMargin 工作，非缺陷；卡死与滚动容器无关（trace 中 sentinelTop 252 已在视口内） |

## 6. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`；
- findings 归族：A9-01 → R2-4 local（待根因定位，可能升 R2-3）；A8-01 → R2-3 系统性批；A5-04 → R2-4 local；
- 批内复检通过后 → `verified`。
