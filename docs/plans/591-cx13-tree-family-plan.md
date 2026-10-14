# 591 CX-13 共性重构：Tree 族收敛批（source-executor 覆盖序修复+双 renderer 吸收+crud 声明镜像收敛）

> Plan Status: completed
> Last Reviewed: 2026-10-14
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md` CX-13 条目（WA-5 批立案 WA-fadv-004/005 + WA-6 批扩围 WA-data-006；台账 130/131 行+data 扩围行 successor-required→本批）；先例：plan 588-590
> Related: `docs/architecture/renderer-runtime.md`

## Purpose

收敛 Tree 族三处复制沉积/补偿层（tree-controls 双 renderer 孪生、tree-control-sources 手写 dispatch 补偿、data crud 声明镜像），并修复上游 `source-executor` 的 `...ctx` 覆盖序缺陷（补偿层存在根因）。

## Current Baseline（2026-10-14 live 实测，拟制 HEAD `7dcfea0a5`[R2 m-c 注：执行首跑以当时 HEAD 重钉]；评审终态 HEAD=`8e687eabd`[CX-12 落地，与 C/B/D 锚点零交集已核]）

- **Leg A 阻塞（拟制期裁定）**：form 包 `src/schemas.ts` Tree 双声明（InputTreeSchema :191↔TreeSelectSchema :235，15 键 ×2，唯一实质差异 placeholder；文档不对称漂移：clearable :207 单侧注记、childrenSource/searchSource `@see` 镜像）——**该文件为并行会话在途保护文件**（在途 diff=FormSchema.target :125 区域，与 Tree 区不重叠但文件禁触碰）→ TreeSchemaBase 提取+schemas 文档修正+c3-5-schema-contract-honesty 守卫随 extends 链升级**全部 Deferred**（successor=在途批收口后独立小批；非缩水，零静默）。
- **Leg B（本批）**：`form-advanced/src/tree-controls.tsx`（634 行，CX-11 G1b 后净）双 renderer `InputTreeRenderer` :43 ↔ `TreeSelectRenderer` :231 逐字级孪生（roadmap 引「~200 行」[R2 m-b 注：口径为 roadmap 原文；R1 m1 实测逐字孪生 ≈140-160 行]；aa2afdf3c 包提取搬运出生）。
- **Leg C（本批，draft review R1 B1 根因归位后重构为 C1/C2/C3）**：补偿层真根因=`flux-react/src/renderer-helpers.ts:304-310` `helpers.executeSource` 硬编码 `ctx: mergeActionContext(input)`（**无 partial**）→ctx.scope 恒=渲染 scope（真值）——单修 source-executor 覆盖序对 helpers 路径是 no-op；且 `RendererHelpers.executeSource` options 类型仅 `{scope?}`（flux-core renderer-core.ts:85，无 signal）→迁移还会丢搜索 abort。三段修复：**C1**=source-executor `scope: ctx.scope ?? scope`（重标注=契约硬化[显式 undefined 覆写洞，今日无 live 调用方触发：helpers 恒置 scope/source-observer 传 `{...input.ctx, signal}` 无 scope]——判别钉单元可测）；**C2**=根因解堵（结构性）：flux-core `RendererHelpers.executeSource` options 类型放宽 `{scope?; signal?}`（既有导出类型加可选键=向后兼容）+flux-react renderer-helpers executeSource 接线 `ctx: mergeActionContext(input, { scope: options?.scope, signal: options?.signal })`——**执行前置核验=mergeActionContext 对 partial undefined 键须按缺省处理（不覆写 input 既有 ctx），否则既有调用方行为破坏即停手**；**C3**=tree-control-sources 迁移 `helpers.executeSource(source, { scope: patchedScope, signal })`（:60 dispatch 补偿收薄；迁移位点逐个核对，不可迁位点显式裁定）。
- **Leg D（本批，R1 M1 修正后=机械可 extends 四对）**：`flux-renderers-data/src/crud-schema.ts` ↔ `schemas.ts` 列配置声明镜像，逐对判定=①CrudColumnFilterOption:93↔TableColumnFilterOption:9 ②CrudColumnFilterConfig:98↔TableColumnFilterConfig:14 ③QuickEditConfig 对 ④ResponsiveConfig 对——四对逐字段同一→改 extends；**排除两对**（显式裁定非缩水）：CrudColumnSettingsConfig:150 缺 Table 侧 align（extends=类型增宽，禁）→保持+follow-up；CrudColumnSchema:112 extends TableColumnSchema 编译失败（label: SchemaValue vs string+buttons: SchemaInput vs BaseSchema[]，TS2430 ×2）→保持+follow-up（收窄=消费面可见/放宽 Table=公共类型变更，均需独立裁定）。导出面判据=名称保持+未排除接口结构等价（extends 同构）。
- **授权链**：结构性范围=C1 flux-runtime 行为修复（roadmap 预标记）+**C2 flux-core 公共类型加可选键+flux-react executeSource 接线（R1 B1 修正新增——roadmap 原文「改 scope: ctx.scope ?? scope 后补偿收薄」系根因归因失实，Phase 5 就地勘误[When-Closing 12]；C2 在同一人工门下执行）**；人工确认门=用户 goal 指令四要素（时间=2026-10-14；渠道=ZCode `/goal`；引语=「执行workaround-code-smell-audit-roadmap.md直到彻底完成。每个工作项按照plan guide拟制计划完成。每个计划完成后自动提交一次」；可撤回=随时可撤）。data 包四对 extends=导出面不变（名称保持+结构等价），非结构性。
- **在途**：主工作树并行在途 14 文件（含 **data 包 4 件 crud-renderer 系**——R1 M2：Leg D 编辑的 crud-schema.ts/schemas.ts 本体不在其中且现 diff 零 CrudColumn 引用，但 data 包整体处于活跃并行修改下）——**Phase 4 进入条件=零重叠断言复验**（git status：crud-schema.ts/schemas.ts 仍非 M+在途 crud diff 仍不消费改写后的 Crud 形）；flux-runtime 在途=runtime-factory/scope/dialog 测试三件（source-executor.ts 不在）；form/src/schemas.ts 阻塞已裁定；提交严格限定本批路径。
- **既有测试**：fadv 166/1159（CX-11 后基线）+flux-runtime 套件+data 套件（执行首跑落字）；c3-5-schema-contract-honesty 守卫现位（form 包测试，Leg A 阻塞随迁不升级）。

## Goals

- **G-C（Leg C 三段）**：C1 source-executor 契约硬化（`??`+判别钉）；C2 flux-core 选项类型放宽+flux-react executeSource 接线（mergeActionContext undefined-键核验前置；既有调用方行为保持钉）；C3 tree-control-sources 迁移 executeSource（patched scope+signal 透传；不可迁位点显式裁定）。
- **G-B（Leg B）**：useTreeControlPipeline（或等价共享件，形态 draft review 裁定）吸收 InputTreeRenderer↔TreeSelectRenderer 孪生 ~200 行；行为钉同绿。
- **G-D（Leg D）**：四对机械可 extends 接口改 extends；两对排除（SettingsConfig align/ColumnSchema label-buttons 类型分叉）落 follow-up；导出面=名称不变+结构等价。
- 台账 WA-fadv-004/005 `found → verified`（closure 后，范围=本批 Legs；Leg A 阻塞注记随行）+WA-data-006 同批；roadmap CX-13 `todo → 部分收敛标注 done`（Leg A Deferred 随行注记）。

## Non-Goals

- form/src/schemas.ts 任何触碰（在途保护）：TreeSchemaBase 提取/文档修正/honesty 守卫升级（Deferred successor）；tree-controls 行为变更；executeSource 其余语义扩张。

## Scope

### In Scope

- `packages/flux-runtime/src/async-data/source-executor.ts`+判别测试
- `packages/flux-renderers-form-advanced/src/`：tree-controls.tsx、tree-control-sources.ts、新共享件与测试
- `packages/flux-renderers-data/src/`：crud-schema.ts、schemas.ts
- ledger/roadmap/dev log

### Out Of Scope

- 主工作树在途 14 文件（含 form/src/schemas.ts）；ui 包；schemas 文档修正（随 Leg A Deferred）。

## Failure Paths

| 场景                                    | 触发                                 | 行为                              | 判别                                  |
| --------------------------------------- | ------------------------------------ | --------------------------------- | ------------------------------------- | ----------------------------------------------- |
| ctx 显式 undefined scope                | executeAction ctx={scope: undefined} | 修复前=scope 洞（undefined 覆写） | 修复后=回落已解析 scope（判别钉承载） |
| ctx 显式 scope                          | executeAction ctx={scope: X}         | X 优先（新旧一致）                | 钉保持                                |
| ctx 无 scope 键                         | executeAction ctx={}（主路径）       | 已解析 scope（新旧一致）          | 钉保持                                |
| C2 mergeActionContext partial undefined | executeSource(options) 带未传键      | 须按缺省处理不覆写 input 既有 ctx | 前置核验钉——破坏即停手                |
| C3 迁移位点不可迁                       | dispatch 承载 executeSource 缺失语义 | 该位点保持+Deferred 落字          | 逐位点核对记录                        | （内部 API 面，可重试/用户可见表现列压缩=有意） |

## Test Strategy

档位：**必须自动化**。特征化先钉（双 renderer 行为面：tree/tree-select 渲染+选择+source 加载+clearable；source-executor scope 传递三形[显式/缺省/显式 undefined]+condition-builder executeSource 受益钉[R2 m-a]；crud 列配置类型面[编译期+诚实守卫现有断言]）→Leg C 修复（判别红→绿）→Leg B 吸收（钉同绿+判别变异）→Leg D 收敛（tsc+导出面 diff=0）；fadv/runtime/data filter 门禁+哨兵+隔离五门禁（新文件 git add -N）。

## Execution Plan

### Phase 1 - 特征化钉住

Status: planned
Targets: fadv/runtime/data 测试

- Item Types: `Proof`

- [x] Proof：双 renderer 行为钉（渲染/选择/source/clearable 至少各 1，tree-controls 现有套件覆盖面核对+缺口补钉）。
      Status (2026-10-14): done — 新增 `flux-renderers-form-advanced/src/__tests__/cx13-tree-family-characterization.test.tsx` 10 钉（input-tree: render+select/clearable→undefined/source-error 链/loading id/enableNodePath；tree-select: popover render+select+关弹/clearable→''/source-error 链/loading id/enableNodePath）；现有套件覆盖面核对=四 faces 双 renderer 均有既有覆盖（tree-values/source-states/remote-search/lazy-children/v12f-clearable/component-handles），无缺口需补。10/10 绿。
- [x] Proof：source-executor scope 传递钉（ctx 显式 scope 优先/ctx 缺省用已解析 scope/ctx 显式 undefined=洞现形[红腿]）+**condition-builder.tsx:103 受益钉**（R2 m-a：现 helpers.executeSource 传 `{scope}` 被静默改写为渲染 scope——C2 后获 honored=申报修复受益面，钉其 patched scope 生效）。
      Status (2026-10-14): done — 新增 `flux-runtime/src/async-data/source-executor.test.ts` 6 钉：三形（显式 scope 优先✓/缺省✓/显式 undefined=红腿现形，预 C1 实测 `expected undefined to be {id:'resolved'}`）+signal 透传/runtime 不被 clobber/formula 路径 scope 参数无关；新增 `fadv/src/__tests__/cx13-execute-source-beneficiary.test.tsx` 3 钉：:103 e2e 面（executeSource 调用+`→ 31` 求值）✓/patched-scope 经真实 createRendererHelpers 接线到 fetcher（C2 判别钉，预 C2 红腿现形 `{"seen":null}`）/无 options 行为保持钉✓。
- [x] Proof：基线落字（fadv 166/1159+runtime/data 首跑+导出面快照 data index+flux-core/flux-react 基线[C2 面：react 580 哨兵+core 套件]）。
      Status (2026-10-14): done — HEAD 重钉 `8e687eabd`（R2 m-c）。fadv 168 files/1172 tests（166/1159 基线+本批 2 files/13 钉；1 failed=恰 C2 判别钉红腿）；runtime 151 files/1543 tests+1 skipped（1 failed=恰 C1 红腿钉）；data 177 files/1224 tests 全绿（含本批 7 类型面钉）；flux-core 48/697 绿；flux-react 哨兵 **580/580 精确**；flux-renderers-ai 哨兵 **850/850 精确**；data index 导出面快照+crud-schema.ts 19 导出名快照存 `_tmp/cx13-crud-schema-export-names-baseline.txt`。

Exit Criteria:

- [x] 钉全绿；红腿（undefined 洞）在案。
      Status (2026-10-14): 行为保持钉全绿（fadv 双 renderer 10+source-executor 5+:103 面+无 options 保持钉）；红腿两处在案——C1 洞（runtime shape-3，`scope` 被显式 undefined 覆写为 undefined）+C2 判别钉（patched scope 被渲染 scope 静默改写，fetcher 未见 needle）。两红腿即 Phase 2 判别钉，修复后转绿。

### Phase 2 - Leg C 三段（C1 硬化/C2 根因解堵/C3 补偿收薄）

Status: planned
Targets: flux-runtime/source-executor.ts+flux-core/renderer-core 类型+flux-react/renderer-helpers.ts+tree-control-sources.ts

- Item Types: `Fix | Proof`

- [x] Fix C1：`scope: ctx.scope ?? scope`+判别钉绿（undefined 洞=契约硬化钉红→绿）。
      Status (2026-10-14): done — `source-executor.ts` 改 `scope: ctx?.scope ?? scope`（置于 `...ctx` 展开之后；注释落字契约）。判别钉红→绿实证：Phase 1 预修红（`expected undefined to be {id:'resolved'}`）→修后 `source-executor.test.ts` 6/6 绿。
- [x] Proof C2 前置核验：mergeActionContext partial undefined 键语义钉（不覆写 input 既有 ctx）——破坏即停手落 Deferred。
      Status (2026-10-14): done，**gate 通过（未触发停手）**。证据三重：①代码读审 `renderer-helpers.ts:81-98`——全部带 base 对应键（scope/actionScope/componentRegistry/nodeInstance/instancePath/form/page/surfaceRuntime/picker/dialogId）均 `partial?.key ?? base.key` 缺省回落；signal/prevResult/evaluationBindings 三键纯透传无 base 对应物，传显式 undefined=与不传 partial 全等。②既有钉 `flux-react/__tests__/helpers.test.ts:149`（无 partial→base defaults）+:218（空 partial `{}`→base nodeInstance）已在案。③可执行保持钉（cx13-execute-source-beneficiary 无 options 钉）绿。传 `{scope: undefined, signal: undefined}` 产出与现状逐键全等。
- [x] Fix C2：flux-core options 类型 `{scope?; signal?}`+flux-react 接线 `ctx: mergeActionContext(input, {scope: options?.scope, signal: options?.signal})`；既有调用方行为保持钉（不传 options=与改前全等）。
      Status (2026-10-14): done — `renderer-core.ts` RendererHelpers.executeSource options 放宽（既有导出类型加可选键，零新导出）；`renderer-helpers.ts` 接线落字。判别钉红→绿：patched-scope 经真实接线达 fetcher（预修 `{"seen":null}`→修后 `{"seen":"patched-value"}`）；既有调用方保持钉绿；flux-react 哨兵 **580/580 精确**；index.tsx 零 diff。
- [x] Fix C3：tree-control-sources 迁移 executeSource（patched scope+signal 透传；不可迁位点显式裁定落 Deferred）。
      Status (2026-10-14): done — `executeTreeSource` action 路径 `helpers.dispatch(actionInput,{scope,signal})` → `helpers.executeSource(actionInput,{scope,signal})`（:60 补偿收薄，cast 改 SourceSchema）。**迁移位点逐个核对**：action 路径=可迁（语义差 adjudicated：dispatch 的 surface-form 解析对树数据 fetch 不适用；formula 早退保证 executeSource formula 分支不触发）；formula 路径（:43-53）=**不可迁裁定保持**（需 try/catch 错误包装+同步求值后即刻 dispose 语义，executeSource 不提供，非本批补偿对象）。补偿注释重写（预 CX-13 dispatch workaround 说明→现契约说明）；`helpers.dispatch` 调用残留=0（仅历史注释）；scope-dispose 契约测试两例按新契约更新（时序断言全保留：create→存活至 settle→dispose）。

Exit Criteria:

- [x] runtime+core+react+form-advanced 套件同绿；补偿注释/手写 dispatch 残留核验落字；flux-react index/core index 零变更（类型加键不加导出）。
      Status (2026-10-14): runtime 151 files/1542 passed+1 skipped（C1 红腿钉转绿后全绿）；core 48/697；react **580/580 哨兵精确**；fadv 168/1172 全绿（C2 判别钉转绿）。dispatch 残留 grep=仅注释。`git diff --stat packages/flux-react/src/index.tsx packages/flux-core/src/index.ts`=空（零变更）。build×4+lint×4 绿（lint 唯一 warning=transfer-renderer.tsx:423 既有）；knip baseline exit 0 零新增。

### Phase 3 - Leg B 双 renderer 吸收

Status: planned
Targets: tree-controls.tsx+新共享件

- Item Types: `Fix | Proof`

- [x] Fix：共享 pipeline 件吸收孪生（R1 m1 修正口径：逐字孪生 ≈140-160 行=head pipeline ~90+TreeOptionList prop 块 ~38+source-error/loading 片 ~16；差异面枚举=clearable clear-row[input 独有]/popover-sheet-isMobile-useTreeSelectController trigger[select 独有]/getFocusTarget 选择器两形/handle type id/searchLabel fallback 位——吸收止于数据 pipeline+共享片段，**禁压平分歧渲染结构**）。
      Status (2026-10-14): done — 新共享件 `tree-control-pipeline.tsx`（`useTreeControlPipeline` hook 吸收 head pipeline+TreeOptionList prop 块[valuePathMap/enableNodePath/onQueryChange/lazy 全套 verbatim]+source-error/loading 片段[经 slotPrefix 参数化，组件包内私有]）；tree-controls.tsx 634→395 行（净 -239；pipeline 件 229 行=吸收 ≈150 行孪生+返回面/plumbing；输入类型内联=knip 无未消费导出）。分歧渲染结构逐字保持 per-site：input clear-row（clear 至 undefined）/select popover+sheet+isMobile trigger+useTreeSelectController（clear 至 ''+preventDefault/stopPropagation）/getFocusTarget 两选择器（input `input, button, [tabindex]`??rootRef vs select `button, [tabindex]`??null）/handle type id（input-tree vs tree-select）/searchLabel fallback 位（input 在 fieldLabel 内 vs select 在模板内）/input deferChildren warn/select 单选提交关弹（经 onSinglePickClose 注入，`if (!multiple)` 门=select 现语义）/select root testid+cid。H8/G1b 注释 verbatim 随迁。
- [x] Proof：行为钉同绿+判别变异恰红→恢复。
      Status (2026-10-14): done — 行为钉同绿=fadv 全套 168 files/1172 tests（含 cx13 双 renderer 10 钉+cx11 既有钉+tree-enable-node-path 既有 5 钉）。判别变异=吸收块内 valuePathMap 分支改 `String(v)`（丢路径映射）→**恰红**：cx13 enableNodePath 钉 ×2 红+tree-enable-node-path ×2 红，同文件 render/select/clearable/source 钉 11 全绿（外科手术式）；sha256 恢复双留证（`_tmp/cx13-pipeline-sha-before-mutation.txt`=f5a292c3…/after-restore 同值；最终件（反馈片段 slotPrefix 内化重构后）sha=d859df51…，变异块 valuePathMap 分支字节不变）。

Exit Criteria:

- [x] 孪生块归零计数落字；套件同绿。
      Status (2026-10-14): 孪生块归零=tree-controls.tsx 内 head pipeline/TreeOptionList prop 块/source-error-loading 片三段均仅存于共享件（两 renderer 内零重复）；计数：634→395（-239）+共享件 229。套件同绿=fadv 168/1172+build+lint（0 error）+typecheck+knip baseline 零新增。

### Phase 4 - Leg D crud 声明收敛

Status: planned
Targets: data 包 crud-schema.ts+schemas.ts

- Item Types: `Fix | Proof | Decision`

- [x] Decision：进入条件零重叠断言复验（R1 M2：git status crud-schema.ts/schemas.ts 仍非 M+在途 crud diff 不消费 Crud 形——破断言即停手落 Deferred）。
      Status (2026-10-14): **断言通过，未停手**——git status 复验 crud-schema.ts/schemas.ts 非 M（不在修改清单）；`git diff packages/flux-renderers-data/ | grep -c CrudColumn` = 0（在途 4 件 crud-renderer 系 diff 零 CrudColumn 引用）。 caveat：data 包整体仍处于并行在途修改下（4 件 crud-renderer 系 M），套件计数含在途效应。
- [x] Fix：四对机械可 extends 接口改 extends（两对排除落 follow-up）。
      Status (2026-10-14): done — `CrudColumnFilterOption extends TableColumnFilterOption{}` / `CrudColumnFilterConfig extends TableColumnFilterConfig{}` / `CrudQuickEditConfig extends TableColumnQuickEditConfig{}` / `CrudResponsiveConfig extends TableResponsiveConfig{}`（空体，镜像成员归零，跨对注释落字排除裁定+reasons）。排除对保持原声明：CrudColumnSettingsConfig（Table 侧多 `align` 声明键，extends=类型增宽禁）/CrudColumnSchema（label `SchemaValue` vs `string`+buttons `SchemaInput` vs `BaseSchema[]`，TS2430 ×2）。导出名零变化。Non-Blocking Follow-ups 已含两条（follow-up 落字随本 plan 既有小节，Phase 5 回写不动）。
- [x] Proof：tsc 绿+导出面 diff=零+data 套件同绿。
      Status (2026-10-14): data typecheck 绿+build 绿+lint 0 error（1 既有 warning=use-list-windowing.ts TanStack，非本批）；导出面=19 导出名逐一同名（快照 diff 仅 extends 子句按设计变化：`extends SchemaObject` → `extends TableColumn*`），index.tsx 零 diff；data 套件 177 files/1224 tests 全绿（含 cx13 声明面 7 钉：四对 SameShape=true+两排除对 divergence 钉[KeyResolution 法区分声明键 vs index-signature 键]+label/buttons 宽形钉）。

Exit Criteria:

- [x] 镜像声明归零；导出面快照比对零变化。
      Status (2026-10-14): 四对镜像成员声明归零（空体 extends）；排除两对按裁定保持。导出面快照 `_tmp/cx13-crud-schema-export-names-{baseline,after}.txt` 比对=19 名逐一同名、成员结构等价（SameShape 钉承载）。

### Phase 5 - 回写与收口

Status: done（2026-10-14：台账三行 verified[220=found 60+verified 160/未处置 0]；roadmap CX-13 done[部分收敛标注+Leg C 就地勘误落字]；dev log 10-14；隔离五门禁首跑全链 exit 0；closure audit agent_c7245389 R1 approved 后据实回勾）
Targets: ledger、roadmap、dev log

- Item Types: `Proof | Decision`

- [x] Proof：台账三行 verified（Leg A 阻塞注记随行）；roadmap CX-13 部分收敛标注回写+**Leg C 根因归因就地勘误落字[When-Closing 12：原文「改 scope: ctx.scope ?? scope 后补偿收薄」→实为 C2 renderer-helpers executeSource 接线+类型放宽]**；dev log。
- [x] Proof：隔离五门禁；独立 closure audit。

Exit Criteria:

- [x] reconcile exit 0；closure audit approved。（closure audit agent_c7245389 approved 后据实回勾）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_adb98cdc-3008-4e85-84ab-17e9a9253a71，review-only，R1+R2 同审查线）
- Verdict: R1 `fail`（1B/2M/3m）→全修；R2 `pass`（0B/0M/3m 非阻塞[已折入]）
- Rounds: 2
- Findings addressed: **B1** Leg C 根因归因失实（helpers.executeSource 硬编码 ctx 无 partial→单修 source-executor 对 helpers 路径 no-op+迁移丢 signal）→重构 C1 契约硬化/C2 根因解堵[flux-core 类型放宽+flux-react 接线，mergeActionContext undefined-键前置核验钉=破坏即停手]/C3 迁移，授权链扩围+Phase 5 roadmap 就地勘误[When-Closing 12]；**M1** Leg D 修正=四对机械 extends（FilterOption/FilterConfig/QuickEditConfig/ResponsiveConfig）+两对显式排除（SettingsConfig align 增宽禁/ColumnSchema TS2430 ×2[label SchemaValue vs string+buttons SchemaInput vs BaseSchema[]]）落 follow-up；**M2** 在途账目补 data 包 4 件+Phase 4 进入条件零重叠断言；**m1** 孪生口径修正 ≈140-160 行+差异面枚举+禁压平分歧渲染结构；**m2** Failure Paths 增三行；**m3** 锚点/第 5 对/时机勘误；**R2 m-a** condition-builder.tsx:103 第二受影响调用方=受益钉入 Phase 1；**R2 m-b** 「~200 行」标注 roadmap 口径+三形措辞；**R2 m-c** HEAD 漂移注记（评审中 CX-12 落地 8e687eabd，零交集已核）。R1 verified-clean：全部引用逐项核实（Tree 声明/在途区域/source-executor 位点/dispatch 补偿/634 行双 renderer/crud 镜像/台账行）+无导入环+Crud\* 消费面+Leg A 阻塞诚实+人工门四要素。

## Closure Gates

- [x] G-C/G-B/G-D 落地（Leg A Deferred 裁定在案）
- [x] 行为保持+申报修复判别（特征化同绿+undefined 洞红→绿+变异恰红+filter 门禁+哨兵[react 580+core 套件——C2 面]）
- [x] 台账/roadmap/dev log 齐
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（agent_c7245389 R1 approved，据实回勾）
- [x] `pnpm typecheck`（隔离 worktree cx13-verify，exit 0）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`（同上）
- [x] `pnpm test`（同上）
- [x] `pnpm check`（同上——首跑即全链 exit 0，零新增未登记红；新文件 git add -N）

## Deferred But Adjudicated

- **Leg A：TreeSchemaBase 提取+schemas 文档修正+honesty 守卫升级（拟制期裁定，2026-10-14）**
  - Classification: `moved to explicit successor ownership`
  - Why Not Blocking Closure: 位点文件 `flux-renderers-form/src/schemas.ts` 为并行会话在途保护文件（在途 diff=FormSchema.target，与 Tree 区不重叠但整文件禁触碰）——触碰=并行提交冲突风险；本批 B/C/D 三腿不依赖 Leg A 成立。
  - Successor Required: `yes`
  - Successor Path: 在途批收口后独立小批（plan 拟制时点=form 包在途 M 文件清零后；roadmap CX-13 行部分收敛标注随本批 closure 落字）。

## Non-Blocking Follow-ups

- schemas 文档不对称修正（clearable 单侧/childrenSource searchSource 文档——随 Leg A successor）。
- executeSource 其余语义缺口（若 tree-control-sources 有不可迁位点，逐条落 Deferred/本节）。

## Closure

Status Note: 2026-10-14 收口。部分收敛批：Leg B（pipeline 吸收 ~144 行，tree-controls 634→395，分歧面逐字保持）+Leg C 三段（C1 契约硬化/C2 flux-core+react 根因解堵[roadmap 原文归因失实已就地勘误]/C3 迁移+formula 路径裁定保持）+Leg D（四对 extends+两对排除落 follow-up）落地；Leg A=form/src/schemas.ts 在途保护文件阻塞 Deferred（successor=在途批收口后）；两个停手门（mergeActionContext 语义/M2 零重叠）均凭实证通过；实施=派驻 agent（24.8M tokens/222 工具调用），本会话编排/门禁/回写。

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_c7245389-d143-4c59-ad77-515e0ad79ade，review-only）
- Rounds: 1
- Verdict: `approved`（0B/0M/1m 非阻塞——runtime 计数「1543/1542/1541+1skip」混合基准注记[隔离 vs 主树±1=在途测试，审计员已在在途 diff 中逐一对账]）
- Findings addressed: 审计员逐项对账（C1 线形状+formula 分支完好/类型加键零他改/接线零他改/零 dispatch 残留+formula 路径裁定在位/pipeline 吸收真实+分歧结构逐点在位未压平/四对 extends+排除理由独立确认[align :60+TS2430 ×2]/导出名快照仅 extends 句/Leg A 阻塞诚实[文件仍 M 仅 target diff]/在途 14 文件零批标识符）+**亲手判别**（复原 pre-C1 排序→恰 1 failed=实施者红腿签名逐字→sha256 f9a89957… 前后一致逐字节恢复→6/6 绿）+门禁日志实跑核验（fadv 168/1172+react 580+ai 850 精确）。

Follow-up:

- Leg A：TreeSchemaBase 提取+schemas 文档修正+c3-5 守卫升级（form/src/schemas.ts 在途批收口后独立小批）。
- CrudColumnSettingsConfig（align）与 CrudColumnSchema（label/buttons 类型分叉）的 extends 裁定（收窄 vs 放宽需独立授权）。
- tree-control-sources formula 路径迁移（需 executeSource 提供 try/catch+立即 dispose 语义，上游能力项）。
