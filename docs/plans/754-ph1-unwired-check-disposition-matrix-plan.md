# 754 PH-1 未接线 `check:*` 处置矩阵与接线覆盖门禁

> Plan Status: completed
> Last Reviewed: 2026-10-26
> Source: `docs/backlog/platform-hardening-roadmap.md` PH-1（A 组，行序第一）；诊断根因"零可执行门禁——扫描器写了没接线"（同文 §诊断优先 表第 1 行）
> Related: `docs/references/audit-tooling.md`（owner doc）；`scripts/check-scanner-baselines.mjs`（既有棘轮）；PH-2（`check:audit-missing-renderer-markers` 语义升级，本 plan 只接线不改语义）；PH-18（复用 canvas checker，以本 plan 接线为前提）

## Purpose

把 `package.json` 中 18 个**未进入任何门禁链**的 `check:*` 脚本逐项处置到终态（接入 / 已被封装 / 别名 / 手动专用），并把"处置矩阵"沉淀为一个**机械门禁** `check:wiring-coverage`：此后任何新增 `check:*` 若未接线且未显式登记处置理由，`pnpm check` 即红。roadmap 明确"不以评估作为终态"。

## Current Baseline

全部为 2026-10-26 live 实测（HEAD `14f5c5ffc`，roadmap 激活提交；其父 `6aec33629`）：

- `package.json` 共 **44** 个 `check:*`；`pnpm check` 聚合 **26** 个（roadmap 10-19 记 43/25，其后新增的 `check:windows-safe-filenames` 自带接线）；**未接线 18 个**，与 roadmap 10-19 清单完全一致。
- 18 个的 live 归类（按实际被谁消费）：
  - **已被 `check:scanner-baselines` 棘轮封装（7）**：`check:audit-styling-suspects` / `check:audit-suspects` / `check:audit-test-global-leaks` / `check:audit-todo-exitless` / `check:audit-as-any-casts` / `check:audit-async-failure-paths` / `check:audit-react19-optimization-candidates`——对应 `scripts/check-scanner-baselines.mjs:18-26` 的 `BASELINED_SCANNERS` 七项；standalone 入口仅用于 triage 与 `--update-baselines`。
  - **已在 `pnpm lint` 链（2）**：`check:renderer-definition-fields-only`、`check:finite-prop-contracts`——`lint` 脚本直接 `node scripts/check-*.mjs`；CI `lint` job 运行（`.github/workflows/ci.yml:81`）。owner doc `audit-tooling.md` Hard Gates 表已标 "via `pnpm lint`"。
  - **别名（1）**：`check:duplicates` 与已接线的 `check:duplicates-baseline` 命令完全相同（均 `node scripts/check-duplicates.mjs`）。
  - **固有非门禁（1）**：`check:duplicates:detail` = `jscpd packages/ --config .jscpd.json` 原始 dump，jscpd 有重复即 exit 1（`docs/context/project-context.md:15` 已记"非门禁归因"）。
  - **真正零门禁（7）**，全部 exit 0 纯 advisory，live 命中数：`check:audit-canvas-wrapper-a11y` **0** / `check:audit-hardcoded-type-dispatch` **0** / `check:audit-missing-renderer-markers` **0**（假零——PH-2 已定性为 `rules.mjs:144-150` 两道整文件豁免（`RendererComponentProps` 门 + `nop-` 门）所致）/ `check:audit-fieldframe-bypasses` **12** / `check:audit-reactive-render-reads` **20** / `check:audit-performance-suspects` **27** / `check:audit-non-retained-renderer-references` **155**。
- 棘轮机制事实：`check:scanner-baselines` 以 `parseFoundCount` 正则 `/Found (\d+) (?:suspect )?matches/` 解析计数（`check-scanner-baselines.mjs:47-51`）；`find-non-retained-renderer-references.mjs:263` 输出为 `Found N suspect references across M non-retained types`——**不匹配该正则**，直接纳入会被判 `count unparseable` 红。其余 6 个均输出 `Found N suspect matches` 或 `No suspect matches found.`（后者无 `Found` 行，同样解析为 null——见 Phase 2 处理）。
- `scripts/baselines/scanner-baselines.json` 现登记 7 项（`lastUpdated: 2026-10-24`），`_header.description` 写死 "seven high-risk advisory scanners"；`--update-baselines` 分支也写死该字符串（`check-scanner-baselines.mjs:78-83`），且**整体重写文件、丢弃既有 `reRegistrationNotes`**——现行所有登记注记都靠手改保留。
- 既有测试：`scripts/__tests__/check-scanner-baselines.test.ts` 以 `--baseline <tmp>` 驱动真实脚本，覆盖 green / growth / shrink 三路径；无针对 `parseFoundCount` 格式的用例。**执行期勘误（2026-10-26 Phase 1 实跑）**：该文件把 live 计数硬编码为 221/716/108，而 live 已为 255/772/115，故 HEAD 上 3 条中 2 条（green、shrink）**已红**——是 in-scope confirmed live defect，Phase 2 修为运行时取 live 计数再 ±1 推导（见 Phase 2 新增 Fix 项）。
- 无任何机制检测"新增 `check:*` 但未接线"——这正是 roadmap 诊断的根因。

## Goals

- 18 个未接线 `check:*` 每个落到唯一终态处置，且处置**由脚本机械核验**而非表格声明。
- 7 个真正零门禁的扫描器纳入既有 `check:scanner-baselines` 棘轮（基线 = live 计数，含 `0`），不新建第二套基线。
- 新门禁 `check:wiring-coverage` 入 `pnpm check`：未接线且未登记 → 红；登记项失效（脚本已删 / 已接线 / 封装关系不成立）→ 红。
- 反向验证：注入一个未登记的 `check:*` 必红；把某棘轮基线调低必红。

## Non-Goals

- 不修改任何扫描器的**判定语义**（`check:audit-missing-renderer-markers` 的豁免 bug 归 PH-2）。
- 不清零任何扫描器命中（155/27/20/12 以棘轮承接，triage 归各 owner 面）。
- 不改 `lint` 链、CI job 结构、jscpd 配置。
- 不裁决 `check:duplicates:detail` 的 jscpd 输出内容。

## Scope

### In Scope

- `scripts/check-wiring-coverage.mjs`（新）+ `scripts/baselines/check-wiring-allowlist.json`（新）+ `scripts/__tests__/check-wiring-coverage.test.ts`（新）
- `scripts/check-scanner-baselines.mjs`：`BASELINED_SCANNERS` 7→14；`parseFoundCount` 接受 `suspect references` 与 `No suspect matches found.`（→0）；`_header.description` 去硬编码数字
- `scripts/baselines/scanner-baselines.json`：+7 项登记 + `reRegistrationNotes` 追加
- `scripts/__tests__/check-scanner-baselines.test.ts`：+ 格式解析与新扫描器集合用例
- `package.json`：`check` 聚合追加 `check:wiring-coverage`
- `docs/references/audit-tooling.md`：新增「Check Wiring Disposition」节（18 项矩阵 + 门禁说明），Heuristic Suspect Scanners 表标注棘轮覆盖
- roadmap PH-1 行状态回写；daily log

### Out Of Scope

- 扫描器规则文件 `scripts/audit/rules.mjs` 的任何改动
- 7 个新纳入扫描器的命中 triage
- `check:duplicates:detail` 行为

## Failure Paths

| 场景                      | 触发                                                                                                     | 行为                                                         | 可重试             | 用户可见        |
| ------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------ | --------------- |
| unregistered-check        | 新增 `check:foo` 未进 `check`/`lint`/别名/allowlist                                                      | `check:wiring-coverage` exit 1，列出脚本名与四种合法处置方式 | 是（接线或登记后） | `pnpm check` 红 |
| stale-allowlist           | allowlist 条目对应脚本已删除，或已被接线                                                                 | exit 1，提示删除条目                                         | 是                 | `pnpm check` 红 |
| broken-wrap-claim         | allowlist 声明 `wrappedBy: check:scanner-baselines` 但 wrapper 源码中无该扫描器名，或 wrapper 本身未接线 | exit 1                                                       | 是                 | `pnpm check` 红 |
| scanner-count-unparseable | 新纳入扫描器输出无 `Found`/`No suspect` 行                                                               | 既有 `scan failed or count unparseable` 红                   | 是                 | `pnpm check` 红 |
| baseline-growth           | 任一 14 项扫描器计数 > 基线                                                                              | 既有 growth 红                                               | 是                 | `pnpm check` 红 |

## Test Strategy

本档选择：**必须自动化**——交付物是 CI fail-fast 门禁（plan guide Minimum Rule 13 不可降级项）。Proof 项先于 Fix 项；每条 Proof 用例须在对应 Fix 落地前**真实失败**并在 Phase 文本记录失败证据。

## Execution Plan

### Phase 1 - Proof：先红用例

Status: completed
Targets: `scripts/__tests__/check-wiring-coverage.test.ts`、`scripts/__tests__/check-scanner-baselines.test.ts`

- Item Types: `Proof`

- [x] 新建 `check-wiring-coverage.test.ts`（11 用例，以 `--root <fixture>` 驱动：green / unregistered 红 / lint-chain / alias / manual-only / wrapped-by 通过 / wrapped-by 源码不含扫描器名红 / stale-不存在 红 / stale-已接线 红 / 脚本文件缺失 红 / live 仓库 green）。
- [x] `check-scanner-baselines.test.ts` 重写：既有 3 条改为 `beforeAll` 以 `--update-baselines --baseline <tmp>` 捕获 live 后派生；追加 ⑧ `suspect references` 格式 / ⑨ `No suspect matches found.`→0 / ⑩ 新扫描器基线调低必红 / ⑪ `--update-baselines` 输出含 14 项 / ⑫ `--update-baselines` 保留 `_header` notes。
- [x] 运行并记录失败证据。

Exit Criteria:

- [x] 2026-10-26 `npx vitest run --config vitest.scripts.config.ts scripts/__tests__/check-wiring-coverage.test.ts scripts/__tests__/check-scanner-baselines.test.ts` → **15 failed / 4 passed**：wiring 11 条全部红（脚本 ENOENT）；scanner-baselines ⑧⑨⑪⑫ 红（`unparseable` / 仅 7 项 / notes 丢失），⑩ 绿（既有 growth 路径），既有 3 条改动态取数后绿。
- [x] 失败证据已记录（本节）。

### Phase 2 - Fix：门禁实现与棘轮扩容

Status: completed
Targets: `scripts/check-wiring-coverage.mjs`、`scripts/baselines/check-wiring-allowlist.json`、`scripts/check-scanner-baselines.mjs`、`scripts/baselines/scanner-baselines.json`、`package.json`

- Item Types: `Fix`

- [x] 实现 `scripts/check-wiring-coverage.mjs`：读 `package.json`，取全部 `check:*`；判定顺序：`check` 聚合串中出现 `pnpm check:<name>` 或 `pnpm run check:<name>` 整词 token → `wired`；其命令里的 `scripts/*.mjs` 路径出现在 `lint` 脚本 → `lint-chain`；命令字符串与某个 `wired` 项完全相同 → `alias-of:<name>`；否则查 allowlist，允许 `{ wrappedBy: "<wired check>" }` 或 `{ manualOnly: "<reason>" }`；`wrappedBy` 须验证目标 check 已 `wired` 且其脚本源文本以引号包含本扫描器 basename；其余 → 红。allowlist 键对应 check 不存在或已被自动判定（wired/lint-chain/alias）→ stale 红。任何 check 命令引用的 `scripts/*.mjs` 不存在 → 红。"废弃"= 删除条目，stale 规则强制清 allowlist。**执行修订**：测试注入参数由计划的 `--package-json/--allowlist/--lint-script` 三参收敛为单一 `--root <dir>`（fixture 目录镜像仓库布局），更简单且覆盖同等场景。输出全部 check 的处置摘要表。
- [x] 新建 `check-wiring-allowlist.json`：`wrappedBy: check:scanner-baselines` ×14；`manualOnly` ×1（`check:duplicates:detail`）。`check:duplicates`（alias）与 2 个 lint-chain 项由脚本自动判定，不入 allowlist。
- [x] `check-scanner-baselines.mjs`：`BASELINED_SCANNERS` 7→14；`parseFoundCount` 接受 `(?:matches|references)` 且 `No suspect matches found.`→0；`--update-baselines` 读回既有 `_header` 展开后仅覆盖 `description`/`lastUpdated`，`reRegistrationNotes` 保留；description 改为引用 `BASELINED_SCANNERS` 的无数字表述（常量 `BASELINE_DESCRIPTION`）。
- [x] `scanner-baselines.json` 手改 +7（0/0/0/12/20/27/155）+ plan 754 注记（含 missing-renderer-markers 假零 → PH-2）；`lastUpdated` 2026-10-26；description 同步。
- [x] `package.json`：新增 `check:wiring-coverage` 并追加到 `check` 聚合末尾。
- [x] 【执行期新增 Fix】`check-scanner-baselines.test.ts` 既有 3 条改为 live 捕获派生（已在 Phase 1 落地，Phase 2 验证转绿）。

Exit Criteria:

- [x] 2026-10-26 两测试文件 **19/19 passed**（wiring 11 + scanner-baselines 8）。
- [x] `node scripts/check-wiring-coverage.mjs` exit 0，45 个 check 全部有处置（27 wired / 14 wrapped-by / 2 lint-chain / 1 alias / 1 manual-only）；注入 `check:zz-probe` 后 exit 1 并点名该项与 allowlist 提示（已验证并还原，`git diff --stat package.json` 仅 +2/−1）。
- [x] `pnpm check:scanner-baselines` exit 0（14 项 within baseline；discover-audit-suspects 771<772、react19 661<663 为工作树中他人未提交改动带来的可收窄量，基线未动）。

### Phase 3 - Docs：owner doc 矩阵与 roadmap 回写

Status: completed
Targets: `docs/references/audit-tooling.md`、`docs/backlog/platform-hardening-roadmap.md`、`docs/logs/2026/10-26.md`

- Item Types: `Fix`（owner-doc 与 live 一致性）

- [x] `audit-tooling.md`：新增 `## Check Wiring Disposition` 节（5 级判定顺序 + stale/缺文件/废弃语义 + 18 行矩阵）；Hard Gates 表新增 `check:scanner-baselines` 与 `check:wiring-coverage` 两行；§Rule 第 3 段补"14 个经棘轮间接受控"；Compound Commands `pnpm check` 行同步。
- [x] roadmap：PH-1 行 `todo`→`planned`（draft review 后）；§Framework `:66` 与 §Current Baseline `:86` 就地勘误为 14 类 / 2,403 条（原 7 类 live 2,189 + 新 7 类 214）；`planned`→`done` 留 closure audit 通过后同 commit 回写。
- [x] daily log 收口条目（`docs/logs/2026/10-26.md`，与本次 closure 回写同 commit）。

Exit Criteria:

- [x] `audit-tooling.md` 矩阵 18 行与 `node scripts/check-wiring-coverage.mjs` 输出逐行对照一致（14 wrapped-by / 2 lint-chain / 1 alias / 1 manual-only）。
- [x] `pnpm check` exit 0（含 `check:active-doc-code-anchors` 绿，新增反引号路径均存在）。

## Draft Review Record

- Reviewer / Agent: fresh-session sub-agent `agent_be8334d6`（2026-10-26）
- Verdict: `pass-with-minors`（0 Blocker / 0 Major / 7 Minor）
- Rounds: 1
- Findings addressed: 无 Blocker/Major。7 Minor 全部采纳并已落文：①基线 commit 表述改 HEAD `14f5c5ffc`/父 `6aec33629`；②`parseFoundCount` 行号 47-51；③`rules.mjs` 豁免范围 144-150；④roadmap `:86` 基线规模行一并勘误；⑤"废弃"处置语义写明；⑥`wired` 判定 token 格式钉死；⑦`--update-baselines` 丢 notes 纳入 Phase 2 修复。审阅者独立实跑 7 个扫描器核实计数 0/0/0/12/20/27/155 与输出格式声称，并测得 7 扫描器合计耗时约 1.8s。

## Closure Gates

- [x] 18 个未接线 `check:*` 每项落到唯一处置且由 `check:wiring-coverage` 机械核验（live 输出 45 项：27 wired / 14 wrapped-by / 2 lint-chain / 1 alias / 1 manual-only）
- [x] 7 个零门禁扫描器已入棘轮，基线登记含来源注记（`scanner-baselines.json` 2026-10-26 plan 754 条）
- [x] 反向验证完成：未登记 check 注入 → 红（live 探针 + 测试用例）；新扫描器基线调低 → 红（测试用例 ⑩）
- [x] 无 in-scope 项被静默降级为 deferred（Deferred 两条均为 roadmap 明文裁定的 ratchet 承接 / PH-2 范围）
- [x] `docs/references/audit-tooling.md` 已同步到 live；roadmap §Framework/§Current Baseline 计数已勘误；PH-1 行 `planned`→`done` 随 closure 回写
- [x] 由独立子 agent（fresh session）执行的 closure audit 已完成并记录证据——`agent_9e8ca2db`，2026-10-26，verdict `approved`（0 Blocker / 0 Major / 3 Minor，见 §Closure）
- [x] `pnpm typecheck` 45/45（2026-10-26）
- [x] `pnpm build` 45/45
- [x] `pnpm lint` 45/45
- [x] `pnpm test` 84/84 task 全绿；`pnpm test:scripts` 131 tests 中 **127 passed / 4 failed**——4 条失败位于 `check-console-baseline` ×1 / `check-flux-bundle-pack` ×2 / `find-ui-consistency-gaps` ×1，**与本 plan 无关且在 HEAD（stash 本 plan 全部改动后复跑）同样失败**，为 pre-existing 红，如实披露不归本 plan；本 plan 两文件 19/19 绿
- [x] `pnpm check` exit 0（零新增红；`check:wiring-coverage` 与扩容后的 `check:scanner-baselines` 均绿）

## Deferred But Adjudicated

### 7 个新纳入扫描器的存量命中（12/20/27/155）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: roadmap PH-1/PH-2 明文"以 ratchet 承接，不以零新增为目标"；本 plan 交付门禁而非清零，命中 triage 属各扫描器 owner 面（reactive-render-reads/performance → 运行时性能面；fieldframe → 表单契约面；non-retained → 命名基线面）。
- Successor Required: `no`（棘轮已锁只减不增；缩减走各自 owner plan 的 `--update-baselines` 收窄）

### `check:audit-missing-renderer-markers` 基线 0 为假零

- Classification: `watch-only residual`
- Why Not Blocking Closure: 语义修复与基线重建是 PH-2 的全部范围；本 plan 按 roadmap 约束只做"接入"。
- Successor Required: `yes`
- Successor Path: roadmap PH-2（plan 待起草）

## Non-Blocking Follow-ups

- `check:wiring-coverage` 的处置摘要可在未来扩展为 `docs/references/audit-tooling.md` 矩阵表的自动生成源（本 plan 手写两处并以 Exit Criteria 逐行对照）。

## Closure

Status Note: 18 个未接线 `check:*` 全部落到唯一处置并由新门禁 `check:wiring-coverage` 机械核验（45 项：27 wired / 14 wrapped-by / 2 lint-chain / 1 alias / 1 manual-only）；7 个此前零门禁的扫描器纳入 `check:scanner-baselines` 棘轮（7→14）；"扫描器写了没接线"的根因从此在 `pnpm check` 层面不可复发。owner doc 与 roadmap 计数同步；两条 deferred 均为 roadmap 明文裁定。

Closure Audit Evidence:

- Auditor / Agent: fresh-session sub-agent `agent_9e8ca2db`（2026-10-26）
- Evidence: verdict `approved`（0 Blocker / 0 Major / 3 Minor）。审计者独立实跑：`check-wiring-coverage.mjs` exit 0 且 45 项分布一致；`check-scanner-baselines.mjs` exit 0 共 14 项；两测试文件 19/19；自行注入 `check:zz-audit-probe` 得 exit 1 并精确还原（`package.json` diff 仍为 +2/−1）；逐行比对 `audit-tooling.md` 18 行矩阵与门禁 live 输出一致；roadmap `:66`/`:86` 勘误算术 2,189+214=2,403 核实；两条 Deferred 对照 roadmap `:137`/`:139`/`:110` 判定诚实；4 条 pre-existing `test:scripts` 红与 diff 文件集无交集；`pnpm check` 自跑 exit 0。3 Minor（Phase 3 日志项待勾 / `:86` "PH-1 done" 与行状态待同步 / Closure 节占位待填）全部在本 closure commit 内落地。

Follow-up:

- no remaining plan-owned work。`check:audit-missing-renderer-markers` 的假零语义修复归 roadmap PH-2（successor 已登记于 Deferred）；4 条 pre-existing `pnpm test:scripts` 红（console-baseline / flux-bundle-pack ×2 / ui-consistency-gaps）不属本 plan，已在 Closure Gates 如实披露，待各自 owner 处置。
