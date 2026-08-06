# 2 扫描 P1 契约漂移与覆盖缺口修复（boundaries.md / components index.md / useDesignerShortcuts）

> Plan Status: completed（2026-08-06：3 Phase 全 completed + closure-audit round 2 APPROVED 后定稿）
> Last Reviewed: 2026-08-06
> Source: `docs/audits/2026-08-05-0656-open-audit-component-audit.md`（F1 P1 包裹的扫描 P1：01-02/16-1 boundaries.md 漂移、14-1 useDesignerShortcuts 零覆盖、16-2 docs/components/index.md phantom `service`）、`docs/analysis/2026-08-05-multi-audit-component-audit/{01,14,16}.md`（R1 扫描）
> Related: `docs/plans/2026-08-06-0529-1-gate-truthfulness-and-finding-routing.md`（路由登记，修复在本 plan）、`docs/plans/2026-08-06-0529-3-button-href-security-remediation.md`（button href 安全）；CR（`docs/plans/2026-08-06-0329-1-cr-cross-family-centralized-remediation.md`）Phase 1 裁决表互见

## Purpose

修复 multi-audit 扫描裁定的三个 P1 契约漂移/覆盖缺口：①`docs/architecture/flux-runtime-module-boundaries.md` 的 unstable-only 示例清单与实际根导出矛盾（RenderNodes/raw contexts 已稳定化但文档仍标 unstable）；②`docs/components/index.md` 注册清单含 phantom `service` 且遗漏已注册组件；③`useDesignerShortcuts` 键盘快捷键 hook 全仓零测试覆盖。收口后文档与 live 代码一致、快捷键行为有回归保护。

## Current Baseline

- **boundaries.md 漂移（P1，扫描 01-02 与 16-1 同根，去重后一处处理）**：`docs/architecture/flux-runtime-module-boundaries.md:467-471` 把 `RenderNodes` 与 `FormContext`/`ScopeContext`/`RuntimeContext` 列为「Current unstable-only examples」；live 代码 `packages/flux-react/src/index.tsx:27`（`export { RenderNodes, resolveRendererSlotContent, ... } from './render-nodes.js'`）与 `:6-18`（contexts 自 `./contexts.js` 根导出）证明这些已是 root 稳定导出。2026-05-26（commit `0fadc9a3`）有意稳定化，`docs/logs/2026/05-25.md` 留痕，文档未同步；`unstable.ts` 头注释「disjoint from the stable surface」的约定被文档示例违反（live `unstable.ts` 实际导出面与 root barrel 无重叠，注释本身成立）。
- **components/index.md phantom（P1，扫描 16-2）**：`docs/components/index.md:319` data 族清单含 `service`，但 `service` 于 2026-07-10（commit `f0f86d35`）删除、全仓零注册（`amis-baseline-matrix.md:121` 明示「service removed」）；同时遗漏已注册的 `statistics`（`w2a-data-composition-definitions.ts:108`）、`graph`（`graph-definitions.ts:6`）、`diff-view`（content-renderer-definitions.ts）、`button-group-select`（form `renderers/input.tsx:650`）；`:363`「已文档化但 runtime 尚未注册的 retained renderer：当前无此项」与 `:319` 自相矛盾。
- **useDesignerShortcuts 零覆盖（P1，扫描 14-1）**：`packages/flow-designer-renderers/src/use-designer-shortcuts.ts`（83 行：undo/redo/copy/paste/delete/save 6 分支 + `isEditableTarget`/`isInsideDesigner`/`readOnly` 3 守卫）全仓无任何测试引用（rg 零命中，live 复现）；唯一生产消费者 `designer-page-body.tsx:344`；e2e 仅按过 Escape（关闭 JSON dialog，与此 hook 无关）。auto-layout 同型 hook 有测试可对照。
- 上述三条的「路由登记」由 `{1}` Phase 3 落地，本 plan 只承担修复本身。

## Goals

- `boundaries.md` 的 unstable-only 示例清单与 `flux-react` 根导出一致（RenderNodes + 3 个 context 移出该清单，示例替换为真实 unstable 面）。
- `docs/components/index.md` data 族清单移除 `service`（移入 removed 说明），补齐 `statistics`/`graph`/`diff-view`/`button-group-select` 四条已注册条目；`:363` 与 `:319` 矛盾消除。
- `useDesignerShortcuts` 新增 hook 级单测（真实 dispatch + 3 守卫负面断言），零覆盖清零。

## Non-Goals

- **不做 flow-designer 键盘行为变更**：只补测试，不改快捷键映射/守卫逻辑（除非测试暴露真实缺陷，则按 Bug Fix Test Coverage Rule 修复 + 记录）。
- **不重写 docs/components/index.md 全文件**：只修本 plan 列出的清单与矛盾行；`service` 的其余历史提及（:400 分层说明、:467 目录）按实际归属评估，仅移除 phantom 清单条目本身。
- 不重复 `docs/plans/2026-08-06-0529-1-gate-truthfulness-and-finding-routing.md` 的路由登记与 CR/CV/CG 文本校正。
- 不动 `unstable.ts` 导出面（其当前集合以 `2026-08-06-0529-1`/CR 裁决为准；本 plan 只同步文档描述）。

## Scope

### In Scope

- `boundaries.md:467-471` 的 unstable-only 示例清单同步为 live 真实集合。
- `docs/components/index.md` data 族清单（`service` 移除 + 4 条补齐）+ `:363` 矛盾修正。
- `use-designer-shortcuts.test.tsx` 新增（真实 dispatch、3 守卫负面断言、undo/redo/copy/paste/delete/save 映射断言）。

### Out Of Scope

- 扫描 P1 候选（19-1/19-2/23-1/23-2）的 R2 复核与修复（`2026-08-06-0529-1` Phase 4 + CR）。
- boundaries.md 全文重构、其他维度文档漂移。
- flow-designer 键盘行为变更。

## Failure Paths

> 不适用：本 plan 为文档同步 + hook 测试补充，无外部 IO/鉴权/错误码契约。若测试暴露 hooks 真实行为缺陷，按 Phase 2 Exit Criteria 走「记录 + 最小修复」路径。

## Test Strategy

本档选择：`必须自动化`

- useDesignerShortcuts 是 flow-designer 核心可操作性路径（P1 零覆盖），Proof 项（测试文件新增、先验证当前零覆盖）先于任何实现动作；守卫条件负面断言（editable target / 非 designer 区域 / readOnly）必须覆盖。
- 文档修复以 repo-observable 一致性为验收：`check-active-doc-code-anchors`（锚点/路径引用）零失效 + 对照注册数组的 grep 计数。

## Execution Plan

### Phase 1 - boundaries.md unstable-only 清单同步（P1）

Status: completed

- Item Types: `Fix | Proof`

- [x] **Proof**：复核 live 根导出面——`index.tsx:6-18`（contexts 组）、`:27`（RenderNodes/resolveRendererSlotContent）与 `unstable.ts:1-17` 当前集合，记录「哪些符号在 stable、哪些在 unstable」的真实清单。
- [x] **Fix**：`boundaries.md:467-471` unstable-only 示例清单重写——移除 `RenderNodes` 与 `FormContext`/`ScopeContext`/`RuntimeContext`；替换为 live 实测仍在 `@nop-chaos/flux-react/unstable` 的真实导出示例（按 `unstable.ts` 当前内容）；同步调整 `createReadonlyScopeBinding` 段（若该段描述与 live 不符则一并修正，以 live 为准）。
- [x] **Proof**：`node scripts/check-active-doc-code-anchors.mjs` exit 0；grep 确认文档不再把 RenderNodes/contexts 标为 unstable-only。

Exit Criteria:

- [x] boundaries.md 的 unstable-only 示例清单与 `flux-react` root/unstable 实际导出一致（grep 对账）；锚点检查零失效。

### Phase 2 - docs/components/index.md phantom `service` 移除与条目补齐（P1）

Status: completed
Targets: `docs/components/index.md`、`packages/flux-renderers-data/src/w2a-data-composition-definitions.ts`（只读参照）、`packages/flux-renderers-graph/src/graph-definitions.ts`（只读参照）

- Item Types: `Fix | Proof`

- [x] **Proof**：以注册数组 live 核对 data/content/form/form-advanced/layout/mobile/ai/scheduling/graph 各族实际注册清单（grep `*-renderer-definitions.ts` 注册数组），记录当前真值作为清单重写数据源。
- [x] **Fix**：`:319` data 族清单移除 `service`，补齐 `statistics`（data）、`graph`（graph 包，含包归属注明）；content/layout 等族清单补齐 `diff-view`（content）、form 族补齐 `button-group-select`；`service` 移入 removed/历史说明（对齐 `amis-baseline-matrix.md:121` 口径）；`:363` 的「当前无此项」矛盾修正（如仍有未注册项则列真值，否则删除该句）。
- [x] **Proof**：`check-active-doc-code-anchors` exit 0；grep 确认 index.md 清单与注册数组逐条一致（零 phantom、零遗漏），`rg "service" docs/components/index.md` 仅剩 removed 说明语境。

Exit Criteria:

- [x] index.md 各族清单与 live 注册数组逐条一致；`service` 仅存在于 removed 说明；`:363` 矛盾消除；锚点检查零失效。

### Phase 3 - useDesignerShortcuts 测试覆盖（P1）

Status: completed
Targets: `packages/flow-designer-renderers/src/use-designer-shortcuts.ts`（只读参照，测试驱动）、新增 `packages/flow-designer-renderers/src/use-designer-shortcuts.test.tsx`

- Item Types: `Proof | Fix`

- [x] **Proof（test-first）**：新增 `use-designer-shortcuts.test.tsx`——①真实 dispatch 断言：undo/redo/copy/paste/delete/save 6 分支触发对应 action（`{type:'undo'|'redo'|'copySelection'|'pasteClipboard'|'deleteSelection'|'save'}`，对照 `use-designer-shortcuts.ts:49-77` 实际分支与 auto-layout 同型 hook 测试范式）；另加负面断言：Escape 不触发任何 dispatch（hook 无 escape 分支，与 live 直通行为一致）；②3 守卫负面断言：`isEditableTarget` 命中（input/textarea 等可编辑元素）不触发、`isInsideDesigner` 外区域不触发、`readOnly` 不触发；③`core.getConfig().features.shortcuts === false` 时零副作用。
- [x] **Proof**：新增测试基于现有行为断言，首跑应绿；仅当测试设施（mock core/rootRef）缺失时才先行补齐 mock，不以改动产品行为换取绿（Non-Goals 已禁止行为变更；若测试暴露真实行为缺陷则按 Exit Criteria 走「记录 + 最小修复」）。
- [x] **Fix（仅当测试暴露真实缺陷）**：若测试发现守卫/映射与 `designer-page-body.tsx` 实际接线不符的真实缺陷，按最小修复 + Bug Fix Test Coverage Rule 记录于 daily log；否则仅保留测试。

Exit Criteria:

- [x] 新增测试文件覆盖 3 守卫负面断言 + 6 快捷键映射（undo/redo/copy/paste/delete/save）+ Escape 不派发负面断言 + feature 开关关闭路径；`pnpm --filter @nop-chaos/flow-designer-renderers test` 全绿；rg 确认该 hook 已有测试引用（零覆盖清零）。

## Draft Review Record

> 起草后、执行前由独立子 agent（fresh session）审查；共识达成后本 plan 升级 `active`。

- Reviewer / Agent: task `ses_02c228d12ffeWFsIkLmdZ5vkn5`（round 1，fresh session，`revised`）+ task `ses_02c1b37d2ffe2GV7aT7OGshDL3`（round 2，fresh session，`pass`，2026-08-06）
- Verdict: `pass`
- Rounds: 2
- Findings addressed: ①Round 1 Major（escape→save 快捷键清单误述）——Current Baseline 与 Phase 3 ① 均改为 undo/redo/copy/paste/delete/save 6 分支（live 核对 `use-designer-shortcuts.ts:49-77` 无 escape 分支），并新增「Escape 不派发」负面断言，Exit Criteria「6 快捷键映射」口径一致；②Minor（unstable.ts disjoint 注释归属：改为「文档示例违反 unstable.ts 的 disjoint 约定」；锚点脚本范围：改为「锚点/路径引用」；Phase 3 ② 删除先红后绿表述：改为「断言现有行为、首跑应绿、仅 mock 缺失可补齐」）均已处理。

## Closure Gates

> 关闭条件：本 section 所有条目 + 每个 Phase Exit Criteria 全部 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] boundaries.md unstable-only 清单与 live 导出一致（P1 01-02/16-1 收敛）
- [x] docs/components/index.md 无 phantom `service`、无遗漏注册组件（P1 16-2 收敛）
- [x] useDesignerShortcuts 零覆盖清零（P1 14-1 收敛，hook 测试全绿）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs（boundaries.md、index.md、daily log）已同步到 live baseline
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 无

本 plan 无 deferred 项；所有 in-scope 项均为文档同步或测试补充，不涉及可延期的行为决策。

## Non-Blocking Follow-ups

- `docs/components/index.md` 其余家族清单若在 Phase 2 Proof 中发现更多遗漏/phantom（超出本 plan 列出的 5 条），同批修正并记录；超出合理范围的大规模重构归 future 文档治理。

## Closure

Status Note: completed（2026-08-06，3 Phase 全 completed + closure-audit pass 后定稿）

Closure Audit Evidence: 独立 fresh sub-agent 两轮：round 1（task `ses_0292e6cfdffeCqZr3FqEdy8PBT`）1 Major（daily log 执行记录缺失、owner-docs gate 早勾）→ 补录 `docs/logs/2026/08-06.md` 执行条目 + roadmap 4 行裁决列回写 fixed 后；round 2（task `ses_0292a8e4bffeZ5T27Xgqx5LKIm`）**APPROVED**，零 Blocker/零 Major，1 Minor 非阻塞（plan Closure 节在审计时仍 pending，按约定定稿后才回填，本行即该回填）；验证：typecheck/build/lint 32/32、test 59/59（flow-designer-renderers 225 含新 9 用例）、anchors 308 docs exit 0、`pnpm check` 链仅 oversized 14 既有 pre-existing 红（stash 基线对照零新增）

Follow-up:

- none（Non-Blocking Follow-ups 的「同批修正」已在 Phase 2 内落地：scheduling/graph 族清单 + 3 个目录条目补入，记录于 daily log 08-06）
