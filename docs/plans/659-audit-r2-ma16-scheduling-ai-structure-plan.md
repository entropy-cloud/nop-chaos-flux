# 659 审计修复 R2·MA1.6：scheduling + ai 定义、导出面与 marker 审计

> Plan Status: completed
> Last Reviewed: 2026-10-19
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA1.6；`missions/audit-remediation-r2.json`；方法论 `flux-component-design-review-prompt.md` + `deep-audit-prompts.md`（附录 A）+ `architecture-deepening-review-prompt.md`
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA1 节、`docs/audits/arm2-index.md`、MA1.1–MA1.5 plan 654–658（复用口径：逐边法/knip 过滤二分/包名≠渲染器类别/marker 扫描器盲区注记——不预载 finding 结论）、owner doc `renderer-markers-and-selectors.md` + `renderer-runtime.md`

## Purpose

对 C6 scheduling（92 src/114 test）与 C7 ai（71/104）两包执行结构与契约层审计（matrix MA1.6：**定义、导出面与 marker**），叠加依赖/样式契约共享方法。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-19 live 实测，HEAD `e225e36e2`，干净树）

- **依赖 extras**（公共 {core,i18n,react,ui} 外）：scheduling + @atlaskit/pragmatic-drag-and-drop + @tanstack/react-virtual + @zxing/library + **zustand**；ai + **@nop-chaos/flux-renderers-content（跨渲染器边——实测 `sanitizeHtml` 导入 @ markdown.tsx:8，XSS 面共享工具，MA7.2 交叉）** + virtual + jsonrepair。
- **`audit:deps` 现状**：全仓 57 全 no-circular；**C6+C7 命中 9 条**（scheduling 7：kanban-aggregate、gantt-tree-utils、**gantt-store×4**、`gantt/cpm.ts`（m1 勘正路径）；ai 2：use-conversation-bootstrap、use-conversation-autosave）。=M0 基线。
- **注册函数**：各 1 个薄委托（`registerSchedulingRenderers`@scheduling index.ts:22；`registerAiRenderers`@ai index.ts:144）。
- **marker 面（对照 3d 缺失案）**：scheduling 实存 `nop-gantt`/`nop-kanban`/`nop-calendar` 族；ai 实存 `nop-ai-*` 语义 marker（R1 抽验去重 19 串、对应 14 个 definition——m3 口径，执行期以逐 definition 对照表实数为准）——**两包根 marker 齐备**（执行时逐 definition 对照复核）。
- **样式契约面**：`check:audit-styling-suspects` 全仓 240 中 **C7 ai = 107 条**（**全部位于 `flux-renderers-ai/src/styles.css`**，`[data-slot='ai-*']` 属性选择器族——本项核心裁定面）；**C6 scheduling = 0**。missing-markers 0（**证明力局限：扫描器 `content.includes('nop-')` 豁免盲区，见 P2-MA1.5-002——本项 marker 结论以人工抽样为准**）。
- **knip C6+C7（包名过滤口径）**：unlisted-deps 1 + unused-exports 10 + unused-types 59（`_tmp/ma12-knip.out` 粗计，执行复跑定稿；证据文件产于 ea9aea279/c67e0c37c 期，`ea9aea279..e225e36e2` 零代码漂移数字仍有效——m2 出处注记）。
- **相关扫描器 M0 基线**（执行复跑）：definition-fields PASS、schema-prop-coverage PASS、hardcoded-dispatch 0、ai-engine-invariants 0（C7 专属扫描器）、styling-suspects 240（C6+C7 拆分见上）。
- **入口面**：执行实测（scheduling index、ai index 144+ 行含 registerAiRenderers）。
- **执行状态**：roadmap MA1.6 当前 `todo`；无 `arm2-MA1.6-*` 报告。

## Goals

- 产出 `docs/audits/YYYY-MM-DD-HHmm-arm2-MA1.6-scheduling-ai-structure.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA1.6-<nnn>`）。
- 覆盖面（matrix MA1.6 + 共享方法）：① 依赖图与跨包引用（9 环逐边定性；ai→content 边核对 sanitizeHtml 共享面）；② 定义正确性（definition 集合单源 + 薄注册 + 字段口径复扫）；③ **marker**（两包逐 definition 根 marker 对照——以人工抽样为权威，扫描器 0 标注盲区局限）；④ **样式契约**（**ai styles.css 107 条 data-slot 选择器逐桶裁定**——对照 MA1.4 notice-bar P2 先例口径：widget 自样式合规性 vs 形态债；scheduling 0 复核）；⑤ 导出面（knip 过滤分段 + churn）；⑥ 深化机会。
- 产出即登记 `docs/audits/arm2-index.md`（MA1.6 行 + P1 行如有）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；命中只定级登记（修复归 MR）。不排 MR/R\*.n；不改写历史文档；不预载 MA1.1–MA1.5 finding（复用口径须重新取证）。
- AI 组件行为（流式/工具调用/HITL）归 MA5.6；视觉走查归 MA6.2；sanitizeHtml 深度安全审计归 MA7.2——本项只做结构/契约面（边与归属登记）。
- 不执行 MA1.7 及以后工作项。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA1.6 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：`audit:deps`、`audit:knip`（包名过滤）、`check:audit-styling-suspects`（C6/C7 过滤）、`check:audit-missing-renderer-markers`/`renderer-definition-fields-only`/`schema-prop-coverage`/`audit-hardcoded-type-dispatch`/`check:ai-engine-invariants`、2 注册函数与 definition 集合、2 入口、owner doc 对照、git churn、deep-import 二分复扫。
- `docs/logs/` 当日 log 追加 MA1.6 条目；roadmap MA1.6 行状态流转。
- 收口提交：`fix(audit-r2):` 格式（共享 log hunk 级 staging）。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）；定级命中修复；MA1.7+ / MR / MV / MG；并发线未提交变更（出现即排除出提交范围并记录）。

## Failure Paths

| 可测场景编号   | 触发                                                                                                                                                                                                                                  | 行为                                                                                                 | 是否可重试 | 用户可见表现   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 全六类适用（本项高概率实例：definition/注册面破坏致 scheduling/ai 无法加载、ai sanitizeHtml 共享面破坏致 XSS 防线断裂、公共导出面破坏性变更未通知、运行时崩溃；marker 缺失属 P1 仅升级为渲染断裂才入 P0；不限于所列） | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan，登记 arm2-index P0 区 | 否         | 无（修复先行） |
| scanner-drift  | 核对扫描器输出高于 arm2-index M0 基线                                                                                                                                                                                                 | 停止收口，归因（应零变更），报告记录                                                                 | 是         | 无             |

预期均不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY，即 Closure Gates 预声明门禁）为 Proof 交付物。若触发 P0 追加 Fix Phase，该 Fix 自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 维度清单取证（依赖 / 定义 / marker / 样式契约 / 导出面）

Status: completed
Targets: 报告草稿、`_tmp/`

- Item Types: `Proof | Decision`

- [x] 依赖图：复跑/复核 `audit:deps` C6+C7=9（=M0）逐边定性（逐边法；gantt-store×4 重点）；**ai→content 边**核对（`sanitizeHtml` 公共导出消费——归属 content、AI 侧仅消费，供 MA7.2 交叉登记）；scheduling zustand 内部 store 性质核对；deep-import 二分复扫
- [x] 定义正确性：2 注册函数薄委托 + definition 集合单源核对；抽样 ≥3 定义对照 Renderer-Level Static Metadata（含 ai bubble/sender、scheduling gantt/kanban）；复跑 definition-fields + prop-coverage（=M0 PASS）
- [x] **marker**：scheduling（nop-gantt/kanban/calendar 族）与 ai（nop-ai-\* 族）逐 definition 根 marker 对照表——人工抽样为权威结论；missing-markers 复跑 0 但**报告必须标注 P2-MA1.5-002 扫描器盲区局限**（0 不作为存在性证明）
- [x] **样式契约**：**ai `styles.css` 107 条逐桶裁定**（按选择器族分组：ai-user-actions / ai-bubble-_ / ai-sender-_ 等——widget 自样式经 data-slot 钩子的合规性 vs 形态债，对照 MA1.4 P2-MA1.4-001 先例口径与 owner doc Marker Layers/Root Marker Rules）；scheduling styling=0 复核；`check:ai-engine-invariants` 0 复核（C7 专属）
- [x] 导出面：knip C6+C7 过滤分段抽样（unlisted 1 + exports 10 + types 59 各抽 ≥3，登记写过滤口径）；2 入口核对；churn 前 5 热点可追溯性抽样
- [x] 深化机会：发现即记 systemic 候选

Exit Criteria:

- [x] 五个取证维度各产出带证据条目（n/a 写理由）；9 环、ai 107 条分桶、knip 抽样全部完成 归族 + P 级判定（P0 触发 Failure Path）
- [x] ai styles.css 107 条有明确分桶裁定表；两包根 marker 有逐 definition 对照结论

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：churn 热点逐个问、knip 全量分段、已知失败模式 #4/#9、MA1.4/MA1.5 交叉引用（notice-bar 变体先例、missing-markers 盲区、3d marker 缺失对照——scheduling/ai 齐备反证）本轮重新取证
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：ai bubble markdown 渲染链（sanitizeHtml 消费位点全量）、gantt-store×4 环是否状态机外泄、ai index 大桶（144+ 行）是否混入非契约导出、dnd/zxing 重库懒加载边界
- [x] 深化机会与 MA5.6/MA6.2/MA7.2 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/YYYY-MM-DD-HHmm-arm2-MA1.6-scheduling-ai-structure.md`、`docs/audits/arm2-index.md`、`docs/logs/`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式落盘（含收口补记门禁节），文件名含时间戳
- [x] arm2-index：MA1.6 行回填；P1（如有）入索引区（ID `P1-MA1.6-<nnn>`）
- [x] daily log 追加 MA1.6 条目（路径 + 发现计数 + 门禁 + 缓存回放注记）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`）并登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致
- [x] BUILD_VERIFY（`pnpm test`，即 Closure Gates 预声明门禁）exit 0（结果记录入报告收口补记/log）

### Phase 4 - 收口与状态流转

Status: completed
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA1.6 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA1.6 `planned`→`done`，本 plan→`completed`
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap 流转），`fix(audit-r2):` 格式；标题不声称 `full-green verification`

Exit Criteria:

- [x] roadmap MA1.6 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 子代理（27 turns，11 组声称对账全✅）
- Verdict: `pass`（0 Blocker + 0 Major + 3 非阻断 Minor）→ m1–m3 顺手落实后升级 `active`
- Rounds: 1
- Findings addressed: m1 gantt/cpm.ts 路径勘正；m2 \_tmp 证据出处注记（零代码漂移判据）；m3 ai marker 口径改 R1 实测（19 串/14 definition，执行期对照表定稿）

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（n/a 显式理由、双风格两段齐备、收口补记门禁节实数）
- [x] arm2-index 登记（MA1.6 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记（缓存回放口径注明）
- [x] 执行期间核对扫描器输出不高于 arm2-index M0 基线
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA1.6 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（verdict `approved` 0B/0M + 2 非阻断 Minor A-1/A-2 已同 commit 勘正）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（P2×2 与 P3×1 按 Non-Goals 属 MR 批量修复面，已在 arm2-index/报告 Deferred 区排账）

## Closure

Status Note: MA1.6 全部 Phase 交付完成——报告双风格落盘、arm2-index 登记（MA1.6 行，P1=0）、daily log、BUILD_VERIFY 与四门禁实测、零代码变更纪律经审计核验；closure audit verdict `approved`（0B/0M + 2 非阻断 Minor 已同 commit 勘正）。roadmap MA1.6 已流转 `done`。P0=0、P1=0（两包 18 definitions 根 marker 全齐）、P2=2（ai styles.css 107 分桶 + 9 类型级环零运行时环）、P3=1（knip 70）、systemic 候选 3 条只记录不落地。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，18 turns，8 任务组直接观测：107 分桶抽验、3 类型边亲验、knip 1+10+59 复算、marker/sanitizeHtml 误报抽验、三扫描器抽复跑、arm2-index diff 逐字节、git status 恰 5 文件）
- Evidence: Verdict `approved`（0 Blocker + 0 Major + 2 非阻断 Minor）；A-1「其余 10 桶→11 桶」、A-2「nop-ai-\* 19→18 串」已同 commit 勘正；授权覆盖状态流转与收口提交（不声称 full-green）

Follow-up:

- no remaining plan-owned work
