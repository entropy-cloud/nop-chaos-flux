# 02 Industrial HMI Component Audit — HCA-LL Lesson 总结（架构/工程经验沉淀到 checklist v2 / skills / 架构文档）

> Plan Status: active
> Last Reviewed: 2026-08-08
> Mission: industrial-hmi-component-audit
> Work Item: HCA-LL. Lesson 总结
> Source: `docs/backlog/industrial-hmi-component-audit-roadmap.md` §HCA-LL（Phase Details 6 主题 + Work Item Status HCA-LL=`todo`，依赖 HCA-BL=`done`）；`docs/plans/2026-08-08-1430-1-industrial-hmi-hca-bug-summary.md`（HCA-BL closure，9 张 bug 卡 docs/bugs/77–85）；各层审计记录 `docs/audits/2026-08-08-*-hca*.md` + 2 张 per-component 审计卡；`docs/plans/2026-08-08-1430-2-industrial-hmi-hca-cross-layer-remediation.md`（HCA-CR residual 裁定表：24 P3 residual + 2 watch-only（#1/#5）+ 2 out-of-scope）
> Related: HCA-BL（done，9 bug 卡为 lesson 源材料）、HCA1–HCA11 / HCAX-1 / HCAX-2（done，审计经验源）、HCA-CV（并行 successor，全量验证，结果面独立）、HCA-CG（successor，Guard 沉淀——checklist v2 industrial 专项与 CG 共享目标，本 plan 产出 lesson 沉淀，CG 产出工具脚本/行数治理）

## Purpose

把 HCA1–HCA11 + HCAX-1/HCAX-2 全层审计的**架构/工程经验**（roadmap §HCA-LL 已列 6 主题：a11y / schema 契约 / error code 设计 / 四态契约 / React 19 / 文件行数）+ HCA-BL 归档的 9 张 bug 卡（`docs/bugs/77–85`）+ HCA-CR 24 项 watch-only residual 裁定表，**提炼为 durable 防复发工件**：`docs/audits/component-audit-checklist.md` v2（增 industrial 专项维度）、`docs/skills/deep-audit-prompts.md`（项目校准 / 相关维度增 industrial 包级提示）、相关架构文档。本 plan 是**纯文档/skills 沉淀**，不改任何代码。目标是让未来 industrial 包（及同类 canvas 场景图/编辑器子系统）的审计能直接复用这些经验，降低同类问题复发率。

## Current Baseline

> 起草前已核对 live repo（2026-08-08）。

- **HCA-BL done**：9 张 bug 卡 `docs/bugs/77–85-industrial-hmi-component-audit-*.md`（HCAX-1 error code / HCAX-2 canvas a11y / HCA5 跨层 diff 漏键 / HCA6 pipe-junction resize / HCA8 嵌套子节点归因 / HCA2 importConfig 旁路 / HCA10 undo-redo coalesce / HCA11 toolbox mode desync / HCA11 custom 浅克隆）。
- **HCA-CR done**：residual 裁定表（24 P3 residual + 2 watch-only（#1/#5）+ 2 out-of-scope，`docs/plans/2026-08-08-1430-2` §Deferred But Adjudicated + §裁定结果），每项含 Why-Not-Blocking——是「同类问题如何裁定」的现成教材。
- **roadmap §HCA-LL 已列 6 lesson 主题**：a11y（canvas wrapper `role="application"`+`aria-label`，HCA1/HCA7/HCAX-2）/ schema 契约（schema interface ↔ renderer-definitions fields 同步，HCA7 P1-1）/ error code 设计（升级码 vs 不升级码不可混用，HCAX-1）/ 四态契约（`props.meta.disabled` instance-renderer 必须消费，HCA7 P2-3）/ React 19（useCallback 在 canvas 生命周期 renderer 中逐个审查，HCA1 P3-1）/ 文件行数（dirty-collector 665 行 HCA3 已拆 3 文件 ≤500 / validate 524→现 537 行归 HCA-CG）。
- **目标工件结构**（live 核对）：
  - `docs/audits/component-audit-checklist.md`：§2「18 维检查清单」+ §3「优先级裁决」含「与 deep-audit-prompts 23 维的关系」子节。
  - `docs/skills/deep-audit-prompts.md`：含「通用审计口径」+「项目校准说明」+ 维度族 A–G（01–23）。
- **HCA-LL 当前 `todo`**（roadmap Work Item Status）；依赖 HCA-BL=`done` → 已解锁。

## Goals

- 产出 lesson 目录（catalog）：从 9 bug 卡 + 各层审计记录 + HCA-CR 24 residual 表中提炼 lesson 候选，每条含主题 / 源（审计层+bug 卡 / residual ID）/ 复发风险 / 目标工件落点，零模糊措辞。
- 把裁定为「沉淀」的 lesson 落入 durable 工件：
  - `docs/audits/component-audit-checklist.md` v2：增 industrial 专项维度（canvas 场景图引擎 / 数据绑定管线 / 序列化校验 / 符号库 / 编辑器子系统的特有检查点，超出 18 维 renderer checklist 覆盖范围的部分）。
  - `docs/skills/deep-audit-prompts.md`：在「项目校准说明」/ 相关维度（生命周期 / 错误处理 / React 集成 / 测试质量 / 架构边界）增 industrial 包级提示词。
  - 相关架构文档（如 `docs/architecture/renderer-runtime.md` 四态契约 / `docs/architecture/renderer-markers-and-selectors.md` a11y）按需同步（仅当 lesson 揭示 live doc 与经验有 gap）。
- 每条沉淀 lesson 交叉回链源 bug 卡（`docs/bugs/77–85`）/ 源审计记录，形成「lesson ↔ bug 卡 ↔ 审计记录」三向回链，便于未来审计检索复发模式。
- roadmap §HCA-LL 状态两段流转：draft review 通过 `todo`→`planned`；closure audit 通过 `planned`→`done`。

## Non-Goals

- 不改任何 `packages/flux-renderers-industrial/src/` 代码（lesson 源 bug 已在各 HCA\* plan test-first 修复）。
- 不做 HCA-CG 的工具脚本升级 / validate.ts 537 行拆分 / 文件行数治理（CG 所有权）；本 plan 只沉淀「经验」，不沉淀「工具」。
- 不重新审计 / 不发现新 finding / 不新写 bug 卡（HCA-BL done）。
- 不做 HCA-CV 全量验证（并行 successor）。
- 不重写已 `completed` 的历史 plan / 审计记录（仅回链）。
- 不为每条微小经验强开条目（遵循「真有复发价值才沉淀」）。

## Scope

### In Scope

> **LL ↔ CG 所有权边界**：LL 拥有 lesson→checklist v2 industrial 专项 enrichment（维度/检查点 + 提示词 + 回链）；CG 拥有工具脚本升级 + validate.ts 537 行拆分 + 文件行数治理，并 consume 本 plan 产出的 checklist v2 增量。本 plan 不做工具脚本 / 行数治理（CG 所有权）。

- `docs/audits/component-audit-checklist.md`（v2 增 industrial 专项维度）。
- `docs/skills/deep-audit-prompts.md`（项目校准 / 相关维度 industrial 提示）。
- 相关 `docs/architecture/*.md`（仅 lesson 揭示 live doc gap 时同步）。
- lesson 目录 + 三向回链（本 plan 内 + bug 卡 / 审计记录回链）。
- `docs/backlog/industrial-hmi-component-audit-roadmap.md` §HCA-LL 状态。

### Out Of Scope

- `packages/flux-renderers-industrial/src/`（代码）。
- `docs/bugs/`（HCA-BL done，仅回链不新写）。
- validate.ts 行数治理 / 审计工具脚本升级（HCA-CG）。
- 全量 `pnpm test:e2e` / 性能复测（HCA-CV）。

## Test Strategy

本档选择：**不适用：理由** — 本 plan 为纯文档/skills 沉淀，无代码变更、无行为变更。沉淀的 lesson 引用的回归测试已在各 HCA\* plan test-first 落地（HCA-BL closure audit 已核验），本 plan 不新增 / 不修改测试。

## Execution Plan

### Phase 1 - Lesson 目录编制（catalog + 裁定）

Status: planned
Targets: 9 bug 卡 + 各层审计记录 + HCA-CR 24 residual 表 + roadmap §HCA-LL 6 主题

- Item Types: `Decision`

- [ ] 从 9 bug 卡（`docs/bugs/77–85`）逐张提炼 lesson 候选（根因模式 / 复发风险 / 是否值得沉淀 vs 仅 bug 卡已足够）。
- [ ] 从各层审计记录 + HCA-CR residual 裁定表（24 P3 residual + 2 watch-only）提炼「同类问题如何裁定」经验（如防御纵深 vs 真实缺陷的边界、跨点 parity 识别、公共 API footgun 裁定）。
- [ ] 对齐 roadmap §HCA-LL 已列 6 主题（a11y / schema 契约 / error code / 四态 / React19 / 文件行数），补 catalog 缺口主题（如 canvas 场景图生命周期、序列化校验完整性、custom 数据隔离纪律）。
- [ ] 逐候选裁定终态：`沉淀（目标工件 + 落点）` / `不沉淀（理由：bug 卡已足够 / 无复发价值）`，落 catalog 表写入本 plan「裁定结果」节。

Exit Criteria:

- [ ] 本 plan「裁定结果」节含全量 lesson 候选，每条有终态（沉淀+落点 / 不沉淀+理由），零「optional / consider」模糊措辞。
- [ ] roadmap §HCA-LL 6 主题全部覆盖（沉淀或显式裁定不沉淀+理由）。

### Phase 2 - 沉淀到 durable 工件 + 三向回链

Status: planned
Targets: `docs/audits/component-audit-checklist.md`、`docs/skills/deep-audit-prompts.md`、相关 `docs/architecture/*.md`

- Item Types: `Fix | Follow-up`

- [ ] `Fix`：`docs/audits/component-audit-checklist.md` v2 增 industrial 专项维度节——canvas 场景图引擎（视口数学/命中/覆盖物生命周期/destroyed 门控）、数据绑定管线（点表/脏收集合帧/动画时钟）、序列化校验完整性（子形状/malformed/枚举字段）、符号库（applyProps 路由/extent-resize/custom 深克隆隔离）、编辑器子系统（状态机/事务边界/合并窗口/pointer 挂载层级），每维度含「检查什么 + 对应 bug 卡回链」。
- [ ] `Fix`：`docs/skills/deep-audit-prompts.md`「项目校准说明」/ 相关维度（生命周期维度 07 / 错误处理 / React 集成 / 测试质量 / 架构边界）增 industrial 包级提示（如「canvas renderer wrapper 必查 role/aria-label」「跨点 custom 克隆一致性」「error code 升级码 vs 命令句柄码不可混用」「useCallback 在 canvas 生命周期 renderer 逐个审查」）。
- [ ] `Fix`：相关架构文档（如 `renderer-runtime.md` 四态契约 / `renderer-markers-and-selectors.md` a11y）仅当 lesson 揭示 live doc gap 时同步（无 gap 不改，不凑条目）。
- [ ] `Follow-up`：三向回链——沉淀条目回链源 bug 卡（`docs/bugs/77–85`）；bug 卡「Notes For Future Refactors」回链对应 lesson 落点；审计记录「喂入 HCA-LL」节（若存在）回链 catalog 终态。

Exit Criteria:

- [ ] `component-audit-checklist.md` v2 industrial 专项维度节存在，每维度含检查点 + bug 卡回链（live 文件可观测）。
- [ ] `deep-audit-prompts.md` 项目校准 / 相关维度含 industrial 提示（live 文件可观测）。
- [ ] 架构文档同步项（若有）已落地，无 gap 处未凑条目。
- [ ] 三向回链成立（抽查：≥3 条沉淀 lesson ↔ bug 卡双向链接可追溯）。

### Phase 3 - roadmap 状态 + 收口

Status: planned
Targets: `docs/backlog/industrial-hmi-component-audit-roadmap.md` §HCA-LL

- Item Types: `Follow-up`

- [ ] roadmap §HCA-LL 行状态预留 closure audit 通过后改 `done` 的说明（实际改写在 closure audit pass 后）。
- [ ] 「已完成审计卡索引」/ 框架复用表无需改（本 plan 产出 checklist v2 / skills 增量，非审计卡）；若 checklist v2 改动影响「18 维 ↔ 23 维关系」子节，同步该子节。

Exit Criteria:

- [ ] roadmap §HCA-LL 行说明就绪（待 closure audit pass 回写 `done`）。
- [ ] checklist v2 改动与 roadmap「框架/平台复用」表 / 「审计维度对照」节无矛盾。

## Draft Review Record

> 起草后、执行前的独立审查证据（详见 guide `Plan Review Rule`）。由独立子 agent（fresh session）反复 review 直到共识后填写。

- Reviewer / Agent: 独立子 agent fresh session `ses_01fb7272fffeKnHWSpm96fm5O4`
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major。2 Minor（不阻塞，均已落地）：m-1「24 项 watch-only residual」措辞与 CR 权威语言（「24 P3 residual + 2 watch-only」）略有出入——已将 Source / Current Baseline / Phase 1 三处回写为「24 P3 residual + 2 watch-only（#1/#5）+ 2 out-of-scope」对齐 CR；m-2 LL↔CG「checklist v2 industrial 专项」边界偏软——已在 In Scope 增「LL 拥有 lesson→checklist v2 enrichment；CG 拥有工具脚本/validate.ts 537 行拆分/行数治理并 consume v2」契约化边界。live 核对全通过：9 bug 卡（77–85）slug 一致、checklist §2/§3 +「与 deep-audit 23 维关系」子节存在、deep-audit-prompts「项目校准说明」+ A–G 维度族存在、roadmap §HCA-LL 恰 6 主题、validate.ts 537 行准确。

## Closure Gates

> 纯文档/skills 计划：无代码变更，`pnpm test`/`lint`/`typecheck`/`build` 从本节删除（见 guide 纯文档计划规则）。

- [ ] 全量 lesson 候选已裁定终态（沉淀 / 不沉淀），零模糊措辞。
- [ ] 裁定「沉淀」的候选已落入 `component-audit-checklist.md` v2 / `deep-audit-prompts.md`（/ 架构文档），落点 live 可观测。
- [ ] roadmap §HCA-LL 6 主题全覆盖（沉淀或显式裁定不沉淀+理由）。
- [ ] 三向回链成立（沉淀 lesson ↔ bug 卡 ↔ 审计记录，抽查可追溯）。
- [ ] 无 live doc gap 被静默跳过（有 gap 已同步，无 gap 未凑条目）。
- [ ] roadmap §HCA-LL 行状态一致（closure audit 通过后 `done`）。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。

## Deferred But Adjudicated

> 起草时无已知可延期项。Phase 1 裁定为「不沉淀」的候选不进入 deferred——它们是按「bug 卡已足够 / 无复发价值」**主动裁定不沉淀**（有明确理由），而非延期未处理。

## Non-Blocking Follow-ups

- HCA-CG（Guard 沉淀）：consume 本 plan 的 checklist v2 增量；validate.ts 537 行拆分 + 工具脚本升级 + 文件行数治理。
- HCA-CV（全量验证）：并行 successor，若验证发现新 lesson 值得模式，回喂本 plan catalog（若本 plan 已关闭则记入 CG）。

## Closure

Status Note: <<closure audit 通过后填写：沉淀 lesson 计数 + 工件落点 + 三向回链成立 + roadmap §HCA-LL done>>

Closure Audit Evidence:

- Auditor / Agent: <<独立子 agent fresh session>>
- Evidence: <<task id / 工件 diff 摘要 / 回链抽查>>

Follow-up:

- HCA-CG successor（consume checklist v2）。
- 除 successor 外无 plan-owned remaining work。

## 裁定结果

> Phase 1 产出（待执行时填充）。全量 lesson 候选逐条裁定终态。

<<待 Phase 1 执行时填充 catalog 表：候选 | 源（bug 卡 / 审计层 / residual ID）| 根因模式 | 复发风险 | 裁定（沉淀+落点 / 不沉淀+理由）>>
