# 660 审计修复 R2·MA1.7：designer 族边界与一致性审计

> Plan Status: completed
> Last Reviewed: 2026-10-19
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA1.7；`missions/audit-remediation-r2.json`；方法论 `deep-audit-prompts.md`（§A + 附录 A）+ `flux-component-design-review-prompt.md` + `architecture-deepening-review-prompt.md`
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA1 节、`docs/audits/arm2-index.md`、MA1.1–MA1.6 plan 654–659（复用口径：逐边法/knip 二分/包名≠类别/marker 盲区/P0 六类+marker→P1 模板——不预载 finding）、owner doc `flux-runtime-module-boundaries.md` + `flow-designer/design.md` + `renderer-markers-and-selectors.md`

## Purpose

对 C8 designer 族（flow-designer-core / flow-designer-renderers / editor-core / page-designer-core / page-designer-renderers，合计 132 src/97 test）执行结构与契约层审计（matrix MA1.7：**边界与一致性**，**额外跑 `check:page-designer-boundary` + `check:designer-conformance`**）。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-19 live 实测，HEAD `e9fd6544f`，干净树）

- **依赖 extras**（公共 {core,i18n,react,ui} 外）：flow-designer-core + elkjs；flow-designer-renderers + flow-designer-core + **flux-action-core（跨簇）** + @xyflow/react + use-sync-external-store；editor-core 零 extras；page-designer-core + editor-core；page-designer-renderers + editor-core + flux-formula + **flux-renderers-{basic,form,layout}（跨渲染器族）** + page-designer-core + lucide-react。
- **`audit:deps` 现状**：全仓 57 全 no-circular；**C8 命中 2 条**（page-designer-core/round-trip.ts 起环；flow-designer-core/designer-core-types.ts 起环）。=M0。
- **设计器专属门禁（roadmap MA1.7 点名）**：`check:page-designer-boundary` exit 0；`check:designer-conformance` exit 0（本轮实跑）。
- **注册面**：`registerFlowDesignerRenderers`@flow-designer-renderers/renderer-definitions.ts:368；page-designer-renderers 无同型 register\*Renderers（designer 族经 designer-registry/宿主装配——执行核对）；另有 canvas focus/plus-button handler 注册函数（非 RendererRegistry 形态）。
- **marker 面**：实存 `nop-designer`/`nop-designer-node`/`nop-designer-node-card`/`nop-designer-edge-row`/`nop-designer-field` 族——**但同时实存 6 处 BEM 修饰符类**（`nop-designer-edge-row--empty/--active/--selected` @ designer-edge-row.tsx:66/86/87；`nop-designer-node-card--empty/--active/--selected` @ designer-node-card.tsx:60/83/84）——owner doc `renderer-markers-and-selectors.md:242` 明文「Renderer state uses `data-*` or `aria-*`, not BEM modifier classes」（违例样例恰为 `nop-field--dirty` 型）；`styling-system.md:416` 同则。**本项核心 P1 候选面**（执行时核对 6 处是否伴随 data-state 冗余双写）。
- **样式契约面**：styling-suspects C8=0（`_tmp/ma14-styling.out`）。
- **knip C8（包名过滤口径）**：unlisted 1 + exports 39 + types 38（粗计——R1 M1 勘正：须用**路径段匹配**排除 `word-editor-core` 子串污染，正确值 = unlisted 1 + exports **38** + types **33**；执行复跑定稿；证据文件 `_tmp/ma12-knip.out` 产于 fa768d9c4，零代码漂移有效——m1 出处注记）。
- **执行状态**：roadmap MA1.7 当前 `todo`；无 `arm2-MA1.7-*` 报告。

## Goals

- 产出 `docs/audits/YYYY-MM-DD-HHmm-arm2-MA1.7-designer-structure.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA1.7-<nnn>`）。
- 覆盖面（matrix MA1.7 + 共享方法）：① 依赖图与跨簇边（2 环逐边 + flow-renderers→action-core + page-renderers→basic/form/layout/formula 核对）；② **边界合规**（designer 专属双门禁复跑 + Package Entry Boundaries 中 flow-designer-renderers `/unstable` 分层核对 + cross-package 深导入二分）；③ **一致性**（definition/注册面：flow 单注册 vs page designer-registry 装配形态对照；designer-conformance 覆盖面登记）；④ **样式契约**（**6 处 BEM 修饰符逐处裁定——预期 P1**；markers 族对照 Root Marker Rules/State Rules）；⑤ 导出面（knip C8 过滤 = unlisted 1 + exports 38 + types 33 共 72 行 + churn；路径段匹配口径）；⑥ 深化机会。
- 产出即登记 `docs/audits/arm2-index.md`（MA1.7 行 + P1 行如有）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；命中只定级登记（BEM 修复等归 MR）。不排 MR/R\*.n；不改写历史文档；不预载 MA1.1–MA1.6 finding。
- designer 行为/交互归 MA5.1；视觉走查归 MA6.4——本项只做边界/一致性/结构面。
- 不执行 MA1.8 及以后工作项。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA1.7 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：`audit:deps`、`audit:knip`（包名过滤）、`check:page-designer-boundary`/`check:designer-conformance`（roadmap 点名）、`check:audit-styling-suspects`（C8 过滤）、`check:audit-missing-renderer-markers`/`renderer-definition-fields-only`、5 包入口与注册/装配面、BEM 修饰符 6 处逐处核对、owner doc 对照、git churn、deep-import 二分复扫。
- `docs/logs/` 当日 log 追加 MA1.7 条目；roadmap MA1.7 行状态流转。
- 收口提交：`fix(audit-r2):` 格式（共享 log hunk 级 staging）。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）；定级命中修复；MA1.8+ / MR / MV / MG；并发线未提交变更（出现即排除出提交范围并记录）。

## Failure Paths

| 可测场景编号   | 触发                                                                                                                                                                                                     | 行为                                                                                                 | 是否可重试 | 用户可见表现   |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 全六类适用（本项高概率实例：designer 注册/边界破坏致设计器无法装配、公共导出面破坏性变更未通知、运行时崩溃；BEM 漂移/marker 问题属 P1 仅升级为渲染断裂/核心操作阻断才入 P0；不限于所列） | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan，登记 arm2-index P0 区 | 否         | 无（修复先行） |
| scanner-drift  | 核对扫描器/专属门禁输出高于 arm2-index M0 基线或本轮基线                                                                                                                                                 | 停止收口，归因（应零变更），报告记录                                                                 | 是         | 无             |

预期均不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY，即 Closure Gates 预声明门禁）为 Proof 交付物。若触发 P0 追加 Fix Phase，该 Fix 自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 维度清单取证（依赖 / 边界 / 一致性 / 样式契约 / 导出面）

Status: completed
Targets: 报告草稿、`_tmp/`

- Item Types: `Proof | Decision`

- [x] 依赖图：复跑/复核 `audit:deps` C8=2（=M0）逐边定性（round-trip 环与 designer-core-types 环——逐边法）；**跨簇边核对**（flow-renderers→flux-action-core 消费面；page-renderers→basic/form/layout/formula 四边消费面——对照 Package Entry Boundaries 与渲染器族互用口径）；deep-import 二分复扫（含 flow-designer-renderers `/unstable` subpath 声明核对）
- [x] 边界合规：**`check:page-designer-boundary` + `check:designer-conformance` 复跑**（=本轮基线 exit 0；conformance 覆盖面登记——多少 renderer definition 参与 conformance 测试）；Package Entry Boundaries 中 flow-designer-renderers unstable 分层与 root barrel 不相交断言（对照 MA1.2 flux-react 方法）
- [x] 一致性：注册/装配面对照（`registerFlowDesignerRenderers` 薄委托核对；page-designer-renderers 的 designer-registry 装配形态——与标准 register\*Renderers 差异的裁定与 owner doc 依据）；editor-core 作为共享底座被 page-designer-core/renderers 消费的边界（零 extras 包）
- [x] **样式契约**：**6 处 BEM 修饰符逐处裁定**（`nop-designer-{edge-row,node-card}--{empty,active,selected}`——是否伴随 data-state 双写、是否违反 :242 State Rules；预期 P1-MA1.7-001）；markers 族对照 Root Marker Rules（`--` 修饰符禁令）；styling-suspects C8=0 复核；missing-markers 复跑 0（盲区局限照录）
- [x] 导出面：knip C8 过滤分段抽样（unlisted 1 + exports **38** + types **33** 各抽 ≥3，登记写过滤口径且**路径段匹配排除 word-editor-core**——R1 M1 勘正）；5 包入口核对；churn 前 5 热点可追溯性抽样
- [x] 深化机会：发现即记 systemic 候选

Exit Criteria:

- [x] 五个取证维度各产出带证据条目（n/a 写理由）；2 环、BEM 6 处、knip 抽样全部完成 归族 + P 级判定（P0 触发 Failure Path）
- [x] BEM 修饰符 6 处有明确裁定表（每处：位点/是否双写/data-state 对照/P 级）

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：churn 热点逐个问、knip 全量分段、已知失败模式 #4（BEM 漂移——本项主命中面）/#9、MA1.2/MA1.5 交叉引用（unstable 分层方法、hostContract 分类、marker 盲区）本轮重新取证
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：BEM 修饰符是否在 CSS 文件有对应规则（孤儿类还是真样式钩子）、designer-conformance 是否覆盖 BEM 面、page-renderers 跨族 import 是否破坏族边界、flow renderer definitions 注册完整性
- [x] 深化机会与 MA5.1/MA6.4 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/YYYY-MM-DD-HHmm-arm2-MA1.7-designer-structure.md`、`docs/audits/arm2-index.md`、`docs/logs/`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式落盘（含收口补记门禁节），文件名含时间戳
- [x] arm2-index：MA1.7 行回填；P1（如有）入索引区（ID `P1-MA1.7-<nnn>`）
- [x] daily log 追加 MA1.7 条目（路径 + 发现计数 + 门禁 + 缓存回放注记）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`）并登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致
- [x] BUILD_VERIFY（`pnpm test`，即 Closure Gates 预声明门禁）exit 0（结果记录入报告收口补记/log）

### Phase 4 - 收口与状态流转

Status: completed
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA1.7 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA1.7 `planned`→`done`，本 plan→`completed`
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap 流转，log hunk 拆分排除并发 mobile entry），`fix(audit-r2):` 格式；标题不声称 `full-green verification`

Exit Criteria:

- [x] roadmap MA1.7 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 子代理 R1（21 turns，10 组声称对账）+ 独立 fresh-session 子代理 R2（11 turns，M1/m1/m2 修复核验 + knip C8 路径段复算 1/38/33）
- Verdict: R1 `revised`（0B/1M/2m——knip C8 计数被 word-editor-core 子串污染）→ M1+m1 落实、m2 条款已在场；R2 `pass`（0B/0M）→ 升级 `active`
- Rounds: 2
- Findings addressed: M1 knip C8 基线改 1/38/33 + 路径段匹配排除注记（三处联动）；m1 \_tmp 证据出处注记；m2 并发噪声排除由 Out Of Scope + Phase 4 git status 门禁承接（本轮执行收口 hunk 级 staging 排除并发 mobile 线文件）

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（n/a 显式理由、双风格两段齐备、收口补记门禁节实数）
- [x] arm2-index 登记（MA1.7 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记（缓存回放口径注明）
- [x] 执行期间核对扫描器/专属门禁输出不高于 arm2-index M0 基线或本轮基线
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA1.7 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（R1 issues〔B1–B5 取证登记缺口+M1–M5〕→ 回修 11 处 → R2 issues〔B5 残留+log 计数 2 条〕→ 回修 → R3 终核 `approved`）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（P1-MA1.7-001 与 P2×1/P3×1 按 Non-Goals 属 MR 批量修复面，已在 arm2-index/报告 Deferred 区排账）

## Closure

Status Note: MA1.7 全部 Phase 交付完成——报告双风格落盘、arm2-index 登记（MA1.7 行 + P1-MA1.7-001）、daily log、BUILD_VERIFY 与四门禁实测、零代码变更纪律经审计核验；closure audit 三轮（R1 issues 5B+5m → 补录 11 处 → R2 issues 2 条 → 回修 → R3 终核 `approved`）。roadmap MA1.7 已流转 `done`。P0=0、P1=1（16 处 BEM 违规含 6/6 data-\* 双写勘正）、P2=1（2 类型级环）、P3=1（knip 72）、systemic 候选 3 条 + BEM 扫描器扩展提案只记录不落地。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session 子代理（R1 8 任务组全量核验 → issues；R2 回修复核 → issues〔B5 残留+计数漂移〕；R3 fresh 终核 → **approved**）
- Evidence: R1=B1 churn 零落盘/B2 types 抽样缺/B3 conformance 计数缺/B4 deep-import 未登记/B5 data-_ 双写误述 + M1–M5；回修 11 处标 `closure audit B_/M\*`；R2 抽验 B1–B4+M1–M5 全 PASS 抓 2 残留；R3 复核两残留落实 + 声称性短语清零（仅勘正引语残留属可接受形态）+ 计数 9 条吻合 → 终局 approved，授权状态流转与收口提交（hunk 拆分排除 mobile entry）

Follow-up:

- no remaining plan-owned work
