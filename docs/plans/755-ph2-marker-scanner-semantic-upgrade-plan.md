# 755 PH-2 marker 扫描器语义升级 + 基线重建

> Plan Status: completed
> Last Reviewed: 2026-10-26
> Source: `docs/backlog/platform-hardening-roadmap.md` PH-2（A 组，PH-1 successor）；种子 `docs/audits/2026-10-19-1307-arm2-MA1.5-domain-structure.md` P2-MA1.5-002（`rules.mjs:144-150` 豁免盲区）与 P1-MA1.5-001（3d 根 marker 漏报实例）
> Related: plan `754`（PH-1：扫描器已入 `check:scanner-baselines` 棘轮，基线 0）；arm2 MA7.3（审漂移实例，本 plan 修工具本体）

## Purpose

修复 `scanMissingRendererMarkers` 的整文件豁免缺陷——`content.includes('nop-')` 被任何 `@nop-chaos/*` import 路径满足，导致"看似有 marker"的 renderer 文件结构性免检（假零基线）。升级匹配语义并按 roadmap 要求**以棘轮基线承接升级后的新增命中，不以零新增为目标**；判定口径在本 plan 内定义。

## Current Baseline

全部为 2026-10-26 live 实测（HEAD `781989859`）：

- 缺陷本体：`scripts/audit/rules.mjs:144-150` `scanMissingRendererMarkers`——第一道门 `content.includes('RendererComponentProps')`（保留），第二道门 `content.includes('nop-')` 与 import 路径 `@nop-chaos/flux-react` 中的 `nop-` 子串重合，整文件豁免。`rules.mjs:486-500` 的 include 仅扫 `packages/flux-renderers-*/src/**/*.tsx`（排除 `isTestFile`——`.test.`/`.spec.`/`__tests__`/`test-support` 任意位置——匹配的文件）。
- 3d 漏报实例已由 arm2 修复：`packages/flux-renderers-3d/src/renderer/three-canvas.tsx` 现含 `'nop-three-canvas'` marker。
- 升级后实测（在规则 include 范围内，`RendererComponentProps` 门保留）：
  - 仅做"marker 字面量排除 import 路径"（正则 `(?<![@\w/.-])nop-[a-z0-9]`）：**32** 个命中。
  - 再加"文件须含宿主元素 JSX 标签"（拥有 DOM 根的机械判据）：**15** 个命中——全部位于 flux-renderers-data（table 子组件 ×7）、form（hidden / input-suggest）、form-advanced（input-table-row / tree-control-pipeline / upload-field）、layout（resizable-renderer / wizard-step-body / wizard-step-nav）。
  - 32 与 15 之间的 17 个 = 仅组合子组件渲染（如只渲染 `<Foo />`）或 return null 的文件——按 styling contract 它们不在 DOM 根上发 marker，属误报，不纳入。
- 判定口径（本 plan 定义，三项全部满足才算命中）：
  1. 文件含 `RendererComponentProps`（原有门，保留）；
  2. 文件不含 marker 字面量——正则 `(?<![@\w/.-])nop-[a-z0-9]`（排除 `@nop-chaos/*` import、npm 路径、注释里的 `nop-chaos` 词干）；
  3. 文件含宿主元素 JSX 标签——`HOST_ELEMENT_TAGS` 钉死为 `div span section article p a ul ol li table thead tbody tr td th form button input textarea select label img iframe canvas svg pre code nav header footer main aside h1 h2 h3 h4 h5 h6`（15 个命中实际用到 `div span p li ul input`，均在列），文件只组合组件或返回 null → 不拥有 DOM 根 → 豁免。
- 棘轮现状：`scripts/baselines/scanner-baselines.json` 中 `find-missing-renderer-markers: 0`（plan 754 明文登记"FALSE ZERO — semantic fix is PH-2"）；`scripts/check-scanner-baselines.mjs` 解析其 `Found N suspect matches` 输出；`shared.mjs` 支持 `FLUX_AUDIT_SCAN_ROOT` 覆盖扫描根（供测试 stage fixture，先例 `find-renderer-metamodel-residue.test.ts`）。
- 测试现状：无针对 `rendererMarkerRules` 的单测文件；`scripts/audit/` 规则无既有 rules 级测试先例（最近先例是 scanner 级 e2e 式测试 `find-renderer-metamodel-residue.test.ts`，用临时扫描根 + 环境变量）。
- owner doc：`docs/references/audit-tooling.md:64`（Heuristic Suspect Scanners 行）与 `:96`（Check Wiring Disposition 行注记 "baseline 0, false zero … semantic fix is PH-2"）需随基线更新；`docs/architecture/renderer-markers-and-selectors.md`（styling contract protected area，plan-first——本 plan 即其 plan）无扫描器提法，不改 contract 语义本身。

## Goals

- 第二道豁免门不再被 import 路径满足；marker 检测从"子串存在"升级为"DOM 根上的 marker 字面量"。
- 升级后的 15 个新增命中以棘轮基线承接并登记来源注记；基线只减不增纪律不变。
- 判别性测试：旧实现必挂（仅 import 路径的文件在旧实现下免检）、新实现通过；宿主元素口径两向覆盖。

## Non-Goals

- 不修任何被命中文件的 marker（15 个存量的 triage/修复归各渲染器 owner 面，同 PH-1 的 deferred 先例）。
- 不改 `rendererMarkerRules` 的 include 范围（仍仅 `packages/flux-renderers-*/src`）。
- 不动 `check-scanner-baselines.mjs`（PH-1 已定稿解析能力）。
- 不引入 per-file allowlist（白名单式豁免留待 triage 有结论后由 owner 面提请）。

## Scope

### In Scope

- `scripts/audit/rules.mjs`：`scanMissingRendererMarkers` 第二道门重写（marker 字面量正则 + 宿主元素判据），host-element 枚举提为常量
- `scripts/__tests__/find-missing-renderer-markers.test.ts`（新）：`FLUX_AUDIT_SCAN_ROOT` fixture 驱动
- `scripts/baselines/scanner-baselines.json`：`find-missing-renderer-markers` 0→15 + 注记
- `docs/references/audit-tooling.md`：`:64` 行与 `:96` 行注记更新
- `docs/audits/2026-10-19-1307-arm2-MA1.5-domain-structure.md`：P2-MA1.5-002 处就地加"已于 plan 755 修复"注记（历史文本不改写）
- roadmap PH-2 行状态回写、`docs/logs/2026/10-26.md`

### Out Of Scope

- 15 个存量命中的修复与 triage
- 其他规则（`stylingAuditRules` 等）的扫描器语义
- `docs/architecture/renderer-markers-and-selectors.md` 契约文本

## Failure Paths

| 场景          | 触发                                                                  | 行为               | 可重试           | 用户可见        |
| ------------- | --------------------------------------------------------------------- | ------------------ | ---------------- | --------------- |
| real-miss     | renderer 文件有宿主 JSX、仅有 `@nop-chaos/*` import、零 marker 字面量 | 命中（旧实现漏报） | 是               | 扫描器/棘轮红   |
| no-dom-root   | 文件仅组合组件/return null                                            | 豁免（不误报）     | 是               | 无              |
| import-string | 文件 className 里有真 marker                                          | 豁免               | 是               | 无              |
| growth        | 基线重建后新增无 marker 文件                                          | 棘轮红             | 是（修复或登记） | `pnpm check` 红 |

## Test Strategy

本档选择：**必须自动化**——这是 CI 门禁语义修复（不可降级项），且 roadmap 要求升级"先红后绿"。

## Execution Plan

### Phase 1 - Proof：先红用例

Status: completed
Targets: `scripts/__tests__/find-missing-renderer-markers.test.ts`

- Item Types: `Proof`

- [x] 新建测试（7 用例）：单测口径直接调用 `rendererMarkerRules[0].scanWithContent`——①仅 import + `<div>` 宿主 + 无 marker → 命中；②className `'nop-demo'` → 不命中；③只渲染 `<Inner />` → 不命中；④return null → 不命中；⑤无 `RendererComponentProps` → 不命中；⑥模板字面量 `` `nop-${base}` `` → 不命中；集成口径 ⑦ `FLUX_AUDIT_SCAN_ROOT` 临时树（含 test-support 与 `.test.tsx` 旁证）→ `Found 1 suspect matches` 且仅 import-only 文件。
- [x] 运行并记录先红证据。

Exit Criteria:

- [x] 2026-10-26 旧 `rules.mjs` 下：① 与 ⑦ **红**（旧豁免把 import-only 文件免检）、②–⑥ 绿 → `2 failed | 5 passed`。
- [x] 证据记录于本节。

### Phase 2 - Fix：语义升级与基线重建

Status: completed
Targets: `scripts/audit/rules.mjs`、`scripts/baselines/scanner-baselines.json`

- Item Types: `Fix`

- [x] `scanMissingRendererMarkers`：删除 `content.includes('nop-')`；新增 `MARKER_LITERAL_PATTERN = /(?<![@\w/.-])nop-(?=[a-z0-9]|\$\{)/`（**执行修订**：lookahead 增加 `\$\{` 以接受模板字面量前缀 marker，用例 ⑥ 实跑暴露原口径过窄）与 `HOST_ELEMENT_TAGS`（37 个标签，按 plan 钉死）+ `HOST_ELEMENT_PATTERN`；三门串联，anchor 行号逻辑保留。
- [x] ①⑦ 转绿，7/7；live 复扫 `Found 15 suspect matches`，文件清单与 Current Baseline 完全一致。
- [x] `scanner-baselines.json`：`find-missing-renderer-markers` 0→15；`reRegistrationNotes` 追加 plan 755 条（口径三项 + 15 项分布 + 棘轮非清零）。手改。
- [x] 【执行修订 A】`rules.mjs` 加入常量后达 707 行，触发 `check:oversized-code-files` 700 行硬门禁 → 按既有先例（`react19-rules.mjs`/`canvas-a11y-rules.mjs`）把 marker 规则抽为 `scripts/audit/marker-rules.mjs`（68 行），`rules.mjs` 回落 644 行并 import + re-export `rendererMarkerRules`，消费方 `find-missing-renderer-markers.mjs` 的 import 路径不变。
- [x] 【执行修订 B】`discover-audit-suspects` 合集扫描器包含 marker 桶，升级后同源双计 +15（live 771→786；登记基线 772→787，保留原 1 条余量）并在同一条注记说明（先例：plan 665/666 "同源双计"）。
- [x] `pnpm check:scanner-baselines` / `pnpm check:wiring-coverage` 绿（见 Closure Gates `pnpm check`）。

Exit Criteria:

- [x] 测试 7/7 绿（① 由红转绿即语义升级生效）。
- [x] `node scripts/audit/find-missing-renderer-markers.mjs` → `Found 15 suspect matches across 1 rule buckets`。
- [x] `node scripts/check-scanner-baselines.mjs` exit 0。

### Phase 3 - Docs：owner doc 与审计注记

Status: completed
Targets: `docs/references/audit-tooling.md`、`docs/audits/2026-10-19-1307-arm2-MA1.5-domain-structure.md`、roadmap、`docs/logs/2026/10-26.md`

- Item Types: `Fix`

- [x] `audit-tooling.md:64` covers/use 描述更新（宿主元素 + import 路径不再算 marker + 无 DOM 根豁免）；`:96` 注记改 "baseline 15（plan 755 重建）"。
- [x] MA1.5 审计文档 P2-MA1.5-002 处就地加修复注记一行，历史文本不改。
- [x] roadmap PH-2 行 `todo`→`planned`→`done`（closure 同 commit）；daily log 条目（closure 同 commit）。

Exit Criteria:

- [x] 三处文档与 live 一致；`pnpm check:active-doc-code-anchors` 绿（见 `pnpm check`）。

## Draft Review Record

- Reviewer / Agent: fresh-session sub-agent `agent_3c9f2408`（2026-10-26）
- Verdict: `pass-with-minors`（0 Blocker / 0 Major / 3 Minor）
- Rounds: 1
- Findings addressed: 无 Blocker/Major。3 Minor 全部落文：①include 排除口径改为 `isTestFile` 四形态；②`HOST_ELEMENT_TAGS` 完整钉死（含 15 命中实际使用的 `p li ul input`）；③`createElement` 事实声称修正（4 处均为图标组件）。审阅者独立脚本复测 32 / 15 与分布完全一致，并抽查 17 个无 DOM 根文件确认口径正确。

## Closure Gates

- [x] 豁免缺陷已修复：仅 import 路径命中的文件不再免检（判别性测试 ① 旧红新绿）
- [x] 判定口径三项机械可判定且已落测试（7 用例）
- [x] 棘轮基线重建（0→15；合集 772→787 同源双计）含来源注记，`pnpm check` exit 0 零新增红
- [x] 无 in-scope 项被静默降级（15 个存量 triage 为 out-of-scope improvement，已登记）
- [x] owner doc（`audit-tooling.md:64/:96`）与审计种子文档（MA1.5 P2-002 修复注记）已同步
- [x] 由独立子 agent（fresh session）执行的 closure audit 已完成并记录证据——`agent_b8d786a6`，2026-10-26，verdict `approved`（0 Blocker / 0 Major / 1 Minor，见 §Closure）
- [x] `pnpm typecheck` 45/45
- [x] `pnpm build` 45/45
- [x] `pnpm lint` 45/45（模块拆分后复跑）
- [x] `pnpm test` 84/84；`pnpm test:scripts` 134/138——4 红为 plan 754 已披露的 pre-existing（console-baseline / flux-bundle-pack ×2 / ui-consistency-gaps），本 plan 相关 18 用例（marker 7 + wiring 11）全绿
- [x] `pnpm check` exit 0（oversized 回落、scanner-baselines within baseline）

## Deferred But Adjudicated

### 15 个升级后新增命中的 triage

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: roadmap PH-2 明文"以棘轮基线承接，不以零新增为目标"；命中分布在 table/wizard/form 子组件，修复须逐个对照 styling contract 与 MA7.3 审计，属渲染器 owner 面。
- Successor Required: `no`（棘轮已锁只减不增；若后续要求清零，由 owner 面另立 plan 走 `--update-baselines` 收窄）

## Non-Blocking Follow-ups

- 宿主元素枚举可考虑未来替换为 JSX 解析（当前启发式不覆盖 `React.createElement` 创建宿主元素的形态；现有 in-scope 的 4 处 `createElement`——`flux-renderers-content/src/alert-renderer.tsx:47`、`result.tsx:94`、`status.tsx:87`、`flux-renderers-form-advanced/src/icon-picker.tsx:209`——均为图标组件创建且文件均含 marker 字面量，不影响计数）。

## Closure

Status Note: marker 扫描器的整文件豁免缺陷已修复——`@nop-chaos/*` import 路径不再构成 marker，判定口径为 `RendererComponentProps` + 无 marker 字面量 + 含宿主元素三门串联；假零基线重建为 15（合集同源双计：live 771→786，基线 772→787）。判别性测试旧红新绿；owner doc、审计种子、roadmap 同步。存量 15 项 triage 按 roadmap 以棘轮承接。

Closure Audit Evidence:

- Auditor / Agent: fresh-session sub-agent `agent_b8d786a6`（2026-10-26）
- Evidence: verdict `approved`（0 Blocker / 0 Major / 1 Minor）。审计者独立实跑：扫描器 `Found 15`，文件分布与 Current Baseline 一致；测试 7/7 且确认用例 ① fixture 含 `@nop-chaos/*` import、旧实现必返 `[]`；`check-scanner-baselines` exit 0（786 < 787，marker 桶在合集输出中可见）；`check-oversized-code-files` exit 0（`rules.mjs` 644 行、`marker-rules.mjs` 68 行）；`rules.mjs:15/:19` import + re-export、消费方 import 不变；`pnpm check` 自跑 exit 0；三处文档改动与 live 一致；两项执行修订均已记录。1 Minor（修订 B 处 771/772 基数表述不一）已在本 closure commit 内统一。

Follow-up:

- no remaining plan-owned work。15 个存量命中的 marker 补齐归各渲染器 owner 面（data table 子组件 / form / form-advanced / layout），棘轮已锁只减不增。
