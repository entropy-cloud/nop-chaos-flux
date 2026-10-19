# 661 审计修复 R2·MA1.8：office 族定义与边界审计

> Plan Status: completed
> Last Reviewed: 2026-10-19
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA1.8；`missions/audit-remediation-r2.json`；方法论 `deep-audit-prompts.md`（附录 A）+ `flux-component-design-review-prompt.md` + `architecture-deepening-review-prompt.md`
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA1 节、`docs/audits/arm2-index.md`、MA1.1–MA1.7 plan 654–660（复用口径：逐边法/knip **路径段匹配**（word-editor≠editor-core 教训）/BEM 清点法/marker 盲区注记/P0 六类模板——不预载 finding）、owner doc `flux-runtime-module-boundaries.md` + `report-designer/design.md` + `renderer-markers-and-selectors.md`

## Purpose

对 C9 office 族（spreadsheet-core / spreadsheet-renderers / word-editor-core / word-editor-renderers / report-designer-core / report-designer-renderers，合计 158 src/123 test）执行结构与契约层审计（matrix MA1.8：**定义与边界**）。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-19 live 实测，HEAD `b6433355c`；工作树并发 mobile 线 4 文件 + log 仅 mobile entry hunk 未提交〔MA1.7 收口期误伤 MA1.5/MA1.6 计数的 hunk 已于本 plan 起草期清理回 HEAD——R1 m1 勘正后干净态〕，本项产物与提交不含之）

- **依赖 extras**（公共 {core,i18n,react,ui} 外，穷尽枚举——R1 M1 勘正补全 zustand×3/lucide-react×2）：spreadsheet-core + **editor-core + zustand**；spreadsheet-renderers + spreadsheet-core + use-sync-external-store + **lucide-react**；word-editor-core + **@hufe921/canvas-editor + zustand**；word-editor-renderers + word-editor-core + use-sync-external-store + **lucide-react**；report-designer-core + **editor-core + spreadsheet-core + zustand**；report-designer-renderers + **report-designer-core + spreadsheet-core + spreadsheet-renderers** + lucide-react + use-sync-external-store。跨 office 边显著（report→spreadsheet 三包 + core→editor-core×2）；第三方 {zustand, lucide-react} 为内部 store/UI 库消费。
- **`audit:deps` 现状**：全仓 57 全 no-circular；**C9 命中 0**（六包全净——MA1.x 最干净簇之一）。=M0。
- **注册面**：三 renderers 包各一 `renderers.tsx`（含 registerRendererDefinitions 消费——执行核对薄委托与集合单源）。
- **marker 面**：实存 `nop-spreadsheet-page` / `nop-word-editor-page` / `nop-report-{designer,toolbar,inspector,inspector-shell,field-panel}` 族；**BEM `--` 修饰符 C9 = 0**（对照 MA1.7 的 16 处——office 族干净）。
- **样式契约面**：`check:audit-styling-suspects` C9 = **127 条，全部位于 `spreadsheet-renderers/src/canvas-styles.css`**（`[data-slot='spreadsheet-grid']` 状态/拖拽/过滤选择器族——本项核心裁定面，与 ai 107 同型规模化）；word/report CSS 文件零命中。
- **knip C9（路径段过滤口径）**：unlisted **0** / exports **14** / types **29**（`_tmp/ma12-knip.out`；路径段 `packages/(spreadsheet|word-editor|report-designer)-(core|renderers)/`，执行复跑定稿）。
- **专属门禁/相关扫描器**：执行复跑 `check:report-designer-*`（如存在）、definition-fields PASS、schema-prop-coverage PASS、missing-markers 0（盲区注记）、hardcoded-dispatch 0（M0）。
- **执行状态**：roadmap MA1.8 当前 `todo`；无 `arm2-MA1.8-*` 报告。

## Goals

- 产出 `docs/audits/YYYY-MM-DD-HHmm-arm2-MA1.8-office-structure.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA1.8-<nnn>`）。
- 覆盖面（matrix MA1.8 + 共享方法）：① 依赖图与跨 office 边（C9=0 环复核 + report→spreadsheet 三包边 + core→editor-core 边的消费面与 owner doc 对照）；② 定义正确性（三注册面单源 + 字段口径复扫 + 报告 spreadsheet 桥 bridge 形态）；③ 样式契约（**canvas-styles.css 127 条分桶裁定** + BEM=0 复核 + markers 对照）；④ 导出面（knip 43 行过滤 + `@nop-chaos/spreadsheet-renderers/canvas-styles.css` subpath 声明核对 + churn）；⑤ 深化机会。
- 产出即登记 `docs/audits/arm2-index.md`（MA1.8 行 + P1 行如有）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；命中只定级登记（修复归 MR）。不排 MR/R\*.n；不改写历史文档；不预载 MA1.1–MA1.7 finding。
- office 编辑器行为/交互归 MA5.3；视觉走查归 MA6.4——本项只做结构/契约面。
- 不执行 MA1.9 及以后工作项。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA1.8 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：`audit:deps`、`audit:knip`（路径段过滤）、`check:audit-styling-suspects`（C9 过滤）、`check:audit-missing-renderer-markers`/`renderer-definition-fields-only`/`schema-prop-coverage`、report-designer 专属 check（live 发现即跑）、3 注册面与 definition 集合、6 包入口、owner doc 对照、git churn、deep-import 二分复扫（含 canvas-styles.css subpath）。
- `docs/logs/` 当日 log 追加 MA1.8 条目（**hunk 级 staging 排除并发 mobile entry**——沿用 MA1.7 先例）；roadmap MA1.8 行状态流转。
- 收口提交：`fix(audit-r2):` 格式。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）；定级命中修复；MA1.9+ / MR / MV / MG；并发线未提交变更（mobile 线 4 文件 + log mobile entry hunk——一律排除出提交范围并记录；R1 m1 勘正后 log 无其他未提交 hunk）。

## Failure Paths

| 可测场景编号   | 触发                                                                                                                                                                                            | 行为                                                                                                 | 是否可重试 | 用户可见表现   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 全六类适用（本项高概率实例：office 注册/桥接面破坏致编辑器无法装配、公共导出面破坏性变更未通知、运行时崩溃；BEM/marker 属 P1 仅升级为渲染断裂/核心操作阻断才入 P0；不限于所列） | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan，登记 arm2-index P0 区 | 否         | 无（修复先行） |
| scanner-drift  | 核对扫描器输出高于 arm2-index M0 基线或本轮基线                                                                                                                                                 | 停止收口，归因（应零变更），报告记录                                                                 | 是         | 无             |

预期均不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY，即 Closure Gates 预声明门禁）为 Proof 交付物。若触发 P0 追加 Fix Phase，该 Fix 自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 维度清单取证（依赖 / 定义 / 样式契约 / 导出面）

Status: completed
Targets: 报告草稿、`_tmp/`

- Item Types: `Proof | Decision`

- [x] 依赖图：复跑/复核 `audit:deps` C9=0（=M0，全净簇）；**跨 office 边核对**——report-designer-renderers→{core,spreadsheet-core,spreadsheet-renderers}（bridge.ts type + report-spreadsheet-canvas value + canvas-styles.css subpath）、report-designer-core→{editor-core,spreadsheet-core}、spreadsheet-core→editor-core（`registerEditorDomain` 适配器形态）、word-editor-core→canvas-editor 第三方引擎——各边消费面与 owner doc（Package Entry Boundaries/report-designer design.md）对照；deep-import 二分复扫（含 subpath exports 声明核对）
- [x] 定义正确性：三 renderers.tsx 注册面薄委托 + definition 集合单源核对（各包集合条目计数）；抽样 ≥3 定义对照 Renderer-Level Static Metadata（hostContract 若有核分类）；复跑 definition-fields + schema-prop-coverage（=M0 PASS）
- [x] **样式契约**：**`canvas-styles.css` 127 条分桶裁定**（按 data-slot/状态选择器族分组——spreadsheet-grid 状态/拖拽/过滤/填充族，widget 自样式合规性 vs 形态债，对照 MA1.6 ai-107 先例口径）；word/report 两 CSS 零命中复核；**BEM `--`=0 复核**（对照 MA1.7 教训全量 grep）；markers 族对照（nop-spreadsheet-page/nop-word-editor-page/nop-report-\*——人工抽样权威，missing-markers 0 盲区照录）
- [x] 导出面：knip C9 路径段过滤分段抽样（exports 14 + types 29 各抽 ≥3；unlisted 0 记录；登记写过滤口径）；6 包入口核对；churn 前 5 热点可追溯性抽样
- [x] 深化机会：发现即记 systemic 候选

Exit Criteria:

- [x] 五个取证维度各产出带证据条目（n/a 写理由）；canvas-styles 127 分桶与 knip 抽样全部完成 归族 + P 级判定（P0 触发 Failure Path）
- [x] canvas-styles.css 127 条有明确分桶裁定表；跨 office 边有逐边消费面结论

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：churn 热点逐个问、knip 全量分段、已知失败模式 #4/#9、MA1.4/MA1.6/MA1.7 交叉引用（notice-bar/ai-107 分桶先例、BEM 清点法、marker 盲区）本轮重新取证
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：127 条是否全是 spreadsheet-grid 状态族还是含深层结构选择器、report 桥是否双源（bridge type vs canvas value 面）、canvas-editor 引擎边界、knip 43 行死功能排查
- [x] 深化机会与 MA5.3/MA6.4 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/YYYY-MM-DD-HHmm-arm2-MA1.8-office-structure.md`、`docs/audits/arm2-index.md`、`docs/logs/`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式落盘（含收口补记门禁节 + 复核统计行——MA1.7 M5 教训），文件名含时间戳
- [x] arm2-index：MA1.8 行回填；P1（如有）入索引区（ID `P1-MA1.8-<nnn>`）
- [x] daily log 追加 MA1.8 条目（路径 + 发现计数 + 门禁 + 缓存回放注记 + **误报计数与报告清单实数一致**——MA1.7 R2 教训）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`）并登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致
- [x] BUILD_VERIFY（`pnpm test`，即 Closure Gates 预声明门禁）exit 0（结果记录入报告收口补记/log）

### Phase 4 - 收口与状态流转

Status: completed
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA1.8 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA1.8 `planned`→`done`，本 plan→`completed`
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap 流转，log hunk 拆分仅 stage MA1.8 entry、排除 mobile entry 与他线 platform-hardening-roadmap.md 等并发文件），`fix(audit-r2):` 格式；标题不声称 `full-green verification`

Exit Criteria:

- [x] roadmap MA1.8 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件（并发线文件除外且未被触碰）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 子代理 R1（10 组声称对账）+ 独立 fresh-session 子代理 R2（M1/m1 回修 live 复核）
- Verdict: R1 `fail`（0B/1M/1m——deps extras 5/6 包漏项 + log 脏态漏注）→ M1+m1 回修落实 → R2 `pass`（0B/0M）→ 升级 `active`
- Rounds: 2
- Findings addressed: M1 deps extras 六行穷尽枚举补全 zustand×3/lucide-react×2（与六 package.json 逐字吻合）；m1 log 误伤 hunk 清理回 HEAD（diff=仅 mobile 8 insertions）+ Baseline/Out Of Scope/Phase 4 三处同步勘正 + 收口前 diff 预检条款

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（n/a 显式理由、双风格两段齐备、收口补记门禁节实数）
- [x] arm2-index 登记（MA1.8 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记（缓存回放口径注明）
- [x] 执行期间核对扫描器输出不高于 arm2-index M0 基线或本轮基线
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA1.8 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（R1 issues〔M1 分母混用 + m1〕→ 正文/log 勘正 → delta issues〔判别索引清尾残留〕→ :95 清尾 → 预授权终局 approved）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（P2-MA1.8-001 与 P3×1 按 Non-Goals 属 MR 批量修复面，已在 arm2-index/报告 Deferred 区排账）

## Closure

Status Note: MA1.8 全部 Phase 交付完成——报告双风格落盘、arm2-index 登记（MA1.8 行，P1=0）、daily log、BUILD_VERIFY 与四门禁实测、零代码变更纪律经审计核验；closure audit 两轮（R1 issues：M1 分母混用〔全文件 data-slot 计数 vs 127 suspect 划分〕+ m1 → 正文/log 勘正 → delta：判别索引清尾残留 → :95 清尾 → 预授权终局 `approved`）。roadmap MA1.8 已流转 `done`。P0=0、P1=0（三注册单源/BEM=0/C9 零环/markers 五族齐备）、P2=1（canvas-styles 127 suspect 分桶——report-canvas 29 最重）、P3=1（knip 43）、systemic 候选 3 条只记录不落地。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，两轮：R1 8 任务组全量核验 → issues〔M1 分母 + m1〕；delta 复核正文/log pass 抓 :95 清尾残留 → 清尾后**预授权终局 approved**）
- Evidence: R1 除 M1 外 7 任务组全 pass（deps=0/BEM=0/knip 0-14-29/churn 可追溯/门禁四实数/log 双 hunk 边界）；M1 独立复算 127 suspect 行映射 top-4=29/28/11/9 与勘正后正文吻合；m1 prettier 对齐放行；预授权覆盖状态流转与收口提交（仅 stage MA1.8 log hunk，排除 mobile entry 与他线 platform-hardening-roadmap.md，不声称 full-green）

Follow-up:

- no remaining plan-owned work
