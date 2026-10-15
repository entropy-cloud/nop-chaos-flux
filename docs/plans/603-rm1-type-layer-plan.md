# 603 RM-1 类型层收口：propSchema 死字段删除 + CompiledRendererContract 派生化 + registry 入参类型化

> Plan Status: completed
> Last Reviewed: 2026-10-15
> Source: `docs/backlog/renderer-metamodel-roadmap.md` RM-1；`docs/analysis/2026-10-15-renderer-definition-metamodel-review.md` A1/B6/B7/C（下称"分析报告"）
> Related: 前置 `docs/plans/602-rm0-retention-policy-plan.md`（completed）；mission `missions/renderer-metamodel.json`

## Purpose

消灭元模型类型层的四处手抄/死重/松类型：①`RendererDefinitionShape.propSchema` 死字段及其合成逻辑分支；②`CompiledRendererContract` 对 `ValidationContributor`/`RendererValidationDefaults`/`ScopePolicy` 的逐字段手抄（漂移风险最高处，改 Pick 派生）；③`RendererDefinition` 重复 `type` 声明；④registry `register` 的"component 必填"不变式只存在于运行时 throw、类型不可见（收 `RegisteredRendererDefinition`）。附带 `RendererRendererClass`→`RendererClass` 改名（留 alias 过渡导出，分析报告 C 表首项、R1 M2 并入）。

## 授权链（保护区与公开导出面）

- 本 plan 触保护区：`packages/flux-core/src/`（plan-first ✓ 本 plan 即载体）；Renderer definition fields（`RendererDefinitionShape` 增删，plan-first ✓；对齐证据 `docs/references/renderer-interfaces.md` 在 Phase 4 同步）。
- 公开导出面**新增**：`RegisteredRendererDefinition`、`RendererClass` 类型导出（flux-core）。公开导出面**修改（既有导出签名收窄）**：`RendererRegistry.register` 入参、`createRendererRegistry`/`registerRendererDefinitions` 入参、`defineRenderer` 返回类型与 entry 入参——均为 roadmap RM-1 明文授权范围（"registry register 签名收 RegisteredRendererDefinition"）。flux-react 侧 `ensureRendererComponent`（`auto-renderer.tsx:112-114`，声明返回 `RendererDefinition`；调用点 `defaults.ts:9`、`schema-renderer.tsx:187`）：**桥机制（WeakMap 记忆化）不动**；其签名/断言如因 register 类型化涟漪必须调整，属 Phase 2 声明级修复，不构成桥机制变更。
- 人工授权链落字：**用户 goal 指令（2026-10-15）四要素**——①执行 `renderer-metamodel-roadmap.md`；②直到彻底完成；③每个工作项按 plan guide 拟制计划完成；④每个计划完成后自动提交一次（CX-20 plan 600 先例：用户 goal 指令四要素落字 = plan 授权链）。

## Current Baseline（live 核对 2026-10-15，HEAD fd0626003）

> 基线 HEAD 快照随并行会话推进漂移（R1 m1）：起草时 a9906c05b，修订时 fd0626003（knip 基线修剪，仅移除本轨道 RM-0 已删符号的陈旧登记）。执行前以 live HEAD 为准刷新，不重写本节历史。

- **propSchema 死字段**：`packages/flux-core/src/types/renderer-definition-types.ts:75` `propSchema?: Record<string, unknown>`。生产声明零（全仓 grep：仅 flux-core 字段本体、flux-compiler 消费/测试、docs）；唯一机制消费者 `packages/flux-compiler/src/schema-compiler/shape-validation-utils.ts` 的 `hasClosedPropModel`（L27-32，`propSchema ?? {}` 键数计入闭模型判定）与 `getAcceptedSchemaKeys`（L34-68，`Object.keys(propSchema)` 并入 accepted 集合）。二者生产调用点：`shape-validation-node-fields.ts:138`（accepted keys）与 `:239`（closed model）。测试面（live 实测 14 文件，与分析报告 A1 勘误注一致）：12 个 `*.test.ts` 内联声明 + 2 个 `*.test-support.ts` 共享 fixture——`schema-compiler-{contract-exploration,contract-exploration-part2,contract-exploration-part3,ajax-validation-migration,shape-validation-compile,event-declaration,shape-validation-action-source,schema-definition-unified-parity,validate-schema-adapter,host-action-validation.xui-actions,shape-validation-region,registry-core}.test.ts` + `schema-compiler-{diagnostics,host-action-validation}.test-support.ts`。声明形态统一为 `propSchema: { <key>: { type: X, ... } }`，**值为 `{ type: X }` 风格、非 `FluxValueShape`**（后者必填 `kind`，`schema-diagnostics/manifest.ts:16-31`，词表 `FluxValueShapeKind` 含 'string' 等 11 值）；仅作键集/闭模型输入（shape 值无人读）。
- **CompiledRendererContract 手抄**：`packages/flux-core/src/types/compiled-renderer-contract.ts:5-32`——`validation` 逐字段重抄 `ValidationContributor`（ctx.renderer 换名 `CompiledRendererContract<S>`，L17-19）；`validationDefaults` 重抄 `RendererValidationDefaults`（L21-24）；`scopePolicy` 字面量 `'inherit' | 'form'`。`toCompiledRendererContract`（L34-48）入参同样整体手抄 13 字段。`ScopePolicy`（`types/schema.ts:49`）= `'inherit' | 'form'`——与手抄字面量恒等，Pick 派生类型恒等。ctx 构造点 `flux-compiler/src/schema-compiler/validation-collection.ts:116,218` 传 `entry.component`（CompiledRendererContract）——与 `RendererDefinitionShape` 互为可赋值（双方均为"必填 type + 部分可选键重叠"的子集对：重叠键恰为 Pick 集 12 键，任一方向的可选缺失都落在可选位上），派生后双向无破坏。
- **重复 type**：`packages/flux-core/src/types/renderer-core.ts:220`（`RendererDefinition` 重声明 Shape 已有成员，同型）。
- **registry 松类型**：`packages/flux-core/src/registry.ts:3-7` 运行时 throw `component` 必填；`RendererRegistry`（`renderer-core.ts:224-229`）`register(definition: RendererDefinition)` 类型 optional。`registerRendererDefinitions`（registry.ts:52-61）、`createRendererRegistry(initialDefinitions)`（L9-21）同松动。`RendererDefinition` 无 component 的来源主渠道是 `defineRendererFamily`/`defineRenderer` builder（`renderer-definition-builder.ts:17-32`，entry 入参 `component?`、返回 `as RendererDefinition`——该双重断言属 roadmap 显式排除清单，不作为本 plan 工作项；builder 因 register 类型化而**必须**收 component 必填入参，`as` 目标类型随之机械更新，不据此声称排除项已修）。
- **RendererRendererClass**：定义 `renderer-definition-types.ts:18-21`；唯一直接消费 `types/renderer-authoring-contract.ts:13,19`；经 `types/renderer.ts` barrel → `types.ts` → `index.ts` 导出。全仓无其他符号引用（grep 实测）。
- **docs 待同步（live 提及 propSchema 的现行文档）**：`docs/references/renderer-interfaces.md:133`、`docs/architecture/schema-file-validator.md:50,368`、`docs/architecture/variant-vocabulary.md:81,264`、`docs/references/integrating-third-party-components.md:517`。历史性提及（归档/日志/分析报告/flux-design-principles 判例/workaround 审计 J 类示例）不改写。
- 验证基线：HEAD a9906c05b 为 RM-0 收口提交（typecheck/build/lint 42/42 + test 14,974/0 + check exit 0）；主工作树仍有并行会话脏路径（knip-baseline.json 等），本 plan 零触碰、提交严格限定本 plan 路径。

## Goals

- `RendererDefinitionShape` 无 propSchema：字段删除 + flux-compiler 两分支删除 + 14 个测试面文件迁移，**三者同一 Phase 原子落地**（B1 时序裁定：字段先删而消费面未迁会使中间态全仓 typecheck 必红；迁移映射 `propSchema: { K: { type: X } }` → `propContracts: { K: { shape: { kind: X }, displayName: 'K' } }` 含值归一化——M1 裁定：propSchema 值非 `FluxValueShape`，`type:` 键机械改 `kind:` 键；accepted-keys/闭模型行为恒等）。
- `CompiledRendererContract`/`toCompiledRendererContract` 零手抄：validation/validationDefaults/scopePolicy 等编译子集全部 `Pick<RendererDefinitionShape<S>, K>` 派生；`ValidationContributor` 增字段自动流入编译契约（B6 静默漏拷消灭）；Pick 键集对 Shape 改名编译期必现漂移错误。
- registry 类型面诚实：新增导出 `RegisteredRendererDefinition`；`register`/`registerRendererDefinitions`/`createRendererRegistry` 入参收 component 必填；运行时 throw 保留为防御；builder 入参 component 必填使保证诚实。
- `RendererRendererClass` 改名 `RendererClass`（alias 过渡导出保留）；`RendererDefinition` 重复 `type` 删除。

## Non-Goals

- 不修 `defineRendererFamily` 双重断言本身（roadmap 显式排除清单；本 plan 仅因 register 类型化必须收 builder 入参而机械触及 `as` 目标，排除项判定不变）。
- 不动 `RendererPlugin.wrapComponent` 签名松动（分析报告 B7 第三 bullet，roadmap RM-1 未列入）。
- 不动 flux-react `reactComponent` 双通道与 `ensureRendererComponent` WeakMap 桥（B7 有理由部分，分析报告 §三 站得住）。
- 不合并 fields/propContracts（RM-3/4）；不动事件/scope 契约（RM-5/6）。
- 历史文档（archive/logs/分析报告正文/设计原则判例）不改写；`docs/architecture/flux-design-principles.md` 与 `workaround-code-smell-audit-prompt.md` 中 propSchema 作为**判例引用**保留（判例指涉的历史事实不因删除而失真，且原则 7 判例表属并行会话管辖）。

## Scope

### In Scope

- `packages/flux-core/src/types/renderer-definition-types.ts`：删 propSchema 字段；`RendererRendererClass`→`RendererClass` + alias；（本文件内无其他变更）。
- `packages/flux-core/src/types/renderer-core.ts`：删 `RendererDefinition` 重复 `type`；新增 `RegisteredRendererDefinition`；`RendererRegistry.register` 入参类型化。
- `packages/flux-core/src/types/compiled-renderer-contract.ts`：Pick 派生化（接口 + `toCompiledRendererContract` 入参）。
- `packages/flux-core/src/registry.ts`：`registerRendererDefinitions`/`createRendererRegistry` 入参类型化；`validateDefinition` 运行时 throw 保留。
- `packages/flux-core/src/renderer-definition-builder.ts`：`defineRenderer` entry 入参 `component` 必填、返回类型 `RegisteredRendererDefinition`。
- `packages/flux-compiler/src/schema-compiler/shape-validation-utils.ts`：`hasClosedPropModel`/`getAcceptedSchemaKeys` 删 propSchema 分支。
- flux-compiler 14 个测试面文件：propSchema 内联声明/fixture 迁移 propContracts（机械键集镜像 + `{type:X}`→`{kind:X}` 值归一化）。
- 全仓 registry 类型化涟漪修复（typecheck 枚举，预计集中在 renderer 包注册数组声明与测试）。
- 判别钉测试（flux-core 类型面 expectTypeOf）+ 判别变异演示（记录于 plan/日志）。
- docs 同步四处（见 Current Baseline docs 待同步清单）+ `docs/references/quick-reference.md` 如有涉及（grep 实测无 propSchema/RendererRendererClass 命中，则不动）。
- roadmap RM-1 状态流转 + daily log 条目。

### Out Of Scope

- RM-2~RM-8 全部范围；任何运行时行为语义变更（本 plan 全部为类型层 + 测试迁移，生产行为逐字节等价）。
- 页面设计器/nop-debugger tooling 消费面（`resolveRendererAuthoringContract` 输出形状不变）。

## Failure Paths

不适用：类型层收口 + 零行为测试迁移，无错误处理/API 行为/外部集成面。风险面（派生导致的隐性类型不兼容、迁移破坏闭模型判定语义）由"迁移前后 flux-compiler focused 测试逐字节等价 + 全仓 typecheck"兜底。

## Test Strategy

档位选择：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**——类型层零行为收口；既有 flux-core registry 测试与 flux-compiler shape-validation/contract 测试族构成回归骨架（迁移保持覆盖不削弱）；新增 expectTypeOf 判别钉（B6 漏拷反向证明）入 flux-core 既有类型钉测试位；判别变异演示（Shape 键改名→Pick 键集 tsc 红）作为 Proof 项执行并记录，不以常驻测试形态固化（变异演示不可常驻）。

## Execution Plan

### Phase 1 - flux-core 类型面（propSchema 字段不动，其余类型变更）

Status: completed
Targets: `packages/flux-core/src/types/renderer-definition-types.ts`、`renderer-core.ts`、`compiled-renderer-contract.ts`、`registry.ts`、`renderer-definition-builder.ts`

- Item Types: `Fix`（死重/手抄/松类型 = 已坐实的契约漂移面）、`Decision`（RegisteredRendererDefinition 形态）、`Proof`

- [x] `renderer-definition-types.ts`：`RendererRendererClass` 改名 `RendererClass`，原名留 `export type RendererRendererClass = RendererClass;` alias（JSDoc `@deprecated` 过渡导出）；flux-core 内唯一直接消费 `renderer-authoring-contract.ts` 同步迁至新名。**propSchema 字段本 Phase 不动**（B1：字段删除与消费面迁移在 Phase 3 原子落地，避免中间态全仓红）。
- [x] `renderer-core.ts`：删 `RendererDefinition` 重复 `type` 声明；新增 `RegisteredRendererDefinition<S extends BaseSchema = BaseSchema, P extends Record<string, unknown> = RendererResolvedProps<S>>`（component 必填 + JSDoc 注册不变式说明）；`RendererRegistry.register(definition: RegisteredRendererDefinition, ...)`；`get/has/list` 返回面不动。
- [x] `compiled-renderer-contract.ts`：派生化落地——**最终形态与草案不同（执行发现①，见下）**：`type CompiledRendererContract<S> = { type: S['type']; validation?: ValidationContributor } & Pick<RendererDefinitionShape<S>, 'scopePolicy' | 'actionScopePolicy' | 'componentRegistryPolicy' | 'fields' | 'validationDefaults' | 'compilation' | 'wrap' | 'frameRootTag' | 'frameWrap' | 'staticCapable'> & { component?: unknown }`；`toCompiledRendererContract` 入参同构；函数体逐字段直赋不动。
- [x] `registry.ts`：`createRendererRegistry`/`registerRendererDefinitions` 入参 `ReadonlyArray<RegisteredRendererDefinition>`；内部 map 存储类型同步；`validateDefinition` 运行时 throw 保留（防御）。
- [x] `renderer-definition-builder.ts`：`defineRenderer` entry 入参 `component` 必填（`Omit<...,'component'> & { component: NonNullable<...> }`），返回 `RegisteredRendererDefinition`；`as` 目标机械更新。
- [x] Proof（判别钉）：`packages/flux-core/src/renderer-contract-types.test.ts`（toEqualTypeOf 三钉：validation/validationDefaults/scopePolicy 通道恒等派生）。**先红后绿实录**：①手抄态（变更前）给 `ValidationContributor` 加 `__rm1DriftProbe` 临时字段 → tsc 于钉位点 TS2344 红（实录后外科恢复）；Pick 派生后同钉绿。②Shape `validationDefaults` 临时改名 → `compiled-renderer-contract.ts` 两处 Pick 键集 TS2344 红 + 钉位点 TS2339 红（实录后外科恢复）。

**执行发现①（型变约束，交付推翻草案措辞）**：`interface … extends Pick<RendererDefinitionShape<S>, K>` 与等价 type-alias 两种形态都会使跨实例比较（`CompiledRendererContract<PageSchema>` → `<BaseSchema>`，经 `TemplateNode.component`）落入同泛型接口实例化捷径——`validation?: ValidationContributor<S>` 的 S 位点被测为逆变/不变，全仓 614 错误（真实现象：HEAD 经 git worktree 实证为零红，turbo 缓存在主树掩盖了真实 typecheck——本 plan 全部涟漪枚举改用 `pnpm -r --no-bail typecheck` 直跑口径）。手抄原形的双变安全性恰来自**内联匿名对象**。最终形态：S 仅存于协变 `type` 槽、`validation` 引非泛型默认实例 `ValidationContributor`、非泛型键走 Pick（键集改名漂移检测保留，判别钉②即证）。运行时对象逐字节恒等（compiler 原样拷贝 `definition.validation`）；仅编译面在经编译契约消费时把 schema/ctx 宽化为 Base——消费点 `validation-collection.ts` 以活动对象构造 ctx，类型满足、零断言。

Exit Criteria:

- [x] flux-core focused：`pnpm --filter @nop-chaos/flux-core typecheck` + `test` 绿（701/701）；`RendererRendererClass` 仅剩 alias 行；compiled-renderer-contract.ts 无字面量结构重抄。
- [x] `RegisteredRendererDefinition`/`RendererClass` 经 flux-core 公开导出链可导入。
- [x] 明示中间态：全仓 typecheck 此 Phase 后仍有 Phase 1 签名变更的下游红（Phase 2 收口），propSchema 面未动零新增红。

### Phase 2 - 涟漪收口（registry 类型化 + 重复 type 删除的全仓枚举修复）

Status: completed
Targets: 全仓 typecheck 枚举的注册面破坏点

- Item Types: `Fix`

- [x] 全仓 `pnpm -r --no-bail typecheck` 枚举：契约派生修正后生产唯一位点 21 文件（614 错误实例系跨包重复上报；首轮含型变问题的枚举 1448 位点已由执行发现①的最终形态消解大半）。
- [x] 两轮声明级清扫（子代理执行、执行会话亲证 typecheck 归零）：第一轮生产面 74 文件（注册数组注解 → `RegisteredRendererDefinition[]`、单量定义声明、`ensureRendererComponent` 返回类型诚实化为 Registered[WeakMap 桥机制不动，早退分支守卫不变仅加断言]、`createSchemaRenderer` 参数收窄、flux-compiler fixtures、`defineRenderer` 消费方）；第二轮测试面 111 文件（同一注解模式；防御 throw 测试 1 处按 registry.test.ts 先例单点断言 `as unknown as`；13 处未注册纯数据值保留 `RendererDefinition` 注解）。合计约 185 文件，全部注解/import/断言目标级。
- [x] 零运行时语句变更：两轮清扫报告+抽查一致；`git diff` 全集仅注解/import/断言目标/注释类型名。

Exit Criteria:

- [x] `pnpm -r --no-bail typecheck` exit 0（42/42 包，0 error TS）。
- [x] 破坏点修复不含任何运行时语句变更（清扫报告逐 hunk 自查 + 执行会话抽查）。

### Phase 3 - propSchema 原子移除（字段 + 机制分支 + 14 测试面文件）

Status: completed
Targets: `packages/flux-core/src/types/renderer-definition-types.ts`（仅 propSchema 字段行）、`packages/flux-compiler/src/schema-compiler/shape-validation-utils.ts` + 14 个测试面文件

- Item Types: `Fix`（死字段机制与死声明）、`Proof`

- [x] 同一提交内原子三步：①删 `renderer-definition-types.ts:75` propSchema 字段；②`shape-validation-utils.ts` `hasClosedPropModel` 删 `propSchema ?? {}` 键数项、`getAcceptedSchemaKeys` 删 propSchema 循环——闭模型判定与 accepted 集合对全部现存声明面恒等（生产零 propSchema 声明）；③14 个测试面文件机械迁移（30 位点）。
- [x] 迁移映射（M1 值归一化 + **执行中改判①**）：`propSchema: { K: { type: X, ...rest } }` → `propContracts: { K: { shape: { kind: 'unknown' }, displayName: 'K' } }`。改判理由：初版 `{kind: X}` 直译使迁移后的 shape 落入 propContracts 活性校验通道（propSchema 值惰性、propContracts 值被 flux-value-shape-validation 真实消费，裸 `object` 形状读 `.fields` 致 2 用例红）——`kind: 'unknown'` 是词表内的惰性通过形状（`case 'unknown': return true`），admission-only 语义精确保持；X 词表内值仅作历史记录不再落入 shape。X ∈ FluxValueShapeKind 词表核实成立（30/30 'string'/'object'）。
- [x] Proof（判别）：迁移前后 flux-compiler focused 测试逐字节等价（565/565 全绿；断言零改动——**唯一豁免见 Deferred 节 registry-core 条**）；`grep -rn "propSchema" packages/*/src` 全仓归零（exit 1 实测）。

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-compiler test` 全绿且 diff 证明测试断言零改动（仅声明形态迁移；registry-core 豁免条除外）；全仓 src propSchema 归零；全仓 typecheck 维持 exit 0。

### Phase 4 - docs 同步 + 收口验证

Status: completed
Targets: `docs/references/renderer-interfaces.md`、`docs/architecture/schema-file-validator.md`、`docs/architecture/variant-vocabulary.md`、`docs/references/integrating-third-party-components.md`

- Item Types: `Fix`（owner-doc drift 收敛）、`Proof`

- [x] `renderer-interfaces.md:133`：Authoring adaptation 行改 `propContracts` 口径。
- [x] `schema-file-validator.md:50,368`：闭 prop 面口径改 `propContracts`；:368 更新为 propContracts + propSchema 已删事实（RM-1/plan 603 注记）。
- [x] `variant-vocabulary.md:81,264`：accepted key 构成去 propSchema。
- [x] `integrating-third-party-components.md:517`：propSchema 行替换为 propContracts 行（`RendererPropContract` 指引）。
- [x] quick-reference.md 复核：grep propSchema/RendererRendererClass 零命中，无需变更。

Exit Criteria:

- [x] 四文档现行口径与 live 类型面一致；roadmap RM-1 → done、daily log 条目落字随收口提交。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh 子 agent 填写。

- Reviewer / Agent: agent_3b7cc8c0（独立 fresh 子 agent，30+ 锚点 live 亲证）
- Verdict: `pass`（R1 fail 1B/1M/5m → 按 B1+M1+五 m 修订 → R2 pass 0B/0M）
- Rounds: 2
- Findings addressed: R1 B1=Phase 顺序矛盾（字段删除先于消费面迁移致中间态全仓红、Phase 2 Exit 不可满足）——Phase 1 改 propSchema 字段不动、字段+分支+14 文件并入 Phase 3 同一提交原子三步、Phase 1 Exit 增明示中间态条；R1 M1=迁移映射缺值归一化（propSchema 值 `{type:X}` 非 FluxValueShape）——映射改 `{type:X}`→`{kind:X}`（X∈FluxValueShapeKind 词表，35/35 实测词表内，词表外当场裁决）；m1=基线 HEAD 快照漂移引句（a9906c05b→fd0626003）；m2=授权链点名四个既有导出修改面 + ensureRendererComponent"机制不动/签名声明级可调"澄清；m3=RegisteredRendererDefinition 泛型默认值补齐；m4="不相交可选子集"措辞改"必填 type + 部分可选键重叠子集对（Pick 集 12 键）"；m5=键集断言锚点改 :252-257/:268-271。

## Closure Gates

- [x] 四处类型层收口落地（propSchema 删/手抄消灭/重复 type 删/register 类型化）且判别钉先红后绿记录在案（audit 亲证变异→红→sha256 逐字节恢复）
- [x] flux-compiler 14 文件迁移完成，focused 测试断言零改动证明在案（565/565；唯一豁免 registry-core 已 Deferred 登记）
- [x] 全仓 typecheck/build/lint/test 全绿 + check 零新增红（登记制）+ 契约门禁零豁免新增（五链 exit 0，`_tmp/rm1-closure-gates.log`；test 16,519 passed/0 failed——与 RM-0 同口径求和基线 16,516 的 +3=新增判别钉 3 用例，closure audit m2 口径校正）
- [x] 生产行为零变更证明：diff 全集 = 类型/声明/测试声明形态/docs，无运行时语句变更（audit 抽 6 文件 + 全仓启发式扫描，仅 Phase 3 本体两分支删除为已声明位点）
- [x] owner docs 四处同步且与 live 一致（audit 抽查 1/2/2/1 行 diff 全一致）
- [x] roadmap 状态流转 + daily log 收口条目（随本提交；两文件为并行 RM-9 混合脏文件，hunk 级 staging 排除 RM-9 hunks）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（agent_0714ce30，R1 approved 0B/0M/2m，m1/m2 已随回写修复）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（e2e 不重跑，本条与提交信息披露）

## Deferred But Adjudicated

### registry-core.test.ts 元数据回传断言的 propSchema 字段移除

- Classification: `out-of-scope improvement`（字段删除的直接后果处理，非行为缺口）
- Why Not Blocking Closure: `schema-compiler-registry-core.test.ts` "preserves renderer metadata through the registry contract" 用例的输入字面量与 `toMatchObject` 断言各含一个 propSchema 块（JSON-Schema 风格透传元数据代表物）。字段本身已从模型删除，"保留该字段的回传"断言随之失去对象；移除该字段后其余 5 个元数据字段（displayName/category/icon/sourcePackage/defaultSchema）仍完整覆盖"registry 不裁剪元数据"的测试意图。这是本 plan 全部 565 个 flux-compiler 用例中唯一断言 delta，源于字段删除本身而非迁移失真。
- Successor Required: `no`
- Successor Path: —

## Non-Blocking Follow-ups

- `RendererRendererClass` alias 的下游迁移与最终删除：待 alias 过渡期结束后单独立项（deprecation 政策：docs 记录即可启动过渡）。
- `RendererPlugin.wrapComponent` 签名松动（B7 第三 bullet）：out-of-scope improvement，如需收口单独立 plan。

## Closure

Status Note: RM-1 四处类型层收口全部落地——①propSchema 死字段+机制分支+30 测试位点原子移除（admission 语义经 `kind: 'unknown'` 惰性形状精确保持）；②`CompiledRendererContract` 零手抄（最终形态：S 仅协变 type 槽 + 非泛型 `ValidationContributor` 引用 + 10 非泛型键 Pick——执行发现①：泛型 S 位点的 Pick 化会触发同泛型接口实例化严格捷径破坏跨实例协变，手抄原形的"双变安全"恰来自内联匿名对象；该发现已落字契约 JSDoc 与本 plan）；③`RendererDefinition` 重复 type 删 + `RegisteredRendererDefinition` 注册不变式入类型（register/两个批量入口/builder，运行时 throw 保留为防御）；④`RendererClass` 改名留 @deprecated alias。涟漪收口：两轮声明级清扫约 185 文件（生产 74+测试 111），`pnpm -r typecheck` 42/42 exit 0。判别钉三钉先红后绿（audit 亲证变异→红→sha256 恢复）。全量五门禁 exit 0（test 16,519/0，与基线同口径 +3）；e2e 未重跑（纯类型层+测试注解，提交信息披露）。

Closure Audit Evidence:

- Auditor / Agent: agent_0714ce30（独立 fresh 子 agent，R1 approved 0B/0M/2m；m1=Phase 3 Status 漏标 completed、m2=测试总数口径统一 16,519——均随回写修复）
- Evidence: flux-core 五文件+authoring-contract 逐锚点亲证；判别钉变异亲证（手抄回退模拟→钉 TS2344 红；Shape 键改名→Pick 双位点红→sha256 逐字节恢复）；迁移 30 处 `kind:'unknown'` 计数亲证 + propSchema 全仓归零亲证；涟漪抽 6 文件零运行时语句亲证 + auto-renderer WeakMap 桥逐行核实未动；型变健康三包独立 typecheck exit 0；文本一致性五处核对（预期中间态识别准确）；并行会话 RM-9 脏路径已识别并将 hunk 级排除

Follow-up:

- `RendererRendererClass` alias 的下游迁移与最终删除：待 alias 过渡期结束后单独立项。
- `RendererPlugin.wrapComponent` 签名松动（B7 第三 bullet）：out-of-scope improvement，如需收口单独立 plan。
- 其余：no remaining plan-owned work。
