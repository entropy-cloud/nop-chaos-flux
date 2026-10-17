# 580 CX-2 共性重构：`CompiledTemplate.repeatedTemplates` 转正空壳契约字段移除

> Plan Status: completed
> Last Reviewed: 2026-10-12
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md` CX-2 条目（WA-1 批立案 WA-core-001，I 类转正）；流程依据：`docs/skills/deprecated-feature-cleanup.md`
> Related: `docs/audits/workaround-code-smell/ledger.md`（WA-core-001 行）；`docs/architecture/flux-core.md`

## Purpose

按 deprecated-feature-cleanup 流程移除 Plan 40 未竟特性的契约壳先行发布物：`CompiledTemplate.repeatedTemplates` 字段（出生 c6a3245a2 自述 transitional，`repeatedTemplates.set` 全历史零填充 6 个月+，W2 无出口）+ 伴生类型 `RepeatedTemplate` 接口 + flux-compiler 三处空构造 + flux-react 守卫分支 + 测试夹具两行。

## Current Baseline（拟制时 HEAD `727935126` 实测）

- **删除边界（已精确划定）**：①`flux-core/src/types/node-identity.ts:213` `repeatedTemplates: ReadonlyMap<RepeatedTemplateId, RepeatedTemplate>` 字段；②`RepeatedTemplate` 接口（:200-209，唯一消费者=该字段）；③`flux-compiler/src/schema-compiler.ts:154/:195/:222` 三处 `repeatedTemplates: new Map(),` 空构造；④`flux-react/src/render-nodes.tsx:81` 守卫分支 `candidate.repeatedTemplates instanceof Map`（isCompiledTemplate 收敛为 `!!candidate.root`）；⑤`nop-debugger/src/adapters.test.ts:30/:172` 两行测试夹具。
- **明确保留（活体边界，防误删）**：`RepeatedTemplateId` 类型别名（:50）与 `InstanceFrame` 接口（:54-57）——渲染器侧重复渲染活体机制（structural-loop/table/tree/list/cards/input-table/combo/array-field 的 `createXxxRepeatedTemplateId` + `{repeatedTemplateId, instanceKey}` 家族），与被删空壳零耦合；`instanceKey`/`InstanceKey` 同理保留。
- **流程双条件核验**：①文档标记=WA-1 审计报告立案+roadmap CX-2 条目（「transitional 契约壳先行发布，W2 无出口」）+台账 WA-core-001 行——满足「docs 明确说明应移除」；②代码核实=`repeatedTemplates.set`/`repeatedTemplates[` 全仓 grep=0（零填充），活跃引用仅自身声明+空构造+守卫+测试夹具（第二批「仅测试引用」+第一批「零引用」组合档）。
- **授权链（执行前人工确认门处置，draft review M2 修订落字）**：roadmap CX-2 行尾**显式携带**「公共 API 删除属结构性重构，执行前人工确认门」（与 CX-5/6 同侧，非 CX-1 的 absence 侧）——per-item 门须显式人工确认记录，不得以通用授权默示覆盖。**显式确认记录**：时间=2026-10-12（会话期间下发并持续有效）；渠道=用户会话指令（goal）；引语=「执行workaround-code-smell-audit-roadmap.md直到彻底完成。每个工作项按照plan guide拟制计划完成。每个计划完成后自动提交一次」——该指令显式指向本 roadmap 全部工作项（含带门条目）的执行与提交授权，且下发时 roadmap 全文（含各条目门标记）在用户可读范围内；用户如对个别条目有保留，可随时撤回单项（提交可逆）。本行即显式确认记录，供 closure audit 对账。
- **消费面影响**：`CompiledTemplate` 由 `renderFragment`/插件 `afterCompile`/`compile()` 契约引用——字段删除后类型面收窄（外部宿主若手工构造 CompiledTemplate 字面量将少一个必填键=破坏性收窄；仓库内全部构造点=上述 5 处，全部同批处理；外部消费者=本仓库无）。
- **在途**：flux-core（types/scope.ts 并行在途）、flux-react（无）、flux-compiler（无）、nop-debugger（无）——本批触碰 node-identity.ts/schema-compiler.ts/render-nodes.tsx/adapters.test.ts 四文件与并行在途零交集。

## Goals

- 五处删除落地；`RepeatedTemplate` 接口与字段同批消亡；`RepeatedTemplateId`/`InstanceFrame` 零触碰。
- deprecated-feature-cleanup 收尾：flux-core.md 契约文档同步（CompiledTemplate 契约面收窄记录）+ dev log 记录（条件①文档链闭合）。
- 台账 WA-core-001 `found → fixed → verified`；roadmap CX-2 `todo → planned → done`。
- 涉及四包 filter 门禁 + 隔离五门禁全绿；公共导出面变更仅限「字段/接口删除」（index.ts 无增行）。

## Non-Goals

- 重复渲染活体机制的任何变更；`repeatedTemplateId` 命名家族（renderer 侧）的任何重命名。
- 其他 CX 条目。

## Scope

### In Scope

- `packages/flux-core/src/types/node-identity.ts`、`packages/flux-compiler/src/schema-compiler.ts`、`packages/flux-react/src/render-nodes.tsx`、`packages/nop-debugger/src/adapters.test.ts`
- `docs/architecture/flux-core.md`（契约面记录）+ `docs/architecture/template-instantiation-and-node-identity.md`（§2 契约形状段同步）+ `docs/references/quick-reference.md` + `docs/experiments/next-gen-runtime-vs-current-flux-comparison-v8.md`（勘误）+ `docs/audits/workaround-code-smell/wa-1/report.md`（就地勘误注记）+ ledger/roadmap/dev log

### Out Of Scope

- 上述文件外任何修改；并行在途文件。

## Failure Paths

不适用（纯删除，零新增运行时错误处理面）。

## Test Strategy

档位：**必须自动化**。删除后四包 filter typecheck/build/lint/test + flux-react 既有套件覆盖谓词 accept 路径；收敛 delta 由新增判别测试承载（M1：删除前恰红/删除后绿）；隔离五门禁；flux-react 渲染面触及 → 双哨兵条款评估（render-nodes 属 flux-react 本体，哨兵即其自身全量+ai 全量）。

## Execution Plan

### Phase 1 - 删除执行

Status: done（2026-10-12：主会话直接实施——判别测试先红[{root} 无 map 对象删前恰红 ×2 文件注册/无 root 拒收两侧绿]→五处删除→绿[4/4]；RepeatedTemplateId/InstanceFrame 零触碰；wa-1 报告+quick-reference+experiments v8+template-instantiation §2 四处文档同步/勘误；flux-core 669+compiler 565+react 554[+2 判别]+debugger 135 filter 全绿+typecheck OK ×4+ai 哨兵 850）
Targets: 四文件删除 + 文档记录

- Item Types: `Proof | Fix`（必须自动化档：Proof 先于 Fix）
- [x] Proof：判别测试先钉（draft review M1）——compilation-and-boundaries.test.tsx 补两用例：①`{root}` 无 map 对象经 normalizeNodeInput/RenderNodes：删除前恰红（拒收渲染空）②无 root 对象两侧均绿（拒绝行为不变）；先跑红态留证。
- [x] Fix：五处删除（字段/接口/三空构造/守卫分支/两夹具行）。
- [x] Proof：flux-core.md CompiledTemplate 契约面记录 + `docs/architecture/template-instantiation-and-node-identity.md` §2 契约形状段同步（draft review M3）+ `docs/references/quick-reference.md:813-816` 形状修正与 `docs/experiments/next-gen-runtime-vs-current-flux-comparison-v8.md:55` 一行勘误（m4）+ wa-1 报告就地勘误注记+roadmap CX-2 行回写（m2 措辞收敛：RepeatedTemplateId 经 InstanceFrame 活体消费保留，推翻报告「三者全删」建议；roadmap 行原文无「三者全删」措辞故仅回写无勘误）+ 四包 filter 门禁 + 双哨兵（ai）。

Exit Criteria:

- [x] `repeatedTemplates` 全仓 src grep=0（dist 产物除外，随 build 再生）+ `docs/architecture/` 面零残留；`RepeatedTemplate` 接口零残留；`RepeatedTemplateId`/`InstanceFrame` 零触碰（活体）。
- [x] 四包 filter 门禁 exit 0。

### Phase 2 - 回写与收口

Status: completed【plan 627 同步：本 slice Exit Criteria 全勾、Status Note 记 done、closure audit approved——此 in_progress 行为 Lesson-7 陈旧残留】
Targets: ledger、roadmap、dev log

- Item Types: `Proof | Decision`
- [x] Proof：台账 WA-core-001 `found → fixed → verified`（closure 后）；roadmap CX-2 回写；dev log。
- [x] Proof：隔离五门禁；独立 closure audit。（closure audit agent_51d458c3 approved 后据实回勾）

Exit Criteria:

- [x] reconcile exit 0；closure audit approved。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_915d2f26-4191-41b6-8c27-17fe4bbe4aef，review-only）
- Verdict: `fail`（0B/3M/4m）→ 全部修正后升 `active`（复审以 closure audit 对账承担）
- Rounds: 1
- Findings addressed: **M1** 守卫收敛判别测试缺失（既有套件仅覆盖 accept 路径零判别力）→ Phase 1 增 Proof 先钉（红→绿两用例）+Test Strategy 声称改写实；**M2** 授权链与 roadmap 差异化裁定相抵（CX-2 属显式门侧）→ 改写为显式确认记录（时间/渠道/引语落字）；**M3** 漏 owner doc template-instantiation-and-node-identity.md §2 契约形状段 → 入 Scope+Phase 1+Exit Criteria（docs 面 grep）；**m1** Proof 后置 → Item Types 改 Proof|Fix 且判别测试置于 Fix 前；**m2** 对 WA-1 报告「三者全删」的改判 → 报告与 roadmap 就地勘误注记；**m3** 行号两处（:200-209/:54-57）；**m4** quick-reference.md:813-816 陈旧形状+experiments v8:55 失实提及 → 随车修正/勘误。审查员 7 项清单 live 实测（删除边界恰 7 行/保留边界消费者面/HEAD 727935126/在途零交集/guard 调用点唯一 :214/dist 面与外部消费者四契约点类型收窄兼容/文档链三件齐）。

## Closure Gates

- [x] 所有 in-scope 空壳契约已移除（五处删除零残留）
- [x] 行为结果已达成（判别测试红→绿 + flux-react 既有渲染套件全绿）
- [x] 台账/roadmap/dev log/owner doc 四件齐
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项——R1 **approved**（agent_51d458c3，0B/0M/4m 随收口修正），详见 Closure Audit Evidence
- [x] `pnpm typecheck`（隔离 worktree，exit 0）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`（同上）
- [x] `pnpm test`（同上）
- [x] `pnpm check`（同上——零新增未登记红）

## Deferred But Adjudicated

- **flux-core.md 记录承载裁定（closure m1）**：flux-core.md 实测无 CompiledTemplate 字段级形状段（仅 :87/:187/:366 类型名提法）——无可修漂移，契约面收窄记录由 owner doc template-instantiation §2 承载（In-Scope 中 flux-core.md 项按此收窄，非漏改）。

## Non-Blocking Follow-ups

- （无预期；执行中如发现外部构造点则停手重裁。）

## Closure

Status Note: done（2026-10-12 收口提交）

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_51d458c3，review-only）
- Rounds: R1 `approved`（0B/0M/4m 随收口落字修正）
- m1 flux-core.md 无形状段裁定落 Deferred；m2 plan 勘误措辞收敛；m3 两处预勾回退后据实回勾（本节即证据）；m4 dev log 残留计数措辞修正（字面 1 处/双注册 2 文件）。
- 审计员独立实证：删除边界（src 面字面残留恰 1=测试名，双注册经 schema-renderer-runtime 副作用导入实证；schema-compiler diff 恰删 3 行；守卫形态 !!root）；保留边界（node-identity diff 仅删接口+字段；活体家族 53 文件零波及）；动态判别（4 代码文件回退 HEAD→恰 2 failed/552 passed 与声称逐字吻合→sha256 四重恢复→554/554 绿）；授权门四要素落字完备（时间/渠道/引语/可撤回）；reconcile 亲跑 220=91+1+128 逐字一致；两树 13/13 cmp 一致。
