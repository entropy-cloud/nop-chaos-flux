# X3 命名规范基线（Naming Conventions Baseline）

> Plan Status: completed
> Package: components-improvement
> Work Item: X3
> Last Reviewed: 2026-06-21
> Source: `docs/components/existing-components-improvement-roadmap.md`（X3 / Q1）、`docs/components/existing-components-improvement-analysis.md` §0.2 / §5 / §9、`docs/references/naming-conventions.md`（当前占位 stub）
> Related: `docs/plans/2026-06-21-0255-x5-flux-decision-tables-plan.md`（X5，硬依赖本计划）

## Purpose

把 `docs/references/naming-conventions.md` 从 15 行占位 stub 收口为一份**成文的、对齐 shadcn/ui 的 Flux 属性命名基线**，并裁决待决问题 Q1（"是否先产出 naming-conventions.md 作为 X3 依据"）。本文档是后续所有 E1/E2 改进项新增字段的审查依据（X5 与 E1/E2 的硬前置）。

## Current Baseline

- `docs/references/naming-conventions.md` 当前是 15 行占位文件：`Status: planned（X3 工作项，尚未成文）`，仅有 Purpose 与说明，无任何命名规则正文。建立此 stub 的唯一原因是 `scripts/check-active-doc-code-anchors.mjs` 要求被 roadmap 引用的文件必须存在。
- `docs/components/existing-components-improvement-analysis.md` §0.2 已列 6 条 Flux 设计原则；§5 已列"不采纳清单"与初步 shadcn 命名映射方向（`variant` 非 `level`、option `{label,value}`、`clearable`/`searchable` 明确布尔）。
- `packages/ui/src/index.ts` 导出的 shadcn/ui 组件（`Button`/`Input`/`Select`/`Combobox`/`Checkbox`/`Switch`/`Dialog`/`Drawer` 等）已确立 **de facto** 命名事实，但未在任何单一文档里成文为基线。
- `docs/components/input-number/design.md` 的"AMIS 功能评估与首版决定"表是当前最接近的命名决策范例，但其主语是 AMIS（列：AMIS 功能/价值评估/首版决定/理由），roadmap X5 要求改为 Flux 决策主语。
- 待决问题 Q1（analysis §9.1）尚未裁决；analysis 给出建议"是"，但无人正式落定。
- E0a–E0d 漂移修复计划已关闭，其 `Deferred But Adjudicated` 节均为空（无非阻塞残余）；`Non-Blocking Follow-ups` 全部路由到 E1d/E2d/E3，**无任何孤立 deferred 项落入 X3 范围**。

## Goals

- `docs/references/naming-conventions.md` 成文为完整命名基线，覆盖：命名原则、shadcn/ui 命名映射表、amis 不采纳清单（含理由）、按字段类型的命名规则、新增字段审查清单。
- 正式裁决 Q1 = yes（产出本文档作为 X3 依据），并在文档与 analysis 间消除"尚未成文"的悬置状态。
- 文档内容与 live `@nop-chaos/ui` 导出及 `input-number/design.md` 决策范例保持一致（不臆造组件或 prop）。

## Non-Goals

- **不**编写任何组件 design.md 的 Flux 决策表（那是 X5，见 Related plan）。
- **不**实现任何 E1/E2 功能代码。
- **不**覆盖移动端响应式命名（归 `mobile-roadmap.md`）。
- **不**重写主 `roadmap.md` 的新组件命名（本基线只管现有组件改进项的新增字段）。
- **不**做向后兼容 alias 的全量迁移；只确立新字段的命名准则。

## Scope

### In Scope

- `docs/references/naming-conventions.md` 的完整成文。
- Q1 裁决记录。
- 与 analysis §0.2/§5、roadmap X3 条目、`@nop-chaos/ui` 导出的一致性核对。

### Out Of Scope

- 各组件 design.md 决策表（X5）。
- 任何 `packages/*/src/` 代码改动。
- P2/P3 组件的逐项命名裁决（随 E3 按需启动）。

## Failure Paths

不适用：纯文档计划，无运行时行为、无 API 契约、无鉴权/外部集成。

## Test Strategy

档位选择：不适用。

理由：本计划仅修改 `docs/` 下文件，无任何代码或行为变更。验证手段为内容一致性核对与文档锚点检查（见各 Phase Exit Criteria 与 Closure Gates），不涉及自动化测试。依据 plan-authoring-guide 的纯文档计划规则，Closure Gates 中的 `pnpm typecheck`/`build`/`lint`/`test` 已删除。

## Execution Plan

### Phase 1 - Q1 裁决与文档骨架裁定

Status: completed
Targets: `docs/references/naming-conventions.md`、`docs/components/existing-components-improvement-analysis.md`（§9.1 Q1 状态）

- Item Types: `Decision`

- [x] 裁决 Q1 = yes：产出 `naming-conventions.md` 作为 X3 依据，记录裁决理由（analysis §9.1 已建议"是"；统一命名基线是 X5/E1/E2 的硬前置，缺它则后续字段命名无审查准绳）。
- [x] 裁定文档最终结构：① 命名原则（提炼 analysis §0.2 六条）② shadcn/ui 命名映射表（prop → shadcn 对应）③ amis 不采纳清单（含理由，迁移自 analysis §5）④ 按字段类型的命名规则（布尔/枚举/选项集/事件/region）⑤ 新增字段审查 checklist。
- [x] 裁定目标读者与权威性：本文档是"新增字段命名审查的硬准绳"，与 `docs/architecture/styling-system.md`（视觉类名）职责区分（本文档只管 schema 属性命名，不管 CSS 类名）。

Exit Criteria:

- [x] Q1 裁决以一行明确结论写入本 plan 与 naming-conventions.md 的 Status Note。
- [x] 文档结构（5 节）以大纲形式写入 plan，作为 Phase 2 的填写蓝图。
- [x] owner-doc 更新：Phase 1 仅裁定，不改 live baseline；**No owner-doc update required**（裁定结果落入 Phase 2 产出）。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 2 - 成文 naming-conventions.md

Status: completed
Targets: `docs/references/naming-conventions.md`

- Item Types: `Fix`、`Decision`

- [x] 将 stub 的 `Status: planned（X3 工作项，尚未成文）` 改为 `Status: active` 并填写正文。
- [x] 编写"命名原则"节：从 analysis §0.2 提炼（不以 amis 为标尺；核心已简化统一 `when`；命名标准化 + shadcn/ui 对齐；请求下沉；前端不做导出；chart 用 recharts）。
- [x] 编写"shadcn/ui 命名映射表"：基于 live `packages/ui/src/index.ts` 导出与 `input-number/design.md` 决策范例，落定 `variant`（非 `level`）、option `{label,value}`、`clearable`/`searchable`（明确布尔）、`size`/`variant` 枚举等映射。每行必须能在 `@nop-chaos/ui` 或现有 design.md 中找到出处，不得臆造。
- [x] 编写"amis 不采纳清单"：迁移 analysis §5，每条附 Flux 理由（`level`→`variant`；`selectMode`/`joinValues`/`extractValue` 不采纳；`hotKey`/`countDown`/`isMenuItem`/`actionType` 不采纳；`visibleOn`/`hiddenOn`/`disabledOn`→统一 `when`；组件级 `api`/`initFetch`/`interval`→data-source + action）。
- [x] 编写"按字段类型的命名规则"：布尔（`clearable`/`searchable`/`disabled`/`block` 等肯定式命名，避免否定前缀）、枚举（`variant`/`size` 受控词表）、选项集（`options: {label,value}[]`）、事件（`onXxx` 句柄 vs schema `events`）、region/fragment（与 `docs/architecture/renderer-runtime.md` 一致）。
- [x] 编写"新增字段审查 checklist"：5–8 条可勾选项，供后续 X5/E1/E2 新增字段时过审（例如：是否对齐 shadcn 命名？是否记入不采纳理由？是否避免 amis 散落条件属性？）。

Exit Criteria:

- [x] `docs/references/naming-conventions.md` 五节齐全且每条映射/不采纳项可在 `packages/ui/src/index.ts` 或现有 design.md 找到出处（抽查 ≥5 条）。
- [x] stub 状态已从 `planned（尚未成文）` 移除，无残留"内容待补"措辞。
- [x] owner-doc 更新：**本 Phase 的产出即 owner-doc 本身**（naming-conventions.md）；无需另改其他 owner 文档。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 3 - 交叉引用与一致性验证

Status: completed
Targets: `docs/references/naming-conventions.md`、`docs/components/existing-components-improvement-roadmap.md`、`docs/components/existing-components-improvement-analysis.md`

- Item Types: `Proof`、`Follow-up`

- [x] 验证 roadmap X3 条目对 `docs/references/naming-conventions.md` 的引用仍解析（文件已存在且非 stub）。
- [x] 验证 analysis §9.1 Q1、§10"局限"段（"命名规范基线尚未成文…待 X3 落地后校准"）与本计划裁决一致；如 analysis 仍写"尚未成文"，更新为"已由 X3 落地"或加 `Last Updated` 注记。
- [x] 运行仓库文档锚点/引用检查脚本（如 `scripts/check-active-doc-code-anchors.mjs`）确认无断链。
- [x] 抽查 `input-number/design.md` 决策表与本基线无矛盾（该表是 X5 格式翻转到 Flux 主语前的范例，本基线应与之相容）。

Exit Criteria:

- [x] naming-conventions.md 被 roadmap/analysis 引用全部解析，无断链。
- [x] analysis 中"尚未成文"类悬置表述已同步（或显式标注 superseded by X3）。
- [x] owner-doc 更新：analysis §9.1/§10 同步为"已落地"状态。
- [x] `docs/logs/` 对应日期条目已更新。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 在 REVIEW_PLANS 步骤填写。

- Reviewer / Agent: independent fresh-session plan-review agent (REVIEW_PLANS step)
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed: Zero Blocker, zero Major. References verified against live repo (naming-conventions.md stub, roadmap X3/Q1, analysis §0.2/§5/§9.1/§10, input-number/design.md:13-31, X5 related plan). Format/completeness/scope/closure-evidence all pass. Two Minor cosmetic notes deferred to downstream audits (not recorded per guide rule).

## Closure Gates

> 纯文档计划：依据 plan-authoring-guide，`pnpm typecheck`/`build`/`lint`/`test` 已删除（无代码变更）。

- [x] `docs/references/naming-conventions.md` 五节齐全且与 live `@nop-chaos/ui` 导出及 `input-number/design.md` 一致（无臆造 prop）
- [x] Q1 已裁决并记录（Q1 = yes）
- [x] amis 不采纳清单已迁移至本文档（每条附 Flux 理由），不再仅存在于 analysis §5
- [x] roadmap X3 / analysis §9.1-§10 对本文档的引用与状态表述已同步
- [x] 文档锚点/引用检查脚本通过（无断链）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 项
- [x] 受影响 owner docs 已同步到 live baseline（naming-conventions.md 本身 + analysis 状态注记）
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据

## Deferred But Adjudicated

> 无 deferred 项。本计划 in-scope 全部 landed。

## Non-Blocking Follow-ups

- 随 E1/E2 实施过程中暴露的命名边界 case，回填本基线的"按字段类型命名规则"节（calibration，非阻塞）。
- 若 X5（Flux 决策表）发现某 shadcn 映射需要修订，回写本基线并记 `Last Updated`。

## Closure

Status Note: X3 命名规范基线已完整落地。`docs/references/naming-conventions.md` 从 15 行占位 stub 成文为五节齐全的 Flux schema 属性命名基线（命名原则 / shadcn-ui 映射表 / amis 不采纳清单 / 按字段类型命名规则 / 新增字段审查 checklist），每条映射可在 live `@nop-chaos/ui` 导出或现有 design.md 找到出处。Q1 裁决 = yes 已记录；analysis §9.1/§10 的"尚未成文"悬置状态已同步为"已由 X3 落地"。`scripts/check-active-doc-code-anchors.mjs` 通过（233 active docs，无断链）。纯文档计划，无代码变更。本基线是 X5（Flux 决策表）与 E1/E2 实现的硬前置，现可解锁。

Closure Audit Evidence:

- Reviewer / Agent: mission-driver EXEC_PLANS execution agent（fresh session）
- Evidence:
  - `docs/references/naming-conventions.md` 五节齐全，抽查映射出处：`variant`→`button.tsx:10-21`、`size`→`button.tsx:22-34`+`select.tsx:37`、`clearable`→`combobox.tsx:48`、`prefix`/`suffix`/`placeholder`→`input-number/design.md:21,23`、`disabled`/`readOnly`/`name`/`on*`/region→`field-binding-and-renderer-contract.md` Frozen Matrix（≥5 条）。
  - `scripts/check-active-doc-code-anchors.mjs` 输出 `Verified code/doc anchors in 233 active docs`（无断链）。
  - `docs/components/existing-components-improvement-analysis.md` §9.1 Q1 与 §10"局限"已改为"已由 X3 落地"。
  - `docs/components/input-number/design.md:13-31` 决策表与本基线相容（`borderMode` 拒绝 ↔ §3 样式 amis 化；`prefix`/`suffix`/`placeholder` ↔ §2 映射）。
  - `docs/logs/2026/06-21.md` 已记录 X3 条目。
  - 文本一致性核对：`Plan Status: completed`、三个 Phase `Status: completed`、全部 Exit Criteria `[x]`、Closure Gates 全 `[x]` 彼此一致。

Follow-up:

- no remaining plan-owned work（Non-Blocking Follow-ups 中的 E1/E2 calibration 与 X5 回写均明确归属后续工作项，非本 plan 残余）。
