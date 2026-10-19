# 664 Mobile M6 手势基建升级计划

> Plan Status: completed
> Last Reviewed: 2026-10-19
> Source: `docs/components/mobile-native-components-roadmap.md` M6（2026-10-19 人确认转 `todo`）；算法依据 `docs/analysis/2026-10-19-mobile-advanced-libs-deep-research.md` §3/§5
> Related: `docs/plans/2026-06-23-0655-3-mobile-ux-a11y-and-styling-hygiene-plan.md`（touch-action 手势所有权先例）、`docs/plans/2026-06-23-1810-1-mobile-post-reaudit-remediation-owner-plan.md`（release 状态机先例）

## Purpose

把 `flux-renderers-mobile` 的手势能力从「delta + 10px 方向锁」升级为共享纯函数基建层（velocity/rubberband/momentum/nearest/click 防穿透），补齐弹层滚动穿透锁 `useLockScroll`，产出同屏手势仲裁决策记录，并顺带完成 swipe-cell（velocity 投掷 + overswipe + K-map 松手决策）与 pull-refresh（rubberband 阻尼统一）两处现有组件手感升级。M6 是 M7（Picker）/M8（底部面板）/M9（ImageViewer）的算法底座。

## Current Baseline

- `packages/flux-renderers-mobile/src/hooks/use-touch.ts`（101 行）：仅 `TouchState`（startX/startY/deltaX/deltaY/offsetX/offsetY/direction/isTouching）+ 10px 方向锁；无速度追踪、无橡皮筋、无惯性。
- `swipe-cell.tsx`（382 行）松手决策为纯静态阈值（closed 起始 `|deltaX| >= threshold(30)` 开、开态小幅朝开回弹关、其余 no-op，权威全格描述见 Phase 5 K-map「旧实现」列）；无速度投掷、无 overswipe；视觉越界硬 clamp。
- `pull-refresh.tsx`（303 行）下拉距离为线性阻尼 `DAMPING_FACTOR = 0.5` + 硬 clamp 200（`pull-refresh.tsx:10-11,104`）；释放决策仅看原始 `deltaY` 是否过阈值（60），不阻尼。
- 包内无 `useLockScroll`；`@nop-chaos/ui` 弹层（dialog/sheet/popover 等）基座为 `@base-ui/react`，自带内部 ScrollLock 基础锁，不在本计划范围（注：仓库依赖图中的 `react-remove-scroll` 仅经 cmdk→@radix-ui/react-dialog 传递引入，与 ui 弹层无关）。
- 包 `src/index.ts`（24 行）不导出任何 hook；`useTouch` 仅包内相对引用。
- 同屏手势竞争现状：`pull-refresh` 根元素 `touch-action: pan-x`、`swipe-cell` 根元素 `touch-action: pan-y`（`mobile-responsive-baseline.md` §5 契约），浏览器轴级仲裁已存在；无 JS 层仲裁约定文档。
- `docs/architecture/mobile-responsive-baseline.md` 现有 §1–§10，无手势仲裁章节。
- playground 已有 `/mobile-components`（M5 demo，路由 id 注册于 `apps/playground/src/domain-route-entries.ts` + `domain-route-pages.tsx`）与 `m5-showcase`（M5 showcase，同处注册）演示页；`apps/playground/src/mobile-renderer-routes.ts` 只含 5 个 `#/lab/<id>` lab 条目，不含演示页路由；顶层 `#/` 路由仅进入 `DOMAIN_RENDERER_ROUTES` 才可达（`route-model.ts`）。e2e 先例 `tests/e2e/mobile-components.spec.ts`（viewport 390×844 + hasTouch）。
- 包测试基线：`pnpm --filter @nop-chaos/flux-renderers-mobile test` 当前全绿（16 文件 / 192 用例，2026-10-19 实测，含 contract 门禁测试）。

## Goals

- M6a：`hooks/gesture-math.ts` 纯函数层（rubberband / nearest / momentumDistance / momentumDuration / quartEaseOut）+ `VelocityTracker`（170ms 采样窗、px/ms、flick 判定）+ `MomentumAnimator`（rAF + quartEaseOut 可打断）+ `supportsPassiveEvents()` + 拖后点击抑制工具，全部零依赖、SSR 安全。
- M6a：`useTouch` 向后兼容扩展 `velocityX`/`velocityY`（px/ms，touchend 后保持可读直到下次 start/reset），现有 5 组件行为不变。
- M6b：`hooks/use-lock-scroll.ts`（vant 式方向位掩码 + 全局计数 + strict 模式 + 局部容器模式），包 CSS 提供 `nop-scroll-lock`。
- M6c：手势仲裁轻量方案决策记录落入 `mobile-responsive-baseline.md` 新 §11（含：维持 CSS 轴所有权优先、裁决不引入 ionic GestureController 式全局 capture、升级触发条件）。
- M6d：swipe-cell 接入 K-map 释放决策（`swipe-cell-release.ts` 纯函数：静态阈值 / flick / 投掷投影 / overswipe 首动作触发 / 视觉越界 rubberband）；pull-refresh 下拉阻尼改 rubberband 曲线（1:1 至 threshold，超界 `(d·dim·c)/(dim+c·d)`，c=0.15）。
- 手势层（useTouch/useLockScroll/gesture-math/VelocityTracker/MomentumAnimator/supportsPassiveEvents）从包 `src/index.ts` 公共导出（供 M7/M8 与宿主使用）。
- playground 新增 `/m6-gesture-lab` 演示页 + `tests/e2e/mobile-gesture-lab.spec.ts` e2e。
- 三份 design.md 契约同步：`use-touch/design.md`、`swipe-cell/design.md`、`pull-refresh/design.md`。

## Non-Goals

- 不新增任何 renderer 组件、不改任何 schema 字段（velocity/overswipe 为内部行为升级，非 schema 契约）。
- 不引入 use-gesture / react-spring / better-scroll 依赖（零依赖纪律）。
- 不实现 ionic GestureController 式全局手势总线（M6c 仅出决策记录；升级触发条件见该记录）。
- 不改动 Base UI 弹层既有内部 ScrollLock 行为（`@nop-chaos/ui` overlay 组件零改动）。
- 不实现 picker / floating-panel / image-viewer（M7/M8/M9 自有 plan）。
- 不引入新的 i18n key（本计划无新用户可见文案）。
- 不改 `pull-refresh` 的 `direction:'down'` 单向契约与释放阈值语义（60px 原始 deltaY 过阈值触发不变）。

## Scope

### In Scope

- `packages/flux-renderers-mobile/src/hooks/`：新增 gesture-math / velocity-tracker / momentum-animator / supports-passive / click-suppression / use-lock-scroll 及各自 focused 测试。
- `packages/flux-renderers-mobile/src/hooks/use-touch.ts`：velocity 扩展 + 初始状态契约测试更新。
- `packages/flux-renderers-mobile/src/swipe-cell-release.ts`（新纯函数模块）+ `swipe-cell.tsx` 集成 + 测试更新。
- `packages/flux-renderers-mobile/src/pull-refresh.tsx` 阻尼曲线替换 + 几何测试更新。
- `packages/flux-renderers-mobile/src/index.ts` 公共导出、`src/styles.css` 新增 `nop-scroll-lock`。
- `docs/architecture/mobile-responsive-baseline.md` 新 §11；`docs/components/{use-touch,swipe-cell,pull-refresh}/design.md` 契约更新。
- `apps/playground/src/pages/m6-gesture-lab-demo.tsx` + 路由注册 + `tests/e2e/mobile-gesture-lab.spec.ts`。

### Out Of Scope

- M7 picker 内核及其弹出容器（对 `useLockScroll` 的消费方接入）。
- M8 FloatingPanel 的「面板/内容滚动仲裁」实现（决策记录中引用，落地在 M8 plan）。
- iOS 分段 spinner 进度动画（Phase 6 中裁决，预期分类 `optimization candidate`）。
- `@nop-chaos/ui` 层任何改动。

## Failure Paths

| 可测场景编号                      | 触发                                                                               | 行为                                                          | 可重试 | 用户可见表现               |
| --------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------ | -------------------------- |
| `touchcancel-during-momentum`     | 惯性/回弹动画进行中系统 touchcancel 或组件卸载                                     | 动画立即停止，不产生状态提交、不派发事件、不泄漏 rAF 句柄     | 是     | 界面停在当前帧，无幽灵动画 |
| `lock-scroll-ssr`                 | `useLockScroll` 在无 `document` 环境（SSR）渲染                                    | hook 安全 no-op，不抛错、不注册监听                           | 是     | 无                         |
| `lock-scroll-unmount-imbalance`   | 多个 surface 嵌套开启/关闭顺序错乱                                                 | 全局计数保证 body class 仅在 0→1 添加、1→0 移除，卸载必减计数 | 是     | 无残留锁                   |
| `overswipe-region-missing-button` | overswipe 触发时区域无 `button/a/[role=button]/input/select/textarea` 家族任一元素 | 降级为普通 open 决策，不派发 onAction、不抛错                 | 是     | 面板正常展开               |
| `velocity-zero-division`          | touchmove 采样 dt<1ms 或单样本                                                     | velocity 返回 0，不产生 Infinity/NaN 进决策                   | 是     | 无                         |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**。理由：手势纯函数层是 M7–M9 三批组件的共享算法底座（公共回归路径）；swipe-cell/pull-refresh 释放决策是被 M5 七轮审计锁定过的高危交互状态机。纯函数测试（Proof）先于组件集成（Fix）落地。

## Execution Plan

### Phase 1 - M6a 纯函数基建层

Status: completed
Targets: `packages/flux-renderers-mobile/src/hooks/{gesture-math,velocity-tracker,momentum-animator,supports-passive,click-suppression}.ts` 及对应 `.test.ts`

- Item Types: `Proof`、`Fix`

- [x] Proof: `gesture-math.test.ts` 先行——rubberband `(d·dim·c)/(dim+c·d)` 基准值表（含 d=0、dim≤0 防御、d→∞ 饱和于 dim、c 默认 0.15）、nearest 最近锚点、momentumDistance（v/0.003 基准）、momentumDuration clamp 边界、quartEaseOut(0)=0/quartEaseOut(1)=1
- [x] Proof: `velocity-tracker.test.ts` 先行——170ms 窗口内采样求速（px/ms 符号）、窗口外旧样本丢弃、dt<1ms 归零、reset、flick 阈值判定
- [x] Proof: `momentum-animator.test.ts` 先行——rAF 插值单调推进、stop() 同步打断（后续帧不再回调）、重复 start 取消前帧、onComplete 恰好一次
- [x] Fix: 实现 `gesture-math.ts`（`rubberband`/`nearest`/`momentumDistance`/`momentumDuration`/`quartEaseOut`，零依赖纯函数）
- [x] Fix: 实现 `velocity-tracker.ts`（`VelocityTracker` 类，`add(x,y,t)` + `velocityX/velocityY` + `isFlick`，WINDOW_MS=170）
- [x] Fix: 实现 `momentum-animator.ts`（`MomentumAnimator`：`start({from,to,duration,onUpdate,onComplete})`/`stop()`/`running`，rAF 缺席环境 no-op）
- [x] Fix: 实现 `supports-passive.ts`（`supportsPassiveEvents()` 缓存探测）与 `click-suppression.ts`（`suppressClickAfterDrag(container)`：拖动 >6px 后标记，capture 阶段拦截下一次 click，返回清理函数）
- [x] 上述 Proof 测试随实现转绿（先红后绿顺序保留在提交历史中）

Exit Criteria:

- [x] `gesture-math.test.ts`/`velocity-tracker.test.ts`/`momentum-animator.test.ts` 存在且断言针对上述精确公式（非套话断言），全绿
- [x] `supports-passive`/`click-suppression` 有 focused 测试（探测缓存；>6px 拖动后下一次 click 被拦截一次且仅一次）
- [x] `pnpm --filter @nop-chaos/flux-renderers-mobile test` 全绿（含既有 192 用例零回归）

### Phase 2 - M6a useTouch 向后兼容扩展 + design.md

Status: completed
Targets: `packages/flux-renderers-mobile/src/hooks/use-touch.ts`、`use-touch.test.ts`、`docs/components/use-touch/design.md`、`packages/flux-renderers-mobile/src/index.ts`

- Item Types: `Fix`、`Proof`

- [x] Fix: `TouchState` 增加 `velocityX`/`velocityY`（px/ms，初始 0）；touchstart 重置 tracker；touchmove 逐事件采样；touchend 后值保持可读（不清零），下次 start/reset 归零
- [x] Proof: 更新初始状态 `toEqual` 契约测试（新增两字段——本测试即「旧实现必挂」判别点）+ 新增 velocity 采样/保持/归零 focused 用例
- [x] Proof: 既有 5 组件（pull-refresh/infinite-scroll/swipe-cell/countdown/notice-bar）不改一行的前提下包测试零回归（向后兼容声称的判别点：既有组件测试文件零修改且全绿）
- [x] Fix: `docs/components/use-touch/design.md` 增 velocity/flick 契约（采样窗 170ms、单位 px/ms、touchend 保持语义、flick 阈值 0.1px/ms）
- [x] Fix: `src/index.ts` 导出 `useTouch`（`export { useTouch } from './hooks/use-touch.js'` + 类型导出）

Exit Criteria:

- [x] `use-touch.test.ts` 全绿且含初始状态 10 字段断言、velocity 生命周期用例
- [x] `git diff` 显示 5 个组件 tsx 零改动而包测试全绿（Phase 1–2 期间）
- [x] `use-touch/design.md` 与实现一致（采样窗/单位/阈值三数值可对账）
- [x] 包 `src/index.ts` 导出 useTouch 且 `tsc -p tsconfig.json` 通过

### Phase 3 - M6b useLockScroll

Status: completed
Targets: `packages/flux-renderers-mobile/src/hooks/use-lock-scroll.ts`、`use-lock-scroll.test.tsx`、`src/styles.css`、`src/index.ts`

- Item Types: `Fix`、`Proof`

- [x] Proof: `use-lock-scroll.test.tsx` 先行——计数 0→1 加 `nop-scroll-lock`、1→0 移除；嵌套两层时仅计数归零才移除；卸载减计数；strict 模式一律 preventDefault；非 strict 按位掩码决策表（无滚动祖先+垂直手势→阻止；有垂直滚动祖先+垂直手势→放行）；local 模式仅容器内生效且不动 body class；SSR no-op
- [x] Fix: 实现 `useLockScroll(enabled, options?: { strict?: boolean; localRef?: RefObject<HTMLElement | null> })`：模块级计数 + 单一 document 级非 passive touchmove 监听；方向位掩码（状态位：垂直可滚=2、水平可滚=1；手势位：垂直=2、水平=1；`status & direction === 0` → preventDefault）
- [x] Fix: `src/styles.css` 新增 `nop-scroll-lock`（`overflow: hidden`），附契约注释（body class 与 preventDefault 双保险语义）
- [x] Fix: `src/index.ts` 导出 `useLockScroll` 及 options 类型
- [x] Proof: jsdom 无真实布局——测试用 `Object.defineProperty` 模拟 `scrollHeight/clientHeight/overflow` 并对 preventDefault spy 断言

Exit Criteria:

- [x] `use-lock-scroll.test.tsx` 全绿且覆盖上表全部场景（计数/位掩码/strict/local/SSR/卸载）
- [x] Base UI 弹层既有滚动锁零改动（`git diff packages/ui` 为空）
- [x] `nop-scroll-lock` 类在包 styles.css 且选择器不泄漏到包外元素

### Phase 4 - M6c 手势仲裁决策记录

Status: completed
Targets: `docs/architecture/mobile-responsive-baseline.md`（新 §11）

- Item Types: `Decision`

- [x] Decision: baseline 新增 §11「同屏手势仲裁约定」：(a) 冲突矩阵（pull-refresh×swipe-cell×横向滚动组件×页面滚动——全部跨轴或隔滚动边界，现有 §5 touch-action 轴所有权 + useTouch 10px 方向锁 + swipe-cell closeOnOutside 已覆盖）；(b) 裁决：不引入 ionic GestureController 式全局 capture 总线（理由：无同轴真实冲突、框架级总线与 schema 隔离渲染器模型冲突、CSS-first 已解决浏览器层竞争）；(c) 升级触发条件（出现跨渲染器同轴手势竞争、或 M8a 面板滚动仲裁实测不足时，新开 work item 评估 capture 独占）；(d) 新 mobile surface 义务（M7/M8 弹出容器必须消费 `useLockScroll`）
- [x] Decision: §11 明确「本节为决策记录，非 implementation plan」

Exit Criteria:

- [x] `mobile-responsive-baseline.md` §11 存在且含冲突矩阵/裁决/升级触发条件/新 surface 义务四要素
- [x] §11 引用的行为均有 live code 对应（touch-action 表 → §5；closeOnOutside → swipe-cell schema）

### Phase 5 - M6d swipe-cell K-map 释放决策 + overswipe

Status: completed
Targets: `packages/flux-renderers-mobile/src/swipe-cell-release.ts`（新）、`swipe-cell.tsx`、`swipe-cell.test.tsx`、`swipe-cell-m6-gesture.test.tsx`（新，oversized-700 纪律下自 796 行拆分出的 M6 判别用例文件）、`docs/components/swipe-cell/design.md`

- Item Types: `Proof`、`Fix`

- [x] Proof: `swipe-cell-release.test.ts` 先行——决策表**全格**断言（纯函数，无 DOM）。记 T=threshold(30)、W=目标侧 region 宽、F(dir)=sign(v)=dir 且 |v|≥0.1px/ms、proj=|δ|+|v|·50：
  - closed 起始、方向 allowed：(a) overswipe |δ|≥1.15·W → `action`（最高优先级）；(b) |δ|≥T → `open`；(c) F 且 |δ|≥10 → `open`；(d) proj ≥ W/2 → `open`；(e) 其余 → `none`
  - closed 起始、方向 disallowed → `none`
  - open S 起始、δ 朝开启方向（sign(δ)=开启符号）：(f) |δ|≥T → 维持 open（不变，等价旧 openCell 幂等）；(g) |δ|<T 且 F 朝开启 → 维持 open（**变更①**：旧实现 closeCell 弹回关闭；flick 语义升级，无既有测试锁定）；(h) |δ|<T 且非 F → `close`（不变，保留旧小幅回弹关闭）
  - open S 起始、δ 朝关闭方向：(i) |δ|≥T → `close`（**变更②**：旧实现对侧 allowed 时翻转到对侧、disallowed 时无操作维持 open；统一收敛为 close，对齐 vant/f7/ionic）；(j) |δ|<T 且 F 朝关闭 → `close`（**变更③**：旧实现无操作维持 open；快速轻扫关闭升级）；(k) |δ|<T 且非 F → 维持 open（不变）
  - open S 起始不触发 overswipe/action
  - 变更①②③ 全部进 design.md §6 变更记录，且各配「旧实现必挂」判别用例
- [x] Fix: 实现 `swipe-cell-release.ts` 纯函数 `resolveSwipeRelease(input)`（输入 deltaX/velocityX/threshold/openWidth/openState/canSwipe\*，输出 `{kind:'open'|'close'|'none'|'action', side?}`；常量 FLICK_VELOCITY=0.1、THROW_FACTOR=50、MIN_FLICK_DELTA=10、OVERSWIPE_RATIO=1.15 导出可测）
- [x] Fix: `swipe-cell.tsx` 集成——touchend 读 `state.velocityX` 进决策；`action` kind 时对揭示区域首个交互元素（选择器家族与既有 capture 处理器一致：`button, a, [role="button"], input, select, textarea`）程序化 click（复用既有 capture 处理器 → onAction + close-after-action，无新 marker、无新 schema）；`suppressClickAfterDrag` 与 overswipe 程序化 click 的交互契约：抑制器放行 `isTrusted === false` 的合成 click（jsdom/程序化 click isTrusted 为 false），仅拦截真实拖后点击；视觉越界改 rubberband（dim=region 宽、c=0.15 共享常量）
- [x] Fix: 判别用例落 `swipe-cell-m6-gesture.test.tsx`（新文件；flick-open δ=15px/v=0.5 旧实现必挂、overswipe-action、变更①②③、ghost-click 抑制、overswipe 无交互控件降级 open、SSR 同批补齐于 use-lock-scroll）——执行期因文件达 796 行触发 oversized-700 硬线而拆分，daily log 有记录；`swipe-cell.test.tsx` 既有阈值/方向/disabled/StrictMode 用例保持全绿
- [x] Fix: `docs/components/swipe-cell/design.md` §5/§6/§11 更新（K-map 全格决策表、overswipe 契约、变更①②③ 记录、rubberband 参数）

Exit Criteria:

- [x] `swipe-cell-release.test.ts` 决策表 (a)–(k) 全格覆盖且全绿（变更①②③ 各配旧实现下必挂的判别用例）
- [x] `swipe-cell.test.tsx` 既有用例零删除（仅两条 MA-09 action-tap 用例按新抑制器契约前置 touchStart/touchEnd 复位序列，断言未削弱）且全绿；`swipe-cell.tsx` 仍 <500 行
- [x] `swipe-cell/design.md` 数值（0.1/50/10/1.15/0.15）与代码常量可对账

### Phase 6 - M6d pull-refresh rubberband 阻尼统一

Status: completed
Targets: `packages/flux-renderers-mobile/src/pull-refresh.tsx`、`pull-refresh-geometry.test.tsx`、`docs/components/pull-refresh/design.md`

- Item Types: `Proof`、`Fix`、`Decision`

- [x] Proof: 几何测试先行更新——`pullDistance(δ) = δ ≤ threshold ? δ : threshold + rubberband(δ-threshold, threshold, 0.15)` 基准值按公式精算（threshold=60 时：δ=120→60+rubberband(60,60,0.15)=60+540/69≈67.83px；δ=200→60+rubberband(140,60,0.15)=60+1260/81≈75.56px；旧实现 δ=200→100px，判别点）；静止/释放/加载态 translate 契约不变
- [x] Fix: `pull-refresh.tsx` 将 `DAMPING_FACTOR/MAX_PULL_DISTANCE` 线性阻尼替换为共享 rubberband（常量 `RUBBERBAND_CONSTANT=0.15` 从 gesture-math 导入）；释放决策仍用原始 `directionalDelta ≥ threshold`（阻尼只影响视觉位移，不影响触发）
- [x] Fix: `pull-refresh-geometry.test.tsx` 新增 rubberband 基准 describe 并全绿（resting 0px 契约、error/success 窗口契约不动；`pull-refresh.test.tsx` 断言不涉阻尼数值，零改动）
- [x] Fix: `docs/components/pull-refresh/design.md` §5 阻尼公式订正（线性 0.5→rubberband 曲线 + 参数表）
- [x] Decision: iOS 分段 spinner 进度（framework7 3-bar 分段点亮）评估裁决落 plan `Deferred But Adjudicated` 节——预期分类 `optimization candidate`（现有文本 + threshold 状态切换已构成进度可供性，spinner 动画升级不阻塞契约）

Exit Criteria:

- [x] 几何基准值测试全绿，且含至少一条「旧线性阻尼下必挂」的判别断言
- [x] resting `translateY(0px)` 契约测试（OA-18 族）零回归
- [x] `pull-refresh/design.md` §5 与实现公式一致；iOS spinner 裁决已落 `Deferred But Adjudicated` 节

### Phase 7 - 集成面：导出、playground 演示页、e2e

Status: completed
Targets: `packages/flux-renderers-mobile/src/index.ts`、`apps/playground/src/pages/m6-gesture-lab-demo.tsx`、`apps/playground/src/domain-route-entries.ts`、`apps/playground/src/domain-route-pages.tsx`、`tests/e2e/mobile-gesture-lab.spec.ts`

- Item Types: `Fix`、`Proof`

- [x] Fix: `src/index.ts` 完成手势层公共导出（useTouch/useLockScroll/rubberband/nearest/momentumDistance/quartEaseOut/VelocityTracker/MomentumAnimator/supportsPassiveEvents + 类型）
- [x] Fix: playground `/m6-gesture-lab` 演示页——swipe-cell flick/overswipe 卡片列表、pull-refresh rubberband 演示、useLockScroll 弹层滚动穿透对照区；按 M5 先例注册进 `domain-route-entries.ts` + `domain-route-pages.tsx`（顶层 `#/m6-gesture-lab` 可达），不动 `mobile-renderer-routes.ts`（那是 `#/lab/<id>` 通道）；390×844 视口可见
- [x] Proof: `tests/e2e/mobile-gesture-lab.spec.ts`——`setViewportSize` 切换移动/桌面视口；程序化断言（data-state 迁移、滚动锁 class 存在/移除、demo 元素可见），不依赖截图
- [x] Proof: `pnpm check` 无新增红项（对照 registered pre-existing red list）

Exit Criteria:

- [x] playground 演示页路由可达且 e2e 首个 smoke 断言通过（本地 `npx playwright test mobile-gesture-lab`）
- [x] `src/index.ts` 导出面与 `docs/components/use-touch/design.md`「公共导出」小节一致
- [x] `pnpm check` 输出无未注册新红项

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `pass`（Round 2；Round 1 fail 3 Major）
- Rounds: 2
- Findings addressed:
  - R1-Major-1 路由注册引用错误 → 基线/Phase 7 改引 `domain-route-entries.ts` + `domain-route-pages.tsx`，注明 `mobile-renderer-routes.ts` 仅 `#/lab/<id>` 通道
  - R1-Major-2 弹层滚动锁归属错误 → 三处改「`@base-ui/react` 自带内部 ScrollLock」，注明 react-remove-scroll 仅 cmdk 传递链
  - R1-Major-3 open 态 K-map 决策表不全 + 未申报行为变更 → 展开为 (a)–(k) 全格，申报变更①②③ 并配判别用例
  - R1-Minor 1–7（几何示例值/测试基线计数/Proof 改标/pnpm check 入门禁/Closure Follow-up/isTrusted 豁免契约/选择器家族措辞）全部落实
  - R2-Minor R1–R3（Phase 1 Exit 计数统一 192、Failure Path 选择器家族对齐、基线松手行为概括加权威指针）本轮收敛

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（含 swipe-cell 横穿翻转行为变更的判别测试落地）
- [x] 所有 in-scope contract drifts 已收敛（三份 design.md 与实现数值一致）
- [x] 行为/契约结果已达成（M6a–M6d 全部 Exit Criteria 勾选）
- [x] 必要 focused verification 已完成（纯函数决策表 + 组件集成 + e2e smoke）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（iOS spinner 评估须落 Deferred 节并给理由）
- [x] 受影响的 owner docs 已同步（use-touch/swipe-cell/pull-refresh design.md + baseline §11）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（对照 registered pre-existing red list，零新增红项）

## Deferred But Adjudicated

### iOS 分段 spinner 进度（framework7 3-bar 分段点亮）

- Classification: `optimization candidate`
- Why Not Blocking Closure: M6d 的「评估」义务是裁决而非实现。评估结论：pull-refresh 现有进度可供性已由三段式文本状态（pulling/loosing/loading）+ `data-status` 契约 + 阈值切换构成，spinner 动画本身不承载进度信息；framework7 式分段 spinner 是纯视觉增强，不改变任何契约、可达性或交互结果，升级不影响本 plan 的行为/契约结果成立。
- Successor Required: `no`
- Successor Path: —（若未来做视觉升级，在 UX/a11y 类 plan 内以 spinner 组件增强立项）

## Non-Blocking Follow-ups

- M7 picker 弹出容器接入 `useLockScroll` 的具体交互调优（归 M7 plan）
- MomentumAnimator 弹簧参数化（tension/friction 曲线）若 M8a 面板实测需要（归 M8 plan）

## Closure

Status Note: M6a–M6d 全部交付——手势纯函数层（rubberband/velocity/momentum/nearest/click 抑制/passive 探测）+ useTouch velocity 扩展（5 组件零改动向后兼容）+ useLockScroll（位掩码/计数/strict/local/SSR）+ 仲裁决策记录（baseline §11）+ swipe-cell K-map 释放决策（变更①②③ 判别）+ pull-refresh rubberband 阻尼 + 手势层公共导出（MM-11 门禁按 M6 契约演进）+ playground /m6-gesture-lab + CDP 触摸 e2e 4/4。全量门禁：typecheck/build/lint 全绿、test 82/82 任务 16,824+ 用例、check 24/25（唯一红 knip xlang mock-server 为 master HEAD 同红既有债，链尾 3 门禁单独复跑全绿）。环境顺手修复既有登记债 playground vite.config 类型漂移。iOS 分段 spinner 裁决 optimization candidate 落 Deferred 节。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose），两轮：R1 `issues`（2M+3m 退回）→ 回修 → R2 `approved`
- Evidence: R1 发现 MA-1（SSR no-op 测试缺失）+ MA-2（判别测试文件归属漂移 plan/design.md 双处）+ 3 Minor；回修后 R2 逐条核验断言落地（use-lock-scroll.test.tsx SSR 用例、swipe-cell-m6-gesture.test.tsx 降级用例、plan :161/:174/:180/:192 与 design.md :115 订正），复跑包测试 24 文件/283 用例绿 + typecheck/lint 44/44，确认 R1 通过点零破坏、audit 门禁未被执行者自审勾选。审计会话 task id 见会话记录（agent_15cac229-fc82-48a5-b34e-85031cdfce29）。

Follow-up:

- 见 Non-Blocking Follow-ups 节（M7 useLockScroll 接入调优、M8 弹簧参数化评估）；除此之外 no remaining plan-owned work
