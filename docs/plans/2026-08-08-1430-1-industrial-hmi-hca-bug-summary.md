# 01 Industrial HMI Component Audit — HCA-BL Bug 总结（各层审计 bug 归档到 `docs/bugs/`）

> Plan Status: completed
> Last Reviewed: 2026-08-08
> Mission: industrial-hmi-component-audit
> Work Item: HCA-BL. Bug 总结
> Source: `docs/backlog/industrial-hmi-component-audit-roadmap.md` §HCA-BL；`docs/bugs/00-bug-fix-note-writing-guide.md`（归档格式 + 触发判据）；各层审计记录 / plan 的「喂入 HCA-BL」节
> Related: HCA1–HCA11（done，bug 来源）、HCAX-1/HCAX-2（done，共性 bug 来源）、HCA-LL（successor，lesson 沉淀，依赖本 plan）、HCA-CR（并行 successor，跨层集中修复——本 plan 与 CR 结果面独立，CR 改代码 / BL 归档文档）

## Purpose

把 HCA1–HCA11 + HCAX-1/HCAX-2 各层审计中发现的、**符合 `docs/bugs/00-bug-fix-note-writing-guide.md` 归档判据**的 bug（非平凡根因 / 跨包或跨层 / 易被重构再引入 / 修复已加回归测试），按 writing guide 八节模板归档为 `docs/bugs/NN-industrial-hmi-component-audit-*.md` 系列，并回链各审计记录的「喂入 HCA-BL」节。简单单概念局部 defect 按 writing guide「Do not write one for every tiny typo or trivial one-line fix」在审计卡内留痕即可，不重复开 bug 卡。本 plan 是**纯文档归档 + 裁定**，不改任何代码。

## Current Baseline

> 起草前已核对 live repo（2026-08-08）：roadmap §Work Item Status HCA1–HCA11 / HCAX-1 / HCAX-2 全 `done`（共识审查 3 轮 AGREE）；各层审计记录 + plan 的「喂入 HCA-BL」节含 bug 候选清单 + `文件:行` 证据；`docs/bugs/` 现存最高编号 76（`76-scada-hover-overlay-real-browser-drift-fix.md`，编号非严格唯一——存在重复号 15×4/16×2/17×2 等）。

### 候选清单（按 writing guide 判据初判）

> 「源审计推荐」= 各层审计记录 / plan「喂入 HCA-BL」节对候选的原始建议（归档 / 留痕 / 无候选）。**初判 ≠ 终态**：Phase 1 依据 writing guide §「When To Write A Bug Fix Note」四判据独立裁定。注意：源审计判「留痕（单概念局部）」的项，若独立复核命中 writing guide 门槛（非显然根因 / 已加回归测试 / 易被重构再引入 / 跨点 parity），Phase 1 仍可升级为归档，反之亦然——裁定理由须显式写入「裁定结果」节。
> HCAX-1/HCAX-2 为 roadmap 登记的共性 work item（非日期审计记录的「喂入」节），其回链目标 = roadmap §HCAX 行 + component-audit-roadmap C10/CX-9。

| 候选                                                                                             | 来源层                                                                              | 根因特征                                        | writing guide 判据命中                                       | 源审计推荐                                                               | 初判                                                                                                       |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| HCAX-1 error code `invalid-config` vs `config-invalid` 混用                                      | renderer + editor + runtime-mutators + toolbox-runtime                              | 跨层契约不一致                                  | 跨包边界 / 易被重构再引入                                    | 归档（共性 work item）                                                   | 归档                                                                                                       |
| HCAX-2 canvas 交互面缺 `role`/`aria-label`（scada-canvas + scada-editor-canvas 同型）            | renderer（双 renderer 同型）                                                        | 跨层 + a11y 缺陷                                | 跨包边界 / 回归测试已加                                      | 归档（共性 work item）                                                   | 归档                                                                                                       |
| HCA5 P1-1 `fontFamily`/`fontWeight`/`align` 跨层 diff 漏键复发                                   | symbols-core → 渲染 diff                                                            | 跨层 + `check-scada-symbol-keys.mjs` guard 落地 | 跨层 / 易复发 / guard 机制                                   | 归档（审计卡明确建议）                                                   | 归档                                                                                                       |
| HCA2 P2-ENG-1 `importConfig` 全量重建旁路 background + 覆盖物清理                                | engine（reset↔importConfig 路径不一致）                                             | 同 P2-10 同类，单文件 1 行修复                  | 同 P2-10 系列已覆盖；非平凡根因（公共 API 直调留陈旧覆盖物） | 留痕（审计卡建议合并入 P2-10 系列覆盖）                                  | Phase 1 复核                                                                                               |
| HCA6 pipe-junction P2-1 width/height resize 未重算 body+stubs                                    | symbol shapes（自定义 applyProps 借 applyCompositeProps 但 parts 无 extent/resize） | 几何重算缺失                                    | 回归测试已加 / 几何正确性                                    | 归档（审计卡 landed fix）                                                | 归档                                                                                                       |
| HCA8 P2-FE-1 嵌套子节点校验错误归因（findSymbolIndex 返父索引致 `children[M]` fieldKey 错提）    | editor panels（inspector）                                                          | 错位归因                                        | 根因非显然 / 回归测试已加                                    | 归档（审计卡建议 HCA-BL 归档）                                           | 归档                                                                                                       |
| HCA10 P1-1 `replaceUndoTop` 不清空 redoStack（coalesce-merge 须按 U6 截断 redo）                 | editor undo-redo                                                                    | 状态机语义不一致                                | 根因非显然 / 回归测试已加 / 易被重构再引入                   | **留痕**（审计卡明确「单概念局部 defect，不跨层，无需 docs/bugs 卡片」） | Phase 1 复核：非显然状态机根因 + 回归测试是否仍达 writing-guide 门槛                                       |
| HCA10 P2-1 `operation-coalesce.singleNodeUpdate` 未拒 variables/reordered（M2 合并丢载荷）       | editor undo-redo                                                                    | 载荷静默丢弃                                    | 根因非显然 / 回归测试已加                                    | **留痕**（同 HCA10 审计卡，单概念局部）                                  | Phase 1 复核（与 P1-1 是否合为 undo-redo 系列单卡由 Phase 1 定）                                           |
| HCA11 P1-1 `toolbox-runtime.importConfigFn` 缺 `engine.setMode` 同步（P1-08 parity mode desync） | editor infra（与 runtime-mutators.load 同型）                                       | 跨点 parity 缺口                                | 跨层 parity / 回归测试已加                                   | **留痕**（审计卡明确「单概念局部 defect，无需 docs/bugs 卡片」）         | Phase 1 复核：跨点 parity（toolbox-runtime↔runtime-mutators.load 同型 P1-08）是否升归档                    |
| HCA11 P2-1 `cloneNodeDeep` + `save` 浅克隆 `custom`（扩展 P2 #4 的 R5 Layer 2 隔离缺口）         | editor infra（working-helpers + runtime-mutators）                                  | 跨点 custom 隔离纪律                            | 跨层 / 易复发                                                | **留痕**（同 HCA11 审计卡）                                              | Phase 1 复核：跨点 custom 隔离（editor-working-helpers↔runtime-mutators↔editor-session R5 系列）是否升归档 |
| HCA1 P2-1 a11y（role/aria-label）+ P3-1 useCallback 冗余                                         | renderer                                                                            | 单概念局部                                      | HCAX-2 已覆盖 a11y 同型；useCallback 局部                    | 留痕                                                                     | 留痕（HCAX-2 卡覆盖 a11y；useCallback 审计卡内留痕）                                                       |
| HCA9 #2 safeDiv 零除守卫 / #3 tooltip 死字段 / #8 dangling 递归 collectIds                       | editor connection                                                                   | 先验修复复核成立                                | 复核项，非新缺陷                                             | 留痕（审计卡「无复杂/跨层候选」）                                        | 留痕（审计卡内已有留痕）                                                                                   |
| HCA7 P1-1 schema 类型漂移 + P2-1~P2-4                                                            | editor renderer                                                                     | 多项局部                                        | 多为局部契约同步                                             | 留痕                                                                     | 留痕或并入 HCAX-1（error code P2-4 已由 HCAX-1 覆盖）；Phase 1 定                                          |

### 编号策略

`docs/bugs/` 编号非严格唯一（存在 15×4 / 16×2 / 17×2 重复号）。本 plan 在 Phase 2 写卡时取**当前最大编号 +1 起递增**分配（执行时 `ls docs/bugs/` 实测确认），slug 统一前缀 `industrial-hmi-component-audit-` 以便检索（对齐 roadmap §HCA-BL phase detail 命名），例如 `NN-industrial-hmi-component-audit-cross-layer-error-code-unification.md`。

## Goals

- 对每个 bug 候选按 writing guide 八节判据（Problem / Diagnostic Method / Root Cause / Fix / Tests / Affected Files / Notes For Future Refactors + 标题）做出**归档 vs 审计卡内留痕**的明确裁定。
- 为所有裁定为「归档」的候选写出 `docs/bugs/NN-industrial-hmi-component-audit-*.md` 卡片，每卡含 `文件:行` 证据 + 已落地的回归测试引用 + 重构风险注记。
- 把各层审计记录「喂入 HCA-BL」节从「候选清单」更新为「已归档（NN-...）/ 已裁定留痕（理由）」状态，形成闭环回链。
- roadmap §HCA-BL work item 行状态两段流转：本 plan draft review 通过后 `todo`→`planned`；closure audit 通过后 `planned`→`done`（roadmap §Rule 1）。

## Non-Goals

- 不改任何 `packages/flux-renderers-industrial/src/` 代码（bug 已在 HCA1–HCA11 各层 test-first 修复，本 plan 只归档）。
- 不做 HCA-LL lesson 沉淀（successor，依赖本 plan 产出；lesson 主题在 roadmap §HCA-LL 已列）。
- 不做 HCA-CR 跨层集中修复（并行 plan，改代码 + 裁定 P3 backlog）。
- 不重诊断 / 不重新修复任何 bug；不重写已 `completed` 的历史 plan 或审计记录（仅回链状态）。
- 不为简单单概念局部 defect 强开卡（遵循 writing guide「Do not write one for every tiny typo」）。

## Scope

### In Scope

- `docs/bugs/NN-industrial-hmi-component-audit-*.md` 新增卡片（数量由 Phase 1 裁定决定；源审计已明确推荐「归档」的约 5 张[HCAX-1/HCAX-2/HCA5 P1-1/HCA6 pipe-junction/HCA8 P2-FE-1]，HCA10/HCA11/HCA2 等「Phase 1 复核」项视裁定可能再增 0–4 张）。
- 各层审计记录 `docs/audits/2026-08-08-*-hca*.md` 与对应 plan 的「喂入 HCA-BL」节回链状态更新。
- `docs/backlog/industrial-hmi-component-audit-roadmap.md` §HCA-BL 行状态（closure 后 `todo`→`done`）+ 「已完成审计卡索引」节无需改（本 plan 不产出审计卡，产出 bug 卡）。

### Out Of Scope

- `packages/flux-renderers-industrial/src/`（代码）。
- `docs/skills/` / `docs/audits/component-audit-checklist.md` v2（HCA-LL / HCA-CG 所有）。
- 非 industrial-hmi 的历史 bug 卡（`docs/bugs/01-75` 已有卡片不触碰，#76 scada hover 属审计前产出但主题相邻——仅在 HCAX/engine 归档卡交叉引用时提及，不修改 #76 文件）。
- HCA-CR 的 P3 backlog 裁定（CR plan 所有权）。

## Test Strategy

本档选择：**不适用：理由** — 本 plan 为纯文档归档 + 裁定，无代码变更、无行为变更。归档卡片引用的回归测试已在各 HCA\* plan test-first 落地并验证转绿（closure audit 记录在案），本 plan 不新增 / 不修改测试。

## Execution Plan

### Phase 1 - 候选裁定（归档 vs 留痕）

Status: completed
Targets: 本 plan Current Baseline 候选清单 + 各层审计记录「喂入 HCA-BL」节

- Item Types: `Decision`

- [x] 逐候选核对 writing guide §「When To Write A Bug Fix Note」四判据（非显然根因 / 跨包 / 伪装层 / 回归测试 / 易再引入），落裁定表：`归档（卡 slug 预定）` / `留痕（理由 + 留痕位置）`。
- [x] 对裁定「归档」的候选：决定是否合并系列（例：HCA10 P1-1+P2-1 是否合为单张 undo-redo 卡；HCA11 P1-1+P2-1 是否合为 infra-parity 卡）——合并判据 = 同根因 / 同验证路径 / 同重构风险则合，否则独立。
- [x] 裁定表写入本 plan「裁定结果」节（Phase 1 产出），作为 Phase 2 写卡依据。

Exit Criteria:

- [x] 本 plan 内存在「裁定结果」节，每个候选有明确状态（归档+slug / 留痕+理由），无未裁定项。
- [x] 裁定理由可追溯到 writing guide 判据，无「optional / nice-to-have」模糊措辞。

### Phase 2 - 写卡 + 回链

Status: completed
Targets: `docs/bugs/NN-industrial-hmi-component-audit-*.md`（新增）、各层审计记录 / plan 的「喂入 HCA-BL」节

- Item Types: `Fix | Follow-up`

- [x] 对每个裁定「归档」的候选，按 writing guide 八节模板写 `docs/bugs/NN-industrial-hmi-component-audit-*.md`：Problem（症状）/ Diagnostic Method（诊断路径，含已否假设与决定性证据）/ Root Cause（实际根因 + 包/子系统）/ Fix（设计意图层变更 + 落点 `文件:行`）/ Tests（已落地回归测试文件 + 保护点）/ Affected Files（重要文件）/ Notes For Future Refactors（1–3 条重构风险）。
- [x] 编号取当前 `docs/bugs/` 最大编号 +1 递增（执行时实测），slug 前缀 `industrial-hmi-component-audit-`。
- [x] 每卡的 Tests 节引用对应 HCA\* plan 已落地的 failing-first 回归测试文件路径（断言结果值的那条）。
- [x] 回链：各层审计记录「喂入 HCA-BL」节候选行从「候选」更新为「已归档：`NN-...`」或「已裁定留痕：理由」。

Exit Criteria:

- [x] 所有裁定「归档」的候选均有对应 `docs/bugs/NN-industrial-hmi-component-audit-*.md`，八节齐全且 `文件:行` 证据经 live 核对存在。
- [x] 各层审计记录「喂入 HCA-BL」节无残留「候选」未结状态。
- [x] 新增 bug 卡的 Tests 节引用的回归测试文件在 live repo 存在。

## Draft Review Record

> 起草后、执行前的独立审查证据（详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`）。由独立子 agent（fresh session）反复 review 直到共识后填写。

- Reviewer / Agent: 独立子 agent fresh session — Round 1 `ses_01ff64f40ffegImXBR3knng4K8`（verdict `revised`，1 Major）→ 修订 → Round 2 确认 `ses_01ff1e5a9ffeszUcjPu9TfTMRd`（verdict `pass-with-minors`，0 Blocker/Major）
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed:
  - M-1（Round 1 Major）：候选表把 HCA10/HCA11 源审计（明确「单概念局部 defect，无需 docs/bugs 卡片」）误标为「归档 + 跨层」。已修订：增「源审计推荐」列，HCA10/HCA11 行如实标「留痕」，初判改「Phase 1 复核」+ 显式说明 Phase 1 按 writing-guide 四判据独立裁定（可升 / 降级），anti-slacking 安全（Phase 1 Exit Criteria 强制每候选落终态）。Round 2 确认 resolved。
  - m-1：slug 前缀全文统一为 `industrial-hmi-component-audit-`（对齐 roadmap §HCA-BL phase detail）。Round 2 发现 1 处残留（line 103）已补修。
  - m-2：Goals 补 roadmap 两段流转（`todo`→`planned`→`done`）。
  - m-3：HCAX-1/HCAX-2 回链目标注明（roadmap §HCAX 行 + component-audit-roadmap C10/CX-9）。
  - m-4：卡片数量从「6–9 张」改为「源审计推荐归档约 5 张 + Phase 1 复核 0–4 张」。

## Closure Gates

> 纯文档计划：无代码变更，`pnpm test`/`lint`/`typecheck`/`build` 从本节删除（见 guide 纯文档计划规则）。

- [x] 所有 bug 候选已裁定（归档 / 留痕），无「optional」模糊项。
- [x] 所有裁定「归档」的候选已产出 `docs/bugs/NN-industrial-hmi-component-audit-*.md`，八节齐全 + `文件:行` 证据 live 核对。
- [x] 各层审计记录 / plan「喂入 HCA-BL」节已回链闭环（无残留候选状态）。
- [x] roadmap §HCA-BL 行状态一致（closure audit 通过后 `done`）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。

## Deferred But Adjudicated

> 起草时无已知可延期项。Phase 1 裁定为「留痕」的候选不进入 deferred——它们是按 writing guide 判据**主动裁定为审计卡内留痕**（有明确理由），而非延期未处理。

## Non-Blocking Follow-ups

- HCA-LL（lesson 沉淀）：依赖本 plan 产出的 bug 归档 + 各层审计经验，由 successor plan 处理。
- HCA-CR（跨层集中修复）：与本 plan 并行，处理 P3 backlog 裁定 + 代码修复，结果面独立。

## Closure

Status Note: 完成。Phase 1 裁定 13 个候选 → **9 张卡归档（`docs/bugs/77–85-industrial-hmi-component-audit-*.md`）+ 3 类留痕（HCA1 / HCA9 / HCA7）**，无未裁定项。Phase 2 写齐 9 张卡（八节齐全 + `文件:行` 证据经 live 核对 + failing-first 回归测试引用经核对存在），9 份日期审计记录 + 2 张 per-component 审计卡 + closure plan + roadmap HCAX-1/HCAX-2 行均已回链闭环（无残留「候选」）。4 个候选（HCA2 P2-ENG-1 / HCA10 P1-1+P2-1 合并 / HCA11 P1-1 / HCA11 P2-1）从源审计「留痕」升级为归档，均有 writing-guide 判据理由（plan M-1 anti-slacking 机制）。纯文档计划，无代码变更，Closure Gates 已删 `pnpm test/lint/typecheck/build`。roadmap §HCA-BL `planned` → `done`。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit 子 agent fresh session `ses_01fe44fb6ffeyodZdG0PPmrYDM`（三件套输入：plan 摘要 + diff 摘要 + 验证输出，不复用执行 session 历史）
- Verdict: `approved`（修正 1 Minor 后）
- Evidence: 6 项任务全核对——(1) 裁定表覆盖全部 13 候选，无 optional；(2) 9 卡八节齐全，抽查 live `文件:行` 证据真实（config-types.ts:89-91 / check-scada-symbol-keys.mjs / scada-engine.ts:349-353 importConfig→reset / undo-stack.ts:148+156 / operation-coalesce.ts:107-108 / toolbox-runtime.ts:238-239 / editor-working-helpers.ts:84 structuredClone(custom)）；(3) 14 个回归测试文件 + guard 脚本存在且 plausibly 覆盖；(4) 9 份日期审计记录 + 2 per-component 卡回链闭环，无残留「候选」；(5) 4 个升级均有 writing-guide 判据理由（anti-slacking 显式）；(6) 无候选被静默丢弃。
- Minor 已修正：card 85 `runtime-mutators.ts:17` → `:196`（save 函数 `:191` 内的 `committedBaseline = cloneConfigSnapshot(...)`，执行 session 已修正）。

Follow-up:

- HCA-LL successor（`todo`）：基于本 plan 归档的 9 张 bug 卡 + 各层审计经验提炼 lesson（roadmap §HCA-LL 已列主题：a11y / schema 契约 / error code 设计 / 四态 / React19 / 文件行数）。
- 除 HCA-LL successor 外无 plan-owned remaining work。

## 裁定结果

> Phase 1 产出。编号基线：`ls docs/bugs/` 实测当前最大编号 = 76（`76-scada-hover-overlay-real-browser-drift-fix.md`），本 plan 自 77 起递增。slug 前缀统一 `industrial-hmi-component-audit-`。
>
> 裁定方法：逐候选独立套用 `docs/bugs/00-bug-fix-note-writing-guide.md` §「When To Write A Bug Fix Note」四判据（非显然根因 / 跨包边界 / 伪装层 / 回归测试 / 易被重构再引入）。**源审计「留痕」推荐不约束 Phase 1**——源审计「留痕」判断主要基于「不跨层 / 单概念局部」，而 writing-guide 不要求必须跨包（「非显然根因」单项即达门槛）。凡命中「非显然根因 + 回归测试 + 易再引入」的候选，Phase 1 升级为归档（plan M-1 修订预设的 anti-slacking 安全机制：Phase 1 可升 / 降级）。

| 候选                                                         | writing-guide 判据命中（live 核对）                                                                                                                                                                 | 裁定                   | 卡 slug / 留痕位置                                                                    |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| HCAX-1 error code `invalid-config` vs `config-invalid`       | 跨层契约（renderer `scada-canvas.tsx:46` + editor `scada-editor-canvas.tsx:42`/`editor-errors.ts:63` + runtime-mutators/toolbox-runtime parity）；升级码 vs 命令句柄码语义混淆；易被重构再引入      | **归档**               | `77-industrial-hmi-component-audit-cross-layer-error-code-unification.md`             |
| HCAX-2 canvas 交互面缺 `role`/`aria-label`                   | 跨包（scada-canvas + scada-editor-canvas 双 renderer 同型）；a11y 缺陷；回归守护测试已加（`scada-canvas-smoke.test.tsx:86`）                                                                        | **归档**               | `78-industrial-hmi-component-audit-canvas-wrapper-a11y-role-aria-label.md`            |
| HCA5 P1-1 `fontFamily`/`fontWeight`/`align` 跨层 diff 漏键   | 跨层（symbols core `ScadaSymbolProps` ↔ serialization `ScadaSymbolNode`/`SYMBOL_KEYS`）；非显然根因（派生键集漂移）；易复发——**已复发 1 次**（同 `flow` 漏键 0653-2 同根因）；guard 机制 + 回归测试 | **归档**               | `79-industrial-hmi-component-audit-cross-layer-symbol-diff-missing-font-keys.md`      |
| HCA6 pipe-junction P2-1 width/height resize 未重算           | 非显然根因（自定义 applyProps 借 `applyCompositeProps` 但 parts 无 extent/resize → `EXTENT_FIELDS` 静默丢弃）；回归测试已加；applyProps 重构易再引入                                                | **归档**               | `80-industrial-hmi-component-audit-pipe-junction-resize-silent-drop.md`               |
| HCA8 P2-FE-1 嵌套子节点校验错误归因                          | 非显然根因（`findSymbolIndex` 对子节点返父索引而非递归 scope path）；跨 inspector/validate 边界（`validate.ts:342` 格式）；回归测试已加                                                             | **归档**               | `81-industrial-hmi-component-audit-nested-child-validation-error-attribution.md`      |
| HCA2 P2-ENG-1 `importConfig` 全量重建旁路                    | 非显然根因（公共 API 直调旁路 `reset` 后置处理 → 留陈旧覆盖物 + 忽略背景色）；跨公共 API 契约（doc §8.2 全量替换语义）；易复发——**同 P2-10 同型已复发**；回归测试已加                               | **归档（升级）**       | `82-industrial-hmi-component-audit-import-config-full-rebuild-bypass.md`              |
| HCA10 P1-1 + P2-1 undo-redo coalesce（**合并**）             | 非显然状态机根因（P1-1 coalesce-merge=新提交须截断 redo U6；P2-1 coalesce 静默丢 `variables`/`reordered` 载荷）；回归测试已加；coalesce 重构易再引入；同模块 / 同验证路径 / 同重构风险面 → 合并     | **归档（升级，合并）** | `83-industrial-hmi-component-audit-undo-redo-coalesce-correctness.md`                 |
| HCA11 P1-1 toolbox-runtime `importConfig` mode desync        | 非显然根因（`engine.mode`↔`session.mode` desync）；跨点 parity（`toolbox-runtime`↔`runtime-mutators.load` 同型 P1-08）；回归测试已加；新增 import/load 路径易再引入                                 | **归档（升级）**       | `84-industrial-hmi-component-audit-toolbox-import-config-mode-desync-parity.md`       |
| HCA11 P2-1 `cloneNodeDeep` + `save` 浅克隆 `custom`          | 非显然根因（`custom` 浅克隆致跨快照串改）；跨点隔离纪律（`editor-working-helpers`↔`runtime-mutators`↔`editor-session` R5 系列）；回归测试已加；新增 clone 路径易再引入                              | **归档（升级）**       | `85-industrial-hmi-component-audit-config-snapshot-custom-shallow-clone-isolation.md` |
| HCA1 P2-1 a11y + P3-1 useCallback                            | a11y 同型已由 HCAX-2 卡（78）覆盖；useCallback 为局部 React19 优化项（P3 recorded，非缺陷）                                                                                                         | **留痕**               | a11y → 78 卡覆盖；useCallback → HCA1 审计卡 + HCA-LL/HCA-CR backlog                   |
| HCA9 #2 safeDiv / #3 tooltip 死字段 / #8 dangling collectIds | 先验修复复核成立，非新缺陷；无跨层影响                                                                                                                                                              | **留痕**               | HCA9 审计记录 §5.1 已留痕（「无复杂/跨层 bug 候选」）                                 |
| HCA7 P1-1 schema 漂移 + P2-1~P2-4                            | 多为局部契约同步（schema region / propContracts / eventContracts / disabled / palette title）；P2-4 error code 已由 HCAX-1 卡（77）覆盖；其余局部机械                                               | **留痕**               | HCA7 审计卡 + closure plan 已留痕；P2-4 → 77 卡覆盖                                   |

**合并裁定理由**：

- **HCA10 P1-1 + P2-1 合并为单卡（83）**：同模块（`editor/undo-redo/`）、同主题（coalesce/merge window invariants）、同验证路径（`undo-stack.test.ts` + `operation-coalesce.test.ts` failing-first）、同重构风险面（coalesce 逻辑）。虽根因具体不同（redo 截断 vs 载荷完整性），统一概念为「coalesce 正确性」，两根因在同一卡内分节记录。符合 anti-fragmentation（guide Rule 22/26）。
- **HCA11 P1-1 vs P2-1 独立（84 / 85）**：根因不同（mode 状态同步 vs `custom` 数据隔离）、机制不同、parity 主题不同（P1-08 mode parity vs R5 `custom` 隔离系列），独立成卡以保留各自重构风险注记。

**升级裁定理由（HCA2 / HCA10 / HCA11，共 4 候选从源审计「留痕」升级为「归档」）**：源审计「留痕」判断主要基于「不跨层 / 单概念局部」。独立复核按 writing-guide 四判据：这些 bug 均命中「非显然根因」+「回归测试已加」+「易被重构再引入」（writing-guide 明示「at least one of these is true」即达门槛，不要求必须跨包）。undo-redo 状态机语义、公共 API 旁路、跨点 parity / 隔离纪律均属 writing-guide 想保留的长期记忆价值。此为 plan M-1 修订预设的 anti-slacking 安全机制。

**归档总数：9 张卡（77–85）**；**留痕：3 类（HCA1 / HCA9 / HCA7）**。无未裁定项。
