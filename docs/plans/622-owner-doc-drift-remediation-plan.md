# 622 owner-doc 漂移收敛（deep-audit 2026-10-16 findings A1-A12）

> Plan Status: completed
> Last Reviewed: 2026-10-17
> Source: docs/analysis/2026-10-16-deep-audit-report.md §2（五路深审之架构漂移路，全部两侧比对证实）
> Related: docs/plans/00-plan-authoring-and-execution-guide.md（Minimum Rule 14）；并发会话领地排除声明（xlang 域不涉本 plan）

## Purpose

把 2026-10-16 深度审计确认的 12 处 owner-doc 漂移收敛：`docs/architecture/` 与 `docs/references/quick-reference.md` 的契约表述与 live code 一致，消除"规范文档误导实现者"的确认漂移（6 处 confirmed-drift、1 处 Rule 14 违规、2 处 stale stamp、3 处 minor）。

## Current Baseline

- `check-active-doc-code-anchors` 357 docs 全绿——行级锚点无漂移，本 plan 全部是语义级漂移。
- A1：`docs/architecture/form-validation.md:707` 声称 ValidationRule kind "**exactly**" 17 个；live `packages/flux-core/src/types/validation.ts:22-24` 另有 `url`/`integer`/`format`（646d16ba4 引入）。
- A2：`form-validation.md:711` 裁决注记称 isInt parity "not modeled（零命中）"；live `packages/flux-runtime/src/validation/validators.ts:214-218` `integer()` validator + `validation.integer` i18n key 即该 parity（min/max 范围规则确未建模，该半边表述保留）。
- A3：`docs/references/quick-reference.md:269` env 字段表列已删除的 `monitor`；缺 `reportSchemaDiagnostics`（`packages/flux-core/src/types/renderer-api.ts:273`）。
- A4：`quick-reference.md:87` SchemaFieldKind 列 7 成员；live `packages/flux-core/src/types/schema.ts:62-75` 有 12（缺 `value`/`schema`/`schema-array`/`action`/`literal`）。
- A5：`docs/architecture/styling-system.md:444` 写 `nop-hairline--top` 等 BEM 式类名；live `packages/ui/src/styles/mobile.css:35-38` 为单横线 `.nop-hairline-top`，全仓零 `--` 形态命中；doc 自身 :481 禁 `--modifier`。
- A6：`quick-reference.md:576` 称 `useCurrentNodeMeta()` 返回 `ResolvedNodeMeta`；live `packages/flux-react/src/context-hooks.ts:54` 返回 `RenderNodeMeta`。
- A7：`docs/architecture/performance-diagnostics-and-e2e-design.md:368` "### Proposed Bounded Diagnostic Events" 残留 Proposed-vs-Current 叙事（Minimum Rule 14 违规，全 architecture 目录唯一）；:285 另有 "Proposed source" 表列。
- A8/A9：performance-diagnostics doc **无 Last Reviewed stamp**（头部无状态块，最后编辑 2026-06-21 git f039cf99d；subject 领域 8 月以来 10 commits）——需补齐 stamp；`flux-page-dict-loading-and-precompile.md:4` Last Reviewed 2026-07-08——需刷新。
- A10/A11：`renderer-env.md:324` 行号锚（live `decorateRendererEnv` 在 :52）；:16 RendererEnv 行号 stamp（live :219）。
- A12：`quick-reference.md:562` `useCurrentFormFieldState` 返回类型实为 `FormFieldStateSnapshot`（`packages/flux-react/src/hooks/use-form-hooks.ts:245-248`）。

## Goals

- A1-A6、A12：六处契约表述修正为 live 语义（kind 清单、isInt 裁决注记、env 字段表、SchemaFieldKind 联合、hairline 类名、两个 hook 返回类型）。
- A7：Proposed 章节迁出 architecture doc（有保留价值的内容移入 `docs/discussions/`，否则删除并裁决）；:285 表列同步收敛。
- A8/A9：两份 stale doc 完成一轮 live-state 核对（performance-diagnostics doc 需补齐 Last Reviewed stamp，dict doc 刷新既有 stamp；核对发现新漂移则当场修正）。
- A10/A11：行号锚与 stamp 就地更新。

## Non-Goals

- 不修改任何 packages/ 代码（漂移一律以代码为准修文档；若修文档过程中发现代码本身是 bug，记 Follow-up 另行裁决）。
- 不触碰 xlang 域（`packages/flux-xlang-*`、plan 616-621 文档）——并发会话领地。
- 不重写已 completed 历史计划文本（Rule 21）。

## Scope

### In Scope

- `docs/architecture/form-validation.md`（A1、A2）
- `docs/references/quick-reference.md`（A3、A4、A6、A12）
- `docs/architecture/styling-system.md`（A5）
- `docs/architecture/performance-diagnostics-and-e2e-design.md`（A7、A8）
- `docs/architecture/flux-page-dict-loading-and-precompile.md`（A9）
- `docs/architecture/renderer-env.md`（A10、A11）
- 新增 `docs/discussions/2026-10-16-bounded-diagnostic-events-proposal.md`（仅当 A7 内容裁定为保留）

### Out Of Scope

- 本报告 P2-P5 全部其他 findings（各自独立 plan）
- `docs/architecture/` 其他未发现漂移的 doc 的通读重审

## Failure Paths

不适用（纯文档；无错误处理/API 契约/鉴权/外部集成行为变化）。

## Test Strategy

不适用：纯文档变更，无行为变化。验证 = 修改后逐条与 live code 两侧比对 + `pnpm check`（docs-garbled / active-doc-code-anchors 子门禁）零新增红。

## Execution Plan

### Phase 1 - form-validation.md 契约修正（A1、A2）

Status: completed
Targets: `docs/architecture/form-validation.md`

- Item Types: `Fix`

- [x] A1：:707 kind 清单补 `url`/`integer`/`format` 三成员（对照 `validation.ts` 逐项核语义后写入），"exactly" 表述与 live union 对齐
- [x] A2：:711 V10 裁决注记就地勘误——`integer()` validator 已落地 amis isInt parity；保留"min/max/minimum/maximum 范围规则未建模"半边并核实其仍为真
- [x] 顺带核对该 doc 其它 ValidationRule 相关节是否有同源漂移（仅核对，不扩 scope）——:670 target-state 免责声明仍准确、:715-717 非矛盾性映射仍准确、该 doc 无 Last Reviewed stamp 头

Exit Criteria:

- [x] `form-validation.md` 的 kind 清单与 `packages/flux-core/src/types/validation.ts` live union 逐项一致（20 成员，顺序一致；人工两侧比对）
- [x] V10 注记与 `validators.ts` live 行为一致，无自相矛盾表述（勘误以就地附注形态保留原裁决文本）

### Phase 2 - quick-reference.md 契约修正（A3、A4、A6、A12）

Status: completed
Targets: `docs/references/quick-reference.md`

- Item Types: `Fix`

- [x] A3：env 字段表删 `monitor` 行、补 `reportSchemaDiagnostics`（含 capability-check 语义与 renderer-env.md §3.9 交叉引用）
- [x] A4：SchemaFieldKind 联合补齐 12 成员（对照 `schema.ts:62-75` 逐项）
- [x] A6：`useCurrentNodeMeta()` 返回类型改 `RenderNodeMeta`（与 renderer-runtime.md:1006-1013 对齐）
- [x] A12：`useCurrentFormFieldState` 返回类型改 `FormFieldStateSnapshot`，注明 presentation snapshot 的产出 selector 区别
- [x] 同源残留核对：:79 `meta: ResolvedNodeMeta`（= renderer-core.ts:202 ✓）、:350 `resolveNodeMeta`（= renderer-core.ts:268 ✓）、:461 `FormFieldPresentationSnapshot extends FormFieldStateSnapshot`（= runtime.ts:109 ✓）——三处均与 live 一致，非漂移

Exit Criteria:

- [x] 四处表述与 live 签名逐字一致（`renderer-api.ts` / `schema.ts` / `context-hooks.ts` / `use-form-hooks.ts` 两侧比对）
- [x] 文内交叉引用（renderer-env.md / renderer-runtime.md）无互相矛盾

### Phase 3 - styling/perf/dict/env 四 doc 收敛（A5、A7-A11）

Status: completed
Targets: `docs/architecture/styling-system.md`、`performance-diagnostics-and-e2e-design.md`、`flux-page-dict-loading-and-precompile.md`、`renderer-env.md`

- Item Types: `Fix`、`Decision`

- [x] A5：hairline 方向修饰类名改为单横线形态并与 `mobile.css` 逐项对齐；消除与 :481 规则的自相矛盾。**[closure R1 扩充]** 同源残留清理：`mobile-responsive-baseline.md` §10.2 契约 CSS 单横线化 + 过时"todo 尚未实现"注释勘误（2026-06 已实现）、`docs/components/{table,select,tree-select,list}/design.md` 4 处用法修正、`docs/components/mobile-roadmap.md` M0.1b 行类名修正（共 6 文件，全为 A5 同一结果面）
- [x] A7 [Decision]：裁定**迁移**——提案内容（authoritative-locality 指标表 + 有界事件表 + rules）迁 `docs/discussions/2026-10-16-bounded-diagnostic-events-proposal.md`；architecture doc 原位以两处指针行指向（不保留 "Proposed" 叙事）；"Metrics Needed" 节的 live 半边（form-store diagnostics baseline）保留并改名 "Form-Store Diagnostics Baseline"
- [x] A8：performance-diagnostics doc 对照 `packages/nop-debugger/src` 现状核对（`NopDebugEventKind` 12 kind 与文列一致、controller API/`__NOP_DEBUGGER_API__`/inspect 系列/`getFormStoreDiagnosticsBridge()` 均存在），头部补齐 Last Reviewed stamp（原 doc 无状态块，最后编辑 2026-06-21 git f039cf99d）
- [x] A9：flux-page-dict-loading doc 对照 live 抽查（`useDictOptions`/`loadDictShared` 去重与正文一致），Last Reviewed 2026-07-08 → 2026-10-17
- [x] A10/A11：renderer-env.md :16 锚（:193→:219，实施字段清单补 `reportSchemaDiagnostics`）与 :324 装饰器行号锚（:26→:52 + hooks :12）更新

Exit Criteria:

- [x] 全 `docs/architecture/` grep 无 "Proposed Design"/"Proposed "/"Current vs Proposed" 残留（实测零文件命中）
- [x] `mobile.css` hairline 类名与 styling-system.md 表述逐项一致；`nop-hairline--` BEM 形态在**活跃文档**（docs/architecture、docs/components、docs/references）零残留——历史记录（docs/plans、docs/analysis、docs/audits、docs/backlog/audit-remediation-roadmap 的 R1.2 完成行、docs/lessons 的教训叙述）中的引用属历史叙事豁免，**[closure R1 修正]** 原口径"全仓零命中"失实（5+1 处活跃残留已修复，历史文本按勘误纪律不改写）
- [x] performance-diagnostics doc 头部补齐 Last Reviewed stamp（值为本轮核对日期）；flux-page-dict doc Last Reviewed 刷新为本轮核对日期；核对中发现的新漂移已当场修正或记入 daily log（无新漂移）
- [x] renderer-env.md:324 引用的 `decorateRendererEnv` 行号与 :16 的 RendererEnv 行号 stamp 同 live（`renderer-env.ts` / `renderer-api.ts`）当日实际行号一致（A10/A11）

## Draft Review Record

- Reviewer / Agent: 独立子代理 agent_9e2cda03（fresh session）
- Verdict: pass-with-minors（0 Blocker / 0 Major / 4 Minor，全部修订）
- Rounds: 1
- Findings addressed: M1 A8 基线表述改为"无 stamp 需补齐"（git f039cf99d 事实化）；M2 Phase 3 Exit Criteria 补 A10/A11 renderer-env 行号锚判据；M3 Deferred 节改为分支明确——迁 discussions 时删除本 Deferred 条目（迁移记入 Closure/Follow-up），仅"删除且不保留"分支留在 Deferred 作 optimization candidate；M4 Closure Gate 日期钉死改"当日 daily log"

## Closure Gates

> 纯文档计划：`pnpm typecheck`/`build`/`lint`/`test` 按指南豁免删除；保留 docs 相关子门禁。

- [x] A1-A12 逐条落地（Phase Exit Criteria 全勾）
- [x] 无新增 confirmed-drift 遗留（修改过程中两侧比对新发现的同源漂移已就地修正——含 closure R1 发现的 6 处 hairline 同源残留）
- [x] `pnpm check` 中 docs 相关子门禁（check:docs-garbled、check:active-doc-code-anchors）零新增红
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] 当日 daily log（`docs/logs/2026/10-17.md`）已记录本轮收敛

## Deferred But Adjudicated

（无 deferred 条目。A7 执行取**迁移**分支：提案内容已迁 `docs/discussions/2026-10-16-bounded-diagnostic-events-proposal.md`，迁移事实记入 Closure 与 Non-Blocking Follow-ups；Draft Review M3 所述"删除且不保留"分支的 `optimization candidate` 条目因分支未发生而不适用。）

## Non-Blocking Follow-ups

- `docs/architecture/` 其余 doc 的全面通读重审（本轮仅抽核 A 清单相关面）
- A2 半边核对若发现 min/max 范围规则已在别处建模，追加登记（当前证据为未建模）

## Closure

Status Note: 2026-10-17 收口。A1-A12 全部落地并经独立审计两轮证实：R1（agent_0f2c8215，issues：1M+3m）发现的 6 处 hairline 同源残留就地修复 + 3 Minor 修复；R2（同审计员，**approved**：0B/0M/0 新 Minor）确认全部 disposition 诚实、活跃文档零残留、声称-实况对账通过、docs 门禁零新增红、scope 纯 docs 无越界。执行侧清扫超出 R1 审计员的 grep 截断（select/design.md 由执行侧全量 sweep 补获）。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理 agent_0f2c8215（fresh session，R1 + R2 两轮）
- Evidence: R1 verdict `issues`（1 Major：hairline 全仓零命中声称失实 + 6 处活跃残留；3 Minor：stamp API 名/§3.9 引用/Deferred 措辞）→ 修复 → R2 verdict **`approved`**（0B/0M）：A1-A12 逐项 live 比对 12/12 PASS；`check-active-doc-code-anchors` 357 绿；`check-docs-garbled` 20 项既有误报零新增；`grep "Proposed" docs/architecture/` 零命中；活跃文档 hairline 残留零（唯一命中为勘误附注自身）；git diff 纯 docs 无越界。R1/R2 全文见审计会话记录，要点摘录于上方与 daily log。

Follow-up:

- `docs/architecture/` 其余 doc 的全面通读重审（本轮仅抽核 A 清单相关面）
- A7 迁移产物 `docs/discussions/2026-10-16-bounded-diagnostic-events-proposal.md` 的后续实现轨道（独立讨论，无本 plan 债务）
- no remaining plan-owned work
