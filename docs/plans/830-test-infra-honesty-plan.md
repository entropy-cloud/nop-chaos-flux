# 830 测试基建诚实性收口（deep-audit 2026-11-01 T1-T7）

> Plan Status: active
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

Status: planned
Targets: `packages/flux-react/src/test-support/contract-honesty-harness.ts`、`packages/flux-renderers-{content,layout}/src/contract-honesty.test.ts`、`packages/flux-react/src/__tests__/test-support-subpath.test.tsx`

- Item Types: `Proof | Fix`

- [ ] Proof：在 `test-support-subpath.test.tsx`（或同目录新测试）以临时 fixture 目录构造 `node_modules/x.ts`、`dist/y.d.ts` 与一条指回父目录的符号链接，断言 harness 收集的文件列表不含 `node_modules`/`dist` 路径且不抛 ELOOP（旧实现：收集到 node_modules 文件并在符号链接处抛 ELOOP → 挂）。需要的话从 harness 导出一个仅供测试的 `readSourceFiles`（经 test-support 子路径，不进包主入口）
- [ ] Fix：`readSourceFiles` 改用 `lstatSync`/`readdirSync({withFileTypes:true})`，跳过符号链接目录与 `node_modules`、`dist`
- [ ] Fix：content/layout wrapper `srcDir` 改为 `import.meta.dirname`

Exit Criteria:

- [ ] fixture 回归测试通过，且在还原旧 walker 时失败（执行时记录一次反向验证）
- [ ] `flux-renderers-content`、`flux-renderers-layout`、`flux-react` 三包测试通过

### Phase 2 - 套件单次注册（T2）

Status: planned
Targets: 上述 13 个 barrel 文件、`scripts/check-test-barrels.mjs`、`scripts/__tests__/check-test-barrels.test.ts`、根 `package.json` check 链

- Item Types: `Proof | Fix`

- [ ] Proof：记录受影响 7 个包删除前的 vitest 测试数（per-package `vitest run` 汇总）
- [ ] Fix：删除 13 个 barrel 文件（先逐个确认只含 test import、无 setup 副作用）
- [ ] Fix：新增 `check-test-barrels.mjs`（默认扫描 git 跟踪的 `*.test.ts(x)`；导出扫描函数/接受注入的文件列表，使 fixture 命中用例无需 `git add`；模块说明符以 `.test` / `.test.ts(x)` / `.test.js` **结尾**即 exit 1；`.test-support` 等不结尾者不命中），接入 `pnpm check`；`scripts/__tests__/check-test-barrels.test.ts` 覆盖命中（barrel fixture）与不命中（`.test-support` 导入 fixture）
- [ ] Proof：删除后各包测试数 = 删除前 − 重复数，且被导入文件的用例仍全部执行（按文件计数核对，不得有套件因失去 barrel 而不再运行）

Exit Criteria:

- [ ] 仓库内零 barrel 测试文件，`node scripts/check-test-barrels.mjs` exit 0，对一个人造 barrel 输入 exit 1（脚本测试证明）
- [ ] 7 个受影响包测试全绿，前后计数差与重复数一致并记录
- [ ] `check-test-barrels.test.ts` 在 `pnpm test:scripts` 下通过

### Phase 3 - 零断言、fail-closed 与门禁测试接线（T3-T7）

Status: planned
Targets: `debug-combobox-dom.test.tsx`、`flux-renderers-ai/src/__tests__/contract-honesty.test.ts`、`ui/src/__tests__/styling-no-helper-css.test.ts`、T6 两文件

- Item Types: `Fix | Decision | Proof`

- [ ] Fix（T3）：若 `fireEvent.input` 设置 searchable-select 值的路径在既有测试中无覆盖，则将其改写为带断言的回归测试并改名去掉 `debug-`；否则删除。结论记入执行记录
- [ ] Fix（T4）：去掉 `listSourceFiles` 的 catch（ENOENT 直接抛），并对每个扫描根断言文件数 > 0
- [ ] Proof+Fix（T5）：守卫新增断言"推导出的仓库根含 `pnpm-workspace.yaml`"（旧 `process.cwd()` 推导在仓库根调用 vitest 时失败——执行时以仓库根调用一次做反向验证），仓库根改由 `import.meta.dirname` 推导
- [ ] Fix（T7）：根 `package.json` `check` 链末尾追加 `&& pnpm test:scripts`
- [ ] Decision（T6）：核实 `pnpm typecheck` 是否真的类型检查这两个文件（人为破坏一个 `expectTypeOf` 断言确认 tsc 报错后还原）；成立则保留现状并在 daily log 记录"类型钉由 tsc 执行、vitest 计数含 30 个运行期 no-op"；不成立则转为 Fix（开启 vitest typecheck 或改名排除）

Exit Criteria:

- [ ] `grep` 全仓 `packages/*/src` 无零 `expect` 的调试测试文件（`debug-combobox-dom` 已删除或已含断言）
- [ ] ai 守卫在把扫描根改成不存在目录时失败（执行时反向验证一次）
- [ ] ui 守卫从仓库根直接 `npx vitest run <file>` 调用时通过（旧实现下其根断言失败）
- [ ] T6 裁决有实证记录
- [ ] `pnpm check` 输出中可见 test:scripts 段且 exit 0

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（round-1 agent_9804876b-4cc7-4bd6-aeb9-b26e56ee0e7b；round-2 agent_982eb3dc-abf4-40a1-b2ba-70b16c3b82f2）
- Verdict: pass（round-1 fail：3 Major + 3 Minor → 修订 → round-2 零 Blocker/Major，3 Minor 就地修正）
- Rounds: 2
- Findings addressed: Major-1 受影响包数 9→7（实测 13 barrel 分布 7 包）；Major-2 门禁自测改 `.test.ts`（`vitest.scripts.config.ts` 仅收 `.ts`，`.mjs` 永不运行）；Major-3 T5 补判别性断言（推导根含 `pnpm-workspace.yaml`）与退出项。评审轮新增 T7：`pnpm test:scripts` 未接入 check/test/CI（评审复核属实），接入 check 链末尾。

## Closure Gates

- [ ] T1-T5、T7 全部修复，T6 已裁决
- [ ] 判别性测试均已做反向验证
- [ ] `check-test-barrels` 已接入 `pnpm check`
- [ ] 不存在被静默降级的 in-scope 缺陷
- [ ] daily log 记录修正后的真实唯一测试数基线
- [ ] 独立子 agent（fresh session）closure audit 通过并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`

## Deferred But Adjudicated

（执行中如有改判当场落此节）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 待收口填写

Closure Audit Evidence:

- Auditor / Agent: 待填写
- Evidence: 待填写

Follow-up:

- 待收口填写
