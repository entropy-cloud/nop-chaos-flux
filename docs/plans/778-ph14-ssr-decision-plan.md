# 778 PH-14 SSR 需求裁定（decision-only）

> Plan Status: completed
> Last Reviewed: 2026-10-27
> Source: `docs/backlog/platform-hardening-roadmap.md` PH-14（D 组 decision-only；"即使结论是不做也必须产出显式 non-goal 文档"）
> Related: 裁定是否存在真实宿主 SSR 场景；有则列破坏点与冒烟范围，无则显式 non-goal。

## Purpose

- 全仓零 `renderToString` / `hydrateRoot` 入口（packages + apps）；`renderer-env.md` 以 SSR/Node 作为 host 抽象的设计假设（`:152/:243/:267/:274/:287`：WebSocket 事件结构化、diagnostic 签名、`location` 可用静态桩）。
- 实际宿主：`apps/playground`（Vite SPA）+ 外部宿主经 `@nop-chaos/flux` tarball（浏览器端）。无 SSR 宿主需求记录（roadmap/logs/discussions 零命中）。
- 渲染器直接访问 `window`/`document` 的点存在于多个 renderer 包（3d/map/scada/code-editor 等 DOM 重依赖面）；`flux-react/src` 顶层 `.tsx` 零直接访问（已核）。

## Current Baseline

2026-10-27 live（HEAD `234fa21fa`）：

- `renderer-env.md` 新节 "SSR：显式 non-goal（2026-10-27）"：①**裁定：SSR 不是支持目标**——无宿主需求、DOM 重依赖渲染器族天然不可 SSR；②保留的设计约束：host 抽象继续不假设 DOM（既有条款），新增渲染器不因本裁定放松；③翻转条件 = 出现需 SSR 的宿主需求 → 届时 successor 起草"破坏点清单 + 冒烟范围"（以 `grep window\.|document\.` 分包清单为起点）。
- roadmap PH-14 回写。

## Goals

- SSR 显式 non-goal 落 renderer-env.md（无宿主需求；保留 host 抽象不假设 DOM 的既有约束；翻转条件）
- `docs/architecture/renderer-env.md`（追加 "SSR：显式 non-goal" 节） 落地（最终态表述）
- roadmap PH-14 行回写 + daily log

## Non-Goals

- 不做破坏点逐项清单、不做 SSR 冒烟、不改渲染器
- `docs/architecture/renderer-env.md`（追加 "SSR：显式 non-goal" 节） 之外的任何文档
- 裁定翻转后的 successor 实施（触公共导出面/包边界者 plan-first + 人确认）

## Scope

### In Scope

- `docs/architecture/renderer-env.md` 的 "SSR：显式 non-goal" 节
- roadmap PH-14 行回写、daily log

### Out Of Scope

- 不做破坏点逐项清单、不做 SSR 冒烟、不改渲染器
- 裁定翻转后的 successor 实施（触公共导出面/包边界者 plan-first + 人确认）

## Failure Paths

不适用：纯裁定文档，无运行时行为变更。

## Test Strategy

本档选择：`不适用：纯文档裁定，无行为变更`（Closure Gates 仅保留 `pnpm check`，含 `check:active-doc-code-anchors` / `check:owner-doc-semantics` / 文档体积门）。

## Execution Plan

### Phase 1 - Decision：裁定落 owner doc

Status: planned
Targets: `docs/architecture/renderer-env.md` 的 "SSR：显式 non-goal" 节

- Item Types: `Decision`

- [x] 新节落成；`check:active-doc-code-anchors` 绿（368→371 active docs，行号锚未破坏）。

Exit Criteria:

- [ ] 裁定节存在且与 live 事实一致（closure audit 逐条核对）。

### Phase 2 - 回写

Status: planned
Targets: roadmap、daily log

- Item Types: `Fix`

- [ ] roadmap PH-14 `todo`→`planned`（active 时记）→`done`；daily log。

Exit Criteria:

- [x] `pnpm check` exit 0（R2 与 closure audit 各自复跑） exit 0。

## Draft Review Record

- Reviewer / Agent: fresh-session sub-agents（R1 `agent_646f9eab`、R2 `agent_804bb21c`，四 plan 同批判定），2026-10-27
- Verdict: R1 `fail`（系统性 Major：Goals/Non-Goals/In/Out 内容旋转 + 各自 Minor）→ R2 `pass`
- Rounds: 2
- Findings addressed: Major——四节内容旋转全修正；Minor——776 index.md 强制登记 + 43→45 勘误注、777 无消费者明示、778 锚偏移复验注、779 全路径。R2 独立复核四裁定文档与 live 事实一致。

## Closure Gates

- [x] 裁定文档落 owner doc，含显式 non-goal / 条件与 successor 触发
- [x] 裁定依据的 live 事实逐条可核（R2 独立抽查）
- [x] 由独立子 agent（fresh session）执行的 closure audit 已完成并记录证据——R1 `agent_646f9eab` 四 `fail` → 修订 → R2 `agent_804bb21c` 四 `pass` → closure `agent_5d539ac8`（2026-10-27，见 §Closure）；原始行：（四 plan 合并：R1 `agent_646f9eab` 四 `fail` → 修订 → R2 `agent_804bb21c` 四 `pass` → closure `agent_5d539ac8`：777/778/779 `approved`，776 经 index.md 孤儿行修复后由原审计者复核确认）
- [x] `pnpm check`

## Deferred But Adjudicated

### SSR 破坏点清单

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: non-goal 下无消费者；翻转时作为 successor 第一步。
- Successor Required: `no`

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 裁定落 owner doc（最终态），R2 `pass` + closure audit `approved`（776 经孤儿行修复复核）。

Closure Audit Evidence:

- Auditor / Agent: fresh-session sub-agent `agent_5d539ac8`（2026-10-27）
- Evidence: renderToString/hydrateRoot 零命中核实；SSR 节保留 host 不假设 DOM 约束；`pnpm check` exit 0 复跑

Follow-up:

undefined
