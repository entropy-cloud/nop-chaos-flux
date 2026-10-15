# 600 CX-20 共性重构：flux-core StreamApiRequest.data 类型工效批

> Plan Status: completed
> Last Reviewed: 2026-10-15
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md` CX-20 条目（WA-15a 批立案 WA-pgai-003 + WA-15b 批扩围 WA-pages-008 + WA-15c 批扩围 WA-clab-001；台账 successor-required→本批）；先例：plan 588-599
> Related: `docs/architecture/renderer-env.md`

## Purpose

StreamApiRequest 类型工效修复：以**扁平无索引签名重声明**（data?: unknown+显式 dataType）消灭五份 `as unknown as StreamApiRequest['data']` 双重 cast；WA-pages-008/WA-clab-001 同缝族（SchemaObject/SchemaInput 层）以探针证据预裁定 successor（耦合同一契约评审决策）。

## Current Baseline（2026-10-15 基线取证实测[探针实证]，HEAD `09ed6e5b6`）

- **五份 cast（家族 3→5 勘误）**：mock-ai-env.ts:159/coverage-connectors.ts:109[漂移 −6,CX-19 薄壳化]/openai-connector.ts:52/**ai-rich-text-demo.tsx:94[新增]**/**ai-tools-demo.tsx:44**——均 `{messages: req.messages, stream: true, [tools/model/extraParams]}` 宿主构造体。stream-impl.ts:310 第二处 `as unknown as`（stream facade 变异缝）=旁证实例**非同型 cast 不入批**。
- **根因（探针实证）**：`ChatMessage` 为泛型接口（flux-renderers-ai/engine/types.ts:86-102）——TS 只给对象字面量/类型别名隐式索引签名，接口永无→不可赋 `SchemaValue`（schema-base-types.ts:3-7 `SchemaObject {[key: string]: SchemaValue}`）；`TS2322` 实录。单重 `as StreamApiRequest['data']` 亦被拒（`TS2352` 不充分重叠）——**双重 cast 系强制非风格**。
- **类型链**：ExecutableApiRequest extends SchemaObject（:46-49，data?: SchemaValue；dataType 未经声明、经索引签名读取 stream-impl.ts:43）；StreamApiRequest=ExecutableApiRequest & {streamProtocol?; streamChunkType?}（renderer-api.ts:84-89）→ data=SchemaValue|undefined。
- **修复空间（三候选探针裁定）**：(a) ExecutableApiRequest.data?: unknown=非法（TS2430 违反继承索引签名），仅配 SchemaObject 索引值放宽 unknown 可行=大爆炸半径（ApiSchema/OperationControlConfig/XuiImportSpec 全继）=**否**；(b) JsonValue=**死**（接口数组同样拒，探针实录；defineSchema 恒等 helper 亦仅集中 cast）；(c) Omit<ExecutableApiRequest,'data'> & {data?: unknown}=**死**（Omit 保留索引签名）——**唯一探针通过形态=(i) 扁平无 SchemaObject 继承的 StreamApiRequest 重声明**，**字段面=R1 M1 交付完整 13 字段**：{url: string; method?: string; data?: unknown; headers?: Record<string,string>; selection?: string; params?: never; includeScope?: never; responseAdaptor?: never; requestAdaptor?: never; responseType?: 'json'|'blob'|'text'; downloadFileName?: string; dataType?: 'json'|'form-data'|'form'; streamProtocol?: StreamProtocol; streamChunkType?: StreamChunkType}（五宿主字面量探针全过；**原 9 字面枚举静默丢弃 5 字段=与「其余字段逐项保持」矛盾已勘误**——行为今天惰性[流路径零读写]但形态漂移禁，四 never 标记+downloadFileName 保 fresh-literal excess-property 防护=与今日 ExecutableApiRequest 同防）。
- **下游读者（穷举）**：流路径唯一运行时读点=stream-impl.ts:33-69 buildFetchInput（承重读点 :38-63[R1 m3 精化]）（`!== undefined`/`typeof==='string'`/`JSON.stringify`/`flattenToStringRecord(param 已 unknown)`=unknown 安全）；宿主 mock 读 `(api.data ?? {}) as {messages?: unknown}`；renderer-env 仅透传；**无任何消费者需要 StreamApiRequest 可赋回 ExecutableApiRequest**（探针核验）；fetcher 路径读者（request-runtime 5 位点 stableStringify/copy）仅当 ExecutableApiRequest.data 本身被改才相关=本批不改。
- **类型面测试先例**：flux-core reaction-field-types.test.ts（expectTypeOf 29 断言）+scheduling-boundary-narrowing.test.ts；**升级目标=env-stream-socket.test.ts:163 起既有 StreamApiRequest 工效 describe 块（请求对象未注解=零类型钉）[R1 m3 精化]**。
- **扩围族（successor 预裁定，探针证据；**R1 m2 计数命令落字[R2 M2 修正：无范围 grep，--include='*.tsx' 会掉 .ts 命中]：`grep -rE 'as never' apps/playground/src/pages | wc -l`=75；`grep -rE '} as any' apps/playground/src/pages | wc -l`=15；`grep -rn 'registry as any' apps/playground/src/pages | wc -l`=13；clab=`grep -rEc '} as unknown as BaseSchema' apps/playground/src/component-lab | awk -F: '{s+=$2} END {print s}'`=63；**快照注记：计数=2026-10-15 拟制期快照，pages/ 域并行会话活跃数字随行漂移——closure audit 以拟制期 HEAD 复核或接受漂移（ROI 裁定不受影响**））：WA-pages-008 活体 75 as never+15/13 as any（audit 79 算术混计勘误）——同缝（SchemaInput=BaseSchema|BaseSchema[]，BaseSchema extends SchemaObject）；**batch 级 ROI 裁定维持**（50+ 文件演示脚手架 vs 契约侧一处修）；WA-clab-001 活体恰 63（4 承重位点验真：HITL_TOOL_CALL/TOOL_CALL 接口+button-lab 三方法对象+dialog-lab loadDict number-vs-string 子族）——59 可机械剥离**以承重子族获得契约通道为前提**。两者=同一 SchemaObject/SchemaInput 契约评审决策的耦合 successor。
- **基线**（实测全绿）：flux-core 48/697；playground 53/528。
- **授权链**：**flux-core 契约面=保护区**（renderer-api.ts 类型重声明），人工确认门=用户 goal 指令四要素（时间=2026-10-15；渠道=ZCode `/goal`；引语=「执行workaround-code-smell-audit-roadmap.md直到彻底完成。每个工作项按照plan guide拟制计划完成。每个计划完成后自动提交一次」；可撤回=随时可撤）。
- **在途**：五 cast 文件+flux-core types/utils+component-lab 全清洁；并行会话 playground pages/flow-designer 域活跃（不交集）；提交严格限定本批路径。

## Goals

- **G1**：flux-core `StreamApiRequest` 扁平重声明（无 SchemaObject 继承；data?: unknown；dataType 显式 `'json'|'form-data'|'form'`；其余字段逐项保持）——五 cast 自然消亡（直接赋值零 cast）。
- **G2**：类型面判别测试升级 env-stream-socket.test.ts 工效块（expectTypeOf：interface-typed body 可赋/`StreamApiRequest` **不可**赋回 ExecutableApiRequest[交换成本钉]/data unknown 语义）。
- **G3**：五 cast 删除+宿主直赋；stream-impl.ts:310 旁证注记（不入批）。
- **G4**：WA-pages-008/WA-clab-001 successor 预裁定落 Deferred（探针证据+契约耦合论证随行；ledger 行注记）。
- 台账 WA-pgai-003 `found → verified`（closure 后）；roadmap CX-20 `todo → done`（家族 3→5 勘误+扩围 successor 标注）。

## Non-Goals

- SchemaObject 索引值放宽；ExecutableApiRequest.data 改型；stream-impl:310 cast；WA-pages-008/WA-clab-001 本批修复；JsonValue/defineSchema 死路。

## Scope

### In Scope

- packages/flux-core/src/types/renderer-api.ts（StreamApiRequest 重声明）+env-stream-socket.test.ts 类型钉升级
- 五 cast 文件删 cast 直赋
- ledger/roadmap/dev log

### Out Of Scope

- SchemaObject/ExecutableApiRequest 改型；stream-impl:310；pages-008/clab-001 修复；并行会话一切在途文件。

## Failure Paths

| 场景                            | 触发                                                  | 行为                                                              | 判别                                                                   |
| ------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 交换成本                        | 消费方需要 StreamApiRequest→ExecutableApiRequest 赋值 | 编译错                                                            | Phase 1 全仓消费穷举+expectTypeOf 不可赋钉（Phase 2 G2 钉=成本显性化） |
| fresh-literal 设 never 标记字段 | 宿主字面量设 params/includeScope 等                   | TS2353 excess property（与今日 ExecutableApiRequest 同防[R1 m1]） | 五字面量探针+tsc                                                       |

## Test Strategy

档位：**必须自动化**。特征化先钉（五 cast 现状=tsc 消灭验证[删 cast 后 tsc 绿即判别]+expectTypeOf 升级块[可赋/不可赋双面]）→重声明→tsc+套件同绿+判别变异恰红（如恢复 SchemaObject 继承=tsc 红=类型钉红腿机制）；flux-core+playground filter 门禁+哨兵+隔离五门禁（新文件 git add -N）。

## Execution Plan

### Phase 1 - 特征化钉住

Status: done（2026-10-15 实施回写；HEAD 复核 `09ed6e5b6`=计划基线 HEAD）
Targets: flux-core 测试

- Item Types: `Proof`

- [x] Proof：env-stream-socket 工效块 expectTypeOf 升级钉（interface-typed body 可赋 StreamApiRequest/不可赋回 ExecutableApiRequest/data?: unknown 语义）——**类型钉红腿机制=恢复 SchemaObject 继承则 tsc 红（编译期判别）**。
  - 落点 `packages/flux-core/src/utils/env-stream-socket.test.ts` 工效块（原 :164 起，请求对象未注解→改注解 `StreamApiRequest` 成真钉）：(a) `expectTypeOf<ChatCompletionBody>().toExtend<StreamApiRequest['data']>()` + 注解宿主字面量直赋；(b) 交换成本钉 `expectTypeOf<StreamApiRequest>().not.toExtend<ExecutableApiRequest>()`（POST-change lock，:209）；(c) `expectTypeOf<StreamApiRequest['data']>().toEqualTypeOf<unknown>()`。
  - 依赖方向守规实测：flux-core 无 flux-renderers-ai 依赖（package.json 复核）——测试内**本地结构泛型接口 `EngineMessage<M>`**（无索引签名，interface-ness 为判别本质），零向上导入。
  - 特征化红（改型前置态实录，恰 4 钉位点零噪音）：:195 TS2344 branded mismatch / :199 TS2322（根因错误码实录，与五 cast 同码）/ :209 TS2554（`not` 断言失配=mismatch-args）/ :213 TS2344 branded；vitest 运行时全绿（expectTypeOf 编译期 no-op）——钉 enforcement 点=flux-core `tsc -p tsconfig.json`（tsconfig include src 复核）。
  - 红腿机制已在 Phase 2 判别变异中双足实证（见 Phase 2 Proof 行）：恢复继承→本测试文件 4 位点全红+playground 五宿主红。
- [x] Proof：五 cast 现状核对（live 行号+形态表）+基线落字（flux-core 48/697+playground 53/528）。
  - 五 cast live 行号逐一复核与计划恒同：mock-ai-env.ts:159 / coverage-connectors.ts:109 / openai-connector.ts:52（多行体 :46-52）/ ai-rich-text-demo.tsx:94 / ai-tools-demo.tsx:44——均 `as unknown as StreamApiRequest['data']` 宿主构造体（`{messages,stream}` / `{messages,tools,stream}` / `{model,messages,tools,stream,...extraParams}`）。
  - 基线套件实测（改动前）：flux-core 48 files/698 tests 全绿（697 计划基线+本批新 1 类型钉 it）；playground 53 files/528 tests 全绿=与计划落字恒同。

Exit Criteria:

- [x] 钉全绿；交换成本钉在案。（钉 (b) 为 POST-change lock：改型前置态红=特征化证据 4 位点；Phase 2 扁平化后 flux-core typecheck exit 0 钉全绿；交换成本钉 :209 在案）

### Phase 2 - 重声明与 cast 消亡

Status: done（2026-10-15 实施回写；八门禁全绿，无 commit——Phase 3=orchestrator）
Targets: flux-core/renderer-api.ts+五 cast 文件

- Item Types: `Fix | Proof`

- [x] Fix：StreamApiRequest 扁平重声明（data?: unknown+dataType 显式）。
  - `renderer-api.ts` `export type StreamApiRequest = ExecutableApiRequest & {...}` → `export interface StreamApiRequest {...}`（同名同导出位点，export 形态恒同）；R1 M1 字段清单逐项 verbatim：url/method/data?: unknown/headers/selection/params?: never/includeScope?: never/responseAdaptor?: never/requestAdaptor?: never/responseType/downloadFileName/dataType 显式 'json'|'form-data'|'form'/streamProtocol/streamChunkType（四 never 标记+downloadFileName 保 fresh-literal excess-property 防护）；JSDoc 落根因（TS2322+TS2352 探针实录）+交换成本（不可赋回 ExecutableApiRequest，现无消费者）+类型钉指针。
- [x] Fix：五 cast 删除直赋（tsc 全绿验证=家族消亡判别）。
  - 五位点直赋（`as unknown as StreamApiRequest['data']` 全删，git diff 逐一确认）；openai-connector.ts/ai-rich-text-demo.tsx/ai-tools-demo.tsx 三文件 `StreamApiRequest` 导入随之失用→删除（mock-ai-env.ts/coverage-connectors.ts 仍有参数面使用保留）；playground typecheck exit 0=cast-free 编译判别过。
- [x] Proof：判别变异（恢复 SchemaObject 继承→tsc 红+expectTypeOf 红）→恢复→四门禁+哨兵。
  - 变异（intersection 形态原样恢复）双足恰红：flux-core 类型测试文件 4 钉位点全红（:195/:199/:209/:213）+playground 五宿主直赋 7 处 TS2322（`ChatMessage<...>[] is not assignable to type 'SchemaValue'`——cast 消亡判别双证）；恢复=字节级 copy 回写，shasum-256 恢复前后恒同（`1be0c668…d53cd`）→typecheck 复绿 exit 0。
  - 门禁实测：flux-core {typecheck/build/lint exit 0+test 48/698 全绿}；playground {typecheck/build/lint exit 0+test 53/528 全绿}。哨兵：按本批 orchestrator 指令不需要（type-only 变更；flux-core 测试计数 +1 即类型钉 it，已披露）。

Exit Criteria:

- [x] 五 cast grep 归零；flux-core+playground 套件同绿；ui/flux-core index 零变更（类型重声明不加导出）。
  - grep `as unknown as StreamApiRequest` 全仓=0 活代码命中（余 2 命中均注释行：renderer-api.ts JSDoc 根因记载+测试钉注释）；flux-core 导出链（index.ts/types/index.ts/types/renderer.ts）git 零 diff；knip：flux-core workspace exit 0；playground workspace 16 unlisted-dep 命中经 stash 往返实证**无本批亦在同**（全落并行会话 App.tsx/scada|graph|pivot pages 域，零交集本批）+注册门禁 `pnpm check:knip-baseline` exit 0。

### Phase 3 - 回写与收口

Status: done（2026-10-15：台账 WA-pgai-003 verified[220=found 53+verified 167/未处置 0]+扩围两行 successor 注记；roadmap CX-20 done[家族 3→5 勘误+home 裁定随行]；dev log 10-15；隔离五门禁=**全链 exit 0 含 check**[worktree@HEAD 09ed6e5b6+8 路径]；closure audit agent_9cecf003 R1 approved[0B/0M/3m：m1=14 字段计数措辞/m2=四 never+downloadFileName JSDoc[已修复]/m3=隔离计数 51/515 树态披露——均已履行]后据实回勾）
Targets: ledger、roadmap、dev log

- Item Types: `Proof | Decision`

- [x] Proof：台账 WA-pgai-003 verified+扩围两行 successor 注记；roadmap CX-20 回写（家族 3→5 勘误+home 裁定随行）；dev log。
- [x] Proof：隔离五门禁；独立 closure audit。

Exit Criteria:

- [x] `pnpm workaround:reconcile`（scripts/workaround-audit/reconcile-coverage.ts）exit 0；closure audit approved。（closure audit agent_9cecf003 approved 后据实回勾）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_fcdbe43e-2c1f-4742-acdc-7f3a1eacc018，review-only）
- Verdict: R1 `fail`（0B/1M/3m）→全修；R2 `fail`（0B/1M/1m——两条计数命令不自复现[--include 过滤掉 .ts 命中]）→修正+快照注记；R3 `pass`（0B/0M——四命令逐条复现实证）
- Rounds: 3
- Findings addressed: **M1** 扁平形态字段不完整（9 字面枚举静默丢弃活体 13 字段面 5 字段：params/includeScope/responseAdaptor/requestAdaptor 四 never+downloadFileName——与「其余字段逐项保持」矛盾）→**交付完整 14 字段面**（四 never 标记+downloadFileName 保 fresh-literal excess-property 防护=与今日同防；行为今天惰性[流路径零读写]但形态漂移禁）；**m1** Failure Paths 增 never 标记 excess-property 行；**m2** 三族计数命令落字（75/15/13/63 可复现）；**m3** 行号精化（:163 起/:33-69 承重 :38-63）。R1 verified-clean：五 cast 位点（含 coverage −6 漂移 CX-19 薄壳化归因）/类型链/根因探针复现（TS2322+TS2352 双实录）/**反向可赋值穷举含隐藏候选 StreamFetcher 参数=api: StreamApiRequest 非 ExecutableApiRequest**[本批最承重安全声称独立验证]/data 消费者 unknown 安全/JsonValue+Omit 死路探针复现/两扩围族 4 承重位点验真/expectTypeOf 先例+工效块零钉/人工门四要素/模板合规。

## Closure Gates

- [x] 扁平重声明落地+五 cast 消亡（交换成本钉在案）
- [x] 类型面判别（expectTypeOf 双面钉+tsc 判别变异+filter 门禁+哨兵）
- [x] 台账/roadmap/dev log 齐
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（agent_9cecf003 R1 approved，据实回勾）
- [x] `pnpm typecheck`（隔离 worktree cx20-verify@HEAD 09ed6e5b6，exit 0）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`（同上）
- [x] `pnpm test`（同上——隔离 worktree flux-core 48/698+playground 51 文件/515 用例[=HEAD 50/474+1 类型钉；主树 53/528 含并行 2 未追踪测试 13 用例，树态已识别披露[closure m3]]）
- [x] `pnpm check`（同上——**全链 exit 0**（78/78 任务；oversized 仅 2 豁免 locale=该 HEAD 无环境红）；新文件 git add -N）

## Deferred But Adjudicated

- **WA-pages-008（75 as never+15/13 as any）与 WA-clab-001（63 cast，4 承重）successor 预裁定（拟制期，2026-10-15）**
  - Classification: `moved to explicit successor ownership`
  - Why Not Blocking Closure: 同缝（SchemaObject/SchemaInput 索引签名 seam）但修复=同一契约评审决策（SchemaObject 索引值放宽 vs defineSchema unknown 语义通道）；pages-008 75 处 50+ 文件 demo 脚手架 batch ROI 裁定维持[wa-15a 审计原文]；clab-001 59 机械剥离以 4 承重子族获通道为前提（否则表面 12 残错）。
  - Successor Required: `yes`
  - Successor Path: SchemaObject/SchemaInput 契约评审批（与本批 G1 决策[StreamApiRequest 独立扁平化]互补——本批不动 SchemaObject 即为其保留全部选项）。

## Non-Blocking Follow-ups

- stream-impl.ts:310 第二处 as unknown as（stream facade 变异缝——旁证实例注记，非同型）。
- env-stream-socket 其余未注解块的 expectTypeOf 补全（本批仅升级工效块）。

## Closure

Status Note: 2026-10-15 收口。StreamApiRequest 扁平 14 字段重声明（data?: unknown+四 never 标记+dataType 显式+JSDoc 根因/交换成本/钉指针）落地；五 cast 消亡直赋（grep 归零）；类型钉先红实测（继承未恢复时 4 钉位点+五宿主 7×TS2322）+判别变异双腿（审计员亲手恢复继承→双包 tsc 红→sha 一致恢复→双绿）；依赖方向守约（局部同构接口零上导）；两扩围族 successor 预裁定（探针证据+计数命令落字+快照注记）；实施=派驻 agent，本会话编排/门禁/回写。

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_9cecf003-c9ea-4cdb-9904-f3839869c0f1，review-only）
- Rounds: 1
- Verdict: `approved`（0B/0M/3m——m1=字段计数措辞 13→14[已履行]/m2=五 never→四 never+downloadFileName[plan+JSDoc 均已修复]/m3=隔离计数 51/515 树态披露[已履行]）
- Findings addressed: 审计员逐项对账（扁平 interface 同位点同名+14 字段逐字+JSDoc/导出链零差异/3 expectTypeOf+注解字面量+局部 EngineMessage 零上导/五宿主直赋+3 失用 import 清/交换成本全消费穷举含 StreamFetcher 参数=StreamApiRequest 本体/门禁日志 flux-core 48/698+playground 51/515+check 78/78 任务链终态/8 路径 sha256 核验/保护文件零标识符）+**亲判**（恢复继承形态→flux-core 恰 4 钉位点红[T2344/2322/2554/2344]+playground 五宿主 7×TS2322→sha256 1be0c668… 前后一致逐字节恢复→双包 exit 0）。

Follow-up:

- stream-impl.ts:310 第二处 as unknown as（stream facade 变异缝——旁证注记，非同型）。
- env-stream-socket 其余未注解块 expectTypeOf 补全（本批仅升级工效块）。
- WA-pages-008/WA-clab-001 successor（SchemaObject/SchemaInput 契约评审批——本批扁平化保留其全部选项）。
