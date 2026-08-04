# 01 Industrial HMI Roadmap Follow-up Backlog 标注一致性收口

> Plan Status: completed
> Last Reviewed: 2026-08-05
> Source: `docs/components/roadmap-industrial-hmi.md` Follow-up Backlog（标注漂移）+ plan `2026-08-05-0325-1` Non-Blocking Follow-ups（line 156「roadmap 标注漂移…留待 roadmap hygiene 轮统一回写」；原引用写作 line 443-448/461，实测为 444-449/462，已校正）
> Related: `docs/plans/2026-08-04-2243-1-hmi-lifecycle-destruction-pipeline-hardening.md`（L1-L6 + W3 实际收口 owner）、`docs/plans/2026-08-05-0325-1-hmi-flux-deps-empty-diagnostic.md`（漂移发现者）

## Purpose

把 `docs/components/roadmap-industrial-hmi.md` Follow-up Backlog 的标注漂移收口到「编排层与实际收口状态一致」：使该文件里**每一条** backlog 条目都带有诚实的解决状态（`已由 plan ... 收口` marker，或显式标注为仍 open 的分类），消除「条目底层缺陷已修、但条目本身读起来仍像 open P2」的歧义。本计划为**纯文档计划**，不触碰任何代码。

## Current Baseline

- **Mission 实质完成**：roadmap Phase Status 区 16 个 work item（I0–I16）全部 `done`；`docs/plans/` 下 12 份 HMI plan 全部 `completed`。
- **Follow-up Backlog 实质全部收口**：两大来源审计（`2026-08-03-1506-multi/open-audit` + `2026-08-04-2242-multi/open-audit`）登记的 P2/P3 条目，其底层缺陷均已由对应 plan 修复（每条带源审计路径 + 代码定位可追溯）。
- **真实 gap —— 标注漂移（本计划收口对象）**：`2026-08-04-2242` post-remediation 子节的 **State & lifecycle（L1–L6，roadmap:444–449）** 与 **Wiring W3（roadmap:462）** 共 **7 条** per-line 条目**缺少 `已由 plan ... 收口` marker**，而同一子节内它们的兄弟条目（D1–D4/W4/W5/T1–T6/A1/Doc1–Doc3 等）均已带 marker。这 7 条的底层缺陷**实际全部由 plan `2026-08-04-2243-1` 收口**（见 roadmap 头部 closure 记录 line 25：「multi-audit dim 04/07 六项 P2（L1-L6…）+ open-audit W3…共七项 in-scope finding 收口」），但 per-line marker 从未回写。
- **漂移已由最近 plan 显式登记**：plan `2026-08-05-0325-1`（line 156，Non-Blocking Follow-ups 区）记录「roadmap:443-448（L1-L6）与 :461（W3）的 per-line backlog 条目底层缺陷已由 plan `2026-08-04-2243-1` 收口，但条目缺『已由 plan ... 收口』marker…留待 roadmap hygiene 轮统一回写（不阻塞本 plan）」；原引用行号 off-by-one，实测为 444-449/462。本 plan 即该 deferred 的 hygiene owner。

### 7 条缺 marker 条目 → 收口 plan / Phase 映射（核对自 plan `2026-08-04-2243-1` closure 记录）

| roadmap 行 | 条目                                     | 收口 plan           | Phase   |
| ---------- | ---------------------------------------- | ------------------- | ------- |
| 444        | L1 RefreshPipeline 无 destroyed 守卫     | `2026-08-04-2243-1` | Phase 1 |
| 445        | L2 DirtyCollector.destroyed 不对称       | `2026-08-04-2243-1` | Phase 1 |
| 446        | L3 releaseRuntime 双 destroy collector   | `2026-08-04-2243-1` | Phase 1 |
| 447        | L4 pendingSkipRef 计数器泄漏             | `2026-08-04-2243-1` | Phase 2 |
| 448        | L5 lastReportedErrors 跨 reload 不清     | `2026-08-04-2243-1` | Phase 2 |
| 449        | L6 useScadaHandles effect 每 render 重跑 | `2026-08-04-2243-1` | Phase 3 |
| 462        | W3 collectStates/StateVisualApplier 双写 | `2026-08-04-2243-1` | Phase 3 |

## Goals

- Follow-up Backlog 中**每一条** backlog 条目都带有诚实解决状态（`已由 plan ... 收口` marker，含收口 plan + Phase + 一句话落地摘要），与兄弟条目格式对齐。
- roadmap 头部「文档共识审查记录」的 closure 记录与 per-line marker 彼此一致（编排层无自相矛盾）。
- 全 backlog 扫描确认**无其他** marker 缺口（不仅是已知 7 条）。

## Non-Goals

- 不重新仲裁任何技术决策、不重审任何已收口缺陷的修复方案。
- 不实现任何新功能、不触碰任何代码（纯 `docs/` 编辑）。
- 不改动 roadmap 的 Phase Status 区（I0–I16 状态）、Work Items 表、Dependency Graph、Cross-Cutting、Rule 条款（这些已是稳定态；本计划仅同步 Follow-up Backlog 标注）。
- 不为 `scada-image loadFailed` deferred 项创建 successor——其 successor 为 I16 之后的编辑器后继 mission（独立 mission，尚未立项，超出本 mission 范围）。

## Scope

### In Scope

- `docs/components/roadmap-industrial-hmi.md` 的 Follow-up Backlog 全节（roadmap:366–483）逐条标注核对与 marker 回写。
- roadmap 头部「文档共识审查记录」追加一条本 hygiene pass 的 closure 记录（对齐既有 closure 记录格式）。
- 全节扫描兜底：发现任何其他缺 marker / marker 与实际收口 plan 不一致的条目，一并诚实回写。

### Out Of Scope

- 任何 `packages/` 下的代码变更。
- 任何 `docs/architecture/`、`docs/components/industrial-hmi/design-*.md`、`docs/analysis/` 的设计文档变更（这些已在各自 plan 收口时同步）。
- roadmap 的 Work Items / Phase Status / Dependency Graph / Cross-Cutting / Rule 正文（非标注性内容）。

## Test Strategy

档位选择：`不适用：理由`

理由：本计划为纯文档标注回写（仅在 `docs/components/roadmap-industrial-hmi.md` 内追加/核对 `已由 plan ... 收口` marker 与一条 closure 记录），无任何代码变更、无行为变更、无契约变更。验证手段为人工 + 独立 closure-audit 核对「每条 backlog 条目均有诚实 marker 且与头部 closure 记录一致」。按 plan-authoring-guide，纯文档计划可从 Closure Gates 删除 `pnpm test/lint/typecheck/build`。

## Execution Plan

### Phase 1 - Follow-up Backlog 全节标注回写 + 一致性核对

Status: completed
Targets: `docs/components/roadmap-industrial-hmi.md`（Follow-up Backlog 全节 lines ~366–483 + 头部「文档共识审查记录」）

- Item Types: `Fix`（标注漂移为已确认的 owner-doc drift，不可降级为 Follow-up）

- [x] **回写 L1–L6（roadmap:444–449）收口 marker**：逐条追加 `**已由 plan \`2026-08-04-2243-1\` Phase N（Lx）收口\*\*：…` 一句话落地摘要，格式与同节兄弟条目（D1–D4/W4/W5 等）严格对齐。Phase 归属按 Current Baseline 映射表（L1/L2/L3→Phase 1、L4/L5→Phase 2、L6→Phase 3）。
- [x] **回写 W3（roadmap:462）收口 marker**：追加 `**已由 plan \`2026-08-04-2243-1\` Phase 3（W3）收口\*\*：…` 落地摘要（active-state 样式 owner=`collectStates`、revert owner=`StateVisualApplier`经同一`collector.collect` 合帧，alarm-storm 收敛为 1 applyAttrs/帧）。
- [x] **全节扫描兜底**：通读 Follow-up Backlog 全节（Dependency & packaging / Public API surface / State & lifecycle / Display & positioning / Wiring / Test effectiveness / Documentation drift / Open-ended audit P2 / 2026-08-04-2242 子节），逐条确认每条均带 marker 或显式 open 分类；若发现任何其他缺 marker 或 marker 引用 plan 错误的条目，诚实回写。
- [x] **头部 closure 记录追加**：在「文档共识审查记录」块末尾追加一条本 hygiene pass 记录，说明「Follow-up Backlog 标注漂移回写：L1-L6 + W3 共 7 条 per-line marker 补齐（均由 plan `2026-08-04-2243-1` 收口）+ 全节扫描确认无其他 marker 缺口」。
- [x] **一致性自检**：确认 (a) 头部 closure 记录与 per-line marker 不自相矛盾；(b) 不改 Phase Status 区 / Work Items / Dependency Graph / Cross-Cutting / Rule 正文语义。

Exit Criteria:

> 纯文档 Phase，Exit Criteria 只写可观测的文档结果。全量 `pnpm typecheck/build/lint/test` 不适用（纯文档计划，已从 Closure Gates 删除）。

- [x] roadmap:444–449 共 6 条（L1–L6）每条均带 `已由 plan \`2026-08-04-2243-1\` Phase N（Lx）收口` marker + 一句话摘要，格式与同节兄弟条目对齐。
- [x] roadmap:462（W3）带 `已由 plan \`2026-08-04-2243-1\` Phase 3（W3）收口` marker + 摘要。
- [x] 全节扫描完成：无其他缺 marker 条目（或发现的额外缺口已诚实回写）。
- [x] 头部「文档共识审查记录」已追加本 hygiene pass 记录，且与 per-line marker 一致。

## Draft Review Record

> 起草后、执行前的独立审查证据（Plan Review Rule）。由独立子 agent（fresh session）填写。

- Reviewer / Agent: 独立 fresh-session sub-agent（task `ses_03101a4aeffeZhNEqXCXyaSjGB`，未参与起草）
- Verdict: `pass-with-minors`
- Rounds: 1（首轮即达成共识：零 Blocker / 零 Major）
- Findings addressed:
  - Minor（已落地）：Source 行与 Current Baseline 把 plan `2026-08-05-0325-1` line 156 的归属标为「Non-Goals」，实测该行位于「Non-Blocking Follow-ups」区（line 154 header）；已校正为正确 section 名 + 补注原引用行号 off-by-one（443-448/461 → 444-449/462）。
- Reference 核对结论（审查者逐项 live-repo 复核）：roadmap 头部 line 25 closure 记录 confirmed；L1-L6（444-449）缺 marker confirmed；W3（462）缺 marker confirmed；兄弟条目均带 marker confirmed（扫描任务确属有界）；L1-L6+W3→Phase 映射与 plan `2026-08-04-2243-1` Phase 标题精确吻合 confirmed；deferred-flag 溯源 confirmed。

## Closure Gates

> 纯文档计划：按 plan-authoring-guide，「如果计划不涉及任何代码变更（仅修改 `docs/` 下的文件），`pnpm test`、`pnpm lint`、`pnpm typecheck`、`pnpm build` 这些条目可以直接从 Closure Gates 中删除」。故本节仅保留文档可观测结果 + 独立 closure-audit。

- [x] Follow-up Backlog 中**每一条**条目均带诚实解决状态（收口 marker 或显式 open 分类），无「读起来像 open P2、实际已修」的歧义条目。
- [x] L1–L6（roadmap:444–449）+ W3（roadmap:462）共 7 条 marker 已回写，引用 plan `2026-08-04-2243-1` + 正确 Phase。
- [x] roadmap 头部「文档共识审查记录」已追加本 hygiene pass closure 记录，且与 per-line marker、Phase Status 区不自相矛盾。
- [x] 全节扫描兜底已执行，无遗漏的 marker 缺口（或已诚实回写）。
- [x] 未改动 Phase Status 区 / Work Items / Dependency Graph / Cross-Cutting / Rule 的正文语义（仅追加标注与一条 closure 记录）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。（audit task `ses_030fcd1d1ffeZzFWdQFH7RsMTM`，verdict `approved`，证据见 Closure Audit Evidence）

## Deferred But Adjudicated

> 本计划为标注收口，预计无 deferred 项。若执行中发现独立子问题（如某条目实际未收口、需重新打开），按 `watch-only residual`/`optimization candidate`/`out-of-scope improvement` 分类并附 `Why Not Blocking Closure`，或升级为独立 successor plan。

## Non-Blocking Follow-ups

- `scada-image loadFailed` 画布级诊断（继承自 plan `2026-08-04-1558-2` Deferred，successor = I16 之后的编辑器后继 mission）：维持现状，非本 mission 范围，本 hygiene 计划不改其状态。
- 其余继承自各 plan 的 `watch-only residual`/`optimization candidate`（mock bounds API 升级、pinch 锚点复核、DirtyCollector freeze/sealed、probe 求值开销、leafer 自动宽 Text 浏览器像素验证、平台 collector 扩大表达式支持面等）：均为 non-blocking，本计划不改其状态。

## Closure

Status Note: 执行完成（2026-08-05）。纯文档 hygiene pass——Follow-up Backlog 标注漂移收口：L1-L6（roadmap:444-449）+ W3（roadmap:462）共 7 条 per-line `已由 plan 2026-08-04-2243-1 Phase N (Lx/W3) 收口` marker 补齐（格式与同节兄弟条目 D1-D4/W4/W5 对齐）+ 头部「文档共识审查记录」追加本 pass closure 记录 + 全节扫描兜底（69 条 backlog bullets 全部带 marker，无其他缺口）。git diff 确认仅 7 条 marker 追加 + 1 条 closure 记录追加，无 Phase Status / Work Items / Dependency Graph / Cross-Cutting / Rule 正文语义改动。Closure-audit 由独立 fresh-session sub-agent 执行，verdict `approved`（零 Blocker/Major/Minor）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session sub-agent（task `ses_030fcd1d1ffeZzFWdQFH7RsMTM`，未参与起草/执行）
- Verdict: `approved`（零 Blocker / 零 Major / 零 Minor）
- Evidence:
  - `git diff --stat`：1 file changed, 8 insertions(+), 7 deletions(-)，匹配预期（7 per-line marker append + 1 header closure record append）。
  - `git diff` 仅 3 hunk：(a) 头部追加 closure bullet；(b) roadmap:444-449 L1-L6 各加 marker；(c) roadmap:462 W3 加 Phase 3 marker。无其他 hunk，diff 严格限定在头部 closure 块 + Follow-up Backlog 节。
  - Phase 映射逐条 cross-check 通过 roadmap:25 plan `2026-08-04-2243-1` closure 记录：L1/L2/L3→Phase 1、L4/L5→Phase 2、L6/W3→Phase 3 全部精确吻合。
  - 全节扫描 `awk 'NR>=366 && NR<=484 && /^- / && !/收口/'` 无输出；范围内 69 条 backlog bullets 全部带 marker。
  - 头部 closure 记录（roadmap:29）与 per-line marker 不自相矛盾，Phase 分解内部一致。
  - per-line marker 格式与兄弟条目 D1-D4/W4/W5 对齐（`**已由 plan \`<id>\` Phase N（Lx/W3）收口\*\*：摘要（Proof: 断言）`）。
  - Non-Goal 保护：Phase Status（roadmap:49-71）/ Work Items / Dependency Graph / Cross-Cutting / Rule（roadmap:485+）零改动。

Follow-up:

- 无 plan-owned 剩余工作。继承的 non-blocking follow-up（`scada-image loadFailed` 画布级诊断、mock bounds API 升级、pinch 锚点复核等）维持现状，见「Non-Blocking Follow-ups」节。
