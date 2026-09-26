# 511 Missing Components QA.2 前置消化 — 存量 e2e 红台账 9 项 + QA.1 审计发现（L0 ×3 / L1 ×4 / L2 Major-1+Minor ×4）

> Plan Status: draft
> Last Reviewed: 2026-09-26
> Source: `docs/backlog/missing-components-and-designer-roadmap.md` §11 QA.2（pass 标准 = e2e 全量全绿 + 0 新增 check 红）+ §13 L0 行裁决注记（「存量 9 项台账在 plan 502 Closure 红台账节，**QA.2 前专项消化**」）+ `docs/plans/502-missing-components-l0-playground-entry-plan.md` Follow-up（「存量 9 项 e2e 功能回归：QA.2 集成审计前专项消化（blocking QA.2），QA.7 残余债登记册汇总」）+ 三份线出口审计（`docs/audits/missing-components/QA.1-L0-line-exit-audit.md` §7「3 项 Minor 在下一 gate（QA.2）前修复并复审」、`QA.1-L1-line-exit-audit.md`（pass，4 Minor 同规则）、`QA.1-L2-line-exit-audit.md`（fail，1 Major + 4 Minor，修复后随 QA.3 专项复审放行））
> Related: `docs/plans/502-missing-components-l0-playground-entry-plan.md`（红台账来源）；`docs/context/project-context.md`（watch-only 在册：gantt-perf ×2 + kanban-perf ×1）

## Purpose

消解 QA.2 集成审计的全部 blocking 前置：①plan 502 遗留的 9 项存量 e2e 功能失败（QA.2 pass 标准 = e2e 全量全绿）；②三条线出口审计（L0/L1/L2）的全部未消化发现——L0 3 Minor、L1 4 Minor（均「下一 gate（QA.2）前修复并复审」）、L2 1 Major + 4 Minor（fail verdict，修复后随 QA.3 专项复审放行）。完成后 QA.2 可在无 blocking 输入瑕疵的状态下执行，L2 线出口可改判 pass。

## Current Baseline

2026-09-26 live repo 核对（HEAD `63b371fd8`）：

- **9 项存量失败全部复现**：`npx playwright test <9 spec>` 单轮实测 3.9min——100 passed / **9 failed** / 1 skipped / 19 did-not-run（失败清单与 plan 502 台账逐行一致）。回归窗口在 visual-quality R1/R2 期间（c6-3/c7 host-surfaces 在 2026-08-09 DV 基线为绿），owner triage 未做。
- 失败清单（plan 502 台账原文）：
  1. `tests/e2e/ai-coverage-widgets.spec.ts:77` loading sender disables textarea + submit
  2. `tests/e2e/cal-replica-interactions.spec.ts:307` I7 empty required submit shows field errors
  3. `tests/e2e/code-editor.spec.ts:450` search panel opens via Mod-f
  4. `tests/e2e/component-lab/c6-3-host-surfaces.spec.ts:131` status-host dialog scope eval + levelMap
  5. `tests/e2e/component-lab/c7-host-surfaces.spec.ts:226` mobile-host notice-bar close/click
  6. `tests/e2e/gantt-coverage-gaps.spec.ts:48` Zoom to Fit middle scale
  7. `tests/e2e/gantt-demo.spec.ts:16` root container and aria live region
  8. `tests/e2e/gantt-scale-today.spec.ts:106` aria-live count tracks visible tasks
  9. `tests/e2e/w3c-value-mapping.spec.ts:82` status levelMap Badge semantic color classes
- 初步信号（本计划起草时的失败输出抽查，非结论）：#9 w3c 断言期望 badge class 含 `emerald`，实际 class 为 token 类 `bg-success/15 text-success dark:bg-success/20`——疑似 plan 500（R2-4 dark-parity token remediation）把字面色改为语义 token 后断言漂移；#4 c6-3 同为 status levelMap 家族；#6/#7/#8 为 gantt aria-live/zoom 家族。真因归 Phase 1 triage 裁定。
- **watch-only 不入 scope**：gantt-perf ×2 + kanban-perf ×1（60Hz rAF 环境口径）在册于 `docs/context/project-context.md`，维持 watch-only。
- **QA.1-L0 3 Minor 在案**（`docs/audits/missing-components/QA.1-L0-line-exit-audit.md` §6）：Minor-1 `apps/playground/src/route-matrix.test.ts:320` 恒假分支死代码；Minor-2 `apps/playground/src/home-cards.ts:24,32` 合并卡 id 与域注册表无冲突防 guard；Minor-3 `apps/playground/src/domain-route-entries.ts` 537 行 warn 档持续增长（观察债，需裁定：分段拆分 or 数据声明豁免 or 维持观察）。
- **QA.1-L1 verdict pass（2026-09-26），4 Minor 同「QA.2 前修复」规则**（`QA.1-L1-line-exit-audit.md` §Findings）：Minor-1 roadmap §13 L1 行「ui +15」计数漂移（实况 16，closure r1 增补未回填）；Minor-2 rating design.md §13 触控命中声称 ≥24px vs 实况 20px（`rating.tsx:135,150`，p-0.5+16px）；Minor-3 input-color design.md §5「只读禁触发」vs 实况 readOnly 弹层可打开（内部全禁用、值无损）且该 UX 面零测试；Minor-4 plan 503 Phase 2 i18n 勾选措辞宽于交付（slider 无专用键；nameless 边缘无 aria 回退）。
- **QA.1-L2 verdict fail（2026-09-26），1 Major + 4 Minor**（`QA.1-L2-line-exit-audit.md`）：**Major-1 = org 协议 §5 契约（sourceChildren 与 sourceSearch 均受分页语义约束、orgPage 递增合并）与共享实现漂移——`useOrgChildren` 恒发 `orgPage:1`（use-org-source.ts:122/:177）、无续页/无 hasMore 暴露、面板 loadMore 仅 search 侧（org-select-panel.tsx:262），单层子节点 > pageSize 静默截断，且该 v1 取舍未在任何 Follow-up/design.md/协议注记裁决**；Minor-① 5/7 plan 簿记残留（phase in-progress/未勾选/模板占位符进入 completed 态）；Minor-② region 桌面面板手写 popover 与 ui Popover 家族分叉（design.md 有声明）；Minor-③ 硬编码英文 a11y 微标签（clear/close/✕）；Minor-④ 508 e2e 全量计数算术短 7（1564 vs 应≈1571）无归因注记（9+1 核心口径与零新增红结论不受影响）。
- unit 侧 full-green（74/74 task）+ `pnpm check` 零新增红维持中。

## Goals

- 9 项存量失败逐项 triage（根因 + 分类：产品回归 / 断言漂移 / 环境依赖）并修复至隔离复绿；产品回归按 Bug Fix Test Coverage Rule 评估回归测试加固。
- QA.1-L0 Minor-1/2 修复；Minor-3 出裁定（拆分/豁免/维持观察，写明理由）。
- QA.1-L1 4 Minor 修复（计数注记回填、rating 触达面 doc↔live 收敛、input-color readOnly 行为对齐 + 测试补面、i18n 措辞裁定）。
- QA.1-L2 Major-1 修复（org children 续页实现——契约以协议 §5 为准，实现追平契约）+ 4 Minor 修复（簿记清理、popover 分叉裁定、a11y 微标签 i18n 化、508 计数归因注记）。
- 全量 e2e 复跑达到 QA.2 输入口径：**0 功能失败**（watch-only 3 项维持在册）；`pnpm check` 零新增红维持。
- 三份审计 Minor 的「修复并复审」闭环：复审由 QA.2 集成审计自然承接（其检查项含 parity 守卫与登记一致性）；L2 Major-1 修复后由 QA.3 专项复审放行。

## Non-Goals

- 不消化 watch-only 3 项（60Hz 环境 gate，非代码缺陷）。
- 不重跑/修复 visual-quality R1/R2 的其他历史红（9 项之外的 failure surface 已由台账证明不存在——诸计划 e2e 全量记录中稳定失败面即此 9 + watch-only）。
- 不改 product 行为除非 triage 裁定某失败根因确为产品回归。

## Scope

### In Scope

- 上列 9 个 spec 用例的 triage + 修复 + 隔离复绿证明。
- QA.1-L0 Minor-1/2/3 处置。
- 收口全量 e2e 一轮 + `pnpm check` + 受影响包 unit。

### Out Of Scope

- QA.2/QA.3 集成审计本体（随后独立执行）；roadmap 其余工作项。

## Failure Paths

| 可测场景编号          | 触发                                              | 行为                                                                           | 可重试 | 用户可见表现                                 |
| --------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------ | ------ | -------------------------------------------- |
| triage 裁定为产品回归 | 失败根因在产品代码（非断言漂移）                  | 按 Bug Fix Test Coverage Rule：修产品 + 评估回归测试 + 复杂根因记 `docs/bugs/` | 是     | 修复后该用例复绿且全量无新增红               |
| triage 裁定为断言漂移 | 产品契约已合法变更（如 token 化），断言钉住旧契约 | 更新断言至现契约并在测试内注明契约来源                                         | 是     | 用例复绿，契约断言不弱化（不得改成永真断言） |
| triage 裁定为环境依赖 | 失败仅在特定环境/时序复现                         | 给出稳定复现路径或判定 watch-only（须登记理由）                                | 视情况 | 不静默 skip；skip 需在册理由                 |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**——本计划本体就是测试消化；Proof 项（隔离复绿 + 全量复跑）先于或伴随每个 Fix。

## Execution Plan

### Phase 1 - 9 项失败逐项 triage（根因 + 分类裁定）

Status: planned
Targets: `tests/e2e/`（只读诊断）+ 相关产品/测试源码（只读）

- Item Types: `Proof`、`Decision`

- [ ] 逐项运行失败用例（隔离），收集失败输出/trace/截图至 `_tmp/qa2-digestion/`
- [ ] 逐项根因定位（产品代码 vs 断言契约 vs 环境），产出裁定表：用例 → 根因 → 分类（产品回归/断言漂移/环境依赖）→ 修复方向
- [ ] 疑难根因（跨包/非显然）按需记录 `docs/bugs/`（写作指南对齐）

Exit Criteria:

- [ ] 9/9 项裁定表落盘于本 plan（每项：根因文件:行 + 分类 + 修复方向），无「未定位」残留

### Phase 2 - 按裁定修复（产品回归 Fix / 断言漂移 Fix）

Status: planned
Targets: Phase 1 裁定表指向的产品/测试文件

- Item Types: `Fix`、`Proof`

- [ ] 产品回归项：修复 + 回归测试评估（Bug Fix Test Coverage Rule 四条逐一过）
- [ ] 断言漂移项：断言更新至现行契约（禁止弱化为永真断言；契约出处注明）
- [ ] 逐项隔离复绿证明（`npx playwright test <spec>:<line>` 全绿）

Exit Criteria:

- [ ] 9/9 用例隔离复绿（逐项命令 + 结果记录于本 plan）
- [ ] 涉及产品代码修复的项：focused 单测/回归测试在案（或写明评估后不需新测试的理由）

### Phase 3 - QA.1-L0 Minor ×3 处置

Status: planned
Targets: `apps/playground/src/route-matrix.test.ts`、`apps/playground/src/home-cards.ts`、`apps/playground/src/domain-route-entries.ts`

- Item Types: `Fix`、`Decision`

- [ ] Minor-1：删除 `route-matrix.test.ts:320` 恒假分支（守卫测试仍全绿）
- [ ] Minor-2：合并卡 id 与域注册表 id 冲突防 guard 断言（audit 建议二选一：expect 断言 or 保留前缀——执行时择一并记录）
- [ ] Minor-3：`domain-route-entries.ts` 537 行 warn 档裁定（分段拆分 / oversized 豁免登记 / 维持观察——三选一，理由落盘；若拆分/豁免则 `pnpm check` 复核）

Exit Criteria:

- [ ] Minor-1/2 修复落地且 playground 包单测全绿（`pnpm --filter @nop-chaos/flux-playground test`）
- [ ] Minor-3 裁定落盘（本 plan 内写明选项与理由），所选动作（如有）已执行

### Phase 4 - QA.1-L1/L2 审计发现消化（Major-1 优先）

Status: planned
Targets: `packages/flux-renderers-form/src/renderers/org/`（use-org-source / org-select-panel）、`docs/architecture/org-data-source-protocol.md`、`packages/ui/src/rating.tsx`、input-color renderer/design.md、roadmap §13、plan 503/505–509 簿记、a11y 微标签 i18n

- Item Types: `Fix`、`Decision`、`Proof`

- [ ] **QA.1-L2 Major-1（org children 续页）**：`useOrgChildren` 补 `orgPage` 递增续页 + hasMore 暴露 + 面板 children 侧 loadMore（协议 §5 契约为准，实现追平契约）；focused 单测（多页 children 合并、终止规则复用、无 children-source 单页直通）+ e2e 断言（mock 多页 children 场景）
- [ ] QA.1-L2 Minor-①：5/7 plan（503/505–509 中实际残留者，执行时逐一核对）簿记残留清理（phase 状态/未勾选项/模板占位符——audit 记录的事实性修正）
- [ ] QA.1-L2 Minor-②：region 手写 popover 分叉裁定（design.md 已声明——裁决维持声明豁免 or 迁移 ui Popover；理由落盘）
- [ ] QA.1-L2 Minor-③：org/region 面板硬编码英文 a11y 微标签（clear/close/✕）i18n 键化（flux-i18n zh/en）
- [ ] QA.1-L2 Minor-④：508 e2e 计数算术归因注记落盘（dev log 或 QA.2 台账节）
- [ ] QA.1-L1 Minor-1：roadmap §13 L1 行「ui +15」→「ui +16」回填（grep 复核）
- [ ] QA.1-L1 Minor-2：rating 触达面 doc↔live 收敛（裁决：p-0.5→p-1 凑满 24px 保持 a11y 声称，或修正 design.md 声称为实况——择一，理由 + 视觉回归验证落盘）
- [ ] QA.1-L1 Minor-3：input-color readOnly 行为对齐 design.md（弹层禁触发）+ focused 测试补面（readonly 态零测试→有断言）
- [ ] QA.1-L1 Minor-4：i18n 措辞裁定落盘（slider 无文案键属实质成立；nameless aria 回退评估——做或裁定 watch-only 附理由）

Exit Criteria:

- [ ] Major-1：多页 children 场景单测/e2e 全绿（无静默截断），协议 §5 与实现一致（审计复审输入就绪）
- [ ] 8 项 Minor 逐项落地或裁定落盘（本 plan 内可查：文件/行/理由）
- [ ] 受影响包 focused 单测全绿（form / ui / playground 按触达面）

### Phase 5 - 收口全量验证

Status: planned
Targets: 全仓

- Item Types: `Proof`

- [ ] `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` 全绿
- [ ] `pnpm check` 零新增红
- [ ] `pnpm test:e2e` 全量一轮：**0 功能失败**（watch-only 3 项在册豁免；负载 flake 按「隔离复跑全过」口径裁定并记录）
- [ ] dev log 记录 + roadmap §13 QA 行注记（QA.2 前置消化完成）

Exit Criteria:

- [ ] 上列四项验证全过且结果记录于本 plan Closure / dev log

## Draft Review Record

- Reviewer / Agent: <<待独立子 agent 填写>>
- Verdict: <<pass | pass-with-minors | revised | degraded>>
- Rounds: <<审查轮数>>
- Findings addressed: <<每条已处理的 Blocker/Major 一行>>

## Closure Gates

- [ ] 9 项存量失败全部 triage 落裁定表且修复复绿（0 功能失败）
- [ ] QA.1-L0 Minor-1/2 修复、Minor-3 裁定闭环
- [ ] QA.1-L1 4 Minor 修复/裁定闭环；QA.1-L2 Major-1 修复 + 4 Minor 修复/裁定闭环（L2 线出口 fail → 复审输入就绪）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（产品回归项与 Major-1 不得留 non-blocking）
- [ ] 受影响 owner docs 已同步（org 协议 / rating / input-color design.md / roadmap 计数注记等，按实际触达面）或写明 No owner-doc update required
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm test:e2e` 全量 0 功能失败（watch-only 3 项在册豁免）

## Deferred But Adjudicated

### watch-only perf 三项（gantt-perf ×2 / kanban-perf ×1）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 60Hz rAF 环境口径在册（`docs/context/project-context.md` DV 基线），需 60Hz 环境最终确认，非代码缺陷
- Successor Required: `no`
- Successor Path: QA.7 残余债登记册汇总

## Non-Blocking Follow-ups

- （收口时填写，或明确写无）

## Closure

Status Note: <<收口时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<待填>>
- Evidence: <<待填>>

Follow-up:

- <<收口时填写，或明确写 no remaining plan-owned work>>
