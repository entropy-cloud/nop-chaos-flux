# 686 审计修复 R2·MA4.2：测试有效性审计—basic 渲染器簇（C3 四包）契约覆盖

> Plan Status: completed
> Last Reviewed: 2026-10-21
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA4.2；`missions/audit-remediation-r2.json`；方法论 `docs/skills/unit-test-logic-and-contract-coverage-audit-prompt.md` 为权威（四问 + 十种假覆盖模式 + 八类缺口 + 七要素 + 多轮子代理）+ 工具输出消费（`check:audit-test-global-leaks` / `check:jsdom-pragma-whitelist` / `check:audit-todo-exitless`）
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA4 节（报告名模式 `*arm2-MA4.2-basic-tests.md`）、`docs/audits/arm2-index.md`、MA1.3/MA2.2/MA3.5/MA3.6（同簇结构/运行时/质量面已审——不预载）、MA4.1（方法论先例：`docs/plans/685-audit-r2-ma41-contract-coverage-plan.md` completed + 其报告归族/误报排除纪律）；owner docs `docs/architecture/form-validation.md`（本项 Owner Doc）、`renderer-runtime.md`、`docs/references/quick-reference.md`
> 方法先例沿用（MA4.1 closure 定案）：子代理轮次中间件落 `_tmp/arm2-ma42/`（收口清理），不新建 `docs/analysis/` 目录；报告为唯一长期产物；P1 注册前执行者 grep 复核；收口提交前 `grep` 零残留自验。

## Purpose

对 C3 basic 渲染器簇四包（flux-renderers-basic / flux-renderers-form / flux-renderers-form-advanced / flux-renderers-data）执行**测试有效性审计**（matrix MA4.2）：专审**现有单元测试对渲染器稳定契约的守护效力**（测的是契约还是实现细节；哪些高价值契约无守护；哪些测试绕过真实入口/断言过弱/过度 mock/跨层断层/缺负面场景/缺历史 bug family 回归）。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-21 live 实测，HEAD `a8af98e95`，merge `bce166dbc` 之后）

- **工作树**：并发 mobile 线残留未提交文件（`docs/index.md` 修改 + `docs/backlog/platform-hardening-roadmap.md` 未跟踪）——本项产物与提交**不含之**；无其他 agent 在本 worktree 活跃（live 核对）。
- **规模（口径同 arm2-index：src 列排除 `__tests__/`、`test-support/`、`*test*`；test 列 colocated `*.test.ts(x)`）**：

  | 包                           | src 文件 | test 文件 | src 行 | `src/index.tsx` export 行 |
  | ---------------------------- | -------- | --------- | ------ | ------------------------- |
  | flux-renderers-basic         | 35       | 72        | 6,567  | 22                        |
  | flux-renderers-form          | 94       | 127       | 15,557 | 10                        |
  | flux-renderers-form-advanced | 71       | 173       | 17,238 | 23                        |
  | flux-renderers-data          | 120      | 184       | 22,838 | 16                        |
  | **合计**                     | **320**  | **556**   | 62,200 | 71                        |

  与 roadmap 簇表 C3 320/556 一致。

- **工具口径基线（本日实测）**：`check:audit-test-global-leaks` 108 = M0，四包内命中 **19 处**（全部 [medium] test-module-top-let：form-advanced `test-support.tsx` ×4 @50/62/69/210、`g9-g18-composite-stability.test.tsx` ×2 @31/32、upload 三件 ×1 @15/44/50、`detail-view/detail-view-owner-updates` ×1 @11；form `test-support.tsx` ×2 @25/143；data `g5-g12-g17-data-lifecycle.test.tsx` ×2 @212/222、`list-windowing` @66、`table-virtual-body-measure` @7、`table-virtual-radio` @25；basic `button-count-down` @26、`loop-recurse-scratch-provider-contract` @43——执行期逐处定性）；`check:jsdom-pragma-whitelist` no new entries；`check:audit-todo-exitless` 1 = M0（scheduling undo-stack 注册件，C3 预期 0，执行期复核）。
- **mutation**：stryker scope 仅 `flux-runtime/src/validation`——**C3 不在 M0 mutation 基线范围内**，本项 mutation 口径 = N/A（如需 C3 mutation 抽样归 MA4.5 `audit:mutants` 现场扩展，plan 内不排）。
- **历史材料（仅作检测启发）**：`docs/bugs/` 路径点名 C3 四包的 bug note **45 份**（grep 实测）——bug family 回归缺口对照源；MA4.1 已确立「docs/bugs 引用存活性零机制」systemic（P2-MA4.1-009）与「测试重组销毁守卫」家族——本项 Round E 沿用该检测启发，所有判定仍须本轮 live 取证。
- **执行状态**：roadmap MA4.2 `todo`；arm2-index MA4.2 行 `—`；MA4.1 已收口（`a8af98e95`）。

## Goals

- 产出 `docs/audits/2026-10-21-HHmm-arm2-MA4.2-basic-tests.md`：双风格（multi + open），每条发现含**严重度 / 类别（八类之一）/ 契约 / 位置（实现+测试路径）/ 现状 / coverage 为何误导 / 最小补强建议**，P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA4.2-<nnn>`），发现归族（local / family / systemic）。
- 覆盖面（四口径，逐包）：① **契约 → 测试映射**（四包 `src/index.tsx` 导出面 + renderer 定义/注册契约 + `form-validation.md` 参与契约 + `quick-reference.md` 渲染器模式承诺 → 直接/间接/无；真实入口 = 经 schema compile + 注册表渲染 vs 直接 render 内部组件；断言判别力；mock 厚度）；② **历史 bug family 回归缺口**（45 份 note → defect family → 点名回归测试 live 核对）；③ **跨层/跨包贯通**（字段事件 → runtime store → validation → submit 门控；CRUD/分页/树表数据链；compound 字段组装链）在 C3 内的贯通测试 vs 分段；④ **测试卫生消费**（global-leaks 四包命中逐处定性 / jsdom pragma / todo-exitless）。
- 每包列「高价值无守护契约」清单 + Coverage Assessment + Recommended Next Tests（3–7 条，注明层）。
- 产出即登记 `docs/audits/arm2-index.md`（MA4.2 行 + P1 行如有，精确行编辑后 grep 复核）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，Closure Gates；与 Closure Gates `pnpm test` 行共用同一次运行）。

## Non-Goals

- 零代码变更：命中只定级登记（修复归 MR2 批；e2e 有效性/mutation/探针转正归 MA4.5；测试组织归 MA4.4）。不预载 MA1.3/MA2.2/MA3.5/MA3.6 finding。
- 不审 MA4.3+ 工作项；AMIS 对标走查归 MA5.4（本项不实操浏览器）。
- 不新建 `docs/analysis/` 轮次目录（MA4.1 定案沿用）。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA4.2 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：四包公共导出面 / renderer 定义与注册 / owner docs / 现有测试 / bug notes / 三个卫生工具输出。
- `docs/logs/2026/10-21.md` 追加 MA4.2 条目；roadmap MA4.2 行状态流转；本 plan 状态流转。
- 收口提交：`fix(audit-r2):` 格式。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）；MA4.3+ / MR / MV / MG；并发线未提交变更（`docs/index.md`、`platform-hardening-roadmap.md` 等一律排除、不触碰）。

## Failure Paths

| 可测场景编号   | 触发                                                                                               | 行为                                                                          | 是否可重试 | 用户可见表现   |
| -------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 六类之一（渲染器面典型：校验绕过导致脏提交、XSS 渲染路径、核心 CRUD 操作无法完成） | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan | 否         | 无（修复先行） |
| scanner-drift  | `check:audit-test-global-leaks` ≠108 / `check:audit-todo-exitless` ≠1 / jsdom 新增                 | 停止收口，归因（本项零代码变更；并发线或基线登记漂移），报告记录              | 是         | 无             |

预期不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY，Cross-Cutting 9 强制 Proof 交付物）为 Proof 交付物。若触发 P0 追加 Fix Phase，自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi：契约清单 + 多轮子代理映射（四口径）

Status: completed
Targets: `_tmp/arm2-ma42/round-*.md`（中间件）

- Item Types: `Proof | Decision`

- [x] **契约清单**（执行者）：四包 `src/index.tsx` 导出面 dump + renderer 定义/注册契约提炼（含 `check:renderer-definition-fields-only`/`check:schema-prop-coverage` 消费）
- [x] **Round A（子代理）**：flux-renderers-basic 契约 → 测试映射（结构/展示渲染器：marker 类、regions、meta 状态投影）
- [x] **Round B（子代理）**：flux-renderers-form 契约 → 测试映射（表单字段族：校验参与/错误显示/受控值链——`form-validation.md` 承诺为契约源）
- [x] **Round C（子代理）**：flux-renderers-form-advanced 同口径（复合字段族：upload/cascader/date 等组装与交互状态）
- [x] **Round D（子代理）**：flux-renderers-data 同口径（数据展示族：table/CRUD/分页/树/选择——数据链与操作契约）
- [x] **Round E（子代理）**：45 份点名 C3 的 bug note → defect family → 点名回归测试 live 核对（历史回归缺口）
- [x] **Round F（子代理）**：跨层/跨包贯通——字段事件→store→validation→submit、CRUD 数据链、复合字段组装链的贯通 vs 分段盘点（C3 内 + 与 flux-runtime/flux-react 接缝）
- [x] **工具消费**（执行者）：global-leaks 108（四包命中逐处定性）/ jsdom pragma / todo-exitless（C3 复核）
- [x] 每轮结论交叉去重后按八类缺口分类 + P 级判定 + 归族；P1 注册前执行者逐条 grep 复核

Exit Criteria:

- [x] 四包契约 → 测试映射清单落字（有守护 / 弱守护 / 无守护三列，每条有实现+测试路径）
- [x] 六轮子代理产物在 `_tmp/arm2-ma42/`，每轮回答「本轮新发现了什么」
- [x] 三项工具输出消费行落字；全部 P1 有执行者复核记录

### Phase 2 - open：live 信号驱动开放式追问

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] 以 Phase 1 高价值线索为起点 ≥2 轮追问（更多实例 / 更大影响范围 / 不同根因），每轮有证据与「新增了什么」
- [x] 深化机会（systemic 候选）与 MA4.4 / MA4.5 / MG / MA5.4 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且最后一轮显式「本轮未发现新的高价值问题」方可停止
- [x] 全部发现完成归族 + P 级判定；P2/P3 入 deferred 区附定级理由

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/2026-10-21-HHmm-arm2-MA4.2-basic-tests.md`、`docs/audits/arm2-index.md`、`docs/logs/2026/10-21.md`

- Item Types: `Proof | Decision`

- [x] 报告按 MA4.1 同构格式落盘（头部 / 审核范围 / 深挖统计 / P0 / P1〔七要素〕/ P2-P3 deferred 附定级理由 / 归族 / 误报排除 / 深化机会 / open 轮次 / Coverage Assessment / Recommended Next Tests / 高频文件 / 已自动化 / 建议新增自动化 / 判别证据索引 / 收口补记）
- [x] arm2-index：MA4.2 行回填 + P1 行（如有）精确行编辑 + Last Updated 滚动，编辑后 grep 复核
- [x] daily log 10-21 追加 MA4.2 条目（计数 = 报告实数）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`；**与 Closure Gates「BUILD_VERIFY」行和「`pnpm test`」行共用同一次运行**）并登记；复跑三卫生扫描器核对 = 基线
- [x] 清理 `_tmp/arm2-ma42/`（closure audit 通过、提交前执行）

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致（grep 复核行在位）
- [x] BUILD_VERIFY（`pnpm test`）exit 0（实数记录入报告收口补记 + log）

### Phase 4 - 收口与状态流转

Status: completed
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA4.2 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA4.2 `planned`→`done`，本 plan→`completed`
- [x] 提交前 `grep -nE "^- \[ \]|^Status: (planned|in progress)"` 本 plan 零残留 + grep roadmap MA4.2 行字面值 `done` + prettier 五文件
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap），`fix(audit-r2):` 格式；标题不声称 `full-green verification`（e2e 未跑）；显式路径提交，并发线文件不入 stage

Exit Criteria:

- [x] roadmap MA4.2 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_e50c98c9`（五项检查 + 全量复算：四包规模表 16 格、merge 后基线有效性〔拓扑 e1ed6115f→bce166dbc→a8af98e95；merge 触及 form 包 signature-renderer.tsx + 其 test 两文件，数字在 HEAD 精确复现〕、global-leaks 108/C3 19 处逐行、todo-exitless 1/C3 0、jsdom no new、bug note 45、HEAD/roadmap/arm2-index 三方状态、contract-surface 71 行、并发线残留口径、mutation N/A 与 stryker mutate 面一致、全部引用路径、MA4.1 机制先例 7 项逐项沿用、Round F 口径与 MA4.1 正确区分）
- Verdict: `pass-with-minors`（0B/0M/2m）
- Rounds: 1
- Findings addressed: 无 Blocker/Major。m1 global-leaks 四包命中「约 14 处」→ 实测 19 处并补齐 6 个文件名；m2 入口文件 `src/index.ts`→`src/index.tsx`（四包均为 tsx，含 contract-surface.md 标题）——两条均已落字。附注：Round B 须将 merge 新增的 signature-renderer 视为 in-scope live 代码

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（双风格两段齐备、每条发现七要素齐全、收口补记门禁节实数）
- [x] arm2-index 登记（MA4.2 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 执行期间核对 `check:audit-test-global-leaks`=108 / `check:jsdom-pragma-whitelist` no new / `check:audit-todo-exitless`=1
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA4.2 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（`agent_d8ef1d34` R1 `approved` 0B/0M/3m——五点/六项全过：P1 五条证据独立复现〔含全 28 文件 visible:false 上下文逐一定性〕、三扫描器独立实跑 + basic 包 676 测试真实运行、降级抽查 3 条无「应 P1 写 P2」、C3 merge 触及面 name-only 复核恰 2 文件；m1-m3 = 报告精度修正〔P2-009 补定级句/5→4 文件/锚点 :25-36〕随收口 hunk 同 commit 修复）
- [x] `pnpm typecheck`（既有登记红口径——当前全绿，零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- （待执行中落账）

## Closure

Status Note: MA4.2 全部 Phase 交付完成——C3 四包（320 src/556 test/62,200 src 行）测试有效性审计双风格落盘（multi 六轮子代理 A–F + open 三轮），P0=0/**P1=5**（001 框架 meta 投影 gate 零判别测试、002 input-signature capability 声明漂移〔live defect + 零 pin〕、003 array-field 标量子项校验链零守护、004 stale-result 治理族三段叠加、005 serverPagination 纠正写回零守护）/P2=9/P3 若干；arm2-index 登记 MA4.2 行 + 5 条 P1（累计 20 open 待 MR）；daily log 收口。**重要反证在案**：四包真贯通 harness、三条业务链边界级贯通、form-validation.md 承诺 9/10 有判别测试、bug family 39/42 有点名回归——C3 整体为真实契约覆盖，缺口集中于数据获取治理族/框架投影 gate/声明面一致性三个族。closure audit R1 `approved`（0B/0M/3m，精度修正随本 hunk 落地）。零代码变更纪律经审计员独立复验。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor `agent_d8ef1d34`（R1 `approved`，0B/0M/3m）
- Evidence: 六项全过——A 勾选残留恰为审计后置链；B 双风格两段 + P1 七要素 + P2 定级理由齐备；C 全部 P1 声称独立复现（P1-001 全 28 文件逐一定性无反例 / P1-002 三锚点 + select 误报勘正确认 / P1-003 grep=0 / P1-004 三段证据 / P1-005 grep=0）+ 三扫描器独立实跑 = 基线 + basic 包 676 测试真实运行 exit 0；D 降级抽查 3 条（P2-001/008/003）无「应 P1 写 P2」；E 零代码变更（status 恰 5 in-scope + 2 并发线文件）；F 五处一致 + Evidence 未自填。m1-m3 精度修正（P2-009 定级句 / form-submit-actions 4 文件 / definitions 锚点 :25-36）已随收口 hunk 落地。

Follow-up:

- no remaining plan-owned work（MR2.0 消费 5 条 P1；MA4.5 消费 C3 mutation 抽样与 bug-note-refs guard 提案；MG 候选见报告"建议新增的自动化检查"4 条）
