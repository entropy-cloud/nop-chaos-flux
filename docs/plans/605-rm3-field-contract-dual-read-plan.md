# 605 RM-3 fields+propContracts 合并·阶段一：字段条目新形态落地 + 消费面双读

> Plan Status: completed
> Last Reviewed: 2026-10-15
> Source: `docs/backlog/renderer-metamodel-roadmap.md` RM-3；`docs/analysis/2026-10-15-renderer-definition-metamodel-review.md` A2/A3
> Related: 前置 `docs/plans/603-rm1-type-layer-plan.md`（completed，propSchema 已删）；RM-4（阶段二全量迁移+旧形态删除）承接本 plan

## Purpose

字段条目新形态落地：`fields` 条目可选承载 `contract`（值形状 + tooling 元数据），使"同 key 在 fields 与 propContracts 双写"从此有单条目表达；编译器、闭模型判定、tooling authoring 面、coverage 门禁全部改**集中式双读**（单一 merge helper）。旧形态只读不删、零迁移、零行为——为 RM-4 全量迁移铺路。

## 授权链（保护区）

本 plan 触保护区：`packages/flux-core/src/`（SchemaFieldRule 增可选成员 + merge helper，plan-first ✓）；renderer definition fields（新形态形态定义，plan-first ✓；对齐证据 `docs/references/renderer-interfaces.md` 在 docs phase 同步）；schema/contract validation（shape-validation 消费面，plan-first ✓）。公开导出面**新增**：`RendererFieldContract` 类型与 `resolveRendererPropContracts` helper（flux-core）。人工授权链：**用户 goal 指令（2026-10-15）四要素**（同 plan 603/604；CX-20 先例）。

## Current Baseline（live 核对 2026-10-15，HEAD 225605711）

- **双通道现状**：`fields: SchemaFieldRule[]`（编译期分类：kind region/event/reaction/prop + valueType/regionKey/params/isolate/lazyEval/compile 等编译语义，`flux-core/src/types/schema.ts:190-260`）与 `propContracts: Record<string, RendererPropContract>`（值形状校验 + tooling 元数据：shape/displayName/description/editorType/defaultValue/required，`renderer-definition-types.ts:30-37`）。凡有形状契约的 prop 必须两处各写一遍（分析报告 A2：66/41 文件，R2 统一口径）。
- **propContracts 消费面（live 全枚举）**：
  1. flux-compiler shape-validation 族：`shape-validation-node-fields.ts:47`（单 key 值形状校验 validateFluxValueShape）、`:75-93`（required 检查）、`shape-validation-analyze.ts:242`（嵌套 schema-definition transport findSchemaDefinitionShape）、`:428`（wrapped renderer 同）；
  2. `shape-validation-utils.ts`：`hasClosedPropModel`（RM-1 后仅 propContracts 键数）；
  3. flux-core `renderer-authoring-contract.ts:81-82`：tooling 面 `editableProps = definition.propContracts ?? {}`、`events = definition.eventContracts ?? {}`；
  4. `contract-honesty.ts`：findUnreferencedContracts 对 eventContracts 与 fields(kind:'event') 的双源合并（A3 证据，RM-5 承接）；
  5. coverage 门禁 `scripts/check-schema-prop-coverage.mjs`：**文本扫描器**，从 `fields[]` 提取 `key:` 与 `propContracts` 提取键取**并集**作已声明集合——fields 条目（含未来带 contract 的）的 key 已被计入，**无需改动**。
  6. **编译侧 schema-definition 分类（R1 M-1 补枚举）**：`flux-compiler/src/schema-compiler/node-compiler.ts:342` 与 `node-compiler-helpers.ts:445`——`findSchemaDefinitionShape(renderer.propContracts?.[key])` 是嵌套 schema/action prop 编译分类的唯一入口（该形状在现存声明广泛存在：crud.columns/tabs.items/dashboard 等）；不切换则新形态对此 prop 类静默非等价（形状校验生效而分类不发生）。
  7. `getAcceptedSchemaKeys`（`shape-validation-utils.ts:50-52` 读 propContracts；:54-58 已双读 fields）：**裁定无需切换**——fields 条目 key 已全量并入 accepted 集合，新形态自然覆盖（roadmap 点名项的显式裁定，非遗漏）。
  8. `scripts/check-finite-prop-contracts.mjs`（lint 链）：regex 硬编码特定渲染器旧形态 propContracts 块（button/tabs/table editorType 断言）——RM-3 零迁移不受影响；**RM-4 迁移时必须适配**（此处归属记载防漏项）。
- **eventContracts 消费**：tooling authoring 面（:82）+ contract-honesty 交叉核对；RM-5 收敛至字段条目，本 plan 的 contract 载体预留 `payload` 位（forward-compat，本 plan 不接 event 消费面）。
- **冲突语义现状**：同 key 双写时 fields 与 propContracts 各自被不同消费方读取（编译分类看 fields、形状/tooling 看 propContracts），无一致性门禁。
- 新形态设计约束（分析报告 §5.3）：合并后复合条目不得原样带进 `TemplateNode`——编译期一次展开、模板只存结果（现状即满足：fields 进编译管线，contract 不物化到模板）。
- 基线验证：HEAD 225605711 五门禁全绿（RM-2 收口提交）。主工作树并行会话 RM-9 在途（roadmap/dev log 混合脏，收口提交 hunk 级 staging）。

## Goals

- `SchemaFieldRule` 增可选 `contract?: RendererFieldContract`（新类型：displayName?/description?/editorType?/defaultValue?/**shape 必填**/required/payload?[RM-5 预留]）；零行为（无声明即无差异）。shape 必填与旧形态 RendererPropContract 对齐（R1 M-2 裁定：放弃无 shape 形态——tooling-only 契约是旧形态不存在的新能力，非本 plan 范围；displayName/editorType 随 shape 条目携带，同旧形态）。
- flux-core 新增集中式 merge helper `resolveRendererPropContracts(renderer)`：propContracts 为冲突权威（同 key 时旧形态胜出，RM-4 删旧形态后自然单源），fields(kind:'prop' 且带 contract) 补充 propContracts 未覆盖的 key；返回恒等 map（无 contract 声明时与 `propContracts ?? {}` 逐键恒等）。
- propContracts 消费面**切换集 = 上表 1/2/3/6**（6=编译侧 schema-definition 分类，R1 M-1）切 helper 双读；**零改动集 = 4/5/7/8**（4=contract-honesty 读 eventContracts/fields 不读 propContracts；5=coverage 扫描器 fields key 已计入；7=getAcceptedSchemaKeys 已双读 fields[显式裁定]；8=finite-prop-contracts regex 锚旧形态，RM-4 适配）。
- 判别：新形态-only fixture 通过闭模型判定、值形状校验、tooling editableProps 面（旧实现下必红）；旧形态行为逐字节不变。

## Non-Goals

- 不迁移任何现存声明文件（RM-4）；不删 propContracts/旧双读分支（RM-4）；不接 eventContracts/scope 契约消费面（RM-5/6，payload 仅类型预留）。
- 不动 `defineRendererFamily` builder（entry 透传，新形态自然可用）；不动 coverage 门禁扫描器。
- 不引入同 key 双写的一致性门禁（RM-3 过渡期允许双写，RM-4 收口时统一裁决冲突语义）。

## Scope

### In Scope

- `packages/flux-core/src/types/schema.ts`（SchemaFieldRule.contract 成员）+ `renderer-definition-types.ts`（RendererFieldContract 类型）+ 新 helper 模块（resolveRendererPropContracts）+ index 导出。
- flux-compiler 消费面切 helper：shape-validation-node-fields（两处）、shape-validation-analyze（两处）、shape-validation-utils（hasClosedPropModel）。
- flux-core authoring contract 切 helper（editableProps）。
- flux-compiler prop-coverage 测试族双读适配（如经 definition 对象消费则自动，逐文件核实）。
- 判别钉测试（新形态-only fixture）+ docs 同步（renderer-runtime.md propContracts Coverage Discipline 节、renderer-interfaces.md、quick-reference 如命中）+ roadmap 状态流转 + daily log。

### Out Of Scope

- RM-4~RM-9 范围；任何现存声明文件改写；e2e。

## Failure Paths

不适用：类型层 + 集中读法切换，无错误处理/API 行为/外部集成面。风险（helper 合并不当改变既有校验结果）由"无 contract 声明时恒等"判别 + flux-compiler 全量测试兜底。

## Test Strategy

档位选择：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**——零行为收口 + 新形态判别。helper 单测（merge 恒等/冲突权威/新形态补充三组）+ 新形态-only fixture 判别钉（旧实现下必红）+ flux-compiler 既有 565 用例回归骨架（零行为证明）。RM-3 非行为面项（roadmap Cross-Cutting 5 行为面列表不含 RM-3），无判别变异义务。

## Execution Plan

### Phase 1 - 新形态类型 + 集中 merge helper（flux-core）

Status: completed
Targets: `packages/flux-core/src/types/schema.ts`、`renderer-definition-types.ts`、新 helper、`index.ts/types.ts` 导出链（audit m-1 措辞校正）

- Item Types: `Decision`（新形态形态 + 冲突权威裁定）、`Fix`、`Proof`

- [x] `RendererFieldContract` 类型（renderer-definition-types.ts，紧邻 RendererPropContract）：displayName?/description?/editorType?/defaultValue?/**shape: FluxValueShape（必填）**/required?/payload?[RM-5 预留]。JSDoc：`required` 为编译期缺失诊断 + tooling 双消费（与 propContracts.required 同语义——validateRequiredPropContracts 产出 invalid-property-shape；与 SchemaFieldRule.required 的嵌套校验语义区分，R1 m-1）。
- [x] `SchemaFieldRule.contract?: RendererFieldContract`（schema.ts，JSDoc：单条目承载编译分类 + 值形状 + tooling 元数据；不物化进 TemplateNode）。
- [x] `resolveRendererPropContracts(renderer): Readonly<Record<string, RendererPropContract>>`（`src/renderer-prop-contracts.ts` 新模块 + index 导出）：①propContracts 全量底座（冲突权威）；②追加 fields 中 kind='prop' 且带 contract 的条目（key 未被 propContracts 覆盖时；contract.shape 必填故恒可构造 RendererPropContract）。恒等判别：全库现存声明（无 contract）下输出 ≡ `propContracts ?? {}`。
- [x] Proof：helper 单测五组（`renderer-prop-contracts.test.ts`）——恒等、冲突权威、新形态补充（region/event kind 不入 map）、displayName 缺省取 key、返回类型钉；flux-core 706/706 绿。

Exit Criteria:

- [x] flux-core focused typecheck + test 绿（706/706）；`RendererFieldContract`/`resolveRendererPropContracts` 经导出链可导入（types barrel + index 显式导出）。

### Phase 2 - 消费面双读切换（flux-compiler + flux-core authoring）

Status: completed
Targets: `packages/flux-compiler/src/schema-compiler/shape-validation-{node-fields,analyze,utils}.ts`、`schema-compiler/node-compiler.ts`、`schema-compiler/node-compiler-helpers.ts`、`packages/flux-core/src/types/renderer-authoring-contract.ts`

- Item Types: `Fix`、`Proof`

- [x] shape-validation-node-fields.ts：`inspectSchemaNodeFields` 入口单次取 map（:139），`validateKnownPropValue` 增 propContracts 参数下沉（:46/:52/:232），`validateRequiredPropContracts` 改经 helper（:78）。
- [x] shape-validation-analyze.ts:242/:428 嵌套 schema-definition transport：同切 helper（两函数各自循环外单次取 map：`inputPropContracts`/`wrappedPropContracts`）。
- [x] **编译侧分类切换（R1 M-1）**：node-compiler.ts:119 循环外 hoist `contracts` + :342 改 `contracts[key]`；node-compiler-helpers.ts:436 hoist + :445 改 `contracts[fieldKey]`——热循环外单次取 map（执行纪律备忘落实）。
- [x] hasClosedPropModel：`Object.keys(resolveRendererPropContracts(renderer)).length > 0`。
- [x] renderer-authoring-contract.ts:81 editableProps 切 helper（events 面不动，RM-5）。
- [x] flux-compiler prop-coverage 测试族核实：经 definition 对象与文本扫描两层均自动覆盖（fields key 并集）；`check-finite-prop-contracts.mjs` regex 锚旧形态块——零迁移下不受影响（RM-4 适配归属已记载）。
- [x] Proof（新形态判别钉，`schema-compiler-field-contract.test.ts` 五钉）：①required 缺值 invalid-property-shape；②值形状 invalid-property-value；③闭模型 unknown-property；④schema-definition 分类提取 region（fixture 按类型化条目语义修正：容器不带 type 使父内联 fieldRules 生效——§3.8）；⑤tooling editableProps。**先红后绿实录**：node-compiler 切换位临时变异回旧形态读法 → 分类钉红（1 failed）→ sha256 逐字节恢复（8ec9793b…）→ 570/570 绿。旧形态回归：flux-compiler 全量 565+5=570 用例绿（零行为证明）。

Exit Criteria:

- [x] flux-compiler + flux-core focused typecheck/test 全绿；新形态判别钉先红后绿实录在案；既有用例零改动零失败（570/570 + 706/706）。

### Phase 3 - docs 同步 + 收口验证

Status: completed
Targets: `docs/architecture/renderer-runtime.md`、`docs/references/renderer-interfaces.md`、`docs/references/quick-reference.md`

- Item Types: `Fix`、`Proof`

- [x] renderer-runtime.md `propContracts` Coverage Discipline 节增 "Inline field contracts (RM-3, plan 605)" 段（fields 条目 contract 成员、单条目承载、`resolveRendererPropContracts` 集中双读、过渡期语义、RM-4 将删旧形态、不物化进 TemplateNode）。
- [x] renderer-interfaces.md Authoring adaptation 行更新；quick-reference.md enum/literal pattern 节补 RM-3 inline alternative 一段（grep 定位于 :598 节）。
- [x] 全量五门禁（五链 exit 0，`_tmp/rm3-closure-gates.log`）。

Exit Criteria:

- [x] docs 与 live 一致；五门禁全绿。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh 子 agent 填写。

- Reviewer / Agent: agent_e962bbc6（独立 fresh 子 agent，消费面枚举交叉验证）
- Verdict: `pass`（R1 fail 0B/2M/3m → 修订 → R2 fail 2 项一行残留 → 修正 → R3 pass 0B/0M）
- Rounds: 3
- Findings addressed: R1 M-1=消费面枚举漏编译侧 schema-definition 分类两读点（node-compiler.ts:342/node-compiler-helpers.ts:445，roadmap 点名的"编译器"本体；漏切则新形态对嵌套 schema prop 静默非等价）——Baseline 补第 6/7/8 项、Phase 2 增编译侧切换条目与 Targets、判别钉增 schema-definition 分类用例；R1 M-2="tooling-only 契约另一读法"悬空且 helper 返回类型结构性不兼容——采 shape 必填裁定（旧形态不存在该能力，非本 plan 范围）；m-1=required 语义标注改"编译期缺失诊断+tooling 双消费"并增 Proof 用例；m-2=行号 :30-37；m-3=check-finite-prop-contracts.mjs 补入基线。R2 残留=m-2 修复串未匹配实未落字（grep 实证后落字）+ Goals 编号未随枚举扩充同步（改切换集 1/2/3/6、零改动集 4/5/7/8 逐项括注）。执行纪律备忘：node-compiler 两处热循环循环外单次取 map。

## Closure Gates

- [x] 新形态落地（类型 + helper）且 helper 单测绿（恒等/冲突权威/新形态补充+kind 过滤/displayName 缺省/类型钉五组）
- [x] 消费面双读切换完成且新形态判别钉先红后绿实录在案（执行者 node-compiler 变异→分类钉红；audit 变异 A helper 注释→五钉全红、变异 B :344 回退→恰分类钉红，均 sha256 恢复）
- [x] 既有声明零迁移零行为（flux-compiler 570/570、flux-core 706/706 audit 亲跑；diff 零既有测试文件改动；恒等判别 audit 探针三层全等[键集/逐键值/对象引用]）
- [x] 全仓 typecheck/build/lint/test 全绿 + check 零新增红 + 契约门禁零豁免新增（audit 亲核五链日志 42/42×3+78/78，0 failed）
- [x] owner docs 同步且与 live 一致（三处 audit 逐字核对）
- [x] roadmap RM-3 状态流转 + daily log 条目（随本提交 hunk 级 staging）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（agent_e5ad2fd8，R1 approved 0B/0M/1m[m-1 index.tsx 措辞笔误已随回写修正]）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（e2e 不重跑，本条与提交信息披露）

## Deferred But Adjudicated

（无——执行中如有推翻/改判，当场落本节）

## Non-Blocking Follow-ups

- RM-4 迁移时的冲突语义统一裁决（同 key 双写门禁化）由 RM-4 plan 承接。

## Closure

Status Note: RM-3 三件交付全部落地——①字段条目新形态：`SchemaFieldRule.contract?: RendererFieldContract`（shape 必填，与旧形态对齐；payload 预留 RM-5）；②集中双读 helper `resolveRendererPropContracts`（propContracts 权威底座 + fields 内联 contract 补充，无 contract 声明下与 `propContracts ?? {}` 三层恒等）；③七消费位切换（shape-validation 族 4 + 编译侧 schema-definition 分类 2[R1 M-1 补枚举] + authoring editableProps），coverage/finite-prop-contracts 门禁零改动（切换集/零改动集 1/2/3/6 vs 4/5/7/8 落字）。零迁移零行为：66/41 现存双写声明逐字节不变（570/570 + 706/706 + 五链 exit 0）。判别：新形态五钉先红后绿（audit 双变异独立复现）。e2e 未重跑（零行为收口，提交信息披露）。RM-4 承接：全量迁移 66/41 文件 + 删 propContracts 与双读分支 + finite-prop-contracts 门禁适配。

Closure Audit Evidence:

- Auditor / Agent: agent_e5ad2fd8（独立 fresh 子 agent，R1 approved 0B/0M/1m；m-1=index.tsx→index.ts 措辞笔误，已随回写修正）
- Evidence: 七切换位逐一打开亲证 + 切换完备性反证（全 grep 残余仅显式裁定项）；双变异判别亲证（A=helper 注释→五钉全红、B=:344 回退→恰分类钉红，sha256 恢复）；恒等探针三层全等亲证（tableRenderer/crudRenderer 交叉 fixture）；零行为亲跑（570+706+双包 typecheck）；门禁五链日志亲核（42/42×3 + 78/78、0 failed、仅 2 条已登记豁免红）；范围纪律亲证（RM-9 并行路径零混入，grep 0 命中）

Follow-up:

- RM-4 迁移时的冲突语义统一裁决（同 key 双写门禁化）由 RM-4 plan 承接。
- 其余：no remaining plan-owned work。
