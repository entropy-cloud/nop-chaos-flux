# 634 跨 roadmap UR-7 包依赖与 peer-dep 治理（12 条收口）

> Plan Status: completed（2026-10-17 closure audit approved（独立子 agent agent_e4a639ae，0 Blocker / 0 Major / 2 Minor 随同批修正））
> Last Reviewed: 2026-10-17
> Source: `docs/backlog/cross-roadmap-remediation-roadmap.md` UR-7（Wave C，audit-remediation Follow-up Backlog：D01 组 8 条 + Open Audit P2-A/B/J/K 4 条）
> Related: `docs/backlog/audit-remediation-roadmap.md` Follow-up Backlog、plan 624（包清单基线，已消化其中多项）

## Purpose

收口 UR-7 全部 12 条：5 项已被后续工作闭合（只做状态同步回写）、1 项登记失效（判定 + 回写）、5 项跨包生产耦合按 01-11「accept-and-annotate」先例结案（form-advanced→data 一项做 devDep 降级实修）、P2-K 做 sideEffects 正确性修正 + subpath 命名惯例裁决注记。完成后按回写映射更新 audit-remediation Follow-up Backlog 与 cross-roadmap。

## Current Baseline

（2026-10-17 独立代理逐项 live 核对结论，证据 file:line 见各条。）

- **已闭合（状态同步即可）**：
  - 01-02 + P2-J（mobile 缺 flux-react 显式依赖）：`packages/flux-renderers-mobile/package.json` dependencies 已含 `@nop-chaos/flux-react: workspace:*`（test-support.ts:7 转出口 + 14 测试消费）——plan 624 裁定保留并背书。
  - P2-A（bundle ui peer `"*"`）：现 `"@nop-chaos/ui": "workspace:*"`（peerDependencies）——plan 624 改判恢复 peer + devDep 背书。
  - P2-B（word-editor recharts peer 残留）：peerDependencies 现仅 lucide-react/react，recharts 已移 devDependencies（^3.8.1，plan 624 背书）。
  - 01-11（form-advanced runtime 依赖公共 API 核验）：`projected-scope.ts:1` 已有显式裁决注释 "Adjudication 01-11: … public API only … Accept-and-annotate: clean."——已结案。
- **登记失效（判定 + 回写）**：
  - 01-01（flux-runtime Rule(c) 文本过期）：规则(c)文本（「flux-runtime 必须 ONLY 依赖 flux-core 和 flux-formula」）仅存于历史审计分析记录（`docs/analysis/2026-07-28-deep-audit-audit-remediation/01-dependency-graph.md:5-11`，含「需要更新」建议；archive 另有一份），无现行 owner 文档承载；07-28 的 package-dependency-hygiene plan 已处置过该条。现状 `flux-runtime/package.json` dependencies（action-core/compiler/core/formula/i18n）与分层链一致、无 rule 文本残留。回写口径 = 「规则文本仅存于历史审计分析记录、无 owner 载体，07-28 plan 已处置，现状一致」。
- **已裁决注释在案（2026-07-28 plan `docs/plans/2026-07-28-1800-2-package-dependency-hygiene.md` completed 落地，commit 0f8ae307e；本计划核验 + delta）**：
  - 01-03 data→basic：`table-cell-chrome.tsx:10` 已有 Adjudication 注释（copyToClipboard 运行时复用）。
  - 01-04 form-advanced 三耦合：content（`editor-renderer.tsx:12` 注释在案，sanitizeHtml）、form（24 个非测试文件 formFieldRules 等运行时导出）、data（**注释文本已过时**：称「CrudColumnSchema/CrudSchema types」而非测试源码现零引用，仅 `array-field-object-items.test.tsx:7` 测试消费——devDep 降级时同步修正注释）。
  - 01-05 ai→content：`ai-bubble/renderers/markdown.tsx:9` 注释在案（sanitizeHtml）。
  - 01-06 code-editor→form：`code-editor-renderer.tsx:7` 注释在案（formFieldChromeRules）。
  - 01-09 report→spreadsheet：`report-spreadsheet-canvas.tsx:7` + `page-renderer.tsx:23` 两条注释在案；**delta**：`report-field-insert.ts:8`（cellAddress 导入）无注释——核验后补或裁决既有两条已覆盖（执行时定）。
  - P2-K CSS subpath/sideEffects 不一致：全量 subpath 清单——./styles.css（basic/form/content/ai/layout/dashboard/theme-tokens/form-advanced）、ui（./styles.css→dist/styles/index.css + ./base.css）、./code-editor-styles.css（code-editor）、./canvas-styles.css（spreadsheet-renderers）、./print-designer.css（flux-print-renderers）、./report-field-panel.css（report-designer-renderers）、./style.css（flux-bundle）、./default-spacing.css（flux-react）、./designer-theme.css（flow-designer-renderers）、./editor/styles.css（industrial）；全部裸 `default` 条件；sideEffects——form-advanced `false` 却导出 styles.css（**潜在正确性问题**：bundler 可摇掉 CSS import），data 无 CSS export（已核实 src 零 .css），其余 `["*.css"]`。

## Goals

- 5 项已闭合 + 1 项失效判定回写 audit-remediation Follow-up Backlog（行注记，沿用 finding 编号）。
- form-advanced→data 依赖降级 dependencies → devDependencies（仅测试消费——实修）。
- P2-K 正确性修正：form-advanced `sideEffects` 修正为含 `*.css`；data 包 CSS export 核实（有 CSS 产物则补 export + sideEffects；无则注记）。
- 5 项跨包耦合的既有裁决注释核验（2026-07-28 已落地）+ delta 补注（`report-field-insert.ts:8` 补注或裁决既有覆盖）+ 01-04 过时注释文本随 devDep 降级同步修正；subpath 命名差异裁决为「消费方面向命名、维持现状」（全量清单回写）并回写注记。

## Non-Goals

- 共享工具（copyToClipboard/sanitizeHtml/formFieldChromeRules/cellAddress）抽取到共享包的重构——如未来需要另立 successor（accept-and-annotate 时注记）。
- flux-compiler 测试归位（plan 628 Phase⑤ 领地）与其余 UR-8/9/10/11 条目。

## Scope

### In Scope

- `packages/flux-renderers-form-advanced/package.json`（data 依赖降级 + sideEffects 修正）。
- `packages/flux-renderers-data/package.json`（CSS export 核实/补齐 + sideEffects 核对）。
- 耦合注释 delta：`packages/report-designer-renderers/src/report-field-insert.ts`（01-09 第二位点，补注或裁决既有两条覆盖）。
- `docs/backlog/audit-remediation-roadmap.md` Follow-up Backlog 行注记 + `docs/backlog/cross-roadmap-remediation-roadmap.md` UR-7 行 + daily log。

### Out Of Scope

- 包依赖图重构、新建共享工具包。
- UR-8/9/10/11 任何条目。

## Failure Paths

| 编号          | 触发                          | 行为                                                         | 可重试 | 用户可见表现 |
| ------------- | ----------------------------- | ------------------------------------------------------------ | ------ | ------------ |
| knip-baseline | 依赖降级/修正触发 knip 新命中 | 按 knip-baseline 机制外科修正或披露归属（并发会话 hit 除外） | 是     | 无           |
| data-has-css  | data 包实际有 CSS 但无 export | 补 export + sideEffects；无 CSS 则注记「无 CSS 产物」        | 是     | 无           |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用：纯清单/注释治理，无行为变更**——验证 = `pnpm typecheck && pnpm build`（manifest 变更）+ `pnpm check`（knip/manifest-deps 门禁）+ install 校验。

## Execution Plan

### Phase 1 - 实修（依赖降级 + sideEffects + 裁决注释）

Status: completed
Targets: form-advanced/data package.json、5 个耦合位点

- Item Types: `Fix | Decision`

- [x] form-advanced：`@nop-chaos/flux-renderers-data` dependencies → devDependencies（src 16 处出现全在 13 个测试文件）；同步修正既有 01-04 注释过时的「CrudColumnSchema/CrudSchema types」表述（editor-renderer.tsx 注明 data 腿已降级、非测试源码零引用）；`sideEffects: false` → `["*.css"]`。
- [x] data 包：已核实 src 零 .css、无 CSS export——回写注记「无 CSS 产物」结案。
- [x] 耦合注释 delta：`report-field-insert.ts:8` 补 Adjudication 01-09 注释（对齐 projected-scope.ts 形态；既有 report 包两条注释覆盖 canvas/page-renderer 位点）；其余 4 位点既有注释核验在案（commit 0f8ae307e）。

Exit Criteria:

- [x] `pnpm install` 后 form-advanced filtered typecheck + 173 文件/1215 测试全绿；manifest diff 与注释文本一致（01-04 注释已注明 data 腿降级）。

### Phase 2 - 回写与收口

Status: completed
Targets: audit-remediation Follow-up Backlog、cross-roadmap、daily log

- Item Types: `Proof | Fix`

- [x] Follow-up Backlog 12 条逐行注记（已闭合 5：01-02/01-11/P2-A/P2-B/P2-J；失效 1：01-01；实修 2：01-04 data 腿降级 + P2-K sideEffects；裁决在案 4：01-03/01-05/01-06/01-09 + 01-09 delta 补注——沿用 finding 编号 + plan 链接）。
- [x] cross-roadmap UR-7 行回写 + daily log。

Exit Criteria:

- [x] `pnpm check` 零新增红（knip/manifest-deps 门禁过）；回写三面一致。（最终门禁数字见 Closure Gates）

## Draft Review Record

- Reviewer / Agent: fresh session 独立子 agent（plan review round 1，2026-10-17）
- Verdict: `revised`（2 Major / 6 Minor，修订后需复核；未达共识前维持 draft）
- Rounds: 1
- Findings addressed: —

Round 1 Findings（全部经 live repo / git 核实）：

- [Major] R1-1 Current Baseline「仍现役 5 条」与 live 漂移：01-03/04/05/06/09 的裁决注释**已全部存在**，由 commit `0f8ae307e`（2026-07-28，plan `2026-07-28-1800-2-package-dependency-hygiene.md`，Status: completed）落地——`table-cell-chrome.tsx:10`、`editor-renderer.tsx:12`、`markdown.tsx:9`、`code-editor-renderer.tsx:7`、`report-spreadsheet-canvas.tsx:7`（另有 `page-renderer.tsx:23` 第二条 01-09）。唯一无注释位点是 `report-field-insert.ts:8`。Phase 1「5 个位点加注释」按原文执行会产生重复注释；应改写为「核验既有注释覆盖 + 仅补 report-field-insert.ts（或显式裁决既有两条 01-09 注释已覆盖、不补）」，Related 应补引 plan 2026-07-28-1800-2。
- [Major] R1-2 01-01 失效判据「指向的 Rule(c) 文本在现行 docs 全仓不可定位」不成立：规则(c)文本可定位——`docs/analysis/2026-07-28-deep-audit-audit-remediation/01-dependency-graph.md:5-11,102,118`（非 archive，含引文与「需要更新」建议）+ `docs/archive/analysis/2026-05-06-deep-audit-full/01-dependency-graph.md:116`（全节）。失效判定本身成立（无任何现行 owner 文档承载规则(c)；flux-runtime/package.json 自 2026-07-28 起即无 rule 文本，现 dependencies 五包与分层链一致），但回写依据须改写为「规则文本仅存于历史审计分析记录、无 owner 载体」，并如实记录 plan 2026-07-28-1800-2 已将 01-01 标记处置过的事实。
- [Minor] R1-3 In Scope `report-field-insert.tsx` 扩展名有误（实为 `.ts`，Baseline 自身写法正确）；「report-field-insert.tsx 或 report-spreadsheet-canvas.tsx」的「或」含糊——canvas 位点已有注释。
- [Minor] R1-4 既有 01-04 注释文本声称 data 耦合为「CrudColumnSchema/CrudSchema types」，与非测试源码零引用的实况漂移（data 引用现仅存测试文件）；devDep 降级回写时应同步修正该注释文本，避免注释与 manifest 互相矛盾。
- [Minor] R1-5 Phase 1 Exit Criteria 含「全量 `pnpm typecheck`」，违反 Minimum Rule 18（全量门禁归 Closure Gates）；Phase 级保留 install + 两个 filtered typecheck 即可。
- [Minor] R1-6 P2-K「消费方面向命名、维持现状」裁决建议基于全量 subpath 清单而非 8 包抽查：全仓另有 `flux-bundle` ./style.css、`flux-react` ./default-spacing.css、`flow-designer-renderers` ./designer-theme.css、`flux-renderers-industrial` ./editor/styles.css 等变体（一条 grep 可得）。
- [Minor] R1-7 baseline「form（约 20 文件）」实为 24 个非测试文件——量级可接受，回写时建议用实数。

已核实为准确的关键声称：form-advanced→data 仅测试消费（src 下 17 处引用全在 `*.test.tsx`/`__tests__/`，data 位于 dependencies:25）；sideEffects:false + ./styles.css export 并存；data 包无 CSS 产物与 CSS export；01-11 注释形态（projected-scope.ts:1）；mobile dependencies 含 flux-react（test-support.ts:7 转出口 + 14 个测试文件消费）；flux-bundle peer `@nop-chaos/ui: workspace:*`；word-editor-renderers peer 仅 lucide-react/react、recharts 在 devDependencies；P2-K 全部裸 `default` 条件；各 import 位点行号（table-cell-chrome.tsx:9 / editor-renderer.tsx:11 / markdown.tsx:8 / code-editor-renderer.tsx:6 / report-field-insert.ts:8 / report-spreadsheet-canvas.tsx:2,15）；report-designer-toolbar.tsx 无 spreadsheet 导入（01-09 位点确在 report-designer-renderers 包内）。

## Closure Gates

- [x] Phase 1 实修落地（降级 + sideEffects + 注释 delta）
- [x] Phase 2 回写三面一致
- [x] `pnpm typecheck`/`pnpm build` 无非既有红；`pnpm check` 零新增红（唯一红 = knip flux-xlang-lang，既有登记归并发会话；fail-fast 后 3 子门禁审计员单独补跑全过）
- [x] 不存在被静默降级的 in-scope 项（accept-and-annotate 均带 successor 注记；01-01 失效判定经审计核实依据）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（agent_e4a639ae，见 Closure Audit Evidence）
- [x] `pnpm typecheck`（0 非既有错）
- [x] `pnpm build`（43/44；唯 playground vite.config 既有红）
- [x] `pnpm lint`（绿）
- [x] `pnpm test`（除 playground 3 文件既有登记红外全绿；form-advanced 1215/1215）

## Deferred But Adjudicated

（起草期无；执行中改判当场落此节。）

## Non-Blocking Follow-ups

- 共享工具抽取（copyToClipboard/sanitizeHtml/formFieldChromeRules/cellAddress → 共享层）——optimization candidate，accept-and-annotate 注记中挂 successor 提示。
- `docs/skills/deep-audit-prompts.md:571` rule(c) 历史表述——已随本 plan 收口就地勘误（closure audit F-1）；后续 deep audit 以 flux-runtime/package.json 实况为准。

## Closure

Status Note: 2026-10-17 收口。UR-7 12 条全闭环：5 项状态同步（624/07-28 先行闭合）、01-01 失效判定（依据经审计实读核实 + live prompt 勘误）、01-04 data 腿 devDep 降级（+过时注释修正）、P2-K sideEffects 正确性修正（subpath 命名裁决维持）、01-09 delta 补注、4 项裁决注释核验在案。

Closure Audit Evidence:

- Auditor / Agent: agent_e4a639ae（独立 fresh-session sub-agent，2026-10-17）
- Evidence: Verdict `approved`（0B/0M/2 Minor）——manifest diff 正确性（含 check:workspace-manifest-deps 实跑 + pnpm-lock 同步核验）、注释三处、回写 12 行归属核实、01-01 诚实性实读核实、Closure Gates 独立实跑（含 fail-fast 后 3 子门禁补跑）五项全 PASS。F-1（deep-audit-prompts live 载体勘误）+ F-2（计数 17→16）随 closing batch 修正。

Follow-up:

- 见 Non-Blocking Follow-ups。
