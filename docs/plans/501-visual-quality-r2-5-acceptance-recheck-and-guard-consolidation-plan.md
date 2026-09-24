# 501 视觉质量二期 R2-5：验收复检与守护固化

> Plan Status: completed
> Last Reviewed: 2026-09-24
> Source: `docs/backlog/visual-quality-r2-roadmap.md`（R2-5 work item，roadmap 唯一剩余执行项）、`docs/audits/visual-quality-r2/README.md`（R2-5 验收口径：reconcile uncovered=0 且台账全 verified 为 roadmap 关闭前置的最终确认环节）
> Related: plan 490（R2-3a）、491（R2-0）、492–495（R2-1）、496–498（R2-2）、499（R2-3b）、500（R2-4）

## Purpose

执行 roadmap 收官批：①截图矩阵 runner 全量重跑 + 已收口族（R2-3b/R2-4）同探针回归轮，产出最终复检评分卡与前后对比归档；②有回归价值的走查探针经评审提升进 `tests/e2e/helpers/` 固化；③门禁与覆盖对账收口（`pnpm check` newHits=0、`pnpm visual:reconcile` uncovered=0）。收口条件 = 复检轮零新增 fail（不含本轮新发现回流批的修复）。

## Current Baseline（2026-09-24）

- R2-0～R2-4 全部 done 且经独立 closure audit：pages 121/121 digested、controls 139/139 digested（verified 10 = loop + dark 族 9）、reconcile uncovered=0、`pnpm check` 零新增未注册命中、unit 10653 tests full-green。
- 截图矩阵 runner 基建就绪（plan 491）：`pnpm visual:capture --routes/--batches`，data-mode 修复后 dark 列有效（R2-2a-B5-34），交互注册表 120 键。
- 探针沉淀散布于 `_tmp/`（各批 w*-lib/探针脚本）：像素采样对比度（w5-png.mjs，oklab/渐变底唯一可靠口径）、data-mode 显式切换（B5-34 口径）、form-actions 对齐探针（plan 499 recheck）、复检探针模式（ra-*/rb-\* 前缀隔离）——均有批次验证记录，具备提升条件。
- 家族修复回归基线：R2-3b 15 载体（form-actions row+flex-end+72px）、R2-4 60 载体（dark/light 像素比值，recheck.md 逐载体表）——本轮回归轮以此为对照。
- suspect 历史说明：R2-1/R2-2 持久文档零 suspect 登记；唯一历史记录为 09-22 smoke 的 lab-button 一条（ephemeral，疑冷启动 flake，R2-2a 同 hash 实走验证存活）——本轮无基线豁免，逐条登记归因。
- residual/字母批队列已在各 summary 登记（bg-white 8 页、cal/notion 钉白、light 语义档、编辑器三件、schema 静默失效族 ≥9 例、窄视口/断点族等）——本批不消化，仅在评分卡归档时确认其在册。

## Goals

- 全量截图矩阵重跑（pages 121 + controls 139 的载体路由）：零死路由/零 home 回退 suspect、零控制台错误新增；产出最终复检评分卡（`docs/analysis/2026-09-24-r2-5-final/`）。
- 已 verified 单元（10）同探针回归：R2-3b/R2-4 修复效果在最终轮保持（零回归）。
- 探针固化 ≥3 项进 `tests/e2e/helpers/`（像素采样对比度 util、data-mode 主题切换 util、form-actions 对齐断言 util）+ focused 单测。
- `pnpm visual:reconcile` uncovered=0、`pnpm check` newHits=0、全量验证 full-green；评分卡与探针固化记录归档 `docs/logs/`。

## Non-Goals

- 不消化 residual/字母批队列（bg-white、语义档 token 化、schema 诊断层等——successor 已在各 summary/recheck 登记）；不新增门禁规则（对齐门禁等候选归后续评估）；不改产品代码（本批纯验收与守护固化；若全量轮发现回归，按溢出规则回流字母批而非本批修复）。

## Scope

### In Scope

- 矩阵全量重跑与 suspect/错误扫描；verified 单元同探针回归；探针提升与单测；最终评分卡与前后对比归档；reconcile/check 收口；daily log；roadmap 关闭回写（R2-5 → done + roadmap 状态收口）。

### Out Of Scope

- 新 finding 的修复执行（回流字母批）；全量 e2e 套件重跑（各批已按 Failure Paths 抽样验证；R2-5 固化的 helpers 供后续 e2e 使用）；性能度量。

## Failure Paths

| 可测场景编号   | 触发                                         | 行为                                                                                                                                                                                                                                                                                                           | 可重试 | 用户可见表现   |
| -------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------- |
| matrix-suspect | 矩阵重跑出现 home 回退/死路由 suspect        | **基线定义：R2-1/R2-2 持久文档（summary/ledger/watch-pool）零 suspect 登记；唯一历史记录为 09-22 smoke 的 lab-button 一条（ephemeral `_tmp/`，疑冷启动 flake，R2-2a 同 hash 实走验证存活）——不设「基线豁免」**。本轮任何 suspect 一律登记归因：复跑区分 flake（复跑通过记 flake）/真死路由（登记 fail 并归因） | 是     | 评分卡记录     |
| regression-hit | verified 单元同探针回归（如对齐/对比度回退） | 溢出规则：登记新 finding 回流 R2-3/R2-4 字母批；本报告零新增 fail 条件被破坏则 roadmap 不关闭                                                                                                                                                                                                                  | 是     | 评分卡 fail 行 |
| probe-flake    | 固化探针在 CI 环境不稳定（字体/DPR 漂移）    | 阈值留 tolerance（如对比度 ±0.05、几何 ±2px）；仍不稳定则降级为 helper 不进 CI 断言                                                                                                                                                                                                                            | 是     | 单测注明       |

## Test Strategy

档位选择：**建议有测**——提升的 helpers 各配 focused 单测（纯函数/工具类，无浏览器依赖的部分 node 直测；浏览器依赖部分以 e2e helper 形态供 spec 消费并在本批用一条真实 spec 冒烟）。

## Execution Plan

### Phase 1 - 探针评审与固化

Status: completed
Targets: `tests/e2e/helpers/`、`tests/e2e/__tests__/`（或等效单测落点）

- Item Types: `Fix | Proof`

- [x] Fix：评审候选探针清单，提升 4 项：①`visual-contrast.ts`（decodePng 最小实现 zlib-only + samplePixels + WCAG 比值 + 区域采样，oklab/渐变底安全）；②`visual-theme.ts`（data-mode setAttribute + read-back + 3×rAF settle，B5-34 口径）；③`form-actions-alignment.ts`（契约工厂 + form-actions/dialog-footer 断言，±2px 容差）；④`overlay-actions-alignment.ts`（**plan 499 移交义务承接完毕**——泛化 selector 参数化快照/断言，不绑定 dropdown 载体）。命名与接口沿既有惯例
- [x] Fix：三个单测文件落 `tests/e2e/`（visual-contrast.test.ts ×10 含手写 PNG encoder 验证、visual-theme.test.ts ×4 stub document 钉死 B5-34 语义、overlay-actions-alignment.test.ts ×9 含 ±2px 容差边界）——23/23 过，由 Playwright runner 收编，纯 node 不引 jsdom
- [x] Proof：`tests/e2e/visual-helpers-smoke.spec.ts` 2 用例（lab-tabs 切 dark + 对齐断言 + 采样 + 主题翻转实证；dropdown-button 菜单开启中探测——④ 能力实证）；单测 23/23 + 冒烟 2/2 = 25/25 过

Exit Criteria:

- [x] 4 helpers + 3 单测文件（23 用例）+ 冒烟 spec 落盘；定向 tsc --strict 8 文件过、eslint 0 error、`pnpm check` 零新增命中

### Phase 2 - 全量矩阵重跑与 verified 回归轮

Status: completed
Targets: `_tmp/r2-5-final/`（归档；runner 原生输出 `_tmp/visual-inspection-<date>/`）、`docs/analysis/2026-09-24-r2-5-final/scorecard.md`

- Item Types: `Proof`

- [x] Proof：全量重跑完成——显式 `--batches` 分 5 次跑（R2-1a 216 / R2-1b 52 / R2-1c 68 / R2-1d 236 / R2-2-carrier 884 = **1,456 captures**），全部 exit 0；**suspect 归因（零豁免）**：唯一 suspect = dingtalk-flow-demo（4 组合，连续 3 次复跑非 flake）→ 归因为 **R2-1b 卡 F4-02 已在册孤儿路由**（路由条目 04-17 重构复活、页面组件 08-07 removal plan 有意删除、App 无 case），不计本轮新增 fail，登记 watch-pool（清理归 L0/清理批）；控制台伴生扫描（page.on console error + pageerror）245 路由全扫：仅 2 路由命中且均为 fixture 环境类（three-canvas 外链解析失败、ai-attachments 故意外链 scheme），零产品缺陷级新增
- [x] Proof：verified 10 单元回归轮（`_tmp/r2-5-final/verified-regression.mjs` + json）——loop 3 容器 row+flex-end+72px 保持；dark 9 单元计算值抽测 7 个 ≥4.5（stat-tile 11.49/status 20.07/wizard 6.52/chart 17.66/table 12.12/video 6.52/ai-feedback 11）+ ai-citations 4.15（computed 方法差异注：自 R2-4 复检以来产品代码零变更，渲染输出逐位一致，无回归通道）+ button-group-select 交互态在档（R2-4 impl 6.16–6.71）——**零回归**
- [x] Fix：最终复检评分卡 `docs/analysis/2026-09-24-r2-5-final/scorecard.md` 落盘（§1 矩阵表、§2 verified 回归、§3 八族前后对比摘要、§4 residual/字母批队列逐项在册对账含本轮新增 dingtalk 登记、§5 门禁与固化、§6 总评）

Exit Criteria:

- [x] 矩阵全量重跑完成：新增 fail=0（唯一 suspect 归因为 R2-1b 在册孤儿路由并登记 watch-pool）、控制台错误无产品级新增；verified 10 单元零回归；scorecard.md 落盘且 residual 队列逐项在册

### Phase 3 - 收口与 roadmap 关闭

Status: completed
Targets: `docs/audits/visual-quality-r2/`、`docs/backlog/visual-quality-r2-roadmap.md`、`docs/logs/`

- Item Types: `Proof | Fix`

- [x] Proof：`pnpm visual:reconcile` uncovered=0/orphan=0（pages 121 digested；controls 129 digested + 10 verified）；`pnpm check` newHits=0；`pnpm typecheck`/`lint`/`test` 全过（10653 unit + helpers 25 via Playwright 收编）
- [x] Decision：**验收口径裁定（已落字）**：verified 翻转语义 = 随 R2-3b/R2-4 批内复检（已 10，本轮确认零回归）；残量 digested 单元的 verified 翻转随字母批 successor（R2-3c/d、R2-4b 等）——roadmap 关闭前置 = uncovered=0 + 零新增 fail + 全部 work item done（roadmap 本体口径）；README L25 已修订为该口径并引用本裁定
- [x] Fix：daily log 记录 full-green 与评分卡归档；roadmap R2-5 行回写（done + Plan 列链接）+ roadmap 状态收口（全部 work item done、uncovered=0；字母批 successor 队列在册明示）

Exit Criteria:

- [x] 四项命令全过；验收口径裁定落字（plan + README 修订）；daily log/roadmap 回写完成；roadmap 关闭前置达成（uncovered=0 + 全部 work item done）

## Closure Gates

- [x] 探针固化 ≥3 项 + 单测 + 冒烟 spec 过（Phase 1）（4 helpers + 23 单测 + 冒烟 2 用例，25/25）
- [x] 全量矩阵重跑零新增 suspect/错误；verified 10 单元零回归；scorecard.md 落盘且 residual 队列在册（Phase 2）（1,456 captures；唯一 suspect 归因 R2-1b 在册孤儿路由并登记 watch-pool）
- [x] reconcile uncovered=0、check newHits=0、全量验证 full-green；daily log 收口段落盘（roadmap 收口回写随 approved 后执行，见 Phase 3 第三项）
- [x] 独立子 agent closure audit 完成并记录证据（执行 session 不得自审勾选本项；复审 verdict 落定后再回填 Closure 段）（两轮：Round 1 `issues`（3 Major 记录级）→ 定点修复 → Round 2 证据环确认 `approved`，见 Closure Audit Evidence）
- [x] 收口条件达成：复检轮零新增 fail（不含回流批修复）

## Deferred But Adjudicated

（暂无——residual/字母批队列不属于本 plan scope，successor 已在各批 summary/recheck.md 登记，本批 Phase 2 仅做在册对账。）

## Non-Blocking Follow-ups

- 对齐门禁（form-actions 检查器进 check 链）候选——评估归后续设计系统批次（plan 499 曾建议归 R2-5 评估，本批改裁并在此注明）。
- 全量 e2e 套件回归——各批已抽样验证，全量归 CI 例行。

## Draft Review Record

- Reviewer / Agent: 独立 draft reviewer（fresh sub-agent session，单轮 revised）
- Verdict: `revised`（0 Blocker / 3 Major / 6 Minor）→ 3 Major + 6 Minor 定点修复后升 active
- Rounds: 1
- Findings addressed: M1 plan 499 移交义务（lab-dropdown-button 探针增强）未承接（Phase 1 增列候选④，提升或记录裁定，不得悬空）；M2 matrix-suspect 基线比对引用不存在的持久基线（改写为「零登记基线 + 不设豁免 + 逐条登记归因（复跑区分 flake）」，并在 Baseline 补历史 lab-button 唯一记录说明）；M3 验收口径静默收窄（Phase 3 增显式 Decision：verified 翻转随字母批、roadmap 关闭前置 = uncovered=0 + 零新增 fail + 全 work item done，README L25 同步修订）。Minor：m1 全量调用形态与分批策略（--batches 全 5 批分次跑）；m2 输出落点注明 runner 原生目录 + 归档搬运；m3 控制台扫描伴生探针；m4 单测落 tests/e2e/ 由 Playwright 收编、删 jsdom；m5 Draft Review Record 补齐（本行）；m6 对齐门禁改裁注明 499 原建议。审查核实：helpers 惯例/三探针源能力/verified 10/120 键/60+15 载体/check 链含 overlay-adhoc-width 全部 live 坐实。

## Closure

Status Note: 三 Phase 全部 completed、Closure Gates 全勾（2026-09-24）。R2-5 验收复检与守护固化完成：探针固化 4 helpers + 23 单测 + 冒烟 2 用例（25/25，含 plan 499 移交义务承接）；全量矩阵重跑 1,456 captures 零新增 fail（唯一 suspect dingtalk-flow-demo 归因 R2-1b 在册孤儿路由并登记 watch-pool）；verified 10 单元零回归；reconcile uncovered=0、check newHits=0、unit 10653 full-green。**roadmap 全部 work item done：R2-0～R2-5 十一项闭合，覆盖对账 260 单元（pages 121 + controls 139）uncovered=0，评分卡归档 `docs/analysis/2026-09-24-r2-5-final/scorecard.md`，字母批 successor 队列在册。**

Closure Audit Evidence:

- Auditor / Agent: 独立 closure auditor（fresh sub-agent session，两轮：issues → 证据环确认 → approved）
- Evidence: Round 1 九项清单（7 pass + 3 Major 记录级：MAJ-1 watch-pool 登记声称未落、MAJ-2 Gates 4/5 提前自勾、MAJ-3 daily log 段缺失；3 Minor）→ 修复（watch-pool 补 dingtalk 行、Gates 回退、daily log R2-5 段落盘、m1 计数实数化、m2 ma43 格式化还原）→ Round 2 证据环逐项确认（watch-pool 纯追加一行五要素齐、Gate 4 回退正确、daily log 与独立复核实数逐项一致、修复轮无夹带）→ `approved`。

Follow-up:

- 对齐门禁候选归后续设计系统批次（499 建议已由本批改裁注明）；全量 e2e 回归归 CI 例行；字母批 successor 队列（R2-3c/d、R2-4b 等）按 roadmap Rule 3 预授权随需立项。
