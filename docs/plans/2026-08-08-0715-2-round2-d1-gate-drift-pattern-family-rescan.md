# D1 门禁漂移回扫与四模式族回扫（10 个 flux-renderers-\* 包）

> Plan Status: completed
> Mission: component-audit-round2
> Work Item: D1
> Last Reviewed: 2026-08-08
> Source: `docs/backlog/component-audit-round2-roadmap.md`（D1 行 + Phase Details）、`docs/audits/component-audit-checklist.md` v2、`docs/backlog/component-audit-roadmap.md`「自动修复机制」§1–§7（沿用，CX-13 起编号）
> Related: 依赖 `docs/plans/2026-08-08-0715-1-round2-d0-orchestration-baseline.md`（D0 门禁基线为零新增判定基准）；`docs/plans/2026-08-08-0715-3-round2-d2-p3-adjudication-residual.md`（P3 入 D2 裁决表）；`docs/plans/2026-08-06-2306-1-event-dispatch-ctx-full-scan.md`（第一轮事件 ctx 全扫先例）

## Purpose

把第二轮"门禁漂移回扫 + 模式族回扫"收口：① 全量门禁重跑（root 28 项 `check:*` 含 14 项 `check:audit-*`，清单以 live `package.json` 为准）零新增命中复验（与 D0 基线比对）+ `pnpm test:scripts` 门禁回归套件复跑，扫描器自身无回归（browser-io 6d2497ea 漏扫教训专项）；② 对 CV（2026-08-06）之后新增/修改的 renderer 代码做四模式族回扫——事件派发 ctx、`kind:'reaction'` 三件套接线、createScope/disposeScope 配对、i18n 硬编码——全部发现带 `文件:行` 证据 + P0/P1/P2/P3 裁决；P0/P1 当 plan 内自动修复（test-first + 回归测试），P2 入 DR 集中修复，P3 入 D2 裁决表。范围 = 10 个 flux-renderers-\* 包；4 个 host renderer 包归 D3.x 逐面审计。

## Current Baseline

（全部为 live repo 核对事实，2026-08-08）

- **门禁现状**：root `package.json` 实测 **28 项 `check:*`**（含 **14 项 `check:audit-*`**）；`pnpm check` 聚合 exit 0——oversized 仅 2 条既有 locale 豁免、workspace-manifest-deps（含反向规则）零命中、audit 三门禁（`check:audit-event-dispatch-ctx` / `check:audit-renderer-browser-io` / `check:audit-runtime-raw-schema-reads`）零命中 + 7 条原生 DOM 转发 allowlist；`scripts/__tests__/` 门禁回归套件（6 个 `*.test.ts` + `fixtures/` 目录，`pnpm test:scripts`）。
- **D0 门禁基线**（前置）：D0 重跑记录的 28 项逐项输出 = 本 plan 零新增判定基准；本 plan 开工前确认 D0 Phase 3 已完成（依赖项）。
- **模式族历史基线**：事件派发 ctx——`check:audit-event-dispatch-ctx` 零命中 + 7 条 allowlist（2026-08-06 `plan-2026-08-06-2306-1` 全量扫描收口，23 点修复 + 4 点同根因并入）；`kind:'reaction'` 接线——CX-9/CX-12 收口（bug 79/85 + scheduling ~25 处），live 现有 `kind: 'reaction'` 消费点分布于 flux-compiler/flux-runtime/flux-react/flux-core/renderers-definitions（`rg` 实测约 24 处，11 文件；代码 14 处 + 注释 10 处，含 scheduling 8 处，以 `rg` 实测为准）；scope 生命周期——`plan-2026-08-06-2306-2` createScope/disposeScope 配对收口 + `check:audit-test-global-leaks`（47 条基线，0150-3 后）；i18n——eslint 第 1 盲区已修 + `rg` 兜底做法（checklist v2 §2 维度 9）。
- **扫描目标**：CV（2026-08-06）之后新增/修改的 renderer 代码（`git log --since 2026-08-06` 83 commits，含 0150-1/2/3 与 2228-1/2/3 批次）+ 第一轮 allowlist/豁免点复验；范围 = 10 个 flux-renderers-\* 包（ai/basic/content/data/form/form-advanced/graph/layout/mobile/scheduling，live 核对存在）。
- **已知教训**：扫描器自身会回归（browser-io 正则 6d2497ea 漏扫 10 包，已修）；门禁规则变更必须带 committed 回归测试（`scripts/__tests__/`）；新命中不得以"临时改门禁规则"消化。
- **授权边界**：mission description 已授权全部保护区域代码变更（flux-core/src/、Schema/contract validation、ui/src/index.ts、Renderer 定义、样式契约）；结构性重构（公共 API、包边界、编译期机制）执行前仍需人工确认；自动修复与审计之间无人工握手（第一轮 roadmap 自动修复机制 §1）。

## Goals

- 28 项 `check:*` + `pnpm test:scripts` 零新增命中（与 D0 基线比对）；扫描器自身回归专项核查通过（扫描范围正则 + 回归套件）。
- 四模式族回扫完成，发现全部带 `文件:行` 证据 + 裁决（P0/P1/P2/P3）；CV 后新增代码与 allowlist/豁免点复验覆盖。
- P0/P1 当 plan 内自动修复（test-first：先写复现/回归测试再实现；契约/公共层修复 "Must automate"），修复后受影响包 typecheck/build/lint/test 绿。
- P2 显式登记入 DR（`docs/audits/round2-dr-adjudication.md` 或等价路由记录）；P3 显式登记入 D2 裁决表（`docs/audits/round2-p3-adjudication.md`）。
- 共性缺陷模式（同一根因影响 ≥2 组件/跨包/公共层）按自动修复机制 §7 插入 `CX-13+` work item（或 plan 内多阶段优先修复 + 回写记录）。
- 回扫发现登记入审计卡（`docs/audits/per-component/<type>.md` 追加节）。

## Non-Goals

- 不审计 4 个 host renderer 包（flow-designer-renderers / spreadsheet-renderers / report-designer-renderers / word-editor-renderers——归 D3.x 逐面审计）。
- 不做 P3 实质裁决修复的批量收口（P3 仅登记，裁决与低成本修复归 D2）。
- 不做 P2 的集中修复（P2 入 DR）。
- 不改动 18 维 checklist 语义、不做结构性重构（需人工确认）。

## Scope

### In Scope

- ① 门禁全量重跑：28 项 `check:*` 逐一确认零新增命中（与 D0 基线比对；新增命中 = 门禁本身回归或 CV 后代码漂移，先修门禁还是先修代码按门禁语义裁决）+ `pnpm test:scripts`（7 文件）复跑；扫描器自身回归专项（browser-io 6d2497ea 教训：核查扫描范围正则与夹具覆盖）。
- ② 四模式族回扫（扫描目标 = CV 后新增/修改的 renderer 代码 + 第一轮 allowlist/豁免点复验；范围 = 10 个 flux-renderers-\* 包）：
  - 事件派发 ctx：全 renderer 包新派发点是否携带 `{ event, evaluationBindings, scope }`（`check:audit-event-dispatch-ctx` 覆盖 + 人工抽查 template `${key}` 解析）；
  - `kind:'reaction'` 三件套：`rg "kind: 'reaction'" packages/flux-renderers-*/src` 全量登记 vs 各渲染器 reactions 消费/句柄注册矩阵（CX-9/CX-12 后新接线点）——非 renderer 包（flux-core/runtime/react/compiler）命中为基线声明面，不在本 plan 回扫范围，命中归 D2/DR 裁决；
  - scope 生命周期：渲染期 + 事件路径 createScope/disposeScope 配对（`rg "createScope"` 新点 + `check:audit-test-global-leaks`）；
  - i18n 硬编码：`rg "[\u4e00-\u9fa5]" packages/flux-renderers-*/src -g '*.{ts,tsx}' --glob '!**/__tests__/**'` + 硬编码英文抽样（范围限定 10 个 renderer 包；非 renderer 包命中不在本 plan 范围）。
- P0/P1 自动修复（test-first）+ 回归测试 + 验证门禁（受影响包）。
- 发现登记：审计卡追加节 + P2/P3 路由 + CX-n 共性插入（如触发）。

### Out Of Scope

- 4 个 host renderer 包的审计与修复（D3.x）。
- P3 逐条裁决（D2）、bug note 回补（DB，历史缺口）、lessons 沉淀（DL）。
- 结构性重构（公共 API、包边界、编译期机制）。

## Failure Paths

不适用（本 plan 无外部集成/鉴权/错误处理 API 契约；主要风险为门禁重跑或回扫暴露新命中，已在 Phase 1/2 以裁决路径覆盖：新增命中按门禁语义裁决先修门禁还是先修代码，P0/P1 当轮修复，P2 入 DR，P3 入 D2）。

## Test Strategy

本档选择：**必须自动化** —— P0/P1 自动修复遵循 test-first 纪律（先写复现/回归测试，断言正确行为，非仅 not-throw）；契约/公共层修复必须 "Must automate"（先写失败测试再实现）；门禁规则变更必须带 committed 回归测试（`scripts/__tests__/`）；每次修复后跑受影响包 `pnpm --filter <pkg> typecheck/build/lint/test`。Proof 项（复现测试）先于 Fix 项。

## Execution Plan

### Phase 1 - 门禁全量重跑与零新增复验

Status: completed
Targets: root `package.json` 28 项 `check:*` 脚本、`scripts/__tests__/`（7 文件）、`docs/logs/2026/08-08.md`

- Item Types: `Proof | Fix | Decision`

- [x] 确认 D0 基线已就绪（D0 Phase 3 交付：28 项逐项输出 + `pnpm test:scripts` 通过数）。
- [x] 逐项重跑 28 项 `check:*`（含 14 项 `check:audit-*`），与 D0 基线逐项比对，记录零新增判定。
- [x] `pnpm test:scripts` 门禁回归套件复跑（7 文件），确认扫描器自身无回归。
- [x] 扫描器回归专项（Decision）：对 browser-io（6d2497ea 漏扫教训）核查扫描范围正则与 committed 夹具覆盖；任一扫描器有回归 → 修复门禁 + 补回归测试（test-first），先于业务代码裁决。
- [x] 新增命中裁决（Decision）：新增命中 = 门禁回归（修门禁）或 CV 后代码漂移（P0/P1 入 Phase 2 修复队列 / P2 入 DR / P3 入 D2）；任何"临时改门禁规则消化"的路径被禁止，规则变更必须带 committed 回归测试。

Exit Criteria:

- [x] 28 项 `check:*` 逐项零新增命中（与 D0 基线一致或更优）或新增命中全部裁决完毕（归属明确：门禁修复已 test-first 落地 / 代码漂移已入对应修复队列）。
- [x] `pnpm test:scripts` 全绿（无扫描器回归）；browser-io 扫描范围专项核查记录（正则 + 夹具覆盖复核）。

### Phase 2 - 四模式族回扫 + P0/P1 自动修复

Status: completed
Targets: `packages/flux-renderers-{ai,basic,content,data,form,form-advanced,graph,layout,mobile,scheduling}/src`、`docs/audits/per-component/<type>.md`、`docs/backlog/component-audit-round2-roadmap.md`（CX-n 插入）

- Item Types: `Fix | Proof | Decision | Follow-up`

- [x] 事件派发 ctx 回扫：`check:audit-event-dispatch-ctx` 全量输出 + 人工抽查（CV 后新增派发点携带 `{ event, evaluationBindings, scope }`、template `${key}` 解析可验证、allowlist/豁免点复验）；P0/P1 修复（test-first）。
- [x] `kind:'reaction'` 三件套回扫：`rg "kind: 'reaction'" packages/flux-renderers-*/src` 全量登记 vs 各渲染器 reactions 消费/句柄注册矩阵（reactionsRef 捕获 + `ready()` 激活 + ComponentHandle 注册，三缺一即未接线；非 renderer 包命中为基线声明面不在回扫范围）；P0/P1 修复（test-first）。
- [x] scope 生命周期回扫：`rg "createScope"` 渲染期 + 事件路径新点配对（createScope/disposeScope 成对，`check:audit-test-global-leaks` 佐证）；P0/P1 修复（test-first）。
- [x] i18n 硬编码回扫：`rg "[\u4e00-\u9fa5]" packages/flux-renderers-*/src -g '*.{ts,tsx}' --glob '!**/__tests__/**'` 中文字面量 + 硬编码英文抽样（范围限定 10 个 renderer 包，checklist v2 维度 9 的 rg 兜底做法）；P0/P1 修复（test-first）。
- [x] 共性缺陷模式判定（Decision）：同一根因影响 ≥2 组件/跨包/公共层 → 按自动修复机制 §7 插入 `CX-13+` work item（roadmap 表 + 依赖图 + Cross-Cutting 同步）或在 plan 内多阶段优先修复后回写 CX-n 记录；不默认推给 DR。
- [x] 裁决与登记：每条发现 `文件:行` + P0/P1（fixed，附 plan 引用）/ P2（登记入 DR 路由清单）/ P3（登记入 D2 裁决表）；审计卡追加节回写（状态流转 `open → fixing → fixed-pending-closure`）。

Exit Criteria:

- [x] 四模式族回扫全部完成：事件 ctx / reaction 三件套 / scope 配对 / i18n 各一份发现清单（`文件:行` + 裁决），CV 后新增代码与 allowlist/豁免点复验覆盖。
- [x] 所有 in-scope P0/P1 已修复（test-first 证据：复现/回归测试先行）+ 受影响包 `pnpm --filter <pkg> typecheck/build/lint/test` 绿；共性缺陷已按 §7 插入 CX-n（或无共性缺陷的显式声明）。
- [x] P2 路由清单与 P3 裁决表登记完成（无悬挂：每条发现均有归属）；审计卡追加节已回写。

### Phase 3 - 收口验证与记录

Status: completed
Targets: 全仓库验证命令、`docs/logs/2026/08-08.md`、`docs/backlog/component-audit-round2-roadmap.md`

- Item Types: `Proof | Follow-up`

- [x] 受影响的 `check:audit-*` 门禁复跑确认零新增命中（含本 plan 修复面）。
- [x] `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` 全量（closure 前的仓库级验证，见 Closure Gates）。
- [x] daily log 记录：回扫发现汇总（计数 + 裁决分布）、CX-n 插入（如触发）、P2/P3 路由清单位置、门禁状态终值。
- [x] roadmap D1 行状态流转申请（closure audit 通过后 `planned → done`；本 plan 不自行翻转）。

Exit Criteria:

- [x] daily log 含本 plan 收口证据（发现汇总 + 裁决 + 门禁终值）；roadmap D1 行已标注执行证据引用。
- [x] 无 plan-owned 剩余工作（P2 已路由 DR、P3 已路由 D2、CX-n 已插入或显式声明无）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，task `ses_02177b001ffeUPUG70vRDa1Q0k`）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major；6 条 Minor（reaction 计数口径、checklist v2 版本号、`check:audit-runtime-raw-schema-reads` 全名、门禁回归套件 6 测试文件 + fixtures、rg 扫描范围收窄至 flux-renderers-\*/src、Phase 3 与 Closure Gates 重复说明）全部修正。

## Closure Gates

- [x] 28 项 `check:*` 零新增命中（与 D0 基线比对），`pnpm test:scripts` 全绿（扫描器自身无回归，browser-io 专项复核在案）
- [x] 四模式族回扫完成，全部发现带 `文件:行` 证据 + P0/P1/P2/P3 裁决；CV 后新增代码与 allowlist/豁免点复验覆盖
- [x] 所有 in-scope P0/P1 已修复（test-first 证据）并带回归测试；受影响包验证绿
- [x] 共性缺陷模式已按 §7 插入 CX-n（或显式声明无共性缺陷）
- [x] P2 路由 DR、P3 路由 D2 无悬挂；审计卡追加节已回写
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步（checklist v2 若语义变动、`docs/audits/` 索引、daily log）或明确写明 No owner-doc update required
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（零新增命中）

## Deferred But Adjudicated

### P2 集中修复（DR 归属）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: P2（体验/文档/测试加固、非阻断 a11y/i18n、性能优化）按 checklist v2 裁决表语义不阻塞 supported baseline；本 plan 显式登记路由清单（`docs/audits/round2-dr-adjudication.md`），由 DR work item 集中修复，非静默延期。
- Successor Required: `yes`
- Successor Path: `docs/backlog/component-audit-round2-roadmap.md` DR 行（跨面集中修复与裁决）

### P3 裁决（D2 归属）

- Classification: `watch-only residual`
- Why Not Blocking Closure: P3（风格 nit、注释、可选优化）仅记录；D2 对 149 + 新增 P3 做逐条裁决（低成本当场修复/留痕/驳回），本 plan 只登记不裁决。
- Successor Required: `yes`
- Successor Path: `docs/plans/2026-08-08-0715-3-round2-d2-p3-adjudication-residual.md`

## Non-Blocking Follow-ups

- 本 plan 无预期 follow-up（回扫发现全部在 P0/P1（修）/P2（DR）/P3（D2）三档内消化）；执行中新增的治理项按既有纪律入 daily log。

## Closure

Status Note: 2026-08-08 执行完毕。3 Phase 全 completed；纯回扫轮零产品代码变更（P0/P1/P2/P3 全零命中，无 test-first 修复触发）。交付物：28 项 `check:*` 逐项重跑 27/28 exit 0 与 D0 基线逐位一致（`check:duplicates:detail` exit 1 非门禁 raw jscpd dump 归因维持，数字 454 clones / 3.04% 与 D0 一致）+ `pnpm test:scripts` 6 files/15 tests 全绿 + 扫描器回归专项核查在案（browser-io 扫描范围正则 + committed 夹具正例复核）+ 四模式族回扫零命中清单（事件 ctx 门禁零命中 + 7 allowlist 逐行 live 复验、reaction 三件套 13 声明全接线矩阵、scope 12 组 createScope/disposeScope 全配对 + test-global-leaks 47/2 一致、i18n 零生产代码硬编码）+ 共性缺陷显式声明无（不插入 CX-13+）+ 审计卡追加节回写 5 卡（gantt/calendar/crud/diff-view/reaction）+ 全量验证 typecheck/build/lint 32/32、test 59/59、聚合 `pnpm check` exit 0；roadmap D1 行 `todo`→`done`（附执行证据引用）；daily log `docs/logs/2026/08-08.md` D1 节收口。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，mission-driver closure-audit 专用派发，2026-08-08）
- Evidence: live repo 复核通过——root `package.json` 28 项 `check:*`（14 项 `check:audit-*`）计数一致；聚合 `pnpm check` exit 0；`check:audit-event-dispatch-ctx` / `check:audit-renderer-browser-io` / `check:audit-runtime-raw-schema-reads` / `check:audit-test-global-leaks` 四门禁 exit 0 复跑（7 条 allowlist 逐行 live 复验：notice-bar.tsx:198/204/210、button.tsx:220、chart-renderer.tsx:605/609/612 均为原生事件转发）；`pnpm test:scripts` 6 files/15 tests 全绿；`pnpm typecheck` 32/32、`pnpm test` 59/59（FULL TURBO，本 plan 零代码变更）；`kind: 'reaction'` renderer 包内 13 声明（crud 1 + diff-view 4 + scheduling 8）live 核对与 5 卡接线矩阵一致；i18n 生产代码零硬编码（残余命中仅为注释 + `t(key,{defaultValue})` 规范形态 + 仅测试引用的 config-test-support.tsx 夹具）；审计卡 5 节追加（gantt/calendar/crud/diff-view/reaction）与 `docs/logs/2026/08-08.md` D1 节、roadmap D1 行 `done` 证据一致；P2/P3 零登记项 + 显式 successor 路由，无静默降级

Follow-up:

- no remaining plan-owned work（P2/P3 零登记项、CX-n 显式声明无；Non-Blocking Follow-ups 节维持无预期 follow-up）。
