# 663 审计修复 R2·MA2.1：core+runtime 运行时正确性审计（裸读取 / FieldFrame / 硬编码分发 / 生命周期）

> Plan Status: completed
> Last Reviewed: 2026-10-19
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA2.1；`missions/audit-remediation-r2.json`；方法论 `docs/skills/deep-audit-prompts.md`（**§B 运行时与状态**——维度 04 状态所有权/05 响应式订阅精度/06 异步模式与取消安全 + 附录 A）+ `architecture-deepening-review-prompt.md`
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA2 节、`docs/audits/arm2-index.md`、MA1.1–MA1.9 plan 654–662（复用口径：逐边法/路径段 knip/分母口径/并发 hunk 拆分/教训条款——不预载 finding）、owner doc `renderer-runtime.md` + `form-validation.md` + `flux-core.md`

## Purpose

对 C1 core 簇（flux-core/formula/compiler/action-core）+ C2 runtime 簇（flux-runtime/react/bundle）执行**运行时正确性层**审计（matrix MA2.1：**裸 schema 读取 / FieldFrame 绕过 / 硬编码类型分发 / 生命周期**，叠加 deep-audit §B 状态所有权/响应式精度/异步取消安全抽样）。**MA2 运行时层开篇项**。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-19 live 实测，HEAD `2f0e4d61b`，工作树含并发线未提交文件——mobile×4+platform-hardening×2+log 两 entry〔m2 勘正：2 个未提交 `###`〕——本项产物与提交不含之）

- **扫描器六维（本项核心口径；全部本轮实跑）**：
  - `check:audit-runtime-raw-schema-reads` **0**（=M0）——裸 schema 读取零命中。
  - `check:audit-fieldframe-bypasses` **0**（=M0）——FieldFrame 绕过零命中。
  - `check:audit-hardcoded-type-dispatch` **0**（=M0）——硬编码分发零命中。
  - `check:audit-event-dispatch-ctx` **0**（=M0，allowlisted 0 adjudicated）。
  - `check:audit-non-retained-renderer-references` 全仓 **142**（=M0）；**C1+C2 子集 3 条**（全部 flux-core/authoring/inspector-schema 族的 `type: 'json'` 字面——执行时逐条裁定是否应 allowlist）。
  - **`check:audit-reactive-render-reads`：全仓实跑 21 条（2 rule buckets：[high] reactive-render-read 主体在 flux-graph/xlang-debug/react/form-advanced + [medium] broad-scope-selector×1@playground）——与 arm2-index M0 登记的「2」不符**；M0 备注「1×high+1×medium」疑误读扫描器输出行 "across 2 rule buckets" 为命中数。**M0 基线登记失实候选（P1 级——影响 MV 门禁「不得高于 M0」的正确性），执行时定级并勘正 arm2-index 工具基线区该行（需在报告 + 索引同步勘误，属本轮授权的基线订正）**。
- **抽样审读面（MA2 milestone 点名）**：scope 生命周期 StrictMode 双触发（owner doc Guardrails）、action scope→import→dispatch→handler 链路（MA1.1 已核 action-core 独立性——本项深一层）、表单校验参与（`form-validation.md` 契约）、错误传播与取消安全（deep-audit 维度 06）。
- **相关 owner doc 锚点**：renderer-runtime.md Architecture Guardrails bullets（L92 起）+ **权威命名源 `docs/references/architecture-guardrails-from-bugs.md` §1/§4——M4 勘正：原「三条命名/silent race」自造失实，执行时按 guardrails-from-bugs 章节实文引用**、Validation Boundary Split、Active Internal Shape；form-validation.md。
- **执行状态**：roadmap MA2.1 当前 `todo`（MA1 九项已全部 `done`）；无 `arm2-MA2.1-*` 报告。

## Goals

- 产出 `docs/audits/YYYY-MM-DD-HHmm-arm2-MA2.1-core-runtime-runtime.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA2.1-<nnn>`）。
- 覆盖面（matrix MA2.1 + deep-audit §B + 附录 A）：① **六扫描器全量裁定**（含 C1+C2 non-retained 3 条逐条 + reactive-reads 21 条按 C1+C2 相关性分组——graph(C5)→MA2.3、xlang(C12)→MA2.4（M2 勘正——按簇路由））；② **M0 reactive-reads 基线失实定级与勘正**；③ 抽样人工审读（StrictMode 生命周期抽样 2 处 / action 链路 1 条端到端 / 校验参与 2 契约点 / 取消安全 2 模式——对照 `architecture-guardrails-from-bugs.md` 对应章节与 renderer-runtime Guardrails bullets〔M4 勘正〕）；④ 深化机会。
- 产出即登记 `docs/audits/arm2-index.md`（MA2.1 行 + P1 行如有；**若基线勘正获批则同步勘正 M0 工具基线区 reactive-reads 行并注记勘误来源**）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；命中只定级登记（修复归 MR）。不排 MR/R\*.n；不改写历史文档（**M0 基线勘正属本轮审计授权的例外——以报告证据 + 索引注记形式勘误，不静默改数**）；不预载 MA1.1–MA1.9 finding。
- graph(C5) 命中的行为深审归 MA2.3（domain+scheduling+ai 异步与 IO）；xlang-debug(C12) 归 MA2.4（designer+office+platform+print+xlang 状态机与序列化）——M2 勘正按簇路由；本项只做 C1+C2 相关性分组与交叉引用登记。
- 不执行 MA2.2 及以后工作项。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA2.1 报告 + `docs/audits/arm2-index.md` 登记回填（含 reactive-reads 基线勘正注记——如定级成立）。
- 只读取证：六扫描器（本项清单）、deep-audit §B 抽样方法、owner doc Guardrails/form-validation 对照、git churn（C1+C2 top-5）、抽样文件深读。
- `docs/logs/` 当日 log 追加 MA2.1 条目（hunk 级 staging 仅 stage MA2.1 entry）；roadmap MA2.1 行状态流转。
- 收口提交：`fix(audit-r2):` 格式。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）；定级命中修复；MA2.2+ / MR / MV / MG；并发线未提交变更（mobile×4+platform-hardening×2+log 非本 entry 部分——一律排除出提交范围并记录）。

## Failure Paths

| 可测场景编号   | 触发                                                                                                                                                                         | 行为                                                                                                 | 是否可重试 | 用户可见表现   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 全六类适用（本项高概率实例：运行时崩溃、数据损坏〔状态双源冲突实证〕、核心渲染循环断裂、功能核心操作无法完成；裸读取/分发实证致渲染错误可升 P0；不限于所列） | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan，登记 arm2-index P0 区 | 否         | 无（修复先行） |
| scanner-drift  | 核对扫描器输出高于 arm2-index 登记基线（reactive-reads 按勘正后基线）                                                                                                        | 停止收口，归因（应零变更），报告记录                                                                 | 是         | 无             |

预期 scanner-drift 不触发（零代码变更）；reactive-reads 基线勘正本身不构成 drift（是勘误）。预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY，即 Closure Gates 预声明门禁）为 Proof 交付物。若触发 P0 追加 Fix Phase，该 Fix 自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 维度清单取证（六扫描器裁定 / 基线勘正 / 抽样审读）

Status: completed
Targets: 报告草稿、`_tmp/`

- Item Types: `Proof | Decision`

- [x] 六扫描器全量裁定：raw-schema 0 / fieldframe 0 / hardcoded-dispatch 0 / event-dispatch-ctx 0 逐项复核（=M0）；**non-retained C1+C2 3 条逐条裁定**（inspector-schema `type: 'json'` 字面——是否应入基线库 allowlist）；**reactive-reads 21 条按包分组登记**（C1+C2：react×1〔render-nodes:411 readOwn〕+ form-advanced×1〔projectionCaches〕+ playground medium×1；非本簇：graph×16→MA2.3、xlang×2→MA2.4——分组和 1+1+1+16+2=21 复核〔M1/M2 勘正〕）——每条 C1+C2 命中给 P 级判定
- [x] **M0 reactive-reads 基线勘正**：核实 M0「2」登记 vs live 21 的成因（误读 "2 rule buckets"）——定级（预期 P1：基线失实致 MV 门禁失真）；勘正 arm2-index 工具基线区该行（2→21 + 勘误注记引用本报告 ID）；**此为本 plan 授权的基线订正动作，需在报告留完整证据链**
- [x] 抽样人工审读（deep-audit §B + owner doc Guardrails）：StrictMode 生命周期抽样 2 处（flux-react `createSchemaRenderer`/`useDeferredDispose` 级〔schema-renderer.tsx——M3 勘正：原 API 不存在〕 + flux-runtime form-runtime 级——cleanup/re-entry 模式）；action 链路端到端 1 条（schema→compileAction→dispatch→adapter→result——对照 owner doc Action boundary 节）；校验参与 2 契约点（form-runtime-validation 对 `form-validation.md` 契约句）；取消安全 2 模式（operation-control timeout/retry + async-data abort——对照 `architecture-guardrails-from-bugs.md` §1 与 renderer-runtime Guardrails bullets〔M4 勘正，按章节实文引用〕）
- [x] 深化机会：发现即记 systemic 候选

Exit Criteria:

- [x] 六扫描器各有一行裁定结论；C1+C2 相关命中（non-retained 3 + reactive 3）逐条有 P 级；基线勘正有完整证据链与定级
- [x] 四项抽样审读各有「对照契约句 → live 观测 → 合规/缺口」三段记录

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：C1+C2 churn top-5、已知失败模式 #1（StrictMode 双触发）/#6（store.parse/destroy）/#7（async void）在 C1+C2 落地抽查、MA1 系列交叉引用（MA1.2 runtime-factory wiring、MA1.6 ai-engine-invariants 0）本轮重新取证
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：render-nodes:411 readOwn 是否 subscription-first 违例、inspector-schema json 字面为何被扫、bundle facade 装配层有无状态泄漏、reactive-reads 扫描器规则过宽可能（graph 命中是否误报）
- [x] 深化机会与 MA2.3/MA7.1 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/YYYY-MM-DD-HHmm-arm2-MA2.1-core-runtime-runtime.md`、`docs/audits/arm2-index.md`、`docs/logs/`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式落盘（含收口补记门禁节 + 复核统计 + 分母口径注明），文件名含时间戳
- [x] arm2-index：MA2.1 行回填；P1（如有）入索引区；reactive-reads M0 行勘正（如定级成立——注明勘误来源=本报告）
- [x] daily log 追加 MA2.1 条目（路径 + 发现计数 + 门禁 + 缓存回放 + 误报计数=报告实数）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`）并登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致（含基线勘正行）
- [x] BUILD_VERIFY（`pnpm test`，即 Closure Gates 预声明门禁）exit 0（结果记录入报告收口补记/log）

### Phase 4 - 收口与状态流转

Status: completed
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA2.1 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA2.1 `planned`→`done`，本 plan→`completed`
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap 流转；log hunk 拆分仅 stage MA2.1 entry，排除 platform/mobile 两 entry 与全部并发文件），`fix(audit-r2):` 格式；标题不声称 `full-green verification`

Exit Criteria:

- [x] roadmap MA2.1 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件（并发线文件除外且未被触碰）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 子代理（R1 4 Major + 3 Minor 全量对账 → R2 同线复核）
- Verdict: R1 `revised`（0B/4M/3m——graph×17 计数、xlang 错误路由 MA2.3、useSchemaRenderer 不存在、Guardrails 三条自造命名 + 报告名/log entry 数/复用措辞）→ 六处回修 → R2 `pass`（0B/0M + 1 排版疵已顺手改）→ 升级 `active`
- Rounds: 2
- Findings addressed: M1 graph×16+分组和=21；M2 graph(C5)→MA2.3/xlang(C12)→MA2.4 三处按簇路由；M3 createSchemaRenderer/useDeferredDispose；M4 Guardrails bullets+architecture-guardrails-from-bugs §1/§4 权威源；m1 报告名对齐 matrix `arm2-MA2.1-core-runtime-runtime.md`；m2 log 两 entry；R2 残留 grep 全 0

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（n/a 显式理由、双风格两段齐备、收口补记门禁节实数）
- [x] arm2-index 登记（MA2.1 行 + P1 行如适用 + 基线勘正行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记（缓存回放口径注明）
- [x] 执行期间核对扫描器输出不高于 arm2-index 登记基线（reactive-reads 按勘正后 21）
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA2.1 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（verdict `approved` 8 任务组全量核验 + 4 非阻断观察〔O2/O3/O4 已同 commit 顺手修，O1 non-retained 自扫归因注记〕）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（P1-MA2.1-001 基线勘正已随本 plan 落地；P2×1/P3×1 按 Non-Goals 属 MR/后续维度面，已在 arm2-index/报告 Deferred 区排账；审计报告自扫伪影〔non-retained +3@docs/audits〕已注记供 MV 复核排除）

## Closure

Status Note: MA2.1 全部 Phase 交付完成——报告双风格落盘、arm2-index 登记（MA2.1 行 + P1-MA2.1-001 + **M0 reactive-reads 基线勘正 2→21 带勘误注记**）、daily log、BUILD_VERIFY 与四门禁实测、零代码变更纪律经审计核验；closure audit verdict `approved`（8 任务组 + 4 非阻断观察，O2/O3/O4 已同 commit 顺手修）。roadmap MA2.1 已流转 `done`。**MA2 运行时层开篇完成**：四扫描器维度零命中、四项抽样审读合规、P1=1（基线失实勘正落地）、P2×1/P3×1 deferred。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，11 turns，8 任务组直接观测：P1 五段证据链逐段核、M0 勘正单行 diff 非静默核、四抽样锚点亲验、reactive 21 复算、门禁四实数、git 边界 5+并发）
- Evidence: Verdict `approved`（0 Blocker + 0 Major + 4 非阻断观察）；O1=non-retained 145 归因报告自扫伪影（代码零脏，非 scanner-drift）；O2/O3/O4（头部滚动/空行/行号归属）已同 commit 顺手修；授权覆盖状态流转与收口提交（仅 stage MA2.1 log hunk，不声称 full-green）

Follow-up:

- no remaining plan-owned work
