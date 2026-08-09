# 1 Audit 工具治理轮次（扫描器注释盲区 + test-global-leaks const 变体识别 + test-support 隐式 hook 显式化 + host 包覆盖核对）

> Plan Status: completed
> Mission: component-audit-round2
> Work Item: tool-governance:scanner-blindspots-and-test-infra
> Last Reviewed: 2026-08-09
> Source: `docs/plans/2026-08-08-0150-1-audit-tooling-gates-remediation.md` Non-Blocking Follow-ups（其他 audit 工具同类块注释盲区排查）、`docs/plans/2026-08-08-0150-3-test-infra-patterns-remediation.md` Deferred But Adjudicated（`check:audit-test-global-leaks` 扫描器「const 变体模块态」识别增强）+ Non-Blocking Follow-ups（全仓 test-support 隐式 hook 排查）、`docs/plans/2026-08-08-2034-3-round2-dg-guard-sedimentation.md` Non-Blocking Follow-ups（test-global-leaks 对 host 包作用域有限——D3.1 登记）、`docs/logs/2026/08-08.md` D3.1 节门禁盲区登记
> Related: `docs/plans/2026-08-08-0150-1-audit-tooling-gates-remediation.md`（completed，raw-schema-reads 注释盲区修复先例）、`docs/plans/2026-08-08-2034-3-round2-dg-guard-sedimentation.md`（completed，event-dispatch-ctx 14 包扩展先例）、`docs/plans/2026-08-08-0150-3-test-infra-patterns-remediation.md`（completed，document-io-test-utils 显式 install 先例）

## Purpose

把第二轮各 plan 反复路由到「未来 audit 工具治理轮次」的 4 类工具链治理项收口：① 其他 audit 扫描器（styling-suspects / performance-suspects / broad-scope-selectors / react19-rules 等）的块注释/字符串盲区排查与修复（raw-schema-reads 0150-1 修复先例的横向扩展）；② `check:audit-test-global-leaks` 扫描器「const 变体模块态」识别增强（当前仅识别 `let` 模块顶层态）；③ 全仓 test-support 模块隐式 hook（import 即注册 beforeEach/afterEach）排查与显式化；④ test-global-leaks 类机制对 host 包扫描覆盖核对（D3.1 登记盲区，DG 已确认归本轮承接）。全部为工具链/测试基建质量收口，无产品行为变更；每类修复按 lesson 07「工具门禁沉淀法」带 committed 回归测试（`scripts/__tests__/`）先红后绿。

## Current Baseline

- **块注释盲区**（0150-1 只修了 raw-schema-reads 一条规则，其余行级规则未排查）：`scripts/audit/shared.mjs:29-92` 已有注释剥离工具 `getCodeTextForLine`（raw-schema-reads 修复时引入），但以下规则未使用它：
  - `scanBareDataSlotSelectors`（styling，`rules.mjs:311-334`）：逐行 `trimmed.includes('[data-slot')` 无任何注释剥离——**live 实锤假阳性**：`packages/flux-renderers-ai/src/styles.css:110` 为块注释内行（`/* P6 (A6)...` 自 106 行起跨至 110 行闭合），当前 `pnpm check:audit-styling-suspects` 输出含该行（142 命中/1 桶）。
  - `scanJsonStringifyChangeDetection`（performance，`rules.mjs:278-309`）：6 行窗口 `windowText` 无注释剥离——注释内含 `JSON.stringify(` 的窗口可假阳性（当前 22 命中无实锤注释命中，盲区结构存在）。
  - `scanBroadScopeSelectors`（reactive，`rules.mjs:251-276`）：正则 `\buseScopeSelector\s*\(/g` 无注释处理——注释含 `useScopeSelector(` 即假阳性（live 注释 `crud-renderer-load.ts:371`、`ai-chat.tsx:202/222` 均无 `(` 故未命中，盲区结构存在）。
  - `react19-rules.mjs` `scanRedundantReactMemo`/`scanRedundantUseCallback` 等：`windowText` 无注释剥离（仅 eslint-disable 特殊处理）。
  - 已注释安全者（盘点结论）：`scanThenWithoutCatch`/`scanCatchWithoutStructuredFailurePath`（经 `findMatchingParen`/`findMatchingBrace` → `scanBalanced`，`shared.mjs:171-243` 自带注释状态机）、raw-schema-reads（0150-1 已修）。
- **test-global-leaks const 变体**（0150-3 Deferred But Adjudicated，`optimization candidate`）：`scanTopLevelLets`（`shared.mjs:299-381`）仅匹配 `^let\s+` 模块顶层态，不识别 `const` 模块顶层可变容器（数组/对象/Map/Set 等）——14-2 `localStorageState` 即此形态（已显式化修复，故当前零命中面）；增强属工具演进，需先盘点再落规则（新增命中即新债务，须裁决/豁免）。
- **test-support 隐式 hook**（0150-3 Non-Blocking Follow-ups）：仓库显式先例 `packages/flow-designer-renderers/src/canvas-bridge-test-support.tsx:216` `installCanvasBridgeTestHooks()`（0150-3 已把 `document-io-test-utils` 显式化）；**live 核对模块顶层 `beforeEach`/`afterEach` 的 test-support 模块**：`flux-react/src/test-support-core.tsx:23`、`flux-renderers-form/src/test-support.tsx:172`、`flux-renderers-form-advanced/src/test-support.tsx:224`、`nop-debugger/src/controller-inspect-advanced.test-support.ts:5`、`report-designer-renderers/src/page-renderer.test-support.tsx:87/93`、`flow-designer-renderers/src/designer-page.test-support.tsx:77/85`、`flux-renderers-form-advanced/src/condition-builder/config-test-support.tsx:236`——每条需裁决「import 即注册是否合理」（模块只服务需要 hook 的测试 → 维持并记录；导出常量/纯 helper 被非 hook 测试引用 → 显式 install()）。
- **host 包覆盖盲区**（D3.1 登记 + DG follow-up）：`testLeakRules`（`rules.mjs:434-455`）include 为 `isTestFile`（无包限制），需 Proof 验证 4 host renderer 包测试文件实际被扫（`check:audit-test-global-leaks` 当前 47 命中/2 桶，命中含 host 包——`word-editor-renderers/src/__tests__/word-editor-page-actions.test.tsx:159` 在案）；DG 已把 event-dispatch-ctx 扩展到 14 包（`find-event-dispatch-without-ctx.mjs` 正则 + `FLUX_AUDIT_SCAN_ROOT` env），本轮以同类机制核对 test-global-leaks 是否仍有 host 盲区并闭合。
- 验证基线：`pnpm test:scripts` 6 files/18 tests 全绿（DG 终态）；`pnpm check` exit 0（28 项，oversized 2 豁免 + duplicates:detail 非门禁归因）；audit 计数桶（styling 142/1、performance 22/1、reactive 19/2、test-global-leaks 47/2）为 informational 桶（exit 0，判别力靠 committed 脚本测试）。

## Goals

- 全部行级 audit 规则具备与 raw-schema-reads 同级的注释/字符串剥离能力，块注释假阳性归零（`styles.css:110` 从 styling-suspects 输出消失），每类修复带 committed RED→GREEN 回归测试。
- `scanTopLevelLets` 扩展识别 `const` 模块顶层可变容器形态，新命中逐条裁决（豁免/修复），全量复扫零新增红项。
- 全仓 test-support 模块隐式 hook 逐条裁决：需要 hook 的模块显式 `installXxxTestHooks()` 化（仿 canvas-bridge/document-io 先例）或记录「模块级 hook 即契约」理由维持。
- test-global-leaks（及同族扫描器）对 4 host renderer 包的覆盖经 Proof 确认或闭合（带 committed 回归测试）。
- `pnpm test:scripts` 全绿 + 全量 `check:*` 零新增命中 + daily log 收口登记。

## Non-Goals

- 不改变任何产品代码行为（`packages/` 下非测试代码零变更；test-support 显式化只改测试侧结构）。
- 不重写 `rules.mjs` 架构、不引入 AST 解析（维持行级/窗口级扫描形态 + 注释剥离）。
- 不重跑全量 e2e（验证以 `pnpm test:scripts` + `pnpm check` + 受影响包 focused 单测为准）。
- 不处理 60Hz e2e 复测、CX-13+ 插入、industrial-hmi（均为人工确认/外部条件，非本轮）。

## Scope

### In Scope

- `scripts/audit/rules.mjs`：`scanBareDataSlotSelectors`、`scanJsonStringifyChangeDetection`、`scanBroadScopeSelectors` 注释/字符串剥离（复用 `getCodeTextForLine` 或等价实现）。
- `scripts/audit/react19-rules.mjs`：`scanRedundantReactMemo`/`scanRedundantUseCallback` 等窗口规则注释剥离。
- `scripts/audit/shared.mjs`：`scanTopLevelLets` 增加 `const` 模块顶层可变容器识别（数组/对象/Map/Set/可变引用的判定以 live 命中面为准）。
- `scripts/__tests__/`：上述每类修复的 committed 回归测试（合成夹具，先红后绿，仿 `find-event-dispatch-without-ctx.test.ts`/`find-renderer-browser-io.test.ts` 风格；夹具走临时目录镜像 + `FLUX_AUDIT_SCAN_ROOT` env 机制，对齐 DG 0150-1 stagedDirs 治理先例）。
- 全仓 test-support 模块隐式 hook 排查与裁决（清单见 Current Baseline，逐条落地显式化或记录维持理由）。
- host 包覆盖 Proof + 必要闭合（含 committed 回归测试）。
- daily log 登记 + lessons/checklist 如需（按实际产出）。

### Out Of Scope

- 非测试代码的产品行为变更。
- 扫描器架构重构或 AST 语义分析。
- 与工具治理无关的其他 deferred 项（60Hz 环境、CX-13+、工业 HMI、`check:duplicates:detail` 非门禁归因）。

## Failure Paths

不适用（纯工具/测试基建修复，无外部集成与用户可见失败路径；错误行为由 committed 脚本测试断言锁定，防回归靠 `pnpm test:scripts`）。

## Test Strategy

本档选择：`必须自动化`（门禁/扫描器规则变更：每类修复先写合成夹具失败测试再实现，committed 于 `scripts/__tests__/`；新增命中裁决后全量复扫锁零新增）。

## Execution Plan

### Phase 1 - 扫描器注释盲区全量盘点（Proof）

Status: completed
Targets: `scripts/audit/rules.mjs`、`scripts/audit/react19-rules.mjs`、`scripts/audit/shared.mjs`

- Item Types: `Proof`

- [x] 对全部 `scanWithContent`/`filterMatch` 规则逐条核对注释/字符串剥离能力，产出带 文件:行 证据的盲区清单（已知：styling `rules.mjs:311-329`、performance `rules.mjs:278-309`、broad-scope `rules.mjs:251-276`、react19 窗口规则；已安全：scanBalanced 系 + raw-schema-reads）。
- [x] 记录每条盲区的 live 影响面：现有输出中是否已含假阳性（`styles.css:110` 实锤）或仅结构盲区；写进盘点表。

Exit Criteria:

- [x] 盲区清单覆盖全部行级/窗口级规则，每条有 live 证据或结构盲区判定，盘点结论落在 plan 内

### Phase 2 - 行级规则注释剥离修复（Fix，test-first）

Status: completed
Targets: `scripts/audit/rules.mjs`、`scripts/audit/react19-rules.mjs`、`scripts/__tests__/`

- Item Types: `Fix | Proof`

- [x] RED：为每条盲区规则写合成夹具（块注释含目标 token 的负例 + 真实代码正例），`pnpm test:scripts` 先红。
- [x] Fix：`scanBareDataSlotSelectors`、`scanJsonStringifyChangeDetection`、`scanBroadScopeSelectors` 复用/等价实现 `getCodeTextForLine` 注释剥离；react19 窗口规则同样处理。
- [x] GREEN：`pnpm test:scripts` 全绿；`pnpm check:audit-styling-suspects` 输出中 `styles.css:110` 消失；全量复扫计数与基线对比零新增命中。

Exit Criteria:

- [x] committed 回归测试全绿（RED→GREEN 证据在 plan）
- [x] `styles.css:110` 假阳性从 styling-suspects 输出消失，全量 audit 桶零新增命中

### Phase 3 - test-global-leaks const 变体模块态识别（Fix，test-first）

Status: completed
Targets: `scripts/audit/shared.mjs`、`scripts/__tests__/`

- Item Types: `Fix | Decision | Proof`

- [x] RED：合成夹具（`const arr = []`、`const map = new Map()`、`const obj = { }` 模块顶层在测试文件中的正例 + `const` 原始值/`as const` 冻结负例）先红。
- [x] Fix：`scanTopLevelLets` 扩展 const 容器识别（判定规则以 live 命中面校准：仅可变容器，`Object.freeze`/`as const`/原始值排除）。
- [x] 全仓复扫：新命中逐条裁决（豁免登记或当场修复），零未裁决悬挂。

Exit Criteria:

- [x] committed 回归测试全绿 + 新命中裁决表零悬挂（每条 `landed | 豁免（带理由）`）
- [x] 全量复扫后 `check:audit-test-global-leaks` 计数与基线一致或新命中全部裁决落地

### Phase 4 - test-support 隐式 hook 排查与显式化（Fix/Decision）

Status: completed
Targets: `packages/flux-react/src/test-support-core.tsx`、`packages/flux-renderers-form/src/test-support.tsx`、`packages/flux-renderers-form-advanced/src/test-support.tsx`、`packages/nop-debugger/src/controller-inspect-advanced.test-support.ts`、`packages/report-designer-renderers/src/page-renderer.test-support.tsx`、`packages/flow-designer-renderers/src/designer-page.test-support.tsx`、`packages/flux-renderers-form-advanced/src/condition-builder/config-test-support.tsx`

- Item Types: `Fix | Decision | Proof`

- [x] 对 Current Baseline 清单 7 个模块逐一核对：模块是否导出纯常量/helper 被非 hook 测试引用（`rg "from '<module>'"` 消费面盘点）。
- [x] 每条裁决：有独立常量消费 → 显式 `installXxxTestHooks()`（仿 canvas-bridge/document-io 先例，常量导出与 hook 副作用解耦）；仅 hook 消费者 → 维持并记录理由。
- [x] 显式化模块的两个 importer 迁移 + 受影响包 focused 单测全绿（`rg '^beforeEach|^afterEach'` 模块顶层零命中，对齐 0150-3 document-io-test-utils 显式 install 先例）。

Exit Criteria:

- [x] 裁决表零悬挂（每条 `explicit-install | keep-with-reason`），显式化模块 `rg '^beforeEach|^afterEach' <file>` 模块顶层零命中
- [x] 受影响包 focused 单测全绿

### Phase 5 - host 包覆盖核对与闭合（Proof）

Status: completed
Targets: `scripts/audit/find-test-global-leaks.mjs`、`scripts/audit/rules.mjs`、`scripts/__tests__/`

- Item Types: `Proof | Fix`

- [x] Proof：验证 test-global-leaks 对 4 host renderer 包（flow-designer/spreadsheet/report-designer/word-editor renderers）测试文件的实际覆盖（含合成夹具正例——host 包测试文件模块顶层 `let` 是否被检出）。
- [x] 若发现盲区：修复 + committed 回归测试（对齐 DG event-dispatch-ctx 14 包扩展先例）；若已覆盖：记录 Proof 证据闭合 D3.1 登记。

Exit Criteria:

- [x] host 包覆盖结论（覆盖/已闭合）有 live 证据 + committed 测试锁定
- [x] `pnpm test:scripts` 全绿

### Phase 6 - 收口验证与登记（Proof）

Status: completed
Targets: `docs/logs/2026/08-09.md`

- Item Types: `Proof`

- [x] `pnpm test:scripts` 全绿 + 全量 `pnpm check` 零新增命中 + 受影响包 typecheck/test 复跑。
- [x] daily log 收口登记（本 plan 承接的 deferred 条目逐条回写来源 plan 的 Follow-up/Deferred 状态）。

Exit Criteria:

- [x] daily log 登记完成，本 plan 承接的 4 类 deferred 条目全部有终态

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，task `ses_01cde7235ffeJBoHnoE9tcGfiw`，2026-08-09）
- Verdict: `pass-with-minors`
- Rounds: 1（零 Blocker / 零 Major）
- Findings addressed: 引用准确性逐项 live 核对（getCodeTextForLine / 各规则行号 / styles.css:110 假阳性 / 7 个 test-support 模块 hook 行号 / test:scripts 6/18 全绿 / deferred 出处）全部确认；Minor×4 已修正——①styles.css 块注释实为 106-110 行；②ai-chat.tsx 第二处为 :222 非 :223；③scanBareDataSlotSelectors 函数体至 :334；④悬空引用「0142-2」改为 0150-3 document-io-test-utils 显式 install 先例

## Closure Gates

- [x] 全部 in-scope 扫描器盲区已修复并带 committed 回归测试，假阳性归零、零新增命中
- [x] test-global-leaks const 变体识别落地，新命中全部裁决（零悬挂）
- [x] test-support 隐式 hook 裁决表零悬挂，显式化模块行为等价
- [x] host 包覆盖盲区 Proof 结论在案（覆盖确认或已闭合）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 项
- [x] 受影响的 owner docs / daily log 已同步（本 plan 为纯工具链/测试基建，无 `docs/architecture/` 契约变更；`docs/logs/2026/08-09.md` 必更新）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 60Hz 环境 e2e 复测（gantt-perf/kanban-perf）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 本机 50Hz 主屏物理不可达 60Hz 阈值（D2/DV 均已归因记录），外部环境条件非本轮可执行。
- Successor Required: `no`

### CX-13+ 共性缺陷行插入

- Classification: `watch-only residual`
- Why Not Blocking Closure: roadmap Rule 规定新 work item 由人工确认后插入，AI 不自行增删（D1/D3.x/DG 已显式声明）。
- Successor Required: `yes`（人工确认后）

### `check:duplicates:detail` exit 1

- Classification: `watch-only residual`
- Why Not Blocking Closure: 无阈值 jscpd dump 固有行为，带阈值门禁 `check:duplicates` exit 0（D0/D1/DV 已归因）。
- Successor Required: `no`

## Non-Blocking Follow-ups

- ~~lessons 续写（如本轮沉淀新的扫描器盲区模式）：归后续 DG 类轮次，不阻塞本 plan。~~ **已由 lesson-11 plan 收口（2026-08-09）**（`docs/plans/2026-08-09-0917-1-round2-lesson-11-scanner-blind-spot-class.md`：`docs/lessons/11-scanner-false-positive-comment-string-stripping.md` 落地 + README 索引登记 + daily log 收口）。
- 其他包 test-support 模块若有新发现的同型隐式 hook：按本轮裁决表方法处理，登记 daily log。

## Closure

Status Note: 2026-08-09 执行完毕（mission-driver 完整执行）——6 Phase 全 completed：Phase 1 盲区盘点（逐规则核对 + live 影响面证据：styling `styles.css:110` 实锤假阳性、performance/react19/async 注释假阳性各 1-3 处、broad-scope 结构盲区）；Phase 2 注释剥离修复（`getCodeTextForLine`/`isCodePosition` 复用 + react19 `getCodeWindow`；committed 回归测试 `scripts/__tests__/find-tool-governance-gates.test.ts` 12 条 RED→GREEN（git stash 对照基线 7/12 先红、修复后 12/12 全绿）；`styles.css:110` 从 styling 输出消失；全量复扫对比：styling 142→141、performance 22→21、react19 517/5→514/4、async 227→226、reactive 19→19，全部为注释/字符串假阳性移除、零新增命中）；Phase 3 const 容器识别（`scanTopLevelLets` 扩展——判定规则以 live 命中面校准：仅可变容器 + 变异证据（`isMutatedConstContainer`：mutator 调用/成员赋值/`Object.assign`）+ 泛型构造器（`<() => void>` 箭头形态）支持；166 条未裁决粗命中校准归零、47 基线 + 11 条 landed（含 1 条字符串假阳性修复 -1 + 11 const 命中 = 57/2 终态，裁决表见下）；Phase 4 test-support 隐式 hook（7 模块裁决：1 显式化 + 6 维持并记录理由；`installFormAdvancedTestHooks()` 落地 + 79 importer 迁移，form-advanced 135 files/1050 tests 绿，`rg '^beforeEach|^afterEach'` 模块顶层零命中；2 个 meta 测试保持无 hook 消费证明解耦）；Phase 5 host 包覆盖（Proof：word-editor-renderers 9 命中 live 在案 + 其他 3 host 包经 brace-tracked 复扫确认零真实模块顶层态 = 覆盖成立无盲区 + committed 夹具锁定）；Phase 6 收口验证（`pnpm test:scripts` 7 files/30 tests 全绿 + `pnpm check` exit 0 + typecheck/build/lint 32/32 + `pnpm test` 59/59 全绿 + daily log 登记）。

**新命中裁决表（Phase 3，零悬挂）**——11 条 const 容器命中全部 `landed`（informational 桶，exit 0；每条理由）：

| 命中（file:line）                                 | 容器形态                       | 裁决   | 理由                                                                                           |
| ------------------------------------------------- | ------------------------------ | ------ | ---------------------------------------------------------------------------------------------- |
| `carousel-autoplay.test.tsx:113`                  | `new Set<(e)=>void>()`         | landed | 模块顶层监听器注册表（mock 环境），beforeEach clear 有界                                       |
| `g9-g18-composite-stability.test.tsx:31`          | `new WeakSet<object>()`        | landed | spy 去重注册表，弱引用无跨 case 保留（plan 表原记 :28，Phase 4 install 迁移 +3 行后 live :31） |
| `notice-bar-pause-a11y.test.tsx:16`               | `new Set<...>()`               | landed | 同上 mock 监听注册表，beforeEach clear                                                         |
| `barcode-input.test.tsx:25`                       | `{ values: {} }`               | landed | vi.mock 工厂闭包必须模块顶层引用 + beforeEach 重置                                             |
| `barcode-input.test.tsx:26`                       | `new Set<() => void>()`        | landed | vi.mock 工厂闭包依赖 + beforeEach clear                                                        |
| `gantt-keyboard.test.ts:5`                        | `{ tasks: new Map(...), ... }` | landed | renderHook 共享 mock store，per-test override 有界                                             |
| `doc-preview-page.test.tsx:10`                    | `{ mountedDocs: [], ... }`     | landed | bridge mock 状态，beforeEach reset                                                             |
| `word-editor-page-actions.test-support.tsx:92`    | `new Set<() => void>()`        | landed | test-support mock store 监听注册表（模块契约）                                                 |
| `word-editor-page-actions.test-support.tsx:113`   | `new Set<() => void>()`        | landed | 同上                                                                                           |
| `word-editor-page-host-scope.test-support.tsx:76` | `new Set<() => void>()`        | landed | 同上                                                                                           |
| `word-editor-page-host-scope.test-support.tsx:97` | `new Set<() => void>()`        | landed | 同上                                                                                           |

**test-support 隐式 hook 裁决表（Phase 4，零悬挂）**：

| 模块                                                                 | hook 位置                                 | 消费面盘点                                              | 裁决                 | 理由                                                                                                  |
| -------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------- |
| `flux-react/src/test-support-core.tsx:23`                            | afterEach(cleanup+restoreAllMocks)        | 12 消费文件全部 render                                  | keep-with-reason     | 全部为渲染测试，cleanup/restore 为共同契约；无常量-only 消费者                                        |
| `flux-renderers-form/src/test-support.tsx:172`                       | beforeEach(harness.reset)                 | 8 直接 + 58 经 form-test-support 转发，全部 render      | keep-with-reason     | 全部为渲染测试，harness reset 为契约；无非 hook 消费者                                                |
| `flux-renderers-form-advanced/src/test-support.tsx`                  | beforeAll/afterAll/beforeEach + i18n init | 81 直接；2 个非 render（isolation/polyfills meta 测试） | **explicit-install** | `installFormAdvancedTestHooks()` 落地 + 79 importer 迁移；2 meta 测试无 hook 消费证明常量/helper 解耦 |
| `nop-debugger/src/controller-inspect-advanced.test-support.ts:5`     | beforeEach(body 清空)                     | 2 消费文件均 render                                     | keep-with-reason     | 仅 createNopDebugger 导出 + 两 render 消费者                                                          |
| `report-designer-renderers/src/page-renderer.test-support.tsx:87/93` | beforeEach(i18n)+afterEach(cleanup)       | 4 消费文件均 render                                     | keep-with-reason     | 全部渲染 + i18n/cleanup 契约                                                                          |
| `flow-designer-renderers/src/designer-page.test-support.tsx:77/85`   | beforeEach(mockClear+i18n)+afterEach      | 6 消费文件均 render                                     | keep-with-reason     | 全部渲染 + mock 清理契约                                                                              |
| `condition-builder/config-test-support.tsx:236`                      | afterEach(cleanup)                        | 6 消费文件均 renderGroup                                | keep-with-reason     | 全部渲染，cleanup 契约                                                                                |

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session）`ses_01c9246edffetSmAsTo6HtaeNL`，2026-08-09
- Evidence: verdict `approved`——零 Blocker/Major，1 Minor（adjudication 表 `g9-g18-composite-stability.test.tsx` 行号漂移 :28→:31，Phase 4 install 迁移 +3 行所致；命中/裁决/扫描均真实，已修正 plan 表）。逐项核对：A. plan 文本——6 Phase 全 `Status: completed` + in-scope item/Exit Criteria 全 `[x]` + `> Plan Status: completed` + Closure 裁决表零悬挂；B. Phase 2——rules.mjs 三规则 getCodeTextForLine/isCodePosition + react19 getCodeWindow + shared isCodePosition/scanRootOverride，`styles.css:110` grep = 0，计数全 ≤ 基线（styling 141/1、perf 21/1、react19 514/4、reactive 19/2、async 226/3）零新增，test:scripts 7/30 全绿（12 条 committed 用例 + 双夹具目录）；C. Phase 3——isMutatedConstContainer + 泛型构造器，live 57/2，11 条 landed 命中 10/11 行号精确 + 1 漂移已修正；D. Phase 4——installFormAdvancedTestHooks 导出 + 模块顶层 hook 零命中 + 79 importer 迁移 + 2 meta 测试零调用（解耦证明），form-advanced 135 files/1050 tests 绿；E. Phase 5——word-editor 9 命中 live 在案 + host fixture 检出；F. Phase 6——typecheck/build/lint --force 32/32（0 cached）+ test 59/59 + check exit 0（28 项）+ test:scripts 7/30 全部实测绿；G. docs 回写——daily log 08-09 新条目 + roadmap D2 行内注记 + 0150-1/0150-3/2034-3 来源条目 landed 标注 + project-context 工具治理注记；H. 零产品行为变更——diff 仅 scripts/audit + scripts/**tests**（新）+ form-advanced test-support 及 79 测试文件（hook install 行）+ docs。收口动作由执行 session 依本证据勾选 Closure Gates 审计门禁项（按既有 executor-backfill 机制，DV/DG/D3.2 同款）。

Follow-up:

- （无新增——lessons 续写按 plan Non-Blocking Follow-ups 归后续 DG 类轮次，已由 lesson-11 plan 收口（2026-08-09）；本 plan 收口的 4 类 deferred 条目已在 daily log 回写来源 plan 状态）
