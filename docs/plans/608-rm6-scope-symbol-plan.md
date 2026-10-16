# 608 RM-6 scope 符号单源化：scopeExportContracts+injectedLocals 合并

> Plan Status: completed
> Last Reviewed: 2026-10-16
> Source: `docs/backlog/renderer-metamodel-roadmap.md` RM-6；`docs/analysis/2026-10-15-renderer-definition-metamodel-review.md` A4
> Related: 前置 plan 605-607（contract 载体与 helper 先例）

## Purpose

scope 符号双声明合并为单条目：`injectedLocals` 条目增可选 `shape?: FluxValueShape`（符号 kind + FluxValueShape 同载体），`scopeExportContracts` 通道删除；`resolveRendererAuthoringContract().scopeExports` 改 helper 派生；crud/form 双写迁移（A4 两处）；page 的 `$page` injectedLocals 位点（非双写但同通道）随合并核查。

## 授权链（保护区）

flux-core（Shape 字段删除+helper）+ renderer definition fields 均 plan-first ✓。公开导出面收缩：`RendererDefinitionShape.scopeExportContracts` 删除（授权语=roadmap RM-6 本文"合并为单条目"+roadmap Cross-Cutting 3 双写禁止"旧形态必须删除"）。人工授权链：**用户 goal 指令（2026-10-15）四要素**（同 603-607）。

## Current Baseline（live 核对 2026-10-16，HEAD d74c9f106）

- **声明面（live 实测，R1 B1 勘正）**：`scopeExportContracts:` 生产 **2 处**——`packages/flux-renderers-data/src/crud-renderer-definition.ts:64`（`$crud: { kind:'object', fields:{loading/refreshing/itemCount/...} }`）+ `packages/flux-renderers-form/src/renderers/form-definition.ts:175-193`（`$form: { kind:'object', fields:{id,name,submitting,validating,...}, optional:['id','name'] }`）——与 roadmap"crud/form 两处声明迁移"及分析报告 A4"crud 与 form 各自把 $crud/$form 声明了两次"精确对齐；`injectedLocals:` 3 处——basic-renderer-definitions.ts:34（`$page`，非双写）、crud:84、form:194（均 `{ kind:'injected-local' }`）。测试引用 5 文件（flow-designer/data×2/form×2 contracts 测试）。
- **消费面**：①编译器 `symbol-helpers.ts:140-146` `pushInjectedLocalSymbols` 读 `renderer.injectedLocals`（SymbolInfo kind 载体，node-compiler:135 调用）——符号表唯一生产消费；②`renderer-authoring-contract.ts:85` `scopeExports: definition.scopeExportContracts ?? {}`（tooling 数据面）；③flux-guide 生成器**零命中**（已核）；④docs 三处（renderer-interfaces :132/:171/:199、capability-contract-model :134/:188/:253）。
- **A4 双写实证**：crud 与 form 各自把 `$crud`/`$form` 声明两遍（injectedLocals 编译符号 + scopeExportContracts tooling 形状），形状与符号无类型关联（对齐分析报告 A4 原文，R1 B1 补 form）。
- **类型面**：`injectedLocals?: Readonly<Record<string, Omit<SymbolInfo, 'name'>>>`（renderer-definition-types.ts）；`SymbolInfo { name; kind: CompileSymbolKind; members?; memberDefinitions? }`（compilation.ts:114-119）；`ResolvedAuthoringContract.scopeExports: Readonly<Record<string, FluxValueShape>>`（接口名 live 为 ResolvedAuthoringContract，R1 m2）。
- 基线验证：HEAD d74c9f106 五门禁全绿（RM-5 收口提交）。并行 RM-9 在途（roadmap 混合脏，hunk 级 staging；dev log 今日条目入 10-16.md 新文件——直写无手术）。

## Goals

- `injectedLocals` 条目类型扩 `shape?: FluxValueShape`（`Omit<SymbolInfo,'name'> & { shape? }` 单载体）；crud `$crud` 形状对象逐字迁入 injectedLocals 条目；`scopeExportContracts` 块删除。
- flux-core helper `resolveRendererScopeExports(renderer)`：injectedLocals 中带 shape 的条目 → `{K: shape}`（无 shape 条目不入 map——与旧视图键集 `{$crud, $form}` 恒等：两处 scopeExportContracts 键均同步迁入 injectedLocals）。authoring :85 切 helper。
- form `$form` 形状（:175-193 含 `optional:['id','name']`）逐字迁入 `injectedLocals.$form` 条目、删 scopeExportContracts 块（crud 同款机械映射）。
- 删 `RendererDefinitionShape.scopeExportContracts` 字段；`pnpm -r typecheck` 枚举兜底（测试 5 文件+docs 三处随迁）。
- 判别：authoring `scopeExports` 输出迁移前后 JSON 等价（crud 单渲染器探针断言即可——面极小，快照基建不成比例）；symbol-helpers 编译语义零变更（injectedLocals 既有成员不动）。

## Non-Goals

- 不动 `SymbolInfo`/`CompileSymbolKind`/符号表管线（pushInjectedLocalSymbols 读法不变——条目加可选成员向后兼容）；不动 RM-7/8/9 范围。

## Scope

### In Scope

- flux-core：injectedLocals 条目类型扩展 + helper + authoring 切换 + Shape.scopeExportContracts 删除 + 单测。
- crud + form 两定义迁移（R1 B1）+ 测试 5 文件适配 + docs 三处。
- roadmap 状态流转 + daily log（10-16.md 追加条目）。

### Out Of Scope

- RM-7~RM-9；`$page` 位点仅核查不改（无 shape、无双写——单条目形态已合规）。

## Test Strategy

档位选择：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**——helper 单测（视图构造/无 shape 排除/恒等）+ crud+form authoring 断言迁移（既有 data/form 包 contracts 测试族回归承载等价）+ 全链。A4 面极小（2 双写位点），快照基建不成比例，以定点断言承载判别（迁移前后 scopeExports toEqual 逐键恒等）。

## Execution Plan

### Phase 1 - helper + 切换 + 删除（flux-core + crud/form 一步到位）

Status: completed
Targets: `renderer-definition-types.ts`、`renderer-prop-contracts.ts`、`renderer-authoring-contract.ts`、crud-renderer-definition.ts、form-definition.ts、测试 5 文件

- Item Types: `Fix`、`Proof`

- [x] injectedLocals 条目类型扩 `shape?`；helper `resolveRendererScopeExports`（renderer-prop-contracts.ts）；authoring :85 切换；删 Shape.scopeExportContracts（FluxValueShape import 改自 schema-diagnostics 桶）。
- [x] crud 迁移（$crud shape 逐字入 injectedLocals 条目、删块）+ form 迁移（$form 形状含 optional 逐字入条目、删块）；测试 5 文件适配（data×2/form×2 断言改 `injectedLocals.$X.shape.kind` 直读；flow-designer 断言改 `resolveRendererScopeExports(...).toEqual({})` 消灭旧名引用[audit m1a]，保留删除绊线语义）。
- [x] Proof：helper 单测两组（$crud 带 shape 入 map+$page 无 shape 排除/无 shape 与空 renderer 空 map）+ data 1231/form 1125 contracts 测试族回归绿 + flux-core 710/710。
- [x] docs 三处（renderer-interfaces :132 字段组/:171 职责块改 injectedLocals[].shape 单源/:199 来源改 helper；capability-contract-model :134 字段删/:188 投影行/:253 类型块删）。

Exit Criteria:

- [x] flux-core focused 绿（710/710）；全仓 `scopeExportContracts:` 声明归零（grep=0）；`pnpm -r --no-bail typecheck` exit 0（`_tmp/rm6-typecheck2.log`）。

### Phase 2 - 收口验证

Status: completed

- Item Types: `Proof`

- [x] 全量五门禁（五链 exit 0，`_tmp/rm6-closure-gates.log`）。

Exit Criteria:

- [x] 五门禁全绿。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh 子 agent 填写。

- Reviewer / Agent: agent_777d7df5（独立 fresh 子 agent，消费面/tooling 链亲证）
- Verdict: `pass`（R1 fail 1B/0M/4m → 修订 → R2 fail 1M 残留[form 未同步到 summary/gate 行 3 处] → 修正 → R3 pass 0B/0M）
- Rounds: 3
- Findings addressed: R1 B1=form 是第二个 scopeExportContracts 生产双写位点（form-definition.ts:175-193）被漏枚举——Baseline 勘正 2 处、Goals/Scope/Phase 1 增 form 迁移、恒等判据改 {$crud,$form} 双位点；m1=:90→:85×4+:189→:188；m2=ResolvedAuthoringContract 接口名；m3=授权语改引 RM-6 本文+Cross-Cutting 3；R2 M1=Purpose/Test Strategy/Gates 三行 crud-only 残留（1 双写位点计数不成立）——3 处逐字修正+m1 单测组数口径。m2=flow-designer 断言按 helper 视图兜底落字。

## Closure Gates

- [x] 单载体合并落地且 crud+form scopeExports 输出恒等断言在案（audit 独立探针 deepStrictEqual：HEAD scopeExportContracts 期望 vs 迁移后视图 $crud/$form 逐键恒等；$page 正确排除）
- [x] 旧通道删除且全仓 scopeExportContracts: 归零 grep 判别=0 在案（audit m1a：flow-designer 绊线断言改 helper 视图 toEqual({})，读点归零+305→306 全绿+oversized 704→600+106 拆分消解）
- [x] 全仓 typecheck/build/lint/test 全绿 + check 零新增红（audit 亲核首链 16,536/0/43 包；barrel 补导出[audit 观察①实为遗漏，已修]+test 拆分后全链重跑 exit 0，`_tmp/rm6-closure-gates3.log`）
- [x] owner docs 同步且与 live 一致（renderer-interfaces 三处+capability-contract-model 三处）
- [x] roadmap RM-6 状态流转 + daily log 条目（10-16.md 追加，随本提交）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（agent_444d83fc，R1 approved 0B/0M/2m——m1a 绊线断言改写+plan 措辞修正、m2 10-16.md 追加式，均随回写落地）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（e2e 不重跑，本条与提交信息披露）

## Deferred But Adjudicated

（无——执行中如有推翻/改判，当场落本节）

## Non-Blocking Follow-ups

- `$page` injectedLocals 无 shape：tooling 若需 $page 形状，单独立项（非本轨道裁决范围）。

## Closure

Status Note: RM-6 交付全部落地——①`injectedLocals` 条目单载体（`Omit<SymbolInfo,'name'> & { shape? }`，符号 kind+形状同条目）；②crud+form 双写迁移（shape 对象逐字同源，audit diff+机械比对双证）；③`scopeExportContracts` 通道删除（Shape 字段+全仓声明归零 grep=0）；④authoring scopeExports 切 helper（恒等探针 deepStrictEqual：迁移前后视图 $crud/$form 逐键恒等，$page 正确排除）；⑤pushInjectedLocalSymbols 读法零变更（flux-compiler 570/570 亲证）。执行中发现并修复：flux-core barrel 漏导 scope helper（audit 观察①实为遗漏）+flow-designer 绊线断言改写后文件超限拆分（704→600+106）。全链 exit 0 重跑（16,536/0/43 包）；e2e 未重跑（提交披露）。RM-7 承接只读硬化+raw 读迁移。

Closure Audit Evidence:

- Auditor / Agent: agent_444d83fc（独立 fresh 子 agent，R1 approved 0B/0M/2m；m1a=flow-designer 绊线断言改 helper 视图+plan :64 措辞修正+第 5 适配文件计入、m2=10-16.md 追加式修正——均随回写落地）
- Evidence: 四变异点逐一打开亲证；crud/form shape 体 unified diff+机械比对双证字节未动；恒等探针 deepStrictEqual 亲跑（HEAD 期望 vs 迁移后视图）；flux-compiler 570/570 亲跑（编译语义零变更）；全仓归零三层亲证（声明/读点/schema.d.ts 外 0）；门禁两链亲核（首链 16,536/0 + barrel 修复后重跑 exit 0）

Follow-up:

- `$page` injectedLocals 无 shape：tooling 若需 $page 形状，单独立项（非本轨道裁决范围）。
- 其余：no remaining plan-owned work。
