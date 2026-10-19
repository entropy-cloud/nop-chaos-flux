# 662 审计修复 R2·MA1.9：platform + print + xlang 导出面与 CSS exports 审计

> Plan Status: completed
> Last Reviewed: 2026-10-19
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA1.9；`missions/audit-remediation-r2.json`；方法论 `deep-audit-prompts.md`（附录 A）+ `flux-component-design-review-prompt.md` + `architecture-deepening-review-prompt.md`
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA1 节（MA1 收官项）、`docs/audits/arm2-index.md`、MA1.1–MA1.8 plan 654–661（复用口径：逐边法/knip 路径段/BEM 清点/分桶 suspect 口径/marker 盲区/MA1.7 教训——不预载 finding）、owner doc `frontend-baseline.md` + `renderer-markers-and-selectors.md`

## Purpose

对 C10 platform（ui/theme-tokens/tailwind-preset/flux-i18n/flux-code-editor/nop-debugger）+ C11 print（flux-print-core/renderers）+ C12 xlang（flux-xlang-lang/debug）共 10 包（189 src/140 test）执行结构与契约层审计（matrix MA1.9：**导出面与 CSS exports**，**额外核 `check:package-css-exports` 与 ui 导出面分类**）。产出 arm2 报告并登记 arm2-index——**MA1 结构层收官项**。零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-19 live 实测，HEAD `6c508a0ae`，工作树含并发线未提交文件——mobile×4 + platform-hardening roadmap×1，本项产物与提交不含之）

- **规模**（M0 口径）：ui 84/72、theme-tokens 1/2、tailwind-preset 1/1、flux-i18n 6/2、flux-code-editor 26/17、nop-debugger 28/21、print-core 10/9、print-renderers 11/8、xlang-lang 4/2、xlang-debug 18/6——合计 **189/140**（=roadmap C10 146/115 + C11 21/17 + C12 22/8）。
- **`audit:deps` 现状**：全仓 57 全 no-circular；**C10–C12 命中 4 条**（xlang-debug/assembly/renderer.ts、flux-print-renderers/index.ts ×2、flux-code-editor/shared/editor-compartments.ts）。=M0。
- **ui 导出面**：`packages/ui/src/index.ts` 83 行 / **69 条 export 语句**（Button/Input/… shadcn 面——执行时按 AGENTS 组件清单分类核对：组件/工具 cn/复合组件三类）。
- **样式契约面**：styling-suspects C10–C12 = **0**；`check:package-css-exports` 脚本实存（roadmap 点名——执行复跑）。
- **knip（路径段过滤）**：unlisted **0** / exports **7** / types **18**（`_tmp/ma12-knip.out` 粗计，执行复跑定稿）。
- **相关扫描器 M0 基线**（执行复跑）：definition-fields PASS、missing-markers 0（盲区照录）、hardcoded-dispatch 0、`check:package-css-exports`（执行首轮记录）。
- **执行状态**：roadmap MA1.9 当前 `todo`；无 `arm2-MA1.9-*` 报告；完成后 MA1 九项全部离开 todo/planned。

## Goals

- 产出 `docs/audits/YYYY-MM-DD-HHmm-arm2-MA1.9-platform-print-xlang-structure.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA1.9-<nnn>`）。
- 覆盖面（matrix MA1.9 + roadmap 点名项）：① 依赖图（4 环逐边定性；ui 作为底座包的被依赖面）；② **导出面**（**ui 69 条导出分类核对**〔shadcn 组件清单 vs cn 工具 vs 复合件——对照 AGENTS.md MANDATORY 组件清单〕+ 其余 9 包入口 + knip 25 行过滤）；③ **CSS exports**（**`check:package-css-exports` 复跑** + 各包 style.css 导出面 vs package.json exports map 对照——MA1.4/MA1.5 styles.css subpath 谱系收拢）；④ 样式契约（styling 0 复核 + BEM 清点 + markers 对照）；⑤ 深化机会。
- 产出即登记 `docs/audits/arm2-index.md`（MA1.9 行 + P1 行如有）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；命中只定级登记（修复归 MR）。不排 MR/R\*.n；不改写历史文档；不预载 MA1.1–MA1.8 finding。
- ui 组件行为/主题化行为归 MA6.4（经宿主面）；调试面走查归 MA5.1；xlang 行为归 MA5.1 调试面——本项只做结构/导出/CSS 契约面。
- 不执行 MA2.1 及以后工作项（MA1 收官后由 MR1.0 依赖 MA1+MA2 等待）。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA1.9 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：`audit:deps`、`audit:knip`（路径段过滤）、**`check:package-css-exports`**、`check:audit-styling-suspects`（C10–12 过滤）、`check:audit-missing-renderer-markers`/`renderer-definition-fields-only`、ui index.ts 导出分类、10 包入口与 CSS exports map、owner doc `frontend-baseline.md` 对照、git churn、deep-import 二分复扫。
- `docs/logs/` 当日 log 追加 MA1.9 条目（**hunk 级 staging：log 未提交部分 = MA1.9 entry + mobile entry——仅 stage MA1.9**）；roadmap MA1.9 行状态流转（**MA1 组收官**）。
- 收口提交：`fix(audit-r2):` 格式。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）；定级命中修复；MA2.1+ / MR / MV / MG；并发线未提交变更（mobile×4 + platform-hardening-roadmap×1 + log mobile entry——一律排除出提交范围并记录）。

## Failure Paths

| 可测场景编号   | 触发                                                                                                                                                                                              | 行为                                                                                                 | 是否可重试 | 用户可见表现   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 全六类适用（本项高概率实例：ui 公共导出面破坏性变更未通知、CSS exports 缺失致宿主样式面断裂、公共打包边界破坏、运行时崩溃；marker/BEM 属 P1 仅升级为渲染断裂才入 P0；不限于所列） | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan，登记 arm2-index P0 区 | 否         | 无（修复先行） |
| scanner-drift  | 核对扫描器/`check:package-css-exports` 输出高于 arm2-index M0 基线或本轮基线                                                                                                                      | 停止收口，归因（应零变更），报告记录                                                                 | 是         | 无             |

预期均不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY，即 Closure Gates 预声明门禁）为 Proof 交付物。若触发 P0 追加 Fix Phase，该 Fix 自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 维度清单取证（依赖 / 导出面 / CSS exports / 样式契约）

Status: completed
Targets: 报告草稿、`_tmp/`

- Item Types: `Proof | Decision`

- [x] 依赖图：复跑/复核 `audit:deps` C10–12=4（=M0）逐边定性（逐边法；print-renderers/index ×2 环与 xlang assembly、code-editor compartments）；ui 底座被依赖面（全仓 `@nop-chaos/ui` 消费量级抽样）；deep-import 二分复扫（含 `@nop-chaos/flux-xlang-debug/definitions` 等已声明 subpath——MA1.2 已见）
- [x] **导出面**：**ui `src/index.ts` 69 条导出分类核对**（对照 `AGENTS.md` MANDATORY 组件清单——Button/Input/Select/Dialog/Table/Card/Badge/Spinner/ScrollArea/Separator/Toaster/Slider/Kbd/Field/ButtonGroup/Combobox/Sidebar/ResizablePanelGroup/Empty 等应全在；`cn` 工具；复合组件；**无越权导出/缺项**）；其余 9 包入口核对；knip 路径段过滤分段抽样（exports 7 + types 18 各抽 ≥3；unlisted 0 记录）
- [x] **CSS exports（roadmap 点名）**：**复跑 `check:package-css-exports`** 记录结果；各含样式包（ui/theme-tokens/tailwind-preset/flux-code-editor/print/xlang 等）`package.json` `exports`/`sideEffects`/style 入口与实际文件对照；MA1.4/MA1.5 已核 styles.css subpath 谱系在本项收拢登记（spreadsheet/content/layout/mobile 等 styles.css 属他项——只登记平台侧聚合面）
- [x] 样式契约：styling C10–12=0 复核；BEM 清点（`nop-` 前缀 `--`/`__` 全量）；missing-markers 复跑 0（盲区照录——C10 platform 非 renderer 发射面为主，n/a 部分写理由）；`renderer-definition-fields-only` 复跑 PASS
- [x] 深化机会：发现即记 systemic 候选

Exit Criteria:

- [x] 四个取证维度各产出带证据条目（n/a 写理由）；4 环、ui 69 分类、CSS exports 复跑、knip 抽样全部完成 归族 + P 级判定（P0 触发 Failure Path）
- [x] ui 导出面有逐类清单结论（组件全集 vs AGENTS 清单差集 = 0 或列出）；`check:package-css-exports` 有实测结果行

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：churn 热点（10 包 top-5）逐个问、knip 全量分段、已知失败模式 #4/#9/#5（@source——platform 是 tailwind-preset 所在，核 playground @source 谱系）、MA1.2/MA1.5 交叉引用（bundle CSS re-export、marker 盲区）本轮重新取证
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：ui 缺项/越权导出、CSS exports 谱系漏包（谁有 style.css 却没进 exports map）、xlang-debug `/definitions` subpath 边界、code-editor/debugger 深依赖
- [x] 深化机会与 MA6.4/MA5.1 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/YYYY-MM-DD-HHmm-arm2-MA1.9-platform-print-xlang-structure.md`、`docs/audits/arm2-index.md`、`docs/logs/`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式落盘（含收口补记门禁节 + 复核统计行 + 分母口径注明——MA1.8 教训），文件名含时间戳
- [x] arm2-index：MA1.9 行回填；P1（如有）入索引区（ID `P1-MA1.9-<nnn>`）；**MA1 收官注记**（九项状态一览写入 arm2-index 备注行）
- [x] daily log 追加 MA1.9 条目（路径 + 发现计数 + 门禁 + 缓存回放 + **误报计数=报告清单实数**——教训条款）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`）并登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致
- [x] BUILD_VERIFY（`pnpm test`，即 Closure Gates 预声明门禁）exit 0（结果记录入报告收口补记/log）

### Phase 4 - 收口与状态流转（MA1 组收官）

Status: completed
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA1.9 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA1.9 `planned`→`done`，本 plan→`completed`——**MA1 组 9/9 收官**
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap 流转；log hunk 拆分仅 stage MA1.9 entry，排除 platform-hardening/mobile 两 entry 与全部并发文件），`fix(audit-r2):` 格式；标题不声称 `full-green verification`

Exit Criteria:

- [x] roadmap MA1.9 与 plan 状态流转一致；MA1 九行全 `done`（live 复核）
- [x] `git status` 复核提交仅含 In Scope 文件（并发线文件除外且未被触碰）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 子代理（20 turns，6 组声称对账全✅ + 附加引用核验）
- Verdict: `pass`（0 Blocker + 0 Major + 2 非阻断 Minor〔m1 并发计数表述可操作即可、m2 knip unused-devDeps×1〔jsdom@print-renderers〕执行期补记〕）→ 升级 `active`
- Rounds: 1
- Findings addressed: 无 B/M；m2 在 Phase 2 knip 全量分段时补记 unused-devDeps 段（执行项已含全量分段）

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（n/a 显式理由、双风格两段齐备、收口补记门禁节实数）
- [x] arm2-index 登记（MA1.9 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记（缓存回放口径注明）
- [x] 执行期间核对扫描器/`check:package-css-exports` 输出不高于 arm2-index M0 基线或本轮基线
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA1.9 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（verdict `approved` 8 任务组全量核验 + 4 非阻断观察 O1–O4，O3/O4 已同 commit 回写）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（P2-MA1.9-001 与 P3×1 按 Non-Goals 属 MR 批量修复面，已在 arm2-index/报告 Deferred 区排账）

## Closure

Status Note: MA1.9 全部 Phase 交付完成——报告双风格落盘、arm2-index 登记（MA1.9 行 + MA1 收官注记，P1=0）、daily log、BUILD_VERIFY 与四门禁实测（含 roadmap 点名 `check:package-css-exports` exit 0）、零代码变更纪律经审计核验；closure audit verdict `approved`（8 任务组全量核验 + 4 非阻断观察）。roadmap MA1.9 已流转 `done`——**MA1 结构层九项全部收官**。P0=0、P1=0（ui 48 组件差集=0/CSS exports 全绿/BEM=0）、P2=1（print-renderers 运行时 barrel 环）、P3=1（knip 0/7/18+jsdom devDep）、systemic 候选 3 条只记录不落地。P1 存量 4 条 open（MA1.1/1.2/1.5/1.7）待 MR。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，27 turns，8 任务组直接观测：print barrel 环值导入亲验、knip 0/7/18 独立复算+jsdom devDep 定位、css-exports 复跑 25 subpaths、ui 5 组件可达抽验、churn 51/51/8/7/7 复算、门禁四实数、arm2-index MA1 收官注记、git 边界 5+5 文件）
- Evidence: Verdict `approved`（0 Blocker + 0 Major + 4 非阻断观察 O1–O4）；O2（收官注记与 roadmap 同提交翻转）由本收口落地、O3（log 流程行）/O4（Phase 4/Closure 节）已同 commit 回写；授权覆盖状态流转、MA1 九项收官确认与收口提交（仅 stage MA1.9 log hunk，不声称 full-green）

Follow-up:

- no remaining plan-owned work
