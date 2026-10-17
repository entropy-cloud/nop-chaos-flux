# 626 advisory 扫描器 ratchet + 热路径 stringify 等价残留（deep-audit B1-B4）

> Plan Status: completed
> Last Reviewed: 2026-10-17
> Source: docs/analysis/2026-10-16-deep-audit-report.md §3（B1-B4）
> Related: scripts/baselines/scanner-baselines.json、scripts/audit/find-async-without-failure-path.mjs、scripts/audit/find-react19-optimization-candidates.mjs

## Purpose

把两个未基线化的 advisory 扫描器（async-without-failure-path、react19-optimization-candidates）纳入计数 ratchet（冻结现状、防增长）；消除两处克隆比较热路径的残留全量 stringify（B3/B4——身份快路径后引用必异的克隆比较场景）。

## Current Baseline

- B1：`find-async-without-failure-path` 330 hits（2026-10-16 实测；非基线化）。抽查 [high] 桶头部样本均为形态学误报（button.tsx/tree-session.ts 实有完整失败路径）——批量裁决归 follow-up，本 plan 只做 ratchet 冻结。
- B2：`find-react19-optimization-candidates` 649 hits（2026-10-16 审计值；R2 复审时点实测已漂移至 650——以执行时点实测为准）。info 级；derived-state 桶的逐条裁决归 follow-up。
- B3：`packages/flux-print-renderers/src/editor/print-domain-adapter.ts` 的 `printValuesEquivalent`（原 stringify 回落 :127；plan 626 落地后函数体为结构等价实现）——身份快路径后回落 `JSON.stringify(a) === JSON.stringify(b)`；编辑器更新路径上的克隆文档引用必异 → 每次比较分配全量字符串（R2-P20 残留）。
- B4：`packages/flow-designer-core/src/core/clone.ts:60` `documentsEquivalent`——节点 data 引用异时逐节点 `JSON.stringify`；relayout no-op 检查在克隆产物上运行（R2-P14 同族残留）。调用点 `tree-session-impl.ts:315`。
- 既有语义约束：两处的 stringify 比较**键序敏感**（`JSON.stringify({a,b}) ≠ JSON.stringify({b,a})`）。打印文档经 serialize/parse 往返（键序稳定）；替换实现必须**逐字节保持键序敏感语义**（不得顺手改为无序深度相等——那是行为变更）。
- scanner ratchet 机制：scanner-baselines.json 手编单值（plan 624 已同步 lastUpdated 与 notes 先例）。**`scripts/check-scanner-baselines.mjs` 的 `BASELINED_SCANNERS` 为硬编码 5 项清单**（驱动 --update-baselines 重写——不加项则下次重写会静默丢掉新 ratchet；plan 601 先例 = 加扫描器必须同步该清单与 "five" 措辞）。
- xlang 域（并发会话）的 hits 不计入本 plan 基线（其领地；基线登记时按其提交时点实测）。

## Goals

- B1/B2：两扫描器计数入 scanner-baselines ratchet（执行时点实测值 + reRegistrationNotes 裁决理由：形态学误报族待批量裁决 / info 级优化清单）；`check:scanner-baselines` 绿且覆盖 7 个扫描器。
- B3/B4：两处比较替换为**无字符串分配的键序敏感结构等价**（早退递归；语义与 stringify 逐字节一致）；focused 判别测试（含键序分歧用例——旧实现判不等、新实现必须同判不等）。
- 全链验证（typecheck/build/lint/test/check）除既有红外零新增。

## Non-Goals

- 不做 async 330 hits / react19 649 hits 的逐条裁决（follow-up：async [high] 桶批量裁决 + derived-state 桶 flux-renderers-\* 清扫）。
- 不改 stringify 比较的键序敏感语义（不做无序 deep-equal）。
- 不引入共享工具包/flux-core 新导出（两处各自包内 15 行级 helper，duplicates 门禁阈值内）。
- 不动 xlang 域。

## Scope

### In Scope

- `scripts/baselines/scanner-baselines.json`（+2 扫描器计数）
- `packages/flux-print-renderers/src/editor/print-domain-adapter.ts`（B3 + focused test）
- `packages/flow-designer-core/src/core/clone.ts`（B4 + focused test）

### Out Of Scope

- 两扫描器的命中裁决与修复；flux-core 导出面；xlang 域

## Failure Paths

| 场景           | 触发                                              | 行为                                  | 可重试 | 用户可见表现    |
| -------------- | ------------------------------------------------- | ------------------------------------- | ------ | --------------- |
| semantic-drift | 新等价实现与 stringify 判定分歧                   | 判别测试红即停下修复（不得放宽测试）  | 是     | focused test 红 |
| count-drift    | 扫描器实测计数与 10-16 审计值不符（并发会话提交） | 以执行时点实测登记；差异在 notes 注明 | 是     | 基线 notes      |

## Test Strategy

建议有测：B3/B4 各补 focused 判别测试（等价/不等/键序分歧/早退路径），先红后绿不适用（替换非缺陷修复——判别力由"新实现必须与 stringify 判定逐例一致"承载）。

## Execution Plan

### Phase 1 - 扫描器 ratchet（B1、B2）

Status: completed
Targets: `scripts/baselines/scanner-baselines.json`、`scripts/check-scanner-baselines.mjs`

- Item Types: `Fix`

- [x] 实测：async **330**（3 buckets）/ react19 **650**（4 buckets；较审计值 649 漂移 +1）
- [x] scanner-baselines 手编 +2 计数 + reRegistrationNotes（B1 形态学误报族冻结登记 + B2 info 级清单冻结 + xlang 领地注记）
- [x] `BASELINED_SCANNERS` 扩至 7 项 + 脚本注释与 `_header.description` 的 "five"→"seven" 同步
- [x] `check-scanner-baselines` 绿（within baseline）

Exit Criteria:

- [x] 7 个扫描器计数全部在册且 exit 0
- [x] `BASELINED_SCANNERS` 含 7 项（grep 判据）且脚本/header 无 "five" 残留（实测零命中）
- [x] notes 含两扫描器的登记理由与实测时点

### Phase 2 - B3/B4 结构等价替换 + 判别测试

Status: completed
Targets: `packages/flux-print-renderers/src/editor/print-domain-adapter.ts`、`packages/flow-designer-core/src/core/clone.ts`

- Item Types: `Fix`、`Proof`
- Targets 追加：`packages/flow-designer-core/src/core/clone-equivalence.test.ts`（既有）、`packages/flux-print-renderers/src/editor/print-domain-adapter.test.ts`（既有）

- [x] B3：`printValuesEquivalent`（:127）回落替换为包内 `jsonOrderSensitiveEquals`（递归、键序敏感、effectiveKeys 过滤 undefined/function 键、seen-pair 循环守卫）——偏差登记册落 helper 头注（循环/Date/NaN/BigInt）；**执行中修复两处**：初版缺循环守卫（栈溢出）→ seen-pair 保守判不等；undefined 键须在键数比较前过滤（stringify 序列化时跳过）→ effectiveKeys
- [x] B4：`documentsEquivalent` 逐节点 stringify 替换为包内 `nodePayloadEquals`——**调用点 `?? null` 归一保留**（undefined ≡ null 边界钉死）；与 print helper 有意分叉（无数组/函数槽处理）防 duplicates
- [x] 判别测试两包各一 describe（9 类用例：深等/键序分歧/嵌套不等/数组长度/undefined≡缺席/B4 undefined≡null 归一/NaN 偏差/循环 boundary 不抛不挂/round-trip 构造）
- [x] focused 全绿：print **85/85**、flow **205/205**（closure R2 修复轮新增 flow NaN pin 后复跑）；两包 typecheck exit 0

Exit Criteria:

- [x] 两处源码无 `JSON.stringify(` 等价比较残留（实测：余下命中 = clone.ts:43 clone 用途 + adapter :105 serialize 用途 + 注释——均在判据豁免内）
- [x] 判别测试覆盖 9 类用例且全绿（键序分歧 + B4 归一 + 偏差登记 boundary = 语义契约锚）
- [x] 两包 focused 测试绿（print 85/85 / flow **205/205**——既有测试文件扩展；【R2 后 sync】204 为修复轮前计数）

## Draft Review Record

- Reviewer / Agent: 独立子代理 agent_a6dc7414（fresh session，R1 + R2 两轮）
- Verdict: R1 fail（0 Blocker / 2 Major / 3 Minor，全量修订）→ R2 **pass-with-minors**（0B/0M/3 residual minors 随执行落：baseline :126→:127 同步、测试类目计数口径 8/9 对齐、Goals "逐字节一致"措辞限定 JSON-safe 值域）
- Rounds: 2
- Findings addressed: M1 check 脚本 BASELINED_SCANNERS 硬编码清单扩 7（--update-baselines 丢 ratchet 防御 + "five" 措辞同步）；M2 语义契约钉死（JSON-safe 值域 + 5 项偏差登记册 + boundary tests + B4 `?? null` 归一保留 + 两 helper 有意分叉防 duplicates）；m3 react19 计数漂移注记（650）；m4 duplicates 缓解；m5 行号 :127

## Closure Gates

- [x] 所有 in-scope 项落地（Phase Exit Criteria 全勾）
- [x] `check:scanner-baselines` 绿（7 扫描器）
- [x] `pnpm typecheck`/`build`/`lint`/`test`（本 plan 变更后全仓复跑：lint 44/44 绿；build 43/44 + test 80/82——唯红 = 既有披露红 playground vite.config/db67dba02，与 624 收口基线一致；两包 focused 85/85 + 205/205）
- [x] `pnpm check` 零新增红（复跑实测：duplicates 503 << 597 基线——新 helper 未成 clone；scanner 门禁绿；唯红 = knip xlang hit 已登记；knip 之后 3 个子门禁单独补跑全绿 raw-schema/metamodel/designer-conformance）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] 当日 daily log 已记录

## Deferred But Adjudicated

### B1 async 330 hits 批量裁决

- Classification: `optimization candidate`
- Why Not Blocking Closure: 抽查 [high] 桶头部均为形态学误报；批量裁决需逐条人工核对 282 个 production hits，属独立治理轮
- Successor Required: `no`（登记 follow-up；ratchet 已冻结增长）

### B2 derived-state-in-effect 43 hits 清扫

- Classification: `optimization candidate`
- Why Not Blocking Closure: info 级 React19 优化候选，非缺陷；ratchet 已冻结
- Successor Required: `no`（登记 follow-up）

## Non-Blocking Follow-ups

- async [high] 桶批量裁决轮（282 production hits 逐条定性）
- derived-state-in-effect 在 flux-renderers-\* 的逐条清扫
- scripts/three-perf/bench-scene-graph.mjs 处置（plan 624 移交）

## Closure

Status Note: 2026-10-17 收口。两扫描器入 ratchet（330/650，BASELINED_SCANNERS 同步扩 7 防 --update-baselines 丢基线）；B3/B4 stringify 等价比较替换为递归键序敏感结构等价（无字符串分配；JSON-safe 值域语义契约 + 5 项偏差登记册 + seen-pair 循环守卫 + B4 `?? null` 归一保留）；判别测试两包 9 类全绿（print 85/85、flow 205/205）。执行中两处自捕修复（循环守卫缺失、undefined 键需在键数比较前过滤）均被判别测试与 focused 套件按设计暴露。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理 agent_ba5c1f96（fresh session，R1 + R2 两轮）
- Evidence: R1 issues（Major 1：Phase 1 exit 声称 "five 实测零命中" 而 JSON header 未同步——声称-实况漂移；3 Minor：BigInt 偏差未入册/flow NaN 未测/基线 :126 指针陈旧）→ 五处修复（header 同步 + BigInt 入册 + flow 域界注记 + flow NaN pin 测试 + 指针改函数名引用）→ R2 **approved**（0B/0M；门禁独立复跑 exit 0 within-baseline；六文件 diff 无越界；判别测试"旧实现必挂"验证成立——NaN 与循环用例在旧 stringify 实现下不成立）。R2 条件回写（本 commit）：flow 计数 204→205 三处 sync + R2 轮记录；残项注记 = 624 的 root package.json hunk 以独立 follow-up commit 落盘（next commit，归属 624）。
