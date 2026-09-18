# 470 视觉质量 V0：基线与视觉回归守护基建 Plan

> Plan Status: completed
> Last Reviewed: 2026-09-19
> Source: `docs/analysis/visual-quality/V0-visual-regression-infra.md`（已独立核实，零 Blocker/Major）、`docs/backlog/visual-quality-roadmap.md` V0、`docs/analysis/2026-09-15-visual-quality-deep-survey.md` §8
> Related: 无（本路线图首个 plan）

## Purpose

把路线图 V0 work item 收口到"后续 V1–V12c 可直接消费"的状态：①证据卡目录与模板定稿（14 张种子卡）；②程序化视觉断言工具链（helper + smoke spec Proof）；③一致性豁免基线快照（413/121/32）固化为 V12 对照起点；④AI/3D/设计器 e2e 视觉断言缺口清单（已随研究报告 §2 交付，本 plan 建卡索引引用）。V0 不做任何产品代码修改。

## Current Baseline

- master @ 6fec8497e full-green（unit 74/74 tasks、e2e 1472 passed / 0 failed / 43 skipped）。
- `tests/e2e/helpers/` 现有 2 个 helper（`measure-perf.ts`、`scada-canvas-assert.ts`），scada 先例已验证"硬门禁 + 程序化像素探测"分层可行。
- 视觉断言覆盖≈0：19 个 AI spec 仅 2 文件 6 处计算样式调用；3D/flow/report/spreadsheet/print/word/debugger/editor 零或零散（明细见研究报告 §2 缺口清单）。
- `node scripts/audit/find-ui-consistency-gaps.mjs` live 输出 `Exempt baseline: 413 instance(s) across 121 file(s), covered by 32 registered exemption entr(ies)`（2026-09-19 复核）；脚本输出为人读文本，无机器可读通道。
- **live 勘误**：AGENTS.md 记载 `tests/e2e/__snapshots__/` "stays in .gitignore"，但 live `.gitignore` 无该条目（独立核实 M1）。
- `scripts/__tests__/find-ui-consistency-gaps.test.ts` 已存在（stagedDirs governance 模式），可承载 `--json` focused 测试。

## Goals

- `docs/audits/visual-quality/` 目录成立：README（证据卡模板 + 14 卡索引）+ 14 张种子卡 + `exemption-baseline-v0.json`。
- `tests/e2e/helpers/visual-assert.ts` + `tests/e2e/helpers/canvas-pixel-probe.ts` 落地，并有 smoke spec（`tests/e2e/visual-assert-helpers.spec.ts`）作为工具链可用性的自动化 Proof。
- 门禁脚本支持 `--json` 机器可读输出；豁免基线快照落盘入库（文本数据资产，非视觉快照）。
- `.gitignore` 补 `tests/e2e/__snapshots__/`，使 AGENTS.md 记载的基线落点成为真实受控通道。

## Non-Goals

- 不改 `packages/**` 任何产品代码（含样式）——那是 V1–V12c 各域 work item 的事。
- 不引入 `toHaveScreenshot()`/像素 diff 门禁，不改 playwright.config.ts snapshot 配置（研究报告裁决 A1）。
- 不重构既有 `scada-canvas-assert.ts` / `measure-perf.ts`，不动任何既有 scada/AI spec。
- 证据卡不做新 findings 判定——种子卡只转录已三轮核实的普查 findings，裁决列留 pending 由各域研究报告填。

## Scope

### In Scope

- `scripts/audit/find-ui-consistency-gaps.mjs`：新增 `--json` 输出旗标（不改扫描逻辑/豁免数据/exit code 语义）。
- `scripts/__tests__/find-ui-consistency-gaps.test.ts`：补 `--json` focused 测试（test-first）。
- `tests/e2e/helpers/visual-assert.ts`、`tests/e2e/helpers/canvas-pixel-probe.ts`：新 helper。
- `tests/e2e/visual-assert-helpers.spec.ts`：smoke spec。
- `docs/audits/visual-quality/`：README + 14 张种子卡 + `exemption-baseline-v0.json`。
- `.gitignore`：补 `tests/e2e/__snapshots__/` 一行。

### Out Of Scope

- 任何 `packages/**` 变更。
- 各域 findings 的修复（V1–V12c）。
- V12 的豁免收敛动作（本 plan 只固化起点，不动豁免）。
- `_tmp/baselines/` 像素 diff 通道的任何实现（保留为 ad-hoc 手工通道）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**——本 plan 的交付物本身就是测试基建，其可用性必须以自动化 Proof 收口：`--json` 有 focused 脚本测试（先红后绿），视觉工具有 smoke spec（先红后绿：helper 未实现时 import/断言失败）。Proof 项在 Execution Plan 中先于实现项。

## Execution Plan

### Phase 1 - 豁免基线快照（--json 旗标 + 快照落盘）

Status: completed
Targets: `scripts/audit/find-ui-consistency-gaps.mjs`、`scripts/__tests__/find-ui-consistency-gaps.test.ts`、`docs/audits/visual-quality/exemption-baseline-v0.json`

- Item Types: `Proof | Fix`

- [x] Proof：在 `scripts/__tests__/find-ui-consistency-gaps.test.ts` 补 `--json` focused 测试（临时 scan root fixture 下断言 stdout 为合法 JSON 且含 `totals.instances/files/entries`、`byRule`、`byFile` 键；实现前运行确认失败）
- [x] Fix：`find-ui-consistency-gaps.mjs` 增加 `--json` 旗标：输出机器可读 JSON（`snapshot`、`generatedFrom`、`totals{instances,files,entries}`、`byRule`、`byFile[]`），`byFile` 按 `file+rule` 排序、`byRule` 按键名排序（保证可 diff 资产的确定性），不改动扫描逻辑、豁免数据与人读输出/exit code；无时间戳字段
- [x] Fix：运行 `node scripts/audit/find-ui-consistency-gaps.mjs --json > docs/audits/visual-quality/exemption-baseline-v0.json` 生成基线快照；复核 totals = 413/121/32 与人读输出一致

Exit Criteria:

- [x] `pnpm test:scripts` 中 `--json` focused 测试通过（先红后绿：2026-09-19 先 2 failed/17 passed，实现后 19/19；次序记录于 `docs/logs/2026/09-19.md`）
- [x] `docs/audits/visual-quality/exemption-baseline-v0.json` 存在，totals=413/121/32 与 live 复核一致；含 `generatedFrom` 复现命令字段、无时间戳；两次运行字节级 diff 为空。执行说明：`totals.files` 采用与人读输出同口径的唯一 (rule,file) 对数（121），已在脚本注释与 `docs/audits/visual-quality/README.md` 写明
- [x] 人读输出与 exit code 语义不变（无 --json 时输出逐字节不变，`pnpm check` 全链 exit 0；--json 下 newHits>0 仍 exit 1）

### Phase 2 - 视觉断言 helper 工具链 + smoke spec

Status: completed
Targets: `tests/e2e/helpers/visual-assert.ts`、`tests/e2e/helpers/canvas-pixel-probe.ts`、`tests/e2e/visual-assert-helpers.spec.ts`

- Item Types: `Proof | Fix`

- [x] Proof：先写 `tests/e2e/visual-assert-helpers.spec.ts`（对 helper 不存在/语义未实现的状态运行为红）：①`#/flux-basic` 页 `expectCssVarResolves('--background')` 非空且 `getComputedStyleValue('background-color')` 非 transparent；②注入程序化 2d canvas（涂色矩形）断言 `probeCanvasPixels` 返回 `non-zero-pixels`；③注入 webgl canvas（clearColor + 渲染帧后采样）断言 `non-zero-pixels`；④空白 canvas 断言 `all-zero` 且 `expectCanvasPainted` 走失败路径；⑤`captureVisualEvidence` 落盘路径存在
- [x] Fix：实现 `visual-assert.ts`（`getComputedStyleValue`/`expectComputedStyle`/`expectCssVarResolves`/`expectComputedStyleNot`/`captureVisualEvidence`，签名同研究报告 §1-A2）
- [x] Fix：实现 `canvas-pixel-probe.ts`（`probeCanvasPixels`/`expectCanvasPainted`：2d getImageData 分块采样；webgl 同任务渲染帧后 readPixels，preserveDrawingBuffer=false 静默全零语义由调用方裁决；SecurityError → `security-error` 分类）
- [x] Fix：实现 smoke spec 全部断言通过；截图仅写 `tests/e2e/artifacts/`（gitignored），无任何基线入库。执行修正：断言②目标从 `.nop-page`（透明结构层）改为 html 的 background-image 含 gradient + 按钮元素字面色断言（draft review Minor 2 预判命中）

Exit Criteria:

- [x] `npx playwright test tests/e2e/visual-assert-helpers.spec.ts` 全绿（先红：helper 未实现 module-not-found；后绿：5/5 两次复跑通过；次序记录于 `docs/logs/2026/09-19.md`）
- [x] helper 仅依赖 `@playwright/test` 公共 API 与 Node 内建，无 `packages/**` 导入；两文件各约 120 行，远低于 `check:oversized-code-files` 限（WARN 500/ERROR 700）
- [x] `git status` 确认 Phase 1–2 无 `packages/**` 变更、无 `tests/e2e/artifacts/**` 被跟踪

### Phase 3 - 证据卡目录、14 张种子卡与 .gitignore 治理

Status: completed
Targets: `docs/audits/visual-quality/README.md`、`docs/audits/visual-quality/{ai,threejs,industrial-scada,flow-designer,spreadsheet,report-designer,print,word,debugger-code-editor,rich-text-markdown,scheduling,dashboard-map-graph,cross-cutting-theme,consistency-debt}.md`、`.gitignore`

- Item Types: `Fix`

- [x] Fix：`README.md` 落研究报告 §1-A4 模板定稿 + 14 卡索引（卡 ↔ work item ↔ 普查章节对照表）+ 豁免基线快照说明（含 V12 对照协议）
- [x] Fix：按 A4 枚举清单落 14 张种子卡：findings 逐条转录普查报告对应章节（带 `文件:行` 证据），状态 `seeded`、裁决列 `pending`；kanban 拖拽悬停高亮按勘误口径登记（链路已接通，仅留实际视觉/dark 表现核对，不登记为 confirmed defect）
- [x] Fix：`.gitignore` 补 `tests/e2e/__snapshots__/`；`git check-ignore tests/e2e/__snapshots__/x.png` 验证命中（exit 0）

Exit Criteria:

- [x] `docs/audits/visual-quality/` 含 README + 14 卡 + `exemption-baseline-v0.json`，卡文件名/数量与 A4 枚举一一对应
- [x] 种子卡 findings 均可回溯到普查报告章节（kanban 按 Round 2/3 勘误口径登记为"链路已接通，仅核对实际视觉/dark 表现"）
- [x] `git check-ignore tests/e2e/__snapshots__/x.png` exit 0

## Draft Review Record

- Reviewer / Agent: 独立 plan review 审查员（fresh sub-agent session，2026-09-19）
- Verdict: `pass-with-minors`（0 Blocker / 0 Major / 4 Minor）
- Rounds: 1
- Findings addressed: 4 条 Minor 全部吸收——①`--json` 输出排序确定性（byFile 按 file+rule、byRule 按键名）已写入 Phase 1 Fix 项；②smoke 断言①的探测目标元素留给实现自由度（执行者知悉，红→绿迭代中钉死）；③exit code 语义表述以 `:516`（newHits>0）+ `:519-522`（内部错误）完整口径理解；④"先红后绿次序"记录通道钉死为 `docs/logs/2026/09-19.md`。

## Closure Gates

- [x] 全部 in-scope 交付落地（Phase 1–3 Exit Criteria 全勾）
- [x] 无 `packages/**` 产品代码变更（V0 硬边界，`git status` 核实）
- [x] 无 in-scope live defect 被静默降级（本 plan 无产品 defect 修复面；缺口清单中的缺陷归属 V1–V12c，非本 plan in-scope）
- [x] focused verification 完成：`pnpm test:scripts` 70/70（含 --json 2 例先红后绿）、smoke spec 5/5 两轮复跑
- [x] 受影响 owner docs 已同步：`docs/references/e2e-test-diagnostic-guide.md` 新增 "Visual Assertion Helpers" 节；`docs/backlog/visual-quality-roadmap.md` V0 状态已翻转；`docs/logs/2026/09-19.md` 已记录
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（2026-09-19 独立 closure auditor：approved，0 Blocker / 0 Major / 3 Minor 观察，证据见 Closure 节与 `docs/logs/2026/09-19.md`）
- [x] `pnpm typecheck`（40/40）
- [x] `pnpm build`（40/40）
- [x] `pnpm lint`（40/40）
- [x] `pnpm test`（74/74 tasks；test:scripts 70/70；全量 e2e 1475 passed / 0 failed / 43 skipped / 2 flaky 重试通过）
- [x] `pnpm check`（全链 exit 0，零新 hit，对照 registered pre-existing red list）

## Deferred But Adjudicated

无——V0 四项交付全部在 scope 内收口；`_tmp/baselines/` 像素 diff 通道为研究报告 A1 显式裁决的 out-of-scope（非 deferred），无 successor 义务。

## Non-Blocking Follow-ups

- 各域 spec 消费新 helper 补视觉断言：归属 V1–V12c 各域 work item（路线图已排程），不属本 plan 收口面。

## Closure

Status Note: 三 Phase 全 completed、Closure Gates 全勾；独立 closure auditor（fresh session，2026-09-19）实跑验证 --json 两次字节级一致且与基线快照一致、exit 语义实测、scripts 70/70、smoke 5/5、check 全链 exit 0、卡↔普查回溯抽查一致、V0 硬边界（零 packages/** 变更）成立，verdict **approved\*\*。Plan Status 翻 `completed`，路线图 V0 行同日翻 `done`。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure auditor（fresh sub-agent session，2026-09-19）
- Evidence: 本节 Verdict approved + `docs/logs/2026/09-19.md` 收口记录；实跑证据：`--json` 字节级一致性、vitest.scripts 70/70、smoke spec 5/5、pnpm check exit 0、`git diff HEAD --stat` 无 packages/\*\*。3 条 Minor 观察不阻碍：①--json payload 含 newHits 键为 plan 文本滞后于实现（日志已如实记录）；②kanban 行号 off-by-one 系上游普查自带、忠实转录；③工作区携带前序 roadmap 规划 session 的未提交 docs 改动，提交时区隔即可。

Follow-up:

- no remaining plan-owned work（各域消费 helper 补视觉断言归属 V1–V12c 各域 plan，路线图已排程）
