# 2 docs/bugs 重号文件名治理（15×4、16×2、17×2、44×2、67×2、74×2）

> Plan Status: completed
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

Status: completed
Targets: `docs/bugs/`、`docs/` 全量引用面

- Item Types: `Proof | Decision`

- [x] 维护面引用逐条分类（完整路径形态 / 编号短语形态（含 `Bug 15`/`bug 15` 大小写变体，如 `docs/skills/deep-audit-prompts.md:908,924`、`docs/audits/2026-07-23-2141-*:342` 等 6 处候选——逐条裁决：纳入消歧或按「语义 lesson 引用非文件路径引用」裁定 out-of-scope）/ 其他），产出带 文件:行 的引用清单（维护面 = `docs/` 排除 `docs/bugs/**`、`docs/plans/**`、`docs/archive/**` 与本 plan 自身；历史 plan/archive 引用另列保留区清单，不更新）。
- [x] 后缀方案裁决：`15a-` 等后缀 vs 其他方案（如按时间戳/内容编号），记录裁决理由（后缀保编号段 + 引用更新最小化）。

Exit Criteria:

- [x] 维护面引用清单零遗漏（完整文件名 24 处 + 编号短语（小写 3 处 + 大小写变体按裁决纳入/裁定 out-of-scope），与 live `rg` 复核一致）；保留区（`docs/plans/**` 10 处 + `docs/archive/**` 14 处 + plans 短语 1 处）单独登记在案
- [x] 后缀方案裁决记录在 plan（含被拒方案理由）

**Phase 1 盘点结果（live `rg` 复核，2026-08-09）**：

- 后缀方案裁决：采用 README「Current Entries」顺序后缀——`15a-`/`15b-`/`15c-`/`15d-`、`16a-`/`16b-`、`17a-`/`17b-`、`44a-`/`44b-`、`67a-`/`67b-`、`74a-`/`74b-`（README:30-37,62-63,86-87,94-95 登记顺序即后缀序，确定性可复现）。被拒方案：① 整段重编号（如 15→90）——破坏「编号段语义」与历史日志「bug 15」表述连续性，引用面变更最大；② 时间戳后缀（如 `15-20260622-*`）——非语义、不可读；③ 内容语义重命名——丢失编号↔bug note 双向查找锚点。后缀方案保编号段 + 引用更新最小化，符合 DB「文件名即规范 id」裁决。
- 维护面完整文件名引用 24 处（与 baseline 一致，逐条 `文件:行`）：
  - `15b-component-level-initfetch-analysis-and-fix`（12 处）：`docs/audits/round2-bug-note-gaps.md:38`、`docs/components/form/design.md:25`、`docs/references/naming-conventions.md:130`、`docs/components/existing-components-improvement-analysis.md:88`、`docs/components/existing-components-improvement-roadmap.md:58`、`docs/components/existing-components-improvement-roadmap.md:125`、`docs/components/condition-builder/design.md:34`、`docs/components/amis-bug-driven-improvements/README.md:46`、`docs/components/roadmap.md:309`、`docs/components/amis-bug-driven-improvement-roadmap.md:262`、`docs/logs/2026/06-25.md:141`、`docs/logs/2026/06-22.md:84`
  - `15a-render-nodes-setstate-during-render-fix`（2 处）：`docs/references/architecture-guardrails-from-bugs.md:52`、`docs/analysis/2026-05-24-deep-audit-full/07-lifecycle.md:9`
  - `15d-flux-runtime-source-reaction-recursion-and-dependency-guard-regression`（2 处）：`docs/logs/2026/04-24.md:313`、`docs/logs/2026/04-24.md:341`
  - `44a-performance-table-full-stress-root-array-form-hang-fix`（1 处）：`docs/logs/2026/05-06.md:15`；`44b-flow-designer-tree-merge-layering-layout-fix`（2 处）：`docs/logs/2026/05-06.md:23`、`docs/analysis/2026-08-03-dingflow-tree-layout-unification.md:458`
  - `67a/67b/74a/74b`（4 处，同段落）：`docs/audits/round2-bug-note-gaps.md:37`；`74b`（1 处）：`docs/logs/2026/08-03.md:203`
- 编号短语形态：小写 3 处**纳入消歧**——`docs/logs/2026/04-24.md:312`（bug 15 → 15d）、`docs/logs/2026/08-03.md:224`（bug 74 → 74b）、`docs/logs/2026/08-03.md:236`（bug 74 → 74b）。大小写变体 6 处**裁定 out-of-scope**（语义 lesson 引用非文件路径引用，上下文已明示所指教训/模式，不构成 broken link；且历史审计快照与 skill 提示词按历史保留纪律不改写）：`docs/skills/deep-audit-prompts.md:908`、`docs/skills/deep-audit-prompts.md:924`、`docs/audits/2026-07-23-2141-multi-audit-ai.md:342`、`docs/audits/2026-07-28-0814-multi-audit-audit-remediation.md:375`、`docs/audits/2026-07-28-0650-multi-audit-audit-remediation.md:257`、`docs/analysis/2026-05-24-deep-audit-full/07-lifecycle.md:17`。
- 额外 broken-link 修复（docs/bugs 内部互引，虽排除在维护面计数外但必须随重命名同步防断链）：`docs/bugs/40-performance-table-profiler-loop-and-mode-remount-fix.md:53` → 引用 `44-performance-table-full-stress-root-array-form-hang-fix`（新 `44a-`）。
- 无更新项（非 14 个旧文件名）：`docs/components/pull-refresh/design.md:29`（通配 `docs/bugs/15-*.md` 形态）、`docs/skills/deep-audit-prompts.md:906` + `docs/analysis/2026-05-23-deep-audit-full/07-lifecycle.md:8`（均指不存在的 `docs/bugs/15-setstate-during-render.md`，非重号文件）。
- 保留区（不更新，Rule 21 历史保留）：`docs/plans/**` 完整文件名 10 处（全 `15-component-level-initfetch-analysis-and-fix`：`2026-06-22-1343-1`×1、`2026-06-22-1500-1`×6、`2026-06-24-0335-1`×1、`2026-06-24-0718-1`×1、`2026-08-08-0900-2`×1）+ `docs/archive/**` 完整文件名 14 处（全 `15-render-nodes-setstate-during-render-fix`：`2026-04-17`×1、`2026-04-26`×1、`2026-05-13`×2、`2026-05-20`×10）+ plans 短语 1 处（`2026-08-03-1616-1-c3-4-*.md:213` bug 74）+ 本 plan 自身 2 处（执行记录保留）。

### Phase 2 - 重命名与索引同步（Fix）

Status: completed
Targets: `docs/bugs/*.md`（14 文件）、`docs/bugs/README.md`

- Item Types: `Fix`

- [x] 14 个重号文件按裁决方案重命名（git mv 保持历史）。
- [x] `docs/bugs/README.md`「Current Entries」索引行同步为终态文件名，编号段说明更新。

Exit Criteria:

- [x] `ls docs/bugs/` 编号唯一性核对：`grep -oE '^\d+' | sort | uniq -d` 零输出
- [x] README 索引与 live 文件逐条一致（`comm` 零缺口，125 编号文件全量核对）

> 注：终态唯一性核对命令按后缀方案校准为 `ls docs/bugs/ | grep -oE '^[0-9]+[a-z]?' | sort | uniq -d` 零输出（`^\d+` 对 `15a-` 仍会截取 `15`，非终态 id 语义）；14 文件 `git mv` 完成（15a-d/16a-b/17a-b/44a-b/67a-b/74a-b），README Rules 补「letter suffix 消歧」说明，Current Entries 8 行（30-37,62-63,86-87,94-95）同步终态文件名，`comm` 零缺口（README 126 条目 = live 126 编号文件，含指南 00）。

### Phase 3 - 跨文档引用更新（Fix）

Status: completed
Targets: 维护面引用所在 docs 文件（24 处完整文件名 + 编号短语）

- Item Types: `Fix`

- [x] 维护面完整路径形态引用全部替换为新文件名。
- [x] 编号短语形态引用（如「bug note 15」）按裁决消歧（补文件名或上下文）。
- [x] 保留区（`docs/plans/**` 历史 plan + `docs/archive/**`）引用不更新（Rule 21 历史保留，Deferred 已裁定），本 plan 自身文本内旧文件名属执行记录，保留并标注。

Exit Criteria:

- [x] 维护面 `rg` 14 个旧文件名零命中（排除 `docs/bugs/**`、`docs/plans/**`、`docs/archive/**`、本 plan 自身）；保留区命中数保持 Phase 1 登记值（历史 plan 10 + archive 14，不新增）
- [x] 引用更新后文件无 broken markdown 链接（抽查 + `pnpm check:active-doc-code-anchors`）

**Phase 3 执行记录（2026-08-09）**：17 个维护面文件 + `docs/bugs/40-performance-table-profiler-loop-and-mode-remount-fix.md`（docs/bugs 内部互引防断链）perl 全量替换 14 旧文件名 → 新后缀名；3 处小写短语消歧——`docs/logs/2026/04-24.md:312`（bug 15 → bug 15d + 全路径）、`docs/logs/2026/08-03.md:224`（bug 74 → bug 74b + 全路径）、`docs/logs/2026/08-03.md:236`（bug 74 → bug 74b）。维护面 `rg` 零残留（exit 1 无命中）；保留区复核 10 + 14 维持不增；`pnpm check:active-doc-code-anchors` 见 Phase 4。

### Phase 4 - 收口验证与登记（Proof）

Status: completed
Targets: `docs/logs/2026/08-09.md`、`docs/audits/round2-bug-note-gaps.md`（如需回写）

- Item Types: `Proof`

- [x] `pnpm check` exit 0（active-doc-code-anchors / docs-garbled 覆盖 docs 变更）+ README ↔ live ↔ 引用三方零缺口复核。
- [x] daily log 收口登记 + DB plan Non-Blocking Follow-ups 对应条目终态回写。

Exit Criteria:

- [x] daily log 登记完成，DB follow-up 条目标记治理收口
- [x] 三方一致性复核记录在案

**Phase 4 执行记录（2026-08-09）**：`pnpm check` exit 0（12 项 check:\* 链；check:active-doc-code-anchors 零命中；oversized-code-files 158 warnings/2 errors/2 exempt 为既有注册基线不变）+ `pnpm check:docs-garbled` 单独复核 exit 0（9 likely-garbled 候选全为既有文件法语「facade」拼写，本 plan 改动文件零入选）；三方一致性——README ↔ live `comm` 零缺口（126 = 126，含指南 00）+ 维护面引用新文件名逐一落盘存在（裸文件名形态 `round2-bug-note-gaps.md:37,38` 同步核验）+ 维护面旧名零残留；daily log `docs/logs/2026/08-09.md` 新节登记；DB plan `docs/plans/2026-08-08-0900-2-round2-db-bug-note-backfill.md` Non-Blocking Follow-ups 重号条目终态回写（标记已收口 + 治理证据）。`docs/audits/round2-bug-note-gaps.md` 无需回写（重命名不改变盘点表语义，仅引用行已随 Phase 3 更新）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，task `ses_01cde7235ffeJBoHnoE9tcGfiw` 轮 1 `revised` → `ses_01cd75ca7ffenM1cw59ADlDt1q` 轮 2 `revised` → `ses_01cd3d9d3ffe9nU1CjpYMWN6JU` 轮 3 `revised` → `ses_01cd07f1dffelw10UfBpdHfCys` 轮 4 `pass`，2026-08-09）
- Verdict: `pass`（轮 4 共识达成）
- Rounds: 4
- Findings addressed: 轮 1 Major×3（计数 16→14 文件/7→6 编号、baseline 陈旧数字 96/113 改 live 125/117、引用计数 61 不可复现）全修复；轮 2 Major（零残留检查不可达——本 plan 自身 + 历史 plans + archive 永久含旧名）→ 零残留检查收敛到维护面 + archive/plans 保留区入 Deferred；轮 3 Major（计数 scope 混入保留区 48→24、52→27、短语 4→3）全修复；轮 4 零 Blocker/Major，Minor×2 已修——保留区合计 24→25（完整文件名 24 + 短语 1）、短语枚举补大小写变体 6 处候选入 Phase 1 裁决

## Closure Gates

- [x] 14 个重号文件全部去重，编号唯一性 `uniq -d` 零输出
- [x] README「Current Entries」与 live 文件逐条一致（零缺口复核记录在案）
- [x] 维护面旧文件名零残留（排除 `docs/bugs/**`、`docs/plans/**`、`docs/archive/**`、本 plan 自身）+ 引用更新无 broken 链接
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 项
- [x] 受影响 docs（README + 维护面引用文件 + daily log）已同步
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm check`（纯文档计划：`pnpm test`/`lint`/`typecheck`/`build` 按纯文档计划条款从门禁表移除）

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

Status Note: 2026-08-09 执行完成。4 Phase 全 completed。纯文档治理零代码变更：6 重号编号 14 文件后缀去重（15a-d/16a-b/17a-b/44a-b/67a-b/74a-b，README 登记顺序即后缀序，`git mv` 保持历史）；README Rules 补 letter-suffix 消歧说明 + Current Entries 8 行同步（comm 零缺口 126 = 126）；维护面 24 处完整文件名引用 + 3 处小写编号短语消歧 + `docs/bugs/40-*.md:53` 内部互引防断链；大小写变体 6 处按裁决 out-of-scope（语义 lesson 引用，历史快照不改写）；保留区（plans 10 + archive 14 + 短语 1）Rule 21 历史保留。验证：维护面 `rg` 旧名零残留、`pnpm check` exit 0（check:active-doc-code-anchors 零命中）、`pnpm check:docs-garbled` exit 0（9 候选全为既有法语拼写文件，改动文件零入选）、daily log `docs/logs/2026/08-09.md` 登记 + DB plan Non-Blocking Follow-ups 条目终态回写 + roadmap DB 节行内注记收口。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session `ses_01c7e5ebfffeOROQcBOQ37AEcs`，2026-08-09）
- Evidence: Verdict **pass**（零 Blocker/Major，Minor×1 已修）——10 项核对全 PASS：① 14 文件重命名 + 后缀映射与 README 登记顺序一致（`grep -oE '^[0-9]+[a-z]?' | uniq -d` 零输出）；② README ↔ live `comm` 零缺口（126 = 126）；③ 维护面 14 旧文件名 `rg` 零残留（exit 1）；④ 保留区计数不变（plans 10 + archive 14 + 短语 1）；⑤ 维护面引用新路径逐一落盘存在；⑥ 6 处大写变体短语未动（语义 lesson out-of-scope 裁决成立）；⑦ daily log / DB plan 回写 / roadmap 行内注记三处登记在案；⑧ plan 文本一致性（4 Phase completed、全部 item/Exit [x]、closure-audit 门禁保持 [ ]、Plan Status 保持 active 待审计授权）；⑨ README 无旧名残留 + git 14 条 R（rename）历史；⑩ `git status` 仅 docs/ 变更零代码文件。Minor×1：Phase 4 记录「9 likely-garbled 零改动文件入候选」在审计时点不准确——本 plan 自身与 daily log 因记录文本内法文「façade」的 ç 字符入候选（check 非门禁 exit 0）；已修（改为 ASCII「facade」，两文件出候选，`check:docs-garbled` 复跑 9 = 9 全为既有文件 exit 0）。审计授权：closure-audit 门禁可勾选。

Follow-up:

- no remaining plan-owned work。非阻塞观察项：历史 plan/archive 内旧文件名引用（plans 10 + archive 14 + 短语 1）按 Rule 21 保留，如需完全一致可后续人工决定。
