# 移动端组件库深度调研报告（面向 Flux mobile 支持增强）

> 调研日期：2026-10-19
> 调研范围：11 个移动端 UI 库/手势引擎的本地源码（`~/sources/`）+ 网上维护状态核对
> 上游输入：`docs/analysis/2026-06-21-flux-mobile-gap-analysis-vs-vant.md`（仅对照 Vant，驱动了 M0–M5）
> 输出去向：`docs/components/mobile-roadmap.md`（M6+ proposed 工作项，本文为其依据）
> Flux 现状基线：`packages/flux-renderers-mobile`（pull-refresh / infinite-scroll / swipe-cell / countdown / notice-bar 共 5 组件 + `useTouch` hook）+ M0–M4 响应式适配（全部 `done`）

---

## 0. 结论先行（TL;DR）

1. **组件广度**：Flux 移动端原生组件（5 个）对比主流库（vant 107 / antd-mobile 83 / nutui 108 / tdesign-mobile 60+ / arco-mobile 58 / framework7 68 / zarm 53）缺口明确，且缺口高度**收敛于一个共识集合**（§6）：**Picker 滚轮家族、FloatingPanel、IndexBar、ImageViewer（手势缩放）、NumberKeyboard、ActionSheet 形态、Signature、SearchBar、FloatingBubble** —— 9 个组件在 3 个以上库中同时存在，是移动端 H5 的事实标准配置。
2. **交互手感**：比组件清单更大的差距在**手势基建**。Flux `useTouch` 只有 delta + 10px 方向锁，无速度追踪、无橡皮筋、无惯性；而四个流派（§4）都已把 velocity/rubberband/momentum 沉淀为共享层。**好消息：全部核心算法是几十行的纯函数**（§5），自研吸收成本极低，不需要引入 use-gesture/react-spring 依赖。
3. **建议路线**：先做 **M6 手势基建升级**（velocity + rubberband + momentum + 吸附 + 滚动锁，纯函数共享层），再做 **M7 Picker 滚轮家族**（共识度最高、算法密度最高），然后按 M8–M11 分组补齐（§8）。现有 5 组件的手感升级（swipe-cell 甩动、pull-refresh 阻尼统一）随 M6 顺带完成。
4. **架构红线全部维持**：不建 `*-mobile` 双实现；Tabbar/NavBar/ActionBar/SubmitBar/Sticky 维持 page region 复合模式；进 mobile 包的只新增移动原生交互组件（§7 逐项判定）。
5. **推荐实现风格**（从源码对比得出）：惯性动画用 **rAF + 可打断插值**（TDesign `picker.class.ts` 路线），不用 CSS transition（NutUI 路线，中途变更 schema 无法 stopMomentum）；滚轮也可评估 **scroll-snap 原生方案**（framework7 144 行 / Ionic v9 路线，代码量最小但失去实时进度回调）。

---

## 1. 调研方法

1. **选型**：覆盖三类对象——① React 移动端组件库（antd-mobile、arco-design-mobile、tdesign-mobile-react、zarm、react-vant）；② Vue 移动端组件库作交互语义参照（vant 4、nutui 4）；③ 移动端框架/手势引擎（framework7、ionic-framework、swiper、embla-carousel、use-gesture）。
2. **源码落地**：全部 clone 到 `~/sources/`（复用该目录下重试脚本 `_clone.sh`，github.com 直连当日上午不稳定，脚本重试机制生效）。zarm/embla 当日多次重试未成功，分析经 GitHub 在线源码完成，后续可补 clone（§9）。
3. **分析口径**：每库统一五项——库概况、组件全量清单（标注移动原生交互组件）、手势与交互基础设施（文件路径级）、独有/亮点技术、与 Flux 的缺口对照。9 份分库报告的要点沉淀于本文 §3–§5，完整细节以分库报告为准（存档于会话记录；关键结论均已附源文件路径，可随时复核）。
4. **缺口综合**：对每个候选组件统计「出现库数」，≥3 个库实现的视为**高频共识组件**；再按 §7 的归属红线判定 Flux 侧落点。

## 2. 库全景对比

| 库 | 版本（实测） | 技术栈 | 组件数 | 维护状态（最近提交） | 手势方案 |
| --- | --- | --- | --- | --- | --- |
| vant 4 | 4.9.24 | Vue 3 | 107 | 2026-06，稳定维护期 | 自研 `@vant/use` + useTouch 组合式 |
| antd-mobile 5 | 5.43.0 | React | 83 | 2026-09，活跃 | `@use-gesture/react` + `@react-spring/web` 全面弹簧化 |
| nutui 4 | 4.3.15（Vue）/ 4.0.0-beta（React 独立仓） | Vue3+React 双端 | 108 | 2026-03（Vue） | 自研 useTouch（vant 同源）；React 版声明 use-gesture 但实际基本自研 |
| arco-design-mobile | 2.39.1 | React | 58 | 2026-08，放缓 | 自研 touch 三件套 + 自研 `@arco-design/transformable`（pinch） |
| tdesign-mobile-react | 1.0.0（2026-10 正式版） | React | 60+ | 2026-10，非常活跃 | 自研 useTouch + `@use-gesture` 仅 swipe-cell 一处 |
| framework7 9 | 9.2.0 | 框架无关 core + 三框架适配 | 68 | 2026-10，活跃 | 全局 touch 模块（active-state/ripple/防穿透/tapHold 四合一） |
| ionic-framework 9 | 9.0.8 | Stencil WC + 框架薄封装 | ~50 | 2026-10-16，极活跃 | **全局 GestureController 仲裁体系**（priority capture 独占） |
| swiper 14 | 14.3.0 | 框架无关引擎 | — | 2026-10-16，极活跃 | Pointer Events 状态机（v14 重构中） |
| embla-carousel | 8.6.0（Flux 实装版） | 框架无关引擎 | — | 活跃 | DragTracker（170ms 采样窗）+ 临界阻尼弹簧 |
| use-gesture | 10.3.1 | React/框架无关 | — | 2024-03 后低维护 | Pointer + touch 双轨手势原语 |
| zarm 3 | 3.4.2 | React | 53 | 2026-09，活跃 | `@use-gesture/react` + better-scroll（picker/wheel） |

**React 选型结论**：React 系里 antd-mobile（最完整、弹簧化最彻底）与 tdesign-mobile-react（最新、活跃度最高）质量最突出；arco-mobile 的 token 三态编译与 transformable pinch 值得借鉴；react-vant 已停更 2 年+，**不作参考实现**；zarm 的金融级 keyboard/keyboard-picker 是独有资产。Vue 系 vant 交互语义仍是行业基线（Flux 现有 useTouch 即其同源移植）。

## 3. 手势基础设施四流派（横向综合）

| 流派 | 代表 | 核心机制 | 优点 | 代价 |
| --- | --- | --- | --- | --- |
| **A. 自研 touch 组合式** | vant、nutui、tdesign（部分）、**Flux 现状** | touchstart/move/end + delta + 10px 方向锁；惯性由各组件自己实现（CSS transition 或 rAF） | 零依赖、语义透明 | 无共享 velocity/rubberband；各组件手感不一致；无法跨组件仲裁 |
| **B. use-gesture + 弹簧系** | antd-mobile（全面）、zarm（部分）、tdesign（仅 swipe-cell） | pointer events、`velocity` 现成、rubberband 纯函数、react-spring 弹簧动画 | 手感统一、物理正确、可打断 | +12~15kB gzip；弹簧库依赖；低维护风险（use-gesture 年余未更新） |
| **C. 原生 scroll-snap 系** | framework7 picker（144 行）、ionic v9 picker | `scroll-snap-type: y mandatory` + scroll 事件算值，惯性完全交给浏览器 | 代码量最小、惯性免费 | 无实时进度回调、无法自定义惯性曲线、嵌套手势控制弱 |
| **D. 全局仲裁系** | ionic（GestureController）、framework7（全局 touch 模块） | 单例手势管理器：priority capture 独占 + disableScroll 引用计数 + active/passive 事件分层 | 多手势共存（swipe-back vs item-swipe vs refresher）有确定性 | 架构侵入性强，需框架级设计 |

**Flux 适配判断**：现状属流派 A（与 vant/nutui/tdesign 同源）。推荐演进 = **A 的骨架 + 吸收 B 的三个纯函数**（velocity/rubberband/momentum，见 §5）+ **借 D 的仲裁思想做轻量版**（同屏手势优先级约定，M6 交付时决策是否需要 capture 级仲裁）。不引入 use-gesture/react-spring 依赖：Flux 只需 3 个纯函数（合计 <2kB），而依赖会带来 15kB + 5 组件迁移成本 + 低维护风险（分库评估一致结论）。唯一例外：若未来做双指缩放画布类交互，可再评估。

## 4. 分库分析摘要（每库要点 + 最高价值借鉴点）

### 4.1 vant 4（107 组件，行业基线）

- **@vant/use 组合式函数**（`packages/vant-use/src/`）是共享基建的范本：`useScrollParent`（向上找滚动容器）、`usePageVisibility`（模块级单例监听，autoplay 后台暂停靠它）、`useEventListener`（默认 passive:false，手势组件靠它 preventDefault）、`useClickAway`、`useRect`。
- **useLockScroll**（`src/composables/use-lock-scroll.ts`）：全局计数 + body class + document 级 touchmove **方向位掩码判定**（`'11'`可滚/`'01'`到顶/`'10'`到底，与滑动方向按位与决定 preventDefault）——滚动穿透防护的事实标准。
- **Picker 滚轮**（`src/picker/PickerColumn.tsx`）：惯性触发 `300ms/15px`，`惯性距离 = speed/0.003`（减速度系数），越界 clamp 一列拉伸回弹，`transitionEndTrigger` 闭包把 `emit('change')` 挂起到动画落定才执行。
- **ImagePreview 双指缩放**（`src/image-preview/ImagePreviewItem.tsx`）：以触点为不动点缩放（`matrix(scale,0,0,scale,moveX,moveY)`）、双击 1↔2、长图单指平移模式、缩放态冻结横翻（手势仲裁范例）。
- **FloatingPanel**（`src/floating-panel/FloatingPanel.tsx`）：锚点最近吸附 + DAMP=0.2 越界阻尼 + 「面板未满屏拖面板/满屏滚内容」滚动仲裁（`maxScroll` 峰值记录）。
- **2023–2026 新增组件**（值得关注的增量）：FloatingPanel/FloatingBubble/Signature/RollingText/Barrage/Highlight/BackTop/TextEllipsis；SwipeCell threshold 可配、Signature undo、useGlobalZIndex 导出为 2026-03 增强。

### 4.2 antd-mobile 5（83 组件，React 最完整）

- **全面弹簧化**：所有手势组件用 `useDrag` + react-spring（tension 200–400）；picker wheel（`src/components/picker-view/wheel.tsx`）`useSpring({tension:400,mass:0.8})` + 拖拽中 `draggingRef` 抑制受控回写 + 受控值变化 `immediate: y.goal !== finalPosition` 防动画风暴 + 运行时测量 itemHeight + 内建 aria。
- **rubberband.ts**（`src/utils/`）：`rubberband(d,dim,k) = d·dim·k/(dim+k·d)`，20 行纯函数，picker/pull-refresh/swiper 全在用。
- **「velocity×50 投掷 + nearest 锚点吸附」**是 swipe-action/wheel/floating-panel 的统一落点算法（`src/utils/nearest.ts`）。
- **useLockScroll**（`src/utils/use-lock-scroll.ts`）：vant 方案 + `'strict'` 模式 + **局部锁**（传 elementRef，floating-panel 用）。
- **render-imperatively**（`src/utils/render-imperatively.tsx`）：命令式弹层标准范式——close() 先播退场动画再卸载、支持 replace()，Dialog.alert/Toast/ActionSheet 全靠它。
- 其他可借：scroll-mask 渐隐（60 行）、reduce-and-restore-motion 全局动画降级、supports-passive 探测。
- 无全局 z-index 栈（CSS 变量分层 1000+10n）——**Flux 的 useGlobalZIndex 反而更强，保留**。

### 4.3 nutui 4（108 组件，电商场景最深）

- 组件与 vant 高度同构，特色在电商域：**sku 规格矩阵、address 省市区+列表双模、barrage 轨道弹幕、elevator 楼层锚点、category 左侧分类联动、ecard**。
- Picker 惯性与 vant 同参（`speed/0.003`，`INERTIA_TIME=300/INERTIA_DISTANCE=15`），但用 CSS transition + `transitionend` 落定——**schema 驱动下不如 rAF 可打断**（TDesign 对比见 §8 M7）。
- 3D 滚筒渲染（`rotate3d + translate3d(0,0,104px)`，每项 20°）、可见区外 `isHidden` 省渲染。
- 全库 grep 无 `navigator.vibrate`——CSS haptics（Flux `nop-haptic`）反而是差异点，各库均未做真振动。

### 4.4 arco-design-mobile 2.39（58 组件，工程质量突出）

- **usePopupScroll**（`components/_helpers/hooks.ts` L312–496）：touchstart 沿 DOM 收集滚动容器链，touchmove 按「当前方向是否已到边界」决定 preventDefault——弹层内嵌滚动通杀方案，优于单纯 body overflow 锁。
- **Picker 内核三层复用**：picker-cell（单滚轮）→ multi-picker → cascader → date-picker 纯配置派生——**一个内核支撑 4 个组件**（M7 的结构蓝本）。
- picker-cell 惯性参数组：触发 `<300ms 且 >90px`、`speed=2|d|/t`、`deceleration=0.003`、超界 weekBounce（≤300）/strongBounce（>300）双档回弹、三档 bezier 曲线。
- **SwipeLoad**（`components/swipe-load/`）：行程式滑动确认（抖音式），比 swipe-cell 多「行程-确认」状态机——移动端独有交互模式，Flux 无对应物。
- **image-preview**：自研 `@arco-design/transformable` pinch + **防 iOS 放大模糊**（缩放时重写 width/height 并对 img 施 `scale(1/scale)` 反向补偿）+ 与 carousel 手势仲裁。
- **Keyboard**（`components/keyboard/`）：数字键盘 `randomness` 乱序防窥；token 三态编译（同一份 less 源产出 CSS 变量版/静态版）。

### 4.5 tdesign-mobile-react 1.0（60+ 组件，最新最活跃）

- 与 Flux 同源的 useTouch（10px 锁轴）+ **全库唯一 use-gesture 使用点是 swipe-cell**：`offset + velocity[0]·direction[0]·50` 甩动补偿 + `nearest()` 三点吸附——比静态阈值更接近原生手感的现成范式。
- **Picker 用 rAF + quartEaseOut 手动插值**（`src/picker/picker.class.ts`）：可随时 `stopInertiaMove` 打断——**比 NutUI 的 CSS transition 更适合 schema 驱动**（数据中途变更需要停止惯性）。
- `defaultProps.ts + useDefaultProps` 集中声明 + `Td*Props` 类型分离——与 Flux schema→props 契约组织同构。
- indexes（非 passive touchmove + elementFromPoint 定位）、image-viewer 手势仲裁（捏合冻结 swiper）、guide 挖洞引导为亮点。

### 4.6 framework7 9（68 组件，原生交互模拟最全）

- **全局 touch 模块**（`src/core/modules/touch/touch.js`，514 行）：单 document 监听同时提供 active-state（滚动容器内延迟 80ms 防闪烁）、md ripple 波纹、click 防穿透（5px 阈值捕获阶段拦截）、tapHold 长按、segmented 滑动换选。
- **Sheet 三件套**（`sheet-class.js`）：swipeToClose 速度判定 `(t<300 && d>20) || d>h/2`、breakpoints 半开档位、backdrop/push 随 progress 插值——ui 层 Sheet/Drawer 手势关闭的完整蓝本。
- **Picker = 原生 scroll-snap**（`picker-column.js` 仅 144 行）+ rotateEffect 3D 变换，流派 C 最小实现。
- Pull-to-refresh 橡皮筋 `^0.85` 幂阻尼 + iOS 分段 spinner 进度（3 条 bar 按 opacity 分段点亮）；swipeout overswipe（滑超 1.15×按钮宽度直接触发首按钮）；virtual-list 的 **renderExternal 模式**（核心只算区间，DOM 交给框架层渲染——schema 驱动的正确边界划分）。
- 全库无 `navigator.vibrate`（触觉交给宿主容器），与 nutui/tdesign 结论一致。

### 4.7 ionic-framework 9（core 层，手势仲裁唯一样本）

- **GestureController**（`core/src/utils/gesture/gesture-controller.ts`）：单例 + requestedStart Map + max-priority capture 独占；实际优先级表 menu=30 → refresher=31 → overlay 下拉=39 → modal sheet=40 → item-swipe=100 → swipe-back=101 → reorder=110；disableScroll 引用计数仅在 0→1 时锁 body。
- **手势质量细节**：速度低通滤波 `v = v·0.3 + 新值·0.7`（丢弃 >100ms 帧）+ onMove rAF 队列去抖；capture 成功后**重置起点**（threshold 不造成画面跳变）；touchend 绑在 `ev.target`（目标被移出 DOM 也能收到 up）；`MOUSE_WAIT=2000ms` 防触摸后 ghost mouse 双发。
- **item-sliding**：ELASTIC_FACTOR=0.55 边缘阻尼 + velocity 0.3 阈值 + 三布尔 K-map 真值表松手决策 + 模块级全局单开 + 关闭动画期 600ms 禁手势。
- **refresher**：位枚举状态机（`_BUSY_` 掩码防重入）+ MD 版 WAAPI progressStart/Step/End（手势与动画可互相打断）+ iOS 版借原生 rubber-band 负 scrollTop。
- **overlay 分层基数 z-index**：overlayIndex 全局递增 + 类型基数（modal 2 万 / loading 4 万 / toast 6 万）——toast 永远压过 modal 上的 alert，比纯递增计数更可控。
- **scrollAssist 键盘避让**（`utils/input-shims/hacks/scroll-assist.ts`）：可视区 = min(contentBottom, innerHeight − keyboardHeight) ±15px，滚动时长 = 距离/0.3 clamp(150,400)ms。
- v9 picker = scroll-snap + IntersectionObserver 居中检测（与 framework7 同流派 C）；v7 已删 virtual-scroll 与 picker-legacy。

### 4.8 swiper 14 / embla 8.6（两个轮播引擎，Flux 用 embla）

- **embla（Flux ui Carousel 底座，实装 8.6.0）**：临界阻尼弹簧 `velocity += (target−location)/duration; velocity *= friction`（基准 0.68/25）；DragTracker **170ms 采样窗求 force，|force|>0.1 才判 flick**（防长按慢拖误飞）；DragHandler 松手「甩得越快时长越短摩擦越大」；**loop 纯 transform 不克隆 DOM**（ScrollLooper 轨道瞬移 + SlideLooper 缺口回填 + canLoop 校验失败自动降级）；click 捕获阶段防误触（6px）。
- **swiper 14**：0.85 次幂 rubber-band、freeMode 动量（`v×1000×ratio` + bounce `|v|×20` + sticky 最近格吸附 + 时长钳制 speed/1.5×/2.5×）、双样本速度 + 150/300ms 陈旧性归零、loop v14 改 DOM 重排零克隆、touchAngle 45° 一次锁定判滚。
- **评估结论**：Carousel 组件层继续用 embla（已覆盖拖拽/snap/loop/RTL/键盘）；autoplay 官方插件自带 visibilitychange 暂停可直接接；缺的是 scroll-progress 渐隐遮罩（纯消费侧）与垂直方向键盘键（ArrowUp/Down 小缺口）；**速度值不从 embla 提取**（无公开出口），统一在 useTouch 层补 velocity。

### 4.9 use-gesture 10.3（算法提取源，不建议引依赖）

- rubberband 精确形式（`packages/core/src/utils/maths.ts:34-44`）：`rubberband(d,dim,c) = (d·dim·c)/(dim+c·d)`，constant 默认 0.15，双曲饱和、永不超 `dim·c` 量级。
- velocity：逐事件瞬时 `|Δpx/Δms|` + **pointerup 距上次 move <32ms 时用 up 事件补算一次**（`BEFORE_LAST_KINEMATICS_DELAY`，否则松手速度恒 0）；静止 >32ms 归零。
- 轴锁 selectAxis、intentional 启动阈值（过阈值后 movement 从该点起算——click 不误触的关键）、`_movementBound` 越界回滚防回弹叠加漂移。
- **引入评估：否**（+15kB、5 组件迁移、库年余未更新；价值仅 3 个纯函数）。例外条件：未来做 pinch 画布。

### 4.10 zarm 3.4（53 组件，金融级键盘独有）

- 特色：**keyboard + keyboard-picker**（金融级密码键盘，招牌）、pinch-zoom 独立组件、marquee、wheel、date-select；无 Captcha 组件（验证码由 keyboard 承担）。
- 手势 = use-gesture + better-scroll 混合；组织已迁 `ZhongAnTech/zarm`。
- 对 Flux 的增量缺口：water-mark（demand-gated 长尾）、pinch-zoom（归入 M9 image-viewer 范围）。

## 5. 可移植算法与模式清单（按接入点组织）

| # | 算法/模式 | 精确形式（源） | 接入点 |
| --- | --- | --- | --- |
| 1 | **rubberband 橡皮筋** | `(d·dim·c)/(dim+c·d)`，c=0.15（use-gesture maths.ts；antd-mobile 同式） | 共享纯函数：pull-refresh 超拉、swipe-cell 越界、floating-panel、future picker |
| 2 | **velocity 追踪** | 170ms 采样窗 + \|v\|>0.1 flick（embla DragTracker）；或 0.7/0.3 低通 + 100ms 帧丢弃（ionic）；pointerup 32ms 补算（use-gesture） | `useTouch` 升级为 `useGesture`（向后兼容扩展） |
| 3 | **惯性动量** | 触发 300ms/15px；减速 0.003（vant/arco/nutui 同参）；rAF + quartEaseOut 可打断（tdesign）；弹簧 friction/duration（embla） | picker 内核、floating-panel、swipe-cell 甩动 |
| 4 | **投掷+吸附落点** | `落点 = offset + v·direction·50`，`nearest(锚点数组)`（antd-mobile swipe-action/floating-panel；tdesign swipe-cell 同式） | swipe-cell、floating-panel、wheel |
| 5 | **滚动穿透锁** | 计数 + 方向位掩码 `parseInt(status,2) & parseInt(direction,2)` + strict/局部模式（vant/antd/tdesign 同源） | mobile 弹层（bottom-sheet/floating-panel/picker 弹出态）；Radix 弹层已有基础锁，mobile 自定义 surface 需要它 |
| 6 | **手势仲裁（轻量版）** | priority capture 独占 + disableScroll 引用计数（ionic GestureController） | M6 决策：Flux 同屏 pull-refresh/swipe-cell/carousel 竞争时约定优先级 |
| 7 | **click 防穿透** | 滑动期打标（allowClick/preventClick）+ 捕获阶段拦截，阈值 5–6px（f7/embla/swiper） | swipe-cell 内含按钮时的「点了 vs 拖了」判定 |
| 8 | **overlay 分层基数 z-index** | 类型基数（2/4/6 万）+ 实例递增（ionic overlays.ts） | 对照现有 useGlobalZIndex 计数器，评估是否引入类型基数 |
| 9 | **Sheet 手势关闭 + 档位** | `(t<300&&d>20)\|\|d>h/2` 关闭判定 + breakpoints 半开档位 + backdrop 随 progress（f7 sheet-class；ionic sheet.ts priority 40） | ui 层 Sheet/Drawer 小屏形态增强（M1 bottom-sheet successor） |
| 10 | **键盘避让 scrollAssist** | 可视区计算 + 时长=距离/0.3 clamp(150,400)ms（ionic scroll-assist.ts） | M2 已有 focus scrollIntoView 的升级项 |
| 11 | **命令式弹层句柄** | close() 播完退场动画再卸载 + replace()（antd render-imperatively） | Flux action 体系派发 Dialog/Toast 场景（供 action-core 参考） |
| 12 | **iOS 缩放防模糊** | 缩放时重写宽高 + img 反向 `scale(1/scale)` 补偿（arco image-preview） | image-viewer（M9） |

## 6. Flux 缺口综合（共识矩阵）

> 口径：出现库数 ≥3 视为高频共识。已扣除 Flux 已有物：carousel（embla）、calendar、slider、rate、stepper（input-number）、switch、checkbox/radio、pagination、steps、timeline、collapse、skeleton、empty、toast/notify（sonner）、dialog/sheet/drawer/popover、tabs、verification-code、notice-bar、countdown、pull-refresh、infinite-scroll、swipe-cell。Tabbar/NavBar/ActionBar/SubmitBar/Sticky 已决策为 page region 复合模式（不计缺口）。

| # | 组件/能力 | 共识库数 | 交互核心 | 复杂度 | 归属判定 |
| --- | --- | --- | --- | --- | --- |
| 1 | **Picker 滚轮家族**（picker / date-picker / cascader） | 8（vant/antd/nutui/arco/tdesign/f7/ionic/zarm） | 惯性+吸附滚轮内核，一个内核派生 3 组件 | 高（内核）/低（派生） | **mobile 包**（design.md 已立约 retained，本次升级为实施工作项） |
| 2 | **ActionSheet** | 7 | 底部动作面板（list/grid 形态 + safe-area） | 低（Sheet 派生） | 形态落点需人定：ui Sheet 派生 vs mobile renderer（M8 内决策） |
| 3 | **ImageViewer 手势预览** | 6（vant/antd/arco/tdesign/zarm/f7） | 双指不动点缩放+双击+横翻+下滑关闭+手势仲裁 | 高 | **mobile 包** |
| 4 | **SearchBar** | 6 | 移动搜索栏（取消/联想/吸顶） | 低 | 通用组合（input+button 模板），不进 mobile 包 |
| 5 | **IndexBar** | 4（vant/antd/tdesign + nutui elevator / f7 list-index） | 侧栏触摸定位+分组吸顶顶推 | 中 | **mobile 包** |
| 6 | **NumberKeyboard** | 4（vant/nutui/arco/zarm；antd 实验性） | 自绘数字键盘（乱序/小数点/确认键），与 passcode/验证码联动 | 中 | **mobile 包** |
| 7 | **FloatingPanel** | 2（vant/antd）但交互价值极高 | 锚点多档拖拽面板+滚动仲裁 | 中 | **mobile 包** |
| 8 | **Signature** | 2（vant/nutui） | canvas 笔迹+undo+导出，表单高频 | 中高 | **mobile 包** |
| 9 | **FloatingBubble** | 2（vant/antd） | 可拖拽悬浮球+吸边 | 低中 | **mobile 包** |
| 10 | **既有组件手感升级**（swipe-cell velocity/overswipe、pull-refresh 阻尼统一/iOS 分段 spinner、sheet 下拉关闭） | —（增强项） | velocity 投掷+rubberband+K-map 决策 | 低中 | 现有组件 + ui 层增强 |
| 11 | **SwipeLoad 行程确认** | 1（arco） | 拖过阈值松手触发确认 | 中 | 长尾池（demand-gated） |
| 12 | **WaterMark / Barrage / RollingText / Ellipsis / BackTop / ScrollMask** | 各 1–2 | 非手势类通用件 | 低 | 不进 mobile 包：BackTop/Ellipsis/ScrollMask 走通用/O1 池，WaterMark/Barrage demand-gated 长尾 |

## 7. 架构红线复核（本次调研后全部维持）

| 红线 | 复核结论 |
| --- | --- |
| 不建 `*-mobile` 双实现、无 mobileUI 标志位 | 维持。缺口清单中无一项需要双实现；antd-mobile 的 `center-popup`/`masking`「单内核+形态派生」模式反而印证共享内核路线 |
| 移动原生交互组件才进 `flux-renderers-mobile` | §6 归属列全部遵守；SearchBar/BackTop/Ellipsis/RollingText 等通用件明确排除 |
| Tabbar/NavBar/ActionBar/SubmitBar/Sticky = page region 复合模式 | 维持（f7/ionic 均为框架级路由体系产物，Flux 单页渲染器场景不适用组件化） |
| useTouch 共享 hook 放 mobile 包 | 维持并升级为 M6 主体（velocity/rubberband/momentum 纯函数 + 可选手势仲裁），hook 层增强不违反任何红线 |
| 浮层复用 surface runtime + ui Sheet | 维持。ActionSheet 形态与 bottom-sheet 手势关闭在 ui/surface 层做，floating-panel 作为「非模态常驻面板」属移动原生交互，进 mobile 包 |
| Radix 弹层已有滚动锁 | 事实成立（react-remove-scroll），但 mobile 自定义 surface（floating-panel、picker 弹出容器）需 vant 式局部锁/容器链判定，M6 提供 `useLockScroll` 供其使用 |

## 8. Roadmap 建议（已写入 `docs/components/mobile-roadmap.md`，M6–M12 `proposed`）

> 依赖关系：M6 基建先行（M7/M8/M9 依赖其纯函数层）；M7 内核先行（date-picker/cascader 派生依赖内核）。每个 work item = 一个 execution plan 的交付范围，组件级 design.md 在 plan 内先行立约（对齐 M5 先例）。

- **M6 手势基建升级**：`useTouch` → 增强版（velocity 170ms 窗 + rubberband + momentum rAF 可打断 + nearest 吸附 + click 防穿透 + supports-passive 探测）；`useLockScroll`（位掩码+计数+局部模式）；手势仲裁轻量方案决策；顺带完成 swipe-cell 甩动/overswipe、pull-refresh 阻尼统一两处现有组件手感升级。
- **M7 Picker 滚轮家族**：picker-view 内核（推荐 TDesign rAF quartEaseOut 可打断路线）+ picker / date-picker / cascader 三派生；schema 契约 + design.md 先行；接入现有 z-index 栈与 safe-area。
- **M8 底部面板组**：FloatingPanel（锚点+滚动仲裁）+ FloatingBubble（吸边）；ui 层 Sheet/Drawer 小屏手势下拉关闭（速度判定+档位）；ActionSheet 形态决策（Sheet 派生 vs mobile renderer）。
- **M9 图像与手写组**：ImageViewer（pinch 不动点缩放 matrix + 双击 + 翻页 + 下滑关闭 + 手势仲裁）+ Signature（canvas + undo + 导出 png，表单接入）。
- **M10 列表导航组**：IndexBar（锚点定位+sticky 顶推+侧栏 elementFromPoint，非 passive 监听）+ ScrollMask 渐隐（tabs/横向滚动条增强，通用件走 ui/basic）。
- **M11 安全输入组**：NumberKeyboard（乱序/小数点/确认键）+ 与 verification-code/passcode 联动。
- **M12 长尾评估池**（demand-gated，不排期）：SwipeLoad 行程确认、tapHold 长按原语、swipe-back 边缘返回、sortable 列表拖拽排序、barrage、water-mark。

## 9. 附录：源码索引

| 库 | 本地路径 | 状态 |
| --- | --- | --- |
| vant 4 | `~/sources/vant` | ✅ 4.9.24（2026-06-15） |
| antd-mobile | `~/sources/antd-mobile` | ✅ 5.43.0 |
| nutui 4 | `~/sources/nutui`（Vue 版） | ✅ 4.3.15；React 独立仓 `jdf2e/nutui-react` 未 clone（经在线核实） |
| arco-design-mobile | `~/sources/arco-design-mobile` | ✅ 2.39.1 |
| tdesign-mobile-react | `~/sources/tdesign-mobile-react` | ✅ 1.0.0 |
| react-vant | `~/sources/react-vant` | ✅（评估结论：停更，不作参考） |
| framework7 | `~/sources/framework7` | ✅ 9.2.0 |
| ionic-framework | `~/sources/ionic-framework` | ✅ 9.0.8 |
| swiper | `~/sources/swiper` | ✅ 14.3.0 |
| use-gesture | `~/sources/use-gesture` | ✅ 10.3.1 |
| zarm | `~/sources/zarm` | ✅ 3.4.x（org 已迁 `ZhongAnTech/zarm`；分析先经 GitHub 在线完成，源码当日稍后由重试脚本落地） |
| embla-carousel | `~/sources/embla-carousel` | ✅（Flux 实装 8.6.0，源码为 v8.6.0+ master；分析先经 GitHub 在线完成，源码当日稍后由重试脚本落地） |

> 关联：2026-06-21 首轮调研（vant + 3 个真实商城项目）见 `docs/analysis/2026-06-21-flux-mobile-gap-analysis-vs-vant.md`；本轮在其基础上把对照面从 1 库扩至 11 库，并把「商城可达性」口径升级为「移动端交互能力矩阵」。
