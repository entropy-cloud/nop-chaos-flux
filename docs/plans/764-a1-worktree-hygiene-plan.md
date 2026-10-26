# 764 A1 工作区/提交卫生收口（深度审计 A 组 remediation）

> Plan Status: completed
> Last Reviewed: 2026-10-27
> Source: `docs/analysis/2026-10-27-deep-audit-report.md` A1–A6
> Related: plan `762`（PH-9 台账，本 plan 承接其收口）、plan `746`（json-viewer 修复消费侧落地）

## Purpose

把上一中断会话遗留的未提交工作如实落库或清理：plan 762 台账按其自身 Exit Criteria 收口提交；孤儿文件删除；ai-debugger-copilot 程序启动文件成套落库；docs 导航补录。收口后 `git status` 干净（Phase 3 Exit Criteria 为准）。

## Current Baseline

- `pnpm typecheck` exit 0；`pnpm check` 既有门禁全绿（2026-10-27 实测 typecheck）。
- 未提交（`git status`）：plan 762 + `docs/testing/e2e-baseline-ledger.md`（实质完成：251 项归因、8 批隔离复跑证据、A 类=0，但 plan 勾选 2/15、header `active`）；ai-debugger-copilot 三件套（roadmap / missions json / optional test）+ `ai-renderer-definitions.ts` +6 行注释；`packages/ui/src/json-viewer-dark.css`（孤儿，plan 746 修复实际经 commit `621ce3e41` 消费侧落地，此文件无处 import）；已追踪文件的小改动：`docs/analysis/...04-e2e-domain-pages.md`（+15/−24）、arm2 plan 重复行删除。
- 762 剩余回写：`known-good-baselines.md` 指针、roadmap PH-9 `planned`→`done`、daily log、`pnpm check`。
- `packages/flux-renderers-basic/src/temp/` 空目录残留；`_tmp/` 976 项、`test-results/` 21 项陈旧产物（均 gitignored）。
- optional 测试超时：`vitest.scripts.config.ts` testTimeout 30s < 测试内默认 60s。
- 基线核验精确口径：`pnpm typecheck` 本会话 2026-10-27 实跑 exit 0；`pnpm check` 全绿依据 HEAD `3f4c551e2` 提交记录（PH-11 收口时 exit 0），本 plan 收口时复跑。

## Goals

- plan 762 完成剩余回写 → 独立 closure audit → 连同台账成套提交，`Plan Status: completed`。
- 孤儿 `json-viewer-dark.css` 与空 `temp/` 删除；`_tmp/`、`test-results/` 清扫（保留目录本身）。
- ai-debugger-copilot 程序文件成套提交（roadmap/mission/optional test/注释），optional 测试超时参数对齐（60_000 或 NOP_AI_LOCAL_TIMEOUT_MS 默认调至 25s 内的干净失败）。
- `docs/index.md` 与 `docs/testing/index.md` 补录 e2e 台账与新程序导航。
- 遗留的两个已追踪文件小改动核对后一并提交。

## Non-Goals

- 不修复台账 B/D/E 类任何实例（承接指针已在台账内）。
- 不实现 ai-debugger-copilot 的 AD-0..AD-6 队列（只落程序启动基线）。
- 不动 packages/ui 公共导出面（CSS 文件是孤儿，直接删除，无导出变更）。

## Scope

### In Scope

- plan 762 回写与收口、`docs/testing/e2e-baseline-ledger.md`、`known-good-baselines.md`、roadmap PH-9 行、daily log
- 删除：`packages/ui/src/json-viewer-dark.css`、`packages/flux-renderers-basic/src/temp/`
- 提交：ai-debugger-copilot 三件套 + `ai-renderer-definitions.ts` 注释 + optional 测试超时修正
- `docs/index.md`、`docs/testing/index.md` 导航补录
- `_tmp/`、`test-results/` 陈旧产物清扫
- 两个已追踪文件遗留 diff 的核对与提交

### Out Of Scope

- e2e 重跑（762 的运行/复跑证据已采集于 10-26，不重采）
- Plan B/C/D 的全部内容

## Test Strategy

本档选择：`不适用：纯文档 + 删除孤儿文件 + 提交既有已验证产物；唯一代码相邻改动是 optional 测试的超时常量（该测试默认 skipIf 未启用）；`scripts/`不在根 tsconfig project references（typecheck 可豁免），但`eslint.config.js`覆盖`scripts/`，故 Closure Gates 保留 `pnpm lint`。验证以根目录 `pnpm test:scripts` 全绿为准（确认 optional 文件被 skip 不破坏 harness）。`不适用` 理由因此限定为：无产品行为变更、无类型面变更。

## Execution Plan

### Phase 1 - plan 762 收口

Status: completed
Targets: `docs/plans/762-*`、`docs/testing/e2e-baseline-ledger.md`、`docs/testing/known-good-baselines.md`、roadmap、daily log

- Item Types: `Fix`

- [x] 逐项核对台账与 762 Exit Criteria：勾 Phase 1-3 Exit Criteria 与 Closure Gates（audit 项除外）
- [x] `known-good-baselines.md` 加台账指针；roadmap PH-9 `planned`→`done`；daily log 记 762 收口
- [x] 独立子代理 closure audit（fresh session）通过后勾 audit 项、置 `completed`（agent_9329788e，approved，提交 731133367）

Exit Criteria:

- [x] 762 `Plan Status: completed`，全部 in-scope 勾选项无残留 `[ ]`；closure audit 证据落 plan

### Phase 2 - 孤儿清理与程序落库

Status: completed
Targets: `packages/ui/src/json-viewer-dark.css`、`packages/flux-renderers-basic/src/temp/`、ai-debugger-copilot 三件套、`vitest.scripts.config.ts` 或 optional 测试、`ai-renderer-definitions.ts`

- Item Types: `Fix`

- [x] 删除孤儿 CSS 与空 temp/；确认 `grep -rn json-viewer-dark` 仅剩审计/计划文档自身引用
- [x] optional 测试超时对齐（fetch 默认 25s < harness 30s；测试级 timeout = NOP_AI_LOCAL_TIMEOUT_MS+5s）；`pnpm test:scripts` 失败集相对 HEAD 无新增（HEAD 既有 4 红不变）
- [x] 核对遗留 diff：`04-e2e-domain-pages.md` 为格式劣化（对应 \_tmp mangled-backup）→ 已回滚；arm2 plan 重复未勾行删除 → 保留随提交②入库

Exit Criteria:

- [x] 已删孤儿确认：`packages/ui/src/json-viewer-dark.css` 与 `packages/flux-renderers-basic/src/temp/` 不存在；optional 测试以 skip 状态通过，`pnpm test:scripts` 无新增失败（HEAD 既有 4 红 → 移交 Plan D，见 Deferred）

### Phase 3 - 导航补录与提交

Status: planned
Targets: `docs/index.md`、`docs/testing/index.md`、git

- Item Types: `Fix`

- [x] docs/index.md 补 ai-debugger-copilot roadmap 与 e2e 台账导航；docs/testing/index.md 补台账条目（check:active-doc-code-anchors 实测抓住初版悬空锚点 nop-debugger-ai.md，已改为 AD-0 建立说明）
- [x] `_tmp/` 陈旧产物清扫 975 项（保留 `_tmp/ph9-e2e/` 762 审计证据）、`test-results/` 清空
- [x] 分三次提交：①762 收口（731133367）②A 组余项（4692c2f91）③审计报告 + 764 计划文档 + daily log/index.md 尾项（765 草稿不入本提交，随 Plan B 提交）；提交前 `git status -s tests/e2e/artifacts/` 确认无 A/M。提交授权依据：用户 goal 原文「每个plan执行完毕后自动提交一次」（本会话输入，2026-10-27），daily log 已记录

Exit Criteria:

- [x] `pnpm check` exit 0（复跑，含悬空锚点修正）；`pnpm lint` exit 0；提交①②落库，提交③随本 closure 入库

## Draft Review Record

- Reviewer / Agent: fresh-session sub-agent `agent_30e324ed`（2026-10-27）
- Verdict: `pass-with-minors`（R1 fail：1 Major / 6 Minor，全部修正；R2 复检通过，2 residual Minor 落文）
- Rounds: 2
- Findings addressed: R1 Major = Closure Gates 补 `pnpm lint`（scripts/ 被 eslint 覆盖）；Minors：diff 计数 +15/−24、删除无效 filter 命令、第三提交覆盖审计报告与计划文档、Phase 2 判据收窄到已删孤儿、提交授权引 user goal 原文并落 daily log、基线核验口径精确化。R2 residual Minors：Purpose 句已同步；授权引文以 daily-log 记录机制承载（随提交①落库）。

## Closure Gates

- [x] A1-A6 全部处置（landed / 删除 / 清扫 / 回滚）
- [x] 762 独立 closure audit 完成（agent_9329788e，approved，证据落 762 plan）
- [x] 无被静默降级的 in-scope live defect（test:scripts 4 红为 HEAD 既有，显式 Deferred → Plan D，非本 plan scope）
- [x] `pnpm check` exit 0（2026-10-27 实测）
- [x] `pnpm lint` exit 0（2026-10-27 实测，audit 复核）
- [x] `pnpm test:scripts` 失败集与 HEAD 一致（audit 独立复跑 4/162 相同）
- [x] 提交完成（授权证据：用户 goal 原文，daily log 记录）

## Deferred But Adjudicated

### `pnpm test:scripts` HEAD 既有红（4 failed / 162 passed）

- Classification: `out-of-scope improvement`（对 764 而言）；已升级为 deep-audit 发现 **D9**（Major），归 Plan D 作为 in-scope Fix
- Why Not Blocking Closure: 4 个失败（check-console-baseline 红路径 fixture 与 live 树漂移、find-ui-consistency-gaps --json 确定性用例、check-flux-bundle-pack ×2 lazy-renderer 断言）在 764 改动前即存在；764 唯一源码改动是 optional 测试超时常量（默认 skip），同一命令下失败集无变化
- Successor Required: `yes`
- Successor Path: Plan D（门禁与脚本治理 plan）

## Non-Blocking Follow-ups

- ai-debugger-copilot AD-0..AD-6 执行归其 roadmap 队列，不在本 plan。

## Closure

Status Note: 2026-10-27 收口。A1–A6 全部处置：762 台账成套收口（731133367）、ai-debugger-copilot 基线成套落库（4692c2f91，含 optional 探针超时契约修正）、孤儿 CSS/temp 删除、\_tmp 975 项清扫（保留 ph9-e2e 证据）、导航补录（check 锚点门禁实测把关）、格式劣化 diff 回滚。新发现 D9（test:scripts HEAD 既有 4 红）显式 Deferred → Plan D。

Closure Audit Evidence:

- Auditor / Agent: fresh-session sub-agent `agent_f00a0d2f`（2026-10-27）
- Evidence: verdict `approved`（0B/0M/2m/1info）；audit 独立复跑 `pnpm check`/`pnpm lint` exit 0、`pnpm test:scripts` 4 failed / 162 passed 与声称基线一致、逐项核验 731133367/4692c2f91 落地内容与 \_tmp/test-results/孤儿文件终态。2 Minor 当场处置：①`temp/` 目录 rmdir 补删；②提交③范围显式化（index.md 尾项与 daily log 并入，765 草稿随 Plan B）。

Follow-up:

- D9（test:scripts 4 红）→ Plan D；ai-debugger-copilot AD-0..AD-6 → 其 roadmap 队列。
