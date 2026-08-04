# C6.1 content 文本类逐组件审计（markdown/html/json-view/link/image）

> Plan Status: active
> Mission: component-audit
> Work Item: C6.1
> Last Reviewed: 2026-08-04
> Source: `docs/backlog/component-audit-roadmap.md`（C6.x Phase Details）、`docs/audits/component-audit-checklist.md`（18 维 + 审计卡模板 + 自动修复纪律）、`docs/skills/deep-audit-prompts.md`、`docs/architecture/renderer-markers-and-selectors.md`、`docs/logs/2026/08-04.md`（C5.1 节）
> Related: 依赖 C0（`2026-08-02-2043-1`，completed）完成后开工；与 C5.2（`2026-08-04-0841-1`）/ C6.2（`2026-08-04-0841-3`）并行独立（均只依赖 C0）。前置基础：08-02 nested-schema 机制（completed）已分类 content 文本组件字段（content-renderer-definitions.ts 的 fields kind 分类——value-or-region/region/event，无 fieldRules 声明于该文件）；sanitize 门禁实现（`packages/flux-renderers-content/src/sanitize.ts`，既有 `sanitize.test.ts`）

## Purpose

对 `flux-renderers-content` 文本类 5 个组件（markdown/html/json-view/link/image）完成 18 维逐组件审计（每组件一张审计卡，P0/P1/P2/P3 裁决留痕），P0/P1 缺陷在**同一 plan 内自动修复**（test-first + 回归测试 + 受影响包验证门禁），完成 ≥1 个真实浏览器组合宿主场景验证（含 bug 73 模式专项检查），最终 5 张审计卡全部 `closed`（P0/P1 清零）。重点维度：**18 安全红线（html/markdown sanitize 门禁——XSS 防护契约）**、5 DOM 契约（根 marker 类、data-slot 契约）、7 事件与 action 契约（link onClick 派发 + 导航字段绑定）、11 异步生命周期（image 加载/失败/竞态）、12 组合宿主场景（链接跳转 + 图片加载组合、bug 73 模式专项）、17 文档对照（design.md ↔ 实现 props/行为）。

## Current Baseline

- **组件与文件**：`markdown.tsx`（112 行）、`html.tsx`（49 行）、`json-view.tsx`（98 行）、`link.tsx`（66 行）、`image.tsx`（238 行）+ `sanitize.ts`（共享 sanitize 门禁）+ `content-renderer-definitions.ts`。
- **注册定义**：`content-renderer-definitions.ts`（link `:119`、image `:134`、json-view `:155`、markdown `:169`、html `:183`）；字段分类含 region/value-or-region/prop（08-02 机制，如 card title value-or-region 先例——本族 link label/value-or-region 等需核对）。
- **设计文档**：`docs/components/{markdown,html,json-view,link,image}/design.md` + `example.json` 均存在。
- **playground**：5 组件**无 component-lab lab 页**（维度 18 缺口待核对）；demo 宿主在 `apps/playground/src/pages/w1a-content-display-demo.tsx`（markdown `:55` demo-markdown、html `:60/:67` demo-html/demo-html-empty、link `:73` demo-link、image `:84/:94` demo-image/demo-image-error、json-view `:100/:106` demo-json-view/demo-json-view-empty、link-click-flag `:112`、`w1a-renderer-host` `:145`）。
- **既有单测**：`markdown.test.tsx`（7 用例）+ `markdown-reactivity.test.tsx` + `markdown-src.test.tsx`、`html.test.tsx`（5 用例）、`json-view.test.tsx`（7 用例）、`link.test.tsx`（6 用例）、`image.test.tsx`（7 用例）+ `image-fetcher.test.tsx` + `sanitize.test.ts`（共享门禁）。
- **e2e**：`tests/e2e/w1a-content-family.spec.ts`（7 测试：markdown 渲染/GFM 表格、html sanitize 门禁 XSS 程序化检查、html 空态、image 懒加载 + src、image 失败回退、link onClick(setValue) + 导航字段绑定、json-view 对象树 + null 空态）；本族无 `tests/e2e/component-lab/c6-1-host-surfaces.spec.ts`（需新增）。
- **基线**：C0 基线 unit 全绿（typecheck/build/lint 31/31、test 58/58）；**e2e 已于 C5.1 verify 轮达成 full-green（882 passed / 43 skipped / 0 failed，`docs/logs/2026/08-04.md` C5.1 verify 节）**——pre-existing 失败项已全部清零（原 C0 基线中 content 包归属项 diff-perf `<200ms` 阈值已由 C5.1 verify 校准修复），本 plan 不再继承 e2e pre-existing 债务。
- **已知安全契约**：`sanitize.ts` 为 html/markdown 共享 XSS 门禁（既有 `sanitize.test.ts` 断言 `<script>` 剥除），C6.x Phase Details 明确「sanitize 门禁（html/markdown）」为审查重点——维度 18 全路径核对（默认渲染路径 + src 动态更新路径）。

## Goals

- 5 张审计卡（`docs/audits/per-component/{markdown,html,json-view,link,image}.md`）18 维逐项核对，P0/P1/P2/P3 裁决留痕，`文件:行` 证据，全部 `closed`（P0/P1 清零）。
- 本族 P0/P1 缺陷 test-first 自动修复（契约/公共层修复 Must automate，**sanitize 门禁契约修复必须 test-first**），P2 低成本当场修复、其余登记卡内 backlog 归 CR。
- ≥1 个真实浏览器组合宿主场景（含 bug 73 模式专项）：候选——动态 markdown/html 内容更新后的 sanitize 复验（XSS 二次注入路径）、image 加载失败回退 + 重试、link onClick 派发组合宿主。
- roadmap C6.1 行标 `done`（独立子 agent closure-audit pass 后）。

## Non-Goals

- C6.2 content 状态反馈类（card/cards/empty/progress/spinner/separator，`2026-08-04-0841-3` 覆盖）、C6.3 值映射类（alert/mapping/status）、C6.4 媒体类（audio/video/carousel/qrcode）、C6.5 diff-view。
- checklist v2 修订（CG）、审计工具脚本升级（CG）。
- 结构性重构（公共 API/包边界/编译期机制，需人工确认后另立 CX-n；纯行为修复不视为结构性）。
- 各审计卡 P2 backlog（>15 分钟项）归 CR 处理，不在本 plan 内实现。

## Scope

### In Scope

- 5 组件 × 18 维审计卡（维度重点：1 Schema 契约（MarkdownSchema/HtmlSchema/JsonViewSchema/LinkSchema/ImageSchema 与注册 fields/validate 一致）、2 RendererComponentProps 合规、3 值所有权三态（本族为展示组件——核对无意外值写入面）、4 表单参与（本族非表单字段——核对无表单参与声明泄漏）、5 DOM 与选择器契约（根 marker 类 `nop-markdown`/`nop-html`/`nop-json-view`/`nop-link`/`nop-image` 与 data-slot 契约）、6 嵌套 schema 分类（**本族字段 08-02 机制核对：link label/value-or-region、image 无嵌套 region、markdown/html 内容字段分类**、无 deepFields 残留）、7 事件与 action 契约（**link onClick 派发 payload 形状 + 导航字段绑定（href/onClick 并存语义）**）、8 a11y（image alt 契约、link 可访问名、json-view 树形语义）、9 i18n（空态/错误文案 key）、10 四态覆盖（**空/加载/错误/禁用——markdown/html 空态、image 加载失败回退态**）、11 异步生命周期（**image 加载 abort/竞态/失败重试、src 动态更新路径**）、12 组合宿主场景（动态内容更新 + 链接 + 图片组合、**bug 73 模式专项——动态更新后 sanitize 复验**）、13 样式契约（widget renderer 自样式 + marker 类）、14 React 19、15 性能边界（markdown 大文档渲染、json-view 大对象折叠）、16 测试质量（既有测试断言正确行为而非 not-throw、sanitize 测试覆盖全路径）、17 文档对照（design.md ↔ 实现 props/行为）、**18 注册/包边界/IO 安全红线（surface 双注册、sanitize 门禁全路径 XSS 核对、URL 协议校验、5 组件无 component-lab lab 页——覆盖缺口核查）**）。
- P0/P1 自动修复（test-first）+ P2 低成本即时修复。
- 真实浏览器宿主场景（动态内容 sanitize 复验、image 生命周期、link 组合）。
- 审计卡状态流转（open → fixing → fixed-pending-closure → closed）与 daily log 记录。

### Out Of Scope

- C6.2/C6.3/C6.4/C6.5 content 其余族（并行/后续 plan 覆盖）。
- checklist v2 修订（CG）。
- 结构性重构（需人工确认后另立 CX-n）。

## Failure Paths

| 可测场景编号       | 触发                                     | 行为（含错误码）                                       | 可重试 | 用户可见表现        |
| ------------------ | ---------------------------------------- | ------------------------------------------------------ | ------ | ------------------- |
| host-md-sanitize   | 动态更新 markdown 内容含 `<script>`/HTML | sanitize 门禁生效（更新路径同样剥除，XSS 不执行）      | 是     | 脚本不执行          |
| host-html-sanitize | 动态更新 html 内容含 `<script>`          | sanitize 门禁生效（默认 + 动态更新路径全覆盖）         | 是     | 脚本不执行          |
| host-img-lifecycle | image src 失败 → 回退 → 重试             | 失败回退态展示、重试恢复、无竞态残留                   | 是     | 图片正常/回退态正确 |
| host-link-click    | link onClick + href 并存点击             | onClick action 派发 payload 正确、导航字段绑定语义正确 | 是     | 事件/导航行为正确   |
| host-json-empty    | json-view null/空值渲染                  | 空态展示、无抛错                                       | 是     | 空态正确            |

## Test Strategy

本档选择：**必须自动化** —— sanitize 门禁（html/markdown XSS）是安全红线契约（维度 18），动态更新路径的二次注入是核心回归路径；link onClick 事件 payload 形状核对是事件契约重点。契约/公共层修复必须 test-first（先写失败测试再实现，sanitize 修复尤其如此）。验证门禁：受影响包 `pnpm --filter @nop-chaos/flux-renderers-content typecheck/build/lint/test` + 相关 e2e 回归（`w1a-content-family.spec.ts`）+ 本族新增宿主场景 Playwright（programmatic DOM 断言）。

## Execution Plan

### Phase 1 - 逐组件 18 维审计与审计卡产出

Status: planned
Targets: `packages/flux-renderers-content/src/{markdown,html,json-view,link,image}.tsx`、`content-renderer-definitions.ts`、`schemas.ts`、`sanitize.ts`、`docs/audits/per-component/`

- Item Types: `Proof`

- [ ] 审计前核对注册定义：5 组件注册项（type/fields/propContracts/fieldRules）与各自 schema 一致（维度 1/18）。
- [ ] 产出 5 张审计卡：18 维逐项核对（结论 pass/fail/n-a + `文件:行` 证据 + 发现），P0/P1/P2/P3 裁决留痕（checklist §3）。
- [ ] 维度重点核查：**sanitize 门禁全路径（维度 18：markdown.tsx/html.tsx 默认渲染路径 + src/内容动态更新路径——既有 `sanitize.test.ts` 只覆盖默认路径则记录缺口**、URL 协议校验（link href/javascript: 协议）；值所有权（维度 3：本族展示组件无值写入面核对）；08-02 字段分类（维度 6：link label value-or-region、markdown/html 内容字段、image src 分类）。
- [ ] 事件与 action 契约（维度 7：**link onClick 派发 payload 形状 + href 导航字段绑定并存语义**）与 a11y（维度 8：image alt 契约、link 可访问名、json-view 树形语义）。
- [ ] 异步生命周期（维度 11：**image 加载 abort/竞态/失败重试、src 动态更新**——`image.tsx` 内 AbortController/fetch 逻辑核对）与性能边界（维度 15：markdown 大文档、json-view 大对象）。
- [ ] 测试质量（维度 16）：既有测试断言正确行为而非 not-throw、sanitize 测试路径覆盖、错误路径——假绿核查（含 markdown-reactivity/markdown-src/image-fetcher 覆盖项）。
- [ ] 文档对照（维度 17）：5 组件 design.md ↔ 实现 props/行为逐项核对。
- [ ] playground 覆盖核查（维度 18）：5 组件无 component-lab lab 页——记录缺口并裁决（P2 低成本当场补页，Phase 3 落地）。

Exit Criteria:

> 本 Phase 交付 5 张审计卡（含裁决），是后续修复的唯一事实来源。

- [ ] `docs/audits/per-component/{markdown,html,json-view,link,image}.md` 卡存在，18 维表完整、`文件:行` 证据可验证。
- [ ] 卡内发现清单带 P0/P1/P2/P3 裁决；无 P0/P1 的卡标记 `closed`，否则 `open`；sanitize 全路径核对结论已记录。

### Phase 2 - P0/P1 自动修复（test-first）

Status: planned
Targets: 发现涉及的 renderer/子模块文件、schema 文件、契约测试文件、e2e spec

- Item Types: `Fix | Proof | Decision`

- [ ] 按审计卡处理 P0/P1：先写复现/回归测试（断言正确行为，非仅 not-throw），再实现修复；DOM/选择器契约变更追加 focused 契约测试与 e2e（test-first 证据：复现测试先于实现；**sanitize 门禁相关修复必须先写失败测试再实现**）。
- [ ] P2 低成本（约 15 分钟内）当场修复；其余登记卡内 backlog 归 CR。
- [ ] 共性缺陷裁决（Decision）：若发现 ≥2 组件/跨包/公共层根因（如 sanitize.ts 共享门禁缺口影响 html+markdown 两组件），按 roadmap §7 主动插入 CX-n 或并入现有项并回写 daily log；组件单点根因则记录裁决、不插入 CX-n。
- [ ] 修复后卡内发现标 `fixed` + commit/plan 引用；卡状态流转 `open → fixing → fixed-pending-closure`。
- [ ] 复杂/跨包 bug 修复按 AGENTS.md Bug Fix Test Coverage Rule 记录到 `docs/bugs/`（参考 `docs/bugs/73-*.md` 格式；**XSS/sanitize 类修复必记录**）。

Exit Criteria:

> 本 Phase 交付"发现清零或已裁定"，卡状态与代码行为一致。

- [ ] 全部 P0/P1 已修复（卡内标 `fixed` + 证据）或已显式裁定延期（仅允许依赖未落地跨 plan 机制者，标「机制落地后复验」并登记）；无静默跳过。
- [ ] 受影响包 `pnpm --filter @nop-chaos/flux-renderers-content typecheck && build && lint && test` 绿（含新增回归测试）。

### Phase 3 - 组合宿主真实浏览器场景

Status: planned
Targets: `tests/e2e/component-lab/c6-1-host-surfaces.spec.ts`（新增）、playground demo/lab 页

- Item Types: `Proof | Fix`

- [ ] 设计并实现 ≥1 个本组件真实浏览器组合宿主场景（programmatic DOM 断言，禁截图诊断）：新增 **5 个 lab 页**（`markdown-lab-page.tsx`/`html-lab-page.tsx`/`json-view-lab-page.tsx`/`link-lab-page.tsx`/`image-lab-page.tsx`，补上维度 18 缺口——P2 低成本当场补页裁决）+ `data-c6c1-host.ts` 宿主 schema 模块 + CONTENT_RENDERER_ROUTES（5 条，先例参照 C5.1 LAYOUT_RENDERER_ROUTES 模式）+ `COMPONENT_LAB_COVERAGE_MANIFEST` 5 条（smoke.spec.ts 自动覆盖）+ route-matrix 计数测试同步（lab 路由不经 `DOMAIN_RENDERER_ROUTES`，由 smoke.spec 门禁——C5.1 核对先例）。**与 C6.2（`2026-08-04-0841-3`）共享 CONTENT_RENDERER_ROUTES 常量与 coverage-manifest.ts——协调约定：以先落地的 plan 建常量、后落地者追加条目，daily log 记录协调结论（C6.2 已写同款约定）。**
- [ ] bug 73 模式专项检查：**动态内容更新后的 sanitize 复验**（markdown/html 内容经 scope 更新含 `<script>`——更新路径同样剥除，XSS 不执行）；image 动态 src 更新加载链路。
- [ ] 宿主场景发现的新缺陷按 Phase 2 流程修复（test-first）。
- [ ] 既有相关 e2e（`w1a-content-family.spec.ts`、`w1b-feedback-family.spec.ts`、`w3c-value-mapping.spec.ts`）在本族改动后回归。

Exit Criteria:

> 本 Phase 交付"真实浏览器行为成立"。

- [ ] 宿主场景 spec 通过（Playwright，programmatic DOM 断言）；相关既有 e2e 回归绿。
- [ ] bug 73 模式专项检查结论记录于 daily log（pass 或带证据 fail→已修复）。

### Phase 4 - 组件回归与审计卡 closure

Status: planned
Targets: 审计卡、`docs/logs/2026/08-04.md`、`docs/backlog/component-audit-roadmap.md`（C6.1 行）

- Item Types: `Proof`

- [ ] 全卡复查：5 卡 18 维表结论与最终代码一致；P0/P1 清零；卡状态 `closed`（含 fixed-pending-closure → closed 流转）。
- [ ] 本组件范围回归：`pnpm --filter @nop-chaos/flux-renderers-content test` + 相关 e2e spec 全绿（e2e 基线 full-green 882 passed/43 skipped/0 failed，本 plan 不得引入新增失败）；workspace 全量 `pnpm typecheck`/`build`/`lint`/`test` + `pnpm test:e2e` 最终以 Closure Gates 为准（指南 Minimum Rule 18：全量验证归 closure，非 Phase 默认项——此处仅作收口前置预跑）。
- [ ] daily log 记录：卡 closure 汇总、修复清单（commit/plan 引用）、宿主场景结果、sanitize 全路径复验结论、CX-n 插入（若有）与决策。
- [ ] roadmap C6.1 行标 `done` 的前置：独立子 agent closure-audit pass（Closure Gates 项，不在本 plan 执行 session 内自审；交付全部执行证据，由 mission-driver CLOSURE_VERIFY fresh session 执行 audit 后收口）。

Exit Criteria:

> 本 Phase 交付"可进入 closure-audit 的完成态"。

- [ ] 5 张审计卡全部 `closed`；`docs/audits/per-component/` 汇总可读。
- [ ] daily log 已记录本 plan 收口证据（含 closure-audit 证据位置）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent fresh session（task `ses_035c4661effeIIcjRzU9pN33ii`）
- Verdict: `pass`（零 Blocker/Major）
- Rounds: 2
- Findings addressed: 全部文件/行引用经 live repo 核对通过（5 组件行数 markdown 112/html 49/json-view 98/link 66/image 238、content-renderer-definitions.ts link `:119`/image `:134`/json-view `:155`/markdown `:169`/html `:183`、schemas 5 个接口、demo 宿主 w1a `:55/:60/:67/:73/:84/:94/:100/:106/:112/:145`、e2e w1a-content-family 7 测试、测试计数 markdown 7/html 5/json-view 7/link 6/image 7 + sanitize.test.ts 断言 `<script>` 剥除 + `javascript:` URI 清理、无 lab 页/无审计卡/design docs ×5、sanitize.ts 存在）；Minor ×4 已修正（Related fieldRules 表述改为 fields kind 分类——content-renderer-definitions.ts 无 fieldRules、image-fetcher.tsx 幽灵引用改指 image.tsx（该文件不存在，AbortController 逻辑在 image.tsx）、Phase 3 补 C6.2 CONTENT_RENDERER_ROUTES/coverage-manifest 共享常量协调约定、Phase 4 全量验证改归 Closure Gates 预跑——Minimum Rule 18）；无 Major 发现。

## Closure Gates

> 关闭条件：本 section 与每个 Phase 的 Exit Criteria 全部勾选后才能将 `Plan Status` 改为 `completed`。

- [ ] 5 张审计卡存在、18 维表完整、P0/P1 清零、全部 `closed`
- [ ] 全部 in-scope P0/P1 已 test-first 修复并有回归测试；无被静默降级到 deferred 的 live defect/contract drift
- [ ] ≥1 个真实浏览器组合宿主场景通过（含 bug 73 模式专项检查——动态内容 sanitize 复验）
- [ ] 共性缺陷已按 §7 处理（CX-n 插入/合并或当前 plan 内修复，决策记录在卡与 daily log）
- [ ] 受影响的 owner docs 已同步到 live baseline（design.md/quick-reference/roadmap 表按发现实际影响为准）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（mission-driver CLOSURE_VERIFY fresh session 执行）
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

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

Status Note: 待执行（active 状态，已通过独立子 agent draft review，可进入执行队列）。

Closure Audit Evidence:

- Auditor / Agent: 待执行
- Evidence: 待执行

Follow-up:

- 待执行
