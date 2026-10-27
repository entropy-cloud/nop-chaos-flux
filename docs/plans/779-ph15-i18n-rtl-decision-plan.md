# 779 PH-15 i18n/RTL 边界裁定（decision-only）

> Plan Status: completed
> Last Reviewed: 2026-10-27
> Source: `docs/backlog/platform-hardening-roadmap.md` PH-15（D 组 decision-only；"即使结论是不做也必须产出显式 non-goal 文档"）
> Related: 裁定两语言是否为产品边界（类型锁死的正当性）、第三语言扩展路线，以及 RTL 是否支持。

## Purpose

- `SupportedLanguage = 'zh-CN' | 'en-US'`（`i18n.ts:7`）类型锁死；`addResources`（`:134`）支持运行时追加资源但语言集合不可扩；`check:i18n-keys` 门禁完善（两语言 key 对齐）。
- RTL：无产品级支持；仅 Base UI/shadcn 继承的局部残留（`packages/ui/src/components/ui/sidebar-layout.tsx` 的 `dir` 透传、`packages/ui/src/components/ui/calendar.tsx:95-96` 的 `rtl:` variant）。
- 无第三语言或 RTL 的宿主需求记录。

## Current Baseline

2026-10-27 live（HEAD `234fa21fa`）：

- `12-i18n.md` 新节 "语言边界与 RTL 裁定"：①**裁定：两语言为当前产品边界**——`SupportedLanguage` 锁死的正当性 = `check:i18n-keys` 的完备性保证依赖封闭集合（开放集合则 key 对齐门禁退化为逐语言可选）；②扩展路线（翻转条件 = 第三语言需求）：`SupportedLanguage` 加联合成员 + locales 目录新增 + `check:i18n-keys` 自动覆盖，宿主侧经 `addResources` 追加——successor 为单 plan；③**RTL：显式 non-goal**——无需求、Base UI 残留不构成承诺；翻转条件 = RTL 宿主需求。
- roadmap PH-15 回写。

## Goals

- i18n/RTL 边界裁定落 12-i18n.md（两语言为当前产品边界 + 类型锁死正当性 + 扩展路线；RTL 显式 non-goal）
- `flux-guide/12-i18n.md`（追加 "语言边界与 RTL 裁定" 节） 落地（最终态表述）
- roadmap PH-15 行回写 + daily log

## Non-Goals

- 不加语言、不改 `SupportedLanguage`、不做 RTL 支持
- `flux-guide/12-i18n.md`（追加 "语言边界与 RTL 裁定" 节） 之外的任何文档
- 裁定翻转后的 successor 实施（触公共导出面/包边界者 plan-first + 人确认）

## Scope

### In Scope

- `flux-guide/12-i18n.md` 的 "语言边界与 RTL 裁定" 节
- roadmap PH-15 行回写、daily log

### Out Of Scope

- 不加语言、不改 `SupportedLanguage`、不做 RTL 支持
- 裁定翻转后的 successor 实施（触公共导出面/包边界者 plan-first + 人确认）

## Failure Paths

不适用：纯裁定文档，无运行时行为变更。

## Test Strategy

本档选择：`不适用：纯文档裁定，无行为变更`（Closure Gates 仅保留 `pnpm check`；注意 `check:active-doc-code-anchors` 扫描面不含 `flux-guide/`，owner doc 由 closure audit 直接核对）。

## Execution Plan

### Phase 1 - Decision：裁定落 owner doc

Status: planned
Targets: `flux-guide/12-i18n.md` 的 "语言边界与 RTL 裁定" 节

- Item Types: `Decision`

- [x] 新节落成（含 `packages/ui/...` 全路径勘误）。

Exit Criteria:

- [ ] 裁定节存在且与 live 事实一致（closure audit 逐条核对）。

### Phase 2 - 回写

Status: planned
Targets: roadmap、daily log

- Item Types: `Fix`

- [ ] roadmap PH-15 `todo`→`planned`（active 时记）→`done`；daily log。

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

### 第三语言试点 / RTL

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 均为条件触发；扩展路线已写明。
- Successor Required: `no`

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 裁定落 owner doc（最终态），R2 `pass` + closure audit `approved`（776 经孤儿行修复复核）。

Closure Audit Evidence:

- Auditor / Agent: fresh-session sub-agent `agent_5d539ac8`（2026-10-27）
- Evidence: SupportedLanguage 与 RTL 残留路径核实；两语言边界正当性（check:i18n-keys 封闭集合）核实；`pnpm check` exit 0 复跑

Follow-up:

undefined
