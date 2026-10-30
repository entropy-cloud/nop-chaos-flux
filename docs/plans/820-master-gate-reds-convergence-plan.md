# 820 master 门禁红收敛（lint ×1 + check ×4）

> Plan Status: completed
> Last Reviewed: 2026-10-31
> Source: `docs/audits/deep-audit-2026-10-31.md` §0/§1（A1-A5，编号 820-825 勘误后口径）
> Related: plan 799（Deferred 继承条 A2/A4）、plan 800（落地面 A3/A5）、dc4d8bf97（mall-mobile 退役，A1 lint 演化 + lockfile 残留）；~~802~~（编号让位于并行会话 business-replication C2，本队列改号 820-825）

## Purpose

把 2026-10-31 深度审计实测的 master 5 处门禁红收敛为零：`pnpm lint` 恢复 exit 0；`pnpm check` 33 项全 exit 0。收口后 master 恢复"全链绿"基线。

## Current Baseline

- 2026-10-31 实测：typecheck/build/test 全绿（单测 17,346/0）；lint 1 error；check 4 项失败（`&&` 链断于 workspace-manifest-deps，其余 24 项单跑核实全绿）。
- A1：`packages/flux-bundle/src/__tests__/mall-ds-ajax.test.tsx:53` 的 `// eslint-disable-next-line no-console` 已无效果（`eslint.config.js` `reportUnusedDisableDirectives:'error'` + no-console 门禁 `allow:['warn','error']`），独立 eslint 单文件复现确认。mall-mobile 退役后的配置/作用域演化使指令失效。
- A2：`packages/flux-bundle/src/index.tsx:53` 调 `registerMobileRenderers(registry)`（注释明示壳移动端形态依赖缺省注册），但 `@nop-chaos/flux-renderers-mobile` 未声明于 `packages/flux-bundle/package.json`（独立评审复核确认 devDependencies 无此项）。plan 799 Deferred 继承条。
- A3：`apps/playground/src/complex-pages/shared/mock-backend-repl-wms-stock.ts:168` 触发 `check:audit-ui-consistency-gaps` 的 `[high] data-blob-href-without-download`。**live 复核为扫描器误报**（评审二次确认）：运行时 download action（`packages/flux-runtime/src/runtime-action-helpers.ts:392-393`，另有 :411-412 第二分支）对 `data:` URL 走 `dataUrlToBlob` → `downloadBlob`（`async-data/blob-download.ts:49` 起，`URL.createObjectURL` + `<a download>`），不存在顶层导航。豁免机制位于 `scripts/audit/ui-consistency-exemptions.mjs`，条目形态 `{path, rule, reason, source}`（已存在 `data-blob-href-without-download` 先例条目 showcase-env.ts）。
- A4：`check:owner-doc-semantics` 报 `bundle-default-registration-face: doc count 9 differs from live call count 10`。live 实况（`packages/flux-bundle/src/index.tsx:44-62` 逐行核对）为 10 个注册调用：basic / form / form-advanced / data / content / layout / mobile / scheduling / three / xlang-debug-editor。owner doc `docs/architecture/flux-runtime-module-boundaries.md:573` 记 "9 renderer families"。plan 799 Deferred 继承条。
- A5：`check:deps-baseline` 报新循环签名 `mock-backend-repl-wms-stock.ts -> mock-backend-repl-wms.ts`（live 58 vs registered 57）。实况：stock:25 `import type { ReplWmsSessionState, ReplWmsTestHooks } from './mock-backend-repl-wms'`（type-only 反向边）；wms:41 从 stock 导入 value + type。plan 800 落地面自带的边。
- lockfile 联动：工作区 `pnpm-lock.yaml` 已有 mall-mobile importer 清理（-69 行，dc4d8bf97 遗留 drift 修正，内容客观正确且无活跃会话认领——801 已收口）；A2 的 `pnpm install` 将追加 flux-bundle importer。两者随本 plan Phase 1 一并落定提交。
- 并行会话正在执行 business-replication C2（占用编号 802，roadmap 有其未提交修改）：本计划不触碰 `docs/backlog/business-page-replication-roadmap.md`。

## Goals

- `pnpm lint` exit 0（A1）。
- `pnpm check` 全链 33 项 exit 0（A2-A5）。
- lockfile mall-mobile 残留清理随本 plan 落定（归因 dc4d8bf97）。
- 全链收敛不引入新红：typecheck/build/test 维持全绿。

## Non-Goals

- 不改 download action 运行时行为（A3 是误报登记，不是功能修复）。
- 不触碰并行会话 business-replication C2 的任何文件（roadmap、其 plan、其页面代码）。
- 不做供应链升级（plan 825）。

## Scope

### In Scope

- A1-A5 五处红的最小修复面（1 个测试文件 1 行、1 个 package.json + install、1 个豁免登记、1 份 owner doc 计数勘误、1 处 type 归位解环）。
- `scripts/baselines/deps-baseline.json` 相应收缩（解环成功后按解环后实况）。
- `pnpm-lock.yaml` 落定提交（mall-mobile 清理 + flux-bundle importer 增补）。

### Out Of Scope

- ~20 处 ungoverned skip 治理（deep-audit §7 Deferred）。
- 其余基线内 scanner 债务（plan 822）。

## Failure Paths

| 编号              | 触发                                                                                  | 行为                                                                             | 可重试 | 用户可见表现         |
| ----------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------ | -------------------- |
| cycle-unbreakable | A5 type 归位引发其他类型耦合（wms/stock 还有隐式类型边）                              | 改判 conscious re-register（deps-baseline +1 签名 + reason），当场落 Deferred 节 | 是     | deps-baseline exit 0 |
| exemption-shape   | 豁免条目格式不满足 ui-consistency-exemptions 的 path-shape guard / reason+source 校验 | 按脚本校验输出修正条目形态（先例条目已验证形态可行）                             | 是     | check exit 0         |

## Test Strategy

档位选择：`建议有测`。

本档选择：建议有测。A1-A4 无行为变更（1 行注释、1 条 manifest、1 条豁免登记、1 处文档计数），以门禁命令为验收；A5 为 type-only 代码移动，以 playground 既有单测 + typecheck 为回归证据，不新增测试。

## Execution Plan

### Phase 1 - lint、manifest 与 lockfile 落定（A1/A2）

Status: completed
Targets: `packages/flux-bundle/src/__tests__/mall-ds-ajax.test.tsx`、`packages/flux-bundle/package.json`、`pnpm-lock.yaml`

- Item Types: `Fix`

- [x] A1：删除 mall-ds-ajax.test.tsx:53 的失效 `eslint-disable-next-line no-console` 注释
- [x] A2：`packages/flux-bundle/package.json` 补 `"@nop-chaos/flux-renderers-mobile": "workspace:*"`，`pnpm install` 刷新 lockfile
- [x] lockfile 落定：提交时包含 mall-mobile importer 清理（dc4d8bf97 遗留）+ flux-bundle importer 增补，commit message 双归因

Exit Criteria:

- [x] `npx eslint packages/flux-bundle/src/__tests__/mall-ds-ajax.test.tsx` exit 0
- [x] `pnpm lint` exit 0
- [x] `pnpm check:workspace-manifest-deps` exit 0
- [x] `git diff pnpm-lock.yaml` 仅含上述两类 importer 变化（实测 +3/-69：flux-bundle importer link + mall-mobile importer 移除）

### Phase 2 - check 三红（A3/A4/A5）

Status: completed
Targets: `scripts/audit/ui-consistency-exemptions.mjs`、`docs/architecture/flux-runtime-module-boundaries.md`、`apps/playground/src/complex-pages/shared/mock-backend-repl-wms-stock.ts`、`mock-backend-repl-wms.ts`、`scripts/baselines/deps-baseline.json`

- Item Types: `Fix | Decision`

- [x] A3：在 `ui-consistency-exemptions.mjs` 为 `mock-backend-repl-wms-stock.ts` 的 `data-blob-href-without-download` 实例登记豁免（reason 引 runtime-action-helpers.ts:392 data: → dataUrlToBlob → downloadBlob 链；source 指 `docs/audits/deep-audit-2026-10-31.md` §1 A3）
- [x] A4：owner doc `flux-runtime-module-boundaries.md:573` 缺省注册面 9→10 就地勘误，逐名列出 10 个注册调用
- [x] A5：解环——`ReplWmsTestHooks`（自包含）移入新建 `mock-backend-repl-shared-types.ts`（wms 侧 `export type` 保持公开面）；stock 的 `ReplWmsStockBranchInput.session` 结构化收窄为 `{ stockLedgerRows }`，stock→wms 边消除；deps-baseline 实测回到 57=57 无需改基线
- [x] A5 判定：解环成功，未触发 cycle-unbreakable 改判（`ReplWmsSessionState` 经结构化子集收窄不再被 stock 引用）

Exit Criteria:

- [x] `pnpm check:audit-ui-consistency-gaps` exit 0（该实例以 `[exempt]` 可见）
- [x] `pnpm check:owner-doc-semantics` exit 0（"10 live calls covered"，"owner docs agree with live code"）
- [x] `pnpm check:deps-baseline` exit 0（live 57 = registered 57，"no new circular dependencies"）
- [x] `pnpm --filter @nop-chaos/flux-playground typecheck` exit 0；focused 单测见 Closure Gates 全量 `pnpm test`

## Draft Review Record

- Reviewer / Agent: 独立子代理（general-purpose fresh session，2026-10-31）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 5 Minor 全数就地修订——①行号勘误（index.tsx:53、runtime-action-helpers.ts:392-393）②Source 引用 10-31.md 说明（该文件随收口落档）③flux-bundle package.json description 漂移移入 Follow-up ④"46 task"表述删除（lint exit 0 为 phase 自身结果面，Rule 18 例外）⑤lockfile 时序 Major 风险以"lockfile 随本 plan Phase 1 落定"消解（803 对应条目移除）

## Closure Gates

- [x] A1-A5 全部收敛，`pnpm lint` exit 0（审计员独立复跑确认）
- [x] `pnpm check` 收敛：本 plan 触达的 5 红全绿；全链 31/33 绿，2 红均并行会话 C2 WIP 归因（`mock-backend-repl-crm.ts` 725→773 行未登记 oversized + 其 untracked `crm-customer-360.json` 致 scanner-baselines 157>155，审计期间实测该文件持续增长中）——798-801 既有归因协议，非本 plan 触达面
- [x] `pnpm typecheck` exit 0
- [x] `pnpm build` exit 0
- [x] `pnpm test` exit 0（17,347 passed / 0 failed，46 project）
- [x] 不存在被静默降级的 in-scope live defect（A3 经审计员独立核实 runtime download 链确为误报豁免）
- [x] owner doc（flux-runtime-module-boundaries.md）已同步 live baseline（审计员逐调用核对 10/10）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（verdict `approved`，零 Blocker/Major，4 Minor 随本回写处理）
- [x] `docs/logs/2026/10-31.md` 收口记录已更新

## Deferred But Adjudicated

（执行中无改判项；Failure Paths 两条均未触发）

## Non-Blocking Follow-ups

- `packages/flux-bundle/package.json` description 仍写 "mobile / ai / graph registered on demand"，与 live 缺省注册实况漂移——随下次触达 flux-bundle 的变更顺带修正
- skip 治理缺口（~20 处诊断 spec 无台账）——见 deep-audit §7 Deferred
- 豁免条目 source 引用的 `docs/audits/deep-audit-2026-10-31.md` 本 commit 一并落库（审计 Minor-4 已消解）

## Closure

Status Note: 5 处门禁红（A1 lint 失效指令 / A2 flux-bundle 幽灵依赖 / A3 ui-consistency 扫描器误报〔豁免登记〕/ A4 owner doc 注册面计数漂移 9→10 / A5 stock→wms 循环依赖解环）全部收敛并有独立审计员实跑证据；lockfile 顺带落定 dc4d8bf97 的 mall-mobile importer 残留（+3/-69）。closure audit 由独立 fresh 子代理执行，verdict `approved`（零 Blocker/Major；4 Minor：注释归因 822→820 已修、scanner-baselines/oversized 两红 C2 归因已写入本节、报告引用随 commit 落库）。剩余全链红仅并行会话 C2 WIP 中间态，归因登记如上。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理 agent_225f9204（general-purpose fresh session，2026-10-31）
- Evidence: 审计员独立复跑五项 focused gates 全绿（eslint/manifest/ui-consistency〔exempt 可见〕/owner-doc〔10 live calls covered〕/deps-baseline〔57=57〕）；逐 checkbox 对照 git diff 核实落地；独立确认解环（wms-stock 零 wms import）；playground 56 文件/546 测试独立实跑绿；两处剩余 check 红 diff 归因并行 C2 WIP（crm.ts 审计期间 725→773 实证活跃编辑）；text 一致性核对（audit 门未预勾，状态翻转随本 commit）

Follow-up:

- 见 Non-Blocking Follow-ups（flux-bundle description 漂移、skip 治理）
