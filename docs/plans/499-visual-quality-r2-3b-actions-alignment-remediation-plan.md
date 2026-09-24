# 499 视觉质量二期 R2-3b：设计系统整改二·首批族——弹层/表单 actions 对齐契约落地

> Plan Status: active
> Last Reviewed: 2026-09-24
> Source: `docs/backlog/visual-quality-r2-roadmap.md`（R2-3b work item）、`docs/analysis/2026-09-23-r2-1a-walkthrough/summary.md` §6（首批族终裁：弹层/表单 actions 左对齐族）、`docs/analysis/2026-09-23-r2-2a-walkthrough/`（review-a 根因锐化：form-actions 容器缺对齐）、`docs/analysis/2026-09-24-r2-2b-walkthrough/summary.md` §4.3（族扩面）
> Related: plan 490（R2-3a 弹层尺寸体系，done——本 plan 沿其 overlay anatomy 契约域）、plan 496/497（R2-2a/2b 走查批，族证据源）

## Purpose

落地首批 systemic 族（弹层/表单 actions 左对齐族）的设计系统修复：form-actions 容器与 openDialog actions 通道获得统一的对齐契约（桌面右对齐、确认在主位、窄视口纵排顺序正确），对该族涉及的全部页面/控件载体**同探针批内复检**，通过后回写台账。这是 roadmap R2-3b 行的执行批。

## Current Baseline（2026-09-24）

- 族规模（跨批复核后证据）：R2-1a P1×4 / ≥10 页（standard-crud、master-detail、antdpro-form-dialog、approval-tasks、complex-form、cal-confirm、business-document、notion 创建、stripe 导出/Apply、linear H5 锚）；R2-2a dialog H5-09 + tabs H5-32（+loop 实例锚）；R2-2b dropdown-button/wizard dialog 实例。**单一根因已坐实**（R2-2a review-a）：form 渲染的 `[data-slot="form-actions"]` 容器（`packages/flux-react/src/default-spacing.css` L29–32）只有 `display:flex + gap:12px`，**无对齐声明**——actions 吸左；对照组 ui DialogFooter/AlertDialog（组件级）已合规（`sm:flex-row sm:justify-end`），形成双标准。
- dialog-host openDialog actions footer 通道在 real-schema 场景已右对齐（R2-2a dialog 卡 H5 复检通过；dialog-host.tsx L363–394 全部包 ui DialogFooter），但 schema 作者把 actions 写在 form 内时走的是 form-actions 容器（H5-09 形态）；两形态并存放大不一致感。data 域已在渲染器侧打了对齐补丁（query-filter-definition.ts L41、data-schema-validation.ts L69 的 schema 默认 `actionsClassName: 'flex justify-end gap-2'`），裸 form 默认仍吸左——双标准的又一实证。
- **drawer surface 通道现状**：dialog-host.tsx L401 起 DrawerView 走 ui DrawerFooter（全断点纵列、无右对齐/最小宽）——该形态差异已由 R2-2a review-a D-1 立案为待 design/ui 裁决项（关联 H5-12），本批不吸收该裁决（见 Non-Goals）。
- 契约锚点：`docs/architecture/styling-system.md`「Overlay Size Ladder And Anatomy」（plan 490 落地）——本批为其补 actions 对齐小节。
- 依赖面：R2-2c（plan 498）Phase 2 复核进行中；本 plan 执行不等 R2-2c 收口（族根因/修复面独立），但其若新增同族实例则并入复检清单（执行期 grep 刷新）。

## Goals

- form-actions 容器获得与 ui DialogFooter 一致的对齐契约（桌面 `justify-end`、窄视口 `flex-col-reverse` 且确认在主位、按钮最小宽档）。
- openDialog actions 通道与 form-actions 形态一致（同一页两种 actions 形态渲染一致，H5-09 的双形态分裂消除）。
- 涉及载体同探针批内复检通过；台账 `verified` 翻转按本 plan 口径执行；styling-system.md 契约回写。

## Non-Goals

- 不修其他族（dark 平价归 R2-4）；不做新门禁（对齐门禁为 follow-up 候选）；不改 overlay 尺寸阶梯（plan 490 已收）；replica 页 schema 侧的 actions 位置调整（successor = R2-4/replica 维护批，沿 R2-1a summary §6 裁定）；**drawer surface footer 形态差异归 R2-2a D-1/H5-12 待裁决项，本批不裁决不修复——复检探针对 drawer 载体只测 body 内 form-actions 实例，不测 DrawerFooter 形态**。

## Scope

### In Scope

- `default-spacing.css` form-actions 对齐声明（或等效渲染层样式单点）；按钮最小宽档；dialog-host footer 通道一致性核验（探针坐实，如需修复则一并）；批内复检；styling-system.md 回写；台账翻转；daily log。

### Out Of Scope

- 其他族修复；新门禁；AMIS 之外的行为语义变更（只动视觉对齐，不动 action 派发逻辑）。

## Failure Paths

| 可测场景编号     | 触发                                     | 行为                                                                | 可重试 | 用户可见表现 |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------- | ------ | ------------ |
| regression-break | 对齐修复破坏既有合规面（AlertDialog 等） | 复检清单含合规对照组；破坏即回滚该改动                              | 是     | 复检报告记录 |
| carrier-drift    | 复检载体路由失效/重构改名                | 复检清单按 ledger 卡内路由实时枚举；失效载体登记跳过                | 否     | 复检报告注明 |
| scope-creep-hit  | 修复引发其他页面布局回归                 | 全量 `pnpm test` + 受影响 e2e；回归即收窄修复面（按 selector 限定） | 是     | —            |

## Test Strategy

档位选择：**建议有测**——本批为视觉契约变更：①对 form-actions 对齐声明加 focused 样式断言（沿 plan 490 的 styles.test.ts 模式）；②批内复检用同探针（form-actions 容器 computed justify-content + 按钮序列）程序化判定；③全量 `pnpm test` 回归。

## Execution Plan

### Phase 1 - 修复落地

Status: planned
Targets: `packages/flux-react/src/default-spacing.css`（或渲染层等效单点）、`packages/flux-react/src/dialog-host.tsx`（如核验需修）、`packages/flux-renderers-basic/src/`（如样式单点在渲染器侧）

- Item Types: `Fix | Proof`

- [ ] Fix：精确定位 form-actions 样式单点（grep `[data-slot="form-actions"]` 全部消费/定义点——样式定义唯一落点 default-spacing.css、渲染消费点 form.tsx L544；**data 域两处既有 `actionsClassName` 默认（query-filter-definition.ts L41、data-schema-validation.ts L69）保留为显式覆盖，不删除**），落地对齐契约：`justify-content: flex-end`（**断点 sm = 40rem，与 ui DialogFooter 的 sm: 一致**）、窄视口 `flex-direction: column-reverse`（确认钮在主位）、按钮 `min-width` 档 = `--overlay-anatomy-footer-button-min-width`（72px，现值不新造令牌）。**间距不统一**：form-actions gap 保持 `--space-form-actions-gap`（12px），footer 通道保持 `--overlay-anatomy-footer-gap`（8px），两令牌分工在 styling-system.md 回写小节明示
- [ ] Proof：dialog-host openDialog actions footer 通道一致性探针（lab-dialog real-schema 场景 + form 内嵌 actions 场景）：两形态 justify-content 一致（sm+ flex-end）、按钮主位序一致、**间距各自落契约令牌（form-actions = `--space-form-actions-gap` / footer = `--overlay-anatomy-footer-gap`）**；通道侧如另有缺口（drawer 通道除外，见 Non-Goals）则一并修复
- [ ] Fix：focused 样式断言落 `packages/flux-react/src/__tests__/default-spacing-contract.test.ts`（read-css+assert 模式现成宿主）锁 form-actions 对齐类
- [ ] Proof：`pnpm --filter @nop-chaos/flux-react test`（或等效 focused）+ `pnpm typecheck` 局部通过，解阻塞复检

Exit Criteria:

- [ ] form-actions 容器在 lab 载体实测右对齐（探针 justify-content: flex-end）、窄视口纵排确认在主位；focused 断言过；局部 typecheck 过

### Phase 2 - 批内同探针复检

Status: planned
Targets: `_tmp/r2-3b-recheck/`、`docs/analysis/2026-09-24-r2-3b-actions-recheck/recheck.md`

- Item Types: `Proof`

- [ ] Proof：族涉及载体全量同探针复检。**枚举源（规范）**：R2-1a summary §6 页清单（10 锚）+ R2-2a summary §4.2（dialog/tabs/loop）+ R2-2b summary §4.3（dropdown-button/wizard）+ R2-2c 执行期刷新；cards grep（「footer 动作左对齐」「actions 左对齐」「弹层 actions」多模式）仅作二次兜底。**逐载体裁定规则**：渲染层载体（form-actions 容器/footer 通道）探针判 pass/fail（justify-content、确认钮 DOM 序 + x 坐标、间距落契约令牌）；schema 侧残留（replica 豁免、actions 顺序问题——approval-tasks footerSlots=0、cal-confirm/notion/stripe 左置主按钮、linear E3-05 二选一等）逐条登记为「Non-Goal 遗留、归 R2-4/replica 维护批」，**不计 fail**；合规对照组（AlertDialog、plan490 尺寸阶梯）不回归
- [ ] Proof：复检报告 recheck.md（逐载体前/后对比 + 台账翻转建议清单）

Exit Criteria:

- [ ] 渲染层契约探针全过 + 零新增 fail + schema 侧遗留逐条登记；对照组无回归；recheck.md 落盘

### Phase 3 - 契约回写与台账翻转

Status: planned
Targets: `docs/architecture/styling-system.md`、`docs/audits/visual-quality-r2/ledger.md`、`docs/logs/`

- Item Types: `Fix | Decision`

- [ ] Fix：styling-system.md 回写两处——①「Overlay Size Ladder And Anatomy」节补 actions 对齐契约小节（form-actions = overlay anatomy 的 footer 等价物，同一对齐/纵排/最小宽契约；明示两间距令牌分工）；②修正既有「Dialog / Form Action Button Convention」中 `actionsClassName` 默认的机制表述（L637 附近：该默认现仅在 flux-renderers-data 两处 schema 侧，非 form 渲染器默认——对齐契约落 base 层后按新事实改写）
- [ ] Decision：台账 `verified` 翻转口径执行——仅当单元全部正式 P0–P2 发现均已被已收口批修复且本批复检通过时翻 `verified`；仅部分族收口的单元保持 `digested` 并在 recheck.md 记录本族复检通过（R2-5 全量轮最终确认）
- [ ] Fix：daily log 记录（含 full-green）

Exit Criteria:

- [ ] styling-system.md 契约小节落盘；台账翻转清单与 recheck.md 一致；daily log 更新

## Closure Gates

- [ ] form-actions 对齐契约落地且 focused 断言过（Phase 1）
- [ ] 族涉及载体同探针复检零新增 fail，对照组无回归（Phase 2）
- [ ] styling-system.md 契约回写；台账 verified 翻转按口径执行且与 recheck.md 一致（Phase 3）
- [ ] `pnpm typecheck`/`build`/`lint`/`check`/`test` 全过（full-green）
- [ ] 独立子 agent closure audit 完成并记录证据（执行 session 不得自审勾选本项）
- [ ] roadmap R2-3b 行回写（done + Plan 列链接）+ Rule 5 logs 同步

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

- 对齐门禁（form-actions justify-content 检查器）候选——评估后归 R2-5 门禁收口或字母后缀批。
- replica 页 schema 内 actions 位置迁移（successor = R2-4/replica 维护批，R2-1a summary §6 已裁定）——渲染层契约落地后由该批消化。

## Draft Review Record

- Reviewer / Agent: 独立 draft reviewer（fresh sub-agent session，单轮 revised）
- Verdict: `revised`（0 Blocker / 3 Major / 6 Minor）→ 3 Major + 6 Minor 定点修复后升 active
- Rounds: 1
- Findings addressed: MAJ-1 复检通过口径与 Non-Goals 自相矛盾（增补逐载体裁定规则：渲染层载体判 pass/fail，schema 侧残留登记遗留不计 fail；Phase 2 Exit 与 Closure Gate 口径统一）；MAJ-2 间距探针自相矛盾（Proof 改为"两形态间距各自落契约令牌"，styling-system.md 回写明示分工，Fix 不统一 gap）；MAJ-3 drawer 通道与 R2-2a D-1 待裁决项相撞（Non-Goals 显式不裁决不修复，复检只测 drawer body 内 form-actions 实例）。Minor：MIN-1 styling-system L637 机制表述修正纳入 Phase 3；MIN-2 data 域两处 actionsClassName 默认保留为显式覆盖；MIN-3 断点钉值 sm=40rem；MIN-4 枚举源钉为各批 summary 清单为主、cards 多模式 grep 兜底；MIN-5 日期改为实际起草日 2026-09-24；MIN-6 replica schema 迁移显式 successor=R2-4。审查核实：根因断言（default-spacing.css L29–34/form.tsx L544/唯一消费点）、对照组（ui dialog.tsx L336/alert-dialog.tsx L93/72px 令牌）、R2-1a §6/R2-2a review-a/R2-2b §4.3 引用链、@layer base 机制、default-spacing-contract.test.ts 断言宿主全部 live 核实成立。

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<待独立 closure audit>>
- Evidence: <<待填>>

Follow-up:

- <<完成时填写>>
