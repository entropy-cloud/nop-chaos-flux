# 05 playground 应用壳与 ui 组件 UX 批量（round-3）

> Plan Status: active
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

Status: planned
Targets: `component-lab-page.tsx`、`use-route.ts`、`App.tsx`

- Item Types: `Fix`、`Proof`

- [ ] Fix (R3-U1)：CATEGORY_ORDER 补 `'scheduling'`（三个 lab 条目侧栏可见）与 `'domain'`（前向对齐 CATEGORY_LABELS；当前 133 条目零 `domain` category，对可见性无可观察效果，不纳入 Proof）
- [ ] Fix (R3-U2)：`applyRoute` 改 push 语义（`window.location.hash = bare`；已核实 useRoute hashchange handler 只 setRoute 不回调 navigate，无事件回环风险；相同 hash 为 no-op 不加历史）
- [ ] Fix (R3-U32)：App.tsx default 分支（unknown domainId）改渲染显式 domain-not-found 态（提示 + 返回首页入口），替换残缺 HomePage；现存可达实例为 `dingtalk-flow-demo`（前置 plan 2026-08-07-1053-2 裁定的暂存路由，本裁定变更其 fallback 表现）；`parseRoute` 未知 hash 返回 home 的行为维持不变（Decision，Non-Goal 保持路由模型不动）
- [ ] Proof：focused 单测/DOM 断言——scheduling 分类渲染出 Kanban/Calendar/Barcode Input 三个链接；navigate 后 `history.length` 递增且后退回上一路由（browser-back 断言，当前 navigation.spec 无此守卫，须新增）；程序化 navigate 到 `dingtalk-flow-demo`（或任意未处理 domainId）显示 not-found 态
- [ ] Proof：focused e2e 子集全绿——`tests/e2e/component-lab/smoke.spec.ts`、`tests/e2e/component-lab/navigation.spec.ts`、`tests/e2e/home-entry-navigation.spec.ts`（全量 e2e 留 Closure Gates）

Exit Criteria:

- [ ] 3 项 Fix 落地，focused 断言全绿
- [ ] smoke/navigation focused e2e 子集无回归

### Phase 2 - 健壮性与主题（R3-U5、U6）

Status: planned
Targets: `App.tsx`（ErrorBoundary）、`packages/ui/src/components/ui/sonner.tsx`、flux-i18n locales

- Item Types: `Fix`、`Proof`

- [ ] Fix (R3-U5)：Suspense 外包 class ErrorBoundary（含 lazy chunk 失败提示 + 重载按钮 + resetKeys 随路由复位），文案走 i18n
- [ ] Fix (R3-U6)：Toaster 读取 `documentElement[data-mode]`（MutationObserver 或 theme 模块订阅）映射 sonner theme，暗色下 toast 内部样式正确
- [ ] Proof：单测——boundary 捕获 render 异常并渲染降级 UI，路由切换后复位；Toaster 在 data-mode=dark 下输出 dark theme（DOM/data 属性断言）

Exit Criteria:

- [ ] 2 项 Fix 落地，focused 单测全绿
- [ ] 新增 locale 键两语言齐全

### Phase 3 - 侧栏可用性（R3-U7、U8、U9）

Status: planned
Targets: `component-lab-page.tsx`、`complex-pages-showcase.tsx`、ui 侧栏抽屉能力（SidebarProvider/useIsMobile 现成）

- Item Types: `Fix`、`Proof`

- [ ] Fix (R3-U7)：两个 showcase 侧栏激活项加 `aria-current="true"`
- [ ] Fix (R3-U8)：Component Lab 侧栏头部加过滤 Input（按 title/id 过滤，对齐 flow-list-page 先例），默认折叠态可保持
- [ ] Fix (R3-U9)：<768px 时侧栏改抽屉（Drawer/Sheet + 开关按钮），主区恢复全宽
- [ ] Proof：DOM 断言——激活项 aria-current 存在；过滤输入后列表条目收敛；窄屏断言（matchMedia 桩或 class 断言）抽屉态生效

Exit Criteria:

- [ ] 3 项 Fix 落地，DOM 断言全绿
- [ ] 新增 locale 键两语言齐全

### Phase 4 - ui 组件与文案（R3-U23 ~ U28）

Status: planned
Targets: `packages/ui/src/components/ui/spinner.tsx`、`json-viewer.tsx`、`drawer.tsx`、`button.tsx`、`apps/playground/src/pages/home-page.tsx`、`flux-basic-page.tsx`

- Item Types: `Fix`、`Proof`

- [ ] Fix (R3-U23)：Spinner aria-label 走 ui 包**既有 i18n 机制**（`packages/ui/src/lib/i18n.ts` 本地兜底表 + Symbol bridge，dialog.tsx:229 先例；fallback 表补 `flux.common.loading: 'Loading...'`，与 flux-i18n locale 实值 `'Loading...'`/`'加载中...'` 对齐，运行时由 flux-i18n init 注入 getter）——**禁止新增 ui → flux-i18n 依赖边**（flux-i18n devDependencies 反向引用 ui，会成环）；保留 props 覆盖
- [ ] Fix (R3-U24)：DataViewer yamlText 仅 `format === 'yaml'` 时计算
- [ ] Fix (R3-U25)：Drawer 函数式 style/className 透传 Popup（或类型层禁止并注释），不再静默丢弃
- [ ] Fix (R3-U26)：HomePage 导航卡片改 a/div 结构（或降级 span + 卡片外标题层级），消除 button 内容模型违规
- [ ] Fix (R3-U27)：Button 增加 `loading` prop（Spinner + disabled + aria-busy），消费方按需迁移（本轮至少接 playground 现有 async 按钮一处示范）
- [ ] Fix (R3-U28)："Username is already-taken" 拼写修复
- [ ] Proof：单测/DOM 断言——Spinner 默认 label 走 ui i18n 机制（bridge 注入后取 locale 值，未注入时取 fallback 表值；ui 包测试环境不依赖 initFluxI18n）；DataViewer JSON tab 无 stringify（计数桩）；Drawer 函数式 style 到达 Popup；button 内不再含 h2；Button loading 态渲染 Spinner 且 disabled；拼写断言

Exit Criteria:

- [ ] 6 项 Fix 落地，断言测试全绿
- [ ] ui 包公开导出面变更仅限 Button props 扩展（向后兼容）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_1d9c9df2 r1 / agent_d2650012 r2）
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed: r1 Major×2——U32 可达性（parseRoute 未知 hash 返回 home 维持 + 触发条件改写为 registry 已知无 case 实例 dingtalk-flow-demo + Decision 项）、Spinner i18n 机制（走 ui lib/i18n.ts 兜底表 + bridge，禁新增 ui→flux-i18n 依赖边）均已写死；r2 Minor（home-entry-navigation.spec 路径更正至 tests/e2e/、fallback 文案对齐 'Loading...'）已修正。

## Closure Gates

- [ ] 所有 in-scope confirmed live 缺陷已修复（R3-U1、U2、U5 ~ U9、U23 ~ U28、U32 逐条核对）
- [ ] 不适用 contract drift（ui 包仅向后兼容扩展：Button loading prop、Spinner props 覆盖，零新依赖边；路由模型不变）
- [ ] 行为/契约结果已达成（Failure Paths 三场景 + 全部断言测试通过）
- [ ] 必要 focused verification 已完成
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [ ] owner docs 已同步（`docs/architecture/playground-experience.md` 若记载路由/导航行为需更新；否则写明 No owner-doc update required）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm test:e2e` smoke+navigation spec 全绿

## Deferred But Adjudicated

（无——in-scope 全部 Fix）

## Non-Blocking Follow-ups

- ui Button loading 态在全仓 async 按钮消费点的批量推广（本轮仅示范接入）

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up>>
