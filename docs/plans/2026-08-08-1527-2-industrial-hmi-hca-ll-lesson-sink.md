# 02 Industrial HMI Component Audit — HCA-LL Lesson 总结（架构/工程经验沉淀到 checklist v2 / skills / 架构文档）

> Plan Status: completed
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

Status: completed
Targets: 9 bug 卡 + 各层审计记录 + HCA-CR 24 residual 表 + roadmap §HCA-LL 6 主题

- Item Types: `Decision`

- [x] 从 9 bug 卡（`docs/bugs/77–85`）逐张提炼 lesson 候选（根因模式 / 复发风险 / 是否值得沉淀 vs 仅 bug 卡已足够）。
- [x] 从各层审计记录 + HCA-CR residual 裁定表（24 P3 residual + 2 watch-only）提炼「同类问题如何裁定」经验（如防御纵深 vs 真实缺陷的边界、跨点 parity 识别、公共 API footgun 裁定）。
- [x] 对齐 roadmap §HCA-LL 已列 6 主题（a11y / schema 契约 / error code / 四态 / React19 / 文件行数），补 catalog 缺口主题（如 canvas 场景图生命周期、序列化校验完整性、custom 数据隔离纪律）。
- [x] 逐候选裁定终态：`沉淀（目标工件 + 落点）` / `不沉淀（理由：bug 卡已足够 / 无复发价值）`，落 catalog 表写入本 plan「裁定结果」节。

Exit Criteria:

- [x] 本 plan「裁定结果」节含全量 lesson 候选（16 项 = 15 沉淀 + 1 不沉淀），每条有终态（沉淀+落点 / 不沉淀+理由），零「optional / consider」模糊措辞。
- [x] roadmap §HCA-LL 6 主题全部覆盖（沉淀或显式裁定不沉淀+理由）。

### Phase 2 - 沉淀到 durable 工件 + 三向回链

Status: completed
Targets: `docs/audits/component-audit-checklist.md`、`docs/skills/deep-audit-prompts.md`、相关 `docs/architecture/*.md`

- Item Types: `Fix | Follow-up`

- [x] `Fix`：`docs/audits/component-audit-checklist.md` v2 增 industrial 专项维度节——canvas 场景图引擎（视口数学/命中/覆盖物生命周期/destroyed 门控）、数据绑定管线（点表/脏收集合帧/动画时钟）、序列化校验完整性（子形状/malformed/枚举字段）、符号库（applyProps 路由/extent-resize/custom 深克隆隔离）、编辑器子系统（状态机/事务边界/合并窗口/pointer 挂载层级），每维度含「检查什么 + 对应 bug 卡回链」。
- [x] `Fix`：`docs/skills/deep-audit-prompts.md`「项目校准说明」/ 相关维度（生命周期维度 07 / 错误处理 / React 集成 / 测试质量 / 架构边界）增 industrial 包级提示（如「canvas renderer wrapper 必查 role/aria-label」「跨点 custom 克隆一致性」「error code 升级码 vs 命令句柄码不可混用」「useCallback 在 canvas 生命周期 renderer 逐个审查」）。
- [x] `Fix`：相关架构文档（如 `renderer-runtime.md` 四态契约 / `renderer-markers-and-selectors.md` a11y）仅当 lesson 揭示 live doc gap 时同步（无 gap 不改，不凑条目）。
- [x] `Follow-up`：三向回链——沉淀条目回链源 bug 卡（`docs/bugs/77–85`）；bug 卡「Notes For Future Refactors」回链对应 lesson 落点；审计记录「喂入 HCA-LL」节（若存在）回链 catalog 终态。

Exit Criteria:

- [x] `component-audit-checklist.md` v2 industrial 专项维度节存在，每维度含检查点 + bug 卡回链（live 文件可观测）。
- [x] `deep-audit-prompts.md` 项目校准 / 相关维度含 industrial 提示（live 文件可观测）。
- [x] 架构文档同步项（若有）已落地，无 gap 处未凑条目。
- [x] 三向回链成立（抽查：≥3 条沉淀 lesson ↔ bug 卡双向链接可追溯）。

### Phase 3 - roadmap 状态 + 收口

Status: completed
Targets: `docs/backlog/industrial-hmi-component-audit-roadmap.md` §HCA-LL

- Item Types: `Follow-up`

- [x] roadmap §HCA-LL 行状态预留 closure audit 通过后改 `done` 的说明（实际改写在 closure audit pass 后）。
- [x] 「已完成审计卡索引」/ 框架复用表无需改（本 plan 产出 checklist v2 / skills 增量，非审计卡）；若 checklist v2 改动影响「18 维 ↔ 23 维关系」子节，同步该子节。

Exit Criteria:

- [x] roadmap §HCA-LL 行说明就绪（待 closure audit pass 回写 `done`）。
- [x] checklist v2 改动与 roadmap「框架/平台复用」表 / 「审计维度对照」节无矛盾。

## Draft Review Record

> 起草后、执行前的独立审查证据（详见 guide `Plan Review Rule`）。由独立子 agent（fresh session）反复 review 直到共识后填写。

- Reviewer / Agent: 独立子 agent fresh session `ses_01fb7272fffeKnHWSpm96fm5O4`
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major。2 Minor（不阻塞，均已落地）：m-1「24 项 watch-only residual」措辞与 CR 权威语言（「24 P3 residual + 2 watch-only」）略有出入——已将 Source / Current Baseline / Phase 1 三处回写为「24 P3 residual + 2 watch-only（#1/#5）+ 2 out-of-scope」对齐 CR；m-2 LL↔CG「checklist v2 industrial 专项」边界偏软——已在 In Scope 增「LL 拥有 lesson→checklist v2 enrichment；CG 拥有工具脚本/validate.ts 537 行拆分/行数治理并 consume v2」契约化边界。live 核对全通过：9 bug 卡（77–85）slug 一致、checklist §2/§3 +「与 deep-audit 23 维关系」子节存在、deep-audit-prompts「项目校准说明」+ A–G 维度族存在、roadmap §HCA-LL 恰 6 主题、validate.ts 537 行准确。

## Closure Gates

> 纯文档/skills 计划：无代码变更，`pnpm test`/`lint`/`typecheck`/`build` 从本节删除（见 guide 纯文档计划规则）。

- [x] 全量 lesson 候选已裁定终态（沉淀 / 不沉淀），零模糊措辞。
- [x] 裁定「沉淀」的候选已落入 `component-audit-checklist.md` v2 / `deep-audit-prompts.md`（/ 架构文档），落点 live 可观测。
- [x] roadmap §HCA-LL 6 主题全覆盖（沉淀或显式裁定不沉淀+理由）。
- [x] 三向回链成立（沉淀 lesson ↔ bug 卡 ↔ 审计记录，抽查可追溯）。
- [x] 无 live doc gap 被静默跳过（有 gap 已同步，无 gap 未凑条目）。
- [x] roadmap §HCA-LL 行状态一致：closure audit 通过后已回写 `done`（roadmap line 64，fresh session 回写；见下 Closure Audit Evidence）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 未自审本项（见下 Closure Audit Evidence）。

## Deferred But Adjudicated

> 起草时无已知可延期项。Phase 1 裁定为「不沉淀」的候选不进入 deferred——它们是按「bug 卡已足够 / 无复发价值」**主动裁定不沉淀**（有明确理由），而非延期未处理。

## Non-Blocking Follow-ups

- HCA-CG（Guard 沉淀）：consume 本 plan 的 checklist v2 增量；validate.ts 537 行拆分 + 工具脚本升级 + 文件行数治理。
- HCA-CV（全量验证）：并行 successor，若验证发现新 lesson 值得模式，回喂本 plan catalog（若本 plan 已关闭则记入 CG）。

## Closure

Status Note: **plan 关闭（2026-08-08，closure audit fresh session PASS）**：16 lesson 候选裁定（15 沉淀 + 1 不沉淀文件行数）；沉淀落点——`docs/audits/component-audit-checklist.md` §2.1 增 industrial 专项维度 IND-1~IND-6 + §3.1 裁定方法论 + 「18 维↔23 维」关系子节同步；`docs/skills/deep-audit-prompts.md` 项目校准说明增 industrial 指针块 + 维度 07/19/20 增 industrial 包级提示；`docs/architecture/renderer-markers-and-selectors.md` 补 canvas `role="application"` a11y gap（唯一 live doc gap）；9 bug 卡（77–85）双向回链成立；roadmap §HCA-LL `planned`→`done` 已回写 + 框架复用表/审计维度对照节同步。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session（closure audit，不复用执行 session 上下文）。
- 工件落点 live 核对（grep/read，全通过）：
  - `docs/audits/component-audit-checklist.md` §2.1「Industrial 包专项审计维度（v2 增量）」存在（line 39），IND-1 canvas 引擎 / IND-2 绑定管线 / IND-3 序列化 / IND-4 符号库 / IND-5 编辑器子系统 / IND-6 跨切全在（lines 45-99）；§3.1 裁定方法论 + 「18 维↔23 维关系」子节同步（line 132）。
  - `docs/skills/deep-audit-prompts.md`「Industrial 包专项提示」节存在（line 530）+ 项目校准说明指针块（line 532）+ 维度 07 useCallback（line 538/950）+ 维度 19 error code（line 1740）+ 维度 20 a11y（line 1799）industrial 包级提示全在。
  - `docs/architecture/renderer-markers-and-selectors.md`「Canvas / scene-graph interaction surfaces」a11y gap 段存在（lines 79-84），含 `role="application"` + `aria-label` i18n 要求 + 回链 `docs/bugs/78`（HCAX-2）+ 本 plan（HCA-LL）。
- 三向回链抽查（≥3 条，双向可追溯，全通过）：
  - bug 78（HCAX-2）↔ L-A11Y-1：bug 卡 line 46「Lesson 回链（HCA-LL）」回链 catalog L-A11Y-1 + IND-1 + 维度 20 + RMS；反向 catalog 表 L-A11Y-1 行回链 bug 78。
  - bug 79（HCA5 P1-1）↔ L-SCHEMA-1：bug 卡 line 44 回链 L-SCHEMA-1 + IND-3 三向 wire 类型同步；反向 catalog L-SCHEMA-1 行回链 bug 79。
  - bug 85（HCA11 P2-1）↔ L-ED-3：bug 卡 line 41 回链 L-ED-3 + IND-4/IND-5 custom 深克隆隔离；反向 catalog L-ED-3 行回链 bug 85。
  - 其余 6 张 bug 卡（77/80/81/82/83/84）的「Lesson 回链（HCA-LL）」节亦逐张存在，反向 catalog 表行均有对应回链（L-ERR-1/L-SYM-1/L-SCHEMA-3/L-ENG-1/L-ED-1/L-ED-2）。
- Anti-Hollow 抽查：industrial 专项维度非空壳——IND-1~IND-6 每维度含「检查什么 + 对应 bug 卡回链」具体检查点（非 `{}`/`return null` 占位）；deep-audit-prompts 增量为可执行提示词（被审计流程 consume：维度子 agent 派发时内联）。
- Deferred honesty：Phase 1 裁定为「不沉淀」的 L-FILE-1 有明确理由（已被 dim 02 + `check:oversized-code-files` 硬门禁 + HCA-CG 工具治理覆盖，无复发价值），非延期未处理；Deferred But Adjudicated 节起草即空，无非 blocking 区藏 live defect。
- roadmap §HCA-LL 状态：closure audit fresh session 已回写 `docs/backlog/industrial-hmi-component-audit-roadmap.md` line 64 `planned`→`done` + line 3「最后更新」注释同步（见 roadmap diff）。
- 五点一致性：Plan Status `completed` / 3 Phase Status `completed` / 各 Phase Exit Criteria 全 `[x]` / Closure Gates 全 `[x]` / 本 Closure Audit Evidence 一致。

Follow-up:

- HCA-CG successor（consume checklist v2）。
- 除 successor 外无 plan-owned remaining work。

## 裁定结果

> Phase 1 产出（2026-08-08）。全量 lesson 候选逐条裁定终态，措辞已从 9 bug 卡（`docs/bugs/77–85`）+ 各层审计记录 + HCA-CR residual 裁定表（`docs/plans/2026-08-08-1430-2` §裁定结果 / §Deferred But Adjudicated）拉取对账。
>
> **合计**：16 候选 = 15 项「沉淀」（落 `component-audit-checklist.md` v2 industrial 专项维度 / `deep-audit-prompts.md` 项目校准·相关维度 / `renderer-markers-and-selectors.md` a11y gap）+ 1 项「不沉淀」（文件行数，理由：已被 dim 02 + `check:oversized-code-files` 硬门禁 + HCA-CG 工具治理覆盖，无复发价值）。
>
> roadmap §HCA-LL 已列 6 主题全覆盖：a11y（L-A11Y-1 沉淀）/ schema 契约（L-SCHEMA-1/2/3 沉淀）/ error code（L-ERR-1 沉淀）/ 四态（L-STATE-1 沉淀）/ React19（L-R19-1 沉淀）/ 文件行数（L-FILE-1 显式裁定不沉淀+理由）。
>
> **落点缩写**：`CL:<dim>` = `component-audit-checklist.md` §2.1 industrial 专项维度 `<dim>`；`DA:<loc>` = `deep-audit-prompts.md` `<loc>`；`RMS` = `renderer-markers-and-selectors.md`。

### 裁定为「沉淀」— 15 项

| 候选       | 主题（roadmap 主题↔补充）                    | 源（bug 卡 / 审计层 / residual）                                                                                   | 根因模式                                                                                                                                                                                                       | 复发风险                                                               | 裁定（落点）                                                                                                                                                                                      |
| ---------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L-A11Y-1   | a11y（roadmap）                              | Bug 78（HCAX-2；HCA1 P2-1 + HCA7 P2-2）                                                                            | canvas 场景由 leafer 在普通 div 渲染，wrapper 无原生 landmark/region 语义；须显式 `role="application"` + `aria-label` + i18n key                                                                               | 高（跨包同型：scada-canvas + scada-editor-canvas 均遗漏）              | 沉淀 → CL:canvas-engine（a11y 子项）+ DA:dim20 a11y（industrial 包级提示：canvas renderer wrapper 必查 role/aria-label）+ RMS（a11y gap：补 canvas `role="application"` 指引）                    |
| L-SCHEMA-1 | schema 契约 / 序列化完整性（roadmap + 补充） | Bug 79（HCA5 P1-1）                                                                                                | 三向 wire 类型须同步：消费侧 `ScadaSymbolProps` ↔ 序列化 `ScadaSymbolNode` ↔ diff `SYMBOL_KEYS`；wire 类型漏声明字段 → diff 静默丢弃增量更新                                                                   | 极高（已复发 1 次：`flow`→`fontFamily`/`fontWeight`/`align`）          | 沉淀 → CL:serialization（三向类型同步检查点 + 引用 guard 脚本 `check-scada-symbol-keys.mjs` 模式：复发类漏键须机械三向断言）                                                                      |
| L-SCHEMA-2 | schema 契约（roadmap）                       | HCA7 P1-1（closure remediation，3 类留痕；非 bug 卡）                                                              | editor renderer 的 schema interface 须与 `renderer-definitions.ts` fields 逐字同步；类型漂移致 prop 丢失                                                                                                       | 中                                                                     | 沉淀 → DA:项目校准说明（industrial 包级提示：editor renderer schema↔definitions 同步）。注：CL §2 dim 1 已覆盖通用 schema 契约，本条补 deep-audit 包级提示缺口                                    |
| L-SCHEMA-3 | schema 契约 / 编辑器子系统（roadmap + 补充） | Bug 81（HCA8 P2-FE-1）                                                                                             | inspector 错误归因路径格式须与 `validate.ts` 错误字符串逐字对齐（含嵌套 `children[M]` 层级）；前缀错位致嵌套字段错误静默丢弃                                                                                   | 中（跨边界：inspector↔serialization validate）                         | 沉淀 → CL:editor-subsystem（错误归因格式 parity 子项）                                                                                                                                            |
| L-ERR-1    | error code 设计（roadmap）                   | Bug 77（HCAX-1）                                                                                                   | 错误码两类语义不可混用：升级码（config 校验失败 / engine 创建失败 → 触发 empty error region）vs 命令句柄码（命令执行失败，不升级）；两码字面相似易当拼写差异忽略                                               | 高（两码 `invalid-config`/`config-invalid` 字面相似）                  | 沉淀 → DA:dim19 错误传播（industrial 包级提示：error code 升级码 vs 命令句柄码不可混用）+ CL:canvas-engine（error code 分类一致性子项）                                                           |
| L-STATE-1  | 四态契约（roadmap）                          | HCA7 P2-3（closure remediation，3 类留痕；非 bug 卡）                                                              | `props.meta.disabled` 是四态一部分，instance-renderer（如 editor-engine）必须消费；漏消费致禁用态交互仍可触发                                                                                                  | 中                                                                     | 沉淀 → DA:项目校准说明（industrial 包级提示：editor renderer 必须消费 props.meta.disabled）。注：CL §2 dim 10 已覆盖通用四态，本条补 deep-audit 包级提示缺口                                      |
| L-R19-1    | React 19（roadmap）                          | HCA1 P3-1（3 类留痕；非 bug 卡）                                                                                   | canvas 生命周期 renderer（leafer 挂载/卸载/视口 sync）的 useCallback 须逐个审查，非一刀切移除也非一刀切添加；React Compiler 基线下仍有生命周期稳定回调需求                                                     | 中                                                                     | 沉淀 → DA:项目校准说明（industrial 包级提示：useCallback 在 canvas 生命周期 renderer 逐个审查）。注：`react19-best-practices-review.md` + CL §2 dim 14 已覆盖通用规则，本条补 industrial 例外口径 |
| L-ENG-1    | canvas 场景图引擎（补充）                    | Bug 82（HCA2 P2-ENG-1）                                                                                            | 全量重建公共 API（`importConfig`）必须委托到 canonical `reset` 路径，勿另起 build 路径；否则后置清理（应用 background / 清 InteractionOverlay）发散                                                            | 高（复发 1 次：P2-10 reset 清覆盖物 → P2-ENG-1 importConfig 旁路同型） | 沉淀 → CL:canvas-engine（全量重建路径 parity 子项）                                                                                                                                               |
| L-SYM-1    | 符号库（补充）                               | Bug 80（HCA6 P2-1）                                                                                                | 自定义 `applyProps` 借用 `applyCompositeProps` 且 parts 无 extent/resize hook 时，composite 框架 `EXTENT_FIELDS` 静默丢弃 `width`/`height`；必须自行重算且 create↔applyProps 几何公式一致                      | 中（composite 族图元特有）                                             | 沉淀 → CL:symbol-library（applyProps 路由 / extent-resize / create↔applyProps 几何 parity 子项）                                                                                                  |
| L-ED-1     | 编辑器子系统（补充）                         | Bug 83（HCA10 P1-1 + P2-1，合并）                                                                                  | undo-redo 两不变量：① coalesce-merge = 新提交，必须截断 redo（U6，与 push 同语义）；② coalesce 必须拒绝它无法完整搬运载荷的 diff（带 `variables`/`reordered` 的 diff 不能被只构造 `updated` 的合并搬运）       | 中（状态机语义隐藏）                                                   | 沉淀 → CL:editor-subsystem（事务边界 / 合并窗口不变量子项）                                                                                                                                       |
| L-ED-2     | 编辑器子系统（补充）                         | Bug 84（HCA11 P1-1）                                                                                               | 所有 import/load 入口在 `engine.build` 后必须同步 `engine.mode → session.mode`（P1-08 parity）；跨点 parity 缺口（runtime-mutators.load 有同步、toolbox-runtime.importConfig 无）致 session/engine mode desync | 高（跨多点 parity 缺口）                                               | 沉淀 → CL:editor-subsystem（import/load 跨点 parity 子项）+ CL:cross-cutting（跨点 parity 识别方法）                                                                                              |
| L-ED-3     | 编辑器子系统（补充）                         | Bug 85（HCA11 P2-1）                                                                                               | 所有 config/node clone 路径必须深克隆 `custom`（R5 Layer 2 隔离纪律）；`children` 已递归，`custom` 同样必须 `structuredClone`；浅克隆致 working copy 改动串改多份快照                                          | 高（跨多站点：session/working-helpers/mutators/undo-redo-adapter）     | 沉淀 → CL:editor-subsystem（快照 custom 深克隆隔离子项）                                                                                                                                          |
| L-ADJ-1    | 裁定方法论（HCA-CR residual 提炼）           | HCA-CR residual：HCA2-P3-ENG-3 / HCA5-P3-1 / HCA6-P3-4 / HCA8-P3×11 等（`docs/plans/2026-08-08-1430-2` §裁定结果） | 防御纵深 vs 真实缺陷边界：当主路径已有前置守卫（validator 拒绝重复 id / validate MAX_DEPTH fail-closed / validate finite 守 NaN / compositePropSchema 验证），冗余 guard 为 watch-only residual 而非 Fix       | —（裁定教材）                                                          | 沉淀 → CL:§3.1 优先级裁决（industrial 裁定指引：防御纵深缺口在主路径已有前置守卫且无可复现路径时裁定 residual + Why-Not-Blocking）                                                                |
| L-ADJ-2    | 裁定方法论（HCA-CR residual + bug 提炼）     | Bug 82 / Bug 84 + HCA-CR residual 裁定                                                                             | 跨点 parity 识别方法：同语义多入口（import/load/rebuild/setMode）须交叉比对所有站点，单点修复不闭合；复发类问题须配机械 guard（`check-scada-symbol-keys.mjs` 模式）或显式跨点审计                              | —（裁定教材）                                                          | 沉淀 → CL:cross-cutting（跨点 parity 识别 + 复发配机械 guard 方法）                                                                                                                               |
| L-ADJ-3    | 裁定方法论（HCA-CR residual 提炼）           | HCA-CR residual：HCA2-P3-ENG-2（`config-adapter.ts:55,71-79`，applyDiff nextConfig 省略返旧 config）               | 公共 API 可选参数 footgun 裁定：可选参数省略时返旧值/降级是 footgun，但当主路径恒传该参数（renderer use-scada-config-sync 恒传 nextConfig）则主路径无影响，裁定 watch-only residual + Successor=no             | —（裁定教材）                                                          | 沉淀 → CL:§3.1 优先级裁决（industrial 裁定指引：公共 API 可选参数 footgun 在主路径恒传时裁定 residual）                                                                                           |

### 裁定为「不沉淀」— 1 项

| 候选     | 主题（roadmap 主题） | 源                                                                       | 不沉淀理由（明确，非延期）                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------- | -------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L-FILE-1 | 文件行数（roadmap）  | HCA3 dirty-collector 665 行已拆（3 文件 ≤500）/ HCA4 validate 524→537 行 | 已被既有工件全覆盖，无新复发价值：① CL §2 dim 02（模块职责与文件边界）+ `deep-audit-prompts.md` dim 02 已定义文件行数检查口径；② `pnpm check:oversized-code-files` / ESLint `max-lines` 硬门禁已机械守护（`>700` error / `>500` warning）；③ HCA3 dirty-collector 拆分已落地，HCA4 validate 537 行拆分 Decision 明确归 **HCA-CG 所有权**（单一职责内聚 + 拆分缝已记录），非 LL 沉淀范围。故不沉淀，仅在本 catalog 显式记录裁定理由以闭合 roadmap §HCA-LL 第 6 主题。 |
