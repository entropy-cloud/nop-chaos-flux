# C8.1 ai 会话主链逐组件审计（ai-chat/ai-message-list/ai-bubble/ai-sender/ai-conversations）

> Plan Status: active
> Mission: component-audit
> Work Item: C8.1
> Last Reviewed: 2026-08-05
> Source: `docs/backlog/component-audit-roadmap.md`（C8.x Phase Details）、`docs/audits/component-audit-checklist.md`（18 维 + 审计卡模板 + 自动修复纪律）、`docs/skills/deep-audit-prompts.md`、`docs/architecture/styling-system.md`、`docs/logs/2026/08-05.md`
> Related: 依赖 C0（`2026-08-02-2043-1`，completed）完成后开工；与 C7（`2026-08-05-1314-1`）/ C8.2（`2026-08-05-1314-3`）并行独立（均只依赖 C0）。前置基础：ai 包历史密集审计（A0-A6 + 多轮 ai 审计，P2 已闭包）——本轮按 roadmap C8.x Phase Details 定位为**增量审计**：组件卡回填 + 事件 payload 形状全核对 + HITL 死点击场景 + 流式渲染 DOM 契约，不重跑全量维度；**承接 C0 基线 e2e pre-existing 裁定项**：`ai-chat.spec.ts`（ai-bubble timestamp）与 `ai-rich-text-sender.spec.ts` ×5（Tiptap）→ successor C8.1

## Purpose

对 `flux-renderers-ai` 会话主链 5 个组件（ai-chat/ai-message-list/ai-bubble/ai-sender/ai-conversations）完成增量 18 维逐组件审计（每组件一张审计卡，P0/P1/P2/P3 裁决留痕），P0/P1 缺陷在**同一 plan 内自动修复**（test-first + 回归测试 + 受影响包验证门禁），**同时修复 C0 基线记录并归属本 work item 的 2 组 e2e pre-existing 失败**（`ai-chat.spec.ts` timestamp、`ai-rich-text-sender.spec.ts` ×5 Tiptap），完成 ≥1 个真实浏览器组合宿主场景验证（含 bug 73 模式专项检查），最终 5 张审计卡全部 `closed`（P0/P1 清零）。重点维度：3 值所有权三态（**ai-chat messages/status 投影快照、ai-sender 输入受控、ai-conversations 会话选择**）、5 DOM 契约（根 marker 类 nop-ai-chat/nop-ai-message-list/nop-ai-bubble/nop-ai-sender/nop-ai-conversations + data-slot/data-role/data-cid）、7 事件与 action 契约（**流式/发送/会话切换事件 payload 形状全核对**）、11 异步生命周期（**流式请求 abort/竞态、engine 生命周期、Tiptap rich-text sender 提交路径**）、12 组合宿主场景（**ai-chat 在 dialog 内流式对话、bug 73 模式专项**）、18 注册/IO 安全红线（surface 双注册、无浏览器 IO 直调、playground 页覆盖）。

## Current Baseline

- **组件与文件**：`ai-chat.tsx`（374 行）、`ai-message-list.tsx`（146 行）、`ai-bubble/index.tsx`（267 行 + `markdown-buffer.ts`/`user-edit.tsx` 子模块）、`ai-sender.tsx`（235 行 + `rich-text/` Tiptap 子路径）、`ai-conversations.tsx`（134 行）。
- **注册定义**：`ai-renderer-definitions.ts`（300 行）——ai-chat `:41`（defaultSchema `{ type: 'ai-chat' }`）、ai-message-list `:81`、ai-bubble `:94`、ai-sender `:113`、ai-conversations `:134`；注册 `src/index.ts` 导出齐全（renderer exports `:39-43`）。
- **设计文档**：`docs/components/flux-renderers-ai/{design,renderers,audit,implementation}.md` 存在（renderers.md 记录 nop-ai-chat/data-slot="ai-chat-root"/ai-message-list/ai-sender 等 DOM 契约 `:47-61`）。
- **playground**：`apps/playground/src/pages/` 下 ai-chat-demo.tsx/ai-conversations-demo.tsx/ai-rich-text-demo.tsx/ai-component-handle-demo.tsx/ai-hitl-demo.tsx/ai-virtual-scroll-demo.tsx/ai-persistence-demo.tsx 等 + `apps/playground/src/ai/*.json` example schema（ai-chat-example.json 等）。
- **既有单测**：`renderers/__tests__/` 下 ai-chat-external-engine.test.tsx（5）、ai-chat-lifecycle-stability.test.tsx（1）、ai-chat-projection.test.tsx（5）、ai-chat-subscribe.test.tsx（4）、ai-sender-extensions.test.tsx（4）、ai-sender-ime.test.tsx（4）、a11y.test.tsx（5）、renderers.test.tsx（9）、p1-renderers.test.tsx（16）、p2-a11y-i18n.test.tsx（12）、data-cid-contract.test.tsx（14）、phase4-platform-linkage.test.tsx（3）、phase5-deepening.test.tsx（11）等——`renderers/__tests__/` 合计 `it(` 约 208 处。
- **e2e**：`ai-chat.spec.ts`（10 测试，其中 **`:112` ai-bubble 渲染 timestamp 为 C0 基线 pre-existing 失败，successor C8.1**）、`ai-rich-text-sender.spec.ts`（5 测试，**全部为 C0 基线 pre-existing 失败——Tiptap 编辑面渲染/模板插入/mention popup/slash 命令/富文本提交，successor C8.1**）、`ai-conversations.spec.ts`（4）、`ai-component-handle.spec.ts`（2）、`ai-hitl.spec.ts`（2）、`ai-virtual-scroll.spec.ts`（1）、`ai-persistence.spec.ts`（2）——均需在本 plan 内回归。
- **基线**：C0 基线 unit 全绿（typecheck/build/lint 32/32、test 59/59 task 全绿，`docs/logs/2026/08-05.md`）；**e2e pre-existing 债务（本 work item 承接）**：ai-chat timestamp ×1 + ai-rich-text-sender ×5，C0 已裁定 successor C8.1（`docs/backlog/component-audit-roadmap.md` `:98-99`、C0 plan Deferred 节）——本 plan 必须修复并复验，修复后 ai 包 e2e 应达成 full-green（剩余 pre-existing：calendar-demo → C9、diff-perf → CV）。

## Goals

- 5 张审计卡（`docs/audits/per-component/{ai-chat,ai-message-list,ai-bubble,ai-sender,ai-conversations}.md`）18 维逐项核对，P0/P1/P2/P3 裁决留痕，`文件:行` 证据，全部 `closed`（P0/P1 清零）。
- 本族 P0/P1 缺陷 test-first 自动修复（契约/公共层修复 Must automate），P2 低成本当场修复、其余登记卡内 backlog 归 CR。
- **修复 C0 基线归属本 work item 的 e2e pre-existing 失败**：`ai-chat.spec.ts:112` timestamp + `ai-rich-text-sender.spec.ts` ×5（Tiptap），test-first 或真机诊断修复，复验后 ai 包 e2e 相关 spec 全绿。
- ≥1 个真实浏览器组合宿主场景（含 bug 73 模式专项）：候选——ai-chat 在 dialog 内流式对话 + 发送、HITL 死点击场景专项（roadmap C8.x Phase Details 明示）、流式渲染 DOM 契约。
- roadmap C8.1 行标 `done`（独立子 agent closure-audit pass 后）。

## Non-Goals

- C7 mobile 族（`2026-08-05-1314-1` 覆盖）、C8.2 ai 工具内容族（`2026-08-05-1314-3` 覆盖）、C8.3 ai 增强族、C9 scheduling 族（后续 work item 覆盖）。
- 已收口的历史 ai 审计结论不重审（roadmap Cross-Cutting：上轮结论不重审，只在本轮发现与新证据冲突时提交跨维度裁决）。
- checklist v2 修订（CG）、审计工具脚本升级（CG）。
- 结构性重构（公共 API/包边界/编译期机制，需人工确认后另立 CX-n；纯行为修复不视为结构性）。
- 各审计卡 P2 backlog（>15 分钟项）归 CR 处理，不在本 plan 内实现。
- e2e pre-existing 中不属于本 work item 的项（calendar-demo → C9、diff-perf → CV）不修复。

## Scope

### In Scope

- 5 组件 × 18 维增量审计卡（维度重点：1 Schema 契约（五 Schema 与注册 fields/propContracts/eventContracts 一致、senderExtensions 等字段）、2 RendererComponentProps 合规、3 值所有权三态（**ai-chat messages/status 投影快照（structuredClone turn-boundary）、ai-sender 输入受控/清空回显、ai-conversations 会话选择 local**）、4 表单参与（本族非表单字段——核对无泄漏）、5 DOM 与选择器契约（**根 marker 类 + data-slot/data-role/data-cid，流式渲染 DOM 契约**）、6 嵌套 schema 分类（messages/sender body region 分类、无 deepFields 残留）、7 事件与 action 契约（**发送/流式完成/会话切换/onChange 等事件 payload 形状全核对，HITL 提交路径**）、8 a11y（aria-live 流式播报、焦点管理、aria-label）、9 i18n（placeholder/空态文案 key）、10 四态覆盖（空会话/加载中/错误重试/禁用输入）、11 异步生命周期（**流式 abort/竞态保护、engine 生命周期挂接、rich-text sender 提交、HITL 等待态**）、12 组合宿主场景（**ai-chat 在 dialog 内流式对话（bug 73 模式）、HITL 死点击场景专项**）、13 样式契约（widget renderer 自样式 + marker 类、无 BEM）、14 React 19（无冗余 memo/effect 镜像）、15 性能边界（消息列表大/虚拟滚动、流式重渲染频率）、16 测试质量（既有测试断言正确行为而非 not-throw、错误路径、DOM 契约断言——假绿核查）、17 文档对照（design.md/renderers.md ↔ 实现 props/行为）、18 注册/包边界/IO 安全红线（surface 双注册、playground 覆盖、无浏览器 IO 直调、markdown/HTML 渲染 sanitize））。
- **e2e pre-existing 修复**：ai-chat timestamp + ai-rich-text-sender ×5（test-first 或真机诊断，复验 spec 全绿）。
- P0/P1 自动修复（test-first）+ P2 低成本即时修复。
- 真实浏览器宿主场景（ai-chat dialog 内流式对话 + HITL 死点击专项 + 流式 DOM 契约断言）。
- 审计卡状态流转（open → fixing → fixed-pending-closure → closed）与 daily log 记录。

### Out Of Scope

- C7/C8.2/C8.3/C9 组件族（并行/后续 plan 覆盖）。
- checklist v2 修订（CG）。
- 结构性重构（需人工确认后另立 CX-n）。
- e2e pre-existing 中 calendar-demo（C9）/diff-perf（CV）项。

## Failure Paths

| 可测场景编号      | 触发                          | 行为（含错误码）                                                 | 可重试 | 用户可见表现      |
| ----------------- | ----------------------------- | ---------------------------------------------------------------- | ------ | ----------------- |
| host-ai-dialog    | ai-chat 在 dialog 内流式对话  | 正常流式渲染或失败 → 错误回退、发送/重试路径可用、不崩溃         | 是     | 对话/错误回退正确 |
| host-ai-timestamp | ai-bubble timestamp 渲染      | 消息气泡渲染 timestamp 元素（`data-slot="ai-bubble-timestamp"`） | 否     | timestamp 可见    |
| host-ai-richtext  | Tiptap rich-text sender 提交  | 编辑面/模板插入/mention/slash 命令/富文本提交路径全通            | 是     | 富文本提交正确    |
| host-ai-hitl      | HITL 死点击场景（等待态交互） | 等待态下重复点击不产生重复提交/崩溃，提交路径正确                | 是     | HITL 交互稳定     |
| host-ai-stream    | 流式渲染 DOM 契约             | 流式增量渲染、data-role/data-slot 稳定、abort 后不泄漏           | 是     | 流式内容正确      |

## Test Strategy

本档选择：**必须自动化** —— ai 会话主链的流式异步生命周期（abort/竞态/engine 生命周期）、事件 payload 形状（发送/流式完成/会话切换）、HITL 死点击场景是核心回归路径；**e2e pre-existing 修复（timestamp + Tiptap ×5）为 C0 已裁定 successor，属"已确认 live defect 修复"，必须 test-first 且复验 spec 全绿**；契约/公共层修复必须 test-first（先写失败测试再实现）。验证门禁：受影响包 `pnpm --filter @nop-chaos/flux-renderers-ai typecheck/build/lint/test` + 相关 e2e 回归（ai-chat/ai-rich-text-sender/ai-conversations/ai-component-handle/ai-hitl 等）+ 本族新增宿主场景 Playwright（programmatic DOM 断言）。

## Execution Plan

### Phase 1 - 逐组件 18 维审计与审计卡产出

Status: planned
Targets: `packages/flux-renderers-ai/src/renderers/{ai-chat,ai-message-list,ai-sender,ai-conversations}.tsx`、`ai-bubble/`、`ai-renderer-definitions.ts`、`docs/audits/per-component/`

- Item Types: `Proof`

- [ ] 审计前核对注册定义：5 组件注册项（type/fields/propContracts/eventContracts）与各自 schema 一致（维度 1/18）。
- [ ] 产出 5 张审计卡：18 维逐项核对（结论 pass/fail/n-a + `文件:行` 证据 + 发现），P0/P1/P2/P3 裁决留痕（checklist §3）。
- [ ] 维度重点核查：值所有权三态（维度 3：**ai-chat messages/status 投影快照（turn-boundary structuredClone）、ai-sender 输入受控、ai-conversations 会话选择 local**）；08-02 字段分类（维度 6：无 deepFields 残留）。
- [ ] 事件与 action 契约（维度 7：**发送/流式完成/会话切换/onChange payload shape 全核对、normalizeActionEvent 语义、HITL 提交路径**）与 a11y（维度 8：aria-live 流式播报、焦点管理）。
- [ ] 异步生命周期（维度 11：**流式 abort/竞态保护、engine 生命周期挂接与卸载、rich-text sender 提交、HITL 等待态**）与性能边界（维度 15：消息列表渲染、流式重渲染频率）。
- [ ] 测试质量（维度 16）：既有测试断言正确行为而非 not-throw、错误路径、DOM 契约断言——假绿核查。
- [ ] 文档对照（维度 17）：`docs/components/flux-renderers-ai/{design,renderers,audit,implementation}.md` ↔ 实现 props/行为逐项核对。
- [ ] playground 覆盖核查（维度 18）：5 组件演示页与 example.json 覆盖核对、surface 双注册核对。

Exit Criteria:

> 本 Phase 交付 5 张审计卡（含裁决），是后续修复的唯一事实来源。

- [ ] `docs/audits/per-component/{ai-chat,ai-message-list,ai-bubble,ai-sender,ai-conversations}.md` 卡存在，18 维表完整、`文件:行` 证据可验证。
- [ ] 卡内发现清单带 P0/P1/P2/P3 裁决；无 P0/P1 的卡标记 `closed`，否则 `open`。

### Phase 2 - P0/P1 自动修复 + e2e pre-existing 修复（test-first）

Status: planned
Targets: 发现涉及的 renderer/子模块文件、schema 文件、契约测试文件、e2e spec

- Item Types: `Fix | Proof | Decision`

- [ ] 按审计卡处理 P0/P1：先写复现/回归测试（断言正确行为，非仅 not-throw），再实现修复；DOM/选择器契约变更追加 focused 契约测试与 e2e（test-first 证据：复现测试先于实现）。
- [ ] **修复 C0 归属本 work item 的 e2e pre-existing 失败**（`Fix`，不得降级为 Follow-up）：`ai-chat.spec.ts:112` ai-bubble timestamp + `ai-rich-text-sender.spec.ts` ×5（Tiptap 编辑面/模板/mention/slash/提交）——先定位根因（真机复现 + programmatic 诊断，禁截图），写复现测试或 e2e 修正（若属测试断言与实现契约漂移则裁定契约侧），再修复，复验 spec 全绿。
- [ ] P2 低成本（约 15 分钟内）当场修复；其余登记卡内 backlog 归 CR。
- [ ] 共性缺陷裁决（Decision）：若发现 ≥2 组件/跨包/公共层根因，按 roadmap §7 主动插入 CX-n 或并入现有项并回写 daily log；组件单点根因则记录裁决、不插入 CX-n。
- [ ] 修复后卡内发现标 `fixed` + commit/plan 引用；卡状态流转 `open → fixing → fixed-pending-closure`。
- [ ] 复杂/跨包 bug 修复按 AGENTS.md Bug Fix Test Coverage Rule 记录到 `docs/bugs/`（参考 `docs/bugs/73-*.md` 格式）。

Exit Criteria:

> 本 Phase 交付"发现清零或已裁定"，卡状态与代码行为一致。

- [ ] 全部 P0/P1 已修复（卡内标 `fixed` + 证据）或已显式裁定延期（仅允许依赖未落地跨 plan 机制者，标「机制落地后复验」并登记）；无静默跳过。
- [ ] **e2e pre-existing 修复完成**：`ai-chat.spec.ts` timestamp + `ai-rich-text-sender.spec.ts` ×5 复验全绿（programmatic 断言，记录于 daily log）。
- [ ] 受影响包 `pnpm --filter @nop-chaos/flux-renderers-ai typecheck && build && lint && test` 绿（含新增回归测试）。

### Phase 3 - 组合宿主真实浏览器场景

Status: planned
Targets: `tests/e2e/component-lab/c8-1-host-surfaces.spec.ts`（新增）、playground demo/lab 页

- Item Types: `Proof | Fix`

- [ ] 设计并实现 ≥1 个本组件真实浏览器组合宿主场景（programmatic DOM 断言，禁截图诊断）：新增 lab 页 + **`RENDERER_LAB_REGISTRY` 注册**（`apps/playground/src/component-lab/renderer-lab-registry.ts`，缺注册则 component-lab-page 不渲染 lab 页且 smoke 覆盖失败——C6.x 先例均含 registry 条目）+ 宿主 schema 数据模块 + `COMPONENT_LAB_COVERAGE_MANIFEST` 条目 + 路由协调（按既有 DOMAIN_RENDERER_ROUTES 协调先例）。
- [ ] bug 73 模式专项检查：**ai-chat 在 dialog 内流式对话 + 发送**（真实浏览器宿主，非仅单测）；**HITL 死点击场景专项**（roadmap C8.x Phase Details 明示——等待态重复点击不重复提交）。
- [ ] 流式渲染 DOM 契约专项：流式增量渲染下 data-role/data-slot 稳定性断言。
- [ ] 宿主场景发现的新缺陷按 Phase 2 流程修复（test-first）。
- [ ] 既有相关 e2e（ai-chat/ai-rich-text-sender/ai-conversations/ai-component-handle/ai-hitl/ai-virtual-scroll/ai-persistence）在本族改动后回归。

Exit Criteria:

> 本 Phase 交付"真实浏览器行为成立"。

- [ ] 宿主场景 spec 通过（Playwright，programmatic DOM 断言）；相关既有 e2e 回归绿（含 Phase 2 修复的 pre-existing spec）。
- [ ] bug 73 模式专项检查结论记录于 daily log（pass 或带证据 fail→已修复）。

### Phase 4 - 组件回归与审计卡 closure

Status: planned
Targets: 审计卡、`docs/logs/2026/08-05.md`、`docs/backlog/component-audit-roadmap.md`（C8.1 行）

- Item Types: `Proof`

- [ ] 全卡复查：5 卡 18 维表结论与最终代码一致；P0/P1 清零；卡状态 `closed`（含 fixed-pending-closure → closed 流转）。
- [ ] 本组件范围回归：`pnpm --filter @nop-chaos/flux-renderers-ai test` + 相关 e2e spec 全绿（含 Phase 2 修复的 ai-chat/ai-rich-text-sender）；workspace 全量 `pnpm typecheck`/`build`/`lint`/`test` 最终以 Closure Gates 为准（指南 Minimum Rule 18：全量验证归 closure，非 Phase 默认项——此处仅作收口前置预跑）。
- [ ] daily log 记录：卡 closure 汇总、修复清单（commit/plan 引用）、e2e pre-existing 修复证据、宿主场景结果、CX-n 插入（若有）与决策。
- [ ] roadmap C8.1 行标 `done` 的前置：独立子 agent closure-audit pass（Closure Gates 项，不在本 plan 执行 session 内自审；已交付全部执行证据，由 mission-driver CLOSURE_VERIFY fresh session 执行 audit 后收口）。

Exit Criteria:

> 本 Phase 交付"可进入 closure-audit 的完成态"。

- [ ] 5 张审计卡全部 `closed`；`docs/audits/per-component/` 汇总可读。
- [ ] daily log 已记录本 plan 收口证据（含 closure-audit 证据位置）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent fresh session（task `ses_02fa4cbbcffeHDGkVhB9R8eBSz`）
- Verdict: `pass-with-minors`（0 Blocker / 0 Major，达成共识）
- Rounds: 1
- Findings addressed: **Minor-1（`src/index.ts` import 行号引用错误——原 `:2-6` 为文件头注释，实际 renderer exports `:39-43`）已修正**；**Minor-2（`it(` 计数漂移——`__tests__/` 总量约 208 vs 216、ai-sender-extensions 4 vs 6、data-cid-contract 14 vs 15）**——live 复核 `rg -c "\bit\("` 实测 208（`test(` 词形不同所致），计划已用"约"措辞，裁定不改数字、不影响范围。其余引用全部 live repo 核对通过（definitions `:41/:81/:94/:113/:134`、renderer 行数 374/146/267/235/134、rich-text/ Tiptap 子路径存在、ai-chat.spec.ts `:112` timestamp 测试 + data-slot 实证（`ai-bubble/renderers/timestamp.tsx:18`）、e2e 计数 10/5/4/2/2/1/2、design/renderers.md `:47-61` DOM 契约、roadmap `:98-99` successor 归属、基线 32/32 + 59/59）。

## Closure Gates

> 关闭条件：本 section 与每个 Phase 的 Exit Criteria 全部勾选后才能将 `Plan Status` 改为 `completed`。

- [ ] 5 张审计卡存在、18 维表完整、P0/P1 清零、全部 `closed`
- [ ] 全部 in-scope P0/P1 已 test-first 修复并有回归测试；无被静默降级到 deferred 的 live defect/contract drift
- [ ] **C0 归属本 work item 的 e2e pre-existing 失败（ai-chat timestamp + ai-rich-text-sender ×5）已修复并复验全绿**
- [ ] ≥1 个真实浏览器组合宿主场景通过（含 bug 73 模式专项检查——ai-chat dialog 内流式对话 + HITL 死点击专项）
- [ ] 共性缺陷已按 §7 处理（CX-n 插入/合并或当前 plan 内修复，决策记录在卡与 daily log）
- [ ] 受影响的 owner docs 已同步到 live baseline（design.md/quick-reference/roadmap 表按发现实际影响为准；无变更则不写）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
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

### e2e pre-existing 中不属于本 work item 的项（calendar-demo / diff-perf）

- Classification: `watch-only residual`
- Why Not Blocking Closure: C0 基线已裁定 successor 归属（calendar-demo → C9、diff-perf → CV 专项），非本 work item scope；本 plan 修复本族 6 项后 ai 包相关 spec 全绿即可。
- Successor Required: `yes`
- Successor Path: C9 scheduling 族 work item / CV 全量验证（diff-perf 阈值专项）

## Non-Blocking Follow-ups

- 审计中发现但裁定为 P3（风格 nit/注释）的项仅卡内记录，不处理。
- 工具脚本新增模式（若有）记入卡内，CG 统一升级。
- 观察（供 CLOSURE_VERIFY 核对）：`pnpm check:oversized-code-files` 为 pre-existing 红（C5.1 已记录 HEAD 基线 14 文件超 700 行），超限文件治理归 CG/CR，非本 plan scope。

## Closure

Status Note: （待执行完成后填写）

Closure Audit Evidence:

- Auditor / Agent: （待独立子 agent 填写）
- Evidence: （待填）

Follow-up:

- （待填：non-blocking follow-up 或 no remaining plan-owned work）
