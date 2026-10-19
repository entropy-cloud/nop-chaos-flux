# 664 审计修复 R2·MA2.2：basic 渲染器簇运行时正确性审计（分发 / action 链路 / 校验参与）

> Plan Status: completed
> Last Reviewed: 2026-10-19
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA2.2；`missions/audit-remediation-r2.json`；方法论 `docs/skills/deep-audit-prompts.md`（§B 维度 04–06 + 附录 A）+ `interaction-state-audit-prompt.md`（校验参与口径参照）\*
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA2 节、`docs/audits/arm2-index.md`、MA1.3（C3 结构面已审——本项行为面不重审结构）、MA2.1（C1+C2 运行时基线与勘正口径——不预载 finding）、owner doc `form-validation.md` + `renderer-runtime.md`（Renderer Component Contract / Validation Boundary Split）

\* 注：roadmap MA2.2 Skill 列为 `deep-audit-prompts.md`；interaction-state 仅作校验参与取证口径参照，不改变 Skill 列权威。

## Purpose

对 C3 basic 渲染器簇（flux-renderers-basic/form/form-advanced/data，320 src/556 test）执行运行时正确性审计（matrix MA2.2：**分发、action 链路、校验参与**）。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-19 live 实测，HEAD `3340484a9`，工作树含并发线未提交文件——本项产物与提交不含之）

- **四零面扫描器（=M0=C3 0）**：runtime-raw-schema-reads 0 / fieldframe-bypasses 0 / hardcoded-type-dispatch 0 / event-dispatch-ctx 0——分发面四大点名维度零命中（C3 子集零）。
- **non-retained C3 = 51 条**（严格 path:line 口径，m2 钉死：icon-picker×20 / sparkline×18 / **hidden×7** / radio×4 / map×2；loose 行内容匹配=52 含 1 条 docs/audits 内容行。全仓 live 现 145=142+MA2.1 报告自扫 3〔json 组 O1 归因〕，C3 不受影响）——**本项核心裁定面**：逐类型裁定「**non-retained 基线清单**（69 types）未收录已注册类型」vs「真非 retained」（hidden/sparkline/icon-picker 实为 form/data/form-advanced 已注册定义——疑清单陈旧）。**非 retained 基线清单源**：`docs/components/amis-baseline-matrix.md`（Not Retained 段 − Retained 段）+ `docs/components/index.md`（tpl）；加载逻辑在 `scripts/audit/find-non-retained-renderer-references.mjs` `loadNonRetainedTypes()`〔M1 勘正：原「69 types 定义在 .mjs 内」失实〕。
- **reactive-reads C3 = 1 条**：form-advanced condition-builder:206 projectionCaches（MA2.1 已路由 MA7.1——本项登记不重审）。
- **MA2.1 勘正后基线口径**：reactive-reads 全仓 21（勘正值）；MV 按勘正后基线。
- **抽样审读锚点域**：分发（NodeRenderer→组件声明式分发，owner doc Declarative Configuration Principle）；action 链路（renderer `props.events`/onAction→runtime dispatch——C3 消费面）；校验参与（form/form-advanced renderer 对 `form-validation.md` 契约——validateOn 触发、touched/blur 参与）。
- **执行状态**：roadmap MA2.2 当前 `todo`；无 `arm2-MA2.2-*` 报告。

## Goals

- 产出 `docs/audits/YYYY-MM-DD-HHmm-arm2-MA2.2-basic-runtime.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA2.2-<nnn>`）。
- 覆盖面（matrix MA2.2 + §B）：① **分发面**（四零扫描器复跑 + NodeRenderer 声明式分发抽样 2 处对照 Declarative Configuration Principle + 硬编码分发残留 grep）；② **action 链路**（renderer 事件→dispatch 端到端 2 条抽样〔form 提交链 + data CRUD 链〕，对照 MA2.1 已验 runtime-factory 接线的 C3 消费端）；③ **校验参与**（`form-validation.md` 契约点 3 处抽样：validateOn 触发器、blur/touched 参与、异步 debounce 归属——form 渲染器端只读核对）；④ **non-retained C3 51 条逐类型裁定**（5 类型：已注册 vs 基线清单缺口——工具面定级；严格 path:line 口径）；⑤ 深化机会。
- 产出即登记 `docs/audits/arm2-index.md`（MA2.2 行 + P1 行如有）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；命中只定级登记（修复归 MR）。不排 MR/R\*.n；不改写历史文档（MA2.1 已完成的 M0 勘正不回写）；不预载 MA1.3/MA2.1 finding（其 C3 结构结论与 reactive 1 条仅作检测启发，须本轮重新取证）。
- 非 retained 基线库（69 types）的**修库**动作不在本项（定级 + allowlist/补库候选登记归 MG/MR）；渲染器视觉/交互行为归 MA5.4；测试质量归 MA4.2。
- 不执行 MA2.3 及以后工作项。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA2.2 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：四零扫描器复跑、non-retained C3 过滤复跑与逐类型裁定、reactive C3 登记、renderer 分发/action/校验三面抽样深读、owner doc 契约对照、git churn（C3 top-5）、**non-retained 基线清单源核实**（amis-baseline-matrix + index.md tpl，经 `loadNonRetainedTypes()` 加载——M1 勘正）。
- `docs/logs/` 当日 log 追加 MA2.2 条目（hunk 拆分仅 stage 本 entry）；roadmap MA2.2 行状态流转。
- 收口提交：`fix(audit-r2):` 格式。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）；定级命中修复；MA2.3+ / MR / MV / MG；并发线未提交变更（mobile/platform-hardening/index.md/log 非本 entry——一律排除）。

## Failure Paths

| 可测场景编号   | 触发                                                                                                                                           | 行为                                                                                                 | 是否可重试 | 用户可见表现   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 全六类适用（本项高概率实例：分发断裂致渲染器不可用、校验参与丢失致数据损坏风险、运行时崩溃、功能核心操作无法完成；不限于所列） | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan，登记 arm2-index P0 区 | 否         | 无（修复先行） |
| scanner-drift  | 四零扫描器复跑 >0 或 non-retained C3 ≠**51**（严格 path:line 口径——m2 钉死；MA2.1 报告自扫伪影已归因不在 C3）                                  | 停止收口，归因（应零代码变更），报告记录                                                             | 是         | 无             |

预期不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY，即 Closure Gates 预声明门禁）为 Proof 交付物。若触发 P0 追加 Fix Phase，该 Fix 自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 维度清单取证（分发 / action 链 / 校验参与 / non-retained 裁定）

Status: completed
Targets: 报告草稿、`_tmp/`

- Item Types: `Proof | Decision`

- [x] **分发面**：四零扫描器复跑（raw-schema/fieldframe/hardcoded-dispatch/event-dispatch-ctx 全 0 复核）；NodeRenderer→组件声明式分发抽样 2 处（basic container + data table——`NodeRenderer Responsibilities`/`Declarative Configuration Principle` 契约句对照）；C3 内残留硬编码 type 分发 grep 交叉
- [x] **action 链路**：端到端抽样 2 条——① form 提交链（form-renderer onSubmit→props.events→runtime dispatch 消费端，接 MA2.1 已验的 runtime-factory 接线）；② data CRUD 链（crud-renderer 动作→dispatch）；各链给「起点事件→中转→终点 adapter」三段证据；错误路由注释（Errors routed 模式）核对
- [x] **校验参与**（`form-validation.md` 契约 3 点）：validateOn 触发器在 form 渲染器端的透传（blur/change 触发经 schema 编译——只读核对消费位）；touched/visited 参与（useStandardFieldHandle 族）；异步 debounce 归属（runtime 侧 `form-runtime-validation.ts`——renderer 不自持 debounce 的边界）。**只核 renderer 端参与，不重审 runtime 内部**（MA2.1 已抽样）
- [x] **non-retained C3 51 条逐类型裁定**（严格 path:line 口径）：核实基线清单源（amis-baseline-matrix Not Retained−Retained + index.md tpl，`loadNonRetainedTypes()`——M1 勘正）→ 5 类型（icon-picker×20/sparkline×18/hidden×7/radio×4/map×2）逐个核「是否已注册 definition」（hidden@form hidden-renderer.tsx:21、sparkline@data sparkline-renderer-definition.ts:11、icon-picker@form-advanced **index.tsx**:2/:79——入口 tsx）→ 每类型一行裁定；测试字面 vs 生产字面分组；**drift 触发器对照 51**
- [x] 深化机会：发现即记 systemic 候选

Exit Criteria:

- [x] 三面各有「契约句 → 抽样证据 → 合规/缺口」记录；non-retained 5 类型全部有裁定行（基线库缺口 or 真缺口，附 definition 注册证据）
- [x] 四零扫描器复跑结果与 M0 对照行在报告落字

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：C3 churn top-5、已知失败模式 #7（async void）/#9、MA1.3 交叉引用点（运行时环四对是否影响 action/校验链——重新取证）、MA2.1 锚点复用边界声明
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：icon-picker×20 命中是否集中于文档注记（amis-baseline）、hidden 在测试高频但生产链是否真参与校验、form-advanced 条件构建器的 validate 链
- [x] 深化机会与 MA5.4/MA7.1 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/YYYY-MM-DD-HHmm-arm2-MA2.2-basic-runtime.md`、`docs/audits/arm2-index.md`、`docs/logs/`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式落盘（收口补记门禁节 + 复核统计 + 分母口径），文件名含时间戳
- [x] arm2-index：MA2.2 行回填；P1（如有）入索引区
- [x] daily log 追加 MA2.2 条目（计数=报告实数）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`）并登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致
- [x] BUILD_VERIFY（`pnpm test`）exit 0（记录入报告收口补记/log）

### Phase 4 - 收口与状态流转

Status: completed
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA2.2 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA2.2 `planned`→`done`，本 plan→`completed`
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap；log hunk 拆分仅 stage MA2.2 entry），`fix(audit-r2):` 格式；标题不声称 `full-green verification`

Exit Criteria:

- [x] roadmap MA2.2 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件（并发线除外且未触碰）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 子代理（R1 7 组对账 + R2 回修复核——同线两轮，起草者上下文零复用）
- Verdict: R1 `revised`（0B/1M/1m——基线清单源位置失实 + C3 计数口径未钉死）→ 三处回修 → R2 `pass`（0B/0M/0m，残留 grep 全 0）→ 升级 `active`
- Rounds: 2
- Findings addressed: M1 非 retained 基线清单源勘正（amis-baseline-matrix+index.md tpl 经 loadNonRetainedTypes()，三处联动 + 极性统一 + 就地勘误注记）；m2 C3 计数 51 全量钉死（五处 + loose=52 来源 + drift 触发器一致化）；n1 全仓 145=142+3 注记 + icon-picker index.tsx 勘正

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（n/a 显式理由、双风格两段齐备、收口补记门禁节实数）
- [x] arm2-index 登记（MA2.2 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记（缓存回放口径注明）
- [x] 执行期间核对四零扫描器输出不高于 M0（0）；non-retained C3 对照 **51**（严格 path:line——m2；MA2.1 自扫伪影已归因不在 C3）
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA2.2 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（首轮 `issues`〔I1 hidden 构成/I2 amis-baseline 注记/I3 debounce 措辞〕→ 回修 → 聚焦复核 `approved` 零残留）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（P2-MA2.2-001 清单批候选 + P3 已排账 Deferred 区；MG 候选：amis-baseline-matrix Retained 段同步 checklist + 扫描器生产/测试字面分层）

## Closure

Status Note: MA2.2 全部 Phase 交付完成——报告双风格落盘、arm2-index 登记（MA2.2 行，P1=0）、daily log、BUILD_VERIFY 与四门禁实测、零代码变更纪律经审计核验；closure audit 首轮 `issues`（I1/I2/I3 三句级失实）→ 回修 → 聚焦复核 `approved` 零残留。roadmap MA2.2 已流转 `done`。P0=0、P1=0（分发/action/校验三面合规）、P2=1（non-retained 清单陈旧 5 已注册类型）、P3=1、systemic 候选 3 条只记录不落地。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，两轮：首轮 8 任务组全量核验抓 I1/I2/I3 句级失实 → 回修 → 聚焦复核零残留 → 终局 `approved`）
- Evidence: 首轮除三句级外全 pass（四零复跑 4/4、严格 51 三源复算、69 清单源日志、三锚点亲验、门禁四实数、索引/日志/roadmap 三方一致）；聚焦复核 I1（hidden×7=6 测试+1 生产）/I2（45/51+6/51 构成、零 amis-baseline 注记）/I3（校验 debounce 收窄三处）全落实、失实短语 grep=0；F4 自扫 146=145+1 补记 + log 一词修同 commit

Follow-up:

- no remaining plan-owned work
