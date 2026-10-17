# 582 CX-4 共性重构：表达式错误判别码化与三处嗅探收敛（UnpopulatedScopeAccessError）

> Plan Status: completed
> Last Reviewed: 2026-10-13
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md` CX-4 条目（WA-2 批立案 WA-runtime-001，台账 78 行 successor-required→本批）；先例：plan 579/580/581
> Related: `docs/architecture/flux-core.md`、`docs/architecture/renderer-env.md`

## Purpose

终结跨包字符串嗅探契约：flux-formula evaluator 的 null/undefined 成员访问错误（evaluator.ts:362 抛出点，经 :57 createExpressionError 工厂产裸 `new Error(message)`）无机器可读判别码，flux-runtime 三个消费点被迫按 `cause.message === 'Cannot access member of null or undefined'` 字符串嗅探（node-runtime.ts:92-98 命名谓词 + formula-data-source-controller.ts:61-68 逐字副本 + api-data-source-controller-state.ts:139-152 内联副本+NODE_ENV warn 特判——漂移已现[内联版独有 warn 分支]）。判别码化后三处收敛单一共享谓词。

## Current Baseline（拟制时 HEAD `ff5e9e699` 实测）

- **抛出点**：flux-formula/evaluator.ts:362 `throw createExpressionError('Cannot access member of null or undefined')`（objectValue==null 臂；node.optional 臂已先行返回 undefined 不抛）；:57 createExpressionError 为通用工厂（其余调用点产普通 Error，不动）。
- **三消费点**：①node-runtime.ts:92-98 `isUnpopulatedScopeError` ②formula-data-source-controller.ts:61-68 同名谓词逐字副本 ③api-data-source-controller-state.ts:139-152 内联副本+NODE_ENV!==production warn 分支（漂移证据——warn 是调用点行为非谓词行为，收敛后原位保留）。
- **依赖方向核验**：flux-runtime package.json 直依 `@nop-chaos/flux-formula: workspace:*`——Error 子类方案（三选一之 A）无需新增依赖边。
- **在途**：flux-formula 零在途；flux-runtime 并行在途 3 文件（runtime-factory.ts/scope.ts/dialogs 测试）与本批目标（evaluator.ts+三消费点+新共享谓词件）零交集。
- **契约评审裁定（roadmap「三选一，契约评审定」+执行前人工确认门）**：选定 **A=Error 子类**——`flux-formula` 导出 `UnpopulatedScopeAccessError extends Error`（:362 抛出点专用；**message 逐字不变**，外部既有字符串匹配者向后兼容；instanceof 判别类型安全）；否决 B=code 字段（duck-typed 弱契约）与 C=哨兵常量至 flux-core（仍是字符串比较）。**形状按仓内三先例**（draft review m2：renderer-api StreamChunkParseError/expression-errors CircularDependencyError/document-io SaveDocumentError——constructor 内 `this.name` 赋值，无类字段 name[useDefineForClassFields=true 陷阱]、无 setPrototypeOf[ES2022 原生语义，build=纯 tsc]）。**显式人工确认记录**（与 plan 580 同链）：时间=2026-10-12（会话期间下发并持续有效）；渠道=用户会话指令（goal）；引语=「执行workaround-code-smell-audit-roadmap.md直到彻底完成。每个工作项按照plan guide拟制计划完成。每个计划完成后自动提交一次」；单项可撤回（提交可逆）。
- **公开面影响**：flux-formula index 导出 +1 类（纯增量，同批被 flux-runtime 消费）；flux-runtime 公共导出零变更（谓词为包内共享件）。
- **既有测试（draft review M1 修正）**：flux-formula evaluator 套件+flux-runtime 点①（runtime-node-props-unpublished-scope）点②（formula-data-source-unpublished-scope）两套件在案；**点③（api stopWhen 降级支 return false+NODE_ENV warn）零既有直接守卫——缺口由本批 Proof 补钉**；判别测试补：子类抛出断言（删前 constructor 为 Error→红）+谓词匹配+message 不变断言+双层包装恰不上当（M2 单层形态钉）。

## Goals

- `UnpopulatedScopeAccessError` 落地（flux-formula）；:362 抛出点改用；message 逐字不变。
- flux-runtime 单一共享谓词（draft review m1：src 根级——根级专件或并入既有 error-utils.ts，弃 async-data 位[避免 node-runtime 热路径对 async-data 子系统反向耦合]）；**判别形状=单层 `error.cause instanceof UnpopulatedScopeAccessError`，与现三副本形态等价**（draft review M2：否决全链遍历——formula-compiler :207/:297 多层包装下全链 instanceof 会静默扩大吞错面=行为变化）；三处改引；api 位点 warn 分支原位保留。
- 台账 WA-runtime-001 `found → fixed → verified`（closure 后）；roadmap CX-4 `todo → planned → done`。
- flux-formula/flux-runtime filter 门禁 + 双哨兵 + 隔离五门禁全绿；flux-runtime index.ts 零变更。

## Non-Goals

- evaluator 其他错误通道的判别码化（只做本条 null/undefined 成员访问语义）；三消费点行为语义变化（warn 分支/降级返回 false 均保持）；**谓词全链 cause 遍历**（M2：单层形态等价收敛，遍历归 Deferred 独立裁定）。

## Scope

### In Scope

- `packages/flux-formula/src/evaluator.ts`（+index 导出行+子类定义位）+ 判别测试
- `packages/flux-runtime/src/node-runtime.ts`、`async-data/formula-data-source-controller.ts`、`async-data/api-data-source-controller-state.ts`、新共享谓词件
- `docs/architecture/flux-core.md`（表达式错误通道补一句——跨包契约增量记录，draft review m4）+ ledger/roadmap/dev log

### Out Of Scope

- 并行在途文件；evaluator 其他错误消息；消费点行为变化。

## Failure Paths

不适用（错误判别增强，无新增运行时错误处理面）。

## Test Strategy

档位：**必须自动化**。判别测试先红后绿（子类断言）；flux-formula+flux-runtime filter 四门禁 + 双哨兵（flux-renderers-ai + flux-react，基线读数对照 581 终态 ai 850/850+react 554/554，以当批实测在案）+ 隔离五门禁。

## Execution Plan

### Phase 1 - 判别测试与落地

Status: done（2026-10-13：实施派驻 agent agent_8316d28c 执行——判别测试先红[name 断言 expected Error to be UnpopulatedScopeAccessError 恰红]→子类落地→239/239 绿；M1 点③特征化钉 ×3[unpublished scope→false+warn spy+production 静默]；M2 谓词钉 ×6 含双层包装恰不上当+plain-Error 携哨兵 message 不匹配[类身份非 message 嗅探]；动态判别 3 组变异恰红→恢复[:362 回退/谓词 message 化/谓词全链化]；point② fixture 忠实化[new Error(SENTINEL)→真实类，断言零改动]；flux-formula 239+flux-runtime 1523+双哨兵 ai 850/react 554 全绿；index.ts 零变更）
Targets: flux-formula + flux-runtime

- Item Types: `Proof | Fix`（Proof 先于 Fix）
- [x] Proof：判别测试先钉——①evaluator null 成员访问抛出物 constructor 断言（子类；删前=Error 恰红）②message 逐字不变断言 ③**点③补特征化钉（unpublished scope→false+NODE_ENV warn 分支原位）+①②既有套件直通**（M1）④双层包装恰不上当（M2 单层形态钉）。
- [x] Fix：子类+抛出点改用+三处收敛单一谓词（warn 分支原位）。
- [x] Proof：两包 filter 四门禁 + 双哨兵 + flux-runtime index.ts 零变更。

Exit Criteria:

- [x] 红→绿证据在案；既有套件同绿（message 兼容证明）。
- [x] filter 门禁+双哨兵 exit 0。

### Phase 2 - 回写与收口

Status: done（2026-10-13：台账 WA-runtime-001 fixed→verified 翻转[终读 220=86+0+134]；closure audit R1 approved[agent_9a55bc67，0B/0M/3m：m1 两处门预勾回退回勾/m2 dev log 行数订正/m3 终态文件数订正]；roadmap CX-4 done；CX-3 遗留 oversized 随批修复[拆分三文件]）
Targets: ledger、roadmap、dev log

- Item Types: `Proof | Decision`
- [x] Proof：台账 WA-runtime-001 `found → fixed → verified`（closure 后）；roadmap CX-4 回写；dev log。
- [x] Proof：隔离五门禁；独立 closure audit。（closure audit agent_9a55bc67 approved 后据实回勾）

Exit Criteria:

- [x] reconcile exit 0；closure audit approved。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_717cb44c-ec1e-40cf-b73d-5fdc2b453d0e，review-only）
- Verdict: `fail`（0B/2M/4m）→ 全修转 active
- Rounds: 1
- Findings addressed: **M1** 点③降级支零既有守卫（grep 实证）→ Baseline 修正+Proof ③ 补钉；**M2** 谓词判别形状未钉（单层 vs 全链遍历——formula-compiler 多层包装下全链 instanceof 静默扩大吞错面=行为变化）→ 单层形态落字+双层包装恰不上当钉+遍历归 Deferred；**m1** 谓词落位=src 根级（弃 async-data 位防 node-runtime 反向耦合；error-utils.ts 或专件）；**m2** 子类形状按仓内三先例（this.name 构造器赋值/无类字段/无 setPrototypeOf）；**m3** 双哨兵基线读数落字（ai 850/react 554 对照）；**m4** flux-core.md 补一句入 Scope。审查员 14 项实测（HEAD ff5e9e699/在途零交集/抛出点唯一性[evaluator 11 处 createExpressionError 全异 message，只改 :362 可行]/全仓 message 引用 4 生产+3 测试+9 历史快照文档[免勘误裁定：message 不变故不失实，check 链无耦合]/ES2022 原生语义/knip 消费链/授权四要素同构 580）。

## Closure Gates

- [x] 嗅探契约已终结（三处单一谓词+类型安全判别）
- [x] 行为兼容（message 逐字不变+既有套件同绿+warn 分支原位）
- [x] 台账/roadmap/dev log 齐
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项——R1 **approved**（agent_9a55bc67，0B/0M/3m 随收口修正），详见 Closure Audit Evidence
- [x] `pnpm typecheck`（隔离 worktree，exit 0）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`（同上）
- [x] `pnpm test`（同上）
- [x] `pnpm check`（同上——零新增未登记红）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- evaluator 其他错误语义的判别码化（如后续需要）归独立契约批。

## Closure

Status Note: done（2026-10-13 收口提交）

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_9a55bc67，review-only）
- Rounds: R1 `approved`（0B/0M/3m 随收口落字修正）
- m1 两处 closure 依赖门预勾回退回勾（本节即证据）；m2 dev log 拆分三文件行数订正（206/398/229→实测 176/376/194；727 系 wc 口径/checker 读 728 系 split 计数法差；「4 describe 块并入 3 文件」措辞精确化）；m3 dev log 终态文件数订正（145 首跑→终态 147 passed+1 skipped=148）。
- 审计员独立实证：子类三先例形状+message 逐字同串+三消费点改引+warn 分支原位零动+单层谓词；**CX-3 拆分复核：18 用例体逐字相同（排序多重集 608 行=608 行非抽样）+三文件 <700+两树原件已删**；动态判别 3 组亲手恰红（①:362 回退普通 Error→子类断言恰红 ②谓词 message 化→plain-Error 钉恰红[类身份≠message 嗅探实证] ③谓词全链化→双层包装钉恰红）→sha256 双重恢复；主树 flux-formula 239/239+批相关 16/16 复跑；reconcile 亲跑 220=86+1+133；隔离首跑 check exit=1 逮 CX-3 遗留 oversized 的诚实轨迹+终态全绿；两树 18 批路径逐字节一致。
