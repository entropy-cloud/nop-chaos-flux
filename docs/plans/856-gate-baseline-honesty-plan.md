# 856 登记基线与豁免诚实收缩（gate baseline honesty）

> Plan Status: active（draft review 通过，见 Draft Review Record）
> Last Reviewed: 2026-11-05
> Source: `docs/analysis/2026-11-05-full-repo-deep-audit.md` §F-A（A1–A6，A7 头部注记）
> Related: plan 822（knip/console 收紧先例）、plan 836 Phase 4（e2e 台账基线刷新 owner）

## Purpose

把 2026-11-05 深审计发现的"登记债务容忍已删除/已修复面"收口：scanner-baselines 五项收缩至 live、duplicates 基线收缩、两条死豁免移除、registry 自身簿记协议（notes/lastUpdated/counts）修复，并让 `docs/testing/known-good-baselines.md` 履行其自设定的持久绿态登记职责。收口后 `pnpm check` 仍 exit 0，且每一条登记容忍都指向真实存在的面。

## Current Baseline

- 全链门禁当前实测绿：`pnpm typecheck`/`lint`/`build` exit 0；`pnpm test` 16,837 passed / 0 failed（46 project）；`pnpm check` exit 0（含 test:scripts 200 passed / 2 skipped）。
- `scripts/baselines/scanner-baselines.json` live 实测（2026-11-05 check log）：`find-react19-optimization-candidates` **668** < 登记 694、`find-async-without-failure-path` **351** < 373、`discover-audit-suspects` **797** < 825、`find-test-global-leaks` **114** < 120、`find-styling-suspects` **254** < 255。差额主体（react19 +26 / async +20 / discover +25 / test-leaks +5）是 2026-10-28 notes 明确登记在 restored `apps/mall-mobile/**` surface 上的债务；该 app 已于 2026-10-30 `dc4d8bf97` 退役删除，容忍面已不存在。其余 9 个 scanner 登记值与 live 持平。
- `find-non-retained-renderer-references` 于 2026-11-02（commit `1d3412fac`）160→161 手改但无 reRegistrationNotes 条目，`_header.lastUpdated` 仍为 2026-11-01——违反 registry 自身"每次手改必须记 notes"协议。
- `scripts/baselines/duplicates-baseline.json` 登记 clones 597（2026-09-30），live **534**（7251/315626 行，2.3%）；比例阈值 8% 双重失活。
- `scripts/check-oversized-code-files.mjs` `OVERSIZED_EXEMPTIONS` 共 5 条，其中 2 条已死：`packages/flux-xlang-lang/generated/xlang.parser.js` 现 18 行（gate countLines 口径）；`packages/flux-compiler/src/schema-compiler/node-compiler.ts` 现 647 行（< 700 ERROR 阈值）。实际超限 3 文件（en-US.ts 2111 / zh-CN.ts 2110 / form-runtime-owner.ts 736，gate countLines 口径）豁免理由仍成立。
- `scripts/baselines/knip-baseline.json` `_header.counts` exports 346 / types 571 vs 数组实况 **341 / 566**（header 协议是 counts=数组长度，R2.4 cycle 曾就地 resync 过同类漂移）。
- `docs/testing/known-good-baselines.md` 基线表仍为占位符行（"add the first row when a real full-green run lands"），而 2026-11-05 已有实测全绿基线可登记。
- `docs/testing/e2e-baseline-ledger.md` 头部快照为 2026-10-26（unexpected 248）；2026-11-02 全量（242 failed 逐红对账）仅记录于 daily log，台账本体无指引。台账基线刷新的 owner 是 plan 836 Phase 4，本 plan 不越权改快照内容。

## Goals

- scanner-baselines 五项收缩至 live 实测值，reRegistrationNotes 补记收缩依据（mall-mobile 退役）+ 补记 11-02 的 161 手改，`_header.lastUpdated` 滚动至执行日。
- duplicates 基线收缩至 live（597→534），带收缩注记。
- 移除 2 条死豁免，oversized 豁免表仅含仍触发且理由成立的条目。
- knip header counts 与数组实况一致（341/566）。
- known-good-baselines.md 落第一行真实基线（本审计轮实测证据）。
- e2e-baseline-ledger.md 头部加指引注记（指向 11-02 对账记录与 plan 836-P4 owner），不改快照本体。
- 收口后 `pnpm check` 全链 exit 0 且零新增未登记红。

## Non-Goals

- 不做 scanner 规则本身的增删或匹配逻辑修改（那是各 scanner owner 面）。
- 不处理 oversized 3 条仍超限文件的拆分（在册既有红，属各自 owner 面）。
- 不刷新 e2e 台账快照内容/不复跑 e2e（plan 836 Phase 4 owner）。
- 不修复 duplicates 的 534 个 live clone 本体（优化项，见 Non-Blocking Follow-ups）。
- 不修改 knip/deps/console 等已核验诚实的 registry。

## Scope

### In Scope

- `scripts/baselines/scanner-baselines.json`（5 值收缩 + notes ×2 + lastUpdated）
- `scripts/baselines/duplicates-baseline.json`（597→534 + 注记）
- `scripts/check-oversized-code-files.mjs`（移除 2 条死豁免）
- `scripts/baselines/knip-baseline.json`（header counts 346→341、571→566 + 注记一行）
- `docs/testing/known-good-baselines.md`（填第一行基线）
- `docs/testing/e2e-baseline-ledger.md`（头部指引注记，≤5 行）
- `docs/logs/2026/11-05.md`（收口记录）

### Out Of Scope

- 任何 `packages/`、`apps/` 源码改动
- scanner 脚本逻辑、门禁阈值语义（8% 比例线等）
- e2e 快照刷新（plan 836-P4）、live clone 消减、oversized 超限文件拆分

## Failure Paths

| 可测场景编号              | 触发                                                 | 行为                                                   | 可重试 | 用户可见表现   |
| ------------------------- | ---------------------------------------------------- | ------------------------------------------------------ | ------ | -------------- |
| baseline-drift-on-execute | 执行时 live 计数与本审计轮实测不一致（并行会话改码） | 以执行时刻 fresh 实测为准重测收缩值，notes 记实测时点  | 是     | gate 仍 exit 0 |
| shrink-overshoot          | 收缩后任一 gate 变红（收缩值低于 live）              | 回退该单项至 fresh 实测值并在 notes 说明，不得留红提交 | 是     | gate exit 0    |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**——registry 数值收缩无新逻辑，验证手段是门禁本体实跑（`check:scanner-baselines` / `check:duplicates-baseline` / `check:oversized-code-files` / `check:knip-baseline` / 全链 `pnpm check`）；scanner-baselines 自身行为已有 `scripts/__tests__/check-scanner-baselines.test.ts` 覆盖（含本会话新落的 corrupt/missing 用例），无需新增测试文件。

## Execution Plan

### Phase 1 - scanner-baselines 收缩与簿记修复

Status: completed
Targets: `scripts/baselines/scanner-baselines.json`

- Item Types: `Fix | Proof`

- [x] 五项收缩至 fresh 实测：react19 694→668、async 373→351、discover 825→797、test-leaks 120→114、styling 255→254（手改单值，遵循 09ed6e5b6 先例，不用 `--update-baselines`）
- [x] reRegistrationNotes 头部新增两条：①本收缩条目（说明 mall-mobile 退役 `dc4d8bf97` 使 10-28 登记面消失 + 5 项 fresh 实测时点）；②补记 2026-11-02 `1d3412fac` 的 160→161 手改（当日遗漏）
- [x] `_header.lastUpdated` → 执行日
- [x] 其余 9 项 scanner 值保持不动（已与 live 持平）

Exit Criteria:

- [x] `node scripts/check-scanner-baselines.mjs` exit 0，且输出不再出现这 5 项的 shrink 提示（全部持平）
- [x] notes 与 lastUpdated 修改在 git diff 中可核（声称-实况对账）
- [x] `pnpm test:scripts` 全绿（scanner-baselines 单测不受 registry 数值影响）

### Phase 2 - duplicates 基线收缩

Status: completed
Targets: `scripts/baselines/duplicates-baseline.json`

- Item Types: `Fix`

- [x] clones 597→534，注记收缩依据（2026-09-30 后债务自然消减 + mall-mobile 退役；live 实测时点）；若文件含 `percentage`（现 2.99）/lastUpdated 类描述字段一并按 live 实测滚动

Exit Criteria:

- [x] `node scripts/check-duplicates.mjs` exit 0，输出 "within baseline (534 clones registered)" 与 live 534 持平
- [x] 注记在 git diff 中可核

### Phase 3 - oversized 死豁免移除

Status: completed
Targets: `scripts/check-oversized-code-files.mjs`

- Item Types: `Fix | Decision`

- [x] 移除 `packages/flux-xlang-lang/generated/xlang.parser.js` 豁免（gate countLines 口径 18 行，理由所述 parser 表形态已不存在）
- [x] 移除 `packages/flux-compiler/src/schema-compiler/node-compiler.ts` 豁免（647 行 < 700 阈值，永不触发；若未来超限届时按 inline decision 重新裁决）
- [x] Decision 就地留档：剩余 3 条豁免（en-US.ts / zh-CN.ts / form-runtime-owner.ts）理由复核仍成立（行数一律按 gate countLines 口径记录）

Exit Criteria:

- [x] `node scripts/check-oversized-code-files.mjs` exit 0，exempt 计数 3、无 dead entry
- [x] git diff 仅含这两条数组项移除

### Phase 4 - knip header counts 修复 + 绿态台账履行

Status: completed
Targets: `scripts/baselines/knip-baseline.json`、`docs/testing/known-good-baselines.md`、`docs/testing/e2e-baseline-ledger.md`

- Item Types: `Fix | Proof`

- [x] knip `_header.counts.exports` 346→341、`counts.types` 571→566，reRegistrationNotes 补一行说明（plan 822 收缩后头部未同步）
- [x] known-good-baselines.md 填第一行：2026-11-05 深审计轮实测（scope=full-static：typecheck/lint/build/test/check；test 16,837/0；check exit 0；Git State=执行起点 SHA + 注明 closure commit 见当日 log；Evidence=`_tmp/audit-1105/` 日志与 856 收口提交）
- [x] e2e-baseline-ledger.md 头部加 ≤5 行指引注记：最新全量对账见 `docs/logs/2026/11-02.md`（242 红逐红归因）；快照刷新 owner=plan 836 Phase 4
- [x] 日志收口记录写入 `docs/logs/2026/11-05.md`

Exit Criteria:

- [x] `node scripts/check-knip-baseline.mjs` exit 0（counts 修正不影响 identity diff）
- [x] known-good-baselines.md 基线表含一行非占位数据，列值与本审计轮实测一致
- [x] e2e 台账 diff 仅头部注记，快照表未改动

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子代理 agent_cb848e0d（fresh session）
- Verdict: `pass-with-minors`（零 Blocker/Major；Current Baseline 全部事实性声称逐条对 live repo 核实成立）
- Rounds: 1
- Findings addressed: Minor 4 条中 2 条已吸收进正文（行数统一按 gate countLines 口径：form-runtime-owner 736 / node-compiler 647 / xlang.parser 18；duplicates `percentage` 字段纳入 Phase 2 滚动项）；其余 2 条不阻塞——mall-mobile delta 算术粗粒度（正文已有"差额主体"限定）、16,837 全量计数未独立复跑（以 commit `62422620a` 与审计日志佐证）

## Closure Gates

- [x] 全部 in-scope registry 数值与 live 实测持平（5 项 scanner + duplicates + knip counts）
- [x] 死豁免已移除，oversized 豁免表 3 条且理由成立
- [x] notes / lastUpdated / counts 簿记协议全部履行
- [x] known-good-baselines.md 与 e2e 台账注记落地
- [x] 不存在被静默降级的 in-scope 项
- [x] 受影响 owner docs 已同步（known-good-baselines 首行 + 当日 log；无 architecture 语义变更）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check` exit 0 且零新增未登记红

## Deferred But Adjudicated

### duplicates live 534 clone 本体消减

- Classification: `optimization candidate`
- Why Not Blocking Closure: 本 plan 的结果面是"登记容忍 = 真实债务"（597→534 后 gate 重新变紧、零虚假容忍）；534 个 clone 的消减属代码质量优化，规模大且需逐族归并裁决，不影响基线诚实性成立。
- Successor Required: `no`（挂 improvement-analysis 治理轮清单）

## Non-Blocking Follow-ups

- `check:duplicates` 的 8% 比例阈值与 clone 计数双轨裁决语义（当前 2.3% live 下阈值失活）——评估是否收紧为双条件，属 scanner owner 面。
- scanner-baselines 的 `--update-baselines` 路径与手改先例并存，评估是否在 gate 帮助文本统一指引（纯 DX）。

## Closure

Status Note: <<收口时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
