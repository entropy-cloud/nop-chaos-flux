# C6.3 content 值映射类逐组件审计（alert/mapping/status）

> Plan Status: completed
> Mission: component-audit
> Work Item: C6.3
> Last Reviewed: 2026-08-04
> Source: `docs/backlog/component-audit-roadmap.md`（C6.x Phase Details）、`docs/audits/component-audit-checklist.md`（18 维 + 审计卡模板 + 自动修复纪律）、`docs/skills/deep-audit-prompts.md`、`docs/architecture/styling-system.md`、`docs/logs/2026/08-04.md`（C6.1/C6.2 节）
> Related: 依赖 C0（`2026-08-02-2043-1`，completed）完成后开工；与 C6.1（`2026-08-04-0841-2`，completed）/ C6.2（`2026-08-04-0841-3`，completed）同包同族先例；与 C6.4（`2026-08-04-1757-2`）/ C6.5（`2026-08-04-1757-3`）并行独立（均只依赖 C0）。前置基础：08-02 nested-schema 机制（completed）已分类本族字段（content-renderer-definitions.ts fields kind 分类：alert title/body value-or-region + actions region、mapping item region、status 全 prop）；CX-9 反应式结果捕获通道（completed，C4.2）——本族无 kind:'reaction' 字段（status/mapping/alert 全 prop + event），仅核对不消费

## Purpose

对 `flux-renderers-content` 值映射类 3 个组件（alert/mapping/status）完成 18 维逐组件审计（每组件一张审计卡，P0/P1/P2/P3 裁决留痕），P0/P1 缺陷在**同一 plan 内自动修复**（test-first + 回归测试 + 受影响包验证门禁），完成 ≥1 个真实浏览器组合宿主场景验证（含 bug 73 模式专项检查），最终 3 张审计卡全部 `closed`（P0/P1 清零）。重点维度：3 值所有权三态（mapping/status 为 display-only：value 从 props/scope 求值、无写回路径；alert 无 value）、5 DOM 契约（根 marker 类 nop-alert/nop-mapping/nop-status + mapping-root/status-root data-slot + data-state hit/miss）、7 事件与 action 契约（**alert onClose payload `{level}` 与 eventContracts 一致**、mapping/status 事件核查）、12 组合宿主场景（alert closable 关闭 + 内嵌 action、mapping/status 在 CRUD 行/dialog 内 scope 求值、**bug 73 模式专项**）、16 测试质量。

## Current Baseline

- **组件与文件**：`alert-renderer.tsx`（113 行）、`mapping.tsx`（107 行）、`status.tsx`（92 行）。
- **注册定义**：`content-renderer-definitions.ts`（alert `:271`、mapping `:328`、status `:370`）；字段分类（08-02 机制）：alert fields `:317-325`（level/icon/closable prop + title/body value-or-region + actions region + onClose event，eventContracts onClose payload `{level}` `:307-316`）、mapping fields `:360-367`（value/map/defaultLabel/placeholder/source prop + item region）、status fields `:408-414`（value/labelMap/levelMap/iconMap/placeholder 全 prop）。三组件 defaultSchema 均为 `{ type: '<type>' }`。
- **设计文档**：`docs/components/{alert,mapping,status}/design.md` + `example.json` 均存在。
- **playground**：3 组件**无 component-lab lab 页**（维度 18 缺口待核对）；demo 宿主在 `apps/playground/src/pages/w2a-data-composition-demo.tsx`（alert demo-alert `:122`，alert-report probe）与 `apps/playground/src/pages/w3c-value-mapping-demo.tsx`（mapping `:39-80` 6 场景、status `:84-126` 6 场景）。
- **既有单测**：`alert-renderer.test.tsx`（5 用例）、`mapping.test.tsx`（12 用例）+ `mapping-source.test.tsx`（5 用例，source 表达式源）、`status.test.tsx`（10 用例）；`content-renderer-definitions.test.tsx:260-288` 已含 mapping/status 经 definition 渲染 marker 契约用例。
- **e2e**：`tests/e2e/w2a-data-composition.spec.ts`（alert 关闭 + onClose 报告 `:52-62`）、`tests/e2e/w3c-value-mapping.spec.ts`（mapping/status marker + data-state hit/miss + defaultLabel/placeholder 优先级 + item region 模板 + levelMap 语义色投影，覆盖较全）；本族无 `tests/e2e/component-lab/c6-3-host-surfaces.spec.ts`（需新增）。
- **基线**：C0 基线 unit 全绿（typecheck/build/lint 31/31、test 58/58）；**e2e 已于 C5.1 verify 轮达成 full-green（882 passed / 43 skipped / 0 failed），C6.2 VERIFY 轮维持（929 passed / 43 skipped / 0 failed，`docs/logs/2026/08-04.md`）**——本 plan 不继承 e2e pre-existing 债务；`gantt-bars-and-links.spec.ts:132` 拖拽时序 flake 为机器负载 watch-only residual（successor C9，本 plan 不涉及）。

## Goals

- 3 张审计卡（`docs/audits/per-component/{alert,mapping,status}.md`）18 维逐项核对，P0/P1/P2/P3 裁决留痕，`文件:行` 证据，全部 `closed`（P0/P1 清零）。
- 本族 P0/P1 缺陷 test-first 自动修复（契约/公共层修复 Must automate），P2 低成本当场修复、其余登记卡内 backlog 归 CR。
- ≥1 个真实浏览器组合宿主场景（含 bug 73 模式专项）：候选——alert closable 关闭 + 内嵌 actions 按钮组合宿主、mapping/status 在 CRUD 行 scope / dialog 内求值（行 scope 污染复验）、mapping item region 内嵌组件与 value 求值组合。
- roadmap C6.3 行标 `done`（独立子 agent closure-audit pass 后）。

## Non-Goals

- C6.4 content 媒体类（audio/video/carousel/qrcode，`2026-08-04-1757-2` 覆盖）、C6.5 diff-view（`2026-08-04-1757-3` 覆盖）。
- C6.1/C6.2 已收口组件不重审（markdown/html/json-view/link/image/card/cards/empty/progress/spinner/separator）。
- checklist v2 修订（CG）、审计工具脚本升级（CG）。
- 结构性重构（公共 API/包边界/编译期机制，需人工确认后另立 CX-n；纯行为修复不视为结构性）。
- 各审计卡 P2 backlog（>15 分钟项）归 CR 处理，不在本 plan 内实现。

## Scope

### In Scope

- 3 组件 × 18 维审计卡（维度重点：1 Schema 契约（AlertSchema/MappingSchema/StatusSchema 与注册 fields/propContracts/eventContracts 一致）、2 RendererComponentProps 合规、3 值所有权三态（**mapping/status display-only：value 经 props/scope 求值无写回路径——无 valueOwnership/valueStatePath 声明即有意设计，不得裁为契约漂移；alert 无 value 字段**）、4 表单参与（本族非表单字段——核对无表单参与泄漏）、5 DOM 与选择器契约（**根 marker 类 nop-alert/nop-mapping/nop-status、mapping-root/status-root data-slot、data-state hit/miss 输出正确**）、6 嵌套 schema 分类（**08-02 机制核对：alert title/body value-or-region + actions region 内嵌 action 分类、mapping item region、无 deepFields 残留**）、7 事件与 action 契约（**alert onClose payload `{level}` 与 eventContracts 一致、actions region 内嵌 action 派发；mapping/status 事件 shape**）、8 a11y（alert role=alert 语义、status 文本可读性、mapping item 内容）、9 i18n（占位文案 key）、10 四态覆盖（空/加载/错误/禁用——alert 各级别、mapping hit/miss/空值、status labelMap 未命中降级）、11 异步生命周期（本族基本无异步——核对无泄漏）、12 组合宿主场景（**mapping/status 在 CRUD 行 scope / dialog 内求值、行 scope 污染复验（bug 73 模式）、alert 关闭 + 内嵌 action**）、13 样式契约（widget renderer 自样式 + marker 类）、14 React 19、15 性能边界（mapping 大 map 表、status 渲染路径）、16 测试质量（既有测试断言正确行为而非 not-throw、DOM 契约断言、错误路径）、17 文档对照（design.md ↔ 实现 props/行为）、18 注册/包边界/IO 安全红线（surface 双注册、**3 组件无 component-lab lab 页——覆盖缺口核查**、mapping/status 仅文本渲染无 HTML 注入面））。
- P0/P1 自动修复（test-first）+ P2 低成本即时修复。
- 真实浏览器宿主场景（alert closable + actions 组合、mapping/status CRUD 行 scope 求值、mapping item region）。
- 审计卡状态流转（open → fixing → fixed-pending-closure → closed）与 daily log 记录。

### Out Of Scope

- C6.1/C6.2/C6.4/C6.5 content 其余族（并行/后续 plan 覆盖）。
- checklist v2 修订（CG）。
- 结构性重构（需人工确认后另立 CX-n）。

## Failure Paths

| 可测场景编号        | 触发                         | 行为（含错误码）                                                    | 可重试 | 用户可见表现         |
| ------------------- | ---------------------------- | ------------------------------------------------------------------- | ------ | -------------------- |
| host-alert-close    | alert closable 关闭按钮点击  | 隐藏 + onClose payload `{level}` 正确、actions 内嵌 action 独立派发 | 是     | alert 关闭、报告正确 |
| host-mapping-row    | mapping 在 CRUD 行内求值     | 行 scope 值正确（行污染复验：每行独立值，无串行）                   | 是     | 每行映射值正确       |
| host-status-dialog  | status 在 dialog 内求值      | dialog 内 scope 求值正确、levelMap 语义色投影正确                   | 是     | 状态徽标正确         |
| host-mapping-region | mapping item region 内嵌组件 | item region 模板随命中值渲染、内嵌组件独立派发 action               | 是     | 模板与动作正确       |
| host-alert-action   | alert actions 按钮点击       | 内嵌 action 派发 payload 正确                                       | 是     | action 行为正确      |

## Test Strategy

本档选择：**必须自动化** —— alert onClose 事件契约 `{level}` + actions 内嵌 action 是事件形状重点；mapping/status 在 CRUD 行 scope 求值是行污染模式复验（bug 73 模式核心回归路径）；契约/公共层修复必须 test-first（先写失败测试再实现）。验证门禁：受影响包 `pnpm --filter @nop-chaos/flux-renderers-content typecheck/build/lint/test` + 相关 e2e 回归（`w2a-data-composition.spec.ts`、`w3c-value-mapping.spec.ts`）+ 本族新增宿主场景 Playwright（programmatic DOM 断言）。

## Execution Plan

### Phase 1 - 逐组件 18 维审计与审计卡产出

Status: completed
Targets: `packages/flux-renderers-content/src/{alert-renderer,mapping,status}.tsx`、`content-renderer-definitions.ts`、`schemas.ts`、`docs/audits/per-component/`

- Item Types: `Proof`

- [x] 审计前核对注册定义：3 组件注册项（type/fields/propContracts/eventContracts/fieldRules）与各自 schema 一致（维度 1/18）。
- [x] 产出 3 张审计卡：18 维逐项核对（结论 pass/fail/n-a + `文件:行` 证据 + 发现），P0/P1/P2/P3 裁决留痕（checklist §3）。
- [x] 维度重点核查：值所有权三态（维度 3：**mapping/status display-only 无写回路径核对——「缺 valueOwnership」不得裁为 P1（display-only 有意设计）；alert 无 value**）；08-02 字段分类（维度 6：alert title/body value-or-region + actions region、mapping item region、无 deepFields 残留）。
- [x] 事件与 action 契约（维度 7：**alert onClose payload `{level}` 与 eventContracts 一致**、actions region 内嵌 action 派发）与 a11y（维度 8：alert role 语义、status 文本）。
- [x] 异步生命周期（维度 11：本族基本无异步——核对无泄漏/无 abort 缺口）与性能边界（维度 15：mapping 大 map 表、status 渲染路径）。
- [x] 测试质量（维度 16）：既有测试断言正确行为而非 not-throw、DOM 契约断言、错误路径——假绿核查。
- [x] 文档对照（维度 17）：3 组件 design.md ↔ 实现 props/行为逐项核对。
- [x] playground 覆盖核查（维度 18）：3 组件无 component-lab lab 页——记录缺口并裁决（P2 低成本当场补页，Phase 3 落地）。

Exit Criteria:

> 本 Phase 交付 3 张审计卡（含裁决），是后续修复的唯一事实来源。

- [x] `docs/audits/per-component/{alert,mapping,status}.md` 卡存在，18 维表完整、`文件:行` 证据可验证。
- [x] 卡内发现清单带 P0/P1/P2/P3 裁决；无 P0/P1 的卡标记 `closed`，否则 `open`；08-02 机制复验结论已记录。

### Phase 2 - P0/P1 自动修复（test-first）

Status: completed
Targets: 发现涉及的 renderer/子模块文件、schema 文件、契约测试文件、e2e spec

- Item Types: `Fix | Proof | Decision`

- [x] 按审计卡处理 P0/P1：先写复现/回归测试（断言正确行为，非仅 not-throw），再实现修复；DOM/选择器契约变更追加 focused 契约测试与 e2e（test-first 证据：复现测试先于实现）。
- [x] P2 低成本（约 15 分钟内）当场修复；其余登记卡内 backlog 归 CR。
- [x] 共性缺陷裁决（Decision）：若发现 ≥2 组件/跨包/公共层根因，按 roadmap §7 主动插入 CX-n 或并入现有项并回写 daily log；组件单点根因则记录裁决、不插入 CX-n。
- [x] 修复后卡内发现标 `fixed` + commit/plan 引用；卡状态流转 `open → fixing → fixed-pending-closure`。
- [x] 复杂/跨包 bug 修复按 AGENTS.md Bug Fix Test Coverage Rule 记录到 `docs/bugs/`（参考 `docs/bugs/73-*.md` 格式）。

Exit Criteria:

> 本 Phase 交付"发现清零或已裁定"，卡状态与代码行为一致。

- [x] 全部 P0/P1 已修复（卡内标 `fixed` + 证据）或已显式裁定延期（仅允许依赖未落地跨 plan 机制者，标「机制落地后复验」并登记）；无静默跳过。
- [x] 受影响包 `pnpm --filter @nop-chaos/flux-renderers-content typecheck && build && lint && test` 绿（含新增回归测试）。

### Phase 3 - 组合宿主真实浏览器场景

Status: completed
Targets: `tests/e2e/component-lab/c6-3-host-surfaces.spec.ts`（新增）、playground demo/lab 页

- Item Types: `Proof | Fix`

- [x] 设计并实现 ≥1 个本组件真实浏览器组合宿主场景（programmatic DOM 断言，禁截图诊断）：新增 **3 个 lab 页**（`alert-lab-page.tsx`/`mapping-lab-page.tsx`/`status-lab-page.tsx`，补上维度 18 缺口——P2 低成本当场补页裁决）+ **`RENDERER_LAB_REGISTRY` 注册 3 条**（`apps/playground/src/component-lab/renderer-lab-registry.ts`，缺注册则 component-lab-page 不渲染 lab 页且 smoke 覆盖失败——C6.1/C6.2 先例均含 registry 条目）+ `data-c6c3-host.ts` 宿主 schema 模块 + CONTENT_RENDERER_ROUTES 追加 3 条（与 C6.1/C6.2 共用常量模块——协调先例：C6.1 建模块 5 条、C6.2 追加 6 条至 11 条，本 plan 追加至 14 条）+ `COMPONENT_LAB_COVERAGE_MANIFEST` 3 条（smoke.spec.ts 自动覆盖）+ route-matrix 计数测试同步（lab 路由不经 `DOMAIN_RENDERER_ROUTES`，由 smoke.spec 门禁；route-matrix liveTotal 动态求和自动一致）。
- [x] bug 73 模式专项检查：**mapping/status 在 CRUD 行 scope 内求值**（每行独立值、行 scope 污染复验——probe 逐行隔离实证）；alert closable 关闭 + 内嵌按钮 action 并存。
- [x] 宿主场景发现的新缺陷按 Phase 2 流程修复（test-first）。（宿主适配记录：crud 宿主 schema 初版漏 `testid`（仅 id）→ 宿主 schema 作者修正补 testid——非渲染器缺陷，未触发 Phase 2 流程）
- [x] 既有相关 e2e（`w2a-data-composition.spec.ts`、`w3c-value-mapping.spec.ts`）在本族改动后回归。

Exit Criteria:

> 本 Phase 交付"真实浏览器行为成立"。

- [x] 宿主场景 spec 通过（Playwright，programmatic DOM 断言）；相关既有 e2e 回归绿。
- [x] bug 73 模式专项检查结论记录于 daily log（pass 或带证据 fail→已修复）。

### Phase 4 - 组件回归与审计卡 closure

Status: completed
Targets: 审计卡、`docs/logs/2026/08-04.md`、`docs/backlog/component-audit-roadmap.md`（C6.3 行）

- Item Types: `Proof`

- [x] 全卡复查：3 卡 18 维表结论与最终代码一致；P0/P1 清零；卡状态 `closed`（含 fixed-pending-closure → closed 流转）。
- [x] 本组件范围回归：`pnpm --filter @nop-chaos/flux-renderers-content test` + 相关 e2e spec 全绿（e2e 基线 full-green 929 passed/43 skipped/0 failed，本 plan 不得引入新增失败——c6-3 4/4 + smoke 76/76 + w2a 5/5 + w3c 11/11 + c6-1 5/5 + c6-2 7/7 = 105 项零新增失败）；workspace 全量 `pnpm typecheck`/`build`/`lint`/`test` + `pnpm test:e2e` 最终以 Closure Gates 为准（指南 Minimum Rule 18：全量验证归 closure，非 Phase 默认项——此处仅作收口前置预跑：typecheck/build/lint 31/31、test 58/58 全绿）。
- [x] daily log 记录：卡 closure 汇总、修复清单（commit/plan 引用）、宿主场景结果、08-02 机制复验结论、CX-n 插入（若有）与决策、与 C6.1/C6.2 的 CONTENT_RENDERER_ROUTES 协调结论。（`docs/logs/2026/08-04.md` C6.3 节）
- [x] roadmap C6.3 行标 `done` 的前置：独立子 agent closure-audit pass（Closure Gates 项，不在本 plan 执行 session 内自审；已交付全部执行证据，由 mission-driver CLOSURE_VERIFY fresh session 执行 audit 后收口——行状态 `planned` → `done` 的切换由 audit pass 后收口动作完成，执行 session 不自行标 done）。

Exit Criteria:

> 本 Phase 交付"可进入 closure-audit 的完成态"。

- [x] 3 张审计卡全部 `closed`；`docs/audits/per-component/` 汇总可读。
- [x] daily log 已记录本 plan 收口证据（含 closure-audit 证据位置）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent fresh session（task `ses_033c6bbe1ffe7TPiMa9aa7z0nA`）
- Verdict: `pass-with-minors`（Round 2 零 Blocker/Major；Round 1 `revised` 的 M1/M2 + m1/m2/m3 已修正复核通过）
- Rounds: 2
- Findings addressed: **Major（M1 单测用例数错误）已修正**——live 实证 `alert-renderer.test.tsx` 5、`mapping.test.tsx` 12、`mapping-source.test.tsx` 5、`status.test.tsx` 10（`it(` 真实块 :46/:66/:83/:141/:164/:181/:199/:218/:235/:245，`rg -c` 计 14 含 `split(' ')` 假阳性）；**Major（M2 Phase 3 缺 RENDERER_LAB_REGISTRY 注册）已修正**——lab 页经 `component-lab-page.tsx:157-160` 的 `RENDERER_LAB_REGISTRY[activeRendererId]` 渲染，缺注册则 null + smoke 覆盖失败（`helpers.ts:28-31`），Phase 3 已补「注册 3 条」项。Minor ×3 已修正（status demo 跨度 `:84-121`→`:84-126`、mapping `:39-80`、alert e2e `:52-62`）。其余引用核对通过（注册行 :271/:328/:370、fields :317-325/:360-367/:408-414、eventContracts :307-316、markers :81/:100/:64/:84、definition 契约测试 :260-288、demo-alert :122、CONTENT_RENDERER_ROUTES 11→14、roadmap C6.3 `todo`、e2e 基线 882/43/0 + 929/43/0 于 `docs/logs/2026/08-04.md:222/:127`）。

## Closure Gates

> 关闭条件：本 section 与每个 Phase 的 Exit Criteria 全部勾选后才能将 `Plan Status` 改为 `completed`。

- [x] 3 张审计卡存在、18 维表完整、P0/P1 清零、全部 `closed`
- [x] 全部 in-scope P0/P1 已 test-first 修复并有回归测试；无被静默降级到 deferred 的 live defect/contract drift
- [x] ≥1 个真实浏览器组合宿主场景通过（含 bug 73 模式专项检查——mapping/status CRUD 行 scope 求值）
- [x] 共性缺陷已按 §7 处理（CX-n 插入/合并或当前 plan 内修复，决策记录在卡与 daily log——两 P1 均组件单点根因，不插入 CX-n）
- [x] 受影响的 owner docs 已同步到 live baseline（design.md/quick-reference/roadmap 表按发现实际影响为准——status propContracts 宽化属契约描述内调整，design.md §5「字段分类」无漂移，quick-reference 无词条变更；CONTENT_RENDERER_ROUTES 协调记录于 daily log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（mission-driver CLOSURE_VERIFY fresh session 执行——本项由 audit pass 勾选，证据见 Closure Audit Evidence）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 审计卡 P2 backlog（成本 >15 分钟的非阻断体验/文档/测试加固项）

- Classification: `optimization candidate`
- Why Not Blocking Closure: checklist §3 明确 P2 可入审计卡 backlog 由 CR 自动处理；不阻塞本组件 supported baseline 成立。
- Successor Required: `yes`
- Successor Path: CR work item（跨族集中修复）

### 依赖未落地跨 plan 机制的发现（若有，「机制落地后复验」）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 依赖的机制未落地时无法在卡内闭合；按 checklist §3 自动修复纪律（「机制落地后复验」显式登记）由 CR 集中复验，卡内不悬挂。
- Successor Required: `yes`
- Successor Path: CR work item

## Non-Blocking Follow-ups

- 审计中发现但裁定为 P3（风格 nit/注释）的项仅卡内记录，不处理。
- 工具脚本新增模式（若有）记入卡内，CG 统一升级。
- 观察（供 CLOSURE_VERIFY 核对）：`pnpm check:oversized-code-files` 为 pre-existing 红（C5.1 已记录 HEAD 基线 14 文件超 700 行），超限文件治理归 CG/CR，非本 plan scope。

## Closure

Status Note: 本 plan 已可进入 closure-audit。4 Phase 全部 `completed`；3 张审计卡（alert/mapping/status）全部 `closed`（P0 ×0；P1 ×2——alert onClose 派发缺 event/evaluationBindings payload 注入（`${level}` 不可解析，cards P1-2 同族先例 bug 83）/ status propContracts `record/string` 窄于 StatusSchema `Record<string, SchemaValue>` 致非字符串映射值编译期整键静默丢失（bug 84），全部 test-first 修复并落地；P2 ×5——lab 页 ×3 + 断言 ×2 fixed、alert aria-label i18n 归 CR backlog；P3 keep ×4 卡内记录）；真机宿主 4/4 通过（含 bug 73 模式专项 host-mapping-row——三行独立映射值 + Pick probe `Beta|idle`/`Gamma|pending` 逐行隔离实证；host-alert-close `warning|closed` 为 P1-1 修复真机实证；host-status-dialog 行 scope 求值 + amber 语义色投影）；workspace 全量 typecheck/build/lint 31/31、test 58/58（flux-renderers-content 259 含新增回归）、相关 e2e 105 项零新增失败（c6-3 4/4 + smoke 76/76 + w2a 5/5 + w3c 11/11 + c6-1 5/5 + c6-2 7/7）；CONTENT_RENDERER_ROUTES 协调结论：C6.1 建常量模块（5 条）、C6.2 追加 6 条（11 条）、本 plan 追加 3 条（14 条）——daily log 记录。文本一致性核对：Plan Status / 4 × Phase Status / 各 Phase Exit Criteria / Closure Gates 全部 `completed`/`[x]`（独立 closure-audit 项已由 CLOSURE_VERIFY fresh session 执行并勾选，证据见下）；roadmap C6.3 行 `planned` → `done` 由 closure-audit pass 后收口动作完成。

Closure Audit Evidence:

- Auditor / Agent: mission-driver CLOSURE_VERIFY 独立 fresh session（本 closure-audit pass）
- Evidence: live repo 核验通过——(1) 3 张审计卡 closed 且 18 维表带 `文件:行` 证据（`docs/audits/per-component/{alert,mapping,status}.md`）；(2) P1-1 alert evaluationBindings 注入实证 `alert-renderer.tsx:71-74`（event + evaluationBindings: payload）；P1-2 status 三契约 record/unknown 实证 `content-renderer-definitions.ts:383-400`；(3) 回归测试断言正确行为：`alert-payload-action.test.tsx` CD6（`${level}` capture 'warning'）、`status.test.tsx` 「keeps non-string labelMap/levelMap/iconMap values through the compile pipeline」/「falls back to the raw key…」/「renders no icon…」；(4) 宿主接线实证：lab 页 3（`renderer-lab-registry.ts:175-177`）、`content-renderer-routes.ts` 14 条（alert :104/mapping :112/status :120）、`coverage-manifest.ts` 3 条、`data-c6c3-host.ts`；(5) `tests/e2e/component-lab/c6-3-host-surfaces.spec.ts` 4 场景 programmatic DOM 断言（bug 73 行 scope 隔离、dialog scope、onClose `${level}` 真机解析）；(6) bug 记录 `docs/bugs/84-status-map-contract-narrowing-silent-drop-fix.md`；(7) daily log `docs/logs/2026/08-04.md` C6.3 节记录卡 closure/修复清单/宿主结果/08-02 复验/ROUTES 协调；(8) 五处一致性：Plan Status completed ↔ 4 × Phase completed ↔ Exit Criteria 全 `[x]` ↔ Closure Gates 全 `[x]` ↔ daily log 收口记录；deferred 分类诚实（P2 backlog = optimization candidate 归 CR、watch-only residual 无 in-scope 缺陷隐藏）；plan-check.mjs --strict 通过（38 checked / 0 unchecked）。roadmap C6.3 行 `planned` → `done` 由 audit pass 后收口动作完成。

Follow-up:

- 无 plan-owned 剩余工作（alert P2-2 aria-label i18n backlog 已 adjudicated 归 CR，见 Deferred But Adjudicated）。
