# HCA5 Symbols Core 包级深审记录

> Audit Date: 2026-08-08
> Mission: industrial-hmi-component-audit
> Work Item: HCA5. Symbols core 审计
> Plan: `docs/plans/2026-08-08-0748-1-industrial-hmi-hca5-symbols-core-audit.md`
> Scope: `packages/flux-renderers-industrial/src/symbols/` 顶层 8 文件（symbols core 框架层）
> Baseline: HEAD 2026-08-08，`pnpm --filter @nop-chaos/flux-renderers-industrial test` 全绿（97 test files / 1302 tests）
> Dimension Set: `docs/skills/deep-audit-prompts.md` 23 维（symbols core 非复杂交互层，维度 21-23 可选触发；本层未触发）

## 审计方法

逐文件过 23 维重点维度（注册并发安全 / 工厂 deep-merge 正确性 / 视觉状态 revert 完整性 / 复合装配 applyProps 路由 / compound 装配子符号 props 传播 / register-builtin 注册顺序与幂等），抽查边界值（空 props / undefined style patch / 重复注册 / unregister 不存在 / clear 后 instantiate / 深嵌套 compound / NaN 几何）。每条 finding 带 `文件:行` 证据。所有 finding 已 triage 为 P0/P1/P2/P3。

## 逐文件 finding 表

### symbol-types.ts（157 行）— 类型声明

| 维度                      | 结论                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | 证据                       | Triage           |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ---------------- |
| 03 API 表面积与契约一致性 | 类型声明完整：`ScadaSymbolProps`（25 数据字段）+ `ScadaSymbolStylePatch`（8 style 字段）+ `ScadaSymbolDefinition` 注册契约 + `SymbolCreateContext`。`ScadaSymbolStylePatch` 经 `visual-state.ts` STYLE_RESET_DEFAULTS 编译期穷尽守卫（`Record<keyof ScadaSymbolStylePatch, unknown>`）。**发现跨层 drift（见 P1-1）**：`ScadaSymbolProps` 声明 `fontFamily`/`fontWeight`/`align`（symbol-types.ts:34,36,38），但序列化层 `ScadaSymbolNode`（config-types.ts）缺这三字段 → diff 路径漏键。symbols core 侧类型本身正确，drift 根因在序列化层。 | `symbol-types.ts:34,36,38` | P1-1（跨层）     |
| 13 类型安全               | `SymbolCreateContext.engine: unknown` + `ScadaEngineImageBridge.resolveImageUrl?` 为已记录 impl drift（design-symbols.md §4.1 强类型缺失注记：symbols↔engine 互引避循环导入）。非新缺陷。                                                                                                                                                                                                                                                                                                                                                    | `symbol-types.ts:131,155`  | 不报告（已收敛） |

### symbol-registry.ts（44 行）— 全局 Map 注册表

| 维度          | 结论                                                                                                                                                                                                                                                                  | 证据                            | Triage               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------- |
| 04 状态所有权 | 模块级全局 `Map<string, ScadaSymbolDefinition>` 单例，跨 engine 实例共享。design-symbols.md §7 已裁定 owner = 域内部（静态注册表）。测试经 `beforeEach clearScadaSymbolRegistry()` 隔离。非缺陷。                                                                     | `symbol-registry.ts:3`          | 不报告（设计已裁定） |
| 19 错误传播   | `registerScadaSymbol` 校验 type/create/props 三前置（非空 type / create 为函数 / props 为对象），重复注册抛错带 `{ override }` 逃生口。`unregisterScadaSymbol` 不存在 type 返 false（Map.delete 语义）。`getScadaSymbolDefinition` 不存在返 undefined。错误语义清晰。 | `symbol-registry.ts:9-22,26-32` | 零发现               |
| 06 并发安全   | JS 单线程无 data race；register/unregister/clear 同步操作无时序窗口。`listScadaSymbols()` 返 `[...values()]` 拷贝（防外部 mutation）。                                                                                                                                | `symbol-registry.ts:38-40`      | 零发现               |

### symbol-factory.ts（106 行）— 工厂 + props↔attrs 映射

| 维度                 | 结论                                                                                                                                                                                                                                                             | 证据                             | Triage                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------- |
| 04 deep-merge 正确性 | `instantiateSymbol` 经 `deepMergeInstanceProps(definition.defaults, ctx.props)` 合并后传入 create（优先级链 defaults ← 实例 ← 声明层）。0900-2 P2-10 读写对称已落地。                                                                                            | `symbol-factory.ts:14-16`        | 零发现（先验修复回归点，Phase 3 抽查） |
| 13 类型安全          | `toNodePatch`/`fromNodeAttrs` 映射对偶：scale↔scaleX/scaleY、textSize↔fontSize、align↔textAlign、strokeDash↔dashPattern、fill 多对一按 `node.tag==='Text'` 消歧。`NODE_BACKED_PASSTHROUGH_KEYS` 白名单仅发射 schema 键，mock/leafer 内部键跳过。映射穷尽且对称。 | `symbol-factory.ts:19-42,54-105` | 零发现                                 |

### style-resolver.ts（14 行）— 样式 resolve helper

| 维度          | 结论                                                                                                                                                                                                                                                                                 | 证据                     | Triage |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ | ------ |
| 03 契约一致性 | `resolveSymbolStyle`：`{ ...defaults, ...instanceProps }` 浅合并（实例优先）+ statePatch 覆盖。state patch 源：`definition.resolveStateStyle` hook ?? `merged.states?.states?.[state]?.style ?? {}`。与 design-symbols.md §10 `effectiveStyle = defaults ∪ 实例 ∪ statePatch` 一致。 | `style-resolver.ts:8-13` | 零发现 |
| 14 边界值     | undefined state → 直接返 merged（无 patch）。无 resolveStateStyle hook → 回落实例 states 声明。空 states 声明 → `?? {}` 空对象不覆盖。边界健壮。                                                                                                                                     | `style-resolver.ts:9-12` | 零发现 |

### visual-state.ts（118 行）— StateVisualApplier（视觉状态 apply/revert）

| 维度                      | 结论                                                                                                                                                                                                                                                                                                                                                                                    | 证据                           | Triage                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------- |
| 04 revert 完整性          | enter/exit 对称：active state-style 键追踪入 `applied` Set；退出（styled===base）时 revert。STYLE_RESET_DEFAULTS 穷尽守卫（`Record<keyof ScadaSymbolStylePatch, unknown>` 覆盖 8 style 键）+ shadow reset + `applied.delete` hoist 出 `if(revert!==undefined)` 守卫（2129-3 open P1-1 已修）。迭代 `new Set([...applied, ...Object.keys(styled)])` 拷贝，循环内 mutate `applied` 安全。 | `visual-state.ts:18-31,77-117` | 零发现（先验修复回归点，Phase 3 抽查） |
| 19 binding-vs-revert 边缘 | revert 字段同时存在 binding 时跳过（binding 胜出，collectBindings 同帧已写 pending）。**边缘 case**：binding 源点本轮未变化（collectBindings 不写）时，跳过 revert 使引擎暂留 active 态值。已在代码注释标为 pre-existing 边缘 case（非 W3 引入），归 Non-Blocking Follow-ups。                                                                                                          | `visual-state.ts:83-91`        | P3-3（已记录，非新缺陷）               |

### composite.ts（135 行）— 复合装配

| 维度               | 结论                                                                                                                                                                                                 | 证据                 | Triage                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | -------------------------------------- | -------------------- | -------------------------------------------------------------------------------- | ---------------------- | ------ |
| 03 applyProps 路由 | rotation→rotor??core??root；text/textColor→text part；ROOT_FIELDS→root；EXTENT_FIELDS（width/height）→extent part ?? resize hook；BODY_FIELDS→body。0900-2 P2-4 resize 路由已落地。                  | `composite.ts:45-85` | 零发现（先验修复回归点，Phase 3 抽查） |
| 19 EXTENT 静默丢弃 | 无 extent part 且无 `parts.resize` hook 时，width/height 静默丢弃（`parts.resize?.()` 可选调用无目标）。design-symbols.md §10 裁定复合族须注册 resize hook，故框架行为可辩护（符号定义责任，HCA6）。 | `composite.ts:72-77` | P3-2（符号定义责任，归 HCA6/HCA-CR）   |
| 02 角色映射        | `createCompositeGroup` 角色：rotor                                                                                                                                                                   | impeller             | blades                                 | needle→rotor，liquid | bar→extent。同符号多旋转件仅末位生效（设计预期单旋转件，各符号族用一种角色名）。 | `composite.ts:100-109` | 零发现 |

### compound.ts（98 行）— group/instance 复合 + 深合并

| 维度                 | 结论                                                                                                                                                                                                                                                | 证据                      | Triage                      |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | --------------------------- |
| 04 deep-merge 正确性 | `deepMergeInstanceProps`：对象递归合并，数组/基元整体替换，undefined 跳过。`diffInstanceProps`：经共享 `serialization/equality.ts deepEqual`（0653-4 C2 key-order-insensitive）diff 于 defaults 产出最小覆盖集。                                    | `compound.ts:28-47,65-82` | 零发现（先验修复回归点）    |
| 15 深度上限          | `deepMergeInstanceProps` 递归无深度上限。`equality.ts deepEqual` 有 `MAX_DEEP_EQUAL_DEPTH=100` fail-closed（0900-1 P2-9）。merge 路径无对应守卫——恶意/损坏深嵌套 config 理论上 stack overflow。author-controlled 输入 + validate 层限结构，低风险。 | `compound.ts:28-47`       | P3-1（防御纵深，归 HCA-CR） |

### register-builtin.ts（75 行）— 内置符号注册入口

| 维度        | 结论                                                                                                                                                                                                                                  | 证据                        | Triage |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------ |
| 06 幂等     | `registerBuiltinScadaSymbols`：`if (!hasScadaSymbol(def.type)) registerScadaSymbol(def)` —— hasScadaSymbol 守卫使重复调用 no-op（用户自定义同 type 先注册者胜出，design-symbols.md §4.1 已裁定）。`registerScadaSymbols()` 幂等包装。 | `register-builtin.ts:62-75` | 零发现 |
| 02 注册顺序 | 24 定义数组顺序无关（各 type 独立，builtin 不互相实例化注册）。                                                                                                                                                                       | `register-builtin.ts:35-60` | 零发现 |

## Finding Triage 汇总

| ID   | 严重程度 | 文件                                                                      | 一句话摘要                                                                                                                                                                                                                | 处置                                                                                                                                                                                                                                                                 |
| ---- | -------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-1 | P1       | `symbol-types.ts:34,36,38` ↔ `config-types.ts:81-91` ↔ `diff.ts:22-33,83` | `ScadaSymbolProps` 声明 `fontFamily`/`fontWeight`/`align` 但 `ScadaSymbolNode` + `SYMBOL_KEYS` 缺这三字段 → `diffScadaConfig` 对三字段产出空 patch → host live config 改文本对齐/字体被静默丢弃（prior P1-1 `flow` 同类） | **fixed**（Phase 2）：failing-first proof 3 test（`serialization-diff.test.ts` `diffScadaConfig text-style fields`，修复前空 patch）→ 补 `ScadaSymbolNode`（config-types.ts:84-91）+ `SYMBOL_KEYS`（diff.ts:25-33）→ 转绿；守卫 `check-scada-symbol-keys.mjs` 防复发 |
| P3-1 | P3       | `compound.ts:28-47`                                                       | `deepMergeInstanceProps` 无递归深度上限（equality.ts 有对应守卫，merge 路径缺）                                                                                                                                           | 归 HCA-CR（防御纵深）                                                                                                                                                                                                                                                |
| P3-2 | P3       | `composite.ts:72-77`                                                      | 无 extent + 无 resize hook 时 width/height 静默丢弃（符号定义责任）                                                                                                                                                       | 归 HCA6/HCA-CR                                                                                                                                                                                                                                                       |
| P3-3 | P3       | `visual-state.ts:83-91`                                                   | binding 源点本轮未变化时跳过 revert 暂留 active 态值（pre-existing，代码已标 Non-Blocking Follow-up）                                                                                                                     | 已记录，非新缺陷                                                                                                                                                                                                                                                     |

## SYMBOL_KEYS 派生 lint 守卫 Decision（Phase 1 item 4）

**Decision: 现在落地。**

- **背景**：`docs/audits/2026-08-05-0653-open-audit-industrial-hmi.md:250,266` 建议 `scripts/check-scada-symbol-keys.mjs` 断言 `SYMBOL_KEYS ∪ {id,type} === keyof ScadaSymbolNode`，机械防 P1-1 类漏键复发。plan `2026-08-05-0653-2` Deferred 为 optimization candidate（Successor Required: no）。脚本至今未实现（`find` 实测仓库不存在）。
- **裁定理由**：本 plan Phase 1 审计**当场发现 P1-1 复发实例**（`fontFamily`/`fontWeight`/`align` 三字段 drift，见上表）——与 0653-2 修复的 `flow` 漏键同根因同表现。live P1 复发直接证伪「watch-only」可行性；继续 watch-only 等同已知会再漏。守卫落地成本极低（机械 regex 解析 + process.exit，~80 行），ROI 明确为正。
- **实现**：`scripts/check-scada-symbol-keys.mjs`，三向断言：
  1. `ScadaSymbolNode` 每声明字段 ∈ `SYMBOL_KEYS`（diff 覆盖守卫，防「新字段入节点但 diff 漏键」）；
  2. `ScadaSymbolProps` 每数据字段 ∈ `ScadaSymbolNode`（props→node 契约守卫，root-cause 防御，直接捕 P1-1）；
  3. `SYMBOL_KEYS` 无 `ScadaSymbolNode` 之外的多余键（belt-and-suspenders）。
- **Phase 1 验证**：脚本实现后运行，当场报 P1-1 三字段 drift（见上 P1-1），证明守卫有效。Phase 2 修复后脚本转绿。
- **接线**：加入 `pnpm check` 聚合命令 + package.json `check:scada-symbol-keys` 脚本条目，使后续 CI 守护。

## 先验修复回归抽查（Phase 3 抽查点）

以下先验修复构成本 plan Current Baseline，Phase 3 抽查其行为仍成立（不重做）：

- visual-state STYLE_RESET_DEFAULTS 穷尽 + shadow reset + applied.delete hoist（2129-3 open P1-1）→ `visual-state.ts:18,30,109`。
- factory `fromNodeAttrs` 读写对称（0900-2 P2-10）→ `symbol-factory.ts:54-105`。
- composite `parts.resize?` 路由（0900-2 P2-4）→ `composite.ts:27,72-77`。

**Phase 3 回归验证证据（2026-08-08）**：`pnpm --filter @nop-chaos/flux-renderers-industrial test` 全绿（97 test files / 1306 tests）。覆盖先验修复的回归测试文件均绿：

- `state-visual.test.ts`（494 行）— STYLE_RESET_DEFAULTS 穷尽守卫、shadow reset、applied.delete hoist、binding-vs-revert 三路裁定。
- `compound.test.ts`（487 行）— P2-10 fromNodeAttrs 读写对称（`getSymbolProps` 经反映射回 schema 名 scale/width/custom）、深合并优先级链、diffInstanceProps 最小覆盖集。
- `symbols.test.ts`（468 行）— B2 points-based applyProps 重算、P2-10 映射对偶。

## owner doc 一致性核对（Phase 3 item 1）

核对 `docs/components/industrial-hmi/design-symbols.md` 与 live symbols core：

| 契约                                                                                             | doc 位置                        | live 位置                                                | 结论 |
| ------------------------------------------------------------------------------------------------ | ------------------------------- | -------------------------------------------------------- | ---- |
| 注册 API 面（registerScadaSymbol 抛错/override、hasScadaSymbol 守卫、registerScadaSymbols 幂等） | §4.1（line 87）                 | `symbol-registry.ts:18-22` + `register-builtin.ts:62-66` | 一致 |
| ScadaSymbolProps 字段面（含 fontFamily/fontWeight/align）                                        | §4.2（line 114-116）            | `symbol-types.ts:34-38`                                  | 一致 |
| factory 读写对称契约（fromNodeAttrs 反映射）                                                     | §10（line 217，P2-10 Decision） | `symbol-factory.ts:54-105`                               | 一致 |
| visual-state 样式解析规则（effectiveStyle = defaults ∪ 实例 ∪ statePatch）                       | §10（line 211）                 | `style-resolver.ts:8-13`                                 | 一致 |
| composite resize 契约（EXTENT_FIELDS + resize hook）                                             | §10（line 215，P2-4 Decision）  | `composite.ts:72-77`                                     | 一致 |

**结论：无 drift。** design-symbols.md §4.2 已正确列示 fontFamily/fontWeight/align（line 114-116，与 symbol-types.ts 一致）；P1-1 drift 根因在序列化层 ScadaSymbolNode（config-types.ts，HCA4 域，design-symbols.md 不逐字段文档化 wire 类型），已由 Phase 2 修复（补 ScadaSymbolNode + SYMBOL_KEYS）。doc 无需同步。

## 喂入 HCA-BL（bug 候选）

> 正式归档动作在 HCA-BL，本 plan 不产出 `docs/bugs/` 卡片。以下为本层 finding 喂入清单。

| 候选                                             | 复杂/跨层                                                                         | 归档建议                                                                        |
| ------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| P1-1 `fontFamily`/`fontWeight`/`align` diff 漏键 | 跨层（symbols core ScadaSymbolProps ↔ serialization ScadaSymbolNode/SYMBOL_KEYS） | 复杂度中（跨层根因，机械修复但须 test-first 证 diff 行为），建议归 `docs/bugs/` |
