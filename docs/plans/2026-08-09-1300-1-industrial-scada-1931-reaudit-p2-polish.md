# 1 Industrial SCADA 1931 Re-Audit P2 Polish

> Plan Status: completed
> Last Reviewed: 2026-08-09
> Source: `docs/audits/2026-08-08-1931-multi-audit-industrial-hmi-component-audit.md`（§[P2-1]~§[P2-8]）；roadmap `docs/backlog/industrial-hmi-component-audit-roadmap.md` `## Follow-up Backlog`（subsection「来自 2026-08-08-1931 …」，prefix `1931-P2-*`）
> Mission: industrial-hmi-component-audit
> Related: `docs/plans/2026-08-08-1931-4-industrial-scada-editor-target-reconciliation-error-recovery.md`（1931 P1 closure）；`docs/plans/2026-08-08-1931-3-industrial-scada-oversized-test-split.md`（1931 P1-1 closure）

## Purpose

收口 1931 后继 re-audit（`docs/audits/2026-08-08-1931-multi-audit-industrial-hmi-component-audit.md`）的 8 个 [P2] findings（`1931-P2-1`~`1931-P2-8`）。这些是 industrial-hmi-component-audit mission `## Follow-up Backlog` 中最后一批未处理的 polish 项——1712 两份 deep-audit 的全部 P2（P2-1~P2-11 + 本轮-1~本轮-13 + F1~F11）已全数 ✅ done，1931 re-audit 的 4 个 [P1] 也已由 plan 1931-3/1931-4 收口。本 plan 把剩余 8 个 [P2] 一次性清零。

## Current Baseline

- **1931 re-audit P1 全部已修**：P1-1（2 测试文件 >700 硬门）→ plan `2026-08-08-1931-3` completed；P1-2/P1-3/P1-4（editor.target 调和 + 错误恢复一致性）→ plan `2026-08-08-1931-4` completed（`reconcileEditorTargets` helper 落在 4 站点：sync 成功+catch、applyUndoRedoDiff 成功+catch）。
- **1712 全部 P2 已 done**：P2-1~P2-11 + 本轮-1~本轮-13 + F1~F11 全部 ✅（roadmap Follow-up Backlog 进度行确认）。
- **静态基线**：typecheck/build/lint 32/32；industrial 单测 1439+（随 1931-3/4 增长）；workspace 59/59。
- **8 个 1931-P2 findings 未处理**（live 实核 2026-08-09）：
  - `1931-P2-1`：`runtime-mutators.ts:207` groupSymbols `selectedNodes.map((c) => ({ ...c }))` 浅克隆——祖先+后代同选时后代重复进 groupNode.children（数据完整性）。
  - `1931-P2-2`：`use-editor-engine.ts:258-266` 容器驱动 DOM 尺寸 effect schema-first（`args.width ?? container`）+ 缺 `refitViewportOnResize()`——与 runtime `use-scada-engine.ts:288-294`（container-first + refit）不对称。当前 dormant（editor 不传 args.width），但是未来地雷。
  - `1931-P2-3`：`docs/components/industrial-hmi/design-renderer.md:302-307` §11 序列化文件树漏 `legacy-scan.ts` + 整个 `validators/` 子目录（9 源文件，HCA-CG 拆分产出）。
  - `1931-P2-4`：`editor/index.ts` import 但未 re-export `industrialEditorRendererDefinitions`（与主入口导出 `industrialRendererDefinitions` 不对称）。
  - `1931-P2-5`：`toolbox-panel.tsx:161-163` 3 个 tooltip 位 `t(key) || 'Fallback'` 死回退（i18next 未命中返回 key 串本身非 falsy，`||` 永不触发；文件自身 :130-133 已警告并用 `labelOr` 修好 visible label，但 tooltip 位未迁移）。
  - `1931-P2-6`：`editor/renderer/editor-errors.ts`（`scadaEditorErrorI18nKey`/`isRuntimeErrorCode`/`SCADA_EDITOR_ERROR_CODES`）零生产 importer（`rg "from.*editor-errors"` over `src/` 仅命中 `editor-errors.test.ts`）——带测试套件的死代码（dispatch 站点硬编码 `t('industrial.scada.editor.error.<code>')` 内联，从不调用 `scadaEditorErrorI18nKey`）。
  - `1931-P2-7`：`editor-state-integrity.test.ts:186-232` P1-3 undo/redo 选区修剪 3 测只断言 `session.selection`，不断言 `engine.clearEditorSelection()`/`engine.setEditorTargets(...)` 引擎层再同步——若重构丢掉 `setEditorTargets` 分支，leafer editor 在死节点上保留高亮框而 session 数组正确，对测试不可见。
  - `1931-P2-8`：`scada-editor-canvas-reactivity.test.tsx:147-148` `expect(within(root).queryByTestId('noop')).toBeNull()` 恒通过（无 'noop' testid），仅为抑制 unused-import lint 的 cosmetic no-op。

## Goals

- 1931 re-audit 的 8 个 [P2] findings 全部落地（fix / decision / test-strengthen / doc-sync），Follow-up Backlog `1931-P2-*` 段清零。
- P2-1（数据完整性）+ P2-2（viewport parity）带 failing-first 回归测试。
- P2-6 做出明确 Decision（wire-in 或 delete）并执行，消除「带测试的死代码」。
- 零回归：industrial 单测全绿、typecheck/build/lint 32/32。

## Non-Goals

- 不处理 1712 audit findings（已全 done）。
- 不处理 1931 re-audit 的 P1（已由 1931-3/1931-4 收口）。
- 不重新审计 industrial 包（deep-audit 由 mission engine 按审计轮数驱动，不由本 plan 触发）。
- 不处理 CV e2e watch-only residual（edge line geometric + edge polygon leafer-render-timing，out-of-scope）。

## Scope

### In Scope

- `1931-P2-1`：groupSymbols 祖先+后代去重（runtime-mutators.ts）。
- `1931-P2-2`：editor 容器驱动 DOM 尺寸 effect 对齐 runtime（use-editor-engine.ts）。
- `1931-P2-3`：design-renderer.md §11 序列化文件树补 legacy-scan.ts + validators/。
- `1931-P2-4`：editor/index.ts re-export industrialEditorRendererDefinitions。
- `1931-P2-5`：toolbox-panel.tsx tooltip 死回退清理。
- `1931-P2-6`：editor-errors.ts 死代码 Decision + 执行。
- `1931-P2-7`：editor-state-integrity.test.ts 增 engine target 断言。
- `1931-P2-8`：scada-editor-canvas-reactivity.test.tsx 删 no-op 断言 + 残留 import。

### Out Of Scope

- 2 个 CV watch-only e2e residual（edge line geometric + edge polygon leafer-render-timing）。
- industrial 包之外的改动。
- 新 feature / 新 API（仅 polish 现有行为）。

## Failure Paths

> 不适用。本计划为非阻塞 P2 polish：P2-1/P2-2 是边界 case 修复（非鉴权/API 契约/外部集成）；P2-3~P2-8 是 doc/test/dead-code 清理，无失败路径语义。

## Test Strategy

本档选择：`建议有测`

理由：8 个 findings 中 P2-1（数据完整性：duplicate id）+ P2-2（viewport correctness parity）是真实行为修复，必须带 failing-first 回归测试断言可观测结果（非 not.toThrow）。P2-7/P2-8 本身是 test-fidelity 改动（strengthen / cleanup）。P2-3/P2-4/P2-5/P2-6 是 doc/export/cleanup，验证方式为局部 typecheck + 既有测试不回归。无鉴权/对外 API 契约/核心回归路径，不达「必须自动化」档。

## Execution Plan

### Phase 1 - Editor correctness（行为修复 + failing-first 测试）

Status: completed
Targets: `packages/flux-renderers-industrial/src/editor/runtime-mutators.ts`、`packages/flux-renderers-industrial/src/editor/renderer/hooks/use-editor-engine.ts`

- Item Types: `Fix`、`Proof`

- [x] **1931-P2-1（Fix）**：`runtime-mutators.ts:180-214` groupSymbols —— 在构造 `groupNode.children` 前，剔除「是另一选中节点后代」的选中节点。实现方向：收集 `selectedNodes` 后，对每个选中节点检查是否是另一选中节点的后代（递归 `collectAllSymbols` 或预建 parent→descendant 索引），过滤重叠节点，确保后代不在 groupNode.children 中重复出现。保留单层 selectedNodes 不剥离子树语义（选中 group 整体作为 child）。
- [x] **1931-P2-1（Proof）**：failing-first 回归测试 —— 选 `[G1, G2]` 其中 G2 ⊂ G1.children，group 后断言：(a) 序列化输出无重复 id；(b) `collectAllSymbols(result).map(s=>s.id)` 无重复；(c) 新 group children 不含 G2 作为 G1.children 内层节点。先写测试→确认失败（duplicate id）→修复→通过。
- [x] **1931-P2-2（Fix）**：`use-editor-engine.ts:258-266` 对齐 runtime `use-scada-engine.ts:288-294` —— container-first（`containerRef.current?.clientWidth` 优先于 `args.width`，schema 仅 container=0 时 fallback）+ `setSize` 后追加 `current.refitViewportOnResize?.()`（refit closure 已经 `scada-editor-canvas.tsx` `setResizeRefit` 注册，无 policy 时 no-op）。
- [x] **1931-P2-2（Proof）**：failing-first 回归测试 —— 验证 width/height effect 中 `refitViewportOnResize` 在 `setSize` 后被调用（spy runtime refit closure），且 container 尺寸优先于 args.width（传 args.width + mock container clientWidth，断言 setSize 收到 container 尺寸而非 args.width）。

Exit Criteria:

- [x] groupSymbols 祖先+后代同选产 0 重复 id（failing-first 测试断言序列化结果 + id 唯一性，可观测）。
- [x] editor 容器驱动 DOM 尺寸 effect 与 runtime 同形（container-first + refit，failing-first 测试断言 refit 调用 + container 优先）。
- [x] 局部 `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck` 通过（后续 Phase 依赖编译）。

### Phase 2 - Public contract + dead code cleanup

Status: completed
Targets: `packages/flux-renderers-industrial/src/editor/index.ts`、`packages/flux-renderers-industrial/src/editor/toolbox/toolbox-panel.tsx`、`packages/flux-renderers-industrial/src/editor/renderer/editor-errors.ts`(+`.test.ts`)、`docs/components/industrial-hmi-editor/design-renderer.md`

- Item Types: `Fix`、`Decision`

- [x] **1931-P2-4（Fix）**：`editor/index.ts` 增 `export { industrialEditorRendererDefinitions } from './renderer-definitions.js';`（与主入口导出 `industrialRendererDefinitions` 对齐），使 host 可对 editor renderer 施同型选择性注册。
- [x] **1931-P2-4（Fix）**：`docs/components/industrial-hmi-editor/design-renderer.md` §11 公共面描述补 `industrialEditorRendererDefinitions` 导出（公共契约变更，Minimum Rule 17）。
- [x] **1931-P2-5（Fix）**：`toolbox-panel.tsx:161-163` 3 个 tooltip 位 `t(key) || 'Fallback'` —— 删死 `|| '...'` 对齐 :167+ bare `t(key)`（3 key 在 en/zh locale 均存在，无 active breakage），或对 tooltip 位也复用 `labelOr`（显式未命中检测）。选定一种并执行。
- [x] **1931-P2-6（Decision + Fix）**：裁定 `editor-errors.ts` 死代码去向，二选一执行：
  - **Option A（wire-in，推荐）**：把 `scadaEditorErrorI18nKey` 接进 code→i18n-key 解析站点——唯一生产解析点是 `scada-editor-canvas.tsx`（`rg "industrial\.scada\.editor\.error\."` over `src/editor` 仅命中此文件）；`onError(code, ...)` 派发站点传的是 error code 非 t() key。wire-in 即在该解析站点把 code→`t(scadaEditorErrorI18nKey(code))` 替换硬编码 `t('industrial.scada.editor.error.<code>')`，使 `.unknown` fallback 成为真实安全网（未注册码不再渲染 raw dotted key）。
  - **Option B（delete）**：删 `editor-errors.ts` + `editor-errors.test.ts`，在解析站点内联注释文档化「i18n key 在解析站点内联，无中心映射」。
  - 执行前在 plan 内记录选定 option + 理由。若选 A，wire-in 目标是 `scada-editor-canvas.tsx` 的 code→key 解析点（非 onError 派发站点）。

> **1931-P2-6 Decision Record**：选定 **Option A（wire-in）**。理由：(1) `editor-errors.ts` 已含完整 registry + i18n 映射 + `.unknown` 安全网 + 测试套件，wire-in 是 1 行替换即激活其价值（.unknown fallback 成真实安全网），删除则丢弃已建映射资产并需在未来重新引入；(2) wire-in 目标唯一且明确（`scada-editor-canvas.tsx` drop 路径 line 301 是 `src/editor` 内唯一 `t('industrial.scada.editor.error.<code>')` 硬编码解析点），无多站点扩散；(3) 零行为变化（`scadaEditorErrorI18nKey('invalid-node')` 返回 `'industrial.scada.editor.error.invalid-node'`，t() 调用等价）。已执行：`scada-editor-canvas.tsx` import `scadaEditorErrorI18nKey` + drop 路径改用 `t(scadaEditorErrorI18nKey('invalid-node'))`；§8.5.2 补 Option A wire-in 记录。其余 onError 派发站点（`editor-internal-error` 等）传 raw error message 非 i18n key，属另一关注点（不在本 finding scope）。

Exit Criteria:

- [x] `editor/index.ts` 导出 `industrialEditorRendererDefinitions`（host 可 `import { industrialEditorRendererDefinitions } from '@nop-chaos/flux-renderers-industrial/editor'`）+ editor `design-renderer.md` §11 公共面描述已补该导出。
- [x] `toolbox-panel.tsx` tooltip 位无死 `|| '...'` 回退（grep `|| '` 在该文件 tooltip 位 0 命中）。
- [x] `editor-errors.ts` 死代码状态裁定并执行（wire-in 或 delete），`rg "from.*editor-errors"` over `src/` 要么命中生产 importer（Option A），要么 0 命中且文件已删（Option B）。
- [x] 局部 `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck` 通过。

### Phase 3 - Doc + test fidelity

Status: completed
Targets: `docs/components/industrial-hmi/design-renderer.md`、`packages/flux-renderers-industrial/src/editor/editor-state-integrity.test.ts`、`packages/flux-renderers-industrial/src/editor/scada-editor-canvas-reactivity.test.tsx`

- Item Types: `Fix`、`Proof`

- [x] **1931-P2-3（Fix）**：`design-renderer.md:302-307` §11 序列化文件树追加 `legacy-scan.ts`（`scanLegacyAtSyntax`，被 `validate.ts` 消费）+ `validators/` 子目录（`index.ts` + `helpers.ts` + 6 per-domain：`animation.ts`/`binding.ts`/`point-declaration.ts`/`state-declaration.ts`/`symbol-event.ts`/`symbol-node.ts`），镜像 `design-engine.md §11` 引擎拆分的更新方式。
- [x] **1931-P2-7（Proof）**：`editor-state-integrity.test.ts:186-232` P1-3 选区修剪 3 测 —— `mutators.undo()` 后 spy/assert `engine.clearEditorSelection` / `engine.setEditorTargets` 以修剪后 id 集触发（镜像 `runtime-mutators-nested.test.ts:141`），使引擎层 target 再同步对测试可见。
- [x] **1931-P2-8（Fix）**：`scada-editor-canvas-reactivity.test.tsx:147-148` 删 `expect(within(root).queryByTestId('noop')).toBeNull()` + 残留 `within` import（若仅此处用），或换成真 DOM 断言（如 toolbox region `data-selection` 反映修剪后选区）。

Exit Criteria:

- [x] `design-renderer.md` §11 序列化段含 `legacy-scan.ts` + `validators/` 全部 9 文件（grep 可定位）。
- [x] P1-3 选区修剪测试断言引擎层 target 再同步（`engine.setEditorTargets`/`clearEditorSelection` 可见）。
- [x] `scada-editor-canvas-reactivity.test.tsx` 无 `queryByTestId('noop')` no-op 断言（grep 0 命中）。

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: fresh session `ses_01b195f0affeSvO425wiWYbEaa`（独立 general sub-agent，不复用起草者上下文）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - (Minor m-1) P2-4 owner-doc obligation 缺失 → 已增 Phase 2 checklist item（editor `design-renderer.md` §11 公共面描述补 `industrialEditorRendererDefinitions` 导出）+ Exit Criteria 同步。
  - (Minor m-2) P2-6 Option A 派发站点枚举不精确（`onError` 派发站点传 code 非 t() key，唯一生产解析点是 `scada-editor-canvas.tsx`）→ 已重写 Option A 措辞，明确 wire-in 目标是 code→i18n-key 解析站点。
  - 0 Blocker / 0 Major；全部 8 条引用（file:line / 函数 / 代码片段）经 live repo 实核确认。

## Closure Gates

- [x] 1931 re-audit 全部 8 个 [P2] findings 已落地（fix/decision/test-strengthen/doc-sync）
- [x] P2-1 + P2-2 failing-first 回归测试断言可观测结果（非 not.toThrow）
- [x] P2-6 dead-code Decision 已裁定并执行（wire-in Option A），无「带测试的死代码」残留
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope item
- [x] 受影响 owner docs 已同步（runtime design-renderer.md §11 文件树 + editor design-renderer.md §11 公共面描述 + §8.5.2 error wire-in 记录；sizing §8.3 行为对齐 runtime，无 documented behavior 变更故未改 §8.3 文字）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（32/32 全绿）
- [x] `pnpm build`（32/32 全绿）
- [x] `pnpm lint`（32/32 全绿）
- [x] `pnpm test`（workspace 59/59 任务全绿；industrial 1449 测全绿，5 新 failing-first 测均验证失败→通过周期）

## Deferred But Adjudicated

> 本 plan 不预期 deferred 项。若执行中发现某 finding 的修复 cost 超出 P2 polish 边界（如 P2-6 wire-in 涉及过多站点），在 plan 内显式记录裁定 + Why Not Blocking Closure，不静默降级。

## Non-Blocking Follow-ups

- roadmap `docs/backlog/industrial-hmi-component-audit-roadmap.md` `## Follow-up Backlog` 段 `1931-P2-*` 全部 ✅ 后，本 mission 的 Follow-up Backlog 清零（1712 + 1931 两轮全部收口）。

## Closure

Status Note: 执行 session 已完成全部 3 Phase（8 个 1931-P2 findings 全部落地）。typecheck/build/lint 32/32、workspace test 59/59、industrial unit 1449 测全绿，零回归。closure-audit 由独立 fresh-session 子 agent 完成（见下方 evidence），closure-audit gate 已勾选。

Closure Audit Evidence:

- Auditor / Agent: independent fresh-session closure auditor（mission-driver closure-audit step，非执行 session；task `MISSION_DRIVER:2026-08-08-193117-mission-driver`）
- Verdict: `approved`（0 Blocker / 0 Major / 0 Minor）
- Evidence:
  - **Phase 1 live 复核**：`runtime-mutators.ts:200` `dedupAncestorDescendant(selectedNodes, childSet, ...)` 在构造 `groupNode.children`（:214 `dedupedNodes.map((c)=>({...c}))`）前实际调用，helper 实现在 :416（非 stub）；failing-first 测位于 `runtime-mutators-nested.test.ts:267`（标注 `plan 2026-08-09-1300-1 Phase 1 / 1931-P2-1`）。`use-editor-engine.ts:266-276` width/height effect 容器优先（`container?.clientWidth || args.width || 0`）+ `setSize` 后 `current.refitViewportOnResize?.()` 实调（:274），ResizeObserver 分支同样对称调 refit（:243）；failing-first 测位于 `use-editor-engine.test.tsx:36-78`（标注 `1931-P2-2`，断言 setSize 收 container 400 而非 args 1000 + refit spy 被调）。
  - **Phase 2 live 复核**：`editor/index.ts:28` `export { industrialEditorRendererDefinitions } from './renderer-definitions.js'`（实导出，host 可消费）；`toolbox-panel.tsx:161-205` 11 个 btn tooltip 位全部用 `labelOr(...)`，`|| 'Delete'/'Group'/'Ungroup'` 死回退已删（grep `\|\| '` 在 tooltip 位 0 命中）；`scada-editor-canvas.tsx:12` import `scadaEditorErrorI18nKey` + :306 `t(scadaEditorErrorI18nKey('invalid-node'))`（Option A wire-in 实接入生产解析站点，非仅 import；`editor-errors.ts:58` `scadaEditorErrorI18nKey` 真实被调，`.unknown` fallback 成真实安全网）。
  - **Phase 3 live 复核**：runtime `design-renderer.md` §11 文件树含 `legacy-scan.ts`（:308）+ `validators/` 子目录（:309）；`editor-state-integrity.test.ts:195/227/244` spy `engine.clearEditorSelection` + `engine.setEditorTargets`（P1-3 选区修剪 3 测引擎层 target 再同步对测试可见）；`scada-editor-canvas-reactivity.test.tsx` grep `queryByTestId('noop')` 0 命中（no-op 断言已删）。
  - **owner-doc 同步**：runtime `design-renderer.md` §11 + editor `design-renderer.md` §11 index.ts 公共面注释（:358）+ §8.5.2 Option A wire-in 记录（:324）均 live。
  - **验证复跑**：`pnpm --filter @nop-chaos/flux-renderers-industrial typecheck` 通过；`pnpm --filter @nop-chaos/flux-renderers-industrial test` 全绿（117 test files / 1449 tests passed）。
  - **Anti-Hollow**：所有新代码均在 runtime path 实调（dedupAncestorDescendant / refitViewportOnResize / scadaEditorErrorI18nKey / industrialEditorRendererDefinitions export），无空函数体 / return null 占位 / 吞异常。
  - **Deferred honesty**：无 deferred 项；Non-Blocking Follow-ups 仅 roadmap 清零声明（genuinely non-blocking）。
  - **daily log**：`docs/logs/2026/08-09.md` 已记录 executor pass（plan 2026-08-09-1300-1 段，:3-13）。

Follow-up:

- 本 plan 无剩余 plan-owned work（8 findings 全部落地）。closure-audit gate 是唯一未勾项，由 fresh session 子 agent 执行后回填。
- 1931 re-audit 全部 P2 收口 → industrial-hmi-component-audit mission Follow-up Backlog 清零（1712 + 1931 两轮全部 done，见 roadmap `## Follow-up Backlog` 进度行）。
