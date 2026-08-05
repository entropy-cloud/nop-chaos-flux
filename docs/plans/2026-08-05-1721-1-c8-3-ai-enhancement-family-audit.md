# C8.3 ai 增强族逐组件审计（ai-prompts/ai-suggestions/ai-voice-input/ai-welcome）

> Plan Status: active
> Mission: component-audit
> Work Item: C8.3
> Last Reviewed: 2026-08-05
> Source: `docs/backlog/component-audit-roadmap.md`（C8.x Phase Details）、`docs/audits/component-audit-checklist.md`（18 维 + 审计卡模板 + 自动修复纪律）、`docs/skills/deep-audit-prompts.md`、`docs/architecture/styling-system.md`、`docs/logs/2026/08-05.md`（C8.1/C8.2 节）
> Related: 依赖 C0（`2026-08-02-2043-1`，completed）完成后开工；与 C7（`2026-08-05-1314-1`）/ C8.1（`2026-08-05-1314-2`）/ C8.2（`2026-08-05-1314-3`）并行独立（均只依赖 C0）。前置基础：ai 包历史密集审计（A0-A6 + 多轮 ai 审计，P2 已闭包）——本轮按 roadmap C8.x Phase Details 定位为**增量审计**：组件卡回填 + 事件 payload 形状全核对（CX-10 家族约定）+ 组合宿主场景 + 流式渲染 DOM 契约，不重跑全量维度

## Purpose

对 `flux-renderers-ai` 增强族 4 个组件（ai-prompts/ai-suggestions/ai-voice-input/ai-welcome）完成增量 18 维逐组件审计（每组件一张审计卡，P0/P1/P2/P3 裁决留痕），P0/P1 缺陷在**同一 plan 内自动修复**（test-first + 回归测试 + 受影响包验证门禁），完成 ≥1 个真实浏览器组合宿主场景验证（含 bug 73 模式专项检查），最终 4 张审计卡全部 `closed`（P0/P1 清零）。重点维度：3 值所有权三态（本族为 display-only widget：无 value 写回路径，核对无表单泄漏）、5 DOM 契约（根 marker 类 nop-ai-prompts/nop-ai-suggestions/nop-ai-voice-input/nop-ai-welcome + data-slot/data-cid/data-align/data-layout/data-mode）、7 事件与 action 契约（**onSelect ×2 / onResult / onError payload shape 与 eventContracts 一致、派发是否携带 evaluationBindings ctx（CX-10 家族约定）**）、9 i18n（本族无硬编码文案核对）、12 组合宿主场景（**ai-prompts/ai-suggestions 在 dialog 内使用、ai-voice-input 降级路径、bug 73 模式专项**）、18 注册/IO 安全红线（surface 双注册、**4 组件无 component-lab lab 页——覆盖缺口核查**、SpeechRecognition 用户手势浏览器 API 非网络 IO 裁定）。

## Current Baseline

- **组件与文件**：`ai-prompts.tsx`（97 行）、`ai-suggestions.tsx`（163 行）、`ai-voice-input.tsx`（275 行）、`ai-welcome.tsx`（42 行）。
- **注册定义**：`ai-renderer-definitions.ts`（300 行）——ai-welcome `:151`（defaultSchema `{ type: 'ai-welcome' }`；fields：title/description/icon/align prop + footer value-or-region）、ai-prompts `:166`（defaultSchema `{ type: 'ai-prompts' }`；fields：items/layout/size prop + onSelect event）、ai-voice-input `:241`（defaultSchema `{ type: 'ai-voice-input' }`；fields：lang/continuous/interimResults prop + onResult/onError event）、ai-suggestions `:271`（defaultSchema `{ type: 'ai-suggestions' }`；fields：items/overflowMode/maxVisible prop + onSelect event）；注册 `src/index.ts` 导出齐全（AiWelcomeRenderer `:44`/AiPromptsRenderer `:45`/AiVoiceInputRenderer `:50`/AiSuggestionsRenderer `:52`）。
- **schema 类型**：`schemas.ts` AiWelcomeSchema `:224`（title/description/icon/align/footer）、AiPromptsSchema `:240`（items/layout/size/onSelect）、AiVoiceInputSchema `:351`（lang/continuous/interimResults/onResult/onError，SpeechRecognition 用户手势浏览器 API——INV-1 裁定先例 C8.2）、AiSuggestionsSchema `:407`（items/overflowMode/maxVisible/onSelect；P4 降级注明在 renderers.md §11——ai-prompts 已覆盖静态推荐）。
- **设计文档**：`docs/components/flux-renderers-ai/{design,renderers,audit,implementation}.md` 存在（无逐组件 design.md 目录，家族文档模式）；renderers.md §6-§13 含四组件契约记录；**renderers.md §13 Events 表 ai-prompts onSelect 行已存在（`:621`）——ai-bubble 审计卡 P3 观察提及的 §13 遗留 onAction 误标行（`docs/audits/per-component/ai-bubble.md` dim 17，当时引 `:604`）需在本 plan dim 17 核对：live §13 的 onAction 行现归属 ai-feedback（`:622`，ai-feedback schema 确有 onAction 字段）且表中无 ai-welcome 行——核对是否仍有 ai-welcome 族残留**。
- **playground**：`apps/playground/src/pages/ai-widgets-demo.tsx`（ai-welcome `:54`、ai-prompts `:61`、ai-suggestions `:74`、ai-voice-input `:83`）+ `apps/playground/src/ai/ai-p4-example.json`；**4 组件均无 component-lab lab 页**（`component-lab/renderers/` 无 ai-prompts/ai-suggestions/ai-voice-input/ai-welcome 条目——维度 18 缺口待核对）。
- **既有单测**：`ai-suggestions.test.tsx`（10 用例）、`ai-voice-input.test.tsx`（11 用例）；ai-welcome/ai-prompts 无独立测试文件，由 `p1-renderers.test.tsx`（17 用例：ai-welcome 渲染/align `:153-190`、ai-prompts 布局/onSelect `:194-240`）与 `data-cid-contract.test.tsx`（ROOTS 双注册核对 `:77-78`、ai-welcome cid `:104`/ai-prompts cid `:109` DOM 传播）覆盖——**维度 16 假绿/覆盖盲区核查项：ai-welcome/ai-prompts 独立行为断言不足**。
- **e2e**：`tests/e2e/ai-widgets-demo.spec.ts`（10 测试：ai-welcome `:9`、ai-prompts ×2 `:23/:41`、ai-suggestions `:73`、ai-voice-input `:89` 等）、`tests/e2e/ai-p4-widgets.spec.ts`（3 测试：ai-suggestions `:19`、ai-voice-input `:32` 等）；本族无 `tests/e2e/component-lab/c8-3-host-surfaces.spec.ts`（需新增）。
- **基线**：C8.1/C8.2 收口后 unit 全绿（workspace typecheck/build/lint 32/32、test 59/59 task 全绿，`docs/logs/2026/08-05.md`）；**e2e**：C8.1 已修复 ai 包 pre-existing（ai-chat timestamp + ai-rich-text-sender ×5，live commit abcecfa9），C8.2 回归 ai 族 42/42 + smoke 93/93 零新增失败；**本 plan 不继承 e2e pre-existing 债务**（calendar-demo/gantt-bars-and-links:132 归属 C9，diff-perf 归属 CV）。

## Goals

- 4 张审计卡（`docs/audits/per-component/{ai-prompts,ai-suggestions,ai-voice-input,ai-welcome}.md`）18 维逐项核对，P0/P1/P2/P3 裁决留痕，`文件:行` 证据，全部 `closed`（P0/P1 清零）。
- 本族 P0/P1 缺陷 test-first 自动修复（契约/公共层修复 Must automate），P2 低成本当场修复、其余登记卡内 backlog 归 CR。
- ≥1 个真实浏览器组合宿主场景（含 bug 73 模式专项）：候选——ai-prompts/ai-suggestions 在 dialog 内选择（onSelect payload 真机解析）、ai-voice-input 降级路径（不支持 SpeechRecognition 时不崩溃）、ai-welcome footer region 内嵌组件求值。
- roadmap C8.3 行标 `done`（独立子 agent closure-audit pass 后）。

## Non-Goals

- C7 mobile 族（`2026-08-05-1314-1` 覆盖）、C8.1 ai 会话主链（`2026-08-05-1314-2` 覆盖）、C8.2 ai 工具内容族（`2026-08-05-1314-3` 覆盖）、C9 scheduling 族（`2026-08-05-1721-2` 覆盖）。
- 已收口的历史 ai 审计结论不重审（roadmap Cross-Cutting：上轮结论不重审，只在本轮发现与新证据冲突时提交跨维度裁决）。
- checklist v2 修订（CG）、审计工具脚本升级（CG）。
- 结构性重构（公共 API/包边界/编译期机制，需人工确认后另立 CX-n；纯行为修复不视为结构性）。
- 各审计卡 P2 backlog（>15 分钟项）归 CR 处理，不在本 plan 内实现。
- e2e pre-existing 中 calendar-demo/gantt-bars-and-links:132（C9）与 diff-perf（CV）不修复。

## Scope

### In Scope

- 4 组件 × 18 维增量审计卡（维度重点：1 Schema 契约（四 Schema 与注册 fields/propContracts/eventContracts 一致、ai-suggestions overflowMode 枚举、ai-voice-input lang BCP-47 校验）、2 RendererComponentProps 合规、3 值所有权三态（本族 display-only widget 无 value 写回路径——核对无表单泄漏/无 valueOwnership 声明）、4 表单参与（本族非表单字段——核对无泄漏）、5 DOM 与选择器契约（**根 marker 类 nop-ai-prompts/nop-ai-suggestions/nop-ai-voice-input/nop-ai-welcome + data-slot/data-cid/data-align/data-layout/data-mode/data-cid**）、6 嵌套 schema 分类（ai-welcome footer value-or-region、ai-prompts items prop、无 deepFields 残留）、7 事件与 action 契约（**onSelect/onResult/onError payload shape 与 eventContracts 一致、派发是否携带 `{event, evaluationBindings, scope}` ctx（CX-10 家族约定——C8.1/C8.2 已修 14+10 处，本 4 组件是否同型缺口需逐点核对）**）、8 a11y（按钮/选项键盘可达、ai-voice-input 状态 aria、ai-suggestions overflow 触发可聚焦）、9 i18n（本族文案是否硬编码、aria-label 硬编码核查）、10 四态覆盖（空 items/加载/错误/禁用——ai-suggestions 空态、ai-voice-input 不支持降级）、11 异步生命周期（SpeechRecognition 生命周期/清理/错误、ai-suggestions 无异步）、12 组合宿主场景（**四组件在 dialog 内使用（bug 73 模式）、ai-voice-input 降级路径专项**）、13 样式契约（widget renderer 自样式 + marker 类、无 BEM）、14 React 19（无冗余 memo/effect 镜像、SpeechRecognition 引用清理）、15 性能边界（ai-suggestions 大列表 overflow 计算）、16 测试质量（ai-welcome/ai-prompts 独立断言不足核查、not-throw-only 断言、DOM 契约断言）、17 文档对照（renderers.md §6/§7/§13 ↔ 实现 props/事件，**§13 onAction 误标行残留核对**）、18 注册/包边界/IO 安全红线（surface 双注册、**4 组件无 component-lab lab 页——覆盖缺口核查**、SpeechRecognition 为用户手势浏览器 API 非网络 IO（INV-1 裁定，C8.2 先例）））。
- P0/P1 自动修复（test-first）+ P2 低成本即时修复。
- 真实浏览器宿主场景（prompts/suggestions dialog 内选择 + voice 降级 + welcome region 求值）。
- 审计卡状态流转（open → fixing → fixed-pending-closure → closed）与 daily log 记录。

### Out Of Scope

- C7/C8.1/C8.2/C9 组件族（并行/后续 plan 覆盖）。
- checklist v2 修订（CG）。
- 结构性重构（需人工确认后另立 CX-n）。
- e2e pre-existing 中 calendar-demo/gantt-bars-and-links:132（C9）与 diff-perf（CV）项。

## Failure Paths

| 可测场景编号     | 触发                                      | 行为（含错误码）                                      | 可重试 | 用户可见表现    |
| ---------------- | ----------------------------------------- | ----------------------------------------------------- | ------ | --------------- |
| host-prompts-dlg | ai-prompts 在 dialog 内点击 prompt 项     | onSelect 派发 `{item,index}` + `${...}` args 真机解析 | 是     | 选择事件正确    |
| host-suggest-pop | ai-suggestions overflow 折叠 + 点击建议项 | 溢出项可展开、onSelect payload 正确、焦点不逃逸       | 是     | 建议选择正确    |
| host-voice-degrd | 不支持 SpeechRecognition 的浏览器环境     | 降级渲染 marker 按钮、点击不崩溃、onError 路径安全    | 是     | 降级不崩溃      |
| host-welcome-reg | ai-welcome footer region 内嵌组件         | region 渲染 + 内嵌组件求值/事件正常                   | 是     | region 内容正确 |

## Test Strategy

本档选择：**必须自动化** —— 事件 payload 形状（onSelect/onResult/onError 与 eventContracts 一致、evaluationBindings ctx 注入）是核心回归路径（CX-10 家族约定）；SpeechRecognition 生命周期/降级属异步与安全面；契约/公共层修复必须 test-first（先写失败测试再实现）。验证门禁：受影响包 `pnpm --filter @nop-chaos/flux-renderers-ai typecheck/build/lint/test` + 相关 e2e 回归（ai-widgets-demo/ai-p4-widgets）+ 本族新增宿主场景 Playwright（programmatic DOM 断言）。

## Execution Plan

### Phase 1 - 逐组件 18 维审计与审计卡产出

Status: planned
Targets: `packages/flux-renderers-ai/src/renderers/{ai-prompts,ai-suggestions,ai-voice-input,ai-welcome}.tsx`、`ai-renderer-definitions.ts`、`docs/audits/per-component/`

- Item Types: `Proof`

- [ ] 审计前核对注册定义：4 组件注册项（type/fields/propContracts/eventContracts）与各自 schema 一致（维度 1/18）。
- [ ] 产出 4 张审计卡：18 维逐项核对（结论 pass/fail/n-a + `文件:行` 证据 + 发现），P0/P1/P2/P3 裁决留痕（checklist §3）。
- [ ] 事件派发链路专项核对：onSelect（ai-prompts/ai-suggestions）/onResult/onError（ai-voice-input）派发点是否携带 `{event, evaluationBindings, scope}` ctx——CX-10 家族约定比对（C8.1/C8.2 修复模式：`renderer-reaction-handle.ts` + 派发点补参），确认是否同型缺口。
- [ ] 维度 16 假绿核查：ai-welcome/ai-prompts 独立行为断言是否足够（p1-renderers/data-cid-contract 覆盖 vs 独立语义用例）；既有测试是否 not-throw-only。
- [ ] 维度 17 文档核对：renderers.md §6/§7/§13 与四组件 schema/行为一致性；§13 遗留 onAction 误标行（ai-bubble 卡 P3 观察）是否为 ai-welcome 族残留。

Exit Criteria:

- [ ] 4 张审计卡产出，18 维表带 `文件:行` 证据，P0/P1/P2/P3 裁决留痕，卡状态 `open`。

### Phase 2 - P0/P1 自动修复（test-first）

Status: planned
Targets: `packages/flux-renderers-ai/src/renderers/*.tsx`、`ai-renderer-definitions.ts`、`schemas.ts`

- Item Types: `Fix | Decision | Proof`

- [ ] 对 Phase 1 确认的每个 P0/P1：先写复现/回归测试（断言正确行为，非仅 not-throw），再实现修复。
- [ ] 事件 ctx 注入（若确认缺口）：按 C8.1/C8.2 修复模式补 `{event, evaluationBindings, scope}`；test-first（先红后绿）。
- [ ] 契约/定义修复（propContracts/eventContracts/schema 漂移）：test-first。
- [ ] P2 低成本（≤15 分钟）项当场修复；其余登记卡内 backlog 归 CR。
- [ ] 每次修复后跑 `pnpm --filter @nop-chaos/flux-renderers-ai typecheck && build && lint && test`。

Exit Criteria:

- [ ] 本族 P0/P1 全部修复落地（`fixed-pending-closure`）；回归测试断言正确行为；受影响包验证门禁全绿。

### Phase 3 - 组合宿主真实浏览器场景

Status: planned
Targets: `tests/e2e/component-lab/c8-3-host-surfaces.spec.ts`、`apps/playground/src/component-lab/`（lab 页 ×4，若缺）、`renderer-lab-registry.ts`、`route-model.ts`、`coverage-manifest.ts`

- Item Types: `Fix | Proof`

- [ ] 补齐 4 个 lab 页（维度 18 缺口，P2 低成本裁决）+ RENDERER_LAB_REGISTRY / route 常量模块 / coverage-manifest 同步（C6.x/C7/C8.x 先例）。
- [ ] 新增 `tests/e2e/component-lab/c8-3-host-surfaces.spec.ts`：≥4 场景 programmatic DOM 断言（host-prompts-dlg/host-suggest-pop/host-voice-degrd/host-welcome-reg）。
- [ ] bug 73 模式专项检查：四组件在 dialog 内使用（scope 求值 + 事件派发不串扰）。
- [ ] 回归：本族相关 e2e（ai-widgets-demo 10/10 + ai-p4-widgets 3/3）+ component-lab 全量 + smoke 零新增失败。

Exit Criteria:

- [ ] c8-3-host-surfaces.spec.ts 场景全绿（programmatic DOM 断言）；lab 页 ×4 与 route/registry/manifest 接线完成；相关 e2e 回归零新增失败。

### Phase 4 - 组件回归与审计卡 closure

Status: planned
Targets: 审计卡、`docs/logs/2026/08-05.md`、`docs/backlog/component-audit-roadmap.md`（C8.3 行）

- Item Types: `Proof`

- [ ] 全卡复查：4 卡 18 维表结论与最终代码一致；P0/P1 清零；卡状态 `closed`（含 fixed-pending-closure → closed 流转）。
- [ ] 本组件范围回归：`pnpm --filter @nop-chaos/flux-renderers-ai test` + 相关 e2e spec 全绿；workspace 全量 `pnpm typecheck`/`build`/`lint`/`test` 最终以 Closure Gates 为准（指南 Minimum Rule 18：全量验证归 closure，非 Phase 默认项——此处仅作收口前置预跑）。
- [ ] daily log 记录：卡 closure 汇总、修复清单（commit/plan 引用）、宿主场景结果、CX-n 插入（若有）与决策。
- [ ] roadmap C8.3 行标 `done` 的前置：独立子 agent closure-audit pass（Closure Gates 项，不在本 plan 执行 session 内自审；已交付全部执行证据，由 mission-driver CLOSURE_VERIFY fresh session 执行 audit 后收口）。

Exit Criteria:

- [ ] 4 张审计卡全部 `closed`；`docs/audits/per-component/` 汇总可读。
- [ ] daily log 已记录本 plan 收口证据（含 closure-audit 证据位置）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立 review（mission-driver plan review，fresh session，2026-08-05）
- Verdict: `pass`
- Rounds: 1
- Findings addressed:
  - Baseline 行 18：AiSuggestionsSchema P4 降级注明实际位于 renderers.md §11 而非 schemas.ts:407 —— 已修正归属。
  - Baseline 行 19：§13 ai-prompts onSelect 行为 :621（非 :620）；onAction 误标行 live 现状（归属 ai-feedback :622、表内无 ai-welcome 行）已写入 dim 17 核对口径。
  - Baseline 行 21：p1-renderers.test.tsx 实为 17 用例且无 cid 传播断言（ai-welcome/ai-prompts cid 在 data-cid-contract.test.tsx :104/:109）—— 已修正。
  - Deferred 项：P2 高成本归 CR 依据为 checklist §3 优先级裁决（非 §2）—— 已修正引用。
  - Minor（记录不修）：schemas.ts 接口声明行与字段引用行相邻（223/239/350/406 vs 224/240/351/407）属正常引用；renderers.md §13 表行 :621/:622 已按 live 校准。

## Closure Gates

> **关闭条件**：本 section 所有条目 + 每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`（guide `When Closing The Plan` + `Closure Audit Rule`）。

- [ ] 4 张审计卡全部 `closed`（P0/P1 清零），18 维表结论与最终代码一致
- [ ] 本族所有 in-scope confirmed live defects 已修复（test-first + 回归测试）
- [ ] 事件 payload shape 契约（onSelect/onResult/onError + evaluationBindings ctx）与 eventContracts 收敛一致
- [ ] 真实浏览器宿主场景 ≥1（含 bug 73 模式专项）programmatic DOM 断言通过
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响的 owner docs（renderers.md/flux-renderers-ai/design.md 等）已同步到 live baseline，或明确写明 No owner-doc update required
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 历史 ai 审计结论不重审

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: roadmap Cross-Cutting 明确"上轮结论不重审，只在本轮发现与新证据冲突时提交跨维度裁决（CR）"。
- Successor Required: `no`

### 各审计卡 P2 backlog（>15 分钟项）

- Classification: `optimization candidate`
- Why Not Blocking Closure: checklist §3 优先级裁决（自动修复纪律）明确 P2 高成本项登记卡内 backlog 由 CR 统一处理，不阻塞本族 P0/P1 清零的 closure。
- Successor Required: `yes`
- Successor Path: CR 跨族集中修复与裁决（roadmap `todo`，待全部 C\* 完成后执行）

### e2e pre-existing 非本族项（calendar-demo/gantt-bars-and-links:132 → C9、diff-perf → CV）

- Classification: `watch-only residual`
- Why Not Blocking Closure: C0 基线裁定 + C5.1 VERIFY 已修复 calendar-demo/diff-perf 的既有失败（locale 无关化选择器/阈值校准）；gantt-bars-and-links:132 为机器负载拖拽时序 flake（successor C9）。本 plan 为 ai 包，相关 spec 零失败。
- Successor Required: `yes`
- Successor Path: C9（`2026-08-05-1721-2`）/ CV 全量验证

## Non-Blocking Follow-ups

- 若 Phase 1 确认 ai-welcome/ai-prompts 独立单测覆盖不足：在 Phase 2 补独立语义用例（属于测试质量治理，非契约缺陷）。
- renderers.md §13 Events 表遗留文案（若有）清理归 CR 归集。

## Closure

Status Note: 待执行。

Closure Audit Evidence:

- Auditor / Agent: 待定（mission-driver CLOSURE_VERIFY fresh session）
- Evidence: 待定

Follow-up:

- 待执行后填写。
