# 02 Industrial HMI Editor P2 Test Fidelity & Docs-Drift Remediation

> Plan Status: active
> Last Reviewed: 2026-08-08
> Source: `docs/components/roadmap-industrial-hmi-editor.md` Follow-up Backlog「2026-08-07-1835 post-remediation audit P2」(lines 320-386) — test-quality / docs-drift / cleanup subset of the 40 P2 findings（来源两份已 closed 审计）。本计划不是 roadmap E-series work item（E0–E10 全 done），而是 deferred P2 backlog 的执行计划。
> Mission: industrial-hmi-editor
> Work Item: post-remediation P2 test-fidelity/docs/cleanup (deferred backlog)
> Related: `2026-08-08-0900-1`（同批次 P2 的 behavior-coupled 部分；本计划在其后执行——test-fidelity 重写在行为修复后更有意义）

## Purpose

收口 post-remediation 40 条 P2 findings 中**不改变 live 行为**的子集——让工业组态编辑器的：

1. 测试真正验证结果（不再止于「被调用」「patch defined」「not.toThrow」）；
2. 设计文档 / quick-reference / flux-guide 与 live 代码一致（文件树、错误码、句柄列表不再漂移）；
3. dead/cosmetic 表面与冗余 React19 手写 memo 清理干净。

本计划**不修 live 行为**（除清理 dead 代码）。行为修复归前置 plan `2026-08-08-0900-1`。

## Current Baseline

- E0–E10 全 `done`；post-remediation P1 两批已收口；workspace full-green（industrial 95 files / 1254 tests）。
- 40 条 P2 findings 全部未处理；本计划承接其中 test-quality / docs / cleanup 共约 21 条。
- **本次起草已 live 核对的确认漂移**：
  - **#33/#34/#35** design-renderer.md §11 + design-architecture.md §11 文件树漂移（**经 live 复核，比 backlog 描述更细**）：`renderer/hooks/` 目录**真实存在**，含 `use-editor-engine.ts` + `use-editor-handles.ts`（2 个真实）；phantom 仅 `use-editor-session.ts` / `use-editor-events.ts`（2 个，其职责已折叠进 use-editor-engine.ts）。此外两处 §11 树还**遗漏/错位**：`scada-editor-canvas.tsx`（live 在 `editor/` 顶层，文档画在 `renderer/` 下）、`renderer/editor-engine.ts` + `renderer/editor-errors.ts`（live 存在但树缺）、`editor-working-helpers.ts`（#35，存在但缺登）、`runtime-factories.ts`/`connection-wiring.ts`/`test-handle-factory.ts`/`toolbox-runtime.ts`（顶层，树缺）。权威 live 树见 Phase 2。✅ live 确认漂移
  - **#36** `docs/references/quick-reference.md:827` 经 plan {2} owner-doc 同步后已列 editor 失败码 7 项，但 drift 是**双向**的：`not-visible`/`destroyed` 不在 `editor-errors.ts` registry，而 `duplicate-id`/`invalid-patch`/`empty-selection`/`no-undo`/`no-redo` 等 registry 码缺失于文档。须复核。✅ live
- **test-quality 现状**（backlog #22–#28，**经 live 复核**）：#22（editor.move 几何）+ #23（group/ungroup mutation）**已由已 closed 的 plan `2026-08-07-1835-2` Phase 5 / P1-12 重写**为断言真实几何（`toBe(321)`/`toBe(198)`）与真实 mutation（group 节点 + children 长度）——**不重复重写**，仅 Proof 复核确认仍强。**仍弱**：#24（toolbox status-message i18n 未验证文本）、#25（toolbox runtime-call 止于被调用）、#26（inspector onChange 止于 patch defined）、#27（e2e coalesce 依赖真实 Date.now）、#28（connection linkage 坐标未复核）。
- **cleanup 现状**：#20 canvas/inspector/palette 共 12 处冗余手写 `useMemo`/`useCallback`（React Compiler 处理；`use-editor-engine.ts` 的 2 个 load-bearing 保留）；#39 ESLint `max-lines`(710) 已配但不对 `use-editor-engine.ts` 触发（`check:oversized-code-files` 已兜底）。

## Goals

- 所有 in-scope weak-assertion 测试重写为验证真实可观测结果（几何值 / 真实 mutation / 文本内容 / 坐标）。
- design-renderer §11 文件树、quick-reference 失败码与句柄列表、flux-guide toolbox 子句柄列表与 live 代码一致。
- dead/cosmetic 表面（#3 死字段 tooltip、#14 未样式化 marker、#38 跨包 trivial 导入、#32 test-handle 超契约方法）收敛或显式文档化。
- 冗余 React19 手写 memo 清理（保留 load-bearing）。

## Non-Goals

- 不改任何 live 运行行为（除删除 dead 代码 / 清理冗余 memo）。行为缺陷修复 → Plan `2026-08-08-0900-1`。
- 不重写测试框架、不引入新测试工具。
- 不动 roadmap E-series work item（全 done）。
- 不做性能优化、不做样式美化（#14 仅决定 marker 是补样式还是移除）。

## Scope

### In Scope

- Test-fidelity 重写：#22（editor.move 几何——**Proof 复核**，已由 P1-12 重写）、#23（group/ungroup mutation——**Proof 复核**，已由 P1-12 重写）、#24（toolbox status-message i18n 未验证）、#25（toolbox runtime-call 止于被调用）、#26（inspector onChange 止于 patch defined）、#27（e2e coalesce 依赖真实 Date.now timing-fragile）、#28（connection pointer-drag linkage 坐标未复核）。
- Docs 漂移：#33/#34/#35（design §11 文件树——含 phantom 删除 + 错位/缺登文件补齐）、#36（quick-reference 失败码双向 drift 复核补全）、#37（flux-guide toolbox 子句柄列表部分子集 12/18）、#31（editor-mount-failed 错误码注册但 design §8.5.2 未文档化）、#32（ScadaEditorTestHandle 暴露超出 §8.4 契约方法）。
- Cleanup / 工具：#3（SnapHighlightMark.tooltip 死字段 + 非 i18n 硬编码中文）、#14（toolbox 子标记 -btn/-sep/-status/-import-textarea 发射但未样式化）、#20（冗余 useMemo/useCallback）、#38（跨包导入 trivial errorMessage）、#39（ESLint max-lines 配置复核）、[E0-spike]（research-render-engines.md §5:122 补 InnerEditorEvent）。

### Out Of Scope

- 所有行为缺陷修复（#2/#4/#6/#7/#8/#16/#17/#18/#19/#9/#10/#11/#12/#13/#15/#21/#30/#1/#5/#40）→ Plan `2026-08-08-0900-1`。
- **#29**（`not-mounted` 返回 registry code）→ Plan `2026-08-08-0900-1`（属行为/契约变更，已移入前置计划 Phase 5）。
- roadmap E-series、M3 后能力。

## Failure Paths

> 不适用（纯测试 / 文档 / cleanup 计划，无运行时错误处理 / API 契约 / 鉴权 / 外部集成变更）。唯一可测失败 = 测试或 lint 回归，由 Closure Gates 覆盖。

## Test Strategy

档位选择：**建议有测**。

理由：本计划核心交付之一就是测试本身（#22–#28 重写）。重写后的测试须在仓库内可运行且断言真实结果；docs/cleanup 项以文档一致性抽查 + lint 兜底，不需额外新测试。非「必须自动化」因为不涉及运行时契约变更。

## Execution Plan

### Phase 1 - Test Fidelity 重写

Status: planned
Targets: `scada-editor-canvas-ops.test.tsx`、`scada-editor-canvas-undo-redo.test.tsx`、`scada-editor-canvas-connection.test.tsx`、`toolbox/toolbox-panel.test.tsx`、`inspector-panel.test.tsx`

- Item Types: `Fix | Proof`

> 依赖说明：#22/#23 已由**已 closed 的** plan `2026-08-07-1835-2` Phase 5 / P1-12 重写为强断言（非本批次 Plan 1）——此处仅 Proof 复核确认仍强，不重复重写。#24–#28 经 live 复核仍弱。若 Plan `2026-08-08-0900-1` 落地后改变了被测行为（如 #15 connection 几何、#4 mutation），#28 重写应验证修复后行为；否则验证当前 live 行为（不弱化）。

- [ ] **Proof-only** #22（不重写）：复核 `scada-editor-canvas-ops.test.tsx:272-291` 仍断言真实几何（`toBe(321)`/`toBe(198)`）；通过则记 residual
- [ ] **Proof-only** #23（不重写）：复核 `:316-329` 仍断言真实 mutation（group 节点 + children 长度）；通过则记 residual
- [ ] **Proof** #24：toolbox status-message 测试（toolbox-panel.test.tsx:219-265）验证 i18n 文本内容（经 `t()` 键解析后的实际串）
- [ ] **Proof** #25：toolbox runtime-call 断言（:108-158）从「被调用」推进到「调用参数 / 副作用可观测」（如 viewport 变化）
- [ ] **Proof** #26：inspector onChange 测试（inspector-panel.test.tsx:122-137）从「patch defined」推进到「patch 字段值正确 + workingConfig 反映」
- [ ] **Fix** #27：e2e coalesce 测试（scada-editor-canvas-undo-redo.test.tsx:239-263）注入可控时钟（vi.useFakeTimers / 固定 timestamp）替代真实 `Date.now()`，消除 timing-fragile
- [ ] **Proof** #28：connection pointer-drag e2e（scada-editor-canvas-connection.test.tsx:341-369）复核 linkage 坐标（connection.x/y 重算后值）

Exit Criteria:

- [ ] #22/#23 Proof 复核确认仍强（记 residual）；#24/#25/#26/#28 重写后断言为可观测结果（文本 / 副作用 / 字段值 / 坐标），不再是 weak assertion
- [ ] #27 不再依赖真实 wall-clock（可控时钟）
- [ ] `pnpm --filter @nop-chaos/flux-renderers-industrial test` 通过（重写测试 green）

### Phase 2 - 设计文档文件树与句柄契约漂移修复

Status: planned
Targets: `docs/components/industrial-hmi-editor/design-renderer.md`、`docs/components/industrial-hmi-editor/design-architecture.md`

- Item Types: `Fix`

> **权威 live 树**（`find .../src/editor -name '*.ts*' -not -name '*.test.*'` 实测，本 Phase 据此校正 §11）：
>
> ```
> editor/
> ├── index.ts
> ├── connection-wiring.ts
> ├── editor-adapter.ts
> ├── editor-session.ts
> ├── editor-test-handle.ts
> ├── editor-working-helpers.ts
> ├── renderer-definitions.ts
> ├── runtime-factories.ts
> ├── runtime-mutators.ts
> ├── scada-editor-canvas.tsx
> ├── schemas.ts
> ├── test-handle-factory.ts
> ├── toolbox-runtime.ts
> ├── connection/{anchor-snap,connection-adapter,connection-drag-controller,connection-link,connection-overlay-renderer,connection-overlay}.ts
> ├── inspector/{field-errors,inspector-field.tsx,inspector-panel.tsx,schema-extractor}.ts
> ├── palette/editor-palette.tsx
> ├── renderer/{editor-engine,editor-errors}.ts
> ├── renderer/hooks/{use-editor-engine,use-editor-handles}.ts
> ├── toolbox/{align-distribute,clipboard,toolbox-panel.tsx,z-order}.ts
> └── undo-redo/{compute-inverse,operation-coalesce,undo-redo-adapter,undo-stack}.ts
> ```

- [ ] **Fix** #33：design-renderer.md §11 + design-architecture.md §11 文件树校正——删除 phantom `use-editor-session.ts` / `use-editor-events.ts`（其职责已折叠进 `renderer/hooks/use-editor-engine.ts`，该文件真实存在，保留）；不把顶层文件误填进 `hooks/`
- [ ] **Fix** #34：design-renderer.md（§11 内两处路径互调）纠正为上方权威树
- [ ] **Fix** #35：两处 §11 文件树补齐缺登的真实文件——`editor-working-helpers.ts`、`runtime-factories.ts`、`connection-wiring.ts`、`test-handle-factory.ts`、`toolbox-runtime.ts`；并校正错位——`scada-editor-canvas.tsx`（live 在 `editor/` 顶层，非 `renderer/` 下）、补 `renderer/editor-engine.ts` + `renderer/editor-errors.ts`
- [ ] **Fix** #32：design §8.4 契约块与 `editor-test-handle.ts` 实际导出对齐（test-handle 暴露超出 §8.4 块的方法——保留并文档化，因测试句柄属内部调试面）

Exit Criteria:

- [ ] §11 文件树（两份 design doc）与上方权威 live 树**逐文件核对一致**（路径层级正确、无 phantom、无缺登）
- [ ] #32 test-handle 契约块与 `editor-test-handle.ts` 实际导出一致
- [ ] docs 内无指向不存在文件的引用（grep 复核）

### Phase 3 - 公共面错误码与文档同步

Status: planned
Targets: `docs/references/quick-reference.md`、`flux-guide/design-patterns/scada-editor.md`、`docs/components/industrial-hmi-editor/design-renderer.md`（§8.5.2）

- Item Types: `Fix`

> 注：#29（`not-mounted` 返回 registry code）属行为/契约变更，已移入 Plan `2026-08-08-0900-1` Phase 5。本 Phase 仅做错误码**文档同步**。

- [ ] **Fix** #36：复核 `quick-reference.md:827` editor 失败码与 `renderer/editor-errors.ts` registry **双向对齐**——文档多余的（`not-visible`/`destroyed` 不在 registry）标注或移除；文档缺的（`duplicate-id`/`invalid-patch`/`empty-selection`/`no-undo`/`no-redo` 等 registry 码）补齐
- [ ] **Fix** #37：`flux-guide/design-patterns/scada-editor.md:82` toolbox 子句柄列表从部分子集（12）补齐到 **18**（对齐 `editor-test-handle.ts` toolbox 子句柄实际方法：fit/center/zoomAt/resetView/getViewport/align/distribute/toTop/toBottom/moveUp/moveDown/copy/cut/paste/getClipboard/exportConfig/importConfig/listSymbolLibrary）
- [ ] **Fix** #31：design-renderer.md §8.5.2 补 `editor-mount-failed` 错误码文档化（码已注册发射但未文档化）
- [ ] **Fix** [E0-spike]：`docs/analysis/.../research-render-engines.md` §5:122 列名补 InnerEditorEvent（无害漂移收口）

Exit Criteria:

- [ ] quick-reference editor 失败码与 `editor-errors.ts` registry 双向一致（逐码核对：无多余、无缺漏）
- [ ] flux-guide toolbox 子句柄列表 = test-handle toolbox 子句柄 18 方法全集
- [ ] design §8.5.2 含 `editor-mount-failed`；§5:122 含 InnerEditorEvent

### Phase 4 - Dead/Cosmetic 表面与冗余 Memo 清理

Status: planned
Targets: `connection/connection-overlay.ts`、`connection/connection-overlay-renderer.ts`、`toolbox/toolbox-panel.tsx`、canvas/inspector/palette 多文件、`eslint.config.js`

- Item Types: `Fix | Decision`

- [ ] **Decision** #3：`SnapHighlightMark.tooltip`（connection-overlay.ts:61）死字段 + 非 i18n 硬编码中文——移除死字段（若 overlay-renderer.ts:35-49 未消费）或改 i18n
- [ ] **Fix** #3：按 Decision 落地（移除或 i18n 化）
- [ ] **Decision** #14：toolbox 子标记 `-btn`/`-sep`/`-status`/`-import-textarea`（四 className 无 CSS 规则、不在 §10 marker 契约）——补 §10 契约 + 样式，或移除未消费 className
- [ ] **Fix** #14：按 Decision 落地
- [ ] **Fix** #20：移除 canvas(7) + inspector(4) + palette(1) 冗余手写 `useMemo`/`useCallback`（React Compiler 处理）；**保留** `use-editor-engine.ts:160-181` 的 2 个 load-bearing useCallback
- [ ] **Decision** #38：编辑器从 runtime `renderer/scada-errors.ts` 导入 trivial `errorMessage`——就近内联到 editor 包（若 Plan 1 #16 未已处理）
- [ ] **Fix** #38：按 Decision 落地
- [ ] **Decision** #39：复核 ESLint `max-lines`(710) 为何不对 `use-editor-engine.ts`(824) 触发（eslint.config.js:153）——修配置使其触发，或确认 `check:oversized-code-files` 兜底足够（接受现状）
- [ ] **Fix** #39：按 Decision 落地（若接受现状则记 residual + 理由）

Exit Criteria:

- [ ] #3 死字段已移除或 i18n 化（grep 无硬编码中文 tooltip）
- [ ] #14 四 className 要么有 §10 契约 + CSS、要么已移除
- [ ] #20 冗余 memo 移除后 `pnpm test` 仍 green（React Compiler 等价性）
- [ ] #38/#39 各有 Decision 结论（landed 或 residual + 理由）

## Draft Review Record

> 独立子 agent（fresh session）审查，对照 `00-plan-authoring-and-execution-guide.md` Plan Review Rule。达成共识（零 Blocker/Major）后升 `active`。

- Reviewer / Agent:
  - Round 1（revised）: `ses_022cd00aaffeh9b4ysps72RPNl`
  - Round 2（pass）: `ses_022c5d076ffekNQdzLOAHZ2gnu`
- Verdict: `pass`（零 Blocker / 零 Major / 1 非阻断 Nit）
- Rounds: 2
- Findings addressed:
  - **B1** #22/#23 已由已 closed 的 `2026-08-07-1835-2` Phase 5 / P1-12 重写为强断言（真实几何 `toBe(321)`/`toBe(198)` + 真实 mutation）→ 改为 Proof-only 复核 residual，依赖说明纠正指向 closed 前置计划（非 Plan 1）
  - **M1** #29 属行为/契约变更（`use-editor-handles.ts:91` 返自由格式 Error）误标 docs → 整体移出 Plan 2，路由至 Plan `2026-08-08-0900-1` Phase 5
  - **M2** #33/#34/#35 漂移描述误导（`renderer/hooks/` 实存 2 真文件，仅 2 phantom）→ 重写为精确事实 + 嵌入权威 live 树 + 补齐错位/缺登文件（scada-editor-canvas.tsx / editor-engine.ts / editor-errors.ts / runtime-factories.ts / connection-wiring.ts / test-handle-factory.ts / toolbox-runtime.ts），移除「以实测为准」推诿
  - 非阻断 Nit（#23 行段 316-329 vs live 316-335）已记录

## Closure Gates

- [ ] Test-fidelity：#22/#23 Proof 复核确认仍强（记 residual）；#24/#25/#26/#27/#28 重写为验证可观测结果且 green
- [ ] 所有 in-scope docs 漂移项（#31/#32/#33/#34/#35/#36（双向对齐 18 toolbox 码）/（#37 补齐到 18）+ [E0-spike]）与 live 代码一致
- [ ] cleanup 项（#3/#14/#20/#38/#39）各有 Decision 结论（landed 或 adjudicated residual + 理由）
- [ ] 无 in-scope 项被静默降级到 follow-up
- [ ] 受影响 owner docs 同步（本计划本身即 owner-doc 同步计划）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（执行 session 不得自审勾选本项）
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

> #39 若 Decision 裁定接受 `check:oversized-code-files` 兜底、#14 若 Decision 裁定保留现状，填入此处（Classification + Why Not Blocking Closure）。

_待执行填充_

## Non-Blocking Follow-ups

- 本计划收口后，roadmap Follow-up Backlog「2026-08-07-1835 post-remediation audit P2」40 条应全部落定（Plan 1 behavior 子集 + Plan 2 test/docs/cleanup 子集）；剩余仅 [E1.1-sg] rAF fps 测量口径 watch-only residual（非阻断，E6/E9.2 已复核达标）。

## Closure

Status Note: _待收口填写_

Closure Audit Evidence:

- Auditor / Agent: _待填_
- Evidence: _待填_

Follow-up:

- _待收口填写（或明确 no remaining plan-owned work）_
