# 658 审计修复 R2·MA1.5：domain 族定义与样式契约审计

> Plan Status: completed
> Last Reviewed: 2026-10-19
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA1.5；`missions/audit-remediation-r2.json`；方法论 `docs/skills/flux-component-design-review-prompt.md` + `deep-audit-prompts.md`（附录 A）+ `architecture-deepening-review-prompt.md`
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA1 节、`docs/audits/arm2-index.md`、MA1.1–MA1.4 plan 654–657（方法先例与已裁定口径可复用：knip 过滤二分、包名≠渲染器类别、deep-import 二分——不预载其 finding 结论）、owner doc `docs/architecture/renderer-markers-and-selectors.md` + `renderer-runtime.md`

## Purpose

对 C5 domain 渲染器簇（flux-renderers-industrial / 3d / graph / map）执行结构与契约层审计，核心口径 = **定义与样式契约**（matrix MA1.5），叠加依赖/导出面/注册共享方法。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-19 live 实测，HEAD `5468dd758`，干净树）

- **簇构成与规模**（roadmap 口径）：industrial 158 src/152 test、3d 23/24、graph 10/7、map 9/6，合计 200/189（S 级，industrial 主导）。
- **依赖方向 extras**（公共 {core,i18n,react,ui} 之外）：industrial + leafer-ui/@leafer-in/{editor,viewport} + **@nop-chaos/editor-core**（designer 族跨簇边，与 dashboard 同型——消费面抽验）+ lucide-react；3d + three + lucide-react；graph + @xyflow/react + dagre + zustand；map + ol（OpenLayers）。
- **`audit:deps` 现状**：全仓 57 全 no-circular；**C5 命中 11 条**（industrial 9：interaction-overlay×2 + symbols/compound + serialization/config-types + engine/config-adapter + editor/{use-editor-engine,editor-session,connection-adapter,canvas-view-helpers}；3d 2：scene-json-assembly + pointer-hover；graph/map 0）。与 M0 基线一致（证据文件 `_tmp/ma12-deps.out` 等产于 `fa768d9c4`/`c67e0c37c`，其间仅 docs 变更零源码漂移，数字在 `5468dd758` 逐字成立——m4 勘正出处注记；执行期复跑定稿）。
- **注册机制**：5 个 **renderer 注册函数（入参 `RendererRegistry`）**（另有 symbol/domain 级 register\* 不计——m1 勘正限定；**industrial 双入口**：`registerScadaRenderers`@index.ts:81 + `registerScadaEditorRenderers`@editor/index.ts:57——双注册面为执行核对点）；3d `registerThreeRenderers`@renderer-definitions.ts:81；graph index.ts:15；map index.ts:17。
- **样式契约面**：`check:audit-styling-suspects` C5 命中 **0**（全仓 240 中零 C5——domain 族样式面干净基线）；`check:audit-missing-renderer-markers` 0（C5 在 flux-renderers-\* 扫描面内）。
- **knip C5（包名过滤口径，沿用 MA1.4 钉死的二分纪律——全仓分节数勿误标为 C4/C5 专属）**：devDeps 1 + unlisted-deps **17** + unused-exports **109** + unused-types **121** + other 1（`_tmp/ma12-knip.out` 包名正则过滤粗计，执行时复跑登记定稿；industrial 导出面体量显著）。
- **入口面**：执行时实测（industrial index + editor/index 双入口、3d renderer-definitions、graph/map index）。
- **相关扫描器 M0 基线**（执行复跑）：missing-markers 0、styling-suspects 240（C5=0）、definition-fields PASS、schema-prop-coverage PASS、hardcoded-type-dispatch 0（M0）、audit-renderer-browser-io 0（M0——C5 是浏览器 IO 重镇，供 MA2.3 交叉）。
- **执行状态**：roadmap MA1.5 当前 `todo`；`docs/audits/` 无 `arm2-MA1.5-*` 报告。

## Goals

- 产出 `docs/audits/YYYY-MM-DD-HHmm-arm2-MA1.5-domain-structure.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA1.5-<nnn>`）。
- 覆盖面（matrix MA1.5 + MA1 共享 + 可复用裁定口径）：① 依赖图与模块边界合规（11 环逐边定性——沿用 MA1.1 逐边法；industrial→editor-core 跨簇边核对；边界口径对照 `flux-runtime-module-boundaries.md` 包边界节——m3 勘正补映射）；② **定义正确性**（双注册面 industrial 完整性 + 3d/graph/map definition 集合单源 + 字段口径）；③ **样式契约**（styling C5=0 复核 + markers 复扫 + marker 发射抽样——domain 族特有的 canvas/scene 锚点 `nop-scada`/`nop-3d` 类 marker 与 owner doc Canvas/scene-graph 节对照）；④ 导出面与注册（knip C5 过滤口径分段抽样 ≥各 3 + 双注册面 + churn）；⑤ 深化机会。
- 产出即登记 `docs/audits/arm2-index.md`（MA1.5 行 + P1 行如有）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；命中只定级登记（修复归 MR）。不排 MR/R\*.n 行；不改写历史文档；不预载 MA1.1–MA1.4 结论（复用的是**方法与口径**，其 finding 须本轮重新取证）。
- 组件行为/交互归 MA5（scada/3d 走查）、视觉走查归 MA6.3——本项只做结构合规面。
- 不执行 MA1.6 及以后工作项。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA1.5 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：`audit:deps`、`audit:knip`（C5 包名过滤口径）、`check:audit-styling-suspects`（C5 过滤）、`check:audit-missing-renderer-markers`/`renderer-definition-fields-only`/`schema-prop-coverage`/`audit-hardcoded-type-dispatch`、5 注册函数与 definition 集合、入口文件、owner doc 对照、git churn、deep-import 二分复扫。
- `docs/logs/` 当日 log 追加 MA1.5 条目；roadmap MA1.5 行状态流转。
- 收口提交：`fix(audit-r2):` 格式（共享 log hunk 级 staging）。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）；定级命中修复；MA1.6+ / MR / MV / MG；并发线未提交变更（出现即排除出提交范围并记录）。

## Failure Paths

| 可测场景编号   | 触发                                                                                                                                                                                                                     | 行为                                                                                                 | 是否可重试 | 用户可见表现   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 全六类适用（本簇高概率实例：definition/注册面破坏致 domain 渲染器无法加载、公共导出面破坏性变更未通知、运行时崩溃；marker 缺失本身属 P1——仅当升级为渲染断裂/核心操作阻断才入 P0〔m2 勘正〕；不限于所列） | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan，登记 arm2-index P0 区 | 否         | 无（修复先行） |
| scanner-drift  | 核对扫描器输出高于 arm2-index M0 基线                                                                                                                                                                                    | 停止收口，归因（应零变更），报告记录                                                                 | 是         | 无             |

预期均不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY，即 Closure Gates 预声明门禁）为 Proof 交付物。若触发 P0 追加 Fix Phase，该 Fix 自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 维度清单取证（依赖 / 定义 / 样式契约 / 导出面）

Status: completed
Targets: 报告草稿、`_tmp/`

- Item Types: `Proof | Decision`

- [x] 依赖图：复跑/复核 `audit:deps` C5=11（=M0）并逐边定性（type-only vs 运行时，逐边法；industrial 9 条 editor/engine/symbols 族 + 3d 2 条 engine 族）；**industrial→editor-core 边**核对（消费文件数 + 公共 API + 与 dashboard 同型裁定）；deep-import 二分复扫（未声明穿透 0 预期 + 已声明 subpath 归族）
- [x] 定义正确性：**industrial 双注册面**完整性（scada 主面 index.ts:81 与 editor 面 editor/index.ts:57 各自的 definition 集合、互不重叠、bundle 只注册主面的现状核对）+ 3d/graph/map 单源集合核对；抽样 ≥3 定义对照 Renderer-Level Static Metadata + **domain-host-renderer 分类核对**（C5 是 hostContract 可能出现的族——抽 industrial hostContract 使用是否合分类规则）；复跑 definition-fields + prop-coverage（=M0 PASS）
- [x] 样式契约：styling-suspects C5=0 复核；missing-markers 复扫 0；marker 发射抽样（scada 锚点 `nop-scada-*`〔实存，抽样对照〕+ 3d/graph/map 根 marker **现状执行时取证**——已知 3d 现根类为裸 `three-canvas`、零 `nop-*` 前缀 marker，`nop-3d` 不存在〔R1 M1 勘正：不预设存在〕；对照 owner doc Canvas/scene-graph 节与 Layer 2 root semantic markers 节逐包裁定——3d 根 marker 缺失疑点为 finding 候选）；`audit-renderer-browser-io` 0 复核（供 MA2.3 交叉）
- [x] 导出面与注册：knip C5 过滤分段抽样（unlisted 17 + exports 109 + types 121 各抽 ≥3，**登记写过滤口径**）；入口文件核对；churn 前 5 热点可追溯性抽样
- [x] 深化机会：发现即记 systemic 候选

Exit Criteria:

- [x] 四个取证维度各产出带证据条目（n/a 写理由）；11 环与 knip 抽样全部完成 归族 + P 级判定（P0 触发 Failure Path）
- [x] industrial 双注册面与 hostContract 分类有明确结论

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：churn 热点逐个问、knip C5 全量分段、已知失败模式 #4/#9、MA1.3/MA1.4 交叉引用（运行时环裁定法、包名≠渲染器类别、editor-core 边消费面 6 文件口径）本轮重新取证
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：industrial 双注册面是否漂移（editor 面 definition 与主面重叠）、109 unused exports 是否含死功能模块（industrial engine 内部 API 外泄）、graph zustand 直依赖（绕 flux-react 状态面？）、map ol 重库懒加载边界
- [x] 深化机会与 MA5/MA6.3/MA2.3 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/YYYY-MM-DD-HHmm-arm2-MA1.5-domain-structure.md`、`docs/audits/arm2-index.md`、`docs/logs/`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式落盘（含收口补记门禁节），文件名含时间戳
- [x] arm2-index：MA1.5 行回填；P1（如有）入索引区（ID `P1-MA1.5-<nnn>`）
- [x] daily log 追加 MA1.5 条目（路径 + 发现计数 + 门禁 + 缓存回放注记）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`）并登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致
- [x] BUILD_VERIFY（`pnpm test`，即 Closure Gates 预声明门禁）exit 0（结果记录入报告收口补记/log）

### Phase 4 - 收口与状态流转

Status: completed
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA1.5 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA1.5 `planned`→`done`，本 plan→`completed`
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap 流转），`fix(audit-r2):` 格式；标题不声称 `full-green verification`

Exit Criteria:

- [x] roadmap MA1.5 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 子代理 R1（44 turns，9+1 组声称对账）+ 独立 fresh-session 子代理 R2（16 turns，五修法核验 + live 抽验 + 回归抽查）
- Verdict: R1 `fail`（0B/1M/4m——Goals 预设 `nop-3d` marker 存在失实）→ M1+m1–m4 落实；R2 `pass`（0B/0M + 2 非阻断观察 m-new-1/m-new-2，执行中注明即可）→ 升级 `active`
- Rounds: 2
- Findings addressed: M1 marker 句改待证表述（scada 实存 + 3d/graph/map 现状取证，3d 裸 three-canvas 零 nop-\* 为 finding 候选）；m1 注册函数限定 RendererRegistry 入参；m2 P0 示例 marker→P1 限定；m3 补 module-boundaries 映射；m4 证据出处注记（零源码漂移 git 实证）

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（n/a 显式理由、双风格两段齐备、收口补记门禁节实数）
- [x] arm2-index 登记（MA1.5 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记（缓存回放口径注明）
- [x] 执行期间核对扫描器输出不高于 arm2-index M0 基线
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA1.5 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（verdict `approved` 0B/0M，8 任务组直接观测全过，含扫描器盲区复跑实证）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（P1-MA1.5-001 与 P2×2/P3×1 按 Non-Goals 属 MR 批量修复面，已在 arm2-index/报告 Deferred 区排账）

## Closure

Status Note: MA1.5 全部 Phase 交付完成——报告双风格落盘、arm2-index 登记（MA1.5 行 + P1-MA1.5-001）、daily log、BUILD_VERIFY 与四门禁实测、零代码变更纪律经审计核验；closure audit verdict `approved`（0B/0M + 3 非阻断观察）。roadmap MA1.5 已流转 `done`。P0=0、P1=1（3d 根 marker 缺失——Rule 2 明文，含扫描器盲区佐证）、P2=2（2 运行时环 + 扫描器豁免缺陷）、P3=1（knip C5 249 行过滤口径）、systemic 候选 3 条只记录不落地。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，27 turns，8 任务组直接观测：P1-001 逐行开档含扫描器盲区复跑实证 exit 0、11 环双向值边亲验、knip C5 复算 1/1/17/109/121、双注册面零重叠/hostContract 分类亲证、arm2-index diff 逐字节、git status 恰 5 文件）
- Evidence: Verdict `approved`（0 Blocker + 0 Major + 3 非阻断观察）；授权覆盖状态流转与收口提交（不声称 full-green）；观察 1（Phase 4 Status）由 completed 流转消解，观察 2/3 为美观与措辞速记不构成失实

Follow-up:

- no remaining plan-owned work
