# 590 CX-12 共性重构：dialog/drawer 受控 open 编译期通道接线

> Plan Status: completed
> Last Reviewed: 2026-10-14
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md` CX-12 条目（WA-4 批立案 WA-basic-001，台账 109 行 successor-required→本批）；先例：plan 588/589
> Related: `docs/architecture/renderer-runtime.md`

## Purpose

把 dialog/drawer 受控 open 的运行时正则回读（`check:audit-runtime-raw-schema-reads` [high]×2 live）切换到同包 palette 已验证的编译期通道（`compileOpenBinding` SchemaFieldRule），删除 raw read 与正则副本——compile-once 原则回归+类型/运行时漂移修复（schema 类型未承认 string 表达式形）。

## Current Baseline（2026-10-14 live 实测，HEAD `7dcfea0a5`）

- **治愈原语在盘**：`surface-renderer-definitions.ts:261-276` `compileOpenBinding`（SchemaFieldRule：简单 `${path}` 记录 scope path 到 `{kind: OPEN_BINDING_KIND, path, value: compileValue(value)}` 包装对象；非简单表达式 path=undefined 纯闩语义），palette 字段数组以规则项混入（:352）。
- **病人位点**：`use-surface-renderer.ts` ①`:23-30` `extractControlledOpenPath`（正则副本 2，:28）②`:218-219` 用户关闭臂 raw read+③`:539-540` effect 臂 raw read（均 `(templateNode.schema as {open?}).open` 后本地正则）——门禁 `node scripts/audit/find-runtime-raw-schema-reads.mjs` live 报 [high]×2（本批对象；同报 echarts:76/scada:79 两点=他批对象不触碰）；正则全文法包内 live 2 份（definitions:267+use-surface-renderer:28；roadmap「3 处」为含 palette 注释例的旧口径，就地勘误）。
- **消费面唯一**：`use-surface-renderer.ts:59` `controlledOpen = resolvedProps.open`（plain prop 编译=表达式求值布尔）；palette 消费模式=`:283-291` kind 判别+`path`+`Boolean(value)`（props 异步解析首帧空袋防御随迁）。
- **undefined 值边界（draft review R1 M1）**：现实现的 controlled/uncontrolled 判据=`resolvedProps.open !== undefined`（:89/:200/:216/:271/:478/:525 全 hook 一致）——简单 `${path}` 求值为 undefined（作用域变量未置）时**旧实现走 uncontrolled 闩**（defaultOpen 生效、toggle 写非受控 store）；包装通道下包装对象在位即受控→`Boolean(undefined)`=false=**controlled-closed**（X 关闭写回 scope）。本批裁定=**采 palette 同型 controlled-closed**（跨面一致性），属申报边界语义改判（判别钉必具：旧实现下 defaultOpen 会打开、新实现保持关闭+写回），Failure Paths 同步改判。
- **类型漂移**：`schemas.ts` DialogSchema:76/DrawerSchema:107 `open?: boolean`——未承认运行时已支持的 `'${path}'` string 形（palette 同位 `open?: boolean | string` :397+文档注释）。
- **既有测试**：`surface-controlled-x-close.test.tsx` plan-459 受控关闭钉（X 关闭清 surface 栈+防重开）在盘；basic 套件 72 文件/666 用例（CX-10 后基线）。
- **授权链**：Renderer 定义字段契约变更（sharedSurfaceFields 的 `open` 从 plain prop 换 SchemaFieldRule+schema 类型放宽 `boolean | string`）=结构性，人工确认门=用户 goal 指令落字（时间=2026-10-14；渠道=ZCode `/goal`；引语=「执行workaround-code-smell-audit-roadmap.md直到彻底完成。每个工作项按照plan guide拟制计划完成。每个计划完成后自动提交一次」；可撤回=用户可随时后续指令撤回）。包内零公共导出新增（OPEN_BINDING_KIND 保持包内移动，ui/index 不触）。
- **在途**：主工作树并行在途 14 文件与本批零交集（basic 包零在途）；提交严格限定本批路径。

## Goals

- `compileOpenBinding`+`OPEN_BINDING_KIND`+绑定接口收拢单一来源（新包内件 `surface-open-binding.ts` 或 definitions 内迁，palette/definitions/use-surface-renderer 三方同源），dialog+drawer 字段数组接通同一规则。
- `use-surface-renderer` 改读 resolved 包装对象（kind 判别+path+Boolean(value)，首帧空袋防御随迁）；删除 `extractControlledOpenPath` 与 2 处 raw read；门禁复跑 [high] 本批对象=0。
- **undefined 值边界采 palette 同型 controlled-closed**（R1 M1 裁定，申报语义改判+判别钉在案；其余语义面等价切换）。
- schema 类型修正：DialogSchema/DrawerSchema `open?: boolean | string`+文档注释（与 palette 同形，文档/运行时漂移修复）。
- 台账 WA-basic-001 `found → verified`（closure 后）；roadmap CX-12 `todo → done`。

## Non-Goals

- echarts:76/scada:79 raw read 位点（他批对象）；dialog/drawer 其他字段接线；palette 行为变更。

## Scope

### In Scope

- `packages/flux-renderers-basic/src/`：surface-renderer-definitions.ts、use-surface-renderer.ts、command-palette.tsx（仅 import 源切换）、schemas.ts（open 类型）、新共享件与测试；ledger/roadmap/dev log

### Out Of Scope

- 主工作树在途 14 文件；其他 raw-schema-read 位点；ui 包。

## Failure Paths

唯一申报边界：简单 `${path}` 求值 undefined 时旧实现=uncontrolled 闩（defaultOpen 打开）→新实现=controlled-closed（palette 同型，R1 M1 裁定）——判别钉承载（旧实现必挂）；其余语义面（boolean 纯闩/非简单表达式/写回 parity）等价切换，由特征化钉保持。

## Test Strategy

档位：**必须自动化**。特征化先钉（受控 open 全语义面：简单表达式关闭写回 false+plan-459 重开 parity[既有钉核对]/drawer 同语义/boolean 纯闩形/非简单表达式 path=undefined/**undefined 值判别钉[旧实现必挂]**/首帧空袋防御）→接线→套件同绿+判别变异恰红；basic filter 四门禁+双哨兵+raw-schema-reads 门禁复跑+隔离五门禁（新文件 git add -N）。

## Execution Plan

### Phase 1 - 特征化钉住

Status: done（2026-10-14：新件 `surface-open-binding.test.tsx` 5 钉——drawer X 关闭写回+幂等 setValue 重开（dialog plan-459 同语义补齐）/boolean open 纯闩（X 关后无关 re-render 保持关闭）/非简单表达式 `${flagA || flagB}` 不写回（probe flagA=true 在案）+闩保持/undefined 值判别钉/**首帧空袋防御钉**；HEAD 下实测 4 特征化钉全绿+判别钉恰红（`_tmp/cx12-phase1-red-leg-vs-head.log`：1 failed | 670 passed——旧实现 defaultOpen 闩打开 Undefined body=申报语义改判的判别红腿）；既有 plan-459 钉 6 例同文件在盘零改动）
Targets: flux-renderers-basic 测试

- Item Types: `Proof`

- [x] Proof：受控 open 语义面钉——dialog 简单表达式关闭写回（X/Esc/外点→scope update false→setValue true 可重开=既有 plan-459 钉核对）+drawer 同语义钉补+boolean open 纯闩形钉+非简单表达式（`${a}-${b}` 类）不写回钉+**undefined 值判别钉**（`defaultOpen: true`+未置 `${path}` 变量：新实现 controlled-closed；该钉在旧实现下必挂[uncontrolled 闩会打开]=申报语义改判的判别性测试[When-Drafting 13]）。
- [x] Proof：基线落字——basic 72/666+raw-schema-reads 门禁输出基线（[high]×2 本批对象在案）。

Exit Criteria:

- [x] 语义面钉全绿；门禁基线在案。（特征化钉 4 绿；undefined 判别钉=申报红腿 HEAD 下恰红在案，接线后转绿——Phase 2 exit 复验）

### Phase 2 - 编译通道接线

Status: done（2026-10-14：新件 `surface-open-binding.ts` 承载 OPEN_BINDING_KIND（字符串值 'command-palette-open' 逐字保持）+SurfaceOpenBinding（原 CommandPaletteOpenBinding 改名收编）+compileOpenBinding（逐字上移）；command-palette.tsx 仅 import 源切换（索引零变更）+definitions 删本地定义改引；sharedSurfaceFields `open` 项 plain prop→规则项=dialog+drawer 同源接通；use-surface-renderer 改读包装对象（kind 判别+path+Boolean(value)+形状防御注释）+删 extractControlledOpenPath+2 raw read（写回位点改读 openPath，deps templateNode→openPath）；schemas.ts dialog/drawer `open?: boolean | string`+文档注释（镜像 palette :392-397 形）；Phase 1 钉 5/5 转绿[判别钉红腿→绿]+plan-459 6 钉+palette 双套件全绿；basic 套件 73 文件/671 用例全绿[基线 72/666+1 文件+5 钉]；raw-schema-reads 门禁 use-surface-renderer 0 命中[5→3，仅 echarts×2+scada×1 他批残留]；knip 基线 exit 0 零本包命中）
Targets: surface-renderer-definitions/use-surface-renderer/command-palette/schemas/新共享件

- Item Types: `Fix`

- [x] Fix：新共享件承载 OPEN_BINDING_KIND+SurfaceOpenBinding+compileOpenBinding；palette/definitions 改引。
- [x] Fix：sharedSurfaceFields `open` 项换规则项（dialog+drawer 同源接通）。
- [x] Fix：use-surface-renderer 改读包装对象（kind 判别+path+Boolean(value)+首帧防御）；删 extractControlledOpenPath+2 raw read。
- [x] Fix：schemas.ts dialog/drawer `open?: boolean | string`+注释。

Exit Criteria:

- [x] Phase 1 钉全绿同数；raw-schema-reads 门禁本批对象 0 命中；`extractControlledOpenPath` 全仓零残留。（源面 0 残留；`flux-bundle/dist` 旧 bundle 工件含旧符号=构建产物，全量 build 重建即消，非源残留）

### Phase 3 - 判别与门禁

Status: done（2026-10-14：判别变异=compileOpenBinding path 提取断裂（`path = match?.[1]`→`path = undefined` PROBE）恰红 5 红=全部写回承载钉（plan-459 写回钉+sundial 幂等重开钉+plan-460 closeSurface 重开钉+drawer 写回钉+undefined 判别钉写回腿），非写回钉（boolean 闩/非简单表达式/首帧空袋）全数保持绿=外科手术式判别留证（`_tmp/cx12-mutation-red.log`：5 failed | 666 passed）→sha256 恢复（6e5f4c8b…818f 前后一致，PROBE 残留 0）→复跑 671/671 绿；门禁=basic 四门禁 exit 0（typecheck/build/lint/test 73 文件 671 用例）+双哨兵精确同数（react 65 文件/580 用例+ai 103 文件/850 用例）+raw-schema-reads 门禁 3 命中（仅 echarts×2+scada×1 他批对象，use-surface-renderer 0）+`extractControlledOpenPath` 源面 0 残留[flux-bundle/dist 旧构建工件残留=gitignored，全量 build 重建即消]；执行侧五门禁证据链在案（本批 filter 口径+双哨兵+raw-reads 门禁；全仓隔离五门禁归 orchestrator））
Targets: 包内

- Item Types: `Proof`

- [x] Proof：判别变异（path 提取断裂→写回钉红）恰红→sha256 恢复绿。
- [x] Proof：basic filter 四门禁+双哨兵（react 580+ai 850）+隔离五门禁（执行侧证据运行，喂给 Closure Gates 同一终态——不重复跑）。

Exit Criteria:

- [x] 判别留证；五门禁终态全链 exit 0。（执行侧 filter 口径全链 exit 0：basic typecheck/build/lint/test+react/ai 哨兵+raw-reads 门禁；全仓隔离五门禁由 orchestrator 在隔离 worktree 复跑同一终态）

### Phase 4 - 回写与收口

Status: done（2026-10-14：台账 WA-basic-001 verified[220=found 63+verified 157/未处置 0]；roadmap CX-12 done；dev log 10-14；隔离五门禁首跑全链 exit 0；closure audit agent_f716cd2f R1 approved 后据实回勾）
Targets: ledger、roadmap、dev log

- Item Types: `Proof | Decision`

- [x] Proof：台账 WA-basic-001 `found → verified`；roadmap CX-12 回写；dev log。
- [x] Proof：独立 closure audit。

Exit Criteria:

- [x] reconcile exit 0；closure audit approved。（closure audit agent_f716cd2f approved 后据实回勾）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_a22f51d2-03a9-4548-ae1e-c4246af4d8aa，review-only，R1+R2 同审查线）
- Verdict: R1 `fail`（0B/1M/2m）→全修；R2 `pass`（0B/0M/1 non-gating nit[已修]）
- Rounds: 2
- Findings addressed: **M1** undefined 值边界语义改判未表征——旧实现 controlled 判据=`resolvedProps.open !== undefined`（六位点），简单 `${path}` 求值 undefined 时旧=uncontrolled 闩（defaultOpen 打开）vs 包装通道=controlled-closed→裁定采 **palette 同型 controlled-closed**（申报语义改判）+Baseline 边界 bullet/Goals 裁定行/Failure Paths 改判/Phase 1 判别钉（旧实现必挂，When-Drafting 13）四处落字；**m1** 行号锚收紧（:261-276/:23-30/:283-291）；**m2** Phase 3 五门禁标注=执行侧证据运行喂 Closure Gates 不重复跑。R1 verified-clean：全部引用逐项核实零失实+可想象性 b-e 四查全净（消费面唯一/非简单表达式新旧恒等/schema-prop-coverage 不破/无旧机制断言测试）+格式合规+人工门四要素。

## Closure Gates

- [x] 编译通道接线落地+raw read 零残留
- [x] 行为保持判别（特征化同绿+变异恰红+filter 门禁+哨兵）
- [x] 台账/roadmap/dev log 齐
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（agent_f716cd2f R1 approved，据实回勾）
- [x] `pnpm typecheck`（隔离 worktree cx12-verify，exit 0）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`（同上）
- [x] `pnpm test`（同上）
- [x] `pnpm check`（同上——首跑即全链 exit 0，零新增未登记红；新文件 git add -N）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- echarts:76/scada:79 raw read 位点（他批对象，归相应批次或 successor）。

## Closure

Status Note: 2026-10-14 收口。编译通道接线落地（三方同源/新件收拢/raw read 清零/schema 类型漂移修复）；**申报语义改判一项**（undefined 值简单表达式→controlled-closed，palette 同型，R1 M1 裁定+判别钉 vs HEAD 红腿实证）；判别变异恰 5 红→sha256 恢复双留证；隔离五门禁首跑全绿；台账 verified；实施=派驻 agent（6.8M tokens/94 工具调用），本会话编排/门禁/回写。

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_f716cd2f-6ad3-4c49-9de4-834bb4e8eae9，review-only）
- Rounds: 1
- Verdict: `approved`（0B/0M/2 informational：m1=pnpm --filter test -- file 不真实文件过滤[整包跑=更强证据，未来用 exec vitest run]/m2=knip 日志含他包已登记旧红）
- Findings addressed: 审计员逐项对账（新件逐字移动核验/三方同源/palette 行为零触碰/双臂 openPath 化/dep 数组/空袋防御/schema 注释/index 零导出/在途 14 文件全在途/roadmap 仅 CX-12 行/日志 73-671 实跑）+R1-M1 四处落字一致性核验+红腿日志核验（1 failed=恰 pin 4）+**亲手判别**（path→undefined 变异：5 failed/666 passed 与实施记录精确同数[外科手术式=写回承载钉全红/非写回钉全绿]→sha256 6e5f4c8b… 逐字节恢复→26/26 绿）。

Follow-up:

- echarts:76/:77 + scada:79 raw-schema-read 位点（他批对象，归相应批次或 successor）。
