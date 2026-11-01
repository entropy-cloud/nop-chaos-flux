# 840 治理收编与文档漂移收口（deep-audit 2026-11-02 GV1/GV3-GV5/GV7）

> Plan Status: completed
> Last Reviewed: 2026-11-02
> Source: `docs/audits/deep-audit-2026-11-02.md` §2（GV1、GV3-GV5、GV7）
> Related: plan 628（本计划收编对象）、plan 841（承接 628 的代码债子集）、plan 784（PH-20 文档拆分，独立 owner，不触碰）

## Purpose

收编 16 天零进展的 active plan 628（逐条 triage → supersession）；清零三处 owner-doc 与 live 事实的漂移；补齐 playground manifest 的两处未声明 workspace 依赖。全部为文档/manifest 面，无产品行为变更。

## Current Baseline

> 执行期追加说明（2026-11-02）：Phase 2 的最后两项（ui description、form-advanced src/node_modules）来自 628 D 轨收编清点，与 GV3/GV5 同属"记录与 live 不一致"结果面，当场并入（628 Supersession Note 已标注 → 840 Phase 2）。

- **GV1**：`docs/plans/628-deep-audit-remediation-plan.md`（active，Last Reviewed 2026-10-17，0/84 勾选，git 最后触碰 2026-10-19）：A 轨 8 项中 7 项未动；基线节起草时已部分失真——错①已由 plan 595 解决（`schema-compiler.ts:49` + `render-diagnostics-fail-fast.test.tsx`）、错③已解决（`action-execution.ts:633-635` notify）、safe-area 四类 2026-06-22 已落地（`packages/ui/src/styles/mobile.css:11-24` + `mobile-styles.test.ts`）、编译缓存已由 plan 643-fm2/P14 部分落地（`render-nodes.tsx:137-159`）；B 轨 vite.config 红已由 plan 664 修复、scada-perf ×3 已由 plan 700 裁决、playground 测试红已消失（11-01 收口 86/86 全绿）；Related 行仍称 plan 621 "active"（实为 completed）。其余未落地项分两类：4 项代码债（→ plan 841：schema-renderer 失败态类型伪造 5 处、`runtime.ts:590` any、错④、错⑤）与一批 refactor/feature 级 residual（宽门面拆分、依赖集双层归一、test-support devDep、action-adapter i18n 耦合、factory ≤500 行、surface lifecycle、i18n 运行时翻译、picker 多选标签、维护者交接包、knip/duplicates 全量 triage、薄弱包测试、flux-compiler 测试归位）。
- **GV3**：`docs/context/project-context.md:17` 仍记 scada-editor-perf ×3「未经 watch-only 裁决，待独立裁决」；实际 plan 700（completed 2026-10-23）已裁决 console-gate 归门并落 PH-9 台账（`docs/testing/e2e-baseline-ledger.md:92,207`）。
- **GV4**：见上（本计划只处理 GV3/GV5 两处漂移；flux-guide/15-error-handling.md 的错②④⑤声称由 plan 841 修复代码时一并回写，避免同文件两轮改）。
- **GV5**：`docs/architecture/mobile-responsive-baseline.md:64`「实现状态：todo（M0.1a），当前代码库尚未实现」——代码 2026-06-22 已落地（540cb8e40，`packages/ui/src/styles/mobile.css:11-24` 四类 + `mobile-styles.test.ts:7-13`）。
- **GV7**：`apps/playground/src/complex-pages/shared/render-host.tsx:9,16` import `@nop-chaos/flux-renderers-pivot` / `@nop-chaos/flux-renderers-industrial/runtime`（master 6de105d8d 引入）未在 `apps/playground/package.json` 声明；knip live unlisted 37 vs baseline 35（unlisted 不被门禁拦）。评审实测（agent_be1828c2）：playground 内 pivot/industrial 的 unlisted 条目共 **16 个**（App.tsx、app-route-resilience.test.tsx、designer-hosts/registry-factory.ts、render-host.tsx、pages/pivot-table-demo.tsx、5 个 scada 页面、4 个 scada gallery 文件），且基线 35 在 10-17 时点已含部分同类条目——即声明两依赖后 live 回落至 **≈21（低于基线 35）**，而非回到 35；industrial 已有 `./runtime` export、pivot 走主入口（render-host.tsx:9 实测 import 的是 `@nop-chaos/flux-renderers-pivot` 主入口），无需补 export。

## Goals

- 628 状态翻转 `superseded`，Supersession Note 内逐项给出 disposition（已解决带证据 / →841 / residual 带分类与 non-blocking 理由），Related 引用漂移修正。
- GV3/GV5 owner-doc 与 live 一致。
- playground package.json 声明两个 workspace 依赖；knip live unlisted 由 37 回落至基线以下（预期 ≈21）。

## Non-Goals

- 不执行 628 的代码债（→ 841）；不动 816/819/835/837/838（并行会话领地，816 矛盾仅已在审计报告记录）；不动 784（独立 owner plan）；不改任何门禁规则与基线 JSON（GV7 通过补声明使 live 回落，不手改基线）。

## Scope

### In Scope

- 628 文件本体的 supersession 改写（active 计划，非 Rule 21 历史保护对象）；`docs/context/project-context.md:17`、`docs/architecture/mobile-responsive-baseline.md:64` 两处事实修正；`apps/playground/package.json` 补 2 个 workspace 依赖声明。

### Out Of Scope

- 一切产品代码变更；roadmap 文件（business-replication roadmap 被并行会话 WIP 占用）；docs 容量治理。

## Failure Paths

不适用：文档与 manifest 修正。

## Test Strategy

不适用：纯文档修正 + package.json 依赖声明（无行为变更）；manifest 正确性由 `pnpm install` + `pnpm check:knip`/`check:workspace-manifest-deps` 复核。

## Execution Plan

### Phase 1 - 628 收编（GV1）

Status: completed
Targets: `docs/plans/628-deep-audit-remediation-plan.md`

- Item Types: `Decision | Proof`

- [x] Decision：以治理审计矩阵（`docs/audits/deep-audit-2026-11-02.md` §2 GV1）为底稿，在 628 内新增 `## Supersession Note`：逐条 disposition——（a）已解决项附证据（plan 号 + file:line / 测试文件）；（b）4 项代码债标注 → plan 841（计数口径注记：A 轨「8 项」指 baseline §A 的 8 条 gap bullet，非 execution checklist 计数）；（c）residual 逐项给 Classification（`optimization candidate` / `out-of-scope improvement`）+ Why Not Blocking + Successor 归属（841 或无——无 owner 的写明"roadmap 复审时再裁决"，不得留空）
- [x] Fix：628 header `Plan Status: active` → `superseded`；Last Reviewed 更新为 2026-11-02；Related 行 621 状态引用修正
- [x] Proof：grep 628 无残留 "Plan Status: active"；Supersession Note 覆盖其全部 84 个 checklist 项所在 track（按 track 汇总即可，不逐 checkbox 复写）

Exit Criteria:

- [x] 628 内 `> Plan Status: superseded` 且 Supersession Note 三类 disposition 齐全、无悬空归属
- [x] 本计划（840）与 841 的相互引用成立（628 → 841 路径真实存在）

### Phase 2 - owner-doc 漂移修正（GV3、GV5、628 D 轨追加项）

Status: completed
Targets: `docs/context/project-context.md`、`docs/architecture/mobile-responsive-baseline.md`

- Item Types: `Fix`

- [x] Fix（GV3）：project-context.md:17 的 scada-editor-perf 待裁决文本就地更新为 plan 700 裁决终态（console-gate 归门、PH-9 台账在册、附 ledger 行号）
- [x] Fix（GV5）：mobile-responsive-baseline.md:64 safe-area 状态行改为已落地（附 `packages/ui/src/styles/mobile.css` 与测试文件指针），删除 todo（M0.1a）标注
- [x] Fix（628 D 轨收编追加）：`packages/ui/package.json` description 去 Radix 字样（实际依赖 @base-ui/react）
- [x] Fix（628 D 轨收编追加）：删除空残留目录 `packages/flux-renderers-form-advanced/src/node_modules/`（git-ignored、零内容；包级 node_modules 为 pnpm 正常结构，不动）

Exit Criteria:

- [x] 四处与 live repo 可观测事实一致（按上列指针可复核）；`src/node_modules` 不复存在

### Phase 3 - manifest 依赖声明（GV7）

Status: completed
Targets: `apps/playground/package.json`

- Item Types: `Fix | Proof`

- [x] Fix：dependencies 补 `"@nop-chaos/flux-renderers-pivot": "workspace:*"`、`"@nop-chaos/flux-renderers-industrial": "workspace:*"`（industrial 已有 `./runtime` export，pivot 走主入口，均无需补 export）
- [x] Proof：`pnpm install` 后 `node scripts/check-knip-baseline.mjs` 绿且 live unlisted 降至基线以下（预期 ≈21）；`pnpm check:workspace-manifest-deps` 绿

Exit Criteria:

- [x] knip live unlisted 37→≈21（< 基线 35，不触碰基线 JSON）；check 链相关单项绿
- [x] playground dev/build 不受影响（`pnpm --filter @nop-chaos/flux-playground typecheck` 局部绿）

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（agent_be1828c2-90b0-4848-83de-e0d30f179a0a）
- Verdict: round-1 fail（2 Major：unlisted 37→35 算术错误〔实际 ≈21〕、commit hash 笔误）→ 修订 → round-2 pass-with-minors（零 Blocker/Major，1 Minor：收口后 knip 基线 counts.unlisted 35 头相对 live ≈21 数值性过期——记 daily log 或下次基线 sync 顺带记账，不改 plan 文本）
- Rounds: 2
- Findings addressed: Major-1（unlisted 构成 16 条实测写入 GV7、目标改 ≈21）；Major-2（hash 6de105d8d）；Minor（--filter 包名、GV1 计数口径注记）均已就地修正

## Closure Gates

- [x] GV1/GV3/GV5/GV7 全部落地
- [x] 不存在被静默降级的 in-scope 缺陷
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据（agent_66ba5cb2-ad91-4f43-8099-1d5569dcd4f3，approved 零 Blocker/Major/阻塞 Minor）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

（执行中如有改判当场落此节）

## Non-Blocking Follow-ups

- 816 状态机矛盾（GV2）：81x 领地，由 business-replication 会话自行翻转；本计划不触碰。

## Closure

Status Note: GV1（628 superseded + 逐条 disposition 矩阵）/GV3/GV5/GV7 + 628 D 轨追加两项（ui description、src/node_modules 残留）全部落地；playground pivot/industrial unlisted 16→0、live 总数 37→21（< 基线 35，基线 JSON 未触碰）、check-knip-baseline 绿、lockfile 仅 +6 行 importer、playground typecheck 绿。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session 子代理（agent_66ba5cb2-ad91-4f43-8099-1d5569dcd4f3），2026-11-02
- Evidence: 三 Phase 落地逐项 git diff 实证（628 supersession header/Related/Supersession Note、project-context :17、mobile baseline :63-65、ui description、src/node_modules 删除、manifest + lockfile +6 行 importer）；16 条声称-实况抽核全部成立（plan 595/664/700 证据、schema-renderer 5 处伪造现状、factory 681 行、duplicates 533/2.3%、flux-compiler 43 test 等）；本轮独立复跑 knip gate 绿 + live unlisted 21 + playground typecheck 绿；628 disposition 零悬空归属；审计临时产物已清理

Follow-up:

- knip 基线 counts.unlisted 35 头相对 live 数值性过期（评审 Minor，记 daily log，下次基线 sync 顺带）
