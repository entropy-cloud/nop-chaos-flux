# 666 审计修复 R2·MA2.4：designer+office+platform+print+xlang 状态机与序列化边界审计

> Plan Status: completed
> Last Reviewed: 2026-10-20
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA2.4；`missions/audit-remediation-r2.json`；方法论 `docs/skills/deep-audit-prompts.md`（§B 维度 04/06/07 + §F 维度 19 + 附录 A）
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA2 节、`docs/audits/arm2-index.md`、MA2.1（xlang×2 reactive 路由——本轮收口；reactive 勘正基线 21 口径参照）、MA2.2/MA2.3（non-retained/IO 治理家族——检测启发）、owner doc `renderer-runtime.md`（Renderer Component Contract / Event Passthrough）+ `docs/components/page-designer/design-architecture.md` §6（xui:sid round-trip 不变式）

## Purpose

对 C8 designer 族（flow-designer-core/flow-designer-renderers/editor-core/page-designer-core/page-designer-renderers）+ C9 office 族（spreadsheet-core/spreadsheet-renderers/word-editor-core/word-editor-renderers/report-designer-core/report-designer-renderers）+ C10 platform（ui/theme-tokens/tailwind-preset/flux-i18n/flux-code-editor/nop-debugger）+ C11 print（flux-print-core/flux-print-renderers）+ C12 xlang（flux-xlang-lang/flux-xlang-debug），共 19 包执行运行时正确性审计（matrix MA2.4：**状态机 + 序列化边界**，额外核 undo/redo 状态机与序列化往返）。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-20 live 实测，HEAD `bc8090516`，工作树含并发线未提交文件——mobile/platform-hardening/index.md/10-19 log 非本 entry——本项产物与提交不含之）

- **六零面扫描器（=M0）**：raw-schema-reads 0 / fieldframe-bypasses 0 / hardcoded-dispatch 0 / event-dispatch-ctx 0 / browser-io 0 / ai-engine-invariants 0。
- **async-failure-paths = 337**（=M0 零漂移）；MA2.4 目标包命中 **78**：C8=19（flow-designer-core 4/flow-designer-renderers 5/editor-core 3/page-designer-renderers 7）+ C9=22（spreadsheet-core 2/spreadsheet-renderers 4/word-editor-core 4/word-editor-renderers 6/report-designer-core 2/report-designer-renderers 4）+ C10=20（ui 5/flux-code-editor 4/nop-debugger 11）+ C11=6（flux-print-core 6）+ C12=11（flux-xlang-debug 11）。
- **reactive-render-reads = 21**（=勘正基线零漂移）；MA2.4 目标包命中 **2**（xlang-debug control-buttons.tsx:37/:43——MA2.1 P2 路由收口对象）。
- **non-retained**：MA2.4 目标包命中 **0**（全净）。
- **undo/redo 实现面**（live 定位）：editor-core（UndoCommandStack + history-rebuild 共享 helper `popAndRebuildOppositeEntry`，drift-rebuild 语义在案注释 plan 598 G3）、flow-designer-core/core/history.ts（快照栈 clone+index+截断）、page-designer-core（commands/command-serialization/session）、spreadsheet-core/command-handlers/history-handlers.ts + report-designer-core/core-dispatch.ts（两 host 均经共享 helper）、word-editor（editor-store/canvas-editor-bridge）。测试覆盖：cx18-undo-redo-shape-pin ×2（spreadsheet/report）、editor-core-adapter.test ×2（spreadsheet/report——industrial 同名件非 MA2.4 包）、editor-core.test、new-commands-undo-edge。
- **序列化往返面**：page-designer-core/round-trip.ts（xui:sid inject/strip，INV-A..F 六不变式 + fuzz 字节相等断言）、word-editor-core/document-io.ts（结构化 recovery 错误分类 reportRecoveryLoadError）、editor-core.ts（validate→serialize→commit 管道 + structuredClone 双态隔离）、print-core/bind.ts（syntaxError/evalError/missingPaths 结构化分类 + cellErrors 累积）、report/spreadsheet editor-core-adapter.ts。
- **INV-1 正控**：xlang-debug debug-client 经注入 `env.openSocket`（:47/:470，capability check + plan 621 审计 B4/M3 在案）；print-core barcode/qrcode SVG 生成带属性消毒（barcode.ts:42 "review D15-01：前景色仅保留 CSS 颜色字符，阻断 fill 属性逃逸"）+ catch→'' 降级。
- **MA2.3 family 交叉信号**：flux-code-editor/variable-panel.tsx:41 navigator.clipboard 直调——已登记于 P2-MA2.3-001（4 位点 family），本项不重复立案，仅消费面登记。
- **churn（近 1 个月窗口实测）**：top-5 = flow-designer-renderers(135)/ui(129)/flux-i18n(105)/page-designer-renderers(95)/flux-xlang-debug(61)；抽检近因提交均携 plan 号（FM-7/FM-6/FM-0 等），无裸改热点。
- **执行状态**：roadmap MA2.4 当前 `todo`；无 `arm2-MA2.4-*` 报告。

## Goals

- 产出 `docs/audits/2026-10-20-HHmm-arm2-MA2.4-designer-office-platform-print-xlang-runtime.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA2.4-<nnn>`）。
- 覆盖面（matrix MA2.4 + §B 04/06/07 + §F 19）：① **undo/redo 状态机**（editor-core UndoCommandStack 语义 + 两 host 接线〔spreadsheet history-handlers/report core-dispatch〕+ flow 快照栈 + page-designer commands；双约定并存〔drift-rebuild vs 同 entry 原样移入〕文档化核验 + cx18 shape-pin 测试有效性）；② **序列化往返**（page-designer xui:sid INV-A..F 实质核验、word-editor document-io 往返、print bind 求值边界、report/spreadsheet adapter serialize 管道）；③ **异步取消安全**（78 条分层抽样：xlang-debug 11 + nop-debugger 11 + word-editor 10 + ui/flow/print 代表点 + 定时器/全局监听清理扫描）；④ **IO 边界**（WS 调试链 env.openSocket 正控核验 + 剪贴板 family 消费 + browser-io 盲区 camera 族复扫）；⑤ **reactive xlang×2 收口**（MA2.1 路由）；⑥ 深化机会。
- 产出即登记 `docs/audits/arm2-index.md`（MA2.4 行 + P1 行如有）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；命中只定级登记（修复归 MR）。不排 MR/R\*.n；不改写历史文档；不预载 MA1.7/1.8/1.9/MA2.1/2.2/2.3 finding（同族信号仅作检测启发）。
- clipboard family 的实际修复与裁决方向归 P2-MA2.3-001 已登记的 MR 批；reactive 深裁归 MA7.1；designer 交互行为归 MA5.1/5.3；测试质量归 MA4.4。
- 不执行 MR1.0 及以后工作项（MA2 本项为运行时层最后一项）。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA2.4 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：六零扫描器复跑、async 78 条分层抽样（每簇代表点 ≥2）、undo/redo 四实现面语义核验、序列化往返五面核验、IO 边界（openSocket/clipboard/camera 复扫）、xlang×2 裁定、git churn top-5、owner doc 契约对照。
- `docs/logs/2026/10-20.md` 追加 MA2.4 条目（当日文件已由 MA2.3 新建，本项追加独立 hunk，无并发冲突）；roadmap MA2.4 行状态流转。
- 收口提交：`fix(audit-r2):` 格式。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）；定级命中修复；MR1.0+ / MV / MG；并发线未提交变更（一律排除）。

## Failure Paths

| 可测场景编号   | 触发                                                                                                                                                                 | 行为                                                                                                 | 是否可重试 | 用户可见表现   |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 全六类适用（本项高概率实例：undo/redo 数据损坏、序列化往返丢键致用户文档损坏、运行时崩溃；示例须可归入六类之一，否则按 P1/报告登记，不得走 P0 通道） | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan，登记 arm2-index P0 区 | 否         | 无（修复先行） |
| scanner-drift  | 六零扫描器复跑 >0 或 async ≠337 / reactive ≠21 / non-retained 代码面漂移（本报告落盘后自扫 +N 属预期伪影需注记）                                                     | 停止收口，归因（应零代码变更），报告记录                                                             | 是         | 无             |

预期不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY，即 Closure Gates 预声明门禁）为 Proof 交付物。若触发 P0 追加 Fix Phase，该 Fix 自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 维度清单取证（undo/redo / 序列化往返 / 异步 / IO 边界）

Status: completed
Targets: 报告草稿、`_tmp/`

- Item Types: `Proof | Decision`

- [x] **undo/redo 状态机**：editor-core UndoCommandStack + history-rebuild 语义核验（drift-rebuild 注释与实现一致性）；两 host 接线抽样（spreadsheet history-handlers + report core-dispatch:296-320 经共享 helper）；flow 快照栈（history.ts 纯函数性 + maxHistorySize 截断）；page-designer commands 结构共享键序；**双约定并存风险登记**（drift-rebuild vs 同 entry 原样移入——文档化现状核验 + 新 host 误接线风险定级）；cx18 shape-pin 测试有效性抽验
- [x] **序列化往返**：page-designer xui:sid INV-A..F 实质核验（stripSessionIds/injectSessionIds 实现与不变式逐条对照 + fuzz 测试存在性）；word-editor document-io 往返与 recovery 分类；editor-core validate→serialize→commit 管道；print bind 求值边界（错误分类 + 单元格错误累积）；report/spreadsheet editor-core-adapter serialize 抽样
- [x] **异步取消安全**：async 78 条分层抽样——每簇代表点 ≥2（C8 flow/editor-core/page-designer；C9 word-editor document-io/save/outline + spreadsheet/report；C10 nop-debugger controller 族 + ui drawer/drag/code-editor；C11 print barcode/bind；C12 xlang-debug debug-client 全读 9 位点（high 2 :367/:500 + medium 7 :190/:406/:418/:471/:517/:586/:604）+ eval-input/assembly）；定时器/全局监听清理扫描（heartbeat/reconnect timer 配对在案核验）
- [x] **IO 边界**：xlang-debug env.openSocket 注入链核验（正控）；browser-io 盲区 camera 族复扫（MA2.4 包域）；clipboard family 消费登记（code-editor:41——P2-MA2.3-001 交叉）；print SVG 属性消毒正控核验
- [x] **reactive xlang×2 收口**：control-buttons.tsx:37/:43 调用语境核验（btn onClick 处理器内读取 vs render 期）
- [x] 深化机会：发现即记 systemic 候选

Exit Criteria:

- [x] undo/redo 四实现面语义核验结论 + 双约定并存风险定级落字
- [x] 序列化往返五面核验行（INV 对照 + 测试存在性）落字
- [x] async 抽样裁定表（每簇 ≥2 代表点判定）+ IO 边界三面（openSocket/clipboard/camera）结果落字

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：MA2.4 包 churn top-5（近 1 个月窗口实测：flow-designer-renderers 135 / ui 129 / flux-i18n 105 / page-designer-renderers 95 / xlang-debug 61）、已知失败模式 #7/#9、MA1.7/1.8/1.9 交叉引用点（重新取证）
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：undo/redo 在事务/异步 commit 交叉处的漂移、序列化往返的大文档边界、debugger 长会话 WS 断连恢复
- [x] 深化机会与 MA5.1/5.3/MA7.1 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/2026-10-20-HHmm-arm2-MA2.4-designer-office-platform-print-xlang-runtime.md`、`docs/audits/arm2-index.md`、`docs/logs/2026/10-20.md`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式落盘（收口补记门禁节 + 复核统计 + 分母口径 + 自扫伪影注记），文件名含时间戳
- [x] arm2-index：MA2.4 行回填；P1（如有）入索引区
- [x] daily log `docs/logs/2026/10-20.md` 追加 MA2.4 条目（计数=报告实数）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`）并登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致
- [x] BUILD_VERIFY（`pnpm test`）exit 0（记录入报告收口补记/log）

### Phase 4 - 收口与状态流转

Status: in progress
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA2.4 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA2.4 `planned`→`done`，本 plan→`completed`——MA2 运行时层四项收官
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap），`fix(audit-r2):` 格式；标题不声称 `full-green verification`（typecheck/build 既有 playground 登记红）

Exit Criteria:

- [x] roadmap MA2.4 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件（并发线除外且未触碰）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 审查子代理（五项检查 + 扫描器实跑复现 + 锚点逐条亲核）
- Verdict: R1 `revised`（0B/2M/1m）→ 回修 → R2 字符级复核 `pass`（0B/0M/0m）
- Rounds: 2
- Findings addressed: M1 barcode.ts :38→**:42**（D15-01 消毒注释实际行）；M2 Phase 1 C12 抽样 "debug-client 全读 7 位点"→**9 位点**（high 2 :367/:500 + medium 7 :190/:406/:418/:471/:517/:586/:604，9+1+1=11 与 Baseline 对齐）；m1 editor-core-adapter.test ×2 补归属括注（spreadsheet/report——industrial 同名件非 MA2.4 包）

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（n/a 显式理由、双风格两段齐备、收口补记门禁节实数）
- [x] arm2-index 登记（MA2.4 行，P1=0）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记（82/82 任务）
- [x] 执行期间核对六零扫描器输出不高于 M0（全 0）；async=337 / reactive=21 / non-retained MA2.4 包=0 对照
- [x] 不存在被静默降级的 in-scope 项（P2×1 + P3×2 入报告 deferred 区附定级理由——P3-MA2.4-002 为 closure audit M1 立案的 nop-debugger localStorage 同族）
- [x] roadmap Work Item Status MA2.4 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（首轮 `issues` 0B/1M/2m〔M1 nop-debugger localStorage 排除项事实错误〕→ 回修 → 聚焦复核 `approved` + 预授权机械修订随收口落盘）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（MG 候选：browser-io 扫描器包域正则补六族 + camera 族规则、undo host 接线 checklist〔P3-001〕、word-editor storage 注入点或 §9 豁免条目〔P2-001，nop-debugger UI 偏好持久化 P3-002 并案〕——均已在报告"建议新增的自动化检查"与 deferred 区排账）

## Closure

Status Note: MA2.4 全部 Phase 交付完成——报告双风格落盘（multi 五维度 + open 三轮）、arm2-index 登记（MA2.4 行，P1=0）、daily log MA2.4 条目 + MA2 收官段、BUILD_VERIFY 与四门禁实测（test 82/82、lint 44/44、typecheck/build 既有登记红零新增）、零代码变更纪律经独立实测核验。closure audit 首轮 `issues`（0B/1M/2m——M1 误报排除 #3 事实错误：nop-debugger descriptor 返回值被 readPersisted/writePersisted 真实消费属真实 localStorage 读写）→ 回修（误报排除勘正 + 新立 P3-MA2.4-002 + 全联动计数）→ 聚焦复核 `approved`（附预授权机械修订：证据索引锚区 :226-241/:264/:281 + :254/:247-253 行号校准，随本收口 commit 落盘）。P0=0、P1=0、P2=1（word-editor localStorage 默认通道绕过 §9 B 档 + browser-io 扫描器域正则漏六族）、P3=2（undo 双约定接线风险、nop-debugger localStorage 同族）；MA2.1 路由 xlang×2 收口——**MA2 运行时层四项收官**。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，两轮：首轮 27 组对账全 PASS 唯 M1 误报排除 #3 事实不成立〔A1-A4/B1-B5/C1-C2/D1/E1/F1-G2/H1/I1-I4/J1-J4/K1-K2/L1-L3/M1 逐格实测〕→ 回修 → 聚焦复核 10 项全 PASS + git 实证 [WA-debugger-008] 缓解非回修插入〔HEAD 07cf78dd2 plan 575 在案〕）
- Evidence: 聚焦复核结论「修订足迹未越界……roadmap MA2.4 仍为 planned 未抢跑」+ 终局 `approved`（条件一条：报告 :138 索引锚区同步——已随收口落盘）

Follow-up:

- no remaining plan-owned work
