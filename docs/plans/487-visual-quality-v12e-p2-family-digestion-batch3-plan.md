# 487 视觉质量 V12e：一致性 P2 候选池按族消化——批三（族1 + 族2 + 族6）Plan

> Plan Status: completed
> Last Reviewed: 2026-09-21
> Source: `docs/analysis/visual-quality/V12b-consistency-p2-digestion.md`（§4 族1/族2/族6 台账 + §3.2 批三裁定）、`docs/backlog/visual-quality-roadmap.md` V12e 行
> Related: `docs/plans/485-visual-quality-v12b-p2-family-digestion-batch1-plan.md`、`docs/plans/486-visual-quality-v12d-p2-family-digestion-batch2-plan.md`（批次协议先例）

## Purpose

消化 P2 池批三（行为类）：族1（disabled/readOnly 门禁通道穿透，5 条）+ 族2（状态已发射、样式零消费，5 条）+ 族6（写后界面不同步，7 条）。本批含真实行为缺陷（ai-chat 门禁、editor readOnly 同步、wizard committing 门控），全部先红后绿；schema 演示页条目（族6×5 + sundial-settings）按 485/486 先例就地修复或显式落卡。

## Current Baseline

- 台账：V12d 收口后 P2 池开放 108 条；本批 17 条，file:line 见报告 §4（行号以机制定位为准）。
- 先例：plan 485 已落地 upload abort/同步队列/retry 去重等行为修复模式与 ui Button aria-pressed 发射端（G1-R2-视角3-02 的发射端一半）；plan 483 A3 错误通道先例。
- 已知交叉：G2-R3-视角3-02 editor readOnly（plan 485 G2-R4-视角5-01 已改同文件外部同步通道——本条改 disabled 门控面，异区域）；G5-R4-视角3-01 user-edit 门禁（486 改过其取消键面）。
- 红线基线：219/64/69（V12d 后），本批不增、newHits=0、新增豁免 0。

## Goals

- 族1 5 条：disabled/committing 语义贯穿所有交互通道——ai-chat 停止后 user-edit 不再可编辑重发、ai-sender 流式期可输入（半量门控改文案门控）、editor readOnly 状态同步纳入 interactive 判定、wizard committing 阻断 prev、sundial-settings selfhost 行 disabled。
- 族2 5 条：已发射状态获得样式消费——ui button cva 增 aria-pressed/data-active 分支、ai-feedback data-state=selected 视觉、toolbox status span role=status + 样式、scada preview data-mode 消费（mutator 门控）、table 行选中 data-state 生产端对齐。
- 族6 7 条：sundial 添加落库、task-detail 动态标题、清除键写对目标、form-wizard deptId 贯穿 confirm/onComplete、删除后列表联动（行删 + 视图计数）、activeSection 贯穿主内容。
- 红线：instances 单调不增、newHits=0、新增豁免 0；消化计数入 daily log（108 → ≤91）。

## Non-Goals

- 族3/4/7 与单点收尾（V12f）、P3 池（V12c）、ui 组件 API 重设计。
- sundial 页面信息架构级重构（仅台账内行为贯通）。

## Scope

### In Scope

- 报告 §4 族1×5、族2×5、族6×7 全部条目。
- owner docs：受影响 design docs 契约补记、consistency-debt V12e-D3、roadmap V12e 行注记、daily log。

### Out Of Scope

- ui 包新原语；豁免登记；perf 面。

## Failure Paths

| 可测场景编号      | 触发                  | 行为                       | 可重试 | 用户可见表现 |
| ----------------- | --------------------- | -------------------------- | ------ | ------------ |
| gating-regression | disabled 下通道仍可写 | 组件测试红（先红后绿拦截） | 是     | 无           |
| schema-invalid    | sundial JSON 改坏     | playground 启动校验红      | 是     | 无           |

## Test Strategy

档位选择（三选一）：`必须自动化`

本档选择：**必须自动化**（本批全部为行为缺陷/契约贯通）——每条 Fix 配先红行为断言；schema 条目以数据流断言（写入→读取链）钉住。

## Execution Plan

### Phase 1 - 族1 门禁穿透（5 条）

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/{ai-sender.tsx,ai-chat.tsx}`、`packages/flux-renderers-ai/src/renderers/ai-bubble/user-edit.tsx`、`packages/flux-renderers-form-advanced/src/editor-renderer.tsx`、`packages/flux-renderers-layout/src/wizard-renderer.tsx`、`apps/playground/src/complex-pages/page-schemas/sundial-settings.json`

- Item Types: `Fix | Proof`

- [x] [x] Proof（先红）：①disabled chat 下 user-edit 仍渲染可点（ai-chat.tsx:609 仅门控 sender）；②readOnly editor 仍接受输入（sync deps 漏 interactive）；③wizard committing 下 prev 可点；④ai-sender 流式期 textarea disabled 断言（反转前）
- [x] [x] Fix：①user-edit 编辑/重发通道纳入 chat disabled 门控（G5-R4-视角3-01）；②ai-sender 流式期 textarea 门控改「可输入 + 发送禁用」文案门控（G5-视角3-01，半量门控反转）；③editor sync effect deps 纳入 merged readOnly（G2-R3-视角3-02，含 interactive）；④wizard prev disabled 并入 committing（G1-R3-视角3-01，含 step-nav.tsx:73）；⑤sundial-settings selfhost 行 disabled + 即将推出语义（G7-R5-视角11-06）

Exit Criteria:

- [x] 族1 5 条逐条落地（含 ai-sender 门控反转④先红锚点）；先红断言有记录（v12e-family1-gating 4 断言、editor-interactive-sync、wizard-commit-navigation-lock）；受影响九包 focused test 绿

### Phase 2 - 族2 死状态消费（5 条）

Status: completed
Targets: `packages/ui/src/components/ui/button.tsx`、`packages/flux-renderers-basic/src/button.tsx`、`packages/flux-renderers-ai/src/styles.css`（ai-feedback 面）、`packages/flux-renderers-industrial/src/editor/toolbox/toolbox-panel.tsx`、`packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx`、`packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx`

- Item Types: `Fix | Proof`

- [x] [x] Proof（先红）：①button aria-pressed=true 样式分支断言（ui cva 增分支前）；②table 普通勾选行无 data-state 断言
- [x] [x] Fix：①ui button cva 增 `aria-pressed:/data-active:` 视觉分支（G1-R2-视角3-02，消费端）；②ai-feedback data-state=selected 视觉（G5-R3-视角3-02，styles.css）；③toolbox status span role=status + 样式（G5-R2-视角3-02）；④scada preview data-mode 消费 + mutator mode 门控（G5-R2-视角3-03）；⑤table 行选中 data-state 生产端对齐普通选择路径（G6-R6-视角3-01，注意仅发射不破坏 optionRow 契约）

Exit Criteria:

- [x] 族2 5 条逐条落地（scada preview 走全量选项：live mode 绑定 + mutator 门控）；两条先红断言有记录（button-pressed-variants 3 断言、table-plain-selection-state）；受影响包 focused test 绿

### Phase 3 - 族6 写后同步（7 条，schema 面）

Status: completed
Targets: `apps/playground/src/complex-pages/page-schemas/{sundial-workbench.json,sundial-detail.json,sundial-todo-dialog.json,form-wizard.json}`、`apps/playground/src/complex-pages/shared/`（如需 mock-backend 配合）

- Item Types: `Fix | Decision`

- [x] [x] Fix：①sundial-workbench 添加按钮接 submit/持久化动作（G7-视角11-03）；②activeSection 贯穿主内容条件（G7-视角11-04）；③task-detail 标题绑定 activeTaskId 动态化（G7-视角11-05）；④sundial-detail 清除键写对目标 + toast 条件化（G7-视角11-13）；⑤form-wizard deptId 贯穿 confirm 回显与 onComplete data（G7-R2-视角11-02）；⑥sundial-detail 删除后行移除/列表刷新（G7-R5-视角11-01）；⑦workbench 计数与 kanban/completed/trash 视图接 `/r/Sundial__todos` 数据（G7-R5-视角11-02，若 mock 面不支持则显式 Decision 落卡 V12f）
- [x] [x] Decision：⑦若演示后端通道不足以支撑实时联动，显式 adjudicated（demo 数据面边界）并落卡

Exit Criteria:

- [x] 族6 7 条逐条落地（⑦ 部分落地 + 显式残差：kanban 默认板行/压力卡图例静态串为页面级 IA 重构面，转 V12f 卡）；schema JSON 校验过；数据流断言在案（sundial-v12e-family6-dataflow 10 测试；正 toast 分支 jsdom 不可达留 e2e 层）

### Phase 4 - 对账 + docs + 门禁

Status: completed
Targets: `docs/components/*/design.md`、`docs/audits/visual-quality/consistency-debt.md`、`docs/backlog/visual-quality-roadmap.md`、`docs/logs/`（当日）

- Item Types: `Fix | Proof`

- [x] [x] 对账：消化计数入 daily log（108 → 实际残余）；design docs 契约补记（门禁贯穿、状态消费、按钮序）
- [x] [x] 门禁：`check:audit-ui-consistency-gaps` exit 0 且 totals 单调不增；`check:i18n-keys` 绿
- [x] [x] docs：consistency-debt V12e-D3、roadmap V12e 行注记、daily log

Exit Criteria:

- [x] 受影响九包 focused test 全绿（ai 819/basic 610/layout 129/form-advanced 1112/data 1141/industrial 1457/playground 362/ui 175/i18n 29）；全仓 `pnpm typecheck` 绿（全链归 Closure Gates）
- [x] 对账三方一致

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent（fresh session）填写。

- Reviewer / Agent: 独立子 agent fresh session（ZCode plan-review auditor，2026-09-21，只读审计）
- Verdict: `pass-with-minors`（0 Blocker / 0 Major / 3 Minor；升 active）
- Rounds: 1
- Findings addressed: 17 条台账与本 plan 17 条 Fix 一一对应无遗漏；12 处机制抽验全部成立；红线 219/64/69 与 486 收口一致。Minor：M-1 引用漂移（user-edit 同文件前次编辑归 486 非 485——已订正）；m-2 step-nav 文件名/行号漂移（wizard-step-nav.tsx:77/:103，机制定位免责覆盖）；m-3 先红锚点覆盖张力——已补 ai-sender 门控反转先红锚点（④），P2 CSS/属性类由属性断言钉住（批协议②/③同构）。

## Closure Gates

- [x] Phase 1–4 Exit Criteria 全勾
- [x] 族1×5 + 族2×5 + 族6×7 逐条 landed / adjudicated，无静默 deferred
- [x] 行为缺陷全部先红后绿有记录
- [x] v1 红线：instances 单调不增、newHits=0、新增豁免 0
- [x] 受影响 owner docs 已同步
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

### ⑦ 残差：kanban 默认板行 + 压力卡图例静态演示串（G7-R5-视角11-02 局部）

- Classification: `moved to explicit successor ownership`
- Why Not Blocking: 已落地面（completed/trash 视图 loop 化 + 计数绑定 + 写入 rev-bump 联动）覆盖台账缺陷主体；残差为页面级信息架构重构（非 mock 通道限制——mock 读取通道可用），与本批「仅台账内行为贯通」Non-Goal 一致
- Successor Required: `yes`
- Successor Path: roadmap V12f（单点/跨族收尾批）

### ⑫ 机制偏差：activeSection 落地为导航交接（非「条件贯穿」）

- Classification: `watch-only residual`
- Why Not Blocking: 台账缺陷（导航写死态、主内容无响应）已解决且数据流测试钉住；导航到 settings/analytics 专用页是更简单的等价收敛
- Successor Required: `no`
- Successor Path: 无

## Non-Blocking Follow-ups

- （无预设）

## Closure

Status Note: 17/17（族1×5 + 族2×5 + 族6×7）全部落地并经独立 closure audit 深度核验（17/17 PASS、14 处 deep）；六处先红后绿锚点真实；⑦ 部分落地残差与 ⑫ 机制偏差均显式落卡。首轮 `issues` 唯一 Blocker B-1（industrial styles 两条 var() 字面量 fallback 使 instances 219→221 且未披露）按修复路径 (a) 改语义链 fallback 回归 219/64/69 并补披露；M-1~M-5 同批吸收；轻量复审 `approved`。全仓链 CHAIN EXIT 0。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session ×2（2026-09-21 closure audit 首轮 + 轻量复审）
- Evidence: 首轮 verdict `issues`（B-1 唯一 Blocker + 5 Minor）→ 修复（语义链 fallback 回归 219/64/69 + 披露 + 簿记吸收）→ 轻量复审 `approved`。17 条逐条对照表见首轮审计输出；daily log `docs/logs/2026/09-21.md` §plan 487。

Follow-up:

- no remaining plan-owned work（⑦ 残差归 V12f、⑫ watch-only、prompt→popover 等既有 Follow-ups 在案）
