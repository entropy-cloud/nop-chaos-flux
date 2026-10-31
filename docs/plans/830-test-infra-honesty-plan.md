# 830 测试基建诚实性收口（deep-audit 2026-11-01 T1-T7）

> Plan Status: completed
> Last Reviewed: 2026-11-01
> Source: `docs/audits/deep-audit-2026-11-01.md` §1、§2（T1-T6）+ 评审轮发现 T7（test:scripts 未接线）
> Related: plan 594（contract-honesty harness 合并）、plan 807（ELOOP 原登记为环境红）

## Purpose

让 `pnpm test` 的通过数与契约守卫真实反映被测面：修正 contract-honesty 扫描面错误与 walker 健壮性、消除 barrel 聚合文件导致的套件重复注册、删除/转正零断言调试测试、让静默空转的扫描器 fail-closed，并为每一类加上防回归机制。

## Current Baseline

- **T1**：`packages/flux-react/src/test-support/contract-honesty-harness.ts:60-76` `readSourceFiles()` 以 `statSync`（跟随符号链接）递归，不排除 `node_modules`/`dist`。`packages/flux-renderers-content/src/contract-honesty.test.ts:8` 与 `packages/flux-renderers-layout/src/contract-honesty.test.ts:8` 位于 `src/` 却传 `srcDir: ${import.meta.dirname}/..`（= 包根）；basic/data/form/form-advanced 的 wrapper 位于 `src/__tests__/`（`..` = src，正确）。2026-11-01 已删除触发 ELOOP 的 `.pnpm` 内自引用链接（环境修复，非仓库改动）；探针实测：两 wrapper 改为 `srcDir: import.meta.dirname` 后均 3/3 通过（无被掩盖的真实违规）。
- **T2**：13 个 barrel 测试文件只含 `import './…test'` 语句（实测清单）：`flux-react/src/schema-renderer-runtime.test.tsx`、`flux-renderers-basic/src/index.test.tsx`、`flux-renderers-basic/src/__tests__/basic-page-layout.test.tsx`、`flux-renderers-data/src/index.test.tsx`、`flux-renderers-form/src/index.test.tsx`、`flux-renderers-form-advanced/src/__tests__/composite-form.test.tsx`、`flux-renderers-form-advanced/src/condition-builder/config-integration.test.tsx`、`flux-renderers-form-advanced/src/detail-view/detail-field.test.tsx`、`flux-renderers-form-advanced/src/detail-view/detail-view.test.tsx`、`flux-renderers-form-advanced/src/variant-field/variant-field.test.tsx`、`report-designer-core/src/index.test.ts`、`spreadsheet-core/src/core.test.ts`、`spreadsheet-core/src/new-commands.test.ts`。`vitest.shared.ts:36` include `**/*.{test,spec}.ts(x)` 同时收集 barrel 与被导入文件。13 个文件分布于 **7** 个包（flux-react、flux-renderers-basic、flux-renderers-data、flux-renderers-form、flux-renderers-form-advanced、report-designer-core、spreadsheet-core）。实跑：spreadsheet-core 全包 339 测试，排除两个 barrel 后 236。仓库内存在合法的 `.test-support` 模块导入（如 `./basic-page-layout.test-support.js`），门禁不得误伤。
- **T3**：`packages/flux-renderers-form/src/__tests__/debug-combobox-dom.test.tsx` 单个 it、零 `expect`、10 处 `console.log`。
- **T4**：`packages/flux-renderers-ai/src/__tests__/contract-honesty.test.ts:20-24` `listSourceFiles` 对 `readdirSync` 异常 `catch { return out; }`，8 个守卫均为 `for (file of list) expect(...)`。
- **T5**：`packages/ui/src/__tests__/styling-no-helper-css.test.ts:9` `resolve(process.cwd(), '../..')`。
- **T6**：`packages/flux-core/src/renderer-contract-types.test.ts`（3 it）与 `packages/flux-renderers-scheduling/src/scheduling-boundary-narrowing.test.ts`（27 it）仅含 `expectTypeOf`；`vitest.shared.ts` 未开启 `typecheck`。
- **T7**：`pnpm test:scripts`（`vitest.scripts.config.ts`，include 仅 `scripts/__tests__/**/*.{test,spec}.ts`）收集 30 个测试文件（29 个门禁脚本测试 + 1 个自跳过的 `.optional.` 文件，186 tests），但**不在 `pnpm check`/`pnpm test`/CI 任何一处**（根 `package.json:18` check 链、`:80` test、`.github/workflows/*.yml` 均无）——守护门禁本身的测试从未被自动执行。2026-11-01 实跑 29 passed + 1 skipped（optional），耗时约 103s。
- 全量单测基线：86/86 任务全绿，报告 17,367 passed（含 T2 重复）。

## Goals

- contract-honesty 扫描面只覆盖各包 `src/` 源码，walker 不跟随符号链接、剪枝 `node_modules`/`dist`，并有判别性测试证明。
- 每个测试套件只被注册一次；新增 barrel 被门禁拒绝。
- 仓库内不存在零断言的调试测试；ai/ui 守卫在扫描根缺失时 fail-closed；门禁脚本测试（test:scripts）随 `pnpm check` 自动执行。
- 记录修正后的真实唯一测试数作为新基线。

## Non-Goals

- 不改 contract-honesty 的判定语义（per-renderer 解析、H7 探针）。
- 不处理 react19 冗余 memo、as-any 等前序已登记的计数类债务。
- 不调整 e2e 用例；不改 `vitest.shared.ts` include 规则。

## Scope

### In Scope

- harness `readSourceFiles` 健壮化 + content/layout wrapper `srcDir` 修正 + harness 回归测试。
- 删除 13 个 barrel 测试文件；新增 `scripts/check-test-barrels.mjs` 门禁（拒绝 `*.test.ts(x)` 导入另一个 `.test` 模块）接入 `pnpm check`，附 `scripts/__tests__/check-test-barrels.test.ts` 用例。
- T7：`pnpm test:scripts` 接入 `pnpm check` 链末尾（CI 的 check job 随之执行）。
- T3 处置、T4/T5 fail-closed 修正、T6 裁决。
- daily log 记录新测试基线。

### Out Of Scope

- 其他包的测试内容改写；vitest 全局配置的 include 规则改动（barrel 以删除而非排除解决，避免配置层特例）。

## Failure Paths

不适用：纯测试基建与门禁脚本，无运行时错误处理/API 面。

## Test Strategy

必须自动化：本计划修的就是"测试给出虚假信心"，每项修复都需判别性测试（旧实现下挂、新实现下过）。

## Execution Plan

### Phase 1 - contract-honesty 扫描面（T1）

Status: completed
Targets: `packages/flux-react/src/test-support/contract-honesty-harness.ts`、`packages/flux-renderers-{content,layout}/src/contract-honesty.test.ts`、`packages/flux-react/src/__tests__/contract-honesty-source-walk.test.ts`、`types/node-fs.d.ts`

- Item Types: `Proof | Fix`

- [x] Proof：新增 `packages/flux-react/src/__tests__/contract-honesty-source-walk.test.ts`——运行期临时目录构造 `node_modules/dep/index.ts`、`dist/button.d.ts`、`renderers/loop -> <root>` 自引用链接，断言收集结果恰为 `['renderers/button.tsx']`；旧 walker 实跑抛出与 §1 完全相同的 ELOOP。walker 以 `readContractHonestySourceFiles` 名义从 harness 模块导出（仅 test-support 目录内，不进包主入口）
- [x] Fix：walker 改用 `readdirSync({withFileTypes:true})`，跳过符号链接与 `node_modules`/`dist` 目录（移除 `statSync`）
- [x] Fix：content/layout wrapper `srcDir` 改为 `import.meta.dirname`
- [x] Fix（执行期补充）：仓库级类型 shim `types/node-fs.d.ts`（31 个包经 tsconfig `include` 引用，无 `@types/node`）补 `Dirent`、`readdirSync(…, { withFileTypes: true })` 重载、`writeFileSync`/`mkdirSync`/`mkdtempSync`/`rmSync`/`symlinkSync` 与 `node:os` `tmpdir`——首轮全量 typecheck/build 因 walker 与 fixture 测试使用这些 API 而红（additive，ui 等用 `@types/node` 的包不引用该 shim）

Exit Criteria:

- [x] fixture 回归测试通过；旧 walker 下失败（ELOOP）已实跑记录
- [x] content 379、layout 161、flux-react 656 全绿（srcDir 改 `import.meta.dirname` 后无新违规）

### Phase 2 - 套件单次注册（T2）

Status: completed
Targets: 上述 13 个 barrel 文件、`scripts/check-test-barrels.mjs`、`scripts/__tests__/check-test-barrels.test.ts`、根 `package.json` check 链

- Item Types: `Proof | Fix`

- [x] Proof：删除前计数（`_tmp/barrel-before.txt`）：flux-react 656、basic 676、data 1264、form 1160、form-advanced 1240、report-designer-core 215、spreadsheet-core 339；各 barrel 单跑注册数（`_tmp/barrel-dup-counts.txt`）合计 635（basic index 90 已含嵌套 page-layout 41，叶子跑三次）
- [x] Fix：删除 13 个 barrel 文件（先逐个确认只含 test import、无 setup 副作用）
- [x] Fix：新增 `check-test-barrels.mjs`（默认扫描 git 跟踪的 `*.test.ts(x)`；导出扫描函数/接受注入的文件列表，使 fixture 命中用例无需 `git add`；模块说明符以 `.test` / `.test.ts(x)` / `.test.js` **结尾**即 exit 1；`.test-support` 等不结尾者不命中），接入 `pnpm check`；`scripts/__tests__/check-test-barrels.test.ts` 覆盖命中（barrel fixture）与不命中（`.test-support` 导入 fixture）
- [x] Proof：删除后（`_tmp/barrel-after.txt`）606/545/1172/1113/1102/141/236——7 包逐一精确等于删除前 − barrel 注册数，无套件丢失

Exit Criteria:

- [x] 仓库内零 barrel 测试文件，`node scripts/check-test-barrels.mjs` exit 0，对一个人造 barrel 输入 exit 1（脚本测试证明）
- [x] 7 个受影响包测试全绿，前后计数差 = 635 与重复数一致
- [x] `check-test-barrels.test.ts` 3 例（barrel 命中 / `.test-support` 不命中 / 全仓通过）通过；恢复一个 barrel 时门禁实跑报出 3 处违规

### Phase 3 - 零断言、fail-closed 与门禁测试接线（T3-T7）

Status: completed
Targets: `debug-combobox-dom.test.tsx`、`flux-renderers-ai/src/__tests__/contract-honesty.test.ts`、`ui/src/__tests__/styling-no-helper-css.test.ts`、T6 两文件

- Item Types: `Fix | Decision | Proof`

- [x] Fix（T3）：`select-enhancements.test.tsx` 的 `typeAndFilter`（同一 `fireEvent.input` 流程）已带断言覆盖 → 删除 `debug-combobox-dom.test.tsx`
- [x] Fix（T4）：去掉 catch，新增 3 个扫描根非空断言；扫描根改名时 4 项失败（反向验证）
- [x] Proof+Fix（T5）：守卫新增断言"推导出的仓库根含 `pnpm-workspace.yaml`"（旧 `process.cwd()` 推导在仓库根调用 vitest 时失败——执行时以仓库根调用一次做反向验证），仓库根改由 `import.meta.dirname` 推导
- [x] Fix（T7）：根 `package.json` `check` 链末尾追加 `&& pnpm test:scripts`
- [x] Decision（T6）：破坏 `renderer-contract-types.test.ts` 一处 `toEqualTypeOf` 后 `tsc -p packages/flux-core` 报错、还原后干净；两包 tsconfig `include: ["src", …]` 覆盖 → 保留现状，daily log 记录"类型钉由 tsc 执行，vitest 计数含 30 个运行期 no-op"

Exit Criteria:

- [x] `debug-combobox-dom.test.tsx` 已删除
- [x] ai 守卫扫描根改名时失败（已反向验证）
- [x] ui 守卫从包目录与仓库根两种调用均 4/4 通过；旧 `process.cwd()` 推导在仓库根调用时根断言失败（已反向验证）
- [x] T6 裁决有实证记录
- [x] `pnpm check` 输出中可见 test:scripts 段且 exit 0

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（round-1 agent_9804876b-4cc7-4bd6-aeb9-b26e56ee0e7b；round-2 agent_982eb3dc-abf4-40a1-b2ba-70b16c3b82f2）
- Verdict: pass（round-1 fail：3 Major + 3 Minor → 修订 → round-2 零 Blocker/Major，3 Minor 就地修正）
- Rounds: 2
- Findings addressed: Major-1 受影响包数 9→7（实测 13 barrel 分布 7 包）；Major-2 门禁自测改 `.test.ts`（`vitest.scripts.config.ts` 仅收 `.ts`，`.mjs` 永不运行）；Major-3 T5 补判别性断言（推导根含 `pnpm-workspace.yaml`）与退出项。评审轮新增 T7：`pnpm test:scripts` 未接入 check/test/CI（评审复核属实），接入 check 链末尾。

## Closure Gates

- [x] T1-T5、T7 全部修复，T6 已裁决
- [x] 判别性测试均已做反向验证
- [x] `check-test-barrels` 已接入 `pnpm check`
- [x] 不存在被静默降级的 in-scope 缺陷
- [x] daily log 记录修正后的真实唯一测试数基线
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据（agent_9578fad7，approved）
- [x] `pnpm typecheck`（46/46；首轮因 node-fs shim 缺签名红 → shim 扩展后复跑绿）
- [x] `pnpm build`（46/46）
- [x] `pnpm lint`（46/46）
- [x] `pnpm test`（`turbo run test --continue` 86/86 任务，**16,786 passed / 0 failed**——去重后真实唯一用例数）
- [x] `pnpm check`（exit 0；链中可见 `check:test-barrels` OK〔1970 test files〕与 `test:scripts` 30 文件/189 tests）

## Deferred But Adjudicated

（执行中如有改判当场落此节）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: T1-T5、T7 全部修复并逐项反向验证，T6 以 tsc 实证裁决保留；`pnpm test` 真实唯一用例基线 16,786（去掉 635 个 barrel 重复执行）；门禁脚本测试随 `pnpm check` 自动执行；全量门禁绿。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent（agent_9578fad7-ce97-452a-99aa-8a7fce476459）
- Evidence: verdict **approved**（零 Blocker/Major，3 Minor 非阻塞）。审计员独立模拟旧 statSync walker 复现 ELOOP；经 `git show` 解析 13 个被删 barrel 的全部 65 个导入，叶子测试文件均存在且被 glob 收集；逐包核对前后差额与 barrel 注册数合计 635；自行汇总 g830 测试日志得 16,786；确认 check 链末尾两段实际执行。Minor：门禁仅识别 `.test` 结尾（当前无 `.spec` barrel）；turbo 85/86 缓存命中但计数真实且变更套件已独立重跑；"恢复 barrel 报 3 处违规"系以 `spreadsheet-core/src/core.test.ts`（3 个导入）实测。

收口后勘误（2026-11-01，事实性修正）：收口时 `scripts/__tests__/check-test-barrels.test.ts` 尚未被 git 跟踪，`check:test-barrels` 未扫描到它；提交后该文件 fixture 字符串字面含 `import './__tests__/a.test'`，致 master `pnpm check` 在此项变红。已以前向提交修复（fixture 改为拼接构造），门禁复跑 exit 0。

Follow-up:

- no remaining plan-owned work
