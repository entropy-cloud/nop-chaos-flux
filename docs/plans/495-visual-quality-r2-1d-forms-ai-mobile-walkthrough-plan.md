# 495 视觉质量二期 R2-1d：表单/编辑器/AI/移动端与其余 demo 面走查（58 页）

> Plan Status: completed
> Last Reviewed: 2026-09-23
> Source: `docs/backlog/visual-quality-r2-roadmap.md`（R2-1d work item）、`docs/skills/visual-page-quality-inspection-prompt.md`（走查口径）、`docs/audits/visual-quality-r2/README.md`（R2-0 批次裁定：R2-1d = 其余 demo 面 58 页）
> Related: plan 492/493/494（流程与产出格式沿用；R2-1 前三批已 done）

## Purpose

对本域 58 页执行渲染面走查（表单控件状态完备性/编辑器 chrome/移动端触控与窄视口为核心维度 + A–H 全维度），每页 evidence card + 程序化取证 + 三态归族，台账翻转至 `digested`。本批页数最多但单页复杂度低于 1a–1c（多为控件族 demo 面），采用"简化矩阵为默认、命中疑点升全矩阵"的口径（每卡注明裁剪理由）。不做产品修复。

## Current Baseline（2026-09-23）

- 走查面 = inventory batch=R2-1d 的 58 页（以 `pnpm visual:inventory` 输出为准）：AI 族 14、移动端族 7（m1–m5/mobile-infrastructure/mobile-components）、w 系 demo 族 10、scheduling demo 8（gantt/gantt-states/kanban/scheduling-calendar/barcode-input + 3 perf-scale）、表单/编辑器散页（code-editor/condition-builder×2/input-suggest/form-input-enhancements/boolean-control-value-contract/tree-display-ux 等）、杂项（flux-basic/home/lab-index/complex-pages-index/diff-view+perf/data-verify 已归 1c 除外/env-stream/event-prevention/component-handles/text-icon-visual-fields/layout-family-enhancements/leafer-examples）。
- 已知族（命中即"既有族扩面"归族，不另立）：弹层 actions 左对齐（R2-3b）、dark 平价（R2-4）、数值列左对齐（watch-pool）、窄视口 flex/固定壳层（R2-3c 候选）、A3 小目标族、chip 遮挡族、G7 双向同步（1b 新族）。已知项：宿主 --popover dark 亮底。
- scheduling 三页 perf-scale 与 diff-perf-scale 聚焦渲染正确性，不度量性能数值（同 494 边界）。
- 移动端页（m*）视口裁定（依 skill :181 域级裁剪条款）：~375–800 为主分析视口（m* 目标视口为移动端），1280 仍逐页至少采集一轮不作降级；触控目标 A3 与手势替代 A8 为重点维度。

## Goals

- 58 页 evidence card 落 `docs/analysis/2026-09-23-r2-1d-walkthrough/cards/`；台账 58 行 → `digested`。
- 独立复核覆盖全部 P0/P1 + ≥1/3 P2 抽样；深挖至收敛；summary.md 评分卡与族归并。
- 完成后 R2-1 全部页面（121）走查闭合，与 R2-2 批并行的归族输入齐备。

## Non-Goals

- 不修产品缺陷；不走查其他批页面；不换口径；`verified` 翻转归后续批；mobile 族组件数量级扩容超出既有 demo 面的范围不做（mission 排除项 G-H）。

## Scope

### In Scope

- 58 页走查、取证、评分卡、归族、台账翻转；独立复核；深挖轮；summary.md；roadmap/logs 回写。

### Out Of Scope

- 产品代码改动；其他批次；性能数值度量；mobile 族组件扩容。

## Failure Paths

| 可测场景编号                 | 触发                                                     | 行为                                                               | 可重试 | 用户可见表现      |
| ---------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------ | ------ | ----------------- |
| walk-route-dead              | 页面打不开/报错                                          | 卡面 fail(A5) P0 归 local，console 留证                            | 是     | 页卡标注          |
| interaction-not-programmatic | 交互态无法程序化驱动                                     | Playwright mouse/touch 序列；仍失败 [visual-only]+复核，不静默裁剪 | 是     | 卡内注明          |
| index-page-slim              | 索引页（home/lab-index/complex-pages-index）无复杂交互态 | 简化矩阵（默认+dark+窄视口），卡内注明                             | 否     | 评分卡 H/G 记 n/a |

## Test Strategy

档位选择：**不适用：走查产档 + 台账翻转 + interactions 注册表扩面（仅手动 runner 消费），无产品代码与测试行为变更；程序化判据由每条发现的探针承担。**

## Execution Plan

### Phase 1 - 走查执行（58 页，8 波）

Status: completed
Targets: `docs/analysis/2026-09-23-r2-1d-walkthrough/cards/*.md`、`scripts/visual-quality/interactions.mjs`、`_tmp/`

- Item Types: `Fix | Proof`

- [x] Fix：分 8 波并行（8 路 fresh agent，先 4 后 4 控并发）（每波 5–10 页，按族聚簇：wave1 AI 前半 7：ai-attachments/ai-chat/ai-citations/ai-component-handle/ai-conversations/ai-coverage/ai-hitl；wave2 AI 后半 7：ai-linkage/ai-p4/ai-persistence/ai-rich-text/ai-tools/ai-virtual-scroll/ai-widgets；wave3 移动端 7：m1-responsive/m2-touch/m3-layout/m4-data/m5-showcase/mobile-infrastructure/mobile-components；wave4 scheduling demo 8：gantt/gantt-states/kanban/scheduling-calendar/barcode-input/gantt-perf-scale/kanban-perf-scale/calendar-perf-scale；wave5 表单/编辑器散页 8：code-editor/condition-builder/condition-builder-formula/input-suggest/form-input-enhancements/boolean-control-value-contract/tree-display-ux/w3d-advanced-input-family；wave6 w 系前半 6：w1a-content/w1b-content/w2a-data-composition/w2b-date-family/w3a-w3b-layout-action-family/w3c-value-mapping；wave7 w 系后半 5：w4a-multimedia/w4b-process-display/w4c-composite-form-family/text-icon-visual-fields/layout-family-enhancements；wave8 杂项 10：flux-basic/home/lab-index/complex-pages-index/diff-view/diff-perf-scale/event-prevention/component-handles/leafer-examples/env-stream）
- [x] Fix：interactions.mjs 扩面——本批页面多为控件 demo（交互态由走查 agent 即时取证）；复现性强的弹层面已在卡内 dialogs 栏登记，注册表维持现状（理由记录）
- [x] Proof：控件状态/编辑器 chrome/移动端触控与窄视口逐页取证（约 500 张截图、约 100 探针留 `_tmp/r2-1d-probes/`）（hover/focus/disabled/error 全态）、编辑器 chrome 与令牌、移动端页 A3 触控目标/A8 手势替代/窄视口排布；每条 P0–P2 附探针输出
- [x] Fix：台账 58 行 → `carded`，随归族 → `digested`（card 列同批填写）

矩阵口径裁定（本批）：

- **全矩阵页（无条件完整状态矩阵）**：condition-builder、condition-builder-formula、gantt、gantt-states、kanban、scheduling-calendar（README full 矩阵类控件 demo 页 + 拖拽/弹层中间态，Cross-Cutting 3 类别触发）。
- **简化矩阵地板（其余页）**：≥ skill 必查项——light+dark 双主题、1280×800、~800 窄视口、元素态抽样（hover/focus/disabled）、中间态有则必查；命中疑点升全矩阵。每卡注明裁剪理由。

Exit Criteria:

- [x] 58 卡齐备（复杂控件 demo 页全矩阵；其余页简化地板；每卡注明裁剪理由）；台账全 `carded`→`digested`；reconcile uncovered=0

### Phase 2 - 独立复核

Status: completed
Targets: `docs/analysis/2026-09-23-r2-1d-walkthrough/review-a|b|c.md`

- Item Types: `Proof`

- [x] Proof：三路 fresh agent（review-a 9 判定=7P1+2P2、review-b 8 判定=6P1+2P2、review-c 2P1）覆盖全部 15 条 P1 + 4 条 P2 抽样：19/19 保留、0 降级、0 驳回；多条根因下探改判（scope 响应性缺口、validate.api 静默忽略、图标别名乒乓回环、静态 props 订阅旁路）

Exit Criteria:

- [x] review-a/b/c.md 落盘；P0/P1 全覆盖；无驳回项

### Phase 3 - 归族与汇总

Status: completed
Targets: `docs/analysis/2026-09-23-r2-1d-walkthrough/summary.md`、`docs/audits/visual-quality-r2/watch-pool.md`

- Item Types: `Decision | Fix`

- [x] Fix：评分卡（按口径"含正式 P1/P2 锚→fail / 仅 P3→有风险 / 无→pass"复算：fail 31/有风险 15/pass 12；closure audit 簿记轮修正首轮混口径的 16/33/9）+ 族归并（summary §4：新族 2 + 既有族扩面 6 + local 散项）（与 R2-1a/b/c 已裁定族去重合并）+ Top3 + Quick Wins
- [x] Decision：新族裁定登记（schema 动态响应性缺口、表单 AMIS 契约缺口、图标别名回环 → R2-3 候选；dark 族直接 P1×4 + 令牌级 P2×2 增重 → R2-4；local → R2-4 输入非终裁）（systemic 新族 → 字母批候选；local 新族 → R2-4 输入非终裁）
- [x] Fix：watch-only 10 条全部登记 `watch-pool.md`（7 正式行——R2-1d-A3-01/02 族行并 3 实例——+ F4-01 挂 R2-1b-F4-03 族行实例注记；簿记轮剔除误登的 C-56/B-58 归位 local，grep 回读 R2-1d 行=7）；台账 58 行 `digested`

Exit Criteria:

- [x] summary.md 落盘；台账 `digested`（58/58，R2-1 全量 121/121 闭合）；reconcile uncovered=0

### Phase 4 - 深挖轮（至收敛）

Status: completed
Targets: `docs/analysis/2026-09-23-r2-1d-walkthrough/review-a|b|c.md`（深挖并入复核轮，无独立 rounds/ 落盘）

- Item Types: `Follow-up | Proof`

- [x] Proof：定向深挖并入复核轮（三路复核含根因下探即深挖实质；19/19 保留无新发现，1 轮收敛）

Exit Criteria:

- [x] 终止条件达成（review-a/b/c.md）；无悬挂发现

## Closure Gates

- [x] 58 卡齐备、台账全 `digested`（58/58；R2-1 全量 121/121 闭合）、reconcile uncovered=0
- [x] P0–P2 程序化证据/[visual-only]+复核；归族无空缺（正式条目 98 条：P1×15/P2×32/P3×51，另 1 跨页族引用锚不另计）
- [x] 独立复核 P0/P1 全覆盖（15/15 P1 + 4 条 P2 抽样 = 19 判定全保留）
- [x] 族归并落 summary §4
- [x] 深挖轮终止条件达成（并入复核轮，1 轮收敛）
- [x] 独立子 agent closure audit 完成并记录证据（见 Closure Audit Evidence）
- [x] roadmap R2-1d 行回写（done，按单元格值精确改写并回读验证）+ Rule 5 logs 同步
- [x] `pnpm typecheck`/`lint`/`check`/`build`/`test` 全过

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

- 探针提升 e2e 归 R2-5。

## Closure

Status Note: 四 Phase 全部 completed、Closure Gates 全勾（2026-09-23）。58 页走查产出 98 条正式发现（P1×15 全部独立复核保留），新族裁定 2 项 + 既有族扩面 6 项登记；R2-1 阶段 121 页全量闭合。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure auditor（fresh sub-agent session，首轮 + 终审两轮）
- Evidence: 首轮 verdict `issues`（0 Blocker / 3 Major / 4 Minor：M1 评分卡三套口径混用 16/33/9 不可复算、M2 flux-basic A-41 卡面归族未随 review-b 终裁升 systemic、M3 证据占位；4 Minor 为簿记）。全部修复后终审（独立复算 58 卡逐页标注 0 差异、族分布 37/51/10 卡面可复算、reconcile 复跑 uncovered=0）verdict **`approved`**（0B/0M，2026-09-23）。审计报告与逐项核验记录见该 auditor 会话输出；修复摘要见 `docs/logs/2026/09-23.md` R2-1d 节 closure audit 段。

Follow-up:

- interactions 扩面与探针提升归 R2-5；P1×15 的修复归属按 summary §4 族裁定进入 R2-3 候选/R2-4。

## Draft Review Record

- Reviewer / Agent: 独立 draft reviewer（fresh sub-agent session，单轮 revised，修复面明确）
- Verdict: `revised` → 2 Major 定点修复后达通过线（0B/0M）
- Rounds: 1 + 定点修复
- Findings addressed: M1 波成员算术修正（AI 14 页拆 7+7、scheduling 8 页、env-stream 入 wave8 共 10 页；8 波 7+7+7+8+8+6+5+10=58 与 inventory 一一对应）；M2 矩阵口径补裁定（复杂控件 demo 页 6 页无条件全矩阵 + 其余页简化地板 ≥ skill 必查 + 升级路径，Exit 可验收）。3 Minor：m1 移动端视口裁定记录（1280 逐页采集一轮不降级）；m2 w 系计数 11→10；m3 README「AI 16 页」上游计数同步更正。
