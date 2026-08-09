# 01 Industrial HMI 引擎/渲染器热路径正确性与性能

> Plan Status: completed
> Last Reviewed: 2026-08-05
> Source: `docs/components/roadmap-industrial-hmi.md` §Follow-up Backlog「2026-08-05-0653 post-remediation audit P2」三条仍 open 条目（open-audit P2-1 / P2-2、multi-audit P2-5）；源审计 `docs/audits/2026-08-05-0653-open-audit-industrial-hmi.md` + `docs/audits/2026-08-05-0653-multi-audit-industrial-hmi.md`
> Mission: industrial-hmi
> Work Item: P2 post-remediation 收尾（引擎/渲染器热路径）
> Related: `2026-08-05-0653-3` / `2026-08-05-0653-4`（前序 P2 收口）、`2026-08-04-2243-2`（D 系列视口几何基线）

## Purpose

收口 2026-08-05-0653 post-remediation 审计中剩余 3 条引擎/渲染器热路径 P2 finding：① 初始视口 fill 分支用未钳制 scale 计算居中坐标（显示几何缺陷）；② `TreeRegistry.subtreeIds` O(N×subtree) 复杂度（万级图元 + undo-redo diff 性能隐患）；③ `useScadaPointsBridge` 每次 scope 变更重建全量 point-values record 且合并优先级未文档化（性能 + 契约透明度）。三者同属「引擎/渲染器运行期热路径」结果面，共享 focused 单测 + 几何/复杂度断言验证路径，合并为单个 owner plan 内三个 Phase。

## Current Baseline

### 已成立（live repo 实核 2026-08-05）

- **视口几何基线**（plan `2026-08-04-2243-2` D3 收口）：wheel/插件 zoom 钳制已改光标锚（`scada-engine.ts handlePluginZoom`），命令路径 `applyViewportState` 传 screen 锚点 `{0,0}`（P1-9 不变式）。`engine/viewport.ts` 导出 `clampScale`（`[MIN_SCALE=0.1, MAX_SCALE=20]`，`Number.isFinite` 防御）、`clampViewport`（x/y 非有限回落 0）、`fit`（contain，已 `clampScale`）、`center`。
- **applyInitialViewport fill 分支**（`renderer/hooks/use-scada-config-sync.ts:112-123`）：`scale = Math.max(size.width / bounds.width, size.height / bounds.height)` **未钳制**，直接用于居中 x/y 计算；随后 `runtime.engine.setViewport(...)` 经 `viewport.ts:setViewport → clampViewport` 才钳 scale。极端 bounds（scale 越界 `[0.1,20]`）时居中坐标按未钳制 scale 算、实际 scale 被钳 → 内容居中漂移。`fit`（contain）分支已 `clampScale`，无此问题。
- **TreeRegistry**（`engine/tree-registry.ts`）：`subtreeIds(id)`（`:65-73`）单遍 forward 遍历 `this.byId.values()` + 内层 `ids.includes(entry.parentId)` 检查 = O(N×subtree)；依赖未文档化的「父先于子插入」不变式（当前 ConfigAdapter 按声明序构建保证成立，但 undo-redo diff / 第三方直调可破）。`tree-registry.test.ts:39-49` 已有 `subtreeIds` 正确性用例（未断言复杂度）。`add`/`remove` 维护 `byId` Map + `nodeIndex` WeakMap，无 `childrenOf` 索引。
- **useScadaPointsBridge flux 求值 effect**（`renderer/hooks/use-scada-points-bridge.ts:333-376`）：deps `[config, runtime, enabled, scopeData, reportOnce]`；每次 scope 变更（`scopeData` 新身份）触发，`pointValues` 从 `runtime.pointStore.pointIds()` 全量快照（含 static/expression/flux 全类型点），`createPrivateEvalScope({ ...pointValues, ...scopeData })` 合并——**scope 在 id 冲突时静默遮蔽 point**，该优先级规则未文档化。`point-store.ts` 暴露 `pointIds()`/`getPointValue()`/`snapshotValues()`/`subscribe()`，无 change-generation 计数器。
- **包级测试基线**（plan `2026-08-05-0653-4` 收口后）：647 tests / 46 files 全绿；workspace 全量验证（typecheck/build/lint 32/32 + test 59/59）全绿。

### 真正剩余的 gap

- multi-audit P2-5：fill 分支未钳制 scale → 居中漂移（显示几何缺陷，极端 bounds 可触发）。
- open-audit P2-1：`subtreeIds` O(N×subtree)（10 万图元 + undo-redo diff 可破 `<200ms`/`≥45fps` envelope）。
- open-audit P2-2：全量 point-values 快照每次 scope 变更重建（性能）+ 合并优先级未文档化（透明度）。

## Goals

- fill 分支与 contain 分支一样在居中计算前钳制 scale，消除极端 bounds 居中漂移。
- `subtreeIds` 复杂度收敛到 O(subtree)（经 `childrenOf` 索引 + DFS），不再依赖「父先于子插入」隐式不变式。
- `useScadaPointsBridge` 不在 point 值未变时重复重建全量快照；合并优先级（scope 遮蔽 point）在 owner-doc 文档化并有 focused 测试守护。

## Non-Goals

- 不改 `fit`（contain）/`center` 已正确分支的行为。
- 不改 `subtreeIds` 的返回值语义或顺序（仅改实现复杂度，保持 `tree-registry.test.ts` 既有断言通过）。
- 不改 flux 表达式求值语义或 `useScopeSelector` 订阅机制；不引入表达式 AST 解析来过滤 point 引用（判定为高风险，见 Phase 3 Decision）。
- 不处理 multi-audit P2-2（renderer 测试样板抽取，归后续 round）。

## Scope

### In Scope

- `renderer/hooks/use-scada-config-sync.ts` `applyInitialViewport` fill 分支 clamp-before-center。
- `engine/tree-registry.ts` `subtreeIds` 改 `childrenOf` Map + DFS；`add`/`remove`/`clear` 维护索引。
- `binding/point-store.ts` 增 change-generation 计数器；`renderer/hooks/use-scada-points-bridge.ts` memoize point-values 快照 keyed on generation。
- `docs/components/industrial-hmi/design-data-binding.md` 文档化 `{...pointValues, ...scopeData}` 合并优先级。
- 每项 confirmed live defect Fix 配 failing-first Proof（contract lock-in / 回归守护类 Proof 显式标注非 red-on-current）。

### Out Of Scope

- `scada-canvas.types.ts` 死模块 / `serializeScadaConfig` §11 枚举（归 sibling plan `2026-08-05-1253-2`）。
- renderer 测试样板抽取（multi-audit P2-2，归后续 round）。
- 表达式 AST 过滤 point 引用（Phase 3 Decision 裁定高风险不走；理由见 `Deferred But Adjudicated`）。

## Failure Paths

| 场景编号    | 触发                                          | 行为                                                    | 用户可见表现                 |
| ----------- | --------------------------------------------- | ------------------------------------------------------- | ---------------------------- |
| VP-CLAMP    | bounds 极小/极大致 fill scale 越界 `[0.1,20]` | scale 先钳制再算居中 x/y；内容几何中心对齐视口中心      | fill 后内容居中不漂移        |
| SUBTREE-DFS | undo-redo diff 子节点先于父注册               | `subtreeIds` 仍返回完整子树（DFS 不依赖插入序）         | group 删除/移动子树正确      |
| BRIDGE-MEMO | scope 变更但无 point 写入                     | point-values 快照复用（generation 不变），flux 求值仍跑 | 表达式值正确，无多余快照重建 |

## Test Strategy

本档选择：`建议有测`

三条 finding 均为运行期正确性/性能改进，非鉴权或对外公共 API 契约变更。每项 Fix 配 focused 单测（failing-first 由红转绿）：几何精确断言、复杂度行为断言、generation-memo 行为断言。不引入 e2e 性能基准（I14 benchmark 已固化测量方法，本 plan 不重跑全量 perf e2e）。

## Execution Plan

### Phase 1 - 视口 fill 分支 clamp-before-center（multi-audit P2-5）

Status: completed
Targets: `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-config-sync.ts`、`docs/components/industrial-hmi/design-engine.md` §4.4

- Item Types: `Proof | Fix`

- [x] **Proof（failing-first）**：新增 focused 单测，构造 bounds 使 `Math.max(w/bw, h/bh)` 越界（如 bounds 宽高极小 → scale 远超 MAX_SCALE=20），断言 `setViewport` 收到的 scale 已钳制 **且** 居中 x/y 按钳制后 scale 计算（内容几何中心 = 视口中心）。当前实现该断言失败（scale 未钳、x/y 漂移）。
- [x] **Fix**：`applyInitialViewport` fill 分支 `scale` 经 `clampScale(...)`（从 `engine/viewport.ts` 导入）钳制后再算居中 `x = bounds.x + bounds.width/2 - size.width/(2*scale)`、`y` 同理。与 `fit`（contain）分支对齐（`viewport.ts:67` 已 `clampScale`）。
- [x] **Decision**：不抽取共享 `fitFill` helper——fill 语义（max-scale，`use-scada-config-sync.ts:113-115` 注记）与 contain（min-scale，`viewport.ts:67`）不同，强行共享会模糊语义；保持内联 + 复用 `clampScale` 即可。

Exit Criteria:

- [x] failing-first 单测由红转绿（fill 极端 bounds 居中 x/y 按钳制 scale 计算）。
- [x] 既有 contain/center 路径用例不回归（`use-scada-config-sync.test.ts` 既有视口用例全绿）。
- [x] `design-engine.md §4.4` 补 fill 分支 clamp-before-center 注记（与 D3 光标锚 / P1-9 命令路径注记同节）。

### Phase 2 - TreeRegistry subtreeIds O(subtree)（open-audit P2-1）

Status: completed
Targets: `packages/flux-renderers-industrial/src/engine/tree-registry.ts`、`engine/tree-registry.test.ts`

- Item Types: `Proof | Fix`

- [x] **Proof（failing-first）**：新增 focused 单测——**深度 ≥ 2 逆序插入**（孙先于子、子先于父：插入序 `gc → c → g`），断言 `subtreeIds('g')` 返回完整三层 `['g','c','gc']`。当前实现单遍 forward + `ids.includes`：遍历 `gc` 时其父 `c` 尚未入 `ids`（`c` 在 `gc` 之后才被处理）→ `gc` 漏收 → 断言失败（仅返回 `['g','c']`）。**注**：深度 1 逆序（子先于父）不会触发该 bug——root 已种入 `ids`，子即时命中——故 failing-first 必须用 ≥ 2 层（与源审计 P2-1「grandchild before parent」表述一致）。
- [x] **Fix**：`TreeRegistry` 增 `private childrenOf = new Map<string, Set<string>>()`。`add` 时若 `leaf.parentId` 非空，`childrenOf.get(parentId)?.add(id)`（懒初始化 Set）。`remove(id)` 时：删 `childrenOf` 中所有以 `id` 为 key 的条目（子树断链）+ 从其 parent 的 childrenOf Set 中移除 `id`。`clear` 清空 `childrenOf`。`subtreeIds(id)` 改 DFS：`[id]` 起栈，`for (const child of childrenOf.get(cur) ?? []) push`，O(subtree)。
- [x] **Decision**：`remove` 的子树断链策略——`childrenOf.delete(id)` 删整个子树的子条目（被删子树整体不再可达，符合「删除 group 连同子树」语义）。保留 `byId` 中的子条目删除由 caller（ConfigAdapter）负责遍历 `subtreeIds` 后逐个 remove；本 plan 不改 caller 遍历逻辑，仅保证 `subtreeIds` 在任意插入序下正确 + O(subtree)。

Exit Criteria:

- [x] failing-first 单测（逆序插入）由红转绿。
- [x] 既有 `subtreeIds` 正确性用例（`tree-registry.test.ts:39-49`）不回归。
- [x] `add`/`remove`/`clear` 维护 `childrenOf` 索引一致性（新增单测：remove 后 `subtreeIds` 不含已删节点；clear 后空）。

### Phase 3 - useScadaPointsBridge 快照 memoize + 合并优先级文档化（open-audit P2-2）

Status: completed
Targets: `packages/flux-renderers-industrial/src/binding/point-store.ts`、`renderer/hooks/use-scada-points-bridge.ts`、`docs/components/industrial-hmi/design-data-binding.md`

- Item Types: `Proof | Fix | Decision`

- [x] **Decision**：point-values 过滤方案裁定。审计建议「按 `analyzeFluxSubscriptions` 实际引用过滤」，但 flux 表达式中 bare 标识符（非 `$` 前缀）既可解析为 point id 也可解析为 scope 路径（合并 scope 内同名遮蔽），无表达式 AST 无法安全区分 point 引用 vs 函数名/常量。**裁定不走表达式过滤**（高风险，易误删被引用点值）。改走 **change-generation memoize**：PointStore 增 `generation` 计数器，bridge memoize 快照 keyed on generation，point 值未变时复用快照。
- [x] **Proof（failing-first，合并优先级契约）**：新增 focused 单测——同 id 的 point（static 值 `1`）与 scope 数据（值 `2`）冲突，断言 `evalScope[id] === 2`（scope 遮蔽 point）且该优先级为 **文档化契约**。当前实现行为正确但无测试守护、无文档 → 加测试锁定（contract lock-in，非 red-on-current，但守护未文档化的既定行为防回归）。
- [x] **Proof（failing-first，generation memo · skip 方向）**：新增 focused 单测——mock pointStore，触发一次 scope-only 变更（`scopeData` 新身份、generation 不变），断言 `pointStore.pointIds()`/`getPointValue()` 快照重建调用次数 **不随 scope 变更递增**（generation 不变时复用 memo 快照）。当前实现每次 scope 变更都全量重建 → 断言失败（red on current）。
- [x] **Proof（generation memo · rebuild 方向，回归守护）**：新增 focused 单测——写入一个新 point 值（`setPointValue` → generation bump），随后触发 scope 变更，断言 evalScope 包含**新写入的值**（generation 变化触发快照重建，不返回 stale 快照）。当前无 memo 时恒真；Fix 落地后证明 memo 在 bump 路径正确失效、不静默吞新值。
- [x] **Fix（generation）**：`PointStore` 增 `private generation = 0` + `getGeneration(): number`。**所有改写点值/点集的入口** `generation++`：`applyValue`（覆盖 `setPointValue`/`setPointValues`，二者经 applyValue）、`loadDeclarations`（直写 entries 不经 applyValue，新增点 id 必须触发快照重建）、`restoreValues`（同直写 entries）、`reset`（清空点集）。`snapshotValues`/`getPointValue`/`pointIds`/`subscribe` 等只读/订阅路径不 bump。
- [x] **Fix（memo）**：`useScadaPointsBridge` effect 内：读 `runtime.pointStore.getGeneration()`，与 `useRef` 缓存的 `(generation, snapshot)` 比较，generation 不变时复用 `snapshot`、变化时重建。effect deps 保留 `scopeData`（scope 变更仍触发求值，仅跳过快照重建）。
- [x] **Fix（doc）**：`design-data-binding.md` 文档化 flux 求值 scope 构造：`{...pointValues, ...scopeData}` 合并、**scope 在 id 冲突时遮蔽 point**（既定契约，非缺陷）、point-values 来自 PointStore 当前值快照。

Exit Criteria:

- [x] 合并优先级单测锁定（scope 遮蔽 point 断言 + 文档化）。
- [x] generation-memo skip 方向 failing-first 单测由红转绿（scope-only 变更不重建快照）。
- [x] generation-memo rebuild 方向回归守护单测通过（generation bump 触发快照重建，新值进入 evalScope）。
- [x] 既有 flux 求值用例（`scada-points-bridge.test.tsx` 主 + 诊断）不回归。
- [x] `design-data-binding.md` 合并优先级 + scope 构造段落落地。

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: fresh session `ses_02fb80f05ffeYMVrqhWBs62PcK`（R1）+ fresh session `ses_02fb372c6ffezp7WN8ORQELi2i`（R2 复核）
- Verdict: `pass-with-minors`（R2，零 Blocker / 零 Major）
- Rounds: 2（R1 `revised` → 2 Major 落地 → R2 `pass-with-minors` 确认）
- Findings addressed:
  - R1-Major-1（Phase 2 failing-first Proof 用 depth-1 逆序不会 red）：Proof 改写为 depth ≥ 2（`gc → c → g`），R2 经 tree-registry.ts:65-73 trace 确认当前实现返 `['g','c']` 漏 `gc`、断言 genuinely red。
  - R1-Major-2（Phase 3 generation-memo 仅证 skip 方向 + `loadDeclarations` bump 路径模糊）：Fix(generation) 显式枚举 `applyValue`/`loadDeclarations`/`restoreValues`/`reset` 全 bump 路径（R2 经 point-store.ts 核对完整、无遗漏写路径）+ 新增 rebuild 方向回归守护 Proof。
  - R1-Minors（fill 行号 112-122→112-123、Phase 1 Decision `viewport.ts:60`→`use-scada-config-sync.ts:113-115` + `viewport.ts:67`、表达式 AST 项三处冗余收敛）：全部落地。
  - R2-Minor（In Scope「每项 Fix 前落 failing-first Proof」与 Phase 3 contract lock-in/回归守护 Proof 措辞张力）：In Scope 行补「contract lock-in / 回归守护类 Proof 显式标注非 red-on-current」。

## Closure Gates

- [x] 三条 in-scope P2 finding（multi P2-5 / open P2-1 / open P2-2）confirmed live defect 已修复，各带 focused regression proof（断言结果值/行为）。
- [x] failing-first Proof 全部由红转绿。
- [x] 既有视口/TreeRegistry/points-bridge 测试不回归。
- [x] owner docs（`design-engine.md §4.4` / `design-data-binding.md`）同步 live baseline。
- [x] 不存在被静默降级到 deferred 的 in-scope live defect。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 表达式 AST 过滤 point 引用

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: flux 表达式 bare 标识符无法在无 AST 时安全区分 point 引用 vs 函数名/常量；误删被引用点值会引入求值缺陷（风险高于性能收益）。change-generation memoize 已消除「point 值未变时重复重建」的主要开销。
- Successor Required: `no`

## Non-Blocking Follow-ups

- I14 benchmark 复测对照：generation-memo 对万级点 + 高频 scope 变更的实际帧时间收益（本 plan 不跑全量 perf e2e，留 I14 节奏复测）。

## Closure

Status Note: 三条 in-scope P2 finding 全部修复并各带 focused proof（Phase 1 fill clamp-before-center / Phase 2 subtreeIds childrenOf+DFS / Phase 3 generation-memoize + 合并优先级文档化）。每项 Fix 前落 failing-first Proof 由红转绿（Phase 1/2/3 均确认 red-on-current 后修复）。包级 657 tests / 46 files 全绿；workspace 全量验证（typecheck/build/lint 32/32 + test 59/59）全绿。owner docs（`design-engine.md §4.4` P2-5 增补 / `design-data-binding.md §9.1` 合并优先级 + generation-memoize）已同步。roadmap 三条 backlog 条目回写「已由 plan `2026-08-05-1253-1` 收口」marker。closure-audit 已由独立 fresh-session sub-agent 执行（verdict `approved`，证据见下）。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit fresh-session sub-agent（MISSION_DRIVER:2026-08-05-065334-mission-driver，session 独立于执行者上下文）。
- Verdict: `approved`（零 Blocker / 零 Major；语义与文本一致性核对通过）。
- Evidence（live repo file:line 逐条核对，2026-08-05）：
  - Phase 1（P2-5）：`packages/flux-renderers-industrial/src/renderer/hooks/use-scada-config-sync.ts:121` `const scale = clampScale(Math.max(...))` 已钳制后再用于 `x/y` 居中（:123-124）；clampScale 经 :7 从 `engine/viewport.js` 导入。failing-first Proof 在 `use-scada-config-sync.test.ts:316-356`（bounds 1×1 → rawScale=800 越界，断言 setViewport 收到 scale≤MAX_SCALE=20 且 x/y 按钳制 scale 算）。`docs/components/industrial-hmi/design-engine.md:156-162` §4.4 P2-5 增补注记落地。
  - Phase 2（P2-1）：`engine/tree-registry.ts:17` `childrenOf` Map；`add`（:23-30）/`remove`（:41-48，子树断链 + 从 parent Set 移除）/`clear`（:86）维护索引；`subtreeIds`（:94-107）DFS 栈实现 O(subtree)。failing-first Proof 在 `tree-registry.test.ts:69-78`（逆序 `gc → c → g` 插入断言返完整三层）。Caller wiring 经 `engine/config-adapter.ts:131-149` 实证（subtreeIds → 逐个 remove）。Anti-hollow：childrenOf 在 add/remove/clear 全路径维护，无空实现。
  - Phase 3（P2-2）：`binding/point-store.ts` generation 计数器（:147）+ `getGeneration()`（:154-156），全写路径 bump：`applyValue`（:295，命中真实变更才 bump）、`loadDeclarations`（:167）、`restoreValues`（:281）、`reset`（:177）；只读/订阅路径不 bump。`use-scada-points-bridge.ts:294-297` `pointSnapshotRef`、:352-364 effect 内 generation-memoize 逻辑、:396-402 post-write 缓存更新、:312 config reload 对称重置；:366 `{ ...pointValues, ...scopeData }` 合并优先级（scope 遮蔽 point）含注释。三条 Proof 在 `scada-points-bridge.test.tsx:517-605`（① 合并优先级 contract lock-in / ② generation-memo skip red-on-current / ③ rebuild 回归守护）。`docs/components/industrial-hmi/design-data-binding.md:283-299` §9.1 合并优先级 + generation-memoize 段落地。
  - 文本一致性：`Plan Status: completed`、三 Phase `Status: completed`、所有 Phase items 与 Exit Criteria 全 `[x]`、Closure Gates 全 `[x]`（含本独立 audit gate）、Closure evidence 非 placeholder——五处一致。
  - Deferred honesty：仅「表达式 AST 过滤 point 引用」一项 deferred，分类 `out-of-scope improvement`，理由明确（无 AST 时无法安全区分 point 引用 vs 函数名/常量，误删风险高于性能收益；generation-memo 已消除主要开销），无 in-scope live defect/contract drift 被偷偷降级。
  - 收口记录：`docs/logs/2026/08-05.md` 已记录本 plan 三 Phase 落地 + file:line citation。

Follow-up:

- 仅剩 non-blocking follow-up：I14 benchmark 复测对照 generation-memo 实际帧时间收益（留 I14 节奏）。
