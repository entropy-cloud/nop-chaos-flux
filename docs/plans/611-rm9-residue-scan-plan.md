# 611 RM-9 启发式残余扫描 + 收口判定工具（规则族编码 → 全仓扫描 → 零未裁决命中）

> Plan Status: completed
> Last Reviewed: 2026-10-16
> Source: `docs/backlog/renderer-metamodel-roadmap.md` RM-9（终态条件 5）；`docs/analysis/2026-10-15-renderer-definition-metamodel-review.md` 全族（A1~A5、A8、B6~B7、C、§5.2/5.4）
> Related: plan 602~610（RM-0~RM-8 收口，本 plan 为其判定工具）；`check:jsdom-pragma-whitelist`（逐条白名单形态先例）、`check:scanner-baselines`（计数基线先例）、`find-runtime-raw-schema-reads`（RM-8 交付，规则清单引用成员，不重建）

## Purpose

把分析报告的问题族编码为**可声明扩展的启发式规则族**（规则与豁免分离），全仓扫描产出"可能仍有问题"清单，每命中二值处置（已修复 / 登记裁决），以"**零未裁决命中**"作为轨道收口判定（终态条件 5），报告与 exit code 机器可复现并挂入 `pnpm check`。

## 授权链（保护区）

本 plan 只新增 `scripts/audit/` 扫描器 + `scripts/baselines/` 白名单/登记册 + `package.json` check 挂载 + 文档；**不改任何包源码**（命中即证据，处置记录在基线文件）。非保护区。人工授权链：**用户 goal 指令（2026-10-15）四要素**（同 602-610）。

## Current Baseline（live 核对 2026-10-16，HEAD 729023e63）

### 门禁基座（引用，不重建）

- `scripts/audit/` 18 个 `find-*.mjs`（含 RM-8 `find-runtime-raw-schema-reads`：enforcement exit 语义、include 含框架包、12 处 `retained(#N)` 标记）；`check:scanner-baselines`（计数级，只比计数不比条目）；逐条白名单先例 `check:jsdom-pragma-whitelist`（`_header{description,lastUpdated,count,adjudication}` + `entries[]="path:line"`，`diffBaseline`→newHits 红 / resolved 提示 / `--update-baselines` 直写快照）。
- 既有契约门禁（RM-9 规则清单的**委派成员**，不重建、不重复定义）：`contract-honesty.ts`（flux-core）、`check:schema-prop-coverage`、`check:audit-hardcoded-type-dispatch`、`check:audit-runtime-raw-schema-reads`。

### 规则族与 live 命中基线（逐条实测 2026-10-16，含口径的注释/测试语义）

| 规则 id                          | 族                                                 | 检测口径（可执行语义）                                                                                                                                                                                                                                                      | live 命中                                                                                                                                                                                                                 |
| -------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rm-a1-prop-schema-field`        | A1 死字段                                          | `propSchema\s*[?:]`，src 非测试非注释                                                                                                                                                                                                                                       | **0**（RM-1 已删）                                                                                                                                                                                                        |
| `rm-a2-prop-contracts-channel`   | A2 双声明通道                                      | `propContracts\s*:` 声明形态（排除 helper 名/类型名/注释）                                                                                                                                                                                                                  | **0**（RM-4 已删）                                                                                                                                                                                                        |
| `rm-a3-event-contracts-channel`  | A3 事件双声明                                      | `eventContracts\s*:` 声明形态，**排除测试文件与注释行**（**实现=本地 `isProductionCode` 谓词（语义同 `shared.isTestFile`）+ `getCodeTextForLine` 注释剔除**；实测两处测试注释散文 `cards-selection-itemaction.test.tsx:283`/`alert-payload-action.test.tsx:66` 属测试注释） | **0**                                                                                                                                                                                                                     |
| `rm-a4-scope-export-channel`     | A4 scope 双声明                                    | `scopeExportContracts\s*:` 声明形态                                                                                                                                                                                                                                         | **0**（唯一残留 `renderer-prop-contracts.ts:74` 为文档注释指称）                                                                                                                                                          |
| `rm-a5-frame-wrap-dual-path`     | A5 帧族双路径                                      | `\.frameWrap\b`，src 非测试                                                                                                                                                                                                                                                 | **6**（合法保留，逐行：`compiled-renderer-contract.ts:77` 透传／`node-frame-wrapper.tsx:21` resolver 入参／`node-renderer-resolved.tsx:440` 接线／`variant-field-view.tsx:98` 消费／`node-runtime.ts:254,258` meta 解析） |
| `rm-a5-frame-normalizer-copy`    | A5 词表归一单点                                    | `=== 'none'` 与 `? 'label'` 同现，**非测试**（测试 mock 两处 `variant-field-owner-contract.test.tsx:19-21`/`detail-revalidation.test.tsx:16` 属测试替身）                                                                                                                   | **0**（生产面无副本；RM-2 收敛）                                                                                                                                                                                          |
| `rm-a8-renderer-type-triad`      | A8 类型三载体                                      | TemplateNode `type`/`rendererType`/`component.type` 三载体声明位点                                                                                                                                                                                                          | **3 载体位点**（`node-identity.ts:138` type／`:142` rendererType／`:143` component 内层 type；消费面实测：`rendererType` 非测试 60 处（口径：`grep -rn rendererType packages/_/src --include='_.ts' --include='\*.tsx'    | grep -v '/dist/' | grep -v '\.test\.'` 行数）=live；`templateNode.type` 仅测试 2 处（`hooks-render-scope-page-node-meta.test.tsx:163,204`）；`component.type` 全仓 0 处）→ **登记 + successor**（见 Deferred） |
| `rm-b6-compiled-handcopy`        | B6 编译面手抄                                      | `compiled-renderer-contract.ts` 内非 `Pick<` 的成员字面量重抄                                                                                                                                                                                                               | **0**（RM-1 派生化；现全 Pick + `ValidationContributor` 具名引用）                                                                                                                                                        |
| `rm-b7-component-optional`       | B7 registry 松类型                                 | `component\?:` 于 flux-core 类型面                                                                                                                                                                                                                                          | **3**（`renderer-core.ts:220` `RendererDefinition.component?`=by-design[Registered 收窄]／`compiled-renderer-contract.ts:43,49`=编译面 opaque）                                                                           |
| `rm-s52-template-readonly`       | §5.2.4 无防写机制                                  | TemplateNode **顶层成员**缺 `readonly`（内层 `Readonly<{...}>` 包裹不计）                                                                                                                                                                                                   | **0**（RM-7 已落地，30/30 顶层成员 readonly）                                                                                                                                                                             |
| `rm-s521-template-runtime-write` | §5.2.1 不可变是约定非机制（残余面=模板运行时写入） | `templateNode\.[a-zA-Z]+\s*=`（成员赋值），src 全包                                                                                                                                                                                                                         | **0**（实测；不可变由类型钉+写入守卫双载；`Object.freeze` 不施于模板属 by-design——冻结是性能选项，非终态要求）                                                                                                            |
| `rm-s523-node-open-container`    | §5.2.3 可增内容家在 scope                          | `[key: string]` 索引签名出现于 `NodeState`/`NodeInstance`/`NodeRuntimeState` 声明体（开放容器回归）                                                                                                                                                                         | **0**（实测三接口无索引签名；固定形状=设计，增到 scope 不增到实例）                                                                                                                                                       |
| `rm-ref-contract-honesty`        | 委派·契约诚实                                      | `check:contract-honesty` 族（flux-core 测试 + 各渲染器 harness）                                                                                                                                                                                                            | **委派**（既有门禁，live 绿）                                                                                                                                                                                             |
| `rm-ref-schema-prop-coverage`    | 委派·契约覆盖                                      | `check:schema-prop-coverage`                                                                                                                                                                                                                                                | **委派**（既有门禁，live 绿）                                                                                                                                                                                             |
| `rm-ref-hardcoded-type-dispatch` | 委派·无硬编码 dispatch                             | `check:audit-hardcoded-type-dispatch`                                                                                                                                                                                                                                       | **委派**（既有门禁）                                                                                                                                                                                                      |
| `rm-ref-raw-schema-gate`         | 委派·raw 通道守卫                                  | `check:audit-runtime-raw-schema-reads`（RM-8）                                                                                                                                                                                                                              | **委派**（既有门禁，live exit 0）                                                                                                                                                                                         |

### §5.4 归属（delegated）

§5.4 的 12 条 raw 通道已由 RM-0 裁决表 + RM-7/RM-8 收口，本 plan 不重复编码：委派 `rm-ref-raw-schema-gate`（`check:audit-runtime-raw-schema-reads`，12 处 `retained(#N)` 标记在位、exit 0）；#4 `_schema` 死变量与 #5 `getNodeSchemaFrameWrap` 死函数已删（grep 空）、#2/#3 已迁移（RM-7）。

### §5.2 四点归属（本 plan 口径）

5.2.1 不可变是约定非机制 → `rm-s521-template-runtime-write`（残余面=模板运行时写入守卫；`Object.freeze` 不施于模板属 by-design——冻结是性能选项非终态要求）；5.2.2 静态两份载体 → **由 B6/B7 承接**（报告原文自陈为同一件事的运行时切面：手抄副本=B6、双载体/adapter 视图=B7）；5.2.3 可增内容家在 scope → `rm-s523-node-open-container`（索引签名口径）；5.2.4 无防写机制 → `rm-s52-template-readonly`。四点均有归属。

### 显式排除清单（roadmap）与处置

roadmap 显式排除 3 项——`events` 通道 `| undefined` 值类型（报告锚过时：live 形态见 `renderer-core.ts:204`）、`defineRendererFamily` 断言（**live 为单次 `as RegisteredRendererDefinition`**，`renderer-definition-builder.ts:37`；报告原文"双重断言"已随 RM-1 registry 类型化过时）、`RendererDefinitionShape` 28 字段分组注释（**live 为 24 个顶层成员**，`renderer-definition-types.ts:114-146`；28−4=RM-1/4/5/6 删除的四个字段）。三项**无点定位**（范围/缺失型）→ 以**裁决登记册**（registry，非命中豁免）承载，不参与 diff。

### 不可机器转写族（roadmap 预置拆分判据 → 报人工）

§5.3「静态快照体积不增」为约束而非可检测 finding（机器化需先设计快照体积基线）。**本 plan 裁定：以 registry 条目承载+评审期由 Cross-Cutting 2 强制**；该裁定属"工作项增删"类判断，按 roadmap Rule **列为待人工确认项**（Phase 2 落字），不自行落定。

## Goals

- 规则族载体 `scripts/audit/renderer-metamodel-residue-rules.mjs`：**16 条规则**声明式定义（id、族标签、severity、include、pattern/filter、`closureNote`；委派型规则口径=**报告内登记 gate 名+最近结论，不重复执行**（`find-hardcoded-type-dispatch` 走 advisory runScanner 恒 exit 0、`contract-honesty` 为 vitest 套件——链内重复执行会双跑））——规则与豁免分离（豁免只在基线文件）。
- enforcement 扫描器 `scripts/audit/find-renderer-metamodel-residue.mjs`：全仓扫描 → 逐条 `文件:行 [规则id]` → 与基线 diff → **未裁决命中>0 即 exit 1**；命中豁免消失时报告 resolved（提示收窄）。
- 基线文件 `scripts/baselines/renderer-metamodel-residue-whitelist.json` **双段结构**（形态先例 jsdom + 本 plan 扩展）：
  - `suppressions[]`：`ruleId::path:line`，**参与 diff**（newHits 红 / resolved 提示）——承载 A5-frameWrap 6 条、B7 3 条、A8 3 载体位点。
  - `registry[]`：`{id, family, reason, ref?}`，**不参与 diff、永不产生命中**——承载 roadmap 显式排除 3 项 + §5.3 人工确认项（共 4 条；A8 三载体位点走 suppressions，不另立 registry 行）。两段分离即修 R1 M5（登记型条目不被误判 resolved、不被 --update 误删）。
  - `--update-baselines` 语义：**只允许把 suppressions 收缩为 live 命中集**（拒绝新增条目；与 jsdom 先例的直写行为差异在此显式声明）；registry 段不由脚本改写。
- **收缩义务强制**：收口时断言 `suppressions == live 命中集`（测试用例钉），即"只减不增"的机器承载（R1 M5）。
- 挂 `pnpm check` 链 + 测试套件 + 判定口径文档。

## Non-Goals

- 不重建既有 scanner/gate（`rm-ref-*` 四条仅登记 gate 名+最近结论，不重复执行）。
- 不改任何包源码（A8 零消费载体的删除属公开 API 收缩，见 Deferred successor）。
- RM-10~12 词汇三族不入本 plan 白名单体系（roadmap 明示）。

## Scope

### In Scope

- `scripts/audit/renderer-metamodel-residue-rules.mjs`、`scripts/audit/find-renderer-metamodel-residue.mjs`、`scripts/baselines/renderer-metamodel-residue-whitelist.json`、`package.json`（check 挂载）、`scripts/__tests__/find-renderer-metamodel-residue.test.ts`（fixtures 内联）。
- `docs/architecture/renderer-runtime.md` 增 "Metamodel residue adjudication" subsection（规则族清单表/双段语义/收缩义务/复现命令）。
- roadmap 状态流转 + daily log。

### Out Of Scope

- RM-10~12；包源码改动；既有 scanner 行为改动；A8 零消费载体的删除（successor）。

## Test Strategy

档位选择：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**——门禁即器械，须有红/绿/双段语义回归。用例：①未裁决命中（fixtures 临时树）→ exit 1 + 报告含 `文件:行 [规则id]`；②命中已 suppression → exit 0；③suppression 失效（命中消失）→ resolved 提示且 **gate 仍 exit 0**（gate 只红 newHits）；④提交态断言 `suppressions == live 命中集`（测试强制收缩；③=gate 运行语义、④=committed 状态义务）；⑤规则族完整性（16 条 id/族标签/`closureNote` 齐备）。fixtures 以**内联字面量 + `mkdtemp` 临时扫描根**（`FLUX_AUDIT_SCAN_ROOT` 覆盖）承载、`afterEach` 清理；**不写入 packages 目录、不落 fixtures 子目录**，避免污染与保护区域冲突。

## Execution Plan

### Phase 1 - 规则族 + 扫描器 + 基线 + 门禁挂载

Status: completed
Targets: `scripts/audit/renderer-metamodel-residue-rules.mjs`、`scripts/audit/find-renderer-metamodel-residue.mjs`、`scripts/baselines/renderer-metamodel-residue-whitelist.json`、`package.json`、`scripts/__tests__/find-renderer-metamodel-residue.test.ts`（fixtures 内联）

- Item Types: `Proof`、`Fix`

- [x] Proof 先行（判别器械就位）：`scripts/__tests__/find-renderer-metamodel-residue.test.ts` 5 用例（①未裁决命中 exit 1+报告含 `文件:行 [规则id]` ②suppression 命中 exit 0 ③resolved 提示且 exit 0 ④提交态 `suppressions == live` + registry=4 ⑤16 条规则族完整性）；fixtures 经 mkdtemp 临时扫描根（FLUX_AUDIT_SCAN_ROOT）承载，不触 packages；5/5 绿。
- [x] 规则族模块 `scripts/audit/renderer-metamodel-residue-rules.mjs`：16 条规则（a1/a2/a3/a4/a5×2/a8/b6/b7/s52/s521/s523/ref×4），逐条带 `closureNote`；执行中口径精化：`rm-a5-frame-normalizer-copy` 增 resolver 文件与 `resolveFrameWrapMode` 消费者排除（首版误命中单一归一化点及其消费者，实测暴露后收紧）。
- [x] 扫描器 `scripts/audit/find-renderer-metamodel-residue.mjs`（scanFilesWithRules/printResults 原语）：双段 diff、未裁决>0→exit 1、resolved 提示、`--update-baselines` 仅收缩且拒绝新增；执行中修：命中按 key 去重（variant-field-view.tsx:98 一行两处 `.frameWrap` 产生同 key 双结果）。
- [x] 基线 `scripts/baselines/renderer-metamodel-residue-whitelist.json`：suppressions 12（12 行锚逐行 live 校对）+ registry 4（C 三项 + §5.3，逐条 reason/ref），`_header.count=12` 与 suppressions 长度一致、adjudication 逐族理由在案。
- [x] `package.json` 挂载 `check:audit-renderer-metamodel-residue`（raw-schema-reads 与 designer-conformance 之间）+ script 入口；执行中修：knip 报 `createRuleResult` 未用导出 → 去 export。
- [x] 全仓实跑：零未裁决命中（exit 0，报告 "12 suppression point(s) matched, 4 registry item(s); zero unadjudicated hits"）。

Exit Criteria:

- [x] 16 条规则齐备且 `closureNote` 非空（测试⑤钉）；全仓扫描 exit 0；suppressions 12 与 live 命中逐行一致（测试④钉）；registry 4 逐条理由；check 链挂载后 `pnpm check` exit 0（`_tmp/rm9-closure-gates2.log`）。
- [x] 五条测试用例 5/5 绿（含三类判别：未裁决 exit 1／suppression 命中 exit 0／resolved 提示而 registry 不进 diff）。

### Phase 2 - 判定口径文档 + 收口

Status: completed

- Item Types: `Fix`

- [x] `renderer-runtime.md` 增 "Metamodel residue adjudication (RM-9, plan 611)" subsection（规则族清单+双段语义表+收缩义务+委派口径+复现命令）。
- [x] §5.3 机器化裁定列为**待人工确认项**（roadmap Rule：工作项增删先报人工）——终态两分支已落 Deferred 节 + daily log；当前承载=registry 条目 + Cross-Cutting 2 评审期强制。
- [x] roadmap 状态流转 + daily log（10-16 追加，随本提交）。

Exit Criteria:

- [x] 口径文档与 live 一致；§5.3 待确认项落字；daily log 落字。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh 子 agent 填写。

- Reviewer / Agent: 独立 fresh 子 agent（同一审查链四轮 R1→R2→R3→R4，逐轮直跑 live 口径复核规则族与命中基线）
- Verdict: `pass`（R4：0 Blocker / 0 Major / 0 未决 Minor）
- Rounds: 4（超出模板 ≤2 指引，如实记录：R1-R3 连续三轮残留计数/口径漂移，均在当轮落字修正、无 Major 结转；R4 零发现）
- Findings addressed: R1（0B/6M/8m）M1 白名单条目形态无法承载登记型项→双段结构（`suppressions[]` 参与 diff / `registry[]` 不参与）；M2 §5.2 仅编码 5.2.4→补 `rm-s521`/`rm-s523` + §5.2.2 由 B6/B7 承接；M3 A8「三载体各有消费」与 live 相悖→按 live 重定性并改判 successor（公开 API 收缩需授权）；M4 A3/A5-normalizer 口径不可复现→补测试/注释排除 + 实现原语；M5 棘轮语义与登记型互斥→双段分离 + 收缩仅 suppressions + `suppressions == live` 断言；M6 fixture 落点矛盾→测试目录 + 临时扫描根 + `afterEach` 清理。Minor 1-8 全部落字（Proof 先行／Shape 28→24 勘误／`defineRendererFamily` 单次断言勘误／四条 `rm-ref-*` 入清单／§5.3 挂人工确认／check 重复说明／e2e 意图／`rm-s52` 限定顶层成员）。R2（0B/4M/7m）M1 规则计数 17→16 五处同步；M2 `rendererType` 80→60（带口径）；M3 Record 去越权预填 + 补 §5.2.2 承接与 e2e 意图；M4 `rm-s521` 由「检冻结」改「模板运行时写入守卫」、`rm-s523` 改索引签名口径（两口径实测 0 且可检测）；Minor 1-7 落字。R3（0B/2M/2m）M1 L103 registry 6→4（四处一致）；M2 Record 改待审阅者回填；Minor 1 口径命令改可执行写法（verbatim 复跑=60）；Minor 2 Non-Goals 措辞与 L58 对齐。R4 复核四处 diff：`17 条`=0、registry 全篇=4、L33 命令 verbatim=60、L69 与 L58 一致；无新增失实。

## Closure Gates

- [x] 规则族（16 条）+ 扫描器（enforcement，双段基线）+ suppressions 12/registry 4 逐条理由落地且 check 链绿
- [x] 五条测试用例 + 三类判别实录在案
- [x] 零未裁决命中：全仓扫描 exit 0 且报告逐条可追溯；`suppressions == live 命中集` 断言测试绿
- [x] 全仓 typecheck/build/lint/test 全绿 + check 零新增红（含新挂载门禁）——注：五链 turbo 段为缓存重放（42 cached/42、check 内层 78 cached/78），缓存输入哈希对当前树有效（`turbo run typecheck --dry=json` 42/42 local-hit 亲证）；check 链本体非 turbo、含新门禁实跑输出
- [x] 判定口径文档与 live 一致
- [x] roadmap RM-9 状态流转 + daily log 条目
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（agent_851591a3，首轮 issues 0B/1M/6m → M1 测试②重写为锚定命中场景 + m1-m5 处置 → 复核 0B/0M/2m[m2 残留路径文本/委派接线声称] → 四处字符串修正后确认；见 Closure Audit Evidence）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`
- [x] e2e 不重跑之披露义务已在本表与提交信息落字（**本轮意图：不重跑**——本 plan 零包源码改动、纯门禁/脚本/文档，e2e 无判别面；若人工裁定需重跑，按 CX-5 补跑并改判）

## Deferred But Adjudicated

### A8 类型三载体的零消费载体收敛（`component.type` / `templateNode.type`）

- Classification: `moved to explicit successor ownership`（live 实测 `component.type` 全仓零读取、`templateNode.type` 仅测试 2 处 = 已确认的公开类型面冗余）
- Why Not Blocking Closure: 删除属**公开 API 收缩**（`CompiledRendererContract.type`、`TemplateNode.type` 均在 flux-core 导出面上），依 roadmap 授权边界"公开导出增删属结构性重构，各 plan 执行前人工确认授权链落字"，超出本 plan「只加门禁不改源码」的授权范围。本 plan 以 `suppressions` 记录三载体位点（含 `文件:行` 锚），并以 successor 具名承载。
- Successor Required: `yes`
- Successor Path: 报人工追加 successor 工作项（RM-13 候选，具名载体=「TemplateNode/CompiledRendererContract 类型载体收敛」）；roadmap Rule 6/授权边界要求人工确认后立案。

### §5.3 静态快照体积不增（机器化）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 约束而非可检测 finding；机器化需先设计快照体积基线（新设计，非分析报告可直接转写）。评审期由 Cross-Cutting 2 强制；本 plan 以 `registry` 条目承载并列为 Phase 2 待人工确认项。
- Successor Required: `no`（若人工裁定需机器化，按 Rule 追加 successor）

## Non-Blocking Follow-ups

- registry/规则编号有效性校验（RM-8 audit m5 同族）：形态稳定后并入评估。
- 规则族向同族兄弟位点外推：外推发现分析报告未枚举新族时按 roadmap Rule 报人工追加 successor，不静默并入。

## Closure

Status Note: RM-9 三件交付全部落地——①16 条规则族（可声明扩展、规则与豁免分离、逐条 closureNote）；②enforcement 扫描器 + 双段基线（suppressions 12 参与 diff / registry 4 不参与）+ 挂 `pnpm check`；③判定口径文档。终态条件 5 达成：全仓扫描 exit 0（"12 suppression point(s) matched, 4 registry item(s); zero unadjudicated hits"），"重构是否全部完成"由报告与 exit code 判定。判别：5 用例（含审计亲证的锚定命中灵敏度——行号偏移一位即 exit 1）+ 三类语义（未裁决红/suppression 绿/resolved 提示）。执行中修正：normalizer 规则排除单一归一化点本体、命中按 key 去重、`createRuleResult` 去导出（knip）、`--update-baselines` 拒绝分支可达化。Deferred 两项（§5.3 待人工确认机器化；A8 零消费载体收敛改判 successor——公开 API 收缩需授权）。全链 exit 0（五链；turbo 段缓存重放已披露，check 链本体含新门禁实跑）；e2e 未重跑（零包源码改动，无判别面）。**roadmap 状态回写载体披露**：RM-9 行（及 RM-10~12、R4/R5 审查记录、终态条件 6）由并行会话的未提交修订引入，HEAD 尚无该行——本 plan 提交不含 roadmap（纳入即会吞并并行 hunks）；RM-9 `done` 已落工作树，随该文件的下一提交入库。

Closure Audit Evidence:

- Auditor / Agent: agent_851591a3（独立 fresh 子 agent；首轮 issues 0B/1M/6m → M1 测试②重写（选项 A：锚定 `compiled-renderer-contract.ts:77` 命中场景，审计独立验证行号偏移一位即红）+ m1-m5 处置 → 复核确认 0B/0M，残留 2m（m2 fixture 路径文本、R2 委派接线声称）→ 四处字符串修正后确认）
- Evidence: 12 suppression 行锚逐行 sed 校对；规则族 16 条逐条（id/closureNote/口径）+ 已修复族零命中同口径复跑；12+4 基线逐条（registry ref 实指）；判别灵敏度（锚定命中 exit 0 / 偏移一位 exit 1）审计亲证；`--update-baselines` 拒新增（baseline sha 不变）亲证；委派四 gate live 结论亲证（202/202、dispatch 零命中、contract-honesty 12/12、raw-schema 12 retained exit 0）；范围纪律（8 路径零混入 RM-10~12）；门禁日志亲核（含新门禁实跑行、0 failed）

Follow-up:

- §5.3 机器化待人工确认（两分支口径已落 Deferred）；A8 零消费载体收敛 successor 待人工立案（公开 API 收缩）。
- 其余：no remaining plan-owned work。
