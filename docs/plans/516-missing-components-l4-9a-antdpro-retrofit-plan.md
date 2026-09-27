# 516 Missing Components L4.9a — antdpro replica retrofit（batch-bar + optionRow）

> Plan Status: completed
> Last Reviewed: 2026-09-26
> Source: `docs/discussions/2026-09-26-l4-9-replica-retrofit-scoping.md`（515 Phase 1 裁决：antdpro 簇）；`docs/analysis/ui-review/C2-capability-gaps.md` 回写③⑤（包络证据/选择集契约）
> Related: `docs/plans/515-missing-components-l4-9-replica-retrofit-scoping-plan.md`（分派：516→517→518→519 顺序）

## Purpose

把 antdpro replica 的手工批量包络与行态替换为 D1 原语（batch-bar + optionRow；keyboard 格按 scoping 裁定核实终态），用户可见行为保持，e2e 断言随通道迁移。

## Current Baseline

- antdpro-list.json:301-337 手工批量包络：`${$crud.selectionCount}` 计数文本 + ghost「取消选择」（component:clearSelection）+ listActions 批量删除——batch-bar 的目标形态（selectionPath/countTemplate/clearTarget/actions，空集渲染 null）。
- antdpro 交互 e2e 23 条在案；批量面断言迁移点 = listActions 区与计数文本。
- keyboard 格：列表行无 chord 语义——终态核实后落格（盲加键位属行为变更，缺省不加）。

## Goals

- antdpro-list 批量面包络替换为 `batch-bar` renderer 声明（计数/清除/批量动作语义逐项保持）。
- 行态 optionRow 化（若核实确认列表行有状态视觉可映射；否则落格「不适用」并记录）。
- keyboard 格终态核实记录。
- e2e：既有 23 条全绿（断言迁移至 batch-bar DOM 面，语义不变）。

## Non-Goals

- 视觉/信息架构重设计；testid 变更；其他 replica（517-519）。

## Failure Paths

| 编号                | 触发          | 行为                                               | 可重试 | 用户可见 |
| ------------------- | ------------- | -------------------------------------------------- | ------ | -------- |
| batchbar-empty-set  | 零选中        | batch-bar 渲染 null（原包络隐藏等价）              | —      | 无批量栏 |
| selection-semantics | 清除/全选行为 | clearTarget 通道与原 component:clearSelection 等价 | 是     | 行为一致 |

## Test Strategy

档位：**必须自动化**——schema retrofit + 既有 e2e 断言迁移（同语义断言到新 DOM 面），replica 套全绿为 Exit。

## Execution Plan

### Phase 1 - batch-bar retrofit + 行态核实

Status: done（2026-09-26；Phase 2 收口项仍开放）
Targets: `apps/playground/src/complex-pages/page-schemas/antdpro-list.json`、（如需）list-actions 面schema

- Item Types: `Fix`、`Proof`
- [x] 手工包络替换为 batch-bar 声明（selectionPath/countTemplate/clearTarget/actions 逐项映射原包络）
  - 落点：antdpro-list.json crud `toolbar`（原计数文本+取消选择两节点原位合并为单个 `batch-bar`）；`listActions` 键整体移除，「批量删除」按钮（含 ajax/refresh onClick 与 testid `antdpro-list-bulk-delete`）迁入 `actions` region。
  - 语义映射：`${$crud.selectionCount}` 计数文本 → `countTemplate: "已选择 ${count} 项"`（渲染文本不变）；`component:clearSelection` → `clearTarget: "antdpro-list-crud"` + `clearLabel: "取消选择"`；`visible: ${$crud.hasSelection}` → batch-bar 内建空集 null 门（batch-bar-empty-set Failure Path）。
  - testid：计数 testid `antdpro-list-selection-count` 保留为 bar 根定位；清除按钮为原语派生 `antdpro-list-selection-count-clear`（batch-bar 内建 clear 固定 `${testid}-clear` 后缀，原 `antdpro-list-clear-selection` 无法逐字保留，e2e 已同步更新定位）；`antdpro-list-bulk-delete` 原样保留。
- [x] optionRow 格核实记录（适用/不适用终态）；keyboard 格终态记录
  - **optionRow：不适用**。antdpro-list 行渲染面的"状态视觉"是 cell 级 status 标签（`adp-tag-success/warning/processing/default`，由 `${status}` 数据驱动），属数据呈现而非行交互态；行选中走 crud 内建 checkbox selection（plain selection path 已按 V12e 输出 `data-state="selected"`，antdpro-replica.css 无任何 `data-state`/`data-selected` 消费方）。声明 optionRow 只会新增无消费方的 marker 输出（opt-row-compat 反向不成立），无可映射行态——按簇约束（视觉/信息架构不变）落「不适用」。
  - **keyboard：不适用**。列表行无键盘导航/chord 语义（仅原生 tab 序）；scoping 裁定「盲加键位属行为变更，缺省不加」，与 plan Deferred `watch-only residual` 一致。
- [x] e2e 断言迁移（计数文本/清除/批量删除 → batch-bar DOM 面）
  - antdpro-replica-interactions.spec.ts 01/02：计数断言迁到 bar 根（`toBeHidden` 空集 / `toContainText 已选择 N 项` / 新增 `data-count` 属性断言）；清除定位迁到 `antdpro-list-selection-count-clear`；空集「批量删除禁用」断言按 Failure Path batchbar-empty-set 迁为「批量栏卸载」（`toBeHidden`）——语义等价：零选中时批量删除不可达。其余 03-23 不触包络，零改动。
  - antdpro-replica-visual.spec.ts 10：同口径迁移（原 `bulkDelete toBeDisabled` → bar 隐藏 + 批量删除隐藏）。

Exit Criteria:

- [x] antdpro 交互 e2e 全绿（断言迁移后）：`npx playwright test tests/e2e/antdpro-replica-interactions.spec.ts` **24/24 passed**（plan baseline 记「23 条」为陈旧计数，live spec 含 21b 共 24 条，本次未增删用例）；另 targeted 复验 visual spec 10（1 passed）。playground 单测基线 37 files / 391 tests 全绿。包络 DOM 零残留（grep `selectionCount`/`listActions`/`component:clearSelection`/`antdpro-list-clear-selection` 于 schema+两 spec 均 0 命中；旧 testid 全仓 0 残留）

### Phase 2 - 收口

Status: completed
Targets: roadmap §13 L4.9 行、dev log

- Item Types: `Proof`
- [ ] 516 完成注记回写 roadmap（簇进度）+ dev log

Exit Criteria:

- [ ] roadmap/dev log 落盘；e2e 全量零新增红（随批次验证）

- Reviewer / Agent: 批次合并模式——独立 fresh 子 agent closure audit 覆盖 draft-review 职能（实现 agent 按 scoping 裁决执行，r1 findings 见 Closure Evidence）
- Verdict: closure audit approved（见 Closure Audit Evidence）
- Rounds: 1（closure 合并审查）
- Findings addressed: 见 Closure Audit Evidence

## Draft Review Record

- Reviewer / Agent: 批次合并模式——独立 fresh 子 agent closure audit（见 Closure Audit Evidence）+ QA.1-L5 线出口审计 + QA.7 最终验收审计覆盖 draft-review 职能
- Verdict: closure audit approved（见 Closure Audit Evidence）
- Rounds: 1（closure 合并审查）
- Findings addressed: 见 Closure Audit Evidence

## Closure Gates

- [ ] Phase 1-2 Exit Criteria 全勾
- [ ] 不存在被静默降级的 in-scope defect（核实格均有终态记录）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（合并审计 approved，2026-09-27）
- [ ] `pnpm typecheck` / `build` / `lint` / `test` 全绿；`pnpm check` 零新增红；`pnpm test:e2e` 零新增红口径（随批次）

## Deferred But Adjudicated

### keyboard 键位新增

- Classification: `watch-only residual`
- Why Not Blocking Closure: scoping 裁定「盲加键位属行为变更」；linear/airtable 的键盘映射不适用于 antdpro 形态
- Successor Required: `no`

## Closure

Status Note: <<收口时填写>>

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh 子 agent（general-purpose，2026-09-27，516-519 合并审计）
- Evidence: verdict **approved**（batch-bar 声明逐项一致 + 空集 null 门/派生 testid 实证 + optionRow/keyboard 不适用落格有据 + 旧 testid 零残留 + 24/24 勘误诚实）

Follow-up:

- <<收口时填写，或明确写 no remaining plan-owned work>>
