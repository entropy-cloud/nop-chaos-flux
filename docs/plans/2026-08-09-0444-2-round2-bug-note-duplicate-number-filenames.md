# 2 docs/bugs 重号文件名治理（15×4、16×2、17×2、44×2、67×2、74×2）

> Plan Status: active
> Mission: component-audit-round2
> Work Item: docs-governance:bug-note-duplicate-number-filenames
> Last Reviewed: 2026-08-09
> Source: `docs/plans/2026-08-08-0900-2-round2-db-bug-note-backfill.md` Non-Blocking Follow-ups（重号文件名（15×4、16×2、17×2、44×2、67×2、74×2）治理：影响索引清晰度但不阻塞（文件名即规范 id，README 逐条登记即可区分），归未来治理轮次）
> Related: `docs/bugs/README.md`（Current Entries 索引）、`docs/bugs/00-bug-fix-note-writing-guide.md`、`docs/audits/round2-bug-note-gaps.md`（DB 盘点表）

## Purpose

把 DB plan Non-Blocking Follow-ups 登记的重号文件名治理项收口：`docs/bugs/` 下 6 个编号（15×4、16×2、17×2、44×2、67×2、74×2）共 14 个文件共享同名编号前缀，影响索引清晰度与「编号 ↔ bug note」双向查找。治理方向为「保持文件名即规范 id」原则下的**编号去重**——为重复编号文件补唯一后缀区分（如 `15a-`/`15b-`/`15c-`/`15d-`），并同步 `docs/bugs/README.md`「Current Entries」索引与维护面跨文档引用（live 实测：14 个旧文件名在 docs 维护面（排除 `docs/bugs/**`、`docs/plans/**`、`docs/archive/**` 与本 plan 自身）共 24 处完整文件名引用 + 3 处小写编号短语引用，精确计数以 Phase 1 复核为准（含大小写变体裁决）；历史 plan/archive 保留区 25 处不更新，见 Deferred）。纯文档治理，零代码变更。

## Current Baseline

- **重号现状（live `ls docs/bugs/` 实测，2026-08-09）**：`docs/bugs/` 共 **125 个编号 note 文件**（117 个唯一编号；`README.md` 与 `00-*.md` 指南除外）。重号：`15-*` ×4（`15-render-nodes-setstate-during-render-fix.md`、`15-component-level-initfetch-analysis-and-fix.md`、`15-report-designer-fill-series-trailing-digit-fix.md`、`15-flux-runtime-source-reaction-recursion-and-dependency-guard-regression.md`）、`16-*` ×2（`16-dialog-drag-pointer-capture-boundary-clamp-fix.md`、`16-report-designer-fill-handle-drag-single-cell-fix.md`）、`17-*` ×2（`17-json-viewer-class-override-breaks-highlighting-fix.md`、`17-report-designer-field-drop-edit-exit-cursor-stuck-fix.md`）、`44-*` ×2（`44-performance-table-full-stress-root-array-form-hang-fix.md`、`44-flow-designer-tree-merge-layering-layout-fix.md`）、`67-*` ×2（`67-dialog-drag-portal-event-propagation-fix.md`、`67-input-number-native-spin-buttons-fix.md`）、`74-*` ×2（`74-dropdown-items-open-dialog-stale-row-submit.md`、`74-icon-picker-required-validation-silent-noop-fix.md`）——共 **6 个重号编号 / 14 个重号文件**（`grep -oE '^\d+' | sort | uniq -d` 实测）。
- **README 已逐条登记**（`docs/bugs/README.md:30-37,62-63,86-87,94-95` 每行完整文件名），DB 已修复索引漂移并复核零缺口；重号文件在 README 中靠完整文件名区分，**编号本身不唯一**。
- **跨文档引用面（live `rg -c` 实测，2026-08-09）**——分维护面与保留区两区：
  - **维护面**（`docs/` 排除 `docs/bugs/**`、`docs/plans/**`、`docs/archive/**`、本 plan 自身）：14 个旧文件名共 **24 处完整文件名引用**（15 族 16 处（render-nodes 2 + component-level 12 + flux-runtime 2；report-designer-fill-series 0）、44 族 3 处、67 族 2 处、74 族 3 处；16/17 族为 0）+ 编号短语形态（`bug note 15|16|17|44|67|74`、`bug 15|...`）共 **3 处**（`docs/logs/2026/04-24.md` bug 15 ×1、`docs/logs/2026/08-03.md` bug 74 ×2）——合计 **27 处**维护面引用，精确清单以 Phase 1 逐条盘点为准。
  - **保留区（不更新，Rule 21 历史保留，见 Deferred）**：`docs/plans/**`（历史 plan）10 处完整文件名（全部 `15-component-level-initfetch-analysis-and-fix`，如 `2026-06-22-1500-1-*` ×6 等）+ `docs/archive/**` 14 处完整文件名（全部 `15-render-nodes-setstate-during-render-fix`）+ 编号短语 `docs/plans/2026-08-03-1616-1-*.md` bug 74 ×1——完整文件名合计 24 处 + 短语 1 处 = 25 处。
  - 涉及维护面文件：`docs/references/architecture-guardrails-from-bugs.md`、`docs/references/naming-conventions.md`、`docs/audits/round2-bug-note-gaps.md`、`docs/logs/2026/{04-24,05-06,06-22,06-25,08-03}.md`、`docs/analysis/*`、`docs/components/*` 等。
- **编号语义**：编号为规范 id（DB 裁决「文件名即规范 id，README 逐条登记即可区分」）；补后缀方案（15a/15b…）保持编号段不变、引用更新最小化，符合历史文档不回写纪律（Rule 21：已完成历史计划不回写，但引用路径可随文档维护更新）。

## Goals

- 6 个重号编号全部去重：14 个文件获得唯一可区分 id（后缀方案或等价裁决），编号段语义不变。
- `docs/bugs/README.md`「Current Entries」索引与重命名后文件名逐条一致，零缺口复核（README ↔ live 125 编号文件）。
- 全部跨文档引用（维护面：24 处完整文件名 + 3 处小写编号短语 + 大小写变体按裁决，Phase 1 精确盘点）同步更新，`rg` 旧文件名在维护面零残留。
- `pnpm check` exit 0（active-doc-code-anchors / docs-garbled 覆盖 docs 变更）。

## Non-Goals

- 不回写已完成历史 plan（Rule 21）；只更新 `docs/bugs/` 文件本体、README、以及引用这些路径的既有 docs 文件。
- 不重写任何 bug note 内容（7 节模板正文零改动，仅文件名）。
- 不改变「文件名即规范 id」原则本身；不做编号段整体重排（如 15→90 起重编号）。
- 不处理 DB 已收口的其他事项（索引漂移已修，非本 plan）。

## Scope

### In Scope

- `docs/bugs/` 14 个重号文件重命名（后缀方案 `15a-`/`15b-`/`15c-`/`15d-`、`16a-`/`16b-`、`17a-`/`17b-`、`44a-`/`44b-`、`67a-`/`67b-`、`74a-`/`74b-`，或经裁决等价方案）。
- `docs/bugs/README.md`「Current Entries」索引行同步。
- 维护面跨文档引用逐类更新（完整路径形态替换 + 编号短语形态按裁决消歧）。
- 重命名后零缺口核对（README ↔ live 文件 ↔ 引用三方一致）+ `pnpm check`。

### Out Of Scope

- bug note 正文内容修改。
- 历史 plan 回写（Rule 21）。
- `docs/bugs/00-bug-fix-note-writing-guide.md` 模板修订。

## Failure Paths

不适用（纯文档重命名治理，无运行时/用户可见失败路径；一致性由 `rg` 零残留 + `pnpm check` 锁定）。

## Test Strategy

本档选择：`不适用：纯文档治理（docs/bugs 文件重命名 + README/引用同步），无代码行为变更；验证以 `rg`旧名零残留计数 +`pnpm check`（active-doc-code-anchors/docs-garbled 覆盖 docs 变更）为可观测判定`

## Execution Plan

### Phase 1 - 引用面盘点与后缀方案裁决（Proof/Decision）

Status: planned
Targets: `docs/bugs/`、`docs/` 全量引用面

- Item Types: `Proof | Decision`

- [ ] 维护面引用逐条分类（完整路径形态 / 编号短语形态（含 `Bug 15`/`bug 15` 大小写变体，如 `docs/skills/deep-audit-prompts.md:908,924`、`docs/audits/2026-07-23-2141-*:342` 等 6 处候选——逐条裁决：纳入消歧或按「语义 lesson 引用非文件路径引用」裁定 out-of-scope）/ 其他），产出带 文件:行 的引用清单（维护面 = `docs/` 排除 `docs/bugs/**`、`docs/plans/**`、`docs/archive/**` 与本 plan 自身；历史 plan/archive 引用另列保留区清单，不更新）。
- [ ] 后缀方案裁决：`15a-` 等后缀 vs 其他方案（如按时间戳/内容编号），记录裁决理由（后缀保编号段 + 引用更新最小化）。

Exit Criteria:

- [ ] 维护面引用清单零遗漏（完整文件名 24 处 + 编号短语（小写 3 处 + 大小写变体按裁决纳入/裁定 out-of-scope），与 live `rg` 复核一致）；保留区（`docs/plans/**` 10 处 + `docs/archive/**` 14 处 + plans 短语 1 处）单独登记在案
- [ ] 后缀方案裁决记录在 plan（含被拒方案理由）

### Phase 2 - 重命名与索引同步（Fix）

Status: planned
Targets: `docs/bugs/*.md`（14 文件）、`docs/bugs/README.md`

- Item Types: `Fix`

- [ ] 14 个重号文件按裁决方案重命名（git mv 保持历史）。
- [ ] `docs/bugs/README.md`「Current Entries」索引行同步为终态文件名，编号段说明更新。

Exit Criteria:

- [ ] `ls docs/bugs/` 编号唯一性核对：`grep -oE '^\d+' | sort | uniq -d` 零输出
- [ ] README 索引与 live 文件逐条一致（`comm` 零缺口，125 编号文件全量核对）

### Phase 3 - 跨文档引用更新（Fix）

Status: planned
Targets: 维护面引用所在 docs 文件（24 处完整文件名 + 编号短语）

- Item Types: `Fix`

- [ ] 维护面完整路径形态引用全部替换为新文件名。
- [ ] 编号短语形态引用（如「bug note 15」）按裁决消歧（补文件名或上下文）。
- [ ] 保留区（`docs/plans/**` 历史 plan + `docs/archive/**`）引用不更新（Rule 21 历史保留，Deferred 已裁定），本 plan 自身文本内旧文件名属执行记录，保留并标注。

Exit Criteria:

- [ ] 维护面 `rg` 14 个旧文件名零命中（排除 `docs/bugs/**`、`docs/plans/**`、`docs/archive/**`、本 plan 自身）；保留区命中数保持 Phase 1 登记值（历史 plan 10 + archive 14，不新增）
- [ ] 引用更新后文件无 broken markdown 链接（抽查 + `pnpm check:active-doc-code-anchors`）

### Phase 4 - 收口验证与登记（Proof）

Status: planned
Targets: `docs/logs/2026/08-09.md`、`docs/audits/round2-bug-note-gaps.md`（如需回写）

- Item Types: `Proof`

- [ ] `pnpm check` exit 0（active-doc-code-anchors / docs-garbled 覆盖 docs 变更）+ README ↔ live ↔ 引用三方零缺口复核。
- [ ] daily log 收口登记 + DB plan Non-Blocking Follow-ups 对应条目终态回写。

Exit Criteria:

- [ ] daily log 登记完成，DB follow-up 条目标记治理收口
- [ ] 三方一致性复核记录在案

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，task `ses_01cde7235ffeJBoHnoE9tcGfiw` 轮 1 `revised` → `ses_01cd75ca7ffenM1cw59ADlDt1q` 轮 2 `revised` → `ses_01cd3d9d3ffe9nU1CjpYMWN6JU` 轮 3 `revised` → `ses_01cd07f1dffelw10UfBpdHfCys` 轮 4 `pass`，2026-08-09）
- Verdict: `pass`（轮 4 共识达成）
- Rounds: 4
- Findings addressed: 轮 1 Major×3（计数 16→14 文件/7→6 编号、baseline 陈旧数字 96/113 改 live 125/117、引用计数 61 不可复现）全修复；轮 2 Major（零残留检查不可达——本 plan 自身 + 历史 plans + archive 永久含旧名）→ 零残留检查收敛到维护面 + archive/plans 保留区入 Deferred；轮 3 Major（计数 scope 混入保留区 48→24、52→27、短语 4→3）全修复；轮 4 零 Blocker/Major，Minor×2 已修——保留区合计 24→25（完整文件名 24 + 短语 1）、短语枚举补大小写变体 6 处候选入 Phase 1 裁决

## Closure Gates

- [ ] 14 个重号文件全部去重，编号唯一性 `uniq -d` 零输出
- [ ] README「Current Entries」与 live 文件逐条一致（零缺口复核记录在案）
- [ ] 维护面旧文件名零残留（排除 `docs/bugs/**`、`docs/plans/**`、`docs/archive/**`、本 plan 自身）+ 引用更新无 broken 链接
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope 项
- [ ] 受影响 docs（README + 维护面引用文件 + daily log）已同步
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm check`（纯文档计划：`pnpm test`/`lint`/`typecheck`/`build` 按纯文档计划条款从门禁表移除）

## Deferred But Adjudicated

### 历史 plan 内对旧文件名的引用（`docs/plans/**`，10 处完整文件名 + 1 处短语）

- Classification: `watch-only residual`
- Why Not Blocking Closure: Rule 21（已完成历史计划不回写）优先；历史 plan 文本内的引用路径属历史记录，本次只更新「维护面」的引用，历史 plan 不改写。若需要完全一致可后续人工决定。
- Successor Required: `no`

### `docs/archive/**` 归档区引用（14 处）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 归档区是历史保留区（按 AGENTS.md「check `docs/archive/` 先例」语义），引用路径记录归档时的真实文件名；重命名只更新活跃维护面，归档区保持历史原样，避免在归档文档上制造「伪更新」。若需同步可后续人工决定。
- Successor Required: `no`

### bug note 正文内容陈旧问题

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: DB 已裁决「既有 note 内容陈旧问题归日常维护，不属治理轮次」；本 plan 只治理文件名唯一性。
- Successor Required: `no`

## Non-Blocking Follow-ups

- 若重命名过程中发现 README 排序/分组可读性优化点：登记 daily log，不扩大本 plan 范围。
- 其余 docs 治理项（如引用格式统一）：归未来文档治理轮次。

## Closure

Status Note: （待执行后填写）

Closure Audit Evidence:

- Auditor / Agent: （待独立审计者填写）
- Evidence: （待填）

Follow-up:

- （待填）
