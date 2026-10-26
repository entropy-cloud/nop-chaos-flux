# 761 PH-8 构建产物基线：flux-bundle 体积预算门禁 + React Compiler 包级裁定

> Plan Status: completed
> Last Reviewed: 2026-10-26
> Source: `docs/backlog/platform-hardening-roadmap.md` PH-8（C 组；两项同属构建产物面，Rule 22 合并）
> Related: `scripts/check-flux-bundle-pack.mjs`（已验证 tarball 形状，本 plan 在其产物上加体积面）；`scripts/check-scanner-baselines.mjs`（棘轮先例）；owner doc `docs/architecture/frontend-baseline.md`

## Purpose

① 为宿主可见发布产物 `@nop-chaos/flux` tarball 建立**机械体积预算**（现状零 size 门禁）；② 对 React Compiler 的包级启用做出**裁定并落 owner doc**（现状仅 playground 启用，无文档化决策）。

## Current Baseline

2026-10-26 live（HEAD `269783a85`）：

- 无任何 size-limit / bundle budget 机制；`check:flux-bundle-pack` 跑 `scripts/pack-flux-bundle.mjs`（build + pack → `dist-packages/nop-chaos-flux-<ver>.tgz`）后只校验清单/peer/样式形状，不量体积。
- 当前 tarball 实测：**6,806,038 B**（6.49 MiB）；解包 JS 合计 **10,542,432 B**；主入口 `package/dist/index.js` **5,169,936 B**；最大懒加载 chunk `three-canvas-*.js` 1,903,106 B（three.js 落异步 chunk 的既有裁定）；`index.js.map` 10.3 MB 在包内。
- React Compiler：根 devDep `babel-plugin-react-compiler@1.0.0`；仅 `apps/playground/vite.config.ts:30` 经 `babel({ presets: [reactCompilerPreset({ target: '19' })] })` 启用；43 个 package 的 build 走 `tsc -p tsconfig.build.json`（库包不经 babel），flux-bundle 走 vite lib build 无 compiler 插件。AGENTS "React 19 + React Compiler 是基线" 指**应用侧**：包内代码按 Compiler-friendly 规则书写（不手写 memo），但发布产物不含编译器输出。
- `frontend-baseline.md`（10.5KB）§Tooling and Quality Gates / §Host-Facing Release Baseline 无体积与 compiler 条目。

## Goals

- 新门禁 `check:bundle-size`：读 `dist-packages/` 最新 tarball（无则调用 pack 脚本），量三指标（tarballBytes / jsBytes / mainEntryBytes）对 `scripts/baselines/bundle-size-baseline.json` 判定：任一指标超基线 **+5%** → 红；低于基线 → 提示可收窄（不红）；基线更新须带注记（手改，棘轮只降不升——升须人确认并写理由）。支持 `--tarball`/`--baseline` 注入供测试。
- 入 `pnpm check`（`check:wiring-coverage` 强制）；fixture 测试先红后绿（合成 tgz）。
- React Compiler 裁定（decision）：**包级不启用、应用级 opt-in**。理由落 `frontend-baseline.md` 新节：发布产物不应绑定编译器运行时版本（消费方 React 版本/编译器由宿主决定）；库包以 Compiler-friendly 源码规则（AGENTS React 19 规则）保证宿主编译时可优化；apps 各自 opt-in（playground 已启用）。
- `frontend-baseline.md` 新节同时登记体积预算口径与当前基线。

## Non-Goals

- 不缩减体积（index.js 5.2MB 等的优化归各 owner 面，预算只防回退）。
- 不引入 size-limit 依赖（复用 pack 产物 + 自研脚本，零新依赖，与 check:\* 体系一致）。
- 不改 flux-bundle 构建配置、不动 source map 打包策略（登记为观察项）。
- 不在任何 package build 接入 React Compiler。

## Scope

### In Scope

- `scripts/check-bundle-size.mjs`（新）、`scripts/baselines/bundle-size-baseline.json`（新）、`scripts/__tests__/check-bundle-size.test.ts`（新）
- `package.json`：`check:bundle-size` + 聚合
- `docs/architecture/frontend-baseline.md` 新节；`docs/references/audit-tooling.md` Hard Gates 行
- roadmap PH-8 回写、daily log

### Out Of Scope

- 其它包的体积预算；体积优化；playground 构建

## Failure Paths

| 场景             | 触发                    | 行为                                              | 可重试                   | 用户可见        |
| ---------------- | ----------------------- | ------------------------------------------------- | ------------------------ | --------------- |
| budget-exceeded  | 任一指标 > 基线×1.05    | exit 1，打印指标/基线/增幅                        | 是（优化或人确认升基线） | `pnpm check` 红 |
| no-tarball       | `dist-packages/` 无 tgz | 调用 `pack-flux-bundle.mjs` 后重试；仍无 → exit 1 | 是                       | 红              |
| baseline-missing | 基线文件缺失            | exit 1 提示手建                                   | 是                       | 红              |
| shrink           | 指标 < 基线             | exit 0 + 提示可收窄                               | —                        | 绿              |

## Test Strategy

本档选择：**必须自动化**（CI 门禁）。合成 tgz fixture：green（等于基线）/ red（+7%）/ shrink（−20%）/ missing baseline。

## Execution Plan

### Phase 1 - Proof：fixture 先红

Status: completed
Targets: `scripts/__tests__/check-bundle-size.test.ts`

- Item Types: `Proof`

- [x] 5 用例（合成 tgz：等于基线 → 0；jsBytes +7% → 1 且 stderr 含 `jsBytes`/限值；−20% → 0 且提示 `can be tightened`；基线缺失 → 1；live（`skipIf` 无 tarball）→ 0）。
- [x] 先红：2026-10-26 `5 failed (5)`（脚本 ENOENT）。

Exit Criteria:

- [x] 先红证据在本节。

### Phase 2 - Fix：门禁与基线

Status: completed
Targets: `scripts/check-bundle-size.mjs`、`scripts/baselines/bundle-size-baseline.json`、`package.json`

- Item Types: `Fix`

- [x] 脚本：`tar -tf` 列名 + 逐条 `tar -xOf` 计字节；三指标；基线 `_header.tolerance`；无 tarball 时调用 pack 脚本；`--tarball`/`--baseline` 注入。
- [x] 基线：6,806,038 / 10,542,432 / 5,169,936（脚本实测与 `tar -tvf` 手测完全一致），`_header` 含身份与 map 注记。
- [x] `package.json`：`check:bundle-size` 紧跟 `check:flux-bundle-pack`；`check:*` 键重排为字母序（`owner-doc-semantics` 位置微调）；`check:wiring-coverage` 绿。
- [x] 反向探针：基线 jsBytes ×0.9 → `BUDGET EXCEEDED … exceeds baseline 9488188 by more than 5%`；还原后绿。

Exit Criteria:

- [x] 5/5 绿；live exit 0；反向探针红。

### Phase 3 - Decision + Docs

Status: completed
Targets: `frontend-baseline.md`、`audit-tooling.md`、roadmap、daily log

- Item Types: `Decision` + `Fix`

- [x] `frontend-baseline.md` 新节 "Build Artifact Baseline"（size budget 三指标表 + ratchet 规则 + tar 可移植性 + React Compiler 裁定：包级不启用 / 应用 opt-in / 理由 / 两条拒绝的替代方案）。
- [x] `audit-tooling.md` Hard Gates 行。
- [x] roadmap PH-8 `todo`→`planned`→`done`（closure 同 commit）；PH-12 行加 source map 移交注；daily log（closure 同 commit）。

Exit Criteria:

- [x] `pnpm check` exit 0（见 Closure Gates）。

## Draft Review Record

- Reviewer / Agent: fresh-session sub-agent `agent_f644be1c`（2026-10-26）
- Verdict: `pass-with-minors`（0 Blocker / 0 Major / 6 Minor）
- Rounds: 1
- Findings addressed: 无 Blocker/Major。6 Minor 全部落地：①`tar -tvf` size 列跨 tar 实现不稳 → 改 `tar -xOf` 逐条计字节；②live 用例 `skipIf` 无 tarball；③基线 `_header` 记 tarballName/version/commit；④tarballBytes 保留并注明含 map；⑤聚合顺序显式紧跟 `check:flux-bundle-pack`；⑥roadmap PH-12 行加 source map 移交注。审阅者独立复测三指标与 plan 完全一致，并确认 React Compiler 裁定为文档化现状、满足 plan-first、无需额外人工门。

## Closure Gates

- [x] `check:bundle-size` 入 `pnpm check`（紧跟 flux-bundle-pack），基线登记，反向探针红（执行者 jsBytes×0.9 / 审计者 mainEntryBytes×0.9）
- [x] React Compiler 裁定落 owner doc（显式 non-goal for packages；审计者对照 live 构建配置核实）
- [x] 无 in-scope 项被静默降级（source map 移交 PH-12 行已登记）
- [x] 由独立子 agent（fresh session）执行的 closure audit 已完成并记录证据——`agent_ce1f9871`，2026-10-26，verdict `approved`（0 Blocker / 0 Major / 2 Minor，见 §Closure）
- [x] `pnpm typecheck` 45/45
- [x] `pnpm build` 45/45
- [x] `pnpm lint` 45/45
- [x] `pnpm test` 84/84（test:scripts 156 + 4 pre-existing 红）
- [x] `pnpm check` exit 0

## Deferred But Adjudicated

### source map（10.3MB `index.js.map`）是否随 tarball 发布

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 属发布策略面（PH-12 裁定范围）；本 plan 的 jsBytes 指标已排除 `.map`，tarballBytes 含之但作为整体预算仍可判定。
- Successor Required: `no`（PH-12 起草时纳入）

## Non-Blocking Follow-ups

- 其它 host-facing 包（如 `@nop-chaos/ui`）的体积面在需要时追加到基线 json（脚本按 tarball 维度设计，可扩）。

## Closure

Status Note: 宿主可见发布产物 `@nop-chaos/flux` tarball 首次有体积预算门禁（三指标 +5% 棘轮，复用 pack 产物、零新依赖、跨 tar 实现可移植）；React Compiler 包级不启用 / 应用 opt-in 的裁定及理由落 owner doc。

Closure Audit Evidence:

- Auditor / Agent: fresh-session sub-agent `agent_ce1f9871`（2026-10-26）
- Evidence: verdict `approved`（0 Blocker / 0 Major / 2 Minor）。审计者独立 one-liner 复测三指标零漂移；5/5 用例且判别性确认；自做反向探针 mainEntryBytes×0.9 → `BUDGET EXCEEDED` 并字节级还原；聚合顺序/wiring/`pnpm check` 核实；owner doc 决策对照 live 构建配置核实且为最终态表述。2 Minor（Test Strategy "+6%" 措辞 → +7%；owner doc 补收窄提示一句）已在本 closure commit 折入。

Follow-up:

- no remaining plan-owned work。source map 发布裁定归 PH-12；其它 host-facing 包的体积面按需追加基线。
