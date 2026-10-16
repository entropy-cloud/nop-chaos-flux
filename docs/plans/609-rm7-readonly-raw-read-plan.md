# 609 RM-7 编译结构只读硬化 + 框架内部 raw schema 读迁移（name/modalContainer）

> Plan Status: completed
> Last Reviewed: 2026-10-16
> Source: `docs/backlog/renderer-metamodel-roadmap.md` RM-7；`docs/analysis/2026-10-15-renderer-definition-metamodel-review.md` §5.2；plan 602 裁决表 #1/#2/#3（renderer-runtime.md Runtime Schema-Retention Policy）
> Related: RM-0 裁决表（#2/#3=迁移 RM-7，本 plan 即其执行）

## Purpose

终点定义 #3 落地："编译期静态模板 ↔ 运行时实例"分层由类型钉住（`TemplateNode` 只读补全，约定升级为编译约束）；框架内部 raw schema 读 #2（form field-name）/ #3（modalContainer）按 RM-0 裁决表迁移。

## 授权链（保护区）

flux-core（TemplateNode 类型只读化）plan-first ✓ 本 plan 即载体。人工授权链：**用户 goal 指令（2026-10-15）四要素**（同 603-608）。

## Current Baseline（live 核对 2026-10-16，HEAD 5b4e91d53）

- **TemplateNode 只读缺失**（`flux-core/src/types/node-identity.ts:135-198`，R1 m1 勘正）：30 个成员全部无成员级 `readonly`（仅内层容器锁）。分析报告 §5.2.4："不可变是约定，不是机制"。全仓模板写入写点 grep 为零（§5.1.2 已证；审查员独立复核含别名写/Object.assign）——只读化预期 typecheck 零破坏。**范围记账（R1 M4 预登记，详见 Deferred 节）**：`NodeState` 成员级只读不可落地（node-runtime.ts 六处运行时写），roadmap scope"schema/NodeState 只读补全"收口时就地勘误为 TemplateNode 成员级补全。
- **#2 name raw 读**（`flux-react/src/node-renderer-resolved.tsx:410`）：`const fieldName = typeof props.node.schema.name === 'string' ? ... : undefined` ——读 host-live retained 树。同文件 :180 `resolvedComponentProps`（resolved 通道，props bag）已存在；`NodeFrameWrapper:27-28` 的帧 name 已走 `resolvedPropsValue.name` 同款通道。
- **#3 modalContainer raw 读**（`flux-react/src/schema-renderer.tsx:270-279`，R1 m1 勘正）：外层 SchemaRenderer 的 effect 读 `props.schema`（**host-live 输入本体**）写入 `page.modalContainer`；dialog-host.tsx:127 读 `page.modalContainer`（PageRuntime 载体，非 raw 读）。**R1 M2 勘正**：外层组件不持有编译产物（compiledRoot 在内层 `CompiledSchemaTree` :134）——effect 须搬入内层（page 已是其 prop；同款先例 :149-152 validationOwner）。
- **编译产物现状**：`CompiledTemplate { root: TemplateNode | readonly TemplateNode[] }`（node-identity.ts:200-202）。**引用语义勘正（R1 m4）**：根节点 schema 为 authoring-transform 的规范化浅拷贝（authoring-transform.ts:83 无条件 `{...canonicalNode}`）——顶层对象非宿主共享引用（owner 文档 renderer-runtime.md Policy 1 与分析报告 §5.2.1 的"shared reference"表述在顶层节点层面不准确，收口时就地附注）；嵌套值仍共享。
- **编译失败边缘（R1 m5）**：现外层 effect 在 compile 失败时仍从 raw schema 设 modalContainer；搬入内层后 compiledRoot=null 不再设置——语义钉为"编译失败不设 modalContainer"。
- 基线验证：HEAD 5b4e91d53 五门禁全绿（RM-6 收口提交）。

## Goals

- `TemplateNode` 全部成员补 `readonly`（类型层，零深拷贝零运行时成本；分析报告 §5.3 约束满足——模板零写入已被 grep 证明，类型化为零破坏预期）。
- #2 迁移：fieldName 改读 resolved 通道（`resolvedComponentProps.name`），与 NodeFrameWrapper 帧通道同源。**语义勘正（R1 M3）**：`name` 属 BASE_SCHEMA_FIELDS，未声明 name 字段的 renderer 其 authored name 经默认 prop 归类同样进 propsProgram（fields.ts:52 默认归类 + node-compiler 全键编译 + 闭环放行）——普通字符串名下新旧通道逐字节等价；唯一行为差=**表达式形态 name**（旧注册原始表达式串/新注册求值结果）——判别红绿即用此场景。下游仅 :414-424 hidden-participation effect 一处。
- #3 迁移（R1 M1/M2/C 形态落定）：effect **搬入 `CompiledSchemaTree`**（page 已是其 prop，仿 :149-152 validationOwner 先例；外层 SchemaRenderer 不持有 compiledRoot），读 `getSingleRootNode(compiledRoot)` 编译根节点的**规范化 schema 副本**（authoring-transform.ts:83 无条件浅拷贝——compile-once 快照，非 host-live 引用）的 `modalContainer`。**行值再裁定**：裁决表 #3 原"Migrate to compiled artifact (root plan or metaProgram)"→ 改"Migrate to retained channel #1 via compiled root node's canonical schema copy"——驳回 metaProgram（每节点快照增长）与根计划面新增（静态字符串过度工程）的真实理由=零编译器面增长+副本即真快照。判别钉改诚实三件套（见 Phase 1）。
- 裁决表 #2/#3 行就地附注执行结果（RM-0 表为 owner 文档）。

## Non-Goals

- 不做 Object.freeze/深拷贝（分析报告 §5.3：零运行时成本约束）；不动 NodeInstance.state（运行时可变载体，设计如此）；不动 RM-8 六公开通道。

## Scope

### In Scope

- flux-core：node-identity.ts TemplateNode readonly 补全。
- flux-react：node-renderer-resolved.tsx #2 迁移；schema-renderer.tsx #3 迁移。
- renderer-runtime.md 裁决表 #2/#3 行就地附注执行结果。
- roadmap 状态流转 + daily log（10-16.md 追加）。

### Out Of Scope

- RM-8/9；NodeInstance/NodeState 可变面；e2e。

## Test Strategy

本档选择：**必须自动化**——#2/#3 是行为面（roadmap 行为面列表含 RM-7）。判别三件套（R1 M1/M3 重设计）：

- readonly：临时对 templateNode 字段赋值 → tsc TS2540 红 → 恢复实录。
- #2：普通字符串名等价钉（声明/未声明 name 字段两 case，fieldName 同值）；**判别红腿=表达式 name 场景**（schema.name 为 `${...}` 表达式：旧行为注册原始表达式串/新行为注册求值结果——旧代码下红）。
- #3：①行为等价钉（authored modalContainer 落 page.modalContainer；宿主换引用更新）；②**通道机制钉**（R2 修正：源级断言——focused 测试读 schema-renderer.tsx 源码断言旧形态消失[`page.modalContainer =` + `rootSchema as BaseSchema` 组合不存在、赋值点所在组件引用 compiledRoot/getSingleRootNode]——旧代码红/新代码绿，零新门禁不撞 RM-8；scanner 路线已否决[find-runtime-raw-schema-reads include 集不含 flux-react，旧红不存在，且扩 include 属 RM-8 交付物]；外层 :394/:425/:481 的 props.schema 合法保留读除外——modalContainer raw 读不复存在即达语义）；③编译失败边缘语义钉——R2 后交付判别实由 ② 源级机制钉承载（行为级编译失败 case 未单列；行为等价腿 ① 由既有 schema-renderer-dialog-container.test.tsx:176 承载；边缘语义披露于裁决表 #3 行）。编译层副本快照语义（编译后原地改输入、根节点 schema.modalContainer 不随变）为新旧皆绿的机制说明，不作判别。

## Execution Plan

### Phase 1 - readonly 硬化 + 两读点迁移

Status: completed
Targets: `node-identity.ts`、`node-renderer-resolved.tsx`、`schema-renderer.tsx`

- Item Types: `Fix`、`Proof`

- [x] TemplateNode 30 成员补 `readonly`（node-compiler 构造期三处后置赋值[staticAnalysis/compiledSources/compiledReactions]随 readonly 折叠为单字面量展开——构造期写非运行时变更）。
- [x] Proof（readonly 判别）：探针赋值 → tsc TS2540 红（实录）→ 删除探针恢复零错。
- [x] #2 迁移：fieldName 读 `resolvedComponentProps.name`（`resolvedComponentProps` 经 'shape' in 防护后直接取 .name）；判别钉=`rm7-raw-read-migration.test.tsx` 表达式 name 红腿（validation owner spy 经 useCurrentValidationScope 捕获 page fallback owner[异步发布，waitFor owner publication+spy installation]；变异回 raw 读→测试红[1 failed]→sha256 恢复→绿[2 passed]）。等价钉两 case 并入 plan 文本说明（普通字符串名两通道逐字节等价，R1 M3 勘正后不再单列）。
- [x] #3 迁移：effect 搬入 `CompiledSchemaTree`（:155-161，紧邻 validationOwner 先例），读 `getSingleRootNode(compiledRoot)` 规范化 schema 副本的 modalContainer（编译失败 compiledRoot=null→设 undefined，语义等价'不设'）；判别=源级机制钉落在 `rm7-raw-read-migration.test.tsx`（`rootSchema as BaseSchema` 旧形态消失 + `getSingleRootNode(compiledRoot)`/`props.page.modalContainer =` 新形态在场——旧代码红/新代码绿）。
- [x] 全链验证（五链 exit 0，`_tmp/rm7-closure-gates.log`；readonly 化全仓 typecheck 零破坏预测证实）。

Exit Criteria:

- [x] readonly 判别红绿实录；#2 表达式名红腿实录（变异红→恢复绿，sha c8397ab3）+等价钉并入文本说明；#3 源级机制钉实录（旧形态消失+新形态在场）；全链五门禁 exit 0。

### Phase 2 - docs + 收口

Status: completed

- Item Types: `Fix`

- [x] renderer-runtime.md 裁决表 #2 行=Migrated (RM-7, plan 609)（resolved 通道+表达式 name 行为差钉）；#3 行=Migrated + **row re-adjudication**（retained channel #1 via compiled root canonical schema copy+两驳回理由）。
- [x] 前提就地勘误两处：renderer-runtime.md Policy 1 + 分析报告 §5.2.1（规范化浅拷贝事实+勘误标记，历史文本不改写）。
- [x] roadmap RM-7 scope 就地勘误落位（worktree 行内附注；随 RM-7 提交 hunk 入库）。
- [x] roadmap 状态流转 + daily log（10-16.md 追加，随本提交）。

Exit Criteria:

- [x] 裁决表两行附注+两处前提勘误+roadmap scope 勘误落位；daily log 落字。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh 子 agent 填写。

- Reviewer / Agent: agent_5db03b33（独立 fresh 子 agent，readonly 零破坏推演+#3 形态独立结论+scanner 实跑证伪）
- Verdict: `pass`（R1 fail 0B/4M/5m → 修订 → R2 fail 1M[通道钉 scanner 声称被实跑证伪] → 修正（采审查员推荐项 a：源级机制钉）→ 按 R2 意见直接对账达 active 门槛）
- Rounds: 2
- Findings addressed: R1 M1/C=#3 判别钉无红腿（effect 依赖同一性，新旧行为观测等价）+形态落定（搬入 CompiledSchemaTree 读规范化副本，行值再裁决）；M2=effect 所在组件不持有 compiledRoot（搬入落字）；M3=#2"语义收紧"前提假（name 经默认归类进 propsProgram）——判别红腿改表达式 name 场景；M4=NodeState 只读不可落地预登记 Deferred+roadmap scope 勘误入 Phase 2；m1 行号/m2 e2e 披露行/m3 占位行/m4 owner-doc 前提勘误（规范化浅拷贝）/m5 编译失败边缘语义钉。R2 M=通道钉 scanner 声称证伪（include 不含 flux-react，旧红不存在；扩 include 撞 RM-8）——采推荐项 a 改源级机制钉+合法保留读括注。

## Closure Gates

- [x] readonly 硬化落地且 tsc 红绿判别实录在案
- [x] #2/#3 迁移落地且判别钉实录在案
- [x] 全仓 typecheck/build/lint/test 全绿 + check 零新增红
- [x] 裁决表 #2/#3 就地附注与 live 一致
- [x] roadmap RM-7 状态流转 + daily log 条目
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`
- [x] e2e 不重跑之披露义务已在本表与提交信息落字（roadmap CX-5 口径）

## Deferred But Adjudicated

### NodeState/schema 型级只读补全

- Classification: `out-of-scope improvement`（预登记，R1 M4）
- Why Not Blocking Closure: `NodeState` 成员被 node-runtime.ts 六处运行时写入（:264/:270/:271/:333/:404/:405 解析缓存/依赖集）——成员级只读会使运行时编译失败；`schema` 的顶层对象已由 authoring-transform 规范化拷贝提供 compile-once 语义，嵌套值共享为保留通道 #1 的既定契约。roadmap RM-7 行 scope 子句"schema/NodeState 只读补全"在 Phase 2 就地勘误为"TemplateNode 成员级只读补全"。
- Successor Required: `no`
- Successor Path: —

## Closure

> 【状态勘误 2026-10-16，renderer-metamodel 轨道收口终审 agent_98d93a27 M-1】本 plan 收口时（提交 33c25e9e3）Closure Gates 已全勾、Closure Audit Evidence 已回填（agent_8ca6c622 approved），但 `Plan Status` 字段漏翻 `active`→`completed`；轨道收口终审对照 13 个 plan 时发现并就地补正，实体工作与 live 终态不受影响（roadmap RM-7 行在其收口提交时即已 `done`）。

Status Note: RM-7 三件交付全部落地——①TemplateNode 30 成员 readonly（node-compiler 构造期三处后置赋值折叠为单字面量展开，构造期写非运行时变更；全仓 typecheck 零破坏预测证实）；②#2 name raw 读迁 resolved 通道（表达式 name 行为差钉红绿实录：变异红→sha256 c8397ab3 恢复绿；现网无表达式 name 使用，行为差为披露面）；③#3 modalContainer 读迁 compiled root canonical schema copy（effect 搬入 CompiledSchemaTree；行值再裁决落裁决表 #3 行；源级机制钉+行为等价既有测试承载；编译失败设 undefined 语义披露）。readonly 判别 TS2540 红/恢复零错实录。owner-doc 前提勘误两处（Policy 1 + 分析报告 §5.2.1 规范化浅拷贝）。全链 exit 0（flux-react 604 passed 含新判别钉 2 用例）；e2e 未重跑（提交披露）。

Closure Audit Evidence:

- Auditor / Agent: agent_8ca6c622（独立 fresh 子 agent，R1 approved 0B/0M/3m；m1=Test Strategy ③ 判别承载修正说明、m2=源级钉路径可移植化、m3=编译失败措辞收紧（赋 undefined；fresh page 观测等价/同页重编译失败清旧值）——均随回写落地）
- Evidence: 30 readonly 成员逐数亲证；node-compiler 折叠 diff 语义等价审查（continue 语义/键存在性/last-write-wins/双 artifact 共存逐点）；变异判别亲跑（raw 读→红腿 1 failed，notifyCalls 实收 ['${1 + 1}']）；readonly 判别亲证（node.id 赋值 TS2540）；NodeState 六处写证逐行命中；#2 行为差现网零使用 grep 亲证；docs 四处 diff 无夹带亲证；门禁日志亲核 0 failed

Follow-up:

- 其余：no remaining plan-owned work。
