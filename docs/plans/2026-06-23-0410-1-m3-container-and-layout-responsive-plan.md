# M3 容器与布局响应式（page + flex/container；grid 延后）

> Plan Status: completed
> Mission: mobile
> Work Item: M3 容器与布局响应式
> Last Reviewed: 2026-06-23
> Source: `docs/components/mobile-roadmap.md`（M3 工作项）、`docs/architecture/mobile-responsive-baseline.md`、M1/M2/M0.1 plan 的 `Deferred But Adjudicated`
> Related: `docs/plans/2026-06-22-2335-1-m1-high-frequency-controls-responsive-plan.md`、`docs/plans/2026-06-22-2335-2-m2-form-controls-touch-adaptation-plan.md`、`docs/plans/2026-06-22-2057-1-m01-mobile-infrastructure-plan.md`

## Purpose

把 mobile-roadmap 的 **M3 容器与布局响应式**收口到 `done`。覆盖两个子项：

- **M3a page**：小屏 aside 隐藏/折叠、toolbar 响应式、page footer fixed 栏软键盘 VisualViewport 处理；并在 playground 落地 §14 移动端骨架模式 5 类模板（Tabbar/NavBar/ActionBar/SubmitBar/Sticky）。
- **M3b flex/container**：断点切换 direction/wrap、必要的容器查询。

同时收口前序 plan 显式路由到 M3a 的 deferred 项：M1「tabs sidebar 移动端行为」、M2「page footer fixed 栏 VisualViewport」、M0.1「软键盘 VisualViewport 监听（M3a 部分）」。

`grid` 响应式因 grid renderer 尚未落地（主 roadmap W3a `todo`）显式延后到 successor。

## Current Baseline

> 截至 2026-06-23 的 live repo 核查结论：

- **M0/M0.1/M1/M2/M5 已 `done`**；移动端基础设施（safe-area/hairline/haptics/global z-index 栈）已全部落地于 `packages/ui/src/`。
- **page renderer**（`packages/flux-renderers-basic/src/page.tsx`）：**无任何响应式逻辑**——aside region 始终渲染（`hasAside` 只判空，不判视口），无 `useIsMobile()`，header/toolbar/body/aside/footer 平铺。`aside`/`asidePosition`/`headerClassName`/`toolbarClassName`/`footerClassName` region 已由 E3 layout-family plan 落地（page aside **已存在**，解除 roadmap 标注的「待改进 roadmap page aside 落地」阻塞）。
- **page/design.md**：§13 移动端响应式行为（header/footer region 约定 + 触摸适配占位）、§14 移动端骨架模式 5 类模板（Tabbar/NavBar/ActionBar/SubmitBar/Sticky，含与 `tabs`≠navigate 的裁定）**已立约为 schema 模板**，但 **playground 无对应演示页**，模板未被运行时验证。
- **flex renderer**（`packages/flux-renderers-basic/src/flex.tsx:35-74`）：`direction`/`wrap`/`align`/`justify`/`gap` 经 Tailwind 类输出（`resolveDirection`/`flex-wrap`），**无断点切换、无 `useIsMobile`**；schema 无 `responsiveDirection`/per-breakpoint 字段。
- **container renderer**（`packages/flux-renderers-basic/src/container.tsx:8-69`）：与 flex 同源解析 `direction`/`wrap`/`align`/`gap`（`resolveDirection`/`flex-wrap`），**无断点切换、无 `useIsMobile`**。
- **grid / collapse renderer**：**未落地**（主 roadmap W3a `todo`；`flux-renderers-layout` 包尚不存在）。
- **`useIsMobile()`** 位于 `packages/ui/src/hooks/use-mobile.ts`，从 `@nop-chaos/ui` 公共导出（M1/M2 已在多包消费）。
- **baseline §6**：fixed 元素软键盘 VisualViewport 处理约定已立约；**消费方（page footer fixed 栏）尚未实现**（M2 plan Deferred 路由到 M3a）。
- **baseline §7**：容器查询标「辅助/未来」；Tailwind 响应式类为主力策略。
- **路由到 M3a 的 deferred 项**：
  - M1 plan L228-233：tabs `tabsMode:'sidebar'` 移动端行为 → M3a page 骨架模式（`Successor Required: yes`）。
  - M2 plan L190-195：page footer fixed 栏 VisualViewport → M3a page（`Successor Required: yes`）。
  - M0.1 plan L192-197：软键盘 VisualViewport 监听 → M2a/M3a（M2a 部分已收口 input focus scrollIntoView，**M3a page-footer 部分待收口**）。

## Goals

- M3a page renderer 具备小屏响应式行为：aside 小屏隐藏/折叠、toolbar 小屏纵列堆叠、footer fixed 栏软键盘弹起经 VisualViewport 保持可见。
- M3a §14 骨架模式 5 类模板在 playground 有可交互演示页 + e2e 视口断言；路由进来的 M1 tabs-sidebar deferred 项在源 plan 注记收口。
- M3b flex/container 具备断点切换 direction/wrap 能力（schema 增 per-breakpoint 表达 + Tailwind 响应式类实现）。
- `page/design.md` §13、`flex/design.md`、`container/design.md` 各增「响应式行为」小节并引用 M0 baseline。

## Non-Goals

- **不新建 grid / collapse renderer**——属主 roadmap W3a；grid 响应式显式延后。
- **不新建任何 `*-mobile` 组件、不引入 mobileUI 标志位**（baseline §7 禁止清单）。
- 不做 M4 数据展示（crud/chart/cards/list）。
- 不重构 page/flex/container 的非响应式 schema（仅增响应式字段，缺省回退无回归）。
- 不在 page 内实现 pull-refresh/infinite-scroll（已属 M5，`page.pullRefresh` 归 mobile-roadmap 已收口）。

## Scope

### In Scope

- `page.tsx` 小屏 aside 隐藏/折叠 + toolbar 纵列堆叠 + footer fixed VisualViewport hook。
- page §14 骨架模式 playground 演示页（`apps/playground/src/pages/m3-layout-demo.tsx`，路由 `/m3-layout`）+ e2e。
- `flex.tsx` / `container.tsx` 断点切换 direction/wrap（schema 字段 + 实现 + 缺省回退）。
- `page/design.md` §13、`flex/design.md`、`container/design.md` 响应式小节。
- 收口 M1/M2/M0.1 → M3a 的 deferred 项（源 plan 注记）。

### Out Of Scope

- grid / collapse renderer 创建（W3a）。
- cards / list（M4b）。
- crud / chart 响应式（M4a/M4c，归后续 N=2 plan）。
- 全局 `.is-mobile` 类切换、传统 media query 全局样式（baseline 禁止）。

## Failure Paths

| 场景                              | 触发                             | 行为                                   | 可重试 | 用户可见表现                                       |
| --------------------------------- | -------------------------------- | -------------------------------------- | ------ | -------------------------------------------------- |
| page footer VisualViewport 不支持 | 浏览器无 `window.visualViewport` | 早返回，footer 维持正常流布局，不抛错  | 否     | 软键盘弹起时 footer 不强制贴底（降级，无 JS 报错） |
| aside 小屏折叠态                  | 视口 < 768px 且配置 aside        | aside 不占主列，提供展开入口或直接隐藏 | 否     | 小屏不显示侧栏，桌面恢复                           |
| flex 断点字段非法                 | `responsiveDirection` 值不在枚举 | 忽略该断点，回退到 `direction` 缺省    | 否     | 渲染不中断                                         |

## Test Strategy

档位：**建议有测**

理由：容器/布局响应式属一般功能改进，非鉴权/对外 API 契约。运行时分支（aside 折叠、flex 断点切换）配 focused 单测（mock `useIsMobile`）；骨架模式与视口行为配 e2e（`setViewportSize` 切换视口，程序化断言，不靠截图）。

## Execution Plan

### Phase 1 - M3a page 响应式行为实现

Status: completed
Targets: `packages/flux-renderers-basic/src/page.tsx`、`packages/flux-renderers-basic/src/schemas.ts`、`packages/flux-renderers-basic/src/__tests__/`、`docs/components/page/design.md` §13

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] **Decision**：aside 小屏策略裁定——对齐 `page/design.md` §13 既有契约（<640px = 「折叠，触发式滑出」）：小屏默认将 aside 折叠为触发式滑出（**非纯 `hidden`**）；触发入口与滑出载体（复用 `@nop-chaos/ui` Sheet/Drawer 或内联）在执行时裁定。§13 表中如有「隐藏」措辞与最终行为张力，以落地后的最终行为为准重写 §13。
- [x] **Fix**：`page.tsx` 实现 aside 小屏折叠/触发式滑出（消费 `useIsMobile()` 或 Tailwind 响应式类，缺省回退：桌面行为不变）。
- [x] **Fix**：`page.tsx` 实现 toolbar 小屏纵列堆叠（小屏 `flex-col`，桌面维持原样）。
- [x] **Fix**：新增 page footer fixed VisualViewport hook（baseline §6），软键盘弹起时 fixed footer 贴视口底部；无 `visualViewport` 时早返回（见 Failure Paths）。收口 M2/M0.1 deferred VisualViewport 项。
- [x] **Proof**：focused 单测覆盖 aside 小屏折叠分支、toolbar 堆叠分支、VisualViewport hook 早返回分支（`packages/flux-renderers-basic/src/__tests__/page-responsive.test.tsx`）。
- [x] **Follow-up**：`page/design.md` §13 同步最终行为（断点表 + 触摸适配 + 软键盘小节），消除「隐藏 vs 折叠滑出」措辞张力。

Exit Criteria:

> Phase 完成后逐条勾选；只写本 Phase 真正交付的 repo-observable 结果 + 保证 Phase 2/3 可继续的局部检查。

- [x] `page.tsx` 在小屏（`useIsMobile()` true 或视口 <768px）下不渲染/折叠 aside，toolbar 纵列堆叠，footer fixed 经 VisualViewport 处理；桌面无回归。
- [x] `page-responsive.test.tsx` 新增用例对上述三个分支均有断言并通过（局部 `pnpm --filter @nop-chaos/flux-renderers-basic test`）。
- [x] `page/design.md` §13 断点表/软键盘小节已更新为最终设计状态。

### Phase 2 - M3a 页面骨架模式 playground 落地 + deferred 收口

Status: completed
Targets: `apps/playground/src/pages/m3-layout-demo.tsx`、`apps/playground/src/`（路由注册）、`tests/e2e/m3-layout.spec.ts`、`docs/components/page/design.md` §14、M1/M2/M0.1 源 plan Deferred 段

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] **Fix**：新增 playground 演示页 `m3-layout-demo.tsx`（路由 `/m3-layout`），覆盖 §14 五类骨架模式（Tabbar=footer flex+button navigate、NavBar=header 返回+标题+右操作、ActionBar=footer 图标组+CTA、SubmitBar=footer 复选+价格+CTA、Sticky=container sticky top-0），每类为独立 schema 模板示例。
- [x] **Decision**：核查 §14 现有 schema 模板在 live runtime 下可渲染；对不成立处修正模板（修正写入 design.md §14，保持「不新增独立 renderer」原则）。
- [x] **Proof**：e2e `tests/e2e/m3-layout.spec.ts` 用 `setViewportSize` 切移动视口，程序化断言每类骨架模式的 footer/header region 存在且 Tabbar 按钮触发 navigate（非 `tabs` 内容切换），不靠截图。
- [x] **Follow-up**：M1 plan「tabs sidebar 移动端行为」deferred 段注记「已由 M3a page 骨架模式收口」；M2/M0.1 VisualViewport deferred 段注记「page-footer 部分已由 M3 Phase 1 收口」。

Exit Criteria:

- [x] `/m3-layout` 路由可访问，5 类骨架模式各有一个可渲染 schema 模板示例。
- [x] `m3-layout.spec.ts` 对 5 类模式均有视口切换后的程序化断言（移动视口下 footer/header region、Tabbar navigate 行为）。
- [x] M1/M2/M0.1 源 plan 对应 deferred 条目已注记收口路径。

### Phase 3 - M3b flex/container 断点响应式

Status: completed
Targets: `packages/flux-renderers-basic/src/flex.tsx`、`packages/flux-renderers-basic/src/container.tsx`、`packages/flux-renderers-basic/src/schemas.ts`、`packages/flux-renderers-basic/src/__tests__/`、`docs/components/flex/design.md`、`docs/components/container/design.md`

- Item Types: `Fix | Decision | Proof`

- [x] **Decision**：flex/container 断点表达裁定（二者同源解析 `direction`/`wrap`/`align`/`gap`，共享同一断点字段约定）——采用「per-breakpoint 字段」（如 `responsiveDirection?: { sm?, md?, lg? }` 或等价 `directionMd` 风格），优先 Tailwind 响应式类（`flex-col md:flex-row`）；容器查询仅在 Tailwind 类无法表达时启用（baseline §7）。裁定写入 flex/container design.md。
- [x] **Fix**：`flex.tsx` 实现 direction/wrap 断点切换；缺省（无断点字段）行为与现状完全一致。
- [x] **Fix**：`container.tsx` 应用同一 per-breakpoint direction/wrap 切换（container 已用 `resolveDirection`/`flex-wrap` 解析 `direction`/`wrap`/`align`/`gap`，见 `container.tsx:8-69`），复用 Phase 3 Decision 的断点字段约定；缺省（无断点字段）行为不变。
- [x] **Proof**：focused 单测覆盖 flex 与 container 的断点切换（mobile column / desktop row）与缺省回退（`flex-responsive.test.tsx`，对 flex 与 container 各有断言）。

Exit Criteria:

- [x] `flex.tsx` 与 `container.tsx` 均支持 direction/wrap 断点切换（共享 Phase 3 Decision 的断点字段约定）；无断点字段时输出与改动前一致（无回归）。
- [x] `flex-responsive.test.tsx` 对 flex 与 container 的断点切换 + 缺省回退均有断言并通过。
- [x] `flex/design.md`、`container/design.md` 各增「响应式行为」小节并引用 M0 baseline。

## Draft Review Record

> 起草后、执行前的独立审查证据（详见 guide `Plan Review Rule`）。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立 fresh-session review subagent `ses_10f07dffdffeVqMC0hlJQu12xF`（round 1）→ `ses_10f030f4effexEoCBU6A6zmkKF`（round 2）
- Verdict: `pass`（round 2，零 Blocker / 零 Major）
- Rounds: 2
- Findings addressed:
  - R1 Major（Phase 3 container 缺 repo-observable Exit Criterion + Fix 模糊）→ 已修：container Fix 改为共享 flex 的 per-breakpoint direction/wrap 切换（引用 `container.tsx:8-69` 同源 `resolveDirection`/`flex-wrap`），新增 container 专属 Exit Criterion，`flex-responsive.test.tsx` 覆盖 flex 与 container 双方。R2 确认 resolved。
  - R1 Minors（Phase 1 缺 `Follow-up` Item Type、Phase 2 缺 `Decision` Item Type、flex.tsx 行号 34-68→35-74、aside「隐藏 vs 折叠滑出」措辞张力）→ 全部已修：Phase 1 Decision 改为对齐 §13「折叠/触发式滑出」并增 §13 重写项消除张力；Item Types 补齐；行号更正。R2 仅余 1 cosmetic（container 行号范围对称性），已顺手修正为 8-69。
  - 全部 baseline 引用经 live repo 核对为 TRUE（page.tsx 无响应式、§13/§14 已立约、flex 无断点、grid/layout 包缺失、deferred 项路由真实、M-status 基线正确）。

## Closure Gates

> 关闭条件：本 section + 每个 Phase Exit Criteria 全 `[x]` 后才可标 `completed`。全量 `pnpm typecheck/build/lint/test` 归此处（guide Rule 18）。

- [x] M3a page 响应式行为（aside 折叠/toolbar 堆叠/footer VisualViewport）已落地且无桌面回归。
- [x] M3a §14 骨架模式 5 类 playground + e2e 已交付。
- [x] M3b flex/container 断点切换已落地，缺省回退无回归。
- [x] M1/M2/M0.1 → M3a deferred 项已在源 plan 注记收口。
- [x] `page/design.md` §13/§14、`flex/design.md`、`container/design.md` 响应式小节已同步到 live baseline。
- [x] 不存在被静默降级到 deferred 的 in-scope live defect 或 contract drift（grid 延后有明确 successor，见下）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### grid 响应式

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `grid` renderer 尚未落地（主 roadmap W3a `todo`，`flux-renderers-layout` 包不存在）。M3b 的「grid 响应式」无对象可适配——grid 组件本身是 M3b 的外部前置，不是 M3 结果面内的 defect。flex/container 响应式可独立收口。
- Successor Required: yes
- Successor Path: 主 roadmap W3a（grid renderer 落地后，其响应式行为随 W3a design.md 响应式小节或独立 follow-up 收口）

## Non-Blocking Follow-ups

- container query 体系化（baseline §7 标「未来」），当前用 Tailwind 响应式类已满足 M3b 需求，无需在本 plan 引入。
- page aside 折叠态的更丰富交互（如可拖拽调整宽度）属增强，归后续评估。

## Closure

Status Note: completed — 独立 fresh-session closure-audit 通过（narrow re-audit after one-word doc fix）。

Closure Audit Evidence:

- Auditor / Agent: independent closure auditor (fresh session, post-executor one-word doc fix)
- Scope: narrow re-audit of prior MAJOR finding — §14.2 NavBar template `headerClassName` → `toolbarClassName` + correction note rewrite.
- Evidence:
  - `docs/components/page/design.md:213` — §14.2 JSON template uses `"toolbarClassName": "nop-navbar sticky top-0 nop-safe-top bg-background"`（NOT `headerClassName`）。✅
  - `docs/components/page/design.md:240` — correction note references `toolbarClassName` / `data-slot="page-toolbar"`，并解释 `page-header` wrapper 仅在 title/subTitle/remark/mobile-aside-toggle 配置时渲染，§14.2 无这些字段故 `headerClassName` no-op。✅
  - `apps/playground/src/pages/m3-layout-demo.tsx:76` — NavBar schema 用 `toolbarClassName`，与 doc 一致。✅
  - `packages/flux-renderers-basic/src/page.tsx:122-125` — `data-slot="page-toolbar"` div 在 `headerContent` 非空时即渲染，由 `slotProps.toolbarClassName` 样式化；`page-header` wrapper（line 112-121）仅在 title/subTitle/remark/mobile-aside-toggle 分支渲染，印证 correction note 的解释。✅
  - e2e re-run: `npx playwright test tests/e2e/m3-layout.spec.ts --reporter=list` → 7/7 passed（NavBar/Tabbar/ActionBar/SubmitBar/sticky/VisualViewport/desktop-skeleton）。✅
- Findings: 无 remaining findings。prior MAJOR 已修正且经独立核对。
- Prior-round gates（typecheck 51/51、lint 27/27、test 51/51、build 27/27、Phase 1/3 code & focused tests）已由前序 audit 核对为 green，本轮 narrow re-audit 未触及代码，承认为真。

Follow-up:

- grid 响应式归主 roadmap W3a successor（见 Deferred But Adjudicated）。
- <<或明确写 no other remaining plan-owned work>>
