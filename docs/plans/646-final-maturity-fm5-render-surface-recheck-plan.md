# 646 最终成熟度审计 FM-5：渲染面回归复检批（R2 基建增量 + 抽样复检轮 + ux-design-pattern 口径叠加）

> Plan Status: completed
> Last Reviewed: 2026-10-18
> Source: `docs/backlog/final-maturity-audit-roadmap.md` FM-5；`missions/final-maturity-audit.json` T3.1；口径 = `docs/skills/visual-page-quality-inspection-prompt.md`（页面走查）+ `docs/skills/ux-design-pattern-audit-prompt.md`（源码侧叠加）
> Related: `docs/backlog/visual-quality-r2-roadmap.md`（R2 收官 2026-09-24，done）；`docs/audits/visual-quality-r2/`（基建：inventory/ledger/capture 命令）；`docs/plans/643-final-maturity-fm2-code-quality-audit-plan.md`（分片执行先例）

## Purpose

对 R2 收官（2026-09-24，121 页 + 139 控件 uncovered=0）以来的渲染面做回归复检：**增量面**（新增/改版页面与控件）全量复检 + **存量抽样**复检（抽样裁定并记录），同 R2 探针口径输出评分卡对比；叠加 ux-design-pattern 源码侧口径。新发现三态归族落台账。

## Current Baseline（2026-10-18 live 核对）

- **R2 基建在案可用**：`pnpm visual:inventory`（pages.json 245 = 124 lab carrier + 121 走查页；inventory 的 hash 字段实为路由 URL 非内容 hash——draft review R1 勘误，内容级改版判别不可依赖它）/ `pnpm visual:reconcile`（uncovered/orphan exit 1 对账）/ `pnpm visual:capture --routes|--batches`（截图矩阵落 `_tmp/`）；evidence-card-template（A–H 勾选 + 归族栏）。
- **增量面驱动数据**：git log `--since=2026-09-24` 在 playground 页面/schema 路径上约 73 个提交——增量集裁定机制见 Phase 1（route-set diff + git 路径映射双源 + 渲染器/全局侧载体映射）；R1 勘误：inventory hash 为路由 URL 非内容 hash。
- **本批前的渲染面新证据**：FM-0（表格交互修复，含视觉截图 `_tmp/fm0-probe/`）、FM-3 e2e 探针 6/6 绿（弹层栈/分页/树懒加载/quick-edit/列设置/clamp）——这些面已有一手绿证据，增量复检可引用不重复。
- **既有外部红**：FM-005 型页面级 console 诊断（RM 领地）——走查批沿用 FM-3 探针的自装分桶过滤处置。
- **R2 watch-pool 关系**：`docs/audits/visual-quality-r2/watch-pool.md` 为存量已知 watch 集——抽样抽中页随卡复核其 watch 项；未抽中页 watch 项不动。
- 口径文件实存：visual-page-quality-inspection-prompt.md / ux-design-pattern-audit-prompt.md。

## Goals

- 增量集（新增/改版页面与控件，程序化裁定）全量复检：R2 同探针口径（截图矩阵 + A–H 检查项）+ ux-design-pattern 叠加，输出对比评分卡。
- 存量抽样复检：抽样清单程序化裁定（分层按域 + 未入增量集页中随机），比例与理由记录；零 fail 期望，发现立案。
- 新发现三态归族落台账 FM-5 批；P0/P1 渲染缺陷当批修（先红后绿；触保护区域仅立案）。

## Non-Goals

- 全量 121+139 重跑（R2 已覆盖且未入增量集面仅抽样）；FM-1a/1b 交互实操走查；628/FM-2 领地；截图入库（`_tmp/` 政策）。

## Scope

### In Scope

- 增量集裁定（程序化）+ 全量复检（browser-use/web-gui-tester 实操 + capture 矩阵）。
- 存量抽样复检（12–18 页 = 10%–15% 裁定边界，偏离记录于报告开篇）。
- ux-design-pattern 口径叠加（源码侧，增量集范围，bounded 单轮；产出 findings 列表并入报告）。
- 报告 `docs/audits/final-maturity-audit/fm5-render-surface-recheck-report.md`（评分卡对比 R2 基线）+ 台账 FM-5 批 + 回写。

### Out Of Scope

- 628/FM-2/FM-3 已立案项；FM-1a/1b 交互走查面（探针发现注记"FM-1a 前哨"坐标防双记账）；新截图矩阵基建建设。

## Failure Paths

| 编号          | 触发                                  | 行为                                                                              | 可重试 | 用户可见表现 |
| ------------- | ------------------------------------- | --------------------------------------------------------------------------------- | ------ | ------------ |
| flaky-env     | 截图矩阵/探针暴露环境性 flake         | 按 FM-3 probe-flaky 处置（环境观察不入 findings；稳定化后重试）                   | 是     | 无           |
| external-red  | 页面级 console 外部诊断（FM-005 型）  | 自装分桶过滤 + 外部归属注记，不立案                                               | 是     | 无           |
| defect-p0p1   | 复检证实 P0/P1 渲染缺陷               | 当批修（判别测试/截图证据先红后绿）；触保护区域仅立案                             | 是     | 视缺陷       |
| global-change | 抽样外页面发现全局 token/渲染器级回归 | 同族存量页扩抽（controls.json 载体关系定族），扩抽结果并报告；系统性则立案归 FM-7 | 是     | 视缺陷       |

## Test Strategy

档位选择（三选一）：`建议有测`

本档选择：**建议有测**——走查批以 evidence cards + 评分卡为交付；P0/P1 修复携带判别测试或截图证据（先红后绿）。

## 口径执行模型声明（draft review R1 修订）

- **执行载体**：capture 截图矩阵由主会话串行驱动（pnpm visual:capture）；页面实操复检由 fresh sub-agent 分域并行（browser-use/web-gui-tester；console 分桶断言先例 = FM-3 探针，分域并行合并先例 = plan 643/644）；分片结果合并复核。
- **ux-design-pattern 口径**：bounded 单轮采样（增量集范围），产出 = 该口径附录 A 格式 findings 列表并入报告 + 三态归族（不产评分维度——评分卡属 visual 口径）。
- **增量集上界**：>40 页触发 roadmap Rule 3 字母后缀拆分（FM-5a/b 滚动，首批范围裁定落报告）。
- **快照时点**：增量裁定以复检窗口起点为准；窗口内新落提交（含并发在途）补裁或披露于报告。
- **台账双体系**：coverage 台账（visual-quality-r2/ledger.md）——Phase 1 先再生成 inventory（新页/新控件行自动 pending 入账，**按生成器既有批次规则入账、不改批次规则**），Phase 2 跑 `pnpm visual:reconcile` 口径 uncovered=0；FM-5 复检归属以 ledger 行 note 列注记 + cards 目录表示；findings 台账（final-maturity-audit/ledger.md）三态归族独立。evidence cards 落 `docs/analysis/fm5-render-recheck/cards/<unit-id>.md`。
- **FM-0/FM-3 证据引用边界**：仅限同契约点引用既有绿证据；增量集中含表格的页面整页复检仍须全做。

## Execution Plan

### Phase 1 - 增量集裁定 + 复检执行

Status: completed
Targets: `docs/audits/final-maturity-audit/fm5-render-surface-recheck-report.md`

- Item Types: `Proof | Fix`

- [x] Proof：程序化裁定增量集，双源=①route-set diff（inventory 再生成前后 id 集对比——捕捉新增/删除/改名路由）+②git 提交路径→路由映射（`--since=2026-09-24` 的 playground 页面/schema 路径——捕捉改版）；**渲染器/全局侧**（packages/flux-renderers-\* 与 packages/ui/styles、theme-tokens 的提交——以执行期实跑为准，起草抽测：renderers 五包 94 + ui/styles、theme-tokens 7）经 controls.json 的 sourcePackage/labRoute 载体关系映射到受影响页面族并入增量集；清单与理由落报告开篇。存量抽样清单同裁定（分层 + 随机，12–18 页为 10%–15% 裁定边界，偏离记录于报告开篇抽样记录）。
- [x] Proof：增量集全量复检完成（capture 矩阵 357 张 + 三分片 browser-use 实操 + evidence cards 55 张）+ ux-design-pattern 叠加（12 findings）；存量抽样 14 页完成。generator 规模钉再基线（124/121→134/129，批次规则未动）。
- [x] Fix：P0×1 + P1×3 当批修（bisheng-build 边路由守卫判别 3 用例红→绿 + 3 项 schema/样式修复 live 验证；详见报告）。

Exit Criteria:

- [x] 增量集与抽样清单可对账（`_tmp/fm5-increment.json`/`fm5-scope.json`）；evidence cards 55 张齐备（docs/analysis/fm5-render-recheck/cards/）；P0/P1 修复判别绿。

### Phase 2 - 评分卡对比 + 归族收口

Status: completed
Targets: 报告、`docs/audits/final-maturity-audit/ledger.md`、roadmap、mission

- Item Types: `Proof | Follow-up`

- [x] 评分卡对比 R2 基线输出（32 改版页零新回归 + 23 正向销项 + 新增面 1P0/4P1 级）+ ux findings 列表并入；coverage 台账 `pnpm visual:reconcile` 结构闭合（129+149，uncovered=0）+ findings 台账 FM-031–035 登记。
- [ ] 回写：roadmap FM-5 `done`、mission T3.1 `done`、daily log（closure audit 通过后随收口提交落盘）。

Exit Criteria:

- [ ] 评分卡与台账多面一致；回写完成。

## Draft Review Record

- Reviewer / Agent: agent_6ed713cf（fresh session 独立子 agent，两轮）
- Verdict: `revised`（R1 fail 0B/3M/6m → 全量修订 → R2 fail 0B/2M/3m 全清扫级 → 修后升 active）
- Rounds: 2
- Findings addressed: R1-M1 inventory hash 实为路由 URL 非内容 hash → Baseline 勘误 + 双源改述 route-set diff + git 路径映射（不新增内容指纹基建）；R1-M2 渲染器/全局侧变更不可见 → 提交路径纳入驱动源 + controls.json sourcePackage/labRoute 载体映射 + Failure Path global-change 扩抽行；R1-M3 执行模型未声明 → 「口径执行模型声明」节（载体/ux bounded 单轮/>40 页 Rule 3 拆分/快照时点/台账双体系/引用边界）；m1 12–18=10%–15% 边界；m2 ux 产出形态钉死；m3 台账双体系消歧；m4 cards 落点；m5 FM-0/FM-3 引用边界限定；m6 watch-pool 关系披露。R2-M-R2-1 三处旧 hash 机制句清扫（Baseline/Goals/Non-Goals）；R2-M-R2-2 "新行批次=FM-5" 改按生成器既有批次规则入账 + note 列注记；R2 m-R2-1 提交计数改执行期实跑口径；R2 m-R2-2 Closure Gate 双体系措辞同步；R2 m-R2-3 先例引用拆正。

## Closure Gates

- [ ] 增量集与抽样清单程序化裁定且可对账
- [ ] 增量集全量复检完成（evidence cards 齐备）；存量抽样完成
- [ ] P0/P1 修复判别绿（或 protected-area 立案披露）
- [x] 评分卡对比输出；coverage 台账 `pnpm visual:reconcile` uncovered=0；findings 台账 FM-5 批登记
- [ ] 受影响 owner docs 已同步或明确 No owner-doc update required
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（42-43/44，唯一红 = playground vite.config 既有登记红；flow-designer-core/playground 目标文件 typecheck 干净）
- [x] `pnpm build`
- [x] `pnpm lint`（44/44 绿）
- [x] `pnpm test`（82/82 任务 exit 0 全绿；flow-designer-core 213/213 含新判别 3 例）
- [x] `pnpm check`（并发归属披露口径：knip xlang mock-server 唯一红归属 176032924；scanner within baseline）

## Deferred But Adjudicated

（起草期无；执行中改判当场落此节。）

## Closure

Status Note: FM-5 三段交付全部落地：增量集裁定（route-set diff 18 新路由 + git 映射 40 改版页，超上界触发 Rule 3 拆分——首批 32 + FM-5a 顺延 8）；增量全量复检（18 新页 + 32 改版页 + 14 抽样 = 64 单元，capture 357 张，evidence cards 55 张）——**证实 P0×1 + P1×4 并当批修复 1P0+3P1**（bisheng-build 边路由守卫判别 3 用例红→绿；scada-gallery 对比度 1.48→15.74；双 schema 确认基线对齐），xlang P1 领地立案 FM-032；改版面 32 页零新回归 + 正向销项 23 项；ux 叠加 12 findings 归族。台账 FM-031–035 uncovered=0。收口审计 R1 `approved`（2M/5m 簿记级）。

Closure Audit Evidence:

- Auditor / Agent: agent_6ed713cf（fresh session 独立子 agent，两轮 draft review + 单轮 closure approved）
- Evidence: draft R1 fail（0B/3M/6m：inventory hash 实为路由 URL、渲染器/全局侧驱动缺失、执行模型未声明）→ 修订（route-set diff+git 映射双源/载体映射/global-change 扩抽行/执行模型声明节）；R2 fail（0B/2M/3m：三处 hash 旧句清扫/批次表示法/计数口径）→ 清扫修后升 active。closure audit 独立复核：A1 增量裁定真实（18 新路由 inventory diff 复现）、A2 走查证据抽查属实、A3 P0 修复读码确认守卫正确、A4 台账五行一致、A5 门禁数字吻合。详见 `docs/logs/2026/10-18.md`。

Follow-up:

- FM-031/034（linear-settings 对比度、ux MEDIUM 族）归 FM-6 候选；FM-032（xlang 主题）归并发领地；FM-033（R2 在案复发 11 条）维持原归族坐标；FM-035（capture 伪影）runner 改进建议；FM-5a：8 条改版页顺延（roadmap Rule 3 预授权）。

## Non-Blocking Follow-ups

- 未入抽样集的存量页维持 R2 verified 基线不动；后续字母批随需立项。
