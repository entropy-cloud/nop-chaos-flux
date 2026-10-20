# 674 审计修复 R2·MA3.8：代码质量审计—renderers-industrial

> Plan Status: completed
> Last Reviewed: 2026-10-20
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA3.8；`missions/audit-remediation-r2.json`；方法论 `docs/skills/code-quality-audit-prompt.md`（七维度）+ `react19-best-practices-review.md`（口径②）+ `workaround-code-smell-audit-prompt.md`（口径④）+ **`deep-audit-prompts.md` §Industrial 专项提示**（canvas a11y/错误码分类/useCallback 生命周期/custom 深克隆/三向 wire 同步/editor 四态——§2.1 IND-1~6）
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA3 节、`docs/audits/arm2-index.md`、MA1.5（C5 结构面已审——P1-MA1.5-001 3d marker 缺失归 MR）、MA2.3（C5 运行时正确性已审）、MA3.1 P3-003（WARN 登记机制 family）、owner doc `docs/architecture/renderer-runtime.md` + `docs/skills/deep-audit-prompts.md` §Industrial 专项提示 + `docs/bugs/77`–`85` bug 卡 + `docs/backlog/industrial-hmi-component-audit-roadmap.md`（**原指 component-audit-checklist.md §2.1 为死引用**——该节在任何提交版本中不存在〔git log -S 零命中〕，编号注册表无 live 锚定——M1 勘正；IND 检查点以本 plan 内联定义为准）

## Purpose

对 flux-renderers-industrial（158 src/152 test，21,411 行，15 tsx——最大单包）执行代码质量审计（matrix MA3.8，四口径 + Industrial 专项检查点）。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-20 live 实测，HEAD `8546aae3b`，工作树含并发线未提交文件——本项产物与提交不含之）

- **规模**：158 src / 152 test / 21,411 行 / 15 tsx（最大单包；src 口径排除 `*test*`/`__tests__`/`test-support`）。
- **口径② 基线**：`check:react19` 全仓 0；'use no memo' 本包 **0**；as-any **0**（扫描器口径）；TODO/FIXME/HACK **0**。
- **口径③ 基线**：oversized WARN 触及本包 **16 件**（实现 5：editor/scada-editor-canvas 660 / engine/scada-engine 574 / editor/inspector/binding-panel 569 / editor/toolbox/toolbox-panel 559 / binding/refresh-pipeline 506；测试 11）——**均未登记**（MA3.1 P3-003 family）。
- **duplicates 初判**：触及本包 **74 处**（触及口径；归族现场判定）。
- **口径④ 基线**：WA 台账 **WA-industrial-001..008**（**6 verified + 2 found**——found = WA-industrial-005（P3，装配器族）/ 007（P3，document-mirror）——WA-9 批〔plan 569〕"found→watch-only 同行挂账"既有件）。
- **口径① + Industrial 专项初判（IND-1~6 live 抽验）**：IND-1 canvas wrapper a11y（scada-canvas.tsx:306-307 `role="application"` + aria-label i18n——HCAX-2 修复在位）；IND-5 三向 wire 同步（serialization/diff.ts:32 SYMBOL_KEYS 编译期断言注释"防同类复发（断言 ScadaSymbolNode 字段 ∪ ScadaSymbolProps 字段 ⊆ SYMBOL_KEYS）"+ check-scada-symbol-keys.mjs 机械 guard——HCA5 修复在位）；scada-engine.ts（leafer App 装配 + config-adapter/ground-grid/test-handle/tree-registry 兄弟模块拆分）。
- **churn（近 1 个月窗口实测，窗口敏感注记）**：≈248 触摸——FM-7（plan 651）/RM-8 收口热点（携 plan 号）。
- **执行状态**：roadmap MA3.8 当前 `todo`；无已登记 `arm2-MA3.8-*` 报告。

## Goals

- 产出 `docs/audits/2026-10-20-HHmm-arm2-MA3.8-industrial-quality.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA3.8-<nnn>`；发现归族 local/family/systemic）。
- 覆盖面（四口径 + IND 专项）：① **实现质量**（核心路径抽读 ≥6：scada-editor-canvas / scada-engine / binding-panel / toolbox-panel / refresh-pipeline / serialization-diff 或 event-bridge——三问 + IND 检查点）；② **React 19**（零 'use no memo' 论证 + check:react19 0 + canvas 生命周期 useCallback 逐个审查口径〔HCA1 P3-1〕抽样）；③ **重构候选**（oversized 16 件逐簇裁定 + duplicates 74 处归族）；④ **workaround 嗅探**（TODO 0 + WA-industrial 8 条核对〔found 2 件定性〕+ IND-2 错误码分类/IND-4 custom 深克隆/IND-6 editor 四态抽验）。
- 产出即登记 `docs/audits/arm2-index.md`（MA3.8 行 + P1 行如有，精确行编辑）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；命中只定级登记（修复归 MR2 批）。不预载 MA1.5/MA2.3 finding（P1-MA1.5-001 3d marker 与 camera IO P1-MA2.3-001 已立案）；工业画布交互行为归 MA5.5；scada-editor 结构归 MA1.5 已审面。
- 不执行 MA3.9 及以后工作项。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA3.8 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：核心路径抽读 ≥6 文件（含 IND 检查点）、oversized 16 件逐簇裁定、duplicates 74 处归族、React 19 两点、WA 台账 8 条核对、churn top、四口径扫描器复跑。
- `docs/logs/2026/10-20.md` 追加 MA3.8 条目；roadmap MA3.8 行状态流转。
- 收口提交：`fix(audit-r2):` 格式。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）；定级命中修复；MA3.9+ / MR / MV / MG；并发线未提交变更（一律排除）。

## Failure Paths

| 可测场景编号   | 触发                                                                                                                         | 行为                                                                          | 是否可重试 | 用户可见表现   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 全六类适用（本项高概率实例：SCADA 组态数据损坏、画布核心渲染断裂；示例须可归入六类之一，否则按 P1/报告登记） | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan | 否         | 无（修复先行） |
| scanner-drift  | `check:react19` >0 / as-any 本包 >0 / oversized 本包 unique 超 16 件 / TODO >0                                               | 停止收口，归因（应零代码变更），报告记录                                      | 是         | 无             |

预期不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY，Cross-Cutting 9 强制的 Proof 交付物）为 Proof 交付物。若触发 P0 追加 Fix Phase，自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 四口径 + IND 专项取证

Status: completed
Targets: 报告草稿、`_tmp/`

- Item Types: `Proof | Decision`

- [x] **实现质量**（抽读 ≥6）：scada-editor-canvas.tsx（编辑器画布 orchestrator）、scada-engine.ts（leafer 装配）、binding-panel.tsx、toolbox-panel.tsx、refresh-pipeline.ts、serialization/diff.ts（SYMBOL_KEYS 断言）；每文件三问
- [x] **IND 专项检查点**（§2.1 IND-1~6 live 抽验）：IND-1 a11y wrapper（:306-307 在位核验）；IND-2 错误码分类（config-invalid 升级码 vs invalid-config 句柄码抽样）；IND-3 useCallback canvas 生命周期逐个审查口径（scada-canvas handleReady/handleError plain const 裁定注释核验）；IND-4 custom 深克隆（structuredClone 抽验）；IND-5 三向 wire 同步（SYMBOL_KEYS 断言 + check-scada-symbol-keys.mjs guard）；IND-6 editor renderer 四态（props.meta.disabled 消费抽样）
- [x] **React 19 口径**：零 'use no memo' 论证 + check:react19 0 + canvas 生命周期 useCallback 抽样
- [x] **重构候选**：oversized 16 件逐簇裁定（editor 族/engine 族/binding 族 + 测试 11 归 MA4.3 交叉）；duplicates 74 处归族
- [x] **workaround 嗅探**：TODO 0 复核 + WA-industrial 8 条状态核对（found 2 件位点定性——WA-9 批 watch-only 挂账件）+ as-unknown-as 链探测
- [x] 深化机会：发现即记 systemic 候选

Exit Criteria:

- [x] 六文件三问记录落字；oversized 16 件逐簇裁定行
- [x] 四口径基线对照行（react19=0 / as-any=0 / TODO=0 / duplicates 74 处归族落字 / IND-1~6 抽验结果落字）

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：churn ≈248（FM-7/RM-8 亲核）、MA1.5/MA2.3 交叉点（不预载）、WA-9 批 watch-only 件现状
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：editor/engine 边界、binding 管线、序列化往返
- [x] 深化机会与 MA4.3/MA5.5/MA9.2 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/2026-10-20-HHmm-arm2-MA3.8-industrial-quality.md`、`docs/audits/arm2-index.md`、`docs/logs/2026/10-20.md`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式落盘（收口补记门禁节 + 复核统计），文件名含时间戳
- [x] arm2-index：MA3.8 行回填；P1（如有）入索引区（精确行编辑）
- [x] daily log 追加 MA3.8 条目（计数=报告实数）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`，Cross-Cutting 9 强制的 Proof 交付物）并登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致（编辑后 grep 复核行在位）
- [x] BUILD_VERIFY（`pnpm test`）exit 0（记录入报告收口补记/log）

### Phase 4 - 收口与状态流转

Status: in progress
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA3.8 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA3.8 `planned`→`done`，本 plan→`completed`
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap），`fix(audit-r2):` 格式；标题不声称 `full-green verification`

Exit Criteria:

- [x] roadmap MA3.8 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件（并发线除外且未触碰）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 审查子代理（五项检查 + 全量计数 + IND-1~6 逐行验证 + git log -S 考古）
- Verdict: R1 `revised`（0B/4M/2m）→ 回修（审查员预授权："修完即可升 active 进执行队列，无需重走全量审查"）
- Rounds: 1
- Findings addressed: M1 Related 死引用（component-audit-checklist §2.1 从未存在——git log -S 零命中；改指 deep-audit-prompts §Industrial + bugs 77-85 + industrial-hmi-roadmap + Follow-up 上游死指针）；M2 报告 IND-3 位点漂移（:75-81→editor :96/:113/:119 双画布各归其位）；M3 四 hook 误归属（useScadaConfigSync 族属 renderer/scada-canvas 运行态，editor 用 useEditorEngine/useEditorHandles——WA-002 孪生面分清）；M4 报告头状态 + 收口补记时序；m1 churn 口径注；m2 test 口径注

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（双风格两段齐备、收口补记门禁节实数）
- [x] arm2-index 登记（MA3.8 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 执行期间核对 `check:react19`=0 / as-any 本包=0 / oversized 本包 unique=16 件存量口径 / TODO=0
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA3.8 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（首轮 `approved` 0B/0M/2m 记录性——9/9 对账全 PASS；M1 死引用经四版本 git show 考古证实、M3 双画布归属核验；m1/m2 随收口顺手勘正）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（MG 候选：oversized WARN 登记机制〔MA3.1 P3-003 并案，本包 +16 件〕、跨包克隆家族批；**上游文档死指针勘误**：deep-audit-prompts.md:532 与 component-audit-checklist.md §2.1 引用链断裂〔Why Not Blocking：plan/报告内联已自足定义六检查点，上游勘误属文档批〕）
- m1 churn 口径注：git log --name-only 文件触及口径、窗口敏感 ±1（实测 touch events 250/unique files 150）
- m2 test 口径注：152 = `*.test.ts(x)` 文件数

## Closure

Status Note: MA3.8 全部 Phase 交付完成——报告双风格落盘（multi 四口径 + IND-1~6 专项 + open 三轮）、arm2-index 登记（MA3.8 行唯一无重复，P1=0）、daily log MA3.8 条目、BUILD_VERIFY 与四门禁实测（test 82/82、lint 44/44、typecheck/build 既有登记红零新增）、零代码变更纪律经独立实测核验。closure audit 首轮 `approved`（0B/0M/2m 记录性——9/9 对账全 PASS：oversized 16 unique/IND-1~6 逐行/WA 8 条/duplicates 74/规模四数精确复现/M1 死引用四版本考古证实/M3 双画布归属核验）。P0=0/P1=0/P2=0、P3=2（oversized WARN family 本包 16 件/editor-engine-symbol 族 74 处家族批）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，9/9 对账全 PASS：16 unique/IND 六行逐行核验/WA 8 条 ledger 行号定位/74 克隆归族/规模四数精确/M1 四版本考古/M3 双画布 import 行核验/零代码变更/P3 双抽样〔valve↔trend 16L/context-menu 内部块〕）
- Evidence: 终局 `approved`（0B/0M/2m 记录性——"报告数字全部可机械复现"）

Follow-up:

- no remaining plan-owned work（MG 候选延续：oversized WARN 登记机制 + 上游文档死指针勘误〔deep-audit-prompts.md:532/component-audit-checklist §2.1〕）
