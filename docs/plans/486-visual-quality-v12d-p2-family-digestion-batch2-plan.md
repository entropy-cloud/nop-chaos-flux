# 486 视觉质量 V12d：一致性 P2 候选池按族消化——批二（族10 + 族8）Plan

> Plan Status: completed
> Last Reviewed: 2026-09-21
> Source: `docs/analysis/visual-quality/V12b-consistency-p2-digestion.md`（169 条全面复核报告；本 plan 以其 §4 族10/族8 台账与 §3.2 批二裁定为准）、`docs/backlog/visual-quality-roadmap.md` V12d 行（V12b 预授权滚动批次）
> Related: `docs/plans/485-visual-quality-v12b-p2-family-digestion-batch1-plan.md`（批次协议先例：逐条核实→先红后绿→门禁负断言→零静默 deferred）

## Purpose

消化 P2 池批二：族10（空态/加载态标准分裂，11 条）+ 族8（确认/取消按钮语义与顺序分裂，8 条）。统一加载态到 ui `Spinner`、空态到「muted 文案（+ 可选动作）」双件套；确认/取消统一 `[次要, 主要]` 视觉顺序与 [Cancel, Confirm] 语义。

## Current Baseline

- 台账：V12b 收口后 P2 池开放 129 条（159−30）；本批 19 条 = 族10×11 + 族8×8，逐条 file:line 见报告 §4。
- ui 包已导出 `Spinner`（`packages/ui/src/components/ui/spinner.tsx`）与 `Empty`，可直接消费、零新依赖。
- 族8 顺序契约基线：[G3-视角2-02] use-row-quick-edit-draft Save(default) 在前 Cancel(outline) 在后；[G4-视角6-01] kanban adder 确认在前；[G5-R2-视角6-01] ai-tool-call approve(solid) 左 reject(outline) 右。
- V12b 遗留顺带面：input-table-renderer.tsx:464-478 与 combo 同款英文校验模板（族9 残，随本批顺带吸收）；gantt-header.tsx:55 bg-gray-50 与 calendar-header hover:bg-gray-\* 调色板类（族9 残，随本批顺带吸收）。
- 红线基线：v1（225/68/69）→ 现 223/66/69（V12b 后），本批不增、newHits=0、新增豁免 0。

## Goals

- 族10 11 条：加载态统一 `Spinner` + i18n 文案（不再纯文本/裸 div）；空态统一 muted 文案面（chart/dashboard/gantt/json-view/markdown/html）；form-load-action 暴露 loading/busy 状态供渲染面消费。
- 族8 8 条：确认/取消全部收敛 [次要(取消), 主要(确认)] 顺序 + Cancel 语义独立（不复用 stop 等他义键）；picker-dropdown 取消钮 variant 对齐。
- 顺带：input-table 英文校验模板 i18n；gantt-header/calendar-header 调色板类令牌化。
- 红线：instances 单调不增、newHits=0、新增豁免 0；消化计数入 daily log（129 → ≤110）。

## Non-Goals

- 族1/2/6（V12e）、族3/4/7 与单点收尾（V12f）、P3 池（V12c）。
- ui `Empty` 组件的 API 重设计（仅消费现状；如不敷使用，最小扩展并在本 plan 记录）。
- schema 演示页（playground）的新增内容（仅限台账内条目）。

## Scope

### In Scope

- 报告 §4 族10 11 条、族8 8 条全部条目（含 V12b 登记的顺带面两条族9 残项）。
- owner docs：受影响 `docs/components/*/design.md` 契约补记（空态/加载态与按钮序契约）、consistency-debt V12d-D2 记录、roadmap V12d 行注记、daily log。

### Out Of Scope

- Spinner/Empty 之外的 ui 新原语；任何豁免登记；perf 类面。

## Failure Paths

| 可测场景编号     | 触发       | 行为                  | 可重试 | 用户可见表现       |
| ---------------- | ---------- | --------------------- | ------ | ------------------ |
| i18n-key-missing | 新键未登记 | check:i18n-keys 红    | 是     | 无（门禁拦截）     |
| order-regression | 按钮序回退 | 组件测试 DOM 序断言红 | 是     | 无（先红后绿拦截） |

## Test Strategy

档位选择（三选一）：`建议有测`

本档选择：**建议有测**；按钮序与加载/空态以 DOM 序/结构断言钉住（组件测试），i18n 键走门禁。

## Execution Plan

### Phase 1 - 族10：加载/空态标准化（11 条）

Status: completed
Targets: `packages/flux-renderers-content/src/{image.tsx,markdown.tsx,json-view.tsx,html.tsx,styles.css}`、`packages/flux-renderers-layout/src/wizard-renderer.tsx`、`packages/flux-renderers-form-advanced/src/upload-field.tsx`、`packages/flux-renderers-form/src/renderers/{form-load-action.ts,form.tsx}`、`packages/flux-renderers-data/src/{crud-infinite-scroll-area.tsx,list-renderer.tsx,chart-renderer.tsx}`、`packages/flux-renderers-dashboard/src/dashboard-renderer.tsx`、`packages/flux-renderers-scheduling/src/gantt/gantt.tsx`、`packages/flux-renderers-industrial/src/renderer/scada-canvas.tsx`、`packages/flux-renderers-mobile/src/countdown.tsx`

- Item Types: `Fix | Proof`

- [x] Proof（先红锚点）：①gantt 空态断言（无 empty region 时渲染样式化空态文案而非裸 div）；②chart-empty 断言（muted 类 + i18n 文案）
- [x] Fix（Spinner 化）：image/markdown loading、wizard committing、upload pending 行、crud-infinite-scroll/list-renderer 加载态、scada-canvas loading 兜底 → ui `Spinner` + i18n 文案
- [x] Fix（空态面）：chart-empty、dashboard 空布局、gantt 空态、json-view/markdown/html 空+无 slot muted 兜底
- [x] Fix（busy 通道）：form-load-action 暴露 loading 状态，form.tsx 渲染面消费（提交中反馈）
- [x] Fix：G4-视角5-02 countdown 缺 time/targetTime 时静默空壳（countdown.tsx:210-221）→ muted 空态兜底文案（不再渲染不可见空元素）

Exit Criteria:

- [x] 族10 11 条逐条落地（21/21 全 landed）；受影响包 focused test 绿（11 包 7132）；两处先红锚点有记录（gantt data-empty / chart-empty muted）

### Phase 2 - 族8：确认/取消语义与顺序（8 条 + 顺带 2）

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer/use-row-quick-edit-draft.tsx`、`packages/flux-renderers-scheduling/src/kanban/components/kanban-column-adder.tsx`、`packages/flux-renderers-ai/src/renderers/ai-bubble/user-edit.tsx`、`packages/flux-renderers-ai/src/renderers/ai-tool-call.tsx`、`packages/flux-renderers-form-advanced/src/picker-dropdown.tsx`、`packages/flux-renderers-form/src/renderers/select-mobile-renderer.tsx`、`packages/flux-renderers-form-advanced/src/tree-controls.tsx`、`packages/flux-renderers-form-advanced/src/{input-table-renderer.tsx}`、`packages/flux-renderers-scheduling/src/{gantt/gantt-header.tsx,calendar/components/calendar-header.tsx}`、`apps/playground/src/complex-pages/page-schemas/{sundial-detail.json,sundial-workbench.json,sundial-todo-dialog.json}`

- Item Types: `Fix | Proof`

- [x] Proof（先红锚点）：行内快捷编辑 Save/Cancel DOM 序断言（[Cancel(secondary), Save(primary)]）
- [x] Fix（顺序收敛）：use-row-quick-edit-draft、kanban-column-adder、ai-tool-call（approve/reject 调序，保语义色）
- [x] Fix（语义/变体）：user-edit 取消钮独立 Cancel 键；picker-dropdown 取消钮 variant 对齐；select-mobile 增确认/完成钮；tree-controls popover 选中即关 + sheet 确认钮
- [x] Decision + Fix：G7-视角10-09 sundial 确定/确认三形态（sundial-detail 用「确认」、workbench ×3 用「确定」、todo-dialog 单钮「确定」）——统一主确认键文案为「确认」（与其余页面对话框主操作一致），逐文件改 schema 文案；不改按钮结构
- [x] Fix（顺带族9 残）：input-table 英文校验模板 i18n；gantt-header/calendar-header 调色板类令牌化

Exit Criteria:

- [x] 族8 8 条 + 顺带 2 条逐条落地（sundial 统一「确认」，todo-dialog 实为 2 处）；受影响包 focused test 绿；先红锚点有记录（quick-edit DOM 序 2/2）

### Phase 3 - 对账 + docs + 门禁

Status: completed
Targets: `docs/components/*/design.md`、`docs/audits/visual-quality/consistency-debt.md`、`docs/backlog/visual-quality-roadmap.md`、`docs/logs/`（当日）

- Item Types: `Fix | Proof`

- [x] 对账：消化计数入 daily log（129 → 实际残余）；design docs 契约补记（空态/加载态 + 按钮序）
- [x] 门禁：`check:audit-ui-consistency-gaps` exit 0 且 totals 相对 223/66/69 单调不增；`check:i18n-keys` 绿
- [x] docs：consistency-debt V12d-D2、roadmap V12d 行注记、daily log

Exit Criteria:

- [x] 受影响包 focused test 全绿；全仓 `pnpm typecheck` 绿（全链归 Closure Gates）
- [x] 对账三方一致；V12e/V12f 行注记如有顺带项更新

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent（fresh session）填写。

- Reviewer / Agent: 独立子 agent fresh session（ZCode plan-review auditor，2026-09-21，只读 grep/read 核对 live repo）
- Verdict: `revised`（2 Major，0 Blocker；修订吸收后升 active）
- Rounds: 1
- Findings addressed: M-1 族10 覆盖缺口——台账族10 #11 G4-视角5-02（countdown 缺配置静默空壳，countdown.tsx:210-221）被计数但 Targets/checklist 零提及——已补 Targets + Fix bullet（muted 空态兜底）；M-2 族8 覆盖缺口——台账族8 #8 G7-视角10-09（sundial 确定/确认三形态）仅存在于计数——已补 sundial schema Targets + Decision/Fix bullet（统一「确认」，沿 485 G7 条目 Decision 先例）。Minor：m-1 Fix bullet 补 list-renderer；m-2 Phase 3 typecheck 重复（Rule 18，沿 485 先例容忍）；m-3 spinner.js→spinner.tsx 措辞；m-4 roadmap V12b 行注记滞后（非本 plan 缺陷，roadmap 行随本 plan 升 planned 一并更新）。可想象性抽验 8+12 条 ledger→live 机制全部成立；格式完整；19+2 规模、红线与消化账一致；25 Targets 文件全在，同文件改动均为协调项非冲突。

## Closure Gates

- [x] Phase 1–3 Exit Criteria 全勾
- [x] 族10×11 + 族8×8 + 顺带×2 逐条 landed / adjudicated，无静默 deferred
- [x] v1 红线：instances 单调不增、newHits=0、新增豁免 0
- [x] 受影响 owner docs 已同步
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

（无 —— 执行中确需延期的逐条落入本节并带 Why Not Blocking）

## Non-Blocking Follow-ups

- select-mobile 确认钮若涉及交互模型扩展（确认 vs 即选即关），超出本批的部分转 V12e 记录。

## Closure

Status Note: 21/21（族10×11 + 族8×8 + 顺带×2）全部落地并经独立 closure audit 逐条核验确认（其中 10+ 处 deep）；三处先红后绿锚点、门禁 219/64/69（相对 223/66/69 单调下降）、newHits=0、三包 focused 复跑绿（data 1140 / scheduling 985 / form 827）。首轮 `issues` 两项簿记 findings（F-1 plan 文件重复段落——Phase 3 tick 脚本切片缺陷所致、F-2 池账行缺失）修复后轻量复审 `approved`。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session ×2（2026-09-21 closure audit 首轮 + 轻量复审）
- Evidence: 首轮 verdict `issues`（F-1 plan 文件段落重复、F-2 池账行缺失——均簿记）→ 修复后轻量复审 `approved`（结构单一化 + 池账 129→108 行在案）。21 条逐条对照表见首轮审计输出；daily log `docs/logs/2026/09-21.md` §plan 486。

Follow-up:

- no remaining plan-owned work（select-mobile 确认交互模型扩展登记于 Non-Blocking Follow-ups 归 V12e）
