# 559 flow-designer 杂项清理（P4.5）

> Plan Status: completed
> Last Reviewed: 2026-10-04
> Source: `docs/backlog/editor-designer-standardization-roadmap.md` §6 P4.5、§3 杂项清单；`docs/architecture/editor-designer-standard.md` §2.6/裁决①
> Related: plan 544（裁决① flow history 豁免 + P4.5 清理义务）；plan 557/558（同族先例）

## Purpose

清偿 roadmap §3 登记的 flow-designer 三项杂项：①zustand 死 peerDep；②`nodes:moved`/`nodes:updated` 杂散事件处置；③`nop-designer:test-*` 测试事件显式声明化（standard §2.6 豁免声明要求）。

## Current Baseline

- zustand：`flow-designer-core/package.json` peerDependencies + devDependencies 双登记，src 零 import（roadmap §3 "声明 zustand peerDep 但零导入"）。
- `nodes:moved`/`nodes:updated`：`core-node-commands.ts:182/198` emitMutation + `types.ts:367-368` DesignerEvent 联合成员——**零消费者**（渲染器/宿主/测试/e2e 均无监听；监听面走 documentChanged/dirtyChanged；命名外事件按 §2.6 词汇属杂散）。
- `nop-designer:test-connect`/`test-reconnect`/`test-start-reconnect`：designer-page-body.tsx（connect/reconnect listener）+ designer-canvas.tsx（start-reconnect）——window CustomEvent 测试通道，e2e 消费；standard §2.6 要求显式豁免声明（现无声存在）。

## Goals

- 删 zustand 双登记（package.json 清理）。
- 删两处 emitMutation + 类型联合两成员（零消费者实证；types.ts 留勘误注释）。
- 三处测试通道就地显式豁免声明（注释引用 §2.6）。
- 全量验证（flow-designer-core/renderers + 全仓）。

## Non-Goals

- 不迁 flow history（裁决①豁免）；不做其他 flow 清理。

## Failure Paths

| 触发                   | 行为                                          | 可重试 | 用户可见表现 |
| ---------------------- | --------------------------------------------- | ------ | ------------ |
| 隐式消费爆（事件/dep） | typecheck/全量测试把关（grep 零消费实证前置） | 是     | 无           |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`（删除类清理以全量回归为证明）。

## Execution Plan

### Phase 1 - 三项清理（Fix）

Status: completed
Targets: `packages/flow-designer-core/`、`packages/flow-designer-renderers/src/`

- Item Types: `Fix`

- [x] zustand 双登记删除
- [x] `nodes:moved`/`nodes:updated` 双 emitMutation + 类型两成员删除（types.ts 勘误注释）
- [x] 三处 `nop-designer:test-*` 就地显式豁免声明
- [x] 全量验证绿（flow-designer-core 192/192 + renderers 45 文件 284/284 + 全仓五门禁）

Exit Criteria:

- [x] 三项清理落地；全仓验证绿

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_b17a3b32-plan-review-p45）
- Verdict: pass（post-hoc review：执行前未单独送审——三项均为 roadmap §3 逐字登记的机械清理，grep 零消费实证前置 + 全量回归把关；计划文档为本文件，审查者对 live diff 复核后签署）
- Rounds: 1
- Findings addressed: 无 Blocker/Major。

## Closure Gates

- [x] zustand 死 peerDep 删除
- [x] `nodes:moved`/`nodes:updated` 杂散事件处置（零消费者删除）
- [x] `nop-designer:test-*` 测试通道显式豁免声明化
- [x] 必要 focused verification 已完成（flow-designer-core/renderers 全量 + 全仓五门禁）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`（78 tasks 全绿）
- [x] `pnpm check`（exit 0）
- [x] roadmap §6 P4.5 回写 `done`（closure audit 通过后）

## Deferred But Adjudicated

（无。）

## Non-Blocking Follow-ups

（无。）

## Closure

Status Note: 三项杂项（zustand 死 peerDep/杂散事件/测试通道声明）全部落地，全量回归绿；独立 closure audit approved。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session）【plan 627 翻转注记：10-04 时代审计无命名 agent id 属当时惯例；approved 记录 = daily log 2026-10-04 P4.5 节 + b8ef4a555 提交记录，在档】
- Evidence: 见 daily log 2026-10-04 P4.5 节与 roadmap 回写记录；删除类清理以 flow-designer-core 192/192 + renderers 284/284 + 全仓五门禁回归为证明。

Follow-up:

- no remaining plan-owned work。
