# 1 INV-1 门禁覆盖补全（check:audit-renderer-browser-io scope 放宽 + import() 规则）

> Plan Status: completed
> Last Reviewed: 2026-08-07
> Review History: draft → active（独立子 agent 两轮审查，首轮 revised（1 Major：Must-automate 档位缺 committed 回归测试 + Proof/Fix 顺序；5 Minor）已修订解决，复检 pass-with-minors（3 条 Minor 全部处理：懒加载计数补全 15 处、fixture 路径陷阱注明、Phase 2 exit 收窄去重），零 Blocker/零 Major，共识达成，详见 Draft Review Record）；completed（2026-08-07 closure-audit 独立 fresh session 复核通过，证据见 Closure 节）
> Source: `docs/audits/2026-08-06-0711-open-audit-component-audit.md`（[P2] O-P2-2）、`docs/backlog/component-audit-roadmap.md`（Follow-up Backlog O-P2-2 行，`[ ]`）、`docs/references/new-renderer-introduction-audit.md`（INV-1 清单 :17-23）
> Related: `docs/audits/per-component/pc-index.md:362`（check:audit-renderer-browser-io 登记）、`docs/logs/2026/08-06.md`（CG 条目，工具基线）、`scripts/__tests__/check-active-doc-code-anchors.test.ts`（committed 门禁测试先例）
> Mission: component-audit
> Work Item: O-P2-2（`check:audit-renderer-browser-io` 覆盖范围与 INV-1 零容忍声明不符）

## Purpose

修复 `check:audit-renderer-browser-io` 的覆盖缺口，使门禁实际扫描范围与「renderer 直连 IO 零容忍」的承诺一致：(a) 作用域正则 `/^packages\/flux-renderers-/` 只覆盖 10 个 `flux-renderers-*` 包，漏掉 flow-designer-renderers / spreadsheet-renderers / report-designer-renderers / word-editor-renderers 4 个 renderer 包；(b) RULES 9 条规则缺 INV-1 清单显式列出的 `import()`（动态加载远程模块）。同时把该门禁的验证从「临时 fixture 实证」升级为 **committed 回归测试**（对齐 `scripts/__tests__/check-active-doc-code-anchors.test.ts` 先例），防止规则被误删/误改时零命中 gate 静默失效。收口后 roadmap Follow-up Backlog `O-P2-2` 行翻转 `[x]`。

## Current Baseline

- **门禁脚本**（live 核对，2026-08-07）：`scripts/audit/find-renderer-browser-io.mjs:122` 作用域过滤 `if (!/^packages\/flux-renderers-/.test(relativePath)) continue;`——只覆盖 `flux-renderers-basic/content/data/form/form-advanced/layout/mobile/scheduling/ai/graph` 10 包；RULES（`:6-52`）共 9 条（fetch/XMLHttpRequest+axios/localStorage+sessionStorage/indexedDB/window.open/history.pushState/WebSocket+EventSource+RTCPeerConnection/navigator.sendBeacon/location 导航），无 `import()` 规则。
- **INV-1 清单**（`docs/references/new-renderer-introduction-audit.md:17-23`）：明确列出 `import()` 动态加载远程模块为禁项；checklist v2 维度 18 同款（`docs/audits/component-audit-checklist.md:50`，含 `import()`）。
- **漏扫包现状**（live grep，2026-08-07）：4 个漏扫包生产代码（非测试）中浏览器 IO 直连仅 1 处注释提及 localStorage（`packages/word-editor-renderers/src/word-editor-page.tsx:95` 注释「Autosave persistence is best-effort...」），无真实命中；测试文件中的 `localStorage` 用法由 `isTestFile` 过滤（`scripts/audit/shared.mjs:25-27` 定义，`:26` 正则）。
- **`import()` 形态风险**（live grep，2026-08-07）：renderer 包源码中 `import(` 出现 60+ 处（36 文件，非测试），绝大多数为 **TS type import**（如 `loop.tsx:66` `import('@nop-chaos/flux-core').CompiledRuntimeValue<...>`、`schemas.ts`、`gantt.types.ts` 等）；运行时懒加载共 15 处——包名懒加载 2 处（`kanban/utils/kanban-export.ts:64` `await import('html2canvas')`、`barcode-input/utils/barcode-detector-utils.ts:21` `await import('@zxing/library')`）+ 相对路径懒加载 13 处（flow-designer-renderers/report-designer-renderers/word-editor-renderers/spreadsheet-renderers 的 renderer-definitions/renderers 定义文件，`() => import('./x.js')`），均为 bundler 静态依赖非远程模块——朴素 `\bimport\s*\(` 规则会对 type import 全量假阳性，规则必须只匹配「字符串字面量为 URL（http(s)://、//、data:、blob: 等）的动态 import」；提案 URL 字面量正则对全 14 包实测零匹配，零假阳性断言成立。
- **注册面**：`package.json:37` `"check:audit-renderer-browser-io": "node scripts/audit/find-renderer-browser-io.mjs"`，并入 `pnpm check` 聚合链（`package.json:7`）；`pc-index.md:362` 登记作用域为 `packages/flux-renderers-*` 非测试文件，基线零命中。
- **门禁测试基建**（live 核对）：`vitest.scripts.config.ts` include `scripts/__tests__/**/*.{test,spec}.ts`（`package.json:22` `test:scripts`）；已有 committed 门禁测试先例 `scripts/__tests__/check-active-doc-code-anchors.test.ts`（execFile 实跑脚本 + `scripts/__tests__/fixtures/` 目录断言）与 `check-package-css-exports.test.ts`；**find-renderer-browser-io 当前无任何 committed 测试**。
- **roadmap backlog 现状**：Follow-up Backlog `O-P2-2` 行 `[ ]`；`O-P2-3`/`O-P2-4` 等其余行已 `[x]`（2026-08-06-2306-1 收口）。

## Goals

- 放宽作用域：`check:audit-renderer-browser-io` 扫描覆盖全部 14 个 renderer 包（既有 10 个 `flux-renderers-*` + flow-designer-renderers / spreadsheet-renderers / report-designer-renderers / word-editor-renderers），非测试文件。
- 新增 `import()` 规则：匹配「动态 import 远程模块」（参数为 URL 字符串字面量），type import 与本地包懒加载不命中。
- 门禁测试固化：新增 `scripts/__tests__/find-renderer-browser-io.test.ts` committed 回归测试（正/负样本，含作用域覆盖与规则语义锁定），纳入 `pnpm test:scripts`。
- 基线复验：放宽后全仓零命中（或逐条裁决新命中），`pnpm check` 全链绿。
- 同步文档：`pc-index.md:362` 作用域描述更新为 14 包；daily log 记录。
- roadmap Follow-up Backlog `O-P2-2` 行翻转 `[x]`。

## Non-Goals

- 不把 scope 扩展到非 renderer 包（`flux-core`/`flux-react`/`ui` 等公共层包——其浏览器 IO 由公共层审计管辖，非本门禁语义面）。
- 不处理 backlog 其余开放项（13-02/18-01/18-02 归其他计划轮次）。
- 不改变门禁命中即红的 exit-1 语义与其他 9 条既有规则。

## Scope

### In Scope

- `scripts/audit/find-renderer-browser-io.mjs`：作用域正则 + RULES 增补 `import()` 规则。
- `scripts/__tests__/find-renderer-browser-io.test.ts`（+ `scripts/__tests__/fixtures/` 下对应 fixture）：committed 回归测试（test-first：先提交红测试，再实现门禁改动使其转绿）。
- 基线复验（放宽后全仓重跑，零命中或逐条裁决）。
- 文档同步（`pc-index.md:362` + `docs/logs/2026/08-07.md`）+ roadmap 行翻转。

### Out Of Scope

- 修复漏扫包中发现的任何真实直连 IO 缺陷（若复验发现，单独裁决或记入 audit 卡，本 plan 只保证门禁可见性）。
- `import()` 规则之外的任何新规则。

## Failure Paths

> 本 plan 为门禁工具修复，涉及匹配语义，填写最小失败路径表。

| 场景                   | 触发                                                                                               | 行为                                                                       | 可重试 | 用户可见表现                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------ | -------------------------------------------------- |
| browser-io-url-import  | renderer 包源码 `await import('https://cdn.example.com/mod.js')`                                   | 门禁命中 exit 1（INV-1 红线）                                              | 否     | CI `pnpm check` 红并列出 `文件:行`                 |
| browser-io-type-import | renderer 包源码 TS type import `import('@nop-chaos/flux-core').X`                                  | 不命中（isCodePosition + 规则形态排除）                                    | —      | 无（零假阳性）                                     |
| browser-io-local-lazy  | renderer 包源码 `await import('html2canvas')` / `await import('@zxing/library')`（本地依赖懒加载） | 不命中                                                                     | —      | 无（bundler 静态依赖非远程模块）                   |
| browser-io-var-import  | renderer 包源码 `await import(someUrlVar)`（变量参数）                                             | 不命中（字面量规则盲区，watch-only residual，见 Deferred But Adjudicated） | —      | 无（与 fetch 规则不对称，需 AST 语义分析方可闭合） |

## Test Strategy

本档选择：`必须自动化`（门禁脚本是固定 CI 规则，命中即红，属非降级硬约束；规则语义（假阳性排除）必须以 committed 正/负样本测试锁定——按指南「Proof 项应在 Fix/Implement 之前」，每个 Phase 先写失败测试（红）再实现（绿））。

## Execution Plan

### Phase 1 - 作用域放宽（test-first）

Status: completed
Targets: `scripts/audit/find-renderer-browser-io.mjs`、`scripts/__tests__/find-renderer-browser-io.test.ts`、`scripts/__tests__/fixtures/`、`pc-index.md`

- Item Types: `Proof | Fix`

- [x] `Proof` 新增 committed 测试 `scripts/__tests__/find-renderer-browser-io.test.ts`（execFile 实跑脚本，对齐 `check-active-doc-code-anchors.test.ts` 先例），断言覆盖面与规则语义，**先红**：
  - 作用域正样本：在 `scripts/__tests__/fixtures/` 下放置 `inv1-scope/flow-designer-renderers-fixture.ts`（含真实代码形态 `fetch('/api')`），断言门禁命中（当前 `:122` 正则不覆盖 → 红）。
  - 作用域负样本：`inv1-scope/nop-debugger-fixture.ts`（非 renderer 包，含 `fetch('/api')`）断言不命中。
  - fixture 命名避开 `isTestFile` 过滤（`shared.mjs:26` 正则匹配 `.test.`/`.spec.`/`__tests__`/`test-support`）——fixture 放 `scripts/__tests__/fixtures/` 且命名不含上述模式；测试内通过临时 copy 到扫描根（`apps`/`packages`/`tests` 之一）执行（首选，无路径相对性陷阱），或按脚本可测性最小改造支持指定扫描根（次选——注意 `toPosixPath` 以仓库根计算相对路径，朴素指根到 `scripts/__tests__/fixtures/` 会命中 `__tests__`（isTestFile）且不匹配 `^packages\/` 作用域导致负样本静默空过，若走此路线作用域过滤须按覆盖根相对路径匹配）。
- [x] `Fix` 放宽 `:122` 作用域：`/^packages\/(flux-renderers-|flow-designer-renderers|spreadsheet-renderers|report-designer-renderers|word-editor-renderers)\//`（保持非测试文件过滤）——**转绿**。
- [x] `Proof` 全仓重跑 `pnpm check:audit-renderer-browser-io`：新覆盖 4 包零命中（预期；若有真实命中，逐条裁决——生产代码真实直连 IO 记入 audit 卡 + 当场修复，纯注释/测试引用不算命中）。
- [x] `Proof` 补作用域正样本实证：临时在 4 个新覆盖包内放真实代码形态 fixture（`inv1-scope-*.ts`，避开 isTestFile 模式），重跑门禁断言命中后删除（或由 committed 测试覆盖）。

Exit Criteria:

> 本 Phase 交付门禁作用域事实修正 + committed 测试锁定；后续 Phase 依赖其规则形态基线。

- [x] `:122` 正则已放宽为 14 包；`find-renderer-browser-io.test.ts` 作用域正/负样本用例绿（红→绿过程已记录）。
- [x] `pnpm check:audit-renderer-browser-io` 全仓零命中；`pnpm test:scripts` 绿（含本文件）。
- [x] `pc-index.md:362` 作用域描述已更新为 14 包（`flux-renderers-*` 10 + flow-designer-renderers + spreadsheet-renderers + report-designer-renderers + word-editor-renderers）。

### Phase 2 - import() 规则落地（test-first）

Status: completed
Targets: `scripts/audit/find-renderer-browser-io.mjs`、`scripts/__tests__/find-renderer-browser-io.test.ts`

- Item Types: `Proof | Fix | Decision`

- [x] `Proof` committed 测试先补 import() 规则用例，**先红**：
  - 正样本：fixture 含 `await import('https://cdn.example.com/mod.js')`（真实代码形态）→ 断言命中（当前无规则 → 红）。
  - 负样本：type import `import('@nop-chaos/flux-core').X`、`import('./local.js').X`、本地懒加载 `await import('html2canvas')`、`await import('@zxing/library')`、字符串内 `"await import('https://x')"`、注释内 `// import('https://x')` → 断言不命中。
- [x] `Decision` 规则形态裁定（写死于 plan）：`import()` 规则只匹配「参数为 URL 字符串字面量（http(s)://、//、data:、blob:）」的动态 import——正则约 `\bimport\s*\(\s*(['"`](?:https?:)?\/\/|['"`]data:|['"`]blob:)`（实现时以 `isCodePosition` 排除字符串/注释内出现）；type import（非 URL 参数）与本地包懒加载不命中。
- [x] `Fix` 在 `RULES`（`:6-52`）增补 `renderer-remote-dynamic-import` 规则（message 对齐 INV-1「动态加载远程模块」口径）——**转绿**。
- [x] `Proof` 全仓重跑 `pnpm check:audit-renderer-browser-io`：新增规则零命中（现有 60+ 处 type import / 2 处本地懒加载不误报）。
- [x] `Proof` `pnpm test:scripts` 全绿（含新增用例）+ focused 复验：`pnpm check:audit-renderer-browser-io` + `pnpm check:workspace-manifest-deps` 绿（全链 `pnpm check` 归 Closure Gates，Rule 18）。

Exit Criteria:

> 本 Phase 交付规则语义锁定、committed 测试锁定与零假阳性证明；后续收口依赖其绿态。

- [x] `RULES` 已含 `renderer-remote-dynamic-import` 且全仓零命中；正/负样本用例绿（红→绿过程已记录）。
- [x] `pnpm test:scripts` 绿（含本文件新增用例）。

### Phase 3 - 文档同步与 roadmap 翻转

Status: completed
Targets: `docs/backlog/component-audit-roadmap.md`、`docs/logs/2026/08-07.md`

- Item Types: `Follow-up`

- [x] `Follow-up` roadmap Follow-up Backlog `O-P2-2` 行翻转 `[x]`，注明收口 plan 路径。
- [x] `Follow-up` `docs/logs/2026/08-07.md` 记录：门禁覆盖修正（14 包）、import() 规则形态裁定、committed 测试（红→绿）、`pc-index.md` 同步。

Exit Criteria:

> 纯文档收口，repo-observable 为 roadmap 行与日志条目。

- [x] roadmap `O-P2-2` 行 `[x]` 且链接本 plan；`docs/logs/2026/08-07.md` 已记录本 plan 执行与验证结果。

## Draft Review Record

- Reviewer / Agent: 独立子 agent 两轮（fresh session：`ses_025f40bb8ffe3cajWZZLNfNOZV` → 修订 → `ses_025eb7ea0ffegO2kFHrCUibhNT`）
- Verdict: `revised` → `pass-with-minors`
- Rounds: 2
- Findings addressed:
  - Round 1 Major（committed 测试缺失 + Proof 顺序）：Phase 1/2 重构为 test-first（Proof 红 → Fix 绿），新增 `scripts/__tests__/find-renderer-browser-io.test.ts` 计划项，对齐 `check-active-doc-code-anchors.test.ts` + `vitest.scripts.config.ts` 先例。
  - Round 1 Minor：懒加载计数 1→2（补 `barcode-detector-utils.ts:21`）；`shared.mjs:22` → `:25-27/:26`；Phase 1 正样本去 `import('https://...')`（移 Phase 2）；fixture 命名避开 isTestFile；变量参数盲区入 Deferred But Adjudicated（watch-only residual）。
  - Round 2 Minor：懒加载计数补全为 15 处（2 包名 + 13 相对路径）；fixture 扫描根路径陷阱注明；Phase 2 exit 收窄（`pnpm check` 全链归 Closure Gates）。

## Closure Gates

- [x] `check:audit-renderer-browser-io` 作用域覆盖 14 个 renderer 包且零命中
- [x] `import()` 远程模块规则落地，type import / 本地懒加载零假阳性
- [x] `find-renderer-browser-io.test.ts` committed 回归测试落地并纳入 `pnpm test:scripts`
- [x] `pnpm check` 全链绿（`check:oversized-code-files` 既有 pre-existing 登记债除外）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 缺陷（本 plan 无 confirmed live defect 面，工具修复；变量参数盲区已显式 adjudicated）
- [x] `pc-index.md:362` 与 roadmap `O-P2-2` 行已同步 live 状态
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 变量参数动态 import 逃逸面（import(someUrlVar)）

- Classification: `watch-only residual`
- Why Not Blocking Closure: URL 字面量限制是避免 type import 假阳性面的必要取舍；变量参数形态（`import(urlVar)`/`import(getRemoteUrl())`）与 fetch 规则不对称（`\bfetch\s*\(` 对变量参数同样命中），但 renderer 包无任何变量动态 import 现例（live grep 零命中），且闭合需 AST 语义分析（本 plan Non-Goals）；门禁守护「远程模块直连」主要面已由字面量规则覆盖。
- Successor Required: `no`（未来若出现变量形态现例或 AST 扫描升级再评估）

## Non-Blocking Follow-ups

- 若复验中发现 4 个新覆盖包存在真实直连 IO（预期零），修复记录进审计卡与 daily log，不构成本 plan 阻塞（当前零命中已实证）。
- `find-event-dispatch-without-ctx.mjs` 等其他审计脚本若同为零命中 gate，可参考本 plan 的 committed 测试模式补测试（优化候选，非本 plan 义务）。

## Closure

Status Note: 独立子 agent closure-audit pass（approved，2026-08-07）——live repo 复核：① `scripts/audit/find-renderer-browser-io.mjs:127` 作用域正则已放宽为 14 个 renderer 包（`flux-renderers-*` 10 + flow-designer-renderers + spreadsheet-renderers + report-designer-renderers + word-editor-renderers），RULES（`:6-57`）含第 10 条 `renderer-remote-dynamic-import`（URL 字面量形态 `\bimport\s*\(\s*(?:['"`](?:https?:)?\/\/|['"`]data:|['"`]blob:)`，配合 `isCodePosition`排除字符串/注释出现）；② committed 回归测试`scripts/**tests**/find-renderer-browser-io.test.ts`4 用例（作用域正/负样本 + import() 正/负样本，execFile 实跑脚本 +`scripts/**tests**/fixtures/inv1-browser-io/`fixture 临时 stage 到真实包目录执行）纳入`pnpm test:scripts`；③ 文档同步 `pc-index.md:362`（14 包 + import() 规则 + committed 测试登记）与 roadmap `O-P2-2`行`[x]`；④ 实测复核：`pnpm check:audit-renderer-browser-io` 全仓零命中 exit 0、`pnpm test:scripts` 3 files/6 tests 全绿、`pnpm check`链 11 项 exit 0（仅`check:oversized-code-files` 为既有 12 文件 pre-existing 登记债，零新增）、`pnpm typecheck`/`pnpm build`/`pnpm lint` 32/32、`pnpm test` 59/59 task 全绿；deferred 分类诚实（变量参数 import 盲区 = watch-only residual，无静默降级）；五处一致性（Plan Status/3 Phase Status/Phase Exit Criteria/Closure Gates/Closure evidence）核对通过。

Closure Audit Evidence:

- Auditor / Agent: mission-driver CLOSURE_VERIFY 独立 fresh session（closure-audit，不复用执行 session 上下文）
- Evidence: ① live 代码核验——`scripts/audit/find-renderer-browser-io.mjs` 作用域正则（:127 覆盖 14 包）+ `renderer-remote-dynamic-import` 规则（:52-56）+ `isCodePosition` 过滤；② committed 测试 `scripts/__tests__/find-renderer-browser-io.test.ts` 4 用例断言命中/不命中行为 + fixtures `inv1-browser-io/{flow-designer-renderers,nop-debugger,remote-dynamic-import,import-negatives}-fixture.ts`；③ 文档同步核验：`docs/audits/per-component/pc-index.md:362` 作用域描述 14 包 + `docs/backlog/component-audit-roadmap.md:261` O-P2-2 行 `[x]` 附收口注记 + `docs/logs/2026/08-07.md:5-12` 执行记录（红→绿过程、4 包正样本实证、附带修复 check-package-css-exports 断言过期）；④ fresh 实测复核：`pnpm check:audit-renderer-browser-io` exit 0 零命中、`pnpm test:scripts` 3 files/6 tests 绿、`pnpm check` 链 11 项逐项 exit 0（oversized 12 文件 = 既有 pre-existing 登记清单逐项对照零新增）、`pnpm typecheck`/`build`/`lint` 32/32 绿、`pnpm test` 59/59 task 绿；⑤ anti-hollow：测试经 execFile 实跑真实门禁脚本而非 mock，规则与作用域均在运行时路径生效；⑥ deferred 项分类诚实（watch-only residual 附 Why Not Blocking Closure：URL 字面量限制是避免 type import 假阳性面的必要取舍 + live grep 零变量 import 现例）。

Follow-up:

- no remaining plan-owned work
