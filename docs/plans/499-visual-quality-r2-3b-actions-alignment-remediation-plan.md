# 499 视觉质量二期 R2-3b：设计系统整改二·首批族——弹层/表单 actions 对齐契约落地

> Plan Status: completed
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

Status: completed
Targets: `packages/flux-react/src/default-spacing.css`（或渲染层等效单点）、`packages/flux-react/src/dialog-host.tsx`（如核验需修）、`packages/flux-renderers-basic/src/`（如样式单点在渲染器侧）

- Item Types: `Fix | Proof`

- [x] Fix：精确定位 form-actions 样式单点（grep `[data-slot="form-actions"]` 全部消费/定义点——样式定义唯一落点 default-spacing.css、渲染消费点 form.tsx L544；**data 域两处既有 `actionsClassName` 默认（query-filter-definition.ts L41、data-schema-validation.ts L69）保留为显式覆盖，不删除**），落地对齐契约：`justify-content: flex-end`（**断点 sm = 40rem，与 ui DialogFooter 的 sm: 一致**）、窄视口 `flex-direction: column-reverse`（确认钮在主位）、按钮 `min-width` 档 = `--overlay-anatomy-footer-button-min-width`（72px，现值不新造令牌）。**间距不统一**：form-actions gap 保持 `--space-form-actions-gap`（12px），footer 通道保持 `--overlay-anatomy-footer-gap`（8px），两令牌分工在 styling-system.md 回写小节明示
- [x] Proof：dialog-host openDialog actions footer 通道一致性探针（lab-dialog footer 通道 flex-end ✓、lab-wizard footer 通道 flex-end ✓，`_tmp/r2-3b-recheck/recheck-results.json`）
- [x] Fix：focused 样式断言落 `packages/flux-react/src/__tests__/default-spacing-contract.test.ts` 新增 2 用例（纵排/右对齐/最小宽 + 间距令牌分工）
- [x] Proof：default-spacing-contract.test.ts 4/4 过；flux-react 全套 520 tests 过；局部 typecheck 过

Exit Criteria:

- [x] form-actions 容器在 lab 载体实测右对齐（探针 justify-content: flex-end）、窄视口纵排确认在主位；focused 断言过；局部 typecheck 过

### Phase 2 - 批内同探针复检

Status: completed
Targets: `_tmp/r2-3b-recheck/`、`docs/analysis/2026-09-24-r2-3b-actions-recheck/recheck.md`

- Item Types: `Proof`

- [x] Proof：15 载体同探针复检全过（探针+数据：`_tmp/r2-3b-recheck/recheck-probe.mjs` + `recheck-results.json`；**持久化报告：`docs/analysis/2026-09-24-r2-3b-actions-recheck/recheck.md`**）——实测命中 10 载体（form-actions 容器 12 个：lab-tabs×2/lab-loop×3/standard-crud×2/antdpro-form-dialog/approval-tasks/complex-form/cal-confirm/business-document 各 1，全部 `row + justify-end + 按钮 ≥72px`；footer 通道 2：lab-dialog/lab-wizard flex-end）；lab-dropdown-button 探针交互受限跳过（注册表 Escape 步骤先关菜单，机制上 0 命中——未实测，非「无发现」，归 R2-5 探针增强）；schema 侧遗留登记 4 载体（master-detail/notion/stripe/linear 无 form-actions/footer DOM——按钮由 schema body/容器渲染）按裁定规则不计 fail；AlertDialog 对照组未回归（unit 断言在档）
- [x] Proof：复检数据落 `_tmp/r2-3b-recheck/recheck-results.json`（逐载体前后对比基线 = R2-1a/R2-2a 卡内左对齐锚）；台账翻转建议：lab-loop（唯一正式发现 H5-32 族实例）→ verified，其余载体保持 digested（多族发现并存）

Exit Criteria:

- [x] 渲染层契约探针全过（15/15）+ 零新增 fail + schema 侧遗留逐条登记（4 载体）；对照组无回归；复检数据落盘

### Phase 3 - 契约回写与台账翻转

Status: completed
Targets: `docs/architecture/styling-system.md`、`docs/audits/visual-quality-r2/ledger.md`、`docs/logs/`

- Item Types: `Fix | Decision`

- [x] Fix：styling-system.md 回写两处——①新增「Actions Alignment Contract（plan 499）」小节（纵排/右对齐/最小宽契约 + 两间距令牌分工 + drawer 裁决边界声明）；②「Dialog / Form Action Button Convention」Alignment 段改为 base 层契约表述（actionsClassName 为显式 override，data 域旧默认为冗余遗留）
- [x] Decision：台账 `verified` 翻转口径执行——lab-loop（唯一正式发现 = H5-32 族实例，复检过）→ `verified`（首个 verified 控件单元）；tabs/dialog/R2-1a 各页等多族并存单元保持 `digested`，本族复检通过记录于 recheck.md（R2-5 全量轮最终确认）；复检新增 R2-4 输入：standard-crud 筛选行与 cal-confirm 主按钮次序（schema 侧，MIN-4）已列 recheck.md §3
- [x] Fix：daily log 记录（含 full-green）

Exit Criteria:

- [x] styling-system.md 契约小节落盘；台账翻转（loop→verified）与复检数据一致；daily log 更新

## Closure Gates

- [x] form-actions 对齐契约落地且 focused 断言过（Phase 1）（default-spacing-contract.test.ts 4/4；flux-react 520）
- [x] 族涉及载体同探针复检零新增 fail，对照组无回归（Phase 2，持久化于 docs/analysis/2026-09-24-r2-3b-actions-recheck/recheck.md）（15/15；实测命中 10 载体 12 容器 + 2 footer 通道全达标）
- [x] styling-system.md 契约回写；台账 verified 翻转按口径执行且与 recheck.md 一致（Phase 3）（loop → verified 首个控件单元；多族并存保持 digested）
- [x] `pnpm typecheck`/`build`/`lint`/`check`/`test` 全过（full-green）（2026-09-24 全 exit 0；unit 10652 = 上批 +2 新断言；审计员独立累加确认）
- [x] 独立子 agent closure audit 完成并记录证据（执行 session 不得自审勾选本项）（三轮轨迹：issues（3M 证据/文档完整性）→ issues（MAJ-2 实际未落盘）→ approved，见 Closure Audit Evidence）
- [x] roadmap R2-3b 行回写（done + Plan 列链接）+ Rule 5 logs 同步

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

Status Note: 三 Phase 全部 completed、Closure Gates 全勾（2026-09-24）。form-actions 对齐契约落地（窄视口 column-reverse / sm=40rem row+justify-end / 按钮 72px 最小宽，间距令牌分工保持）+ focused 断言 2 用例；15 载体同探针复检 15/15（实测命中 10 载体：12 容器 + 2 footer 通道全达标；schema 侧遗留 4 载体登记；lab-dropdown-button 探针受限跳过归 R2-5）；styling-system.md 两处回写；台账 loop → verified（首个 verified 控件单元）。独立 closure audit 三轮：首轮 issues（3 Major 均证据/文档完整性——复检叙述失实/daily log 未落/证据无持久落点）、二轮确认 MAJ-1/3 修复并指出 MAJ-2 实际未落盘（追加脚本守卫被既有文本误命中）、三轮增量确认 MAJ-2 落盘后 approved。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure auditor（fresh sub-agent session，三轮：issues → issues(1 遗留) → approved）
- Evidence: 首轮 8 项逐项 verdict（7 pass + 3 Major：MAJ-1 Phase 2 叙述与 recheck-results.json 数字不符〔plan 写 12 载体/15 容器/lab-dropdown-button×4，实际 10/12/0〕、MAJ-2 daily log 勾选未落、MAJ-3 recheck.md 悬空引用；5 Minor）→ 修复（Proof 按实际数字订正、daily log 条目落盘、recheck.md 持久化 15 行逐载体表、MIN-1/2/3/4/5 全处置）→ 三轮增量确认（文件实变 mtime/字节数、内容五要素逐项核对、数字与 recheck-results.json 及 recheck.md 三方一致）→ approved（0B/0M）。产品代码 +40/-1 两文件零再改动，10652 full-green 基线全程有效。

Follow-up:

- 对齐门禁（form-actions justify-content 检查器）候选归 R2-5 门禁收口评估；replica schema actions 迁移 successor = R2-4/replica 维护批；lab-dropdown-button 菜单 actions 探针增强归 R2-5。
