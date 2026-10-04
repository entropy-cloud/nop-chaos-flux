# 546 SCADA editor 会话内核迁移 editor-core（P1.1）

> Plan Status: completed
> Last Reviewed: 2026-10-04
> Source: `docs/backlog/editor-designer-standardization-roadmap.md` §6 P1.1、§7 粒度注记；`docs/architecture/editor-core.md` §6 迁移矩阵；`docs/architecture/editor-designer-standard.md` §2.1
> Related: plan 545（P1.0 合并钩子，硬前置，已 done）；plan 544（裁决①flow 豁免 / ③事件词汇）

## Purpose

把 flux-renderers-industrial SCADA editor 的 undo/redo 栈存储单源到 `@nop-chaos/editor-core`（消灭 roadmap §3 登记的"三套 undo/redo 并存"中的 industrial 独立实现），并建立 SCADA 域 `EditorDomainAdapter`（diff/applyDiff 契约 + 20 句柄 domainCommands 声明 + 注册表登记）。行为不变：industrial 全量测试（134 文件 / ~1719 用例）回归面全绿。

## Current Baseline

- industrial 自研栈：`packages/flux-renderers-industrial/src/editor/undo-redo/undo-stack.ts`（205 行，`UndoStack` 一体双栈 + `replaceUndoTop` + `listUndoEntries` 历史投影 + `dropUndoTop`），与 editor-core `UndoCommandStack` 语义同构但互不相认。
- 域协调层 `undo-redo-adapter.ts`（241 行）：事务三态（beginTransaction 快照 / commitTransaction 一次性 diff 入栈 / abortTransaction）、`pushOperation`（M2 属性合并 + M3 group 合并经 `tryCoalesce`）、`pushForward`（z-order 结构 diff 直构，**inverse 必经 `computeInverse`——`diffScadaConfig` 不产出 `reordered`**，这是域 diff 语义不可下沉内核的硬约束）、两段式 undo/redo（peek + commit）、`rollbackOnApplyFailure`。
- 消费面：`runtime-factories.ts:179`（`new UndoRedoAdapter(session.undoStack)`）、`history-panel.tsx:24-25`（`listUndoEntries`/`listRedoEntries`）、`editor-status-bar.tsx:25-26`（depths）、`use-editor-handles.ts:189-194`（canUndo/canRedo）。
- session 变异面：`session.workingConfig =` 直接赋值仅 10 处 / 4 文件；`committedBaseline =` 仅 2 处；engine 同步顺序（mutator 改 working → pushOperation → syncWorkingCopy → engine.applyDiff）与错误恢复路径（engine.build 全量重建）被直接触及的 26 个测试文件锁定（另 22 个触及 applyDiff）。
- 句柄面：`use-editor-handles.ts` `RUNTIME_HANDLE_METHODS`（9）∪ `EDITOR_HANDLE_METHODS`（11）= 20 句柄。
- plan 545 已闭合内核合并缺口（`replaceUndoTop`/`recordCoalesced`/`replaceTop`/`coalesceGroup`/`DEFAULT_COALESCE_WINDOW_MS`）；`UndoStack.replaceUndoTop` 与内核原语逐行同语义。
- industrial `package.json` 尚无 `@nop-chaos/editor-core` 依赖。

## Goals

- industrial `UndoStack` 改为 editor-core `UndoCommandStack<ScadaConfigDiff>` 的存储 facade（公开 API 与语义逐项不变），栈存储单源。
- 新建 `editor-core-adapter.ts`：`createScadaEditorDomainAdapter()` 实现 `EditorDomainAdapter<ScadaConfig, ScadaConfigDiff>`（diff=diffScadaConfig 空变更返 null 包装、applyDiff=applyDiffToConfig、serialize/validate/load、getDocumentIds、`domainCommands` = 20 句柄名清单），并 `registerEditorDomain` 登记 `kind: 'scada-editor'`。
- editor-core `UndoCommandStack` 增加法只读 API `listUndo()`/`listRedo()`（历史面板投影所需；向后兼容新增，无需预授权——与 plan 545 的 M2 top-read 注记无关，彼处明确不做历史面板投影）。
- `editor-core.md` §6 迁移矩阵 SCADA 行状态刷新。
- 全部 industrial 测试（134 test 文件）+ editor-core 测试全绿（行为不变证明）。

## Non-Goals

- **createEditorCore 全状态接管不落本计划**（working/committed/selection/mode 迁入 `EditorSessionState`、全部 mutation 站点改经 `core.update`）：engine 同步顺序（mutator 改 working → push → syncWorkingCopy → engine.applyDiff）与两段式失败恢复（engine.build 全量重建）被 ~65 测试文件锁定；且 z-order `reordered` 的 inverse 必经域 `computeInverse`（`diffScadaConfig` 不表达顺序变更），core 的 `diff(next, prev)` 反演语义会改变 z-order undo 行为。裁定：栈存储单源 + 域 adapter 契约/注册先落（本计划）；全状态接管改判为显式 successor ownership（见 Deferred），待 roadmap §10 修订流程追认后重议。
- 不改 `UndoRedoAdapter` 事务/合并/两段式语义（域协调层保留——M2 属性合并是 ScadaConfigDiff 专属）。
- 不改 20 句柄的运行时接线（共享 helper 统一归 roadmap P4.3）。
- 不改任何事件/scope/schema 契约（P1.x 行为不变纪律）。

## Scope

### In Scope

- `packages/editor-core/src/`：`undo-command-stack.ts`（listUndo/listRedo）+ 测试。
- `packages/flux-renderers-industrial/`：`package.json`（editor-core workspace 依赖）、`src/editor/undo-redo/undo-stack.ts`（facade 化）、新 `src/editor/editor-core-adapter.ts`、`src/editor/index.ts`（导出 adapter 工厂）。
- `docs/architecture/editor-core.md`（迁移矩阵刷新）。

### Out Of Scope

- `undo-redo-adapter.ts`/`runtime-mutators.ts`/`runtime-factories.ts` 行为逻辑（零改动预期；若 facade 化被迫触及，须逐测试证明行为不变）。
- WorkbenchShell / manifest / 事件词汇（P2.2/P3.1/P3.2 各自的 plan）。

## Failure Paths

| 触发                                  | 行为                                                                               | 可重试 | 用户可见表现         |
| ------------------------------------- | ---------------------------------------------------------------------------------- | ------ | -------------------- |
| facade 化后栈语义漂移（U6/U7/两段式） | 既有 industrial 测试红 → 修复 facade 而非改测试期望（行为不变纪律）                | 是     | 无（迁移 PR 内闭合） |
| `listUndoEntries` 投影字段缺失        | history-panel 渲染回归 → editor-core listUndo 须携带全量 entry（含 coalesceGroup） | 是     | 无                   |
| adapter 注册重入                      | `registerEditorDomain` 覆盖语义（editor-core.md §3 裁定），测试/多实例安全         | 是     | 无                   |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`（跨包内核迁移；failing-first：editor-core 新 API 先红后绿；industrial 全量回归即行为不变证明）。

## Execution Plan

### Phase 1 - editor-core 只读投影 API（Proof + Fix，failing-first）

Status: completed
Targets: `packages/editor-core/src/undo-command-stack.ts`、`editor-core.test.ts`

- Item Types: `Proof`、`Fix`

- [x] （Proof）新增失败用例：`listUndo()`/`listRedo()` 返回栈底→栈顶 readonly 快照数组（含 forward/inverse/operationKind/timestamp/coalesceGroup 全字段）、空栈返空数组、返回数组与内部栈无引用共享（mutating 返回值不影响栈）
- [x] （Fix）实现 `listUndo()`/`listRedo()`（返回 `readonly EditorDiffEntry<TDiff>[]`）
- [x] editor-core 全包测试绿（37/37）+ typecheck 绿

Exit Criteria:

- [x] editor-core 测试全绿（新用例 + 既有零回归，37/37）
- [x] `pnpm --filter @nop-chaos/editor-core typecheck` 通过

### Phase 2 - UndoStack facade 化（Fix）

Status: completed
Targets: `packages/flux-renderers-industrial/package.json`、`src/editor/undo-redo/undo-stack.ts`

- Item Types: `Fix`

- [x] `package.json` 增 `"@nop-chaos/editor-core": "workspace:*"` 依赖
- [x] `UndoStackEntry` 改为 `extends EditorDiffEntry<ScadaConfigDiff>`（operationKind 收窄为 `EditorOperationKind`）；`UndoStack` 存储改内部 `UndoCommandStack<ScadaConfigDiff>` 委托（push/popForUndo/popForRedo/peek/dropUndoTop/replaceUndoTop/clear/canUndo/canRedo/depths 逐项映射，公开签名不变）；`listUndoEntries`/`listRedoEntries` 改经内核 `listUndo()`/`listRedo()` 投影
- [x] 全 industrial 测试绿（1611/1611，存储切换零回归）

Exit Criteria:

- [x] `undo-stack.ts` 不再持有自有 `undoStack: UndoStackEntry[]` 存储数组（存储唯一来源为 editor-core `UndoCommandStack`）
- [x] industrial 全部测试零回归（134→135 test 文件含新增 adapter 测试）

### Phase 3 - 域 adapter + 注册（Fix）

Status: completed
Targets: `src/editor/editor-core-adapter.ts`（新）、`src/editor/index.ts`

- Item Types: `Fix`

- [x] `createScadaEditorDomainAdapter()`：实现 `EditorDomainAdapter<ScadaConfig, ScadaConfigDiff>`（diff 空变更返 null、applyDiff=applyDiffToConfig、serialize=serializeScadaConfig、validate=validateScadaConfig、load、getDocumentIds=collectAllSymbols ids、domainCommands=20 句柄名）
- [x] `registerEditorDomain` 登记 `kind: 'scada-editor'`——裁定为**显式 register 函数**（`registerScadaEditorDomain()`，由消费侧/测试显式调用）：industrial `sideEffects: ["*.css"]` 下模块加载 effect 会被 bundler 摇树剔除，不可靠
- [x] 新增 adapter 单测（9 用例）：diff null 契约、applyDiff 对称性（`applyDiff(applyDiff(doc, forward), inverse)` 深等于 doc，forward 经 diffScadaConfig 生成）、domainCommands 与 `use-editor-handles.ts` 句柄清单一致
- [x] industrial + editor-core 全量测试绿（1620 + 37）

Exit Criteria:

- [x] `registerEditorDomain` 经 `registerScadaEditorDomain()` 显式调用可查（`getEditorDomain('scada-editor')` 有测试锁定）；adapter 测试 9/9 绿
- [x] industrial 全量测试零回归（1620/1620）

### Phase 4 - owner doc 刷新 + 全量验证（Follow-up + Proof）

Status: completed
Targets: `docs/architecture/editor-core.md`、daily log

- Item Types: `Follow-up`、`Proof`

- [x] `editor-core.md` §6 迁移矩阵 SCADA 相关行刷新（UndoStack 行改"直接映射（P1.1 facade 落地）"、命令面行注 domainCommands 声明并显式记录句柄数 18→20 修正（plan 522 增 previewInject/previewClear 后 live 值 20）、diff/applyDiff 行注 adapter 落地）；§6.1 补 P1.1 落地记录；roadmap §6 P1.1 回写按 Deferred 对账标注
- [x] daily log 记录 P1.1 落地与 Deferred 对账

Exit Criteria:

- [x] owner doc 与 live 一致

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_d54c71d7-c2c3-40bc-afe3-cbfe947faa74）
- Verdict: pass（round 1 fail → 修订 → round 2 pass）
- Rounds: 2
- Findings addressed: Round 1 唯一 Major（Deferred 缺 roadmap §6 P1.1 对账、剩余工作归属悬空）——改判 `moved to explicit successor ownership` + 显式声明"本 plan 闭合不等价于 P1.1 全量收敛"+ 回写标注措辞 + 追认流程；5 Minor（545 预授权误引、18→20 句柄记账、sideEffects 摇树风险→显式 register 函数、Phase 4 门禁重复→check 入 Gates、回归面数字口径）全部落地。Round 2 residual polish（~65/~1400 旧数字、watch-only 术语同步）已随手修正。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（无 live defect；漂移即栈实现并存，已由本计划收敛）
- [x] 栈存储单源：industrial 不再持有独立 undo 栈存储
- [x] 行为不变：industrial 全量测试零回归（1620/1620；既有测试零删改，仅新增）
- [x] 域 adapter 契约落地（diff null/applyDiff 对称/domainCommands 20 句柄/注册表登记）
- [x] 必要 focused verification 已完成（editor-core 37/37 + industrial 1620/1620）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] owner doc `editor-core.md` 已同步到 live baseline
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`
- [x] `pnpm lint`（42/42）
- [x] `pnpm test`（78 tasks 全绿）
- [x] `pnpm check`（exit 0）

## Deferred But Adjudicated

### createEditorCore 全状态接管（working/committed/selection/mode 迁 EditorSessionState）

- Classification: `moved to explicit successor ownership`（Anti-Slacking Rule 有效终态之一；roadmap §6 P1.1 定义性内容的范围改判）
- Why Not Blocking Closure: roadmap P1.1 的重复实现痛点（三套 undo/redo 并存）已由栈存储单源消除；全状态接管需重写 4 文件 10 处 mutation 站点并重验 engine 同步顺序与错误恢复路径（直接触及 syncWorkingCopy/UndoRedoAdapter/undoStack 的测试文件 26 个 + 触及 applyDiff 的 22 个；全包 it/test 声明 ~1719），且 z-order `reordered` 的 inverse 必经域 `computeInverse`（`diffScadaConfig` 不表达顺序变更，内核 `diff(next, prev)` 反演会破坏 z-order undo 行为），强迁移会引入行为漂移风险。域 adapter 契约已建立，后续增量有落点。
- Successor Required: `yes`
- Successor Path: **本 plan 闭合不等价于 roadmap §6 P1.1 全量收敛**。roadmap §6 P1.1 回写时状态标注 `done（部分：栈存储单源 + 域 adapter/domainCommands 落地；createEditorCore 全状态接管按本 Deferred 改判不落）`；该范围改判属 roadmap §10 Rule 3/5 结构变更，须人确认或独立共识审查追认后方可视为 P1.1 描述性文本已收敛——追认是 successor ownership 的第一站；若追认为"须迁"，则按 plan guide 新立接管 plan（以本 plan 的域 adapter 为落点）。

## Non-Blocking Follow-ups

- roadmap P4.3（句柄/action provider 共享 helper）落地时，`domainCommands` 清单与共享 helper 的方法清单合一。
- `UndoStack` facade 的 `UndoStackEntry` 类型别名可在 P4.3 后评估收敛进 editor-core 导出。

## Closure

Status Note: P1.1 落地（部分迁移，Deferred 对账齐备）：栈存储单源（industrial UndoStack → editor-core UndoCommandStack facade，公开 API/语义逐项不变）、域 adapter + 注册（'scada-editor'）、domainCommands 20 句柄、行为不变证明（1620 测试零删改全绿）；roadmap §6 P1.1 按处方标注 `done（部分）`；独立 closure audit 两轮 approved。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_cd97a332-1b8b-44c1-81d4-c987559bf635）
- Evidence: Round 1 findings = 1 Major（roadmap 回写未执行而 daily log 已声称）+ 2 Minor；回写与行注补齐后 Round 2 VERDICT: approved——facade 映射对照 `git show HEAD` 逐行核实、adapter 契约/20 句柄/显式注册核实、既有测试零删改核实、editor-core 37/37 与 industrial 135 文件/1620 测试独立复跑通过、diffScadaConfig 不产 reordered（Deferred 技术事实）核实。

Follow-up:

- roadmap §10 Rule 3/5 追认 P1.1 范围改判（Deferred 记账的 successor ownership 第一站）；P4.3 落地时句柄清单与共享 helper 合一；no remaining plan-owned work。
