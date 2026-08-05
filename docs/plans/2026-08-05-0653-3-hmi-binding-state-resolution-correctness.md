# 03 HMI Binding & State Resolution Correctness

> Plan Status: completed
> Last Reviewed: 2026-08-05
> Source: `docs/components/roadmap-industrial-hmi.md` → Follow-up Backlog → 2026-08-05-0653 post-remediation audit P2（open-audit-industrial-hmi `[P2-4]`/`[P2-5]`/`[P2-7]`/`[P2-8]`/`[P2-9]`）；源审计 `docs/audits/2026-08-05-0653-open-audit-industrial-hmi.md`
> Mission: industrial-hmi
> Work Item: post-remediation P2 收口（binding/state pipeline 分支）
> Related: `2026-08-05-0653-4-hmi-config-build-equality-diagnostic-fidelity.md`（同批 plan，config-build/诊断通道分支）

## Purpose

收口 `2026-08-05-0653` open-ended audit 在 binding/state/point 应用管线上的 5 项 P2 silent-defect：这些缺陷均**通过 validate**，但运行期静默产出**错误的视觉/状态/数据归属**结果（图元该隐仍可见、width/height 绑定零响应、state-driver/resting-state 随 key 序翻转、expression-scale 静默丢弃、re-entrant 错误归属错 pointId）。本 plan 把这五项收敛到「binding→state→point-store 解析正确性」单一结果面，使绑定语义对 author 可预期、可观测。

## Current Baseline

经 live repo 核对（2026-08-05），五项缺陷均在当前 `packages/flux-renderers-industrial/` 源码中复现：

- **B1（format-on-non-text，open `[P2-4]`）**：`src/binding/bind-resolver.ts:109-111` `resolveBinding` 末尾**无条件**施加 `format`（即便 `property` 是 `visible`/`opacity`）。`formatValue(false, '%s')` → `"false"`（truthy 字符串）→ 图元 `visible:false` 绑定渲染为可见。`BINDABLE_PROPERTIES`（`:14-28`）既广告 `visible`/`opacity` 可绑定，format 又对非文本属性生效，二者矛盾。
- **B2（points-based 几何 width/height 绑定零响应，open `[P2-8]`）**：`src/symbols/base-shapes/{line,arrow,pipe}.ts` 的 `create`（line `:31-39`/arrow `:32-`/pipe `:29-35`）由 width/height 推导 `attrs.points = [0,0,width,height]`，但**无 `applyProps` 重算 points**。`BINDABLE_PROPERTIES`（`bind-resolver.ts:14-28`）广告 `width`/`height` 可绑定 → validator-passing 的 width/height binding 经 `applyProps` 只改 `node.width/height` 不重算 `points` → 零视觉响应。
- **B3（state-driver / resting-state 随 key 序翻转，open `[P2-5]`）**：`dirty-collector.ts:344` `collectStates` 取 `reverseIndex.lookupSymbol(symbolId)[0]` 作 state-driver；`value-to-state.ts:46-51` `defaultState` 在无 `run` 键时回落 `Object.keys(declaration.states)[0]`。两处均依赖 JSON key 插入序 → author/序列化整形或字母化 key 重排会**静默**翻转 state-driver 与 resting state。
- **B4（expression-scale 静默丢弃，open `[P2-7]`）**：`src/serialization/config-types.ts` `ScadaPointDeclaration.scale.expression` validator 接受，但 `point-store.ts:283-288` `convert` 仅处理 linear scale（`isLinearScale` 命中才换算；expression 分支 `:287 return raw` 原样透传）→ declaration 级 expression-scale 在 write 时被静默丢，无消费者求值。
- **B5（re-entrant 错误归属错 pointId，open `[P2-9]`）**：`point-store.ts:121,264-265` `lastNotifyPointId` 为可变字段，在 `applyValue` 内 `this.lastNotifyPointId = pointId`（`:264`）后 `events.emit('point:change', payload)`（`:265`）。re-entrant 场景（`point:change` listener 内回写 `setPointValue` 另一点）该字段被覆盖 → 后续 listener throw 时 `EventHub.onListenerError`（`:121`）把错误归属给**覆盖后**的 pointId 而非真正抛错的 pointId。

包级基线：628 tests / 46 files 全绿、workspace 全量（typecheck/build/lint 32/32 + test 59/59）全绿（plan `2026-08-05-0653-2` 收口后状态）。

## Goals

- B1：`format` 仅对文本类可绑定属性（`text`/`fill`/`stroke`/`textColor`）生效；`visible`/`opacity`/数值/几何属性绑定不被 stringified，`visible:false` 绑定真正隐藏图元。
- B2：`scada-line`/`scada-arrow`/`scada-pipe` 在 width/height 经绑定或 applyProps 变更后重算 `points`，绑定产出可见几何响应（或移除 points-based 形的 width/height 可绑定声明并文档化，二选一，Phase 1 Decision 裁定）。
- B3：state-driver 选择与 default-state 回落**不依赖** JSON key 插入序；显式偏好（如 `stateSource` 字段或命名默认偏好 `run`/`normal`/`off`）使 key 重排不改变语义。
- B4：declaration 级 `scale.expression` 要么在 write 时被求值（注入 compiler），要么 validator 拒绝并指向 binding-scale；不再静默丢弃。
- B5：re-entrant `setPointValue` 期间订阅者异常归属到**真正抛错的 pointId**，不被覆盖。

## Non-Goals

- 不改 `BINDABLE_PROPERTIES` 集合本身的增删（除 B2 可能收紧 points-based 形的 width/height，由 Phase 1 Decision 裁定）。
- 不重构 binding 解析的整体优先级链（point → expression → map → scale → format 不变，仅 format 的适用域与 scale.expression 的消费收敛）。
- 不处理 config-adapter buildNode Group 降级、compound deepEquals、诊断通道 cause 透传、flux-deps-empty 双报——这些归 sibling plan `2026-08-05-0653-4`。
- 不处理 Multi P2-1/P2-2/P2-3/P2-5、Open P2-1/P2-2（doc/test-hygiene/perf，本批明确 out-of-scope，留 backlog）。

## Scope

### In Scope

- `src/binding/bind-resolver.ts`：`resolveBinding`/`resolveBindings` 按 property 类型决定是否施加 `format`（B1）。
- `src/symbols/base-shapes/{line,arrow,pipe}.ts`：width/height 变更后重算 points 或收紧可绑定声明（B2）。
- `src/binding/{dirty-collector,value-to-state}.ts` + 必要的 `config-types.ts`/`validate.ts`：state-driver / default-state 显式偏好（B3）。
- `src/binding/point-store.ts` + `config-types.ts`/`validate.ts`：expression-scale 求值或拒绝（B4）。
- `src/binding/point-store.ts`：re-entrant pointId 归属修复（B5）。
- 必要的 owner-doc 同步：`docs/components/industrial-hmi/design-data-binding.md`（format 适用域、scale 消费、state 偏好语义）+ `design-symbols.md`（points-based 形 width/height 绑定契约）。
- focused failing-first 单测 + 回归 proof（每项 Fix 前先落 Proof）。

### Out Of Scope

- Multi P2-1（serializeScadaConfig §11 枚举 doc）、P2-2（test 样板重构）、P2-3（scada-canvas.types.ts 死模块）、P2-5（applyInitialViewport fill 钳制）。
- Open P2-1（TreeRegistry.subtreeIds O(N×subtree) 性能）、P2-2（useScadaPointsBridge 全 record 重建）。
- sibling plan `2026-08-05-0653-4` 的全部 in-scope 项。

## Failure Paths

| 场景编号          | 触发                                                             | 行为                                                                | 可重试 | 用户可见表现                               |
| ----------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------- | ------ | ------------------------------------------ |
| format-non-text   | `visible`/`opacity` 绑定 + 同 binding 带 format                  | format 不施加，原始 boolean/number 原样写                           | 否     | `visible:false` 绑定真正隐藏图元           |
| points-no-update  | line/arrow/pipe 的 width/height 绑定变更                         | applyProps 重算 points（或 validator 拒绝并上报）                   | 否     | 绑定产出可见几何响应（或 author 可见拒绝） |
| state-key-reorder | states key 整形/字母化重排                                       | state-driver / resting-state 不变（显式偏好优先）                   | 否     | 运行/停止/故障状态语义稳定                 |
| scale-expr-drop   | declaration `scale.expression`                                   | write 时求值（注入 compiler）或 validator 拒绝 + 指向 binding-scale | 否     | expression-scale 不静默丢                  |
| reentrant-attr    | point:change listener 内回写 setPointValue + 后续 listener throw | onSubscriberError 归属真正抛错的 pointId                            | 否     | host 监控把错误归给正确点                  |

## Test Strategy

档位选择：**必须自动化**

理由：5 项均为「通过 validate 但运行期静默产出错误结果」的 silent defect，且分布在纯逻辑层（bind-resolver/value-to-state/point-store/base-shapes），可单测充分覆盖。每项 Fix 前先落 failing-first Proof（红→绿），证明缺陷真实可复现且修复可观测。

## Execution Plan

### Phase 1 - Binding → visual correctness（B1 + B2）

Status: completed
Targets: `src/binding/bind-resolver.ts`、`src/symbols/base-shapes/{line,arrow,pipe}.ts`、`docs/components/industrial-hmi/design-data-binding.md`、`design-symbols.md`

- Item Types: `Decision`、`Proof`、`Fix`

- [x] **Decision-B2**（裁定）：line/arrow/pipe 的 width/height 绑定——「加 applyProps 重算 points」vs「移除 points-based 形的 width/height 可绑定声明」。默认采 (a) applyProps 重算（保留 author 绑定能力，几何响应可观测）；若 live 技术约束（如 leafer Line points 不可运行期改）证伪 (a)，采 (b) 收紧可绑定声明 + 文档化替代路径。裁定写入 `design-symbols.md`。**注意**：line.ts 与 arrow.ts 已定义 `defaultGeometryPoints`，但 `pipe.ts` **未定义**——选 (a) 时 pipe 需补齐 `applyProps`（与 line/arrow 一致），选 (b) 时三个 shape 统一收紧声明。
- [x] **Proof-B1**（failing-first）：`bind-resolver.test.ts` 新增——`resolveBinding({property:'visible', point, format:'%s'})` 返回 `false`（boolean），非 `"false"`（string）；`resolveBindings` 对 `visible`/`opacity` 绑定不施加 format。
- [x] **Fix-B1**：`bind-resolver.ts` `resolveBinding` 引入「文本类属性」集合（`text`/`fill`/`stroke`/`textColor`），仅这些 property 施加 format；其余属性 format 被忽略（或 `resolveBindings` 层按 property 过滤）。`design-data-binding.md` 同步 format 适用域。
- [x] **Proof-B2**（failing-first）：line/arrow/pipe applyProps 单测——width/height 经 patch 变更后 `node.points` 重算（断言新 points 数值），绑定路径产出可见几何变化。
- [x] **Fix-B2**：按 Decision-B2 落地。若 (a)：line/arrow/pipe `ScadaSymbolDefinition` 增 `applyProps`（从 width/height 重算 points 并写回 `node.points`）；若 (b)：`BINDABLE_PROPERTIES` 按 shape 类型收紧 + validator 拒绝 + `design-symbols.md` 文档化。`design-symbols.md` 同步绑定契约。

Exit Criteria:

- [x] `bind-resolver.test.ts` failing-first 用例由红转绿，`visible:false` 绑定 resolve 为 boolean `false`（非 truthy 字符串）。
- [x] line/arrow/pipe applyProps/绑定契约 failing-first 用例由红转绿（按 Decision-B2 选定方案的可观测结果）。
- [x] `design-data-binding.md`（format 适用域）+ `design-symbols.md`（points-based 形 width/height 契约）同步 live baseline。
- [x] 局部 typecheck 通过（binding + symbols 模块）。

### Phase 2 - State-driver / resting-state 显式偏好（B3）

Status: completed
Targets: `src/binding/{dirty-collector,value-to-state}.ts`、`src/serialization/{config-types,validate}.ts`、`docs/components/industrial-hmi/design-data-binding.md`

- Item Types: `Decision`、`Proof`、`Fix`

- [x] **Decision-B3**（裁定）：state-driver 选择（`lookupSymbol(...)[0]`）与 default-state 回落（`keys[0]`）的显式偏好机制——选项：(a) `ScadaStateDeclaration` 增可选 `stateSource?: string`（声明级 state-driver pointId/binding 显式指定）+ default-state 命名偏好链（`run`→`normal`→`off`→首键）；(b) 仅修 default-state 命名偏好，state-driver 仍取 `[0]` 但加文档注记。默认采 (a)（声明级显式 + 命名偏好双保险）。裁定写入 `design-data-binding.md`。**`stateSource` 形状裁定**：携带 `(pointId, property?)` 对——`dirty-collector.ts:371-380` `resolveStateScale(symbolId, primary)` 读 `primary.property` 查 `binding.scale`，故 `stateSource` 必须能解析出 `property`（缺省时回落到该 pointId 的首个绑定 property，并在 `property` 缺失时跳过 binding-scale 转发、回退纯值判定）。`stateSource` 字段格式建议 `"pointId"` 或 `"pointId.property"`，validator 校验引用合法。
- [x] **Proof-B3**（failing-first）：`value-to-state.test.ts` + `dirty-collector` 集成测试——states key 经 `Object.keys` 整形重排（`{stop:...,run:...}` vs `{run:...,stop:...}`）后 `defaultState` 返回稳定值；`stateSource` 显式声明时 `collectStates` 用声明 pointId 作 state-driver（非 `[0]`）。
- [x] **Fix-B3**：按 Decision-B3 落地——`value-to-state.ts` `defaultState` 命名偏好链；`config-types.ts` 增 `stateSource?`；`dirty-collector.ts:344` 优先 consult `declaration.stateSource`；`validate.ts` 校验 `stateSource` 引用合法。`design-data-binding.md` 同步。

Exit Criteria:

- [x] `value-to-state.test.ts` + 集成测试 failing-first 用例由红转绿，key 序重排不改变 default-state / state-driver 语义。
- [x] `design-data-binding.md` 同步 state 偏好语义（命名偏好链 + stateSource）。
- [x] 局部 typecheck 通过（binding + serialization 模块）。

### Phase 3 - Point-store 收敛（B4 expression-scale + B5 re-entrant 归属）

Status: completed
Targets: `src/binding/point-store.ts`、`src/serialization/{config-types,validate}.ts`、`docs/components/industrial-hmi/design-data-binding.md`

- Item Types: `Decision`、`Proof`、`Fix`

- [x] **Decision-B4**（裁定）：declaration 级 `scale.expression`——「write 时注入 compiler 求值」vs「validator 拒绝并指向 binding-scale」。评估耦合：write 时求值需 PointStore 持有 compiler（当前 PointStore 纯逻辑域无 compiler 依赖），耦合较重。默认采 (b) validator 拒绝 declaration expression-scale + 错误码指向 binding-scale（binding 层 `applyScale` 已消费 expression）；若人审/审阅子 agent 主张 (a)，升级裁定。裁定写入 `design-data-binding.md`。**注意双 drop site**：`point-store.ts:283-288` `convert` 与 `value-to-state.ts:35-44` `applyLinearScale` **均**跳过 expression-scale（`'expression' in scale → return value`）；选 (b) 时 validator 在 declaration 层拒绝即可同时关闭两处 drop，选 (a) 时两处均需注入 compiler 求值（耦合面翻倍，进一步支持 (b)）。
- [x] **Proof-B4**（failing-first）：`point-store.test.ts` 或 `validate.test.ts`——declaration 带 `scale.expression` 时（按裁定）或被 validator 拒绝（错误码指向 binding-scale），或在 write 时正确求值；不再静默丢。
- [x] **Fix-B4**：按 Decision-B4 落地。`config-types.ts`/`validate.ts`/`point-store.ts` 协同；`design-data-binding.md` 同步 scale 消费语义（declaration linear-only + binding expression）。
- [x] **Proof-B5**（failing-first）：`point-store.test.ts` re-entrant 场景——listener A（pointId=p1）内回写 `setPointValue('p2', ...)`，listener B（pointId=p2）throw；断言 `onSubscriberError` 收到 `(pointId='p2', error)`（非 `p1`）。
- [x] **Fix-B5**：`point-store.ts` re-entrant 归属修复——`events.emit` 携 sidecar `contextPointId`（每订阅者回调用真正 pointId 包装 onListenerError），或 `PointStore.applyValue` 内 listener 循环显式 try/catch 用当前 pointId（已部分存在 `:266-272`，但 `events.emit('point:change')` 路径仍走 `lastNotifyPointId`）。消除 `lastNotifyPointId` 覆盖竞态。

Exit Criteria:

- [x] `point-store.test.ts`/`validate.test.ts` failing-first 用例由红转绿，expression-scale 不再静默丢（按裁定可观测：拒绝或求值）。
- [x] re-entrant 归属 failing-first 用例由红转绿，`onSubscriberError` 收到正确 pointId。
- [x] `design-data-binding.md` 同步 scale 消费语义。
- [x] 局部 typecheck 通过（binding + serialization 模块）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见本 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，task `ses_0309f074dffeV8JJkBvOFbel4Y`）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - **Major/Blocker：零**（逐条 citation 经 live repo 核对全部准确：bind-resolver.ts:109-111 / value-to-state.ts:46-51 / dirty-collector.ts:344 / point-store.ts:121,264-265,283-288 / base-shapes {line,arrow,pipe}.ts points at create 无 applyProps）。
  - **Minor-B2 落地**：Decision-B2 补注——pipe.ts 未定义 `defaultGeometryPoints`（line/arrow 有），选 (a) 时需补齐 pipe applyProps，选 (b) 时三 shape 统一收紧声明。
  - **Minor-B3 落地**：Decision-B3 补 `stateSource` 形状裁定——携带 `(pointId, property?)`，缺省 property 时回落该 pointId 首绑定 property 并在 property 缺失时跳过 binding-scale 转发（解决 `resolveStateScale` 读 `primary.property` 的依赖）。
  - **Minor-B4 落地**：Decision-B4 补「双 drop site」注记——`point-store.ts convert` 与 `value-to-state.ts applyLinearScale` 均跳过 expression-scale，选 (b) validator 拒绝同时关闭两处、选 (a) 两处均需注入 compiler（进一步支持 (b) 默认）。
  - **Minor-B3 baseline 措辞**：保留原文（"无 run 键时"已准确，`value-to-state.ts:49` 已偏好 `run` 键，key 序依赖仅在无 `run` 时显现）。
  - **Cross-plan check**：与 plan `{0653-4}` 零 scope 重叠，split 经独立 closure criteria + 独立 owner-doc obligations 证成（Rules 22–26），不应合并。

## Closure Gates

- [x] B1–B5 五项 confirmed live defect 已修复并各带 focused regression proof（断言结果值/可观测行为）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect。
- [x] `docs/components/industrial-hmi/design-data-binding.md` + `design-symbols.md` 同步到 live baseline（format 适用域、scale 消费、state 偏好、points-based 形绑定契约）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 本 plan 暂无 deferred 项。若 Phase 1 Decision-B2 选 (b)（移除 width/height 可绑定声明），则「leafer Line points 运行期不可改」的技术约束证据记入此处作 `watch-only residual`。

## Non-Blocking Follow-ups

- 浏览器级像素验证（line/arrow/pipe width/height 绑定几何响应）作 watch-only residual（attrs/逻辑级单测已覆盖，mock 不建模真实 leafer Line points 运行期改写）。
- sibling plan `2026-08-05-0653-4` 的 in-scope 项不在此追。

## Closure

Status Note: B1–B5 五项 P2 silent-defect 全部收口，每项带 focused failing-first regression proof，包级 640 tests 全绿 + workspace 全量 typecheck/build/lint/test 全绿，owner-doc 已同步。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，closure audit)
- Evidence:
  - **B5**：`point-store.ts:139` `new EventHub<PointStoreEvents>()` 无 `onListenerError` 选项；`:281` `emitWith('point:change', (error) => this.reportSubscriberError(pointId, error), payload)` 闭包捕获正确 pointId；`:70-82` `emitWith` 方法存在；全文件无 `lastNotifyPointId` 字段（仅注释 :67/:279-280）。Proof test `scada-robustness-hardening.test.ts:166-195` 经 `vitest run` 确认 GREEN（re-entrant 写 p2 + p1 emit throw → 归属 'p1' 非 'p2'）。
  - **B4**：`validate.ts:299-306` 拒绝 declaration 级 `scale.expression` 并指向 binding-scale；`point-store.ts:299-304` convert 与 `value-to-state.ts:39` applyLinearScale 均跳过 expression（validator 为关闭两处 drop 的 gate）。Proof test `serialization.test.ts:129-151` 确认 GREEN（declaration expr 被拒、linear 接受、binding expr 接受）。
  - **B1**：`bind-resolver.ts:42` `FORMAT_TARGET_PROPERTIES = {text,fill,stroke,textColor}`；`:124` `isFormatTargetProperty(property)` gating format。Proof test `bind-resolver.test.ts:124,136,141,147,153`。
  - **B2**：`line.ts:46-56`/`arrow.ts:48`/`pipe.ts:52` 均有 `applyProps` 从 width/height 重算 points（`node.set({ points: linePoints(w,h) })`）。
  - **B3**：`value-to-state.ts:50-58` run→normal→off→keys[0] 偏好链；`config-types.ts:48` `stateSource?: string`；`dirty-collector.ts:344,377-386` 优先 consult `declaration.stateSource`；`validate.ts:135-137` 校验 stateSource 非空字符串。Proof test `serialization.test.ts:308-320`。
  - **Docs**：`design-data-binding.md:106-107`（B1 format 适用域 + B4 scale 消费）、`:197`（B3 state 偏好）已同步。
  - **Tests**：`pnpm --filter @nop-chaos/flux-renderers-industrial test` → 46 files / 640 tests 全绿（B5 proof test 占 639→640 增量）。
  - **Plan consistency**：Phase 1/2/3 均 `Status: completed`，所有条目 `[x]`，仅本 closure-audit gate 原为 `[ ]`（现已由本审计 tick）。

Follow-up:

- no remaining plan-owned work（browser-level 像素验证作 watch-only residual 已记于 Non-Blocking Follow-ups）。
