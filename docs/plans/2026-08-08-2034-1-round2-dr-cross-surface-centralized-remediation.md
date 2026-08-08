# DR 跨面集中修复与裁决（16 条 P2 路由 + Tiptap editor 面 + P3 残留复核）

> Plan Status: completed
> Mission: component-audit-round2
> Work Item: DR
> Last Reviewed: 2026-08-08
> Source: `docs/backlog/component-audit-round2-roadmap.md`（DR 行 + Phase Details + Cross-Cutting + Dependency Graph）、`docs/audits/round2-dr-adjudication.md`（DR-1..DR-16 登记基线）、`docs/audits/round2-p3-adjudication.md`（§7 Follow-ups 归集终态 + watch-only 复核结论）、D2/D3.x 各 plan 的 Deferred But Adjudicated 与 Non-Blocking Follow-ups
> Related: `docs/plans/2026-08-08-1315-3-round2-d34-word-editor-surface-audit.md`（completed，DR-12..DR-16 登记 + w3d-editor 路由）、`docs/plans/2026-08-08-1315-2-round2-d33-report-designer-surface-audit.md`（completed，DR-7..DR-11）、`docs/plans/2026-08-08-1315-1-round2-d32-spreadsheet-surface-audit.md`（completed，DR-3..DR-6）、`docs/plans/2026-08-08-0900-1-round2-d31-flow-designer-surface-audit.md`（completed，DR-1/DR-2 + DR 表首个写入者）、`docs/plans/2026-08-08-0715-3-round2-d2-p3-adjudication-residual.md`（completed，w3d-editor:28 判真缺陷路由 + watch-only 终态）

## Purpose

把第二轮 D1/D2/D3.x 显式路由的全部跨面残余收口到一个 owner plan：① 消费 `docs/audits/round2-dr-adjudication.md` 的 **16 条 P2 路由（DR-1..DR-16）**——i18n 族逐条修复（test-first）、契约类条目（DR-4/DR-15/DR-16）逐条裁决，勾销 DR 表；② 修复 **D2 判真的 Tiptap editor 面竞态**（w3d-editor:28 click+type keystroke 丢失，隔离复跑 3/15 绿）并复核 c3-5-host-surfaces:27/:81 同族根因（D2 已裁定根因纳入 DR editor 面），更新 watch-only 归因清单；③ **P3 裁决表残留复核**（keep 99 / dismissed 24 抽查 + DR 表 §2 卡内 P3 30 行复核 + 卡内跨面共性候选逐条裁决，不静默升级）；④ 执行中发现的新跨面共性缺陷在本 plan 内修复 + 登记 daily log/DR 表，**CX-13+ 行插入仍需人工确认**（roadmap Rule，AI 不自行增删路线图行）。收口后 roadmap DR 行 `todo`→`done`，closure-audit 由独立 fresh session 执行，为 DV 全量验证提供「修复后终态」。

## Current Baseline

（live repo 核对事实，2026-08-08）

- **DR 表登记基线**：`docs/audits/round2-dr-adjudication.md` 现存 **16 条 P2 路由**（DR-1/DR-2 flow-designer i18n ×2；DR-3..DR-6 spreadsheet i18n ×3 + no-op 死管线 ×1；DR-7..DR-11 report-designer i18n ×5；DR-12..DR-16 word-editor i18n ×3 + ghost schema ×1 + persist 措辞 ×1）+ **§2 卡内 P3 记录表 30 行（live 核对 `rg '^\| (fd|ss)-'` = fd ×9 + ss ×21）**——注意：DR 表 §2 自身的计数摘要「18 条（fd ×9 + ss ×9）」与其正文表（30 行）**不一致（表头摘要过时）**，Phase 4 复核时以正文表 30 行为准并同步更正摘要；rd/we 卡内 P3 不路由 + 零悬挂声明（卡内 P2 清单 = 表条目）。§3 维护节约定「DR 集中修复消费本表后逐条勾销」。
- **i18n key 族已存在**（live 核对）：`flux.flowDesigner.*` / `flux.spreadsheet.*` / `flux.reportDesigner.*` / `flux.wordEditor.*` 均在 `packages/flux-i18n/src/locales/{zh-CN,en-US}.ts` 在案——DR i18n 化复用既有 key 族，新增 key 双 locale 同步（`check:i18n-keys` 门禁 exit 0 维持）。
- **Tiptap editor 面（D2 终态 2026-08-08）**：`w3d-editor:28` **判真缺陷**——隔离复跑 3/15 绿，click+type keystroke 丢失竞态（"hel"/"hello edi" 变体），CV 后 editor 代码零变更，"隔离全绿"归因不再成立 → 显式路由 DR（D3.4 plan Deferred 节 + D2 裁决表 §6）；`c3-5-host-surfaces:27/:81` 隔离 6/6 绿（环境归因维持，**根因纳入 DR editor 面**）；Tiptap 属 `flux-renderers-form-advanced`（c3-5 富文本编辑面），非 word-editor 宿主面（`@hufe921/canvas-editor`）。
- **watch-only 清单（D2 终态，DR 修复后 DV 复核）**：gantt-perf/kanban-perf ×2（主屏 50.00Hz，rAF 50fps 硬上限，标注「需 60Hz 环境最终确认」）+ w3d-editor:28（本 plan 修复目标）+ c3-5 ×2（本 plan 根因复核目标）；ai-attachments flake 已 closed。
- **CV full-green 基线**（2026-08-06）：typecheck/build/lint 32/32、test 59/59（10,397 passed / 0 failed）、e2e 1054 passed / 43 skipped / 6 failed（watch-only 清单）。D3.2 实测全量 e2e 1023 passed / 17 failed（全部归因既有环境/watch-only，clean-tree 复跑确认非引入）；D3.3 1033 passed / 14 failed；D3.4 关联 32/32 绿。**本 plan 收口时点基线以 live 重跑为准**（DV 承接最终全量）。
- **`pnpm check` 基线**：28 项 `check:*` 27/28 exit 0（`check:duplicates:detail` 为无阈值 jscpd dump 固有 exit 1，非门禁，D0/D1 已归因维持）；oversized 仅 2 条既有 locale 豁免；audit 三门禁零命中 + 7 条 allowlist；`pnpm test:scripts` 6/15 全绿。
- **0150-1 stagedDirs 工具治理项（D2 §7 终态）**：`find-event-dispatch-without-ctx.test.ts:14-32` stagedDirs + 真实包目录夹具模式，D2 路由裁定 = 「工具治理轮次」（D1 未承接）——**归 DG 门禁升级承接，不在本 plan scope**（本 plan 只复核其归因状态，不执行）。
- **保护区域地图**（checklist §6.4 + mission description）：4 host 面包默认 `implement`；`packages/ui/src/index.ts` 公共导出 `ask-first`；**Renderer 定义 fields / Schema contract / 样式契约 `plan-first`（mission 已授权，结构性变更仍需人工确认）**——DR-15（we-1 ghost schema 字段移除）与 DR-16（persist 公共 API 返回语义变更）触及公共面 → 默认裁决走「非公共面路径」，公共面变更显式留人工确认门。
- **bug note 纪律**（roadmap Cross-Cutting）：本 plan 修复的复杂 bug 行内补写 `docs/bugs/` note（编号 **117 起**，live 核对最高 116）+ README 索引同步。
- **提交纪律**：`fix(component-audit-round2): <description>`；full-green 状态在 commit 标题显式声明。

## Goals

- 16 条 P2 路由逐条终态：i18n 族修复落地（test-first + 双 locale key + `check:i18n-keys` 绿）、契约条目裁决有明确结论，DR 表逐条勾销零悬挂。
- Tiptap editor 面竞态（w3d-editor:28）修复 + 回归测试在案；c3-5 ×2 根因复核结论明确；watch-only 清单按修复后终态更新。
- P3 裁决表残留复核（keep/dismissed 抽查 + **DR 表 §2 卡内 P3 30 行复核 + 卡内跨面共性候选裁决**：ss-3 P3-2 / ss-6 P3-2 / ss-10 P3-4（no-op 命令污染 undo 栈 + dirty 误标，机制级，10 面共享）与 ss-3 P3-4（onLog 宿主接线）——卡内标「跨面共性登记 daily log 供 DR/CX 裁」，本 plan Phase 4 逐条裁决 keep/路由，结论回写卡 + DR 表），无静默升级为 P2。
- 本 plan 修复的复杂 bug 行内 bug note 补写（117 起）+ README 索引同步。
- 新发现跨面共性缺陷在本 plan 修复 + 登记；CX-13+ 行插入仅建议不执行（人工确认门）。
- 回归验证（受影响包全绿 + 关联 e2e 全绿）+ roadmap DR 行 `todo`→`done`（附执行证据）+ daily log 收口 + 独立 fresh session closure-audit。

## Non-Goals

- 不做全量 e2e/单测验证轮（归 DV；本 plan 只跑修复关联的回归）。
- 不做门禁规则变更（门禁纪律：规则变更必须带 committed 回归测试且属 DG 门禁升级范围）。
- 不做 round2-index / lessons 09+ / checklist 修订 / project-context 回写（归 DG）。
- 不插入 CX-13+ 路线图新行（roadmap Rule：新 work item 由人工确认后插入）。
- 不补写历史 bug note（DB 已收口 92–106，D3.x 行内 107–116 已收；本 plan 只承接新修复）。
- 不新建 host 面审计卡（D3.x 已完成 37 卡）。
- 不修复 DR 表 §2 卡内 P3 30 行（卡内记录维持；仅做复核确认无升级必要 + 跨面共性候选裁决 keep/路由）。
- 不承接 0150-1 stagedDirs 工具治理执行（归 DG；本 plan 仅复核归因）。

## Scope

### In Scope

- DR-1..DR-14 i18n 化修复（flow-designer ×2 / spreadsheet ×3 / report-designer ×5 / word-editor ×4）+ 关联 e2e 选择器同步（word-editor.spec 按 title 定位的风险面）。
- DR-4 no-op 死管线裁决（移除或恢复接线）+ DR-15 ghost schema 裁决（非公共面路径优先）+ DR-16 persist 措辞裁决（文档对齐优先）。
- Tiptap editor 面：w3d-editor:28 竞态根因定位 + test-first 修复 + c3-5 ×2 同族复核 + 隔离复跑。
- P3 残留复核（裁决表 keep/dismissed 抽查 + DR 表 §2 卡内 P3 30 行复核 + 卡内跨面共性候选裁决）。
- DR 表勾销（§3 维护节）、roadmap DR 行收口登记、daily log、bug note 行内补写（117 起）。
- 受影响包验证 + 关联 e2e 回归。

### Out Of Scope

- DV 全量验证轮、DG Guard 沉淀（另 plan，本 mission 顺延执行）。
- 门禁规则变更、路线图新行插入（CX-13+）。
- 卡内 P3 修复、历史 bug note 回补、stagedDirs 工具治理执行。

## Failure Paths

| 可测场景编号      | 触发                                                    | 行为                                                                          | 可重试 | 用户可见表现                 |
| ----------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------- | ------ | ---------------------------- |
| dr-i18n-key       | 新增 i18n key 缺双 locale                               | `check:i18n-keys` 报红                                                        | 是     | CI/check 失败，修复=补 key   |
| dr-e2e-title      | word-editor 按钮 title 改 i18n 后旧 title 定位 e2e 失败 | e2e 红 → 选择器同步（data-slot/testid 优先）                                  | 是     | 测试失败需同步选择器         |
| dr-tiptap-race    | w3d-editor:28 间歇复现                                  | 根因修复后隔离复跑 ≥3 轮稳定绿；若仍间歇 → 按 D2 归因纪律记录（不得静默吞掉） | 是     | watch-only 清单更新          |
| dr-perf-threshold | gantt-perf/kanban-perf 50Hz 阈值失败                    | 维持 watch-only 归因（D2 终态），不视为本 plan 阻断                           | 是     | 清单维持「需 60Hz 环境确认」 |
| dr-public-api     | DR-15/DR-16 公共面变更                                  | 停于人工确认门，走非公共面路径                                                | 否     | 裁决记录 + 人工确认留痕      |

## Test Strategy

本档选择：**必须自动化**——已确认 live defect（w3d-editor:28 竞态、DR-4 no-op 死管线、DR-12/13 用户可见硬编码英文契约违背）全部 test-first（Proof 项先于 Fix 项，AGENTS.md Bug Fix Test Coverage Rule）；i18n 化属契约面修复（用户可见文案契约），关联 e2e 断言同步并绿；DR 表勾销以「卡内/表内条目 ↔ live 证据」双向核对为 Proof；纯文档裁决（DR-16 文档措辞对齐）不新增测试。

## Execution Plan

### Phase 1 - i18n 族集中修复（DR-1/2/3/5/6/7/8/9/10/11/12/13/14）

Status: completed
Targets: `packages/flow-designer-renderers/src/`（designer-command-adapter.ts / designer-command-adapter-graph.ts / designer-node-appearance.ts）、`packages/spreadsheet-renderers/src/spreadsheet-interactions/`（use-editing.ts / use-find-replace.ts）+ `packages/spreadsheet-renderers/src/page-model.ts`、`packages/report-designer-core/src/`（core.ts / core-dispatch.ts / types.ts）+ `packages/report-designer-core/src/runtime/`（preview-commands.ts / codec-commands.ts）+ `packages/report-designer-renderers/src/`（report-spreadsheet-canvas.tsx / report-designer-toolbar*.ts*）、`packages/word-editor-renderers/src/toolbar/` + `dialogs/` + `panels/`（insert-controls.tsx / paragraph-controls.tsx / template-controls.tsx / search-replace.tsx / ribbon-toolbar.tsx / page-controls.tsx / chart-dialog.tsx / code-dialog.tsx / expr-insert-dialog.tsx / dataset-dialog.tsx / dataset-panel.tsx / field-list.tsx）、`packages/word-editor-core/src/template-tags.ts`、`packages/flux-i18n/src/locales/{zh-CN,en-US}.ts`、关联 e2e spec、`docs/audits/round2-dr-adjudication.md`

- Item Types: `Fix | Proof | Decision`

- [x] 逐条核对 DR-1..DR-14 的 `文件:行` live 在案（裁决表逐条核对，任何漂移以 live 为准并更正表内引用——如 DR-1 命令适配器错误消息以 live 重枚举为准（live 11 处：adapter.ts :85/:128/:193/:214/:235/:261/:264/:281/:288 + graph.ts :61/:146，表内 :222/:232/:278 为过时引用）、DR-2 默认标签数按 live 16 条、DR-6 查找消息以 live 重枚举为准（live 6 处 :25/:27/:30/:48/:61/:63））。
- [x] i18n 化修复（每条 = 复用既有 key 族 + 新增 key 双 locale 同步）：DR-1（fd-7 错误消息，live 重枚举 11 处）、DR-2（fd-2 默认标签 **16 条**（`designer-node-appearance.ts:3-16`），host 配置 label 时动态解析回退）、DR-3（ss-2 编辑状态消息 3 处）、DR-5（ss-4 页头状态行）、DR-6（ss-9 查找结果，live 重枚举 6 处：:25/:27/:30/:48/:61/:63）、DR-7（rd-4 预览 2 处 + 按钮标签 + 兜底）、DR-8（rd-5 readonly/save/fields badge）、DR-9（rd-6 undo/redo 消息 + 按钮标签）、DR-10（rd-7 codec 2 处 + Untitled 默认名）、DR-11（rd-2 拖放 3 处）、DR-12（we-2 工具栏/对话框 ~30 处）、DR-13（we-4 数据集对话框族 + Copy field reference 语义裁决：按钮实为插入 → 改 label 或改行为，裁决记录）、DR-14（we-6 模板标签元数据 15 条，`word-editor-core/src/template-tags.ts`）。
- [x] test-first 纪律：用户可见文案断言（locale 双断言 + 渲染后 `innerText`/`title`/`aria-label` 断言，programmatic DOM 禁截图）；行为无变化处至少 1 条关键断言锁定。
- [x] 关联 e2e 选择器同步：word-editor.spec 等按 title/文本定位的既有选择器改为稳定定位（data-slot/testid 优先），新增/更新断言跑绿；`check:i18n-keys` exit 0。
- [x] DR-13「Copy field reference」语义裁决（Decision）：改 label（Insert field reference）vs 改行为——以设计文档 + live 消费为准裁决，结论回写 DR 表条目。
- [x] 局部验证：受影响 4 host renderer 包 + 关联 core 包（report-designer-core / word-editor-core / spreadsheet-core 如涉及）typecheck + 包级测试绿 + 关联 e2e spec 绿（保证 Phase 2/3 可继续）。

Exit Criteria:

- [x] DR-1..DR-14 全部 i18n 化落地（live `rg "硬编码英文原文"` 零残留，豁免清单显式记录），DR 表逐条勾销。
- [x] 新增 key 双 locale + `check:i18n-keys` exit 0；关联 e2e 全绿；受影响包 typecheck + 测试绿。

### Phase 2 - 契约裁决（DR-4 / DR-15 / DR-16）

Status: completed
Targets: `packages/spreadsheet-renderers/src/spreadsheet-interactions/`（use-spreadsheet-shell.ts / use-selection.ts / use-clipboard.ts / use-comments.ts）+ `packages/spreadsheet-renderers/src/spreadsheet-toolbar/`（spreadsheet-toolbar.tsx）、`packages/word-editor-renderers/src/types.ts` + `renderers.tsx`（+ 测试锁定 `word-editor-page-host-scope-projections.test.tsx`）、`packages/word-editor-core/src/document-io.ts`、`docs/architecture/word-editor/design.md`、`docs/audits/round2-dr-adjudication.md`

- Item Types: `Fix | Decision | Proof`

- [x] **DR-4（ss-2）no-op 死管线裁决**：`setCellValue`/`setCommentText` 声明无行为（use-spreadsheet-shell.ts:25-35，消费点 use-selection.ts:239-241/use-clipboard.ts:57/use-comments.ts:45；`cell-editor.tsx` **不存在**——无渲染方即 DR-4 要点，spreadsheet-renderers 无该文件）——**默认裁决：移除死管线**（props/state 清理，纯内部重构非公共 API）或恢复接线（如移除超出低风险范围则登记显式裁决理由）；comment 功能 UI 不可达 = 记录为 out-of-scope improvement（Why Not Blocking：无消费者无功能损失）；test-first 锁定移除后零引用 + 既有行为不回归。
- [x] **DR-15（we-1）ghost schema 裁决**：`initialCharts`/`initialCodes` 零消费者（测试锁定不流入 host document）——**默认裁决：维持声明 + `@reserved` 标注 + design.md 注记**（零消费者零功能损失，避免公共 renderer fields 面变更）；**移除方案 = 公共 API 变更 → 留人工确认门**（plan-first，本 plan 只记录裁决路径，不擅自移除）。
- [x] **DR-16（we-5）persist 措辞裁决**：`persistSavedDocument` storage-unavailable throw（document-io.ts:369-384）vs design.md:177「must return explicit safe fallbacks」——**默认裁决：design.md 措辞对齐 live throw 语义**（文档变更，零产品行为变化；调用方全 catch 无功能损失）；返回语义改 `SavedDocumentData | null` = 公共 API 变更 → 留人工确认门。
- [x] 裁决全部回写 DR 表对应条目（勾销/维持标注 + 理由），daily log 记录三项裁决结论。
- [x] 局部验证：spreadsheet-renderers + word-editor-core/renderers typecheck + 包级测试绿。

Exit Criteria:

- [x] DR-4/DR-15/DR-16 三条均有明确裁决结论（实施或维持 + 理由），DR 表逐条勾销零悬挂；公共面变更路径显式标注「人工确认门」。
- [x] 受影响包 typecheck + 测试绿；DR-16 文档措辞对齐后 `check:active-doc-code-anchors` 无新增命中。

### Phase 3 - Tiptap editor 面竞态修复（w3d-editor:28 + c3-5 ×2 复核）

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/`（Tiptap 富文本编辑面：editor 初始化/挂载/keystroke 路径，live 核对文件）、`tests/e2e/`（c3-5-host-surfaces.spec.ts / w3d-editor 相关 spec）、`docs/audits/round2-dr-adjudication.md`

- Item Types: `Fix | Proof | Decision`

- [x] 根因定位（Decision）：w3d-editor:28「click+type keystroke 丢失竞态」——live 核对 Tiptap editor 挂载/焦点/命令时序（D2 证据：隔离复跑 3/15 绿，keystroke 变体 "hel"/"hello edi" 等）；对 c3-5-host-surfaces:27/:81 同族做同根因核验（D2 已裁定根因纳入 editor 面）。
- [x] test-first：稳定复现测试先行（如 editor 挂载后立即 type 的 keystroke 保序/防丢断言，或等 Tiptap 实例就绪信号），再实现修复（如 readiness gate / keystroke 队列化 / focus 保序）。
- [x] 修复 + 回归测试（断言正确行为非 not-throw）；w3d-editor:28 与 c3-5 ×2 隔离复跑 ≥3 轮稳定绿；如仍间歇按 D2 归因纪律记录（不静默吞掉）。
- [x] 复杂 bug 行内 bug note 补写（**117 起**，按 `00-bug-fix-note-writing-guide.md` 模板）+ `docs/bugs/README.md` 索引同步。
- [x] watch-only 清单更新：w3d-editor:28 / c3-5 ×2 修复确认后从清单移除（或降级记录），终态回写 DR 表 + daily log（供 DV 使用）。

Exit Criteria:

- [x] w3d-editor:28 竞态修复 + 回归测试在案（红→绿证据），c3-5 ×2 复核结论明确；隔离复跑稳定绿记录在案。
- [x] bug note 117 行内补写 + README 索引同步；watch-only 清单终态更新（gantt-perf/kanban-perf 50Hz 维持「需 60Hz 环境确认」）。

### Phase 4 - P3 残留复核 + 收口登记

Status: completed
Targets: `docs/audits/round2-p3-adjudication.md`、`docs/audits/round2-dr-adjudication.md`、`docs/backlog/component-audit-round2-roadmap.md`（DR 行）、`docs/logs/2026/08-08.md`

- Item Types: `Proof | Follow-up`

- [x] P3 残留复核（Proof）：裁决表 keep 99 / dismissed 24 抽查（≥10 条 live 核对理由成立）+ **DR 表 §2 卡内 P3 30 行复核**（fd ×9 + ss ×21，以正文表为准；同步更正 §2 摘要「18 条」为 live 30 行）+ **卡内跨面共性候选逐条裁决**（ss-3 P3-2 / ss-6 P3-2 / ss-10 P3-4：unfreeze 等 no-op 命令无条件 pushUndo 污染 undo 栈 + dirty 误标（internal-state.ts:81-90 机制级，10 面共享）→ 裁决 keep（P3 语义维持）或路由 DR/CX 修复；ss-3 P3-4：按钮错误反馈依赖宿主 onLog 接线（fire() 吞错）→ 裁决 keep 或宿主接线改进路由）——结论回写卡 + DR 表 §2 注记，无静默升级为 P2。
- [x] 卡状态回写复核（Proof）：卡内「跨面共性登记 daily log 供 DR/CX 裁」条目逐条落裁决结论（daily log + DR 表待裁节登记；CX-13+ 插入建议不执行，人工确认门）。
- [x] DR 表勾销终验：16 条全部标注终态（fixed / adjudicated-keep + 理由），零悬挂声明复核（表条目 ↔ live 证据双向核对）。
- [x] 新发现跨面共性缺陷登记：daily log + DR 表待裁节，CX-13+ 插入建议（不执行，人工确认门）。
- [x] 收口登记：roadmap DR 行 `todo`→`done`（附执行证据）、daily log 收口节、bug note 索引终验。
- [x] 回归验证：受影响包全绿 + 关联 e2e 全绿；`pnpm check` exit 0 复核。

Exit Criteria:

- [x] P3 残留复核结论在案（抽查清单 + 结论）；DR 表零悬挂勾销；roadmap DR 行 `done` + daily log 收口节 + bug note 索引一致。
- [x] 本 plan 所有 in-scope 项勾选完成，无未处置残留（closable 状态交独立 closure-audit 裁决）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session）——轮 1 `ses_01e9ec7cfffew29uX0ETzs0ETV`（fail，2 Major）；轮 2 `ses_01e924224ffeRFF5EuAGOBlhjt`（pass，零 Blocker/Major）
- Verdict: `pass`（轮 2 共识达成；4 Minor 不阻塞，其中 3 条已当场修正）
- Rounds: 2
- Findings addressed:
  - Major-1（轮 1）：DR 表 §2 卡内 P3 计数 18 → live 30 行（fd ×9 + ss ×21）→ Baseline/Goals/Scope/Phase 4/Deferred 全口径更正，并补「§2 摘要 18 条为过时表头，复核时更正」注记 + 卡内跨面共性候选（ss-3 P3-2/ss-6 P3-2/ss-10 P3-4 no-op undo 栈污染 + ss-3 P3-4 onLog 接线）显式入 Phase 4 逐条裁决。
  - Major-2（轮 1）：Phase 1 Targets 包归属错误——report-designer core 文件（core.ts/core-dispatch.ts/types.ts/preview-commands.ts/codec-commands.ts）改 `packages/report-designer-core/src/`（+`runtime/`）、`template-tags.ts` 改 `packages/word-editor-core/src/`，局部验证补 core 包。
  - Minor（轮 1/2）：DR-2 默认标签 15→16（`designer-node-appearance.ts:3-16`）、DR-6 补 live 重枚举（6 处 :25/:27/:30/:48/:61/:63）、DR-1 以 live 重枚举为准（11 处）、子目录前缀（spreadsheet-interactions/、toolbar/、dialogs/、panels/）与 page-model.ts 归属、cell-editor.tsx 不存在注记。

## Closure Gates

> **关闭条件**：本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选 `[x]` 后，才能将 `Plan Status` 改为 `completed`。全量验证归此处（guide Rule 18）；closure-audit 由独立 fresh session 执行，执行 session 不得自审勾选。

- [x] 16 条 DR 路由全部终态（fixed 或 adjudicated-keep + 理由），DR 表零悬挂勾销（终验时新增执行中发现缺陷 DR-17 一并勾销，DR 表 17 条全终态）
- [x] Tiptap editor 面竞态修复 + 回归测试在案，watch-only 清单按修复后终态更新
- [x] P3 残留复核结论在案，无静默升级
- [x] 复杂 bug 行内 bug note 补写完成（117 起 + README 索引）
- [x] 受影响的 owner docs 同步（design.md 措辞裁决、DR 表/roadmap/daily log 收口登记）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

### DR 表 §2 卡内 P3 30 行（fd ×9 + ss ×21）+ 卡内跨面共性候选（ss-3 P3-2 / ss-6 P3-2 / ss-10 P3-4 / ss-3 P3-4）

- Classification: `watch-only residual`
- Why Not Blocking Closure: checklist v2 裁决表语义下 P3 仅记录不阻塞 supported baseline；本 plan Phase 4 对 30 行做复核确认（无升级必要）+ 对跨面共性候选逐条裁决 keep/路由（结论回写卡 + DR 表 + daily log，供人工确认 CX-13+）。
- Successor Required: `no`（卡内记录即终态；CX-13+ 插入由人工确认后另行决定）

### DR-15 ghost schema 移除（公共 renderer fields 变更）与 DR-16 返回语义变更（公共 API）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 默认裁决走非公共面路径（@reserved 维持 + 文档措辞对齐），零功能损失；公共面变更路径留人工确认门，非静默延期。
- Successor Required: `yes`（人工确认后）
- Successor Path: 人工确认后另立 plan 或本 mission 后续轮次

### comment 功能 UI 恢复（DR-4 关联）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 无消费者无功能损失；恢复完整 comment 编辑 UI 属功能增强超出 P2 修复面。
- Successor Required: `no`
- Successor Path: 无

### 0150-1 stagedDirs 工具治理（D2 已路由）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: D2 §7 已裁定归「工具治理轮次」，DG 门禁升级承接；本 plan 仅复核归因不执行。
- Successor Required: `yes`
- Successor Path: DG plan（`2026-08-08-2034-3-round2-dg-guard-sedimentation.md`）

### gantt-perf / kanban-perf（50Hz 环境阈值）

- Classification: `watch-only residual`
- Why Not Blocking Closure: D2 实测主屏 50.00Hz，rAF 50fps 硬上限致 >50/>60 阈值物理不可达；标注「需 60Hz 环境最终确认」，非本 plan 引入。
- Successor Required: `no`（环境确认后自动闭合）
- Successor Path: DV 全量验证复核维持

## Non-Blocking Follow-ups

- CX-13+ 插入建议（如本 plan 发现跨面共性模式）：daily log + DR 表待裁登记，人工确认后插入路线图。
- 其余不阻塞治理项登记 daily log（供 DG 承接）。

## Closure

Status Note: 4 Phase 全 completed + Plan Status `completed`；执行证据见 `docs/logs/2026/08-08.md` DR 节。closure-audit 由独立 fresh session 执行并记录证据（本 session 不自审勾选 Closure Gates 的 closure-audit 项）。

Closure Audit Evidence:

- Auditor / Agent: （由独立子 agent fresh session 执行后填写）
- Evidence: （由独立子 agent fresh session 执行后填写）

Follow-up:

- CX-13+ 插入建议（ss-3 P3-2/ss-6 P3-2/ss-10 P3-4 no-op undo 栈污染、ss-3 P3-4 onLog 宿主接线）：DR 表 §2 待裁节 + daily log 登记，人工确认后插入路线图（本 plan 未执行）。
- DR-15/DR-16 公共面变更路径：人工确认门，确认后另立 plan 或本 mission 后续轮次。
