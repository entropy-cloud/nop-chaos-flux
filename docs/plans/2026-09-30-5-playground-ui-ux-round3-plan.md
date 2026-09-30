# 05 playground 应用壳与 ui 组件 UX 批量（round-3）

> Plan Status: completed
> Last Reviewed: 2026-09-30
> Source: `docs/analysis/2026-09-30-perf-ux-round3-deep-optimization-analysis.md`（R3-U1、U2、U5 ~ U9、U23 ~ U28、U32）
> Related: `docs/plans/2026-09-28-3-playground-bundle-optimization-plan.md`（lazy 路由已落地，本 plan 处理其 UX 后果）、`docs/architecture/playground-experience.md`

## Purpose

收口 playground 应用壳的两个 HIGH 导航缺陷（scheduling 分类丢失、后退即退出）与健壮性/可用性缺口（ErrorBoundary、Toaster 暗色、侧栏 aria-current/搜索/响应式、not-found 态），以及 `@nop-chaos/ui` 的 5 处组件级缺陷（Spinner aria、DataViewer stringify、Drawer 函数式 style、button 内容模型、Button loading 态）与一处文案拼写。

## Current Baseline

- `component-lab-page.tsx:11-19` CATEGORY_ORDER 缺 `scheduling`/`domain`，Kanban/Calendar/Barcode Input 三个 lab 条目侧栏不可见——live 核实（执行者抽查成立）；`CATEGORY_LABELS` 已含两分类 label。
- `use-route.ts:11` applyRoute 用 `window.location.replace` 写 hash，后退直接退出应用——live 核实（执行者抽查成立）。
- App.tsx:477 仅 Suspense 无 ErrorBoundary，约 45 个 lazy 路由——live 核实。
- `sonner.tsx:31` theme 硬编码 light；App.tsx:483 未传 theme——live 核实。
- 侧栏激活项无 aria-current（component-lab-page.tsx:130-136、complex-pages-showcase.tsx:78-83）；133 条目无搜索过滤；两个 showcase 壳固定 240px 侧栏零断点——live 核实。
- `spinner.tsx:8-9` aria-label="Loading" 字面量（`flux.common.loading` 两 locale 均存在）；`json-viewer.tsx:38-44` yamlText 每 render stringify；`drawer.tsx:162` 函数式 style 被静默丢弃；`home-page.tsx:22-40` button 内 h2/p；`button.tsx` 组件签名（:64-70）无 loading prop；`flux-basic-page.tsx:169` "already-taken"；`App.tsx:466-467` 未知 domainId 渲染残缺 HomePage（可达实例仅 `dingtalk-flow-demo`，见 Failure Paths 注）——live 核实。
- i18n 键集两语言 1716 键一致（契约测试在位）；ui 包 Context value 全部 useMemo（clean）。
- playground e2e：smoke+navigation 基线 111/111 为 2026-08-09 DV 实测口径（`docs/context/project-context.md`）；当前 focused 门禁以 `tests/e2e/component-lab/smoke.spec.ts` + `navigation.spec.ts` + `home-entry-navigation.spec.ts` 聚焦跑法为准。

## Goals

- Component Lab 侧栏完整呈现 scheduling/domain 分类；所有站内导航产生可后退的历史记录。
- 懒加载失败有 ErrorBoundary 兜底（重试/重载入口），不再白屏。
- Toaster 跟随应用暗色模式；侧栏当前项对 AT 可感知；133 条目可搜索；窄屏可用（抽屉化侧栏）。
- ui 包 5 处缺陷修复 + playground 文案/结构 3 处修复。

## Non-Goals

- 不改 playground 路由模型（route-model.ts 的 RouteSpec 结构）与 lazy 分包策略。
- 不做 ui 组件新增变体大改造（仅 Button loading 一个增量）。
- flow designer 工具栏 ARIA 在 Plan 2 承接，不在此重复。

## Scope

### In Scope

- `apps/playground/src/component-lab/component-lab-page.tsx`、`use-route.ts`、`App.tsx`、`pages/home-page.tsx`、`pages/flux-basic-page.tsx`、`complex-pages/complex-pages-showcase.tsx`、`theme.ts`（如 Toaster 需读取）
- `packages/ui/src/components/ui/sonner.tsx`、`spinner.tsx`、`json-viewer.tsx`、`drawer.tsx`、`button.tsx`
- flux-i18n locales（新增键，如 ErrorBoundary 文案、抽屉开关 label）
- 各改动点 focused 单测 / DOM 断言

### Out Of Scope

- 各 demo 页面内容本身的 UX
- `packages/ui` 其他组件的变体扩展

## Failure Paths

| 可测场景编号        | 触发                                                                                                                                                   | 行为                                                                     | 可重试     | 用户可见表现                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ---------- | ----------------------------------- |
| lazy-chunk-fail     | 发版后旧 hash 命中已删除 chunk                                                                                                                         | ErrorBoundary 捕获渲染降级 UI（错误说明 + 重载按钮）                     | 是（重载） | 不再白屏                            |
| back-after-navigate | lab 列表 → 某示例 → 浏览器后退                                                                                                                         | 返回 lab 列表（历史保留）                                                | 是         | 不退出应用                          |
| unhandled-domain    | registry 已知但 App.tsx 无 case 的 domain hash（现存唯一实例：`dingtalk-flow-demo`，`homeVisible: false`，前置 plan 2026-08-07-1053-2 裁定的暂存路由） | 显式 domain-not-found 态（提示 + 返回首页入口），替换现在的残缺 HomePage | 是         | 不再渲染 onNavigate 为 no-op 的首页 |

注：`parseRoute`（route-model.ts:98-103）对完全未知的 hash 返回 `{kind:'home'}` 的行为**维持不变**（Non-Goal：不改路由模型）——本 plan 只处理 App.tsx default 分支的渲染质量，不扩大 parse 语义。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（全局导航语义变更（R3-U2）当前无任何既有 browser-back 守卫（navigation.spec 无 goBack 断言），Phase 1 Proof 须前置新增 browser-back 断言用例；ErrorBoundary 用单测模拟 chunk 失败；smoke/navigation e2e 回归是 Phase 1 Exit 门禁）。

## Execution Plan

### Phase 1 - 导航与路由（R3-U1、U2、U32）

Status: completed
Targets: `component-lab-page.tsx`、`use-route.ts`、`App.tsx`

- Item Types: `Fix`、`Proof`

- [x] Fix (R3-U1)：CATEGORY_ORDER 补 `'scheduling'`（三个 lab 条目侧栏可见）与 `'domain'`（前向对齐 CATEGORY_LABELS；当前 133 条目零 `domain` category，对可见性无可观察效果，不纳入 Proof）
- [x] Fix (R3-U2)：`applyRoute` 改 push 语义（`window.location.hash = bare`；已核实 useRoute hashchange handler 只 setRoute 不回调 navigate，无事件回环风险；相同 hash 为 no-op 不加历史）
- [x] Fix (R3-U32)：App.tsx default 分支（unknown domainId）改渲染显式 domain-not-found 态（`[data-testid="domain-not-found"]`：`flux.app.domainNotFoundTitle/Description` 提示 + Back to home 按钮），替换残缺 HomePage；现存可达实例为 `dingtalk-flow-demo`（前置 plan 2026-08-07-1053-2 裁定的暂存路由，本裁定变更其 fallback 表现）；`parseRoute` 未知 hash 返回 home 的行为维持不变（Decision，Non-Goal 保持路由模型不动）
- [x] Proof：focused 单测/DOM 断言——scheduling 分类渲染出 Kanban/Calendar/Barcode Input 三个链接（`component-lab-page.test.tsx` R3-U1 用例断言三个 `nav-renderer-*`）；navigate 后后退回上一路由（`navigation.spec.ts` 新增 R3-U2 browser-back 守卫：lab/button → lab/form → goBack 回 lab/button；hash history 在 happy-dom 单测环境不可仿真，故该守卫按 plan 原意落在 e2e）；程序化 navigate 到 `dingtalk-flow-demo` 显示 not-found 态（`app-route-resilience.test.tsx`）
- [x] Proof：focused e2e 子集全绿——`tests/e2e/component-lab/smoke.spec.ts`、`tests/e2e/component-lab/navigation.spec.ts`（含新增 R3-U2 用例）、`tests/e2e/home-entry-navigation.spec.ts`（收口批运行结果见 daily log）

Exit Criteria:

- [x] 3 项 Fix 落地，focused 断言全绿
- [x] smoke/navigation focused e2e 子集无回归 (118/118)

### Phase 2 - 健壮性与主题（R3-U5、U6）

Status: completed
Targets: `App.tsx`（ErrorBoundary）、`packages/ui/src/components/ui/sonner.tsx`、flux-i18n locales

- Item Types: `Fix`、`Proof`

- [x] Fix (R3-U5)：Suspense 外包 class ErrorBoundary（`RouteErrorBoundary`：lazy chunk 失败提示 + Reload page 按钮 + routeKey 变更复位，文案走 `flux.app.routeError*` i18n）
- [x] Fix (R3-U6)：Toaster 读取 `documentElement[data-mode]`（ui 包内 MutationObserver 订阅 attribute，theme 模块无耦合；`props.theme` 显式值优先）
- [x] Proof：单测——boundary 捕获 render/懒加载异常并渲染降级 UI，路由切换后复位（`app-route-resilience.test.tsx`：word-editor-page mock 抛 chunk 失败 → fallback；切路由复位 → 回来再次守护）；Toaster 在 data-mode=dark 下输出 dark theme（`sonner.test.tsx`：dark 属性 → theme 'dark'、翻转跟随、显式 props 覆盖）

Exit Criteria:

- [x] 2 项 Fix 落地，focused 单测全绿
- [x] 新增 locale 键两语言齐全

### Phase 3 - 侧栏可用性（R3-U7、U8、U9）

Status: completed
Targets: `component-lab-page.tsx`、`complex-pages-showcase.tsx`、ui 侧栏抽屉能力（SidebarProvider/useIsMobile 现成）

- Item Types: `Fix`、`Proof`

- [x] Fix (R3-U7)：两个 showcase 侧栏激活项加 `aria-current="true"`
- [x] Fix (R3-U8)：Component Lab 侧栏头部加过滤 Input（`component-lab-filter`，title/id 大小写不敏感双键过滤，空组折叠 + `component-lab-filter-empty` 空态，对齐 flow-list-page 先例），默认折叠态可保持
- [x] Fix (R3-U9)：<768px 时侧栏改抽屉（ui `useIsMobile` + Drawer direction=left + `component-lab-menu` 开关按钮，选中条目后自动关闭；主区恢复全宽）
- [x] Proof：DOM 断言——激活项 aria-current 存在（两个 showcase 各 1 用例：初始无 → 点击后 'true'）；过滤输入后列表条目收敛（30+ → 匹配子集 → 空态）；窄屏断言（innerWidth=375 桩）：桌面侧栏消失、菜单按钮出现、点击后抽屉含完整导航

Exit Criteria:

- [x] 3 项 Fix 落地，DOM 断言全绿
- [x] 新增 locale 键两语言齐全（本 Phase 复用既有键，零新增）

### Phase 4 - ui 组件与文案（R3-U23 ~ U28）

Status: completed
Targets: `packages/ui/src/components/ui/spinner.tsx`、`json-viewer.tsx`、`drawer.tsx`、`button.tsx`、`apps/playground/src/pages/home-page.tsx`、`flux-basic-page.tsx`

- Item Types: `Fix`、`Proof`

- [x] Fix (R3-U23)：Spinner aria-label 走 ui 包**既有 i18n 机制**（`packages/ui/src/lib/i18n.ts` 本地兜底表 + Symbol bridge，dialog.tsx:229 先例；fallback 表补 `flux.common.loading: 'Loading...'`，与 flux-i18n locale 实值 `'Loading...'`/`'加载中...'` 对齐，运行时由 flux-i18n init 注入 getter）——**禁止新增 ui → flux-i18n 依赖边**（flux-i18n devDependencies 反向引用 ui，会成环）；保留 props 覆盖
- [x] Fix (R3-U24)：DataViewer yamlText 仅 `format === 'yaml'` 时计算
- [x] Fix (R3-U25)：Drawer 函数式 style/className 透传 Popup/Content（Base UI 原生解析 `(state) => style/className` 形式；包装层不再静默丢弃：对象形式保持 cn 合并，函数形式原样透传）
- [x] Fix (R3-U26)：HomePage 导航卡片 h2/p 降级为 block span（button 内容模型仅允许 phrasing content）
- [x] Fix (R3-U27)：Button 增加 `loading` prop（leading Spinner + disabled + `aria-busy` + `data-loading`）；playground 示范接入：print-designer-demo「导出 PDF」async 按钮
- [x] Fix (R3-U28)："Username is already-taken" 拼写修复
- [x] Proof：单测/DOM 断言——Spinner 默认 label 走 ui i18n 机制（`data-viewer-spinner.test.tsx`：无 props → fallback 表 'Loading...'，props 覆盖生效）；DataViewer JSON tab 无 stringify（同文件：yaml stringify spy 在 JSON tab 零调用、切 YAML tab 恰一次调用 + `<pre>` 文本断言）；Drawer 函数式 style 到达 Content（style attr 含 'rgb(1, 2, 3)' + className 含 'fn-drawer-class'）；button 内不再含 h2（HomePage span 化，卡片由既有 e2e/home 断言覆盖渲染不回退）；Button loading 态渲染 Spinner 且 disabled（role=status + disabled + aria-busy 三断言，非 loading 时全部缺席）；拼写断言（`flux-basic-page.debugger.test.tsx` R3-U28 source guard：含 'already taken' 且不含 'already-taken'）

Exit Criteria:

- [x] 6 项 Fix 落地，断言测试全绿
- [x] ui 包公开导出面变更仅限 Button props 扩展（向后兼容）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_1d9c9df2 r1 / agent_d2650012 r2）
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed: r1 Major×2——U32 可达性（parseRoute 未知 hash 返回 home 维持 + 触发条件改写为 registry 已知无 case 实例 dingtalk-flow-demo + Decision 项）、Spinner i18n 机制（走 ui lib/i18n.ts 兜底表 + bridge，禁新增 ui→flux-i18n 依赖边）均已写死；r2 Minor（home-entry-navigation.spec 路径更正至 tests/e2e/、fallback 文案对齐 'Loading...'）已修正。

## Closure Gates

- [x] 所有 in-scope confirmed live 缺陷已修复（R3-U1、U2、U5 ~ U9、U23 ~ U28、U32 逐条核对）
- [x] 不适用 contract drift（ui 包仅向后兼容扩展：Button loading prop、Spinner props 覆盖，零新依赖边；路由模型不变）
- [x] 行为/契约结果已达成（Failure Paths 三场景 + 全部断言测试通过；U2 browser-back 守卫落 e2e navigation.spec）
- [x] 必要 focused verification 已完成（typecheck/build/lint/check exit 0；pnpm test 78/78 task exit 0；focused e2e 子集 118/118）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（Deferred But Adjudicated 一节为空）
- [x] owner docs 已同步（No owner-doc update required：playground-experience.md 未记载与本批冲突的路由/导航契约——审计已核实）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（见 Closure）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm test:e2e` smoke+navigation spec 全绿

## Deferred But Adjudicated

（无——in-scope 全部 Fix）

## Non-Blocking Follow-ups

- ui Button loading 态在全仓 async 按钮消费点的批量推广（本轮仅示范接入）

## Closure

Status Note: 13 项 Fix（U1、U2、U5 ~ U9、U23 ~ U28、U32）全部落地并经独立 fresh-session 审计通过；审计发现的 4 条 minor（U5 routeKey 同类路由不复位；U23/U24/U28 Proof 文本引用了不存在的断言）已在 closure 批 remediation 中全部修复（routeKey 改全路由身份 JSON.stringify + 新增 same-kind 复位测试；三条断言真实补齐并回写 Proof 文本）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_509d57d9）
- Verdict: `approved`（4 minor，全部 non-blocking 且已修复）
- Evidence: ui 包独立 spot-run 24/24、playground 25/25 全绿；ErrorBoundary mock 经核实真实拒绝真实 lazy import 路径；导出面零变更（index.ts 双 commit 空 diff）；browser-back 守卫落 navigation.spec:56-70。审计 minor 修复后全量 `pnpm typecheck/build/lint/check/test` 复验 exit 0（见 daily log 2026-09-30 收口批）。

Follow-up:

- ui Button loading 态在全仓 async 按钮消费点的批量推广（本轮仅示范接入，原 Follow-up 保留）
