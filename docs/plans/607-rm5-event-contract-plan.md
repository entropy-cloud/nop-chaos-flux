# 607 RM-5 事件契约单源化：eventContracts 收敛至字段条目

> Plan Status: completed
> Last Reviewed: 2026-10-16
> Source: `docs/backlog/renderer-metamodel-roadmap.md` RM-5；`docs/analysis/2026-10-15-renderer-definition-metamodel-review.md` A3
> Related: 前置 plan 605（RendererFieldContract.payload 预留位）/606（propContracts 单源先例）

## Purpose

事件声明收敛到字段条目单源：`fields` 条目 `kind: 'event'` 经 `contract.payload`/`displayName`（RM-3 预留位）承载事件契约，`eventContracts` 记录与 `RendererEventContract` 双声明通道删除；`contract-honesty.ts` 的双源合并逻辑随之简化为 fields 单源；`resolveRendererAuthoringContract().events` 改 helper 派生视图。

## 授权链（保护区）

flux-core（Shape 字段删除+helper）+ renderer definition fields（事件声明改写）均 plan-first ✓。公开导出面收缩：`RendererDefinitionShape.eventContracts` 字段删除（roadmap RM-5 明文授权"eventContracts 转派生视图或删除"）。人工授权链：**用户 goal 指令（2026-10-15）四要素**（同 603-606）。

## Current Baseline（live 核对 2026-10-15，HEAD 4ecefa1ee）

- **eventContracts 声明（R1 M2 口径勘正，live grep HEAD 4ecefa1ee）**：`eventContracts:` 声明 30 文件 = 生产侧 23（flux-renderers 各 definitions 文件含 crud/echarts/layout/wizard/process-display/pivot/mobile/map/form/graph/industrial×2 + code-editor + playground `report-designer-cell-style-panel.tsx:73` 空声明 + flux-react fixture 与 contract-honesty-harness；flow-designer/spreadsheet **零声明**[初稿误列]）+ 测试侧 7；scripts 1（check-designer-conformance `.mjs` 字面锚）为声明外单列（见 B1）。条目形态 `RendererEventContract { displayName; description?; payload?: FluxValueShape }`（`renderer-definition-types.ts:61-65`）。only-key 形态真实存在（echarts 9 EC 键/0 fields event 条目；industrial 两文件全 EC）。
- **消费面全枚举（R1 M3 勘正为四类）**：①`renderer-authoring-contract.ts:83` `events: definition.eventContracts ?? {}`（tooling 数据面）；②`contract-honesty.ts:438-450` `findUnreferencedContracts` 双源合并（A3 证据）；③**flux-guide 生成器**：`flux-guide/scripts/generate-types.mjs:136,160-163` 直读 `def.eventContracts`（README:25 自述）——RM-4 flux-guide 同步先例义务适用；④测试面断言与 harness（`contract-honesty-harness.ts:155-200` H7 探针注入 EC-only probe、`computeContractHonestyDiscoveryCounts`:98 基线口径——R1 m3：非纯机械，需合成 fields event 条目改写）。**编译器不读 eventContracts**（RM-3 零改动集裁定）。
- **payload 预留位**：`RendererFieldContract.payload?: FluxValueShape`（plan 605 落字"RM-5 预留"）。
- 基线验证：HEAD 4ecefa1ee 五门禁全绿（RM-4 收口提交）。并行 RM-9 在途（roadmap/dev log 混合脏，hunk 级 staging）。

## Goals

- helper `resolveRendererEventContracts(renderer): Readonly<Record<string, RendererEventContract>>`：fields kind:'event' 且带 contract 的条目 → `{ displayName: contract.displayName ?? key, description: contract.description, payload: contract.payload }`；`resolveRendererAuthoringContract().events` 切 helper。
- `contract-honesty` findUnreferencedContracts 事件源简化为 fields 单源（双源合并逻辑删除）。
- 30 声明文件机械迁移（生产 23 + 测试 7；`eventContracts[K]` → fields 条目 kind:'event' 挂 `contract: { displayName, description?, payload }`；only-key 补条目；harness/fixture 语义改写单列）后删除 `RendererDefinitionShape.eventContracts` 字段与 `RendererEventContract` 保留为 helper 返回视图类型。
- `check-designer-conformance.mjs` 重锚（B1）：`needsEventContracts` 三 family（word/scada/dashboard）的 `dirContains('eventContracts')` 字面锚改新形态锚（如 `kind: 'event'`+contract 载体），同步 `scripts/__tests__/check-designer-conformance.test.ts` 标记串（RM-4 finite-prop-contracts 重锚先例）。
- 判别：迁移前后 authoring `events` 输出 JSON 逐字节等价（探针按 RM-4 模式重建[R1 m2]，events 维度、**递归键排序归一**——helper 派生键序来自 fields 数组序与 EC 声明序可能不同）；contract-honesty 简化后门禁零豁免新增；flux-guide schema.d.ts 重生成零差异判别。

## Non-Goals

- 不动 scopeExportContracts/injectedLocals（RM-6）；不动 fields 事件编译语义；不加同 key 双写一致性门禁（迁移后通道消失）。

## Scope

### In Scope

- flux-core：helper + authoring 切换 + contract-honesty 简化 + Shape.eventContracts 删除 + 单测。
- 30 声明文件迁移（生产 23 + 测试 7；子代理清扫，RM-4 先例）+ ~20 只读消费位（`?.eventContracts` 读点，typecheck 直跑枚举兜底）。
- `check-designer-conformance.mjs` 重锚三 family（+`__tests__` 标记串同步）。
- flux-guide 生成器去 `def.eventContracts` 直读 + schema.d.ts 重生成零差异判别。
- docs：renderer-interfaces.md events 行、renderer-runtime.md 事件相关表述（grep 定）。
- 快照判别（探针 events 维度）+ roadmap 状态流转 + daily log。

### Out Of Scope

- RM-6~RM-9；fields 事件编译管线；e2e。

## Failure Paths

不适用：结构重排零行为（tooling 视图 JSON 等价快照兜底）。

## Test Strategy

档位选择：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**——判别承载=events 维度快照（探针扩展 dump `resolveRendererAuthoringContract(d).events`，迁移前后 diff 零差异；变异自证）；contract-honesty 门禁测试族回归（先例既有 harness）。

## Execution Plan

### Phase 1 - helper + 快照基建（flux-core，不切消费面——R1 M1 时序裁定）

Status: completed
Targets: `renderer-prop-contracts.ts`（或旁）、flux-core 单测、探针重建

- Item Types: `Fix`、`Proof`

- [x] `resolveRendererEventContracts` helper：fields kind:'event' 带 contract → RendererEventContract 视图（displayName 缺省 key、payload 透传、description 透传、无 contract 事件条目不入 map）。
- [x] Proof：helper 单测两组（视图构造+payload 透传+无 contract 不入 map / displayName 缺省 key）——708/708 绿。
- [x] 探针重建（RM-4 模式）：authoring events 视图 dump（递归键排序）+ 迁移前快照 `_tmp/rm5-pre-snapshot.json`（155 renderer，34 个非空 events 视图）。初版探针误 dump helper 视图已当场修正。

Exit Criteria:

- [x] flux-core focused typecheck+test 绿（708/708）；快照落盘且集合与迁移文件对账。

### Phase 2 - 迁移 + 消费切换 + 简化 + 旧形态删除 + 判别（R1 M1 重排：切换在迁移后）

Status: completed
Targets: 生产+测试声明文件（~30）、`renderer-authoring-contract.ts:83`、`contract-honesty.ts:438-450`、`RendererDefinitionShape.eventContracts`、`check-designer-conformance.mjs`、flux-guide

- Item Types: `Fix`、`Proof`

- [x] 子代理清扫：21 声明文件+1 空声明（双写挂载 17/only-key 补条目 3[echarts 9 键共享常量派生/industrial×2]/空声明 1）；harness 改写（H7/guard-effective 合成 fields event 条目、discoveryBaseline 4 包同步[basic 13→18/content 6→13/data 23→29/form-advanced 0→25，门禁判定语义不变]）；只读消费位 16 文件切 helper；typecheck 枚举归零。**执行中类型裁定**：事件 contract 无 shape → 新增 `RendererEventFieldContract` union（SchemaFieldRule.contract 改 union + helper 'shape' in 收窄守卫，prop shape 必填裁定原样保留）。
- [x] authoring :83 `events: resolveRendererEventContracts(definition)`；contract-honesty :438-450 事件源改 fields 单源（双源合并块删除+JSDoc 同步）。
- [x] 删 `RendererDefinitionShape.eventContracts` 字段（RendererEventContract 保留为视图类型）。
- [x] `check-designer-conformance.mjs` 三 family 锚改 `kind: 'event'`+`payload:` 双锚 + `__tests__` fixture seed 行同步（B1）。
- [x] flux-guide 生成器去直读（经 loadFluxCore 注入 helper）+ 重生成：schema.d.ts 仅头注释 diff（68214 bytes 不变）、index.ts 零 diff（M3）。
- [x] 判别：快照 diff 零差异（pre/post sha256 f167d45f，155 renderer/93 事件键）→ 变异自证（echarts onDataZoom payload unknown→string → diff 非零 → sha256 恢复）→ contract-honesty 六包套件+authoring 测试族回归绿。

Exit Criteria:

- [x] 全仓 src `eventContracts:` 归零；快照零差异+变异实录；conformance 重锚后 `pnpm check` exit 0；flux-guide 零差。

### Phase 3 - docs + 收口验证

Status: completed
Targets: docs/architecture + docs/components + flux-guide README（grep 定）

- Item Types: `Fix`

- [x] renderer-interfaces.md 三处（字段组/events 职责块/editableProps 来源）；docs/architecture 六文件清残（runtime/schema-file-validator/lazy-loading/capability-contract-model/word-editor）；docs/components 巡检（历史性提及不改写）。
- [x] 全量五门禁（五链 exit 0，`_tmp/rm5-closure-gates.log`）。

Exit Criteria:

- [x] docs 与 live 一致；五门禁全绿。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh 子 agent 填写。

- Reviewer / Agent: agent_de04574f（独立 fresh 子 agent，三轮 live 重证）
- Verdict: `pass`（R1 fail 1B/3M/4m → 修订 → R2 fail 1M 残留[Goals/Scope 旧计数 28 未同步] → 修正 → R3 pass 0B/0M）
- Rounds: 3
- Findings addressed: R1 B1=check-designer-conformance 三 family 字面锚必翻红（重锚+**tests** 标记串入 Phase 2）；M1=helper 单源切换先于迁移致 events 全空+多包红窗（Phase 重排：Phase 1 只 helper+单测+快照基建，切换/简化/删除移 Phase 2 迁移后）；M2=计数生产/测试比例颠倒+flow-designer/spreadsheet 零声明勘误+only-key 形态落字（R2 残留 28→30 全传播+算式 30=23+7+scripts 单列）；M3=flux-guide 生成器第四消费面（枚举+Phase 2 去直读+重生成零差）；m1 行号/m2 探针重建+递归键排序/m3 harness 改写点名/m4 docs 清残范围放宽。

## Closure Gates

- [x] 单源化落地（helper+切换+简化）且 events 快照零差异（pre/post sha256 f167d45f，155 renderer/93 事件键）+判别变异实录在案（audit 亲证：echarts payload 变异→恰 1 行 diff→sha256 恢复→归零）
- [x] 旧形态删除且全仓 eventContracts: 声明归零 grep 判别=0 在案（.eventContracts 读点=0；schema.d.ts=0）
- [x] 全仓 typecheck/build/lint/test 全绿 + check 零新增红 + 契约门禁零豁免新增（audit 亲核五链日志：42 套件全 passed 零 failed、conformance all passed）
- [x] owner docs 同步且与 live 一致（closure audit M1 editor-designer-standard 五处 MUST 条款清残 + m1-m4 四处随批修复后复验）
- [x] roadmap RM-5 状态流转 + daily log 条目（hunk 级 staging 随本提交）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（agent_dc0c3b14，R1 issues 0B/1M/4m 有条件批准 → M1+4m 全部修复后批准）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（e2e 不重跑，本条与提交信息披露）

## Deferred But Adjudicated

（无——执行中如有推翻/改判，当场落本节）

## Non-Blocking Follow-ups

- RendererEventContract 类型保留为 helper 视图返回类型（authoring 消费面形态稳定）。

## Closure

Status Note: RM-5 三件交付全部落地——①事件声明单源：fields 条目 kind:'event' 内联 contract（payload 载体，RM-3 预留位启用；事件无 shape → 执行中新增 `RendererEventFieldContract` union 裁定，prop shape 必填裁定原样保留）；②21 声明文件+1 空声明迁移+harness 语义改写（discoveryBaseline 4 包同步）；③消费面切换（authoring :83 + contract-honesty fields 单源[R1 M3 证据块删除] + conformance 重锚 + flux-guide 生成器）。结构等价：authoring events 视图快照 155 renderer 零差异（判别变异 audit 亲证）。全链 exit 0（42 套件零 failed）；e2e 未重跑（结构重排零行为，判别由快照与六包 honesty 套件承载，提交信息披露）。RM-6 承接 scope 符号单源化。

Closure Audit Evidence:

- Auditor / Agent: agent_dc0c3b14（独立 fresh 子 agent，R1 issues 0B/1M/4m 有条件批准；M1=editor-designer-standard 五处 MUST 条款仍指令已删通道、m1=word-editor 时态句、m2=flux-guide README、m3=评审提示词清单、m4=RendererFieldContract JSDoc payload 消费状态——全部修复后批准）
- Evidence: 快照零差异+变异判别亲证（sha256 f167d45f）；七位点逐项对账亲证（helper/authoring/honesty/Shape/conformance/flux-guide/类型裁定）；迁移三文件抽验（basic 双写逐字/echarts 常量派生/harness 语义保持）；全仓归零亲证（声明/读点/schema.d.ts 三层=0）；范围纪律亲证（RM-9 零混入；两个 RM-5 自有拆分新文件[list-renderer-definition/diff-view-definition]须入提交——已纳入）；门禁日志亲核（42 套件零 failed）

Follow-up:

- src 内历史性注释（propContracts/eventContracts 提法，audit m2 部分）：RM-6/7 前顺手项，非阻塞。
- 其余：no remaining plan-owned work。
