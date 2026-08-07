# 1 审计工具与门禁治理（manifest-deps 未跟踪扫描 / raw-schema-reads 块注释盲区 / browser-io 夹具目录污染）

> Plan Status: completed
> Mission: component-audit
> Work Item: P2-backlog:audit-tooling-gates
> Last Reviewed: 2026-08-08
> Source: `docs/audits/2026-08-07-1747-multi-audit-component-audit.md`（01-02/03-03/14-1）、`docs/backlog/component-audit-roadmap.md` Follow-up Backlog「2026-08-07-1747 两轮审计 P2」
> Related: `docs/plans/2026-08-07-1023-1-inv1-browser-io-gate-coverage-remediation.md`（completed，find-renderer-browser-io 门禁与夹具出处）、`docs/plans/2026-08-07-1023-2-flux-bundle-boundary-and-metadata-integrity.md`（completed，check-workspace-manifest-deps 新跨包相对导入规则出处）、`docs/plans/2026-08-07-2228-3-runtime-action-form-p2-remediation.md`（completed，本批 3 条为其余工程治理轮次）

## Purpose

把 `docs/backlog/component-audit-roadmap.md` Follow-up Backlog「2026-08-07-1747 两轮审计 P2」中 **audit 工具与门禁自身质量** 的 3 条 P2 收口：`check-workspace-manifest-deps` 未跟踪文件逃逸扫描（01-02）、`check:audit-runtime-raw-schema-reads` 扫描器块注释盲区 + `as T).schema` 形态漏检（03-03）、`find-renderer-browser-io.test.ts` 夹具写入真实包目录的污染风险（14-1）。全部为已确认的工具链缺陷（无 P0/P1），按「工具修复 + committed 脚本测试」闭环修复。

## Current Baseline

- **`check-workspace-manifest-deps` 只扫 git 已跟踪文件**（01-02，确定）：`scripts/check-workspace-manifest-deps.mjs:22-30` `getTrackedFiles()` 仅 `git ls-files`（不含未跟踪文件）——工作区新建未 `git add` 的 src 文件中的跨包相对导入（`../../ui/src/...`）在本地 `pnpm check` 不报红；拆分/迁移中途态恰是此类导入最易混入的时机。缓解因素：CI 运行时文件均已提交（必被扫到）、Husky pre-commit 在 staging 后运行——属"延迟发现"而非"永不发现"。无既有脚本单测（`scripts/__tests__/` 无 manifest-deps 测试文件）。
- **raw-schema-reads 扫描器块注释盲区 + 真实读取形态漏检**（03-03，确定）：`scripts/audit/rules.mjs:496-510` `filterMatch` 仅识别 `//` 行注释（`lineText.includes('//')` 判定），不识别 `*` 块注释行——任何含 `props.schema` 的 JSDoc 块注释行都会误报（实锤：`crud-renderer-schema-builders.ts:128` JSDoc 行命中）；同时 `\btemplateNode\.schema\b`/`\bprops\.schema\b` 模式不匹配 `(n as TemplateNode).schema` 形态（实锤：`crud-renderer-schema-builders.ts:115` 真实读取漏检）。该命中经独立复核判定不构成 compile-once 违规（region handle 的 schema 组合/搬运），故本 plan 只修工具形态匹配，不改变该处代码语义。
- **find-renderer-browser-io 测试夹具写入真实包目录**（14-1，确定）：`scripts/__tests__/find-renderer-browser-io.test.ts:14-33` `stageFixture()` 将含直接 fetch()/远程 import() 的夹具写入 `packages/*/__inv1_scan_fixture__`，afterEach 正常清理；`scripts/audit/shared.mjs:11-16` `ignoreDirectoryNames` 不含该目录——测试进程被中断（CI 超时/kill -9）时残留夹具让真实门禁 `check:audit-renderer-browser-io` 永久变红直到手工清理；`stagedDirs` 为模块顶层可变数组。当前无残留（afterEach 正常执行过）。**关键约束**：门禁 `find-renderer-browser-io.mjs:118-132` 只扫描 `rootDir/{apps,packages,tests}`（`collectSourceFiles` 在 `shared.mjs:43-45` 遍历时跳过 `ignoreDirectoryNames`），测试 harness exec 真实门禁并断言 `rejects`——因此夹具若移到扫描根之外或把 `__inv1_scan_fixture__` 加入 ignore 列表，正例测试将无法通过（门禁根本看不到夹具）；必须给门禁加扫描根覆盖（env-var override）才能在临时目录托管夹具的同时保持 exec-真实门禁的测试语义（见 Phase 3 设计）。
- 验证基线：`check:workspace-manifest-deps`/`check:audit-renderer-browser-io` 在 `pnpm check` 聚合链（package.json:7）且命中即 exit 1；`check:audit-runtime-raw-schema-reads`（package.json:49 独立脚本）**不在聚合链内**，且其底层 `runScanner`（shared.mjs:394-397）只打印不 exit 非零——该门禁的验证依赖 stdout 检查 + committed 脚本测试（判别力由测试锁定，非 exit code）；脚本测试走 `pnpm test:scripts`（vitest.scripts.config.ts，`scripts/__tests__/**/*.{test,spec}.ts`，node env）。

## Goals

- `check-workspace-manifest-deps` 扫描范围覆盖未跟踪源文件，拆分/迁移中途态的跨包相对导入本地即报红。
- `check:audit-runtime-raw-schema-reads` 零块注释误报、`as TemplateNode).schema`/`as BaseSchema).schema` 形态可检出（含 committed 回归测试锁定判别力）。
- `find-renderer-browser-io` 测试夹具不再写入真实包目录（env 扫描根覆盖到临时目录树，目录名避开 ignore 集合），`stagedDirs` 局部化。
- 三条 roadmap Follow-up Backlog 条目勾选并注明 plan 引用。

## Non-Goals

- 不改变 `crud-renderer-schema-builders.ts:115/:128` 的业务代码语义（已裁定为合法 region schema 组合，非 compile-once 违规；工具修复后该处若被检出为命中，按 allowlist/正常化路径裁决，不做代码语义变更）。
- 不为 manifest-deps 增加「声明但未引用」反向检查（03-02 的可选建议，归 plan 2 裁决）。
- 不重跑全量 e2e；验证以 `pnpm test:scripts` + `pnpm check` + focused 单测为准。

## Scope

### In Scope

- `scripts/check-workspace-manifest-deps.mjs`：`getTrackedFiles` 合并 `git ls-files --others --exclude-standard` 未跟踪源文件（排除项保持 dist/node_modules 过滤）；补脚本单测（`scripts/__tests__/check-workspace-manifest-deps.test.ts`，仿 `find-event-dispatch-without-ctx.test.ts` 先例——真实包目录暂存未跟踪夹具 + exec 真实门禁，不采用 temp git repo）。
- `scripts/audit/rules.mjs`：`filterMatch` 增加 `*` 块注释行排除；patterns 补充 `as TemplateNode).schema`/`as BaseSchema).schema` 形态匹配；`:115` 确定性命中经窄分支排除（仿 variant-field 先例）。
- `scripts/__tests__/`：补 raw-schema-reads 扫描器合成夹具测试（块注释负例 + `as T).schema` 正例），仿既有 `scripts/__tests__/find-event-dispatch-without-ctx.test.ts` 风格。
- `scripts/audit/find-renderer-browser-io.mjs`：支持 `FLUX_AUDIT_SCAN_ROOT` env 覆盖（M1 约束：不能仅移夹具/加 ignore——collectSourceFiles 在任意递归层级跳过 ignore 目录名，加 ignore 会连临时扫描根内的同名目录一起跳过导致正例失效；须换扫描根 + 临时树使用非 ignore 目录名）。
- `scripts/__tests__/find-renderer-browser-io.test.ts`：夹具改临时目录树 + env 扫描根覆盖（目录名避开 ignore 集合），`stagedDirs` 局部化。
- Roadmap Follow-up Backlog 三条勾选 + daily log 登记。

### Out Of Scope

- `crud-renderer-schema-builders.ts` 代码语义调整。
- manifest-deps「声明但未引用」反向检查（归 `2026-08-08-0150-2`）。
- 其他 audit 工具（styling-suspects/performance-suspects 等）的同类盲区排查。

## Failure Paths

不适用（纯工具/测试基建修复，无外部集成与用户可见失败路径；错误行为由脚本测试断言锁定）。

## Test Strategy

本档选择：`必须自动化`（工具规则变更 + 门禁行为：先写失败/合成夹具测试再实现，仿 `find-event-dispatch-without-ctx.test.ts`/`find-renderer-browser-io.test.ts` 先例；03-03 的 patterns 扩展与 01-02 的未跟踪扫描必须由 committed 脚本测试锁定判别力）。

## Execution Plan

### Phase 1 - check-workspace-manifest-deps 未跟踪文件扫描（01-02）

Status: completed
Targets: `scripts/check-workspace-manifest-deps.mjs`、`scripts/__tests__/check-workspace-manifest-deps.test.ts`

- Item Types: `Fix | Proof`

- [x] Proof：新增 `scripts/__tests__/check-workspace-manifest-deps.test.ts`——仿 `find-event-dispatch-without-ctx.test.ts:16-33` 先例（exec 真实门禁 + 真实包目录内暂存夹具 + afterEach 清理）：在真实包 `packages/<pkg>/src/` 下暂存一个**未跟踪**（不 git add）的夹具文件，内容为跨包相对导入（如 `import { x } from '../../ui/src/index.js'`——从 `packages/<pkg>/src/` 出发经 `../../` 到达 `packages/ui/`；以 live 门禁规则实际匹配形态为准）；先红（修复前 `getTrackedFiles` 只见已跟踪文件，门禁不报 → 测试断言 exit 0 而预期 exit 1）。**不采用临时 git repo 方案**（`check-workspace-manifest-deps.mjs:9-10` 从 `__dirname` 硬编码 `rootDir` 且 :162-171 读取真实仓库文件，temp git repo 对脚本不可见；stub execFile 需模块导出而当前无）。
- [x] Fix：`getTrackedFiles()` 双源合并——`git ls-files` + `git ls-files --others --exclude-standard`，去重后统一走既有过滤链（packages/ 前缀、src/ 包含、ts/tsx、dist 排除）。夹具文件在 `packages/<pkg>/src/` 下、`.gitignore` 无匹配模式（当前仓库 0 未跟踪 src 文件，无干扰），`--exclude-standard` 不滤掉它。
- [x] Proof：脚本测试转绿——未跟踪夹具文件的跨包相对导入被检出（门禁 exit 1 且 stdout 含夹具路径）；已跟踪文件行为不变（零回归）；排除项（dist/.d.ts 及 git 忽略集）仍被过滤。afterEach 清理夹具，`rg "__manifest_scan_fixture__|manifest_scan" packages/` 零残留。

Exit Criteria:

- [x] `scripts/__tests__/check-workspace-manifest-deps.test.ts` 通过：未跟踪文件跨包相对导入检出用例先红后绿（exec 真实门禁语义）
- [x] `pnpm test:scripts` 全绿；`pnpm check:workspace-manifest-deps` exit 0（真实仓库零命中不变）

### Phase 2 - raw-schema-reads 扫描器块注释排除 + as T).schema 形态（03-03）

Status: completed
Targets: `scripts/audit/rules.mjs`、`scripts/__tests__/find-runtime-raw-schema-reads.test.ts`（新建）

- Item Types: `Fix | Proof`

- [x] Proof：新建扫描器合成夹具测试——负例（JSDoc 块注释含 `props.schema` 文本的行不得命中）+ 正例（`(n as TemplateNode).schema`/`(v as BaseSchema).schema` 真实读取必须命中），先红锁定当前盲区。
- [x] Fix：`rules.mjs` `filterMatch` 增加块注释行排除（行内容剥除 `/*...*/`/`* ...` 块注释段后判定，或按 `lineText.trim().startsWith('*')` + 块注释状态机排除）；patterns 增加 `\bas\s+TemplateNode\)\.schema\b`/`\bas\s+BaseSchema\)\.schema\b` 形态。
- [x] Fix：真实仓库复跑 `pnpm check:audit-runtime-raw-schema-reads`——`:128` 注释误报消失；`:115` **确定性命中**（`(n as TemplateNode).schema` 是全仓唯一 `as X).schema` 形态，新 pattern 必然匹配），在 `filterMatch` 加**窄分支排除**（仿 variant-field 先例 `rules.mjs:518-532` 的 narrow path 分支，不要宽泛 allowlist）并注明裁决（region handle 的 schema 组合/搬运，非 compile-once 违规，与 audit 已裁定一致）。

Exit Criteria:

- [x] 合成夹具测试全绿（块注释负例不命中、`as T).schema` 正例命中），先红后绿
- [x] `pnpm check:audit-runtime-raw-schema-reads` stdout 检查：`:128` 误报行消失、`:115` 命中行经窄分支排除后不再输出（该门禁只打印不 exit 非零，判别力由合成夹具测试锁定）；`pnpm check` 聚合 exit 0 零新增命中

### Phase 3 - browser-io 测试夹具目录污染治理（14-1）

Status: completed
Targets: `scripts/audit/find-renderer-browser-io.mjs`、`scripts/__tests__/find-renderer-browser-io.test.ts`

- Item Types: `Fix | Proof | Decision`

- [x] **Design Decision（先于实施，M1 + M-A 约束）**：门禁 `find-renderer-browser-io.mjs:118-132` 只扫描 `rootDir/{apps,packages,tests}`，且 `collectSourceFiles`（shared.mjs:43-45）遍历时**在每个递归层级**跳过 `ignoreDirectoryNames` 中的目录名（与扫描根指向无关）——因此：①不能简单把夹具移出扫描根（正例断言 `rejects` 永不成立）；②**不能**给 ignore 列表加 `__inv1_scan_fixture__` 的同时在临时扫描根镜像里复用同名目录（正例同样被跳过）；③唯一自洽方案是 **scan-root 环境变量覆盖 + 临时目录树使用不在 ignore 集合中的目录名**。`__inv1_scan_fixture__` ignore 兜底**不实施**（与临时树命名冲突，且夹具已移出真实包目录后无残余可兜底——残余风险由"测试只写临时目录"的构造消除）。
- [x] Fix：`scripts/audit/find-renderer-browser-io.mjs` 支持 `FLUX_AUDIT_SCAN_ROOT` env 覆盖（扫描根 + 相对路径基准双切换：`main()` 扫描 `scanRoot/{apps,packages,tests}`，相对路径相对 `scanRoot` 计算，保持 `packages/<pkg>/...` 形态通过 :127 正则）；`scripts/__tests__/find-renderer-browser-io.test.ts` `stageFixture` 改为在**临时目录树**（`os.tmpdir()/flux-inv1-scan-fixtures-*`，目录名避开 ignore 集合）中镜像 `packages/<pkg>/<file>` 结构（**不使用** `__inv1_scan_fixture__` 目录名），`runGate()` 带 `FLUX_AUDIT_SCAN_ROOT=<临时根>` 执行；`stagedDirs` 改 `beforeEach` 内局部变量（消除模块顶层可变数组）。
- [x] Proof：全部既有用例（正例 `rejects` fetch/import()、负例非 renderer 包忽略、类型导入/字符串/注释负例）在临时扫描根语义下全绿——断言仅引用 rule id + 文件名（`find-renderer-browser-io.test.ts:38-61` 现状如此），无需断言字符串改动；执行后 `rg "__inv1_scan_fixture__" packages/` 零命中。
- [x] Proof：`pnpm test:scripts` 全绿 + 复跑 `pnpm check:audit-renderer-browser-io`（无 env 覆盖，扫描真实仓库）exit 0（真实仓库零命中）；env 覆盖管道判别力验证——手工在临时扫描根放入含 fetch() 的真实夹具 → 带 env 运行门禁 `rejects`（证明覆盖管道生效，非真空通过）。
- [x] **附加裁定（执行中发现，并入本 Phase）**：env 覆盖判别验证暴露 `find-renderer-browser-io.mjs:127` 扫描范围正则回归——`6d2497ea`（2026-08-07"widen 14 包"）把 `^packages\/flux-renderers-`（前缀，正确）改成 `^packages\/(flux-renderers-|...)\/`（要求 `flux-renderers-` 后紧跟 `/`，实际永远不匹配 → 10 个 `flux-renderers-*` 包被静默漏扫）。修订为 `^packages\/(?:flux-renderers-[^/]+|flow-designer-renderers|spreadsheet-renderers|report-designer-renderers|word-editor-renderers)\//`；带 isCodePosition 全量复扫真实仓库 **0 code-position 命中**（5 个 raw 命中全在字符串/注释），`check:audit-renderer-browser-io` 维持 exit 0；新增 committed 正例用例（`flux-renderers-data` 包下 fetch 夹具命中）同时锁定前缀覆盖 + env 判别力。

Exit Criteria:

- [x] 夹具测试全绿且不再写入 `packages/*/` 真实目录（测试中/测试后 `rg "__inv1_scan_fixture__" packages/` 零命中；`find-renderer-browser-io.test.ts` 中无 `join(rootDir, 'packages'` 夹具写入）
- [x] `pnpm check:audit-renderer-browser-io`（无 env）exit 0（真实仓库零命中）；`pnpm test:scripts` 全绿；`pnpm check` 聚合 exit 0

### Phase 4 - 收口

Status: completed
Targets: `docs/backlog/component-audit-roadmap.md`、`docs/logs/2026/08-08.md`

- Item Types: `Follow-up`

- [x] roadmap Follow-up Backlog 三条（01-02/03-03/14-1）勾选并注明本 plan 引用；daily log 登记执行记录与裁决（`:115` 登记依据）。

Exit Criteria:

- [x] roadmap 三条 `[ ]`→`[x]`（附 plan 引用）；daily log 收口记录已写

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 plan guide `Plan Review Rule`。

- Reviewer / Agent: 独立子 agent（fresh session）三轮：`ses_022a50bcdffeROFufofDviOZZV`（round 1）、`ses_0229b3e62ffeLzZejMPDOPhYCA`（round 2）、`ses_0229733b0ffeL3fwttr59hXvvO`（round 3）
- Verdict: `pass`（round 3；round 1 fail 1 Major M1 + 4 Minor，round 2 fail 1 Major M-A + 1 Minor，均修订后归零）
- Rounds: 3（≤2 轮共识目标因 M1/M-A 两轮 Major 实需 3 轮，最终零 Blocker/零 Major 达成共识）
- Findings addressed:
  - M1（round 1）：Phase 3 夹具迁移会破坏正例——修订为 `FLUX_AUDIT_SCAN_ROOT` env 覆盖 + 临时目录树 + 相对路径基准双切换（保留 exec 真实门禁语义）
  - M-A（round 2）：ignore 列表兜底会跳过临时扫描根内同名目录——修订为**不实施 ignore 兜底**，临时树目录名避开 ignore 集合，残留模拟改真实 fetch 夹具判别
  - Minor（round 1/2/3）：baseline 修正 raw-schema 门禁 exit 语义（只打印不 exit 非零）、Phase 1 弃 temp git repo 改未跟踪夹具 + exec 真实门禁、`:115` 改确定性命中 + 窄分支排除、twin 文件登记 follow-up、Item Types 补 Decision、`../../ui/src` 路径修正、排除项表述修正

## Closure Gates

> 关闭条件：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] 所有 in-scope 工具链缺陷（01-02/03-03/14-1）已修复并带 committed 脚本测试
- [x] `pnpm check` exit 0（零新增命中，含三条受影响门禁）；`pnpm test:scripts` 全绿
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 工具缺陷
- [x] roadmap Follow-up Backlog 三条已勾选并注明 plan 引用；daily log 已登记
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### manifest-deps「声明但未引用」反向检查（03-02 可选建议）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 03-02 的修复本体（graph 死依赖移除）由 plan `2026-08-08-0150-2` 收口，反向检查是防回归增强而非当前缺陷修复必需项；反向检查规则归 plan 2 的 Decision 裁决。
- Successor Required: `no`
- Successor Path: 由 `2026-08-08-0150-2`（若裁决实施）承接

## Non-Blocking Follow-ups

- 其他 audit 工具（styling-suspects/performance-suspects 等）的同类块注释盲区排查——本次仅修已知命中面，不影响当前门禁成立。
- `scripts/__tests__/find-event-dispatch-without-ctx.test.ts:14-33` 存在与 14-1 同根的 `stagedDirs` 模块顶层可变数组 + `packages/*/` 夹具写入模式（`__event_dispatch_ctx_fixture__`）——同型治理归未来工具治理轮次（本次不扩大范围）；若本次 Phase 3 的 env scan-root 方案落地良好，后续可按同机制迁移。

## Closure

Status Note: 三条 in-scope audit 工具/门禁缺陷（01-02 manifest-deps 未跟踪扫描、03-03 raw-schema-reads 块注释盲区 + as-cast 形态、14-1 browser-io 夹具目录污染）均已完成修复并带 committed 脚本测试（6 files / 14 tests 全绿），外加执行中发现的 :127 范围正则回归连带修复；全部验证命令（test:scripts / 三条门禁 / pnpm check / typecheck / build / lint / test）独立复跑通过，roadmap 三条已勾选、daily log 已登记，无被静默降级的 in-scope 项——closure audit 通过，plan 可关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure auditor（fresh session，无执行上下文，本审计会话）
- Evidence: 全量 live-repo 复核（2026-08-08）——①逐条核对 4 Phase 全部 item/Exit Criteria `[x]`、Phase Status 全 `completed`；②代码核对：`check-workspace-manifest-deps.mjs:22-75` getTrackedFiles 双源合并（ls-files + `--others --exclude-standard` 去重 + 统一过滤链）、`scripts/__tests__/check-workspace-manifest-deps.test.ts` exec 真实门禁 + 未跟踪夹具断言；`rules.mjs:493-554` 4 patterns 含两个 as-cast 形态 + getCodeTextForLine 代码文本判定 + crud-renderer-schema-builders 窄分支排除（:115 为全仓唯一 as-cast 形态，已核实）；`shared.mjs:29-92` getCodeTextForLine 跨行块注释状态机；`find-renderer-browser-io.mjs:18-24/:152` FLUX_AUDIT_SCAN_ROOT 扫描根+相对基准双切换、`flux-renderers-[^/]+` 前缀正则（回归源 6d2497ea:127 坏正则已核实）；browser-io 测试仅写 `os.tmpdir()` 临时树、stagedDirs beforeEach 局部化；`vitest.scripts.config.ts` fileParallelism:false。③命令复跑：`pnpm test:scripts` 6 files/14 tests 全绿；`pnpm check:audit-runtime-raw-schema-reads` "No suspect matches found." exit 0；`pnpm check:audit-renderer-browser-io` exit 0；`pnpm check:workspace-manifest-deps` exit 0；env 判别（临时根 + fetch 夹具 → `packages/flux-renderers-data/fetch-fixture.ts:2` exit 1）通过；`pnpm check` exit 0（oversized 仅 2 条既有 locale 豁免 en-US/zh-CN）；`pnpm typecheck`/`build`/`lint` 32/32、`pnpm test` 59/59 全 exit 0；`git ls-files --others --exclude-standard | grep -c 'packages/.*/src/.*\.ts'` = 0，`rg "__inv1_scan_fixture__|__manifest_scan_fixture__|__raw_schema_fixture__" packages/` 零残留。④roadmap 01-02/03-03/14-1 `[x]` 附 plan 引用；daily log `docs/logs/2026/08-08.md` 与实际执行一致；deferred 03-02 归 successor `2026-08-08-0150-2`（已存在），follow-up 同根 stagedDirs 模式归 `2026-08-08-0150-3`（已存在），无 in-scope 项静默降级。

Follow-up:

- no remaining plan-owned work
