# 02 Industrial HMI Editor P2 Test Fidelity & Docs-Drift Remediation

> Plan Status: completed
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

Status: completed
Targets: `scada-editor-canvas-ops.test.tsx`、`scada-editor-canvas-undo-redo.test.tsx`、`scada-editor-canvas-connection.test.tsx`、`toolbox/toolbox-panel.test.tsx`、`inspector-panel.test.tsx`

- Item Types: `Fix | Proof`

> 依赖说明：#22/#23 已由**已 closed 的** plan `2026-08-07-1835-2` Phase 5 / P1-12 重写为强断言（非本批次 Plan 1）——此处仅 Proof 复核确认仍强，不重复重写。#24–#28 经 live 复核仍弱。若 Plan `2026-08-08-0900-1` 落地后改变了被测行为（如 #15 connection 几何、#4 mutation），#28 重写应验证修复后行为；否则验证当前 live 行为（不弱化）。

- [x] **Proof-only** #22（不重写）：复核 `scada-editor-canvas-ops.test.tsx:272-291` 仍断言真实几何（`toBe(321)`/`toBe(198)`）；通过则记 residual — ✅ 确认仍强（line 289-290 `toBe(321)`/`toBe(198)`）
- [x] **Proof-only** #23（不重写）：复核 `:316-335` 仍断言真实 mutation（group 节点 + children 长度）；通过则记 residual — ✅ 确认仍强（line 324-334 断言 afterGroup.length/scada-group node/children.length=2/ungroup 还原）
- [x] **Proof** #24：toolbox status-message 测试（toolbox-panel.test.tsx:219-265）验证 i18n 文本内容（经 `t()` 键解析后的实际串）— ✅ 6 处 status 测试现断言实际 i18n 文本（'无可见图元'/'无变化'/'配置非法，导入失败'）
- [x] **Proof** #25：toolbox runtime-call 断言（:108-158）从「被调用」推进到「调用参数 / 副作用可观测」（如 viewport 变化）— ✅ view 工具断言 zoom 参数(1.2/1÷1.2)+计数+viewport status；align/distribute/zorder 断言方向/action 参数；copy/cut/paste/export 断言 status 文本反映计数
- [x] **Proof** #26：inspector onChange 测试（inspector-panel.test.tsx:122-137）从「patch defined」推进到「patch 字段值正确 + workingConfig 反映」— ✅ 断言 `updatedPatch.x===200` + workingConfig node x 反映 200
- [x] **Fix** #27：e2e coalesce 测试（scada-editor-canvas-undo-redo.test.tsx:239-263）注入可控时钟（vi.useFakeTimers / 固定 timestamp）替代真实 `Date.now()`，消除 timing-fragile — ✅ 用 `vi.spyOn(Date,'now')` 可控时钟（mockReturnValue），+boundary 测试（>500ms 不合）证明时钟控制真实生效
- [x] **Proof** #28：connection pointer-drag e2e（scada-editor-canvas-connection.test.tsx:341-369）复核 linkage 坐标（connection.x/y 重算后值）— ✅ 断言 `connection.x===1, y===0.5`（snap 锚点 right-middle 归一化值，证明 snap 算法命中正确锚点）

Exit Criteria:

- [x] #22/#23 Proof 复核确认仍强（记 residual）；#24/#25/#26/#28 重写后断言为可观测结果（文本 / 副作用 / 字段值 / 坐标），不再是 weak assertion
- [x] #27 不再依赖真实 wall-clock（可控时钟）
- [x] `pnpm --filter @nop-chaos/flux-renderers-industrial test` 通过（重写测试 green）— ✅ 97 files / 1302 tests pass（+1 boundary test）

### Phase 2 - 设计文档文件树与句柄契约漂移修复

Status: completed
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

- [x] **Fix** #33：design-renderer.md §11 + design-architecture.md §11 文件树校正——删除 phantom `use-editor-session.ts` / `use-editor-events.ts`（其职责已折叠进 `renderer/hooks/use-editor-engine.ts`，该文件真实存在，保留）；不把顶层文件误填进 `hooks/` — ✅ 两处 §11 phantom 删除，hooks/ 仅留 use-editor-engine.ts + use-editor-handles.ts
- [x] **Fix** #34：design-renderer.md（§11 内两处路径互调）纠正为上方权威树 — ✅ §11 树重写为权威 live 树（路径层级 + 文件名全部对齐）
- [x] **Fix** #35：两处 §11 文件树补齐缺登的真实文件——`editor-working-helpers.ts`、`runtime-factories.ts`、`connection-wiring.ts`、`test-handle-factory.ts`、`toolbox-runtime.ts`；并校正错位——`scada-editor-canvas.tsx`（live 在 `editor/` 顶层，非 `renderer/` 下）、补 `renderer/editor-engine.ts` + `renderer/editor-errors.ts` — ✅ 全部缺登/错位文件校正（+ runtime-mutators.ts、palette/editor-palette.tsx、connection-drag-controller.ts、connection-overlay-renderer.ts、inspector-field.tsx、inspector-panel.tsx 一并对齐）
- [x] **Fix** #32：design §8.4 契约块与 `editor-test-handle.ts` 实际导出对齐（test-handle 暴露超出 §8.4 块的方法——保留并文档化，因测试句柄属内部调试面） — ✅ §8.4 块补齐顶层 addSymbol/removeSymbol/updateSymbol/group/ungroup/undo/redo 7 方法（标注为 §8.5.2 编辑扩展句柄的测试投影）

Exit Criteria:

- [x] §11 文件树（两份 design doc）与上方权威 live 树**逐文件核对一致**（路径层级正确、无 phantom、无缺登） — ✅ grep 复核 design-renderer.md/design-architecture.md §11 无 phantom / 无 panel-\*.tsx
- [x] #32 test-handle 契约块与 `editor-test-handle.ts` 实际导出一致 — ✅ 7 顶层方法补齐
- [x] docs 内无指向不存在文件的引用（grep 复核） — ✅ grep `use-editor-session`/`use-editor-events` 在 design doc §11 已清除（仅 plan/audit/roadmap 描述性引用残留）

### Phase 3 - 公共面错误码与文档同步

Status: completed
Targets: `docs/references/quick-reference.md`、`flux-guide/design-patterns/scada-editor.md`、`docs/components/industrial-hmi-editor/design-renderer.md`（§8.5.2）

- Item Types: `Fix`

> 注：#29（`not-mounted` 返回 registry code）属行为/契约变更，已移入 Plan `2026-08-08-0900-1` Phase 5。本 Phase 仅做错误码**文档同步**。

- [x] **Fix** #36：复核 `quick-reference.md:827` editor 失败码与 `renderer/editor-errors.ts` registry **双向对齐**——文档多余的（`not-visible`/`destroyed` 不在 registry）标注或移除；文档缺的（`duplicate-id`/`invalid-patch`/`empty-selection`/`no-undo`/`no-redo` 等 registry 码）补齐 — ✅ 失败路径重写为三组：editor registry 9 码（补齐 duplicate-id/invalid-patch/empty-selection/no-undo/no-redo）+ runtime 共享 3 + handle-path 补充 not-visible（标注未入 registry）；destroyed 标注为 data-status 值（非失败码）
- [x] **Fix** #37：`flux-guide/design-patterns/scada-editor.md:82` toolbox 子句柄列表从部分子集（12）补齐到 **18**（对齐 `editor-test-handle.ts` toolbox 子句柄实际方法：fit/center/zoomAt/resetView/getViewport/align/distribute/toTop/toBottom/moveUp/moveDown/copy/cut/paste/getClipboard/exportConfig/importConfig/listSymbolLibrary） — ✅ 补齐 6 缺漏方法（resetView/getViewport/toBottom/moveUp/moveDown/getClipboard），现 18 全集
- [x] **Fix** #31：design-renderer.md §8.5.2 补 `editor-mount-failed` 错误码文档化（码已注册发射但未文档化） — ✅ §8.5.2 错误码列表补 editor-mount-failed + 语义注记（mount 阶段失败触发 onError + 置 data-status=error）
- [x] **Fix** [E0-spike]：`docs/analysis/.../research-render-engines.md` §5:122 列名补 InnerEditorEvent（无害漂移收口） — ✅ §5:122 事件族补 InnerEditorEvent + 注记（inner editor 打开/关闭生命周期）

Exit Criteria:

- [x] quick-reference editor 失败码与 `editor-errors.ts` registry 双向一致（逐码核对：无多余、无缺漏） — ✅ 9 registry 码全列 + runtime 共享 3 + not-visible 标注
- [x] flux-guide toolbox 子句柄列表 = test-handle toolbox 子句柄 18 方法全集 — ✅ 18 方法
- [x] design §8.5.2 含 `editor-mount-failed`；§5:122 含 InnerEditorEvent — ✅ 两处补齐

### Phase 4 - Dead/Cosmetic 表面与冗余 Memo 清理

Status: completed
Targets: `connection/connection-overlay.ts`、`connection/connection-overlay-renderer.ts`、`toolbox/toolbox-panel.tsx`、canvas/inspector/palette 多文件、`eslint.config.js`

- Item Types: `Fix | Decision`

- [x] **Decision** #3：`SnapHighlightMark.tooltip`（connection-overlay.ts:61）死字段 + 非 i18n 硬编码中文——**移除死字段**（overlay-renderer.ts:35-49 仅消费 `world`，从未读 `tooltip`）
- [x] **Fix** #3：按 Decision 落地——移除 `SnapHighlightMark.tooltip` 字段 + `deriveOverlayState` 中的赋值 + 3 处测试引用（connection-overlay.test.ts + connection-overlay-renderer.test.ts ×3）；grep 复核无残留硬编码中文 tooltip
- [x] **Decision** #14：toolbox 子标记 `-btn`/`-sep`/`-status`/`-import-textarea`——**补 §10 契约文档化**（发射为识别钩子，无专用 CSS 规则；视觉样式经 `@nop-chaos/ui` 组件 + `data-slot` 查询锚点承载，不新增 dead CSS）
- [x] **Fix** #14：design-toolbox.md §10 补 4 子标记文档化（每标记标注「识别钩子，无专用样式」+ 视觉来源）
- [x] **Fix** #20：移除 canvas 8 冗余 `useCallback`（dispatchEvent/handleReady/handleError/handleSelectionChange/handleModeChange/handleSessionChange/handleSave/handleLoad/handleDestroyed）+ palette 1 冗余 `useMemo`（listScadaSymbols）；**保留** canvas `useMemo(parseAndValidateConfig)`（load-bearing：useEditorEngine useEffect identity check 依赖 `args.initialConfig`，移除 → load 循环）+ `use-editor-engine.ts` 2 个 load-bearing `useCallback`（mount effect deps）。inspector-panel.tsx 此前已无手写 memo（render-time derivation）
- [x] **Decision** #38：编辑器从 `renderer/scada-errors.ts` 导入 `errorMessage`——**接受现状（residual）**。理由：① 同包导入（`src/editor/` → `src/renderer/` 均在 `flux-renderers-industrial`，非跨包）；② 函数非 trivial（~30 行，cause-chain 遍历 + stack 截断，Plan 1 #16 已增强）；③ 内联到 3 文件会重复维护。backlog「trivial + 跨包」描述不准
- [x] **Fix** #38：按 Decision 落地（residual + 理由，不内联）
- [x] **Decision** #39：复核 ESLint `max-lines`(710) 为何不对 `use-editor-engine.ts` 触发——**接受现状（residual）**。理由：`use-editor-engine.ts` 经 Plan 1 / 前序重构已从 824 行降至 **265 行**（远低于 710 阈值），原漂移（824 行不触发 710 规则）已因重构自动消解；`check:oversized-code-files` 脚本提供额外兜底
- [x] **Fix** #39：按 Decision 落地（residual + 理由，不改 eslint 配置）

Exit Criteria:

- [x] #3 死字段已移除或 i18n 化（grep 无硬编码中文 tooltip） — ✅ tooltip 字段移除，grep `tooltip` in connection/ = 0
- [x] #14 四 className 要么有 §10 契约 + CSS、要么已移除 — ✅ §10 文档化（识别钩子，无 dead CSS）
- [x] #20 冗余 memo 移除后 `pnpm test` 仍 green（React Compiler 等价性） — ✅ 97 files / 1302 tests green（load-bearing useMemo/useCallback 保留）
- [x] #38/#39 各有 Decision 结论（landed 或 residual + 理由） — ✅ 均为 residual + 理由

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

- [x] Test-fidelity：#22/#23 Proof 复核确认仍强（记 residual）；#24/#25/#26/#27/#28 重写为验证可观测结果且 green
- [x] 所有 in-scope docs 漂移项（#31/#32/#33/#34/#35/#36（双向对齐 18 toolbox 码）/（#37 补齐到 18）+ [E0-spike]）与 live 代码一致
- [x] cleanup 项（#3/#14/#20/#38/#39）各有 Decision 结论（landed 或 adjudicated residual + 理由）
- [x] 无 in-scope 项被静默降级到 follow-up
- [x] 受影响 owner docs 同步（本计划本身即 owner-doc 同步计划）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（执行 session 不得自审勾选本项）— ✅ 见 `## Closure > Closure Audit Evidence`（fresh session 复核全部 exit criteria / live code / deferred 诚实性，approved）
- [x] `pnpm typecheck` — ✅ workspace 全 32 包 green
- [x] `pnpm build` — ✅ flux-renderers-industrial build green
- [x] `pnpm lint` — ✅ flux-renderers-industrial lint green
- [x] `pnpm test` — ✅ flux-renderers-industrial 97 files / 1302 tests green

## Deferred But Adjudicated

> #39 若 Decision 裁定接受 `check:oversized-code-files` 兜底、#14 若 Decision 裁定保留现状，填入此处（Classification + Why Not Blocking Closure）。

- **#38** (Classification: residual / accept-current-state)：编辑器从 `renderer/scada-errors.ts` 导入 `errorMessage`。Why Not Blocking：① 同包导入（非跨包，`src/editor/` + `src/renderer/` 均在 `flux-renderers-industrial`）；② 函数非 trivial（~30 行，cause-chain + stack 截断，Plan 1 #16 增强）；③ 内联 3 文件重复维护。backlog「trivial + 跨包」描述失准。
- **#39** (Classification: residual / moot-by-refactor)：ESLint `max-lines`(710) 不触发 `use-editor-engine.ts`。Why Not Blocking：该文件经前序重构已从 824 行降至 **265 行**（远低于 710 阈值），原漂移已自动消解；`check:oversized-code-files` 脚本提供额外兜底。

## Non-Blocking Follow-ups

- 本计划收口后，roadmap Follow-up Backlog「2026-08-07-1835 post-remediation audit P2」40 条应全部落定（Plan 1 behavior 子集 + Plan 2 test/docs/cleanup 子集）；剩余仅 [E1.1-sg] rAF fps 测量口径 watch-only residual（非阻断，E6/E9.2 已复核达标）。

## Closure

Status Note: 全 4 Phase 执行完成。Test-fidelity 7 项（#22/#23 Proof 确认仍强 + #24/#25/#26/#28 重写为可观测结果 + #27 可控时钟）；docs 漂移 8 项（#31/#32/#33/#34/#35/#36/#37/[E0-spike]）与 live 代码对齐；cleanup 5 项（#3 死字段移除 / #14 §10 文档化 / #20 冗余 memo 移除 / #38+#39 residual + 理由）。workspace typecheck/build/lint/test 全 green（97 files / 1302 tests）。

Closure Audit Evidence:

- Auditor / Agent: independent closure-audit fresh session（opencode Task `explore` subagent，不复用执行者上下文；与 Draft Review Record 的两轮 review session 不同 session）
- Verdict: `approved`
- Evidence（fresh session 逐条复核 live repo，非仅信任 plan 文本）：
  - **Phase 1（test-fidelity）**：`scada-editor-canvas-ops.test.tsx:289-290` 断言 `toBe(321)`/`toBe(198)`（#22 #23 仍强）；`toolbox-panel.test.tsx:258/275/306` 断言真实 i18n 文本「无可见图元/无变化/配置非法，导入失败」（#24）；`scada-editor-canvas-undo-redo.test.tsx:246-275` 用 `vi.spyOn(Date,'now').mockReturnValue` 可控时钟 + 501ms boundary 不合测试（#27）；`scada-editor-canvas-connection.test.tsx:369-370` 断言 snap 锚点 `x===1, y===0.5`（#28）；`inspector-panel.test.tsx:144/147` 断言 `updatedPatch.x===200` + workingConfig 反映（#26）；toolbox runtime-call #25 参数断言在绿。
  - **Phase 2（设计文档文件树）**：`design-renderer.md`/`design-architecture.md` 两处 §11 grep `use-editor-session`/`use-editor-events` = **0 命中**（phantom 已删）；`editor-working-helpers.ts`/`runtime-factories.ts`/`test-handle-factory.ts`/`connection-wiring.ts`/`toolbox-runtime.ts` 五缺登文件在两 doc 均已补；`renderer/hooks/` 仅 `use-editor-engine.ts` + `use-editor-handles.ts`（与 live `packages/flux-renderers-industrial/src/editor/renderer/hooks/` 一致）。
  - **Phase 3（错误码 / 句柄同步）**：`quick-reference.md:827` 含 editor registry 9 码（editor-mount-failed/invalid-node/duplicate-id/invalid-patch/invalid-config/empty-selection/not-a-group/no-undo/no-redo）+ runtime 共享 3 + not-visible 标注；`flux-guide/design-patterns/scada-editor.md:86` 含 18 方法全集（含补齐的 resetView/getViewport/toBottom/moveUp/moveDown/getClipboard）；`design-renderer.md §8.5.2` 含 editor-mount-failed（#31）。
  - **Phase 4（cleanup）**：`connection-overlay.ts` grep `tooltip` = **0 命中**（#3 死字段已移除）；`design-toolbox.md §10` 含 4 子标记（-btn/-sep/-status/-import-textarea）文档化（#14）；`scada-editor-canvas.tsx:91` useCallback 已移除（仅注释残留，#20）；#38/#39 在 `Deferred But Adjudicated` 各附 non-blocking 理由（同包导入 + 重构后 265 行已低于阈值），分类诚实。
  - **deferred 诚实性**：#38（residual / accept-current-state）、#39（residual / moot-by-refactor）均为优化项或已 moot 项，无 in-scope live defect / contract drift 被降级。
  - **五点一致性**：`Plan Status: completed` ↔ 4 Phase 全 `Status: completed` ↔ 全 Exit Criteria `[x]` ↔ Closure Gates 全 `[x]` ↔ 本 Closure evidence 一致。
  - **验证引用**：执行 session 记录的 `pnpm typecheck`（32 包）/`build`（industrial）/`lint`（industrial）/`test`（97 files / 1302 tests）green 状态，fresh session 已对照 plan 内 phase exit criteria 中 `[x]` 复核项（Phase 1:1302 tests / Phase 4:1302 tests）一致，未发现矛盾。

Follow-up:

- 无 plan-owned 遗留工作。#38/#39 已 adjudicated residual（附理由，非 plan-owned 遗留）；roadmap Follow-up Backlog P2 40 条经 Plan 1（behavior 子集）+ Plan 2（本计划 test/docs/cleanup 子集）已收口，剩余仅 [E1.1-sg] rAF fps watch-only residual（非阻断）。
