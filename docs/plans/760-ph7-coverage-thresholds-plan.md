# 760 PH-7 覆盖率门禁补齐（6 包 thresholds + editor-core config）

> Plan Status: completed
> Last Reviewed: 2026-10-26
> Source: `docs/backlog/platform-hardening-roadmap.md` PH-7（C 组线性）
> Related: `vitest.shared.ts` `createSharedVitestConfig`；`packages/flux-core/vitest.config.ts`（80/80/80/80 口径先例）；CI `coverage` job（`.github/workflows/ci.yml:100-115` 跑 `pnpm test:coverage`）

## Purpose

让全部 43 个有测试的包在 CI coverage job 下都有**可执行**覆盖率门禁。现状 7 个包静默缺席（6 个有 vitest config 但无 `coverage.thresholds`，`editor-core` 连 config 都没有）。处置口径：**不留静默缺席**——能达 80 的用仓库标准 80/80/80/80；达不到的按 live 实测登记棘轮基线（floor(live)−1）并注明差距，后续只增不减。

## Current Baseline

2026-10-26 live（HEAD `d9149484b`），`npx vitest run --coverage`（v8，`src/**/*.{ts,tsx}` 排除测试）：

| 包                   | Stmts     | Branch    | Funcs     | Lines     | 测试文件 | 现状                                         |
| -------------------- | --------- | --------- | --------- | --------- | -------- | -------------------------------------------- |
| flux-print-core      | 91.66     | **75.97** | 92.3      | 94.84     | 9        | 无 thresholds                                |
| flux-print-renderers | 82.75     | **75**    | **76.27** | 84.02     | 8        | 无 thresholds                                |
| flux-xlang-debug     | 81.92     | **64.35** | **79.7**  | 82.53     | 10       | 无 thresholds                                |
| flux-xlang-lang      | **74.28** | 83.33     | **57.14** | **76.47** | 2        | 无 thresholds                                |
| tailwind-preset      | 93.33     | 88.88     | 100       | 93.33     | 2        | 无 thresholds                                |
| theme-tokens         | 100       | 100       | 100       | 100       | 2        | 无 thresholds                                |
| editor-core          | 81.66     | **70.86** | 92        | 88.31     | 2        | **无 vitest.config.ts**（`vitest run` 裸跑） |

- 仓库口径：`createSharedVitestConfig({ coverage: { provider:'v8', reporter:['text','json-summary'], include, exclude, thresholds } })`（flux-core 先例）；36 个包已有 thresholds。
- CI：`coverage` job 跑 `turbo run test -- --coverage`，thresholds 未达即 fail → 本 plan 落地后 7 包纳入该门禁。
- owner doc：roadmap 指 `docs/testing/index.md`，但该文件是 testing issue 索引（`## Index (Reverse Chronological)`），不承载基线表 → **执行决策**：新建 `docs/testing/coverage-thresholds.md` 承载口径与 7 包登记表，`index.md` §Usage 加一行指针。

## Goals

- 7 个包全部有 `coverage.thresholds`（editor-core 同时获得 `vitest.config.ts`）。
- 阈值口径：指标 live ≥ 81 → 80；live < 81 → `floor(live) − 1`（留 ≥1 点余量防抖动），并在 config 内注明 live 值与 plan 编号。
- `pnpm test:coverage` 对 7 包全部通过；反向探针（任一阈值调到 live+5）→ 红。
- `docs/testing/coverage-thresholds.md` 登记 7 包阈值、差距与收窄规则（只增不减；达 80 后改标准口径）。

## Non-Goals

- 不补测试提升覆盖率（低于 80 的差距登记为 owner 面后续工作，非本 plan）。
- 不改 `vitest.shared.ts`。
- 不涉入 mutation（arm2 MA4.5 已交付）。

## Scope

### In Scope

- 7 个 `packages/*/vitest.config.ts`（6 改 1 新）
- `docs/testing/coverage-thresholds.md`（新）、`docs/testing/index.md` 指针
- roadmap PH-7 回写、daily log

### Out Of Scope

- 其余 36 包阈值；测试补写

## Failure Paths

| 场景            | 触发                 | 行为                                            | 可重试 | 用户可见 |
| --------------- | -------------------- | ----------------------------------------------- | ------ | -------- |
| coverage-drop   | 包覆盖率跌破阈值     | `vitest --coverage` exit 1 → CI coverage job 红 | 是     | PR 红    |
| threshold-raise | owner 面补测后要收窄 | 手改 thresholds（只增），更新登记表             | —      | —        |

## Test Strategy

本档选择：**必须自动化**——交付物是 CI 门禁。Proof = 反向探针（阈值高于 live 必红）+ 正向全过。

## Execution Plan

### Phase 1 - Proof：阈值可判定

Status: completed
Targets: `packages/editor-core/vitest.config.ts`

- Item Types: `Proof`

- [x] editor-core 新建 config，branches 阈值先设 90（live 70.86）→ `npx vitest run --coverage` 输出 `ERROR: Coverage for branches (70.86%) does not meet global threshold (90%)`，exit 1。
- [x] 改为正式阈值 69 → 绿。

Exit Criteria:

- [x] 红证据记录在本节。

### Phase 2 - Fix：7 包阈值落地

Status: completed
Targets: 7 个 vitest.config.ts

- Item Types: `Fix`

- [x] 阈值按 Current Baseline 写入；exclude 精确为测试文件 + `__tests__`（barrel/types 计入）；低于 80 的指标带 `// plan 760 ratchet: live …` 注释。**执行修订**：tailwind-preset / theme-tokens 原 config 含 `includeWorkspaceAliases: false`，重写时一度丢失，已补回（diff 核对）。
- [x] 7 包 `npx vitest run --coverage` 全部 exit 0。

Exit Criteria:

- [x] 7 包 coverage 全 exit 0。

### Phase 3 - Docs 与回写

Status: completed
Targets: `docs/testing/coverage-thresholds.md`、`docs/testing/index.md`、roadmap、daily log

- Item Types: `Fix`

- [x] `coverage-thresholds.md`（规则 + 7 包登记表 + barrel/types 计入说明 + 收窄步骤）；`index.md` §Usage 指针。
- [x] roadmap PH-7 `todo`→`planned`（Owner Doc 列已勘误为 `coverage-thresholds.md`）→`done`（closure 同 commit）；daily log（closure 同 commit）。

Exit Criteria:

- [x] `pnpm check` exit 0（见 Closure Gates）。

## Draft Review Record

- Reviewer / Agent: fresh-session sub-agent `agent_a19a7a79`（2026-10-26）
- Verdict: `pass-with-minors`（0 Blocker / 0 Major / 3 Minor）
- Rounds: 1
- Findings addressed: 无 Blocker/Major。3 Minor 落文：①exclude 精确数组且说明与 flux-core 口径有意不同；②roadmap Owner Doc 列重指；③barrel/types 计入说明。审阅者独立复测 4 包 live 覆盖率零漂移，确认 `--coverage` 经 turbo 可达无 config 的 editor-core。

## Closure Gates

- [x] 7 包 thresholds 落地（editor-core 含新 config）
- [x] 反向探针红（editor-core branches 90 / 审计者 76 → exit 1）+ 7 包 `--coverage` 全绿
- [x] 登记表与 config 一致（审计者逐行核对）
- [x] 无 in-scope 项被静默降级（低于 80 的差距全部登记；零测试文件改动）
- [x] 由独立子 agent（fresh session）执行的 closure audit 已完成并记录证据——`agent_6ada53f5`，2026-10-26，verdict `approved`（0 Blocker / 0 Major / 2 Minor，见 §Closure）
- [x] `pnpm typecheck` 45/45
- [x] `pnpm build` 45/45
- [x] `pnpm lint` 45/45
- [x] `pnpm test` 84/84
- [x] `pnpm check` exit 0

## Deferred But Adjudicated

### 5 包低于 80 的指标差距（最大：xlang-lang functions 57%）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: roadmap PH-7 范围是"补齐或显式登记"，门禁已落地防回退；补测属各包 owner 面（xlang-lang 仅 2 测试文件，是 FM/arm2 已知薄弱面）。
- Successor Required: `no`（登记表即 backlog，owner 面触及时收窄）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 7 个静默缺席覆盖率门禁的包全部纳入 CI coverage job：2 包标准 80/80/80/80，5 包按 floor(live)−1 棘轮登记并注明差距；editor-core 首次获得 vitest config。登记表 `docs/testing/coverage-thresholds.md` 承载口径与收窄规则。

Closure Audit Evidence:

- Auditor / Agent: fresh-session sub-agent `agent_6ada53f5`（2026-10-26）
- Evidence: verdict `approved`（0 Blocker / 0 Major / 2 Minor）。审计者独立实跑 7 包 `--coverage` 全 exit 0 且 live 数值与基线/登记表逐行一致；自做反向探针（editor-core branches 69→76 → exit 1）并字节级还原；确认 `includeWorkspaceAliases: false` 保留、exclude 精确、注释齐全；`pnpm check` exit 0；turbo `-- --coverage` 可达 editor-core；零测试文件改动。2 Minor 均为 closure commit 记账项（本次落地）。

Follow-up:

- no remaining plan-owned work。5 包低于 80 的差距见登记表，由各 owner 面补测后按收窄步骤上调。
