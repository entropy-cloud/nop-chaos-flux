# 777 PH-13 schema 演进裁定（decision-only）

> Plan Status: completed
> Last Reviewed: 2026-10-27
> Source: `docs/backlog/platform-hardening-roadmap.md` PH-13（D 组 decision-only；"即使结论是不做也必须产出显式 non-goal 文档"）
> Related: 裁定 Flux JSON schema 的版本字段与旧 schema 兼容/迁移 hook 契约：是否引入全局版本字段、谁负责迁移、何时触发。

## Purpose

- 全仓仅 `flux-print-core` 的打印文档模型有 `schemaVersion: 1`（`schemas.ts`）；Flux 页面 schema（`type`/`body`/`xui:*` 等）无版本字段。
- schema 消费链：`flux-compiler` 编译 + `schema-file-validator`（protected area，plan-first）校验；无任何"按版本分支"的代码路径；无迁移 hook。
- 兼容性现实：schema 变更历来以"向后兼容加法 + 弃用注记"推进（AGENTS Feature Deprecation 规则），未发生过需要迁移脚本的破坏性变更。

## Current Baseline

2026-10-27 live（HEAD `234fa21fa`）：

- `flux-json-conventions.md` 新节 "Schema 版本与演进"：①**裁定：不引入全局版本字段**（现阶段）——理由：零破坏性变更史、加法式演进 + deprecation 流程已覆盖、版本字段无消费者即是幻影契约（PH-3 门禁反对的那类）；②保留字名 `$schemaVersion`（顶层，可选）**预留不启用**，首个破坏性变更时启用并同时提供迁移 hook（契约草案：`migrateSchema(input, fromVersion) => SchemaInput`，由 `flux-compiler` 入口前置调用）；③翻转条件 = 首个无法以加法表达的变更进入 plan；④print-core 的 `schemaVersion: 1` 为文档模型局部版本，与页面 schema 无关，维持。
- roadmap PH-13 回写。

## Goals

- schema 版本与演进裁定落 conventions 文档（不引入全局版本字段；保留字 + hook 契约草案 + 翻转条件）
- `docs/references/flux-json-conventions.md`（追加 "Schema 版本与演进" 节） 落地（最终态表述）
- roadmap PH-13 行回写 + daily log

## Non-Goals

- 不改 schema-file-validator / compiler、不添加字段、不实现迁移 hook
- `docs/references/flux-json-conventions.md`（追加 "Schema 版本与演进" 节） 之外的任何文档
- 裁定翻转后的 successor 实施（触公共导出面/包边界者 plan-first + 人确认）

## Scope

### In Scope

- `docs/references/flux-json-conventions.md` 的 "Schema 版本与演进" 节
- roadmap PH-13 行回写、daily log

### Out Of Scope

- 不改 schema-file-validator / compiler、不添加字段、不实现迁移 hook
- 裁定翻转后的 successor 实施（触公共导出面/包边界者 plan-first + 人确认）

## Failure Paths

不适用：纯裁定文档，无运行时行为变更。

## Test Strategy

本档选择：`不适用：纯文档裁定，无行为变更`（Closure Gates 仅保留 `pnpm check`，含 `check:active-doc-code-anchors` / `check:owner-doc-semantics` / 文档体积门）。

## Execution Plan

### Phase 1 - Decision：裁定落 owner doc

Status: planned
Targets: `docs/references/flux-json-conventions.md` 的 "Schema 版本与演进" 节

- Item Types: `Decision`

- [x] 新节落成，含"无消费者、无校验"明示。

Exit Criteria:

- [ ] 裁定节存在且与 live 事实一致（closure audit 逐条核对）。

### Phase 2 - 回写

Status: planned
Targets: roadmap、daily log

- Item Types: `Fix`

- [ ] roadmap PH-13 `todo`→`planned`（active 时记）→`done`；daily log。

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

### 迁移 hook 实现

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 无破坏性变更触发；契约草案已定义，实现随首个触发变更立项。
- Successor Required: `no`

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 裁定落 owner doc（最终态），R2 `pass` + closure audit `approved`（776 经孤儿行修复复核）。

Closure Audit Evidence:

- Auditor / Agent: fresh-session sub-agent `agent_5d539ac8`（2026-10-27）
- Evidence: schemaVersion 唯一性核实；§11「无消费者无校验」明示在位；`pnpm check` exit 0 复跑

Follow-up:

undefined
