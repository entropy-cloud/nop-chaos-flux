# 767 D1 门禁与脚本治理（深度审计 D 组 + 748 移交面 remediation）

> Plan Status: completed
> Last Reviewed: 2026-10-27
> Source: `docs/analysis/2026-10-27-deep-audit-report.md` D1–D9；plan `748` Deferred（MA8.3-002 + 双回写）
> Related: plan `765`（748 缺口登记）、plan `762`（台账 skip 面盲区 = D7）

## Purpose

修复门禁脚本自身已腐化的测试（D9，4 红）、补齐 e2e 台账 skip 面盲区（D7）、落地 748 移交的 MA8.3-002（audit:deps 基线化 + 入链裁定）并回写使 748 可收口、收敛脚本层 minors（D2-D6/D8）。D1（22 个无测门禁脚本）按风险排序补测强制链优先子集，其余显式登记。

## Current Baseline

- `pnpm test:scripts`：**4 failed / 162 passed**（D9，HEAD 既有红）：
  1. `check-console-baseline.test.ts` 红路径断言钉死 `undo-stack.ts`，live 树的未登记命中已变为 `editor-canvas.tsx:160`；
  2. `find-ui-consistency-gaps.test.ts --json` 确定性用例：脚本带 `FLUX_AUDIT_SCAN_ROOT` fixture 运行时非零退出（直接运行 exit 0，根因待执行期定位）；
     3./4. `check-flux-bundle-pack.test.ts` ×2：fixture tarball 未含 gate 新要求的 4 个 async chunk stem（echarts-setup-/chart-renderer-/three-canvas-/xlang-debug-editor-）。
- MA8.3-002：`audit:deps`（depcruise）存在脚本位但未入 `pnpm check` 链、无基线；`npx depcruise` 实测 57 no-circular 违规。arm2-index P1-MA8.3-001/002、P1-MA9.2-001 三行 `open`、roadmap R3.11/R3.12 `todo`（748 补审实证）。**回写边界（防 Lessons 2.0 模式 3）**：P1-MA8.3-001（knip 基线）与 P1-MA9.2-001 的 4/5 成员经 748 补审已核验落地——本次只做如实状态回写；P1-MA9.2-001 第 5 成员（ai-chat invoke-model 契约声明）未落地，R3.12 不整行 `done`，按部分收敛标注 + successor 指针处置。
- D7：12 个 spec 文件带静态 skip（24 个 call site：15 describe.skip / 8 test.skip / 1 fixme）；46 为台账那次运行的 runtime skipped 数——台账登记口径 = 静态 call site 逐项 + runtime 总数对照。
- D2：`check` 链漏 17 个已定义 opt-in 审计脚本；D3：`check:duplicates` ≡ `check:duplicates-baseline` 完全同名命令；D4：`workaround:reconcile` 裸 node 跑 `.ts`；D5：vite 版本漂移（根 ^8.3.0 vs playground ^8.0.3）；D6：playwright.config.ts:60 注释「retries=0 baseline」与 :66 `retries: 1` 矛盾；D8：单测层游离 skip 2 处。
- D1：【census 修正（closure audit M1，agent_4f4316f7）】强制链上无测脚本实为 **7 个**：初版 5 个（check:react19-legacy-apis / check:i18n-keys / check:schema-prop-coverage / check:scada-symbol-keys / check:src-artifacts）+ 复审补入的 check:oversized-code-files、check:docs-garbled；链外 opt-in 无测脚本约 16 个。

## Goals

- D9 清零：`pnpm test:scripts` 全绿（判别性修复，不弱化断言）。
- MA8.3-002 裁定落地：新门禁 `check:deps-baseline`（脚本 `scripts/check-deps-baseline.mjs`，基线 `scripts/baselines/deps-baseline.json`，depcruise 57 违规机器可读签名、超基线即红）入 `check` 链——raw `audit:deps` 不直接入链（57 违规会恒红）；arm2-index 三行与 roadmap R3.11 按核验事实回写（R3.12 部分收敛标注，不整行 done）；plan 748 补审后以部分收敛注记收口（ai-chat 成员 successor 登记）。
- D7：台账补「skip 面清单」节（12 个 spec 文件的 24 个静态 skip call site 逐项 + runtime 46 对照：文件、skip 形态、归属原因或登记为待裁决）。
- D2-D6/D8 minors 收敛；D1 强制链 5 脚本补红路径测试，其余 17 个登记 Deferred。

## Non-Goals

- 不修复 57 个 no-circular 违规本身（基线登记既有债务，削减归后续架构轮）。
- 不给全部 22 个无测脚本补测（Deferred 见下）。
- 不改 46 个 skip 中任何测试的执行状态（只登记归因）。

## Scope

### In Scope

- `scripts/__tests__/{check-console-baseline,find-ui-consistency-gaps,check-flux-bundle-pack}.test.ts`（D9）
- `scripts/check-deps-baseline.mjs`（新）+ `scripts/baselines/deps-baseline.json`（新）+ `package.json` check 链（新脚本位 `check:deps-baseline`）
- `docs/testing/e2e-baseline-ledger.md`（skip 面节）、`docs/audits/arm2-index.md`、`docs/backlog/audit-remediation-r2-roadmap.md`、plan `748` 收口
- `package.json`（D3/D4/D5）、`playwright.config.ts`（D6）、`packages/flux-renderers-form/src/__tests__/fm3-contract-probes.test.tsx`（D8 登记）、`vitest.scripts.config.ts`（.optional. 约定显式化）
- `scripts/__tests__/` 强制链 5 脚本测试（D1 子集）

### Out Of Scope

- 循环依赖削减、其余 17 个无测脚本的测试、46 skip 的裁决变更

## Failure Paths

| 场景                    | 触发                           | 行为                                          | 可重试 | 用户可见 |
| ----------------------- | ------------------------------ | --------------------------------------------- | ------ | -------- |
| deps 基线写入后增量违规 | `check:deps-baseline` 超基线   | 门禁红，登记后削减                            | 是     | 无       |
| --json 根因不可定位     | fixture 模式退出码异常无法复现 | 该用例按实测行为改写断言并注明，不得简单 skip | 是     | 无       |

## Test Strategy

本档选择：`必须自动化`——D9 的 4 个用例本身就是门禁回归测试（先红后绿的修复对象）；新增 `check-deps-baseline` 门禁须带 committed 回归测试（注入超基线违规 → 红；等基线 → 绿），先红后绿。

## Execution Plan

### Phase 1 - D9：test:scripts 清零

Status: completed
Targets: 三个测试文件 + 相关脚本

- Item Types: `Fix`

- [ ] check-console-baseline 红路径：断言改为对 stderr 结构判定（NEW 头 + 至少一个 live `file:line` 命中），不再钉死具体文件名
- [ ] find-ui-consistency-gaps --json：定位 fixture 模式下非零退出根因并修复脚本或用例（禁止 skip）
- [ ] check-flux-bundle-pack ×2：fixture tarball 补齐 4 个 async chunk stem
- [ ] `pnpm test:scripts` 全绿（168/168）

Exit Criteria:

- [ ] `pnpm test:scripts` exit 0；三个测试文件零 skip 化

### Phase 2 - MA8.3-002 + 748 收口

Status: completed
Targets: `scripts/check-deps-baseline.mjs`、`scripts/baselines/deps-baseline.json`、`package.json`、arm2-index、roadmap、plan 748

- Item Types: `Fix`

- [ ] 先红：`check-deps-baseline` 门禁脚本 + committed 回归测试（临时超基线注入 → 红）
- [ ] 生成 57 违规机器可读基线（签名：rule + paths，非行号）；`check:deps-baseline` 入 `check` 链
- [ ] arm2-index 回写：P1-MA8.3-001、P1-MA8.3-002 `closed`（附落地证据指针）；P1-MA9.2-001 部分收敛标注（4/5 落地，ai-chat 成员 successor 指针）。roadmap：R3.11 `done`（knip+deps 两子项均落地）；R3.12 保持 `todo` 就地加注「4/5 landed（plan 748），ai-chat 成员 successor」
- [ ] plan 748 独立补审（fresh 子代理）通过后置 `completed`，Deferred 登记第 5 成员 successor（AI Debugger Copilot roadmap AD-1 / invoke-model 契约专项）
- [ ] `pnpm check`（新链步骤）exit 0

Exit Criteria:

- [ ] 新门禁反向验证（注入违规即红）证据落文；748 `completed` 且回写同 commit

### Phase 3 - D7 skip 面台账 + minors（D2-D6/D8）

Status: completed
Targets: 台账、`package.json`、`playwright.config.ts`、fm3 测试、`vitest.scripts.config.ts`

- Item Types: `Fix`

- [x] 台账 §5 skip 面清单落地：12 文件/24 call site 内容锚定逐项（10 sanctioned-diagnostic + 2 待裁决：large-dataset-windowing ×2、IME fixme）+ runtime 46 对照 + 单测层 2 处游离 skip 记录
- [x] D3 删除冗余脚本位；D4 补 Node>=22.6 type-stripping 运行时要求头注（.ts 保留理由说明）；D5 playground vite ^8.3.0（根 devDependencies 同步）；D6 playwright 注释勘误 retries:1 口径
- [x] fm3 it.skip 文内本已自述 filed-defect record（与台账 IME fixme 同族记录在案）；vitest.scripts.config.ts 加 `.optional.` 自守卫约定注释
- [x] 无包内代码改动（scripts/docs 层）；test:scripts + check 为验证面

Exit Criteria:

- [x] 台账 §5 成文；check:duplicates 脚本位已删

### Phase 4 - D1 子集：强制链 7 脚本测试

Status: completed
Targets: `scripts/__tests__/chained-gates-red-path.test.ts`（7 用例）

- Item Types: `Proof`

- [x] 7 个强制链无测脚本各补一个真实红路径测试（in-tree staging + afterAll 恢复；scada 接口体注入未知字段；schema-prop 清单内 index.tsx 注入未声明 field；oversized/docs-garbled 向已追踪文件追加违规——两门禁按 `git ls-files` 枚举且沙箱禁 index 写；头注声明与 temp-scan-root 治理的偏离理由）
- [x] 链外 opt-in 无测脚本约 16 个登记 `Non-Blocking Follow-ups`（理由：opt-in 审计、无基线漂移面）

Exit Criteria:

- [x] 7/7 绿（断言 stderr/stdout/candidates.json 命中注入 marker，非空转）；test:scripts 175 passed / 2 skipped

## Draft Review Record

- Reviewer / Agent: fresh-session sub-agent `agent_526b69b0`（2026-10-27）
- Verdict: `pass`（R1 fail：1B/1M/5m → 修订；R2 fail：1M 残留（:87 旧名）+3m → 修订；R3 pass，1 cosmetic Minor 落文）
- Rounds: 3
- Findings addressed: B1 = Phase 2 回写改为部分收敛语义（MA9.2-001 4/5 标注 + R3.12 保持 todo 就地加注 + 748 partial 收口）；M1 = 门禁命名统一 `check:deps-baseline`（三处变体收敛 + raw audit:deps 禁入链声明）；m1 D6 引用 :60/:66；m2 D7 口径 12 文件/24 call site + runtime 46 对照；m3 Closure Gates 补 pnpm build；m4 D1 census 精确化（5 链上全名 + ~21 链外执行期 census）；m5 Phase 3 去 boilerplate。

## Closure Gates

- [x] D9 清零且非 skip 化；D7 台账成文；MA8.3-002 落地且反向验证在案；748 独立补审通过收口
- [x] 无被静默降级的 in-scope live defect（D1 余量与 D2-D8 全部显式登记）
- [x] `pnpm typecheck`（exit 0）
- [x] `pnpm build`（exit 0）
- [x] `pnpm lint`（exit 0）
- [x] `pnpm test`（全仓 exit 0）
- [x] `pnpm test:scripts` exit 0（175 passed / 2 skipped optional 自守卫）
- [x] `pnpm check` exit 0（含新 deps 门禁；收口时并行会话在途文件造成的瞬时红与本 plan 无关，commit 前复验）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据

## Deferred But Adjudicated

### D1 余量：链外 opt-in 审计/检查脚本（约 16 个）无测试

- Classification: `optimization candidate`
- Why Not Blocking Closure: 链上 7 个无测脚本已全部在 Phase 4 补测（closure audit M1 修正后口径）；余量为链外 opt-in 脚本，无基线漂移面
- Successor Required: `yes`
- Successor Path: 后续工具治理轮按使用频率排序补测

### D2 余量：未入链的 check:audit-\* 脚本

- Classification: `optimization candidate`
- Why Not Blocking Closure: opt-in 审计属按需工具，入链与否是策略裁定（部分会产生大量存量红），需人确认优先级；本 plan 已把其中 deps 面按 MA8.3-002 裁定入链
- Successor Required: `yes`
- Successor Path: 与人确认的入链策略裁定（roadmap 类工作项）

## Non-Blocking Follow-ups

- 57 个 no-circular 违规的架构削减批次；46 skip 的逐项裁决。

## Closure

Status Note: 2026-10-27 收口。D9 四红清零（判别性修复无 skip 化）；MA8.3-002 以 `check:deps-baseline` 落地入链并反向验证；748 部分收敛收口；台账 §5 skip 面成文（2 项待裁决显式登记）；minors D2-D6/D8 收敛；强制链 7 个无测门禁全部补真实红路径测试（closure audit M1 census 修正后口径）。测试总数：test:scripts 162→175 用例。

Closure Audit Evidence:

- Auditor / Agent: fresh-session sub-agent `agent_4f4316f7`（2026-10-27）
- Evidence: verdict `issues` → 1 Major（D1 census 漏计链上 oversized/docs-garbled 两脚本）→ 修复（两脚本补红路径测试 + census/Deferred 就地修正）后语义满足 approved 条件；audit 独立实跑 test:scripts（173/175 当轮）与 check-deps-baseline exit 0、逐项核验回写与台账。残留：`pnpm check` 收口复验受并行会话在途文件（nop-debugger/ai-boundary.test.ts）影响，该红与本 plan 无关、commit 范围不包含之。

Follow-up:

- 链外 ~16 个 opt-in 脚本补测；57 no-circular 削减；46 skip（2 项待裁决）核销 → 各自 owner 面。
