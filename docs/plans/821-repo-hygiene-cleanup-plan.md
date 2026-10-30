# 821 仓库卫生清理（\_tmp ~159MB / 0 字节跟踪文件 / 本地杂项）

> Plan Status: completed
> Last Reviewed: 2026-10-31
> Source: `docs/audits/deep-audit-2026-10-31.md` §3（C1/C2/C7）；AGENTS.md「Temporary Debug Artifacts」
> Related: plan 801（已收口——其 WIP 前提已消解）；~~802~~（编号让位，本队列改号 820-825）；并行会话 business-replication C2 进行中（不触碰）

## Purpose

按 AGENTS.md 工件政策清理 `_tmp/` 陈旧调试工件（~159 MB / 9,678 文件）与本地杂项；移除误跟踪的 0 字节 `pnpm` 文件。lockfile mall-mobile 清理已改由 plan 820 Phase 1 落定（评审时序裁决），本计划不再含 lockfile 条目。

## Current Baseline

- `_tmp/` 共 ~159 MB / 9,678 文件（评审实测，含本审计归档目录）。大头：`_tmp/head-wt2/` 132 MB（2026-10-27 嵌套 git worktree 副本，**评审实测为已注册 worktree**：`git worktree list` 显示 `_tmp/head-wt2 5ba245fa5 (detached HEAD)`，`git clean -ndX` 报 "Would skip repository"）；`_tmp/ph9-e2e/` 16 MB（results.json 10,093,791 B + run.log 4,188,417 B + iso-b1..b8.log + cluster*.mjs 探针）；`_tmp/depcruise.json` 6.3 MB（10-27）；`_tmp/ph10-flake/` 348 KB；根级探针脚本/日志（fix781.mjs、close781.mjs、close782.mjs、fill4.mjs、wb782b.mjs、ph9-check.log、ph17-*.log ×5、discover-_.txt、wizard-head.tsx、styling-_.txt、steps-head.tsx）。全部 mtime ≤ 2026-10-28（**例外：w1-dev-server.log mtime 2026-10-30，在保留窗内**）。
- 跟踪的 0 字节文件 `pnpm` 位于仓库根（blob e69de29，mtime 2026-04-04），系误 `git add` 产物（评审实测确认）。
- 本地 ignored 杂项：散置 `.DS_Store`（根/apps/packages/ui）、`.playwright-mcp/` 120 项（评审实测）、`tmp/` 31 MB 构建缓存、`.stryker-tmp/`（保留）。
- 本会话审计日志已归档至 `_tmp/audit-2026-10-31-logs/`（保留）。
- 工作区现状（评审后实测）：仅 `docs/backlog/business-page-replication-roadmap.md`（并行会话 C2 进行中的回写）与 `pnpm-lock.yaml`（820 Phase 1 将落定）两个已跟踪修改 + 本队列 plan 文件。**plan 801 已收口提交，其 WIP 文件均已落库**。
- lockfile 条目移除说明：mall-mobile importer 清理（-69 行 drift 修正）随 plan 820 Phase 1 的 `pnpm install` 一并提交，避免两 plan 抢同一 lockfile diff。

## Goals

- `_tmp/` 删除全部 mtime < 2026-10-29 且无明确在用声明的工件（预计释放 ≥155 MB），`_tmp/` 目录本身保留。
- `git rm pnpm` 完成。
- 本地杂项（.DS_Store / .playwright-mcp / tmp 构建缓存）清扫。
- 不删任何被跟踪文件、不触碰并行会话 C2 文件、不动 `tests/e2e/artifacts/`。

## Non-Goals

- 不修改任何产品代码/测试。
- 不提交 pnpm-lock.yaml（820 负责）。
- 不 git filter-repo / 历史重写。
- 不清理 `.stryker-tmp/`（突变测试可复用缓存，保留）。

## Scope

### In Scope

- `_tmp/` 陈旧工件删除（mtime < 2026-10-29 判定线）。
- 0 字节 `pnpm` 跟踪文件移除。
- ignored 本地杂项清扫。

### Out Of Scope

- 并行会话 C2 的 roadmap 修改与其文件。
- lockfile（820 口径）；docs 超长拆分（plan 784 owner）。

## Failure Paths

| 编号                 | 触发                                                                  | 行为                                                                                                                     | 可重试 | 用户可见表现                  |
| -------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------ | ----------------------------- |
| worktree-registered  | `head-wt2` 为已注册 worktree（评审已证实如此）                        | `git worktree remove _tmp/head-wt2`（detached HEAD 无未提交引用即可移除；失败则 `--force` 前二次核实其 HEAD 无独有提交） | 是     | 目录移除、worktree 注册表干净 |
| fresh-artifact-doubt | 某工件无法判定是否在用（≥10-29 或活跃会话痕迹，如 w1-dev-server.log） | 保留并入 Deferred 记录，不删                                                                                             | 是     | 无                            |

## Test Strategy

不适用：纯仓库卫生与跟踪面修正，无代码行为变更。验证以 git status / du -sh / check:src-artifacts 等观测命令为准。

## Execution Plan

### Phase 1 - \_tmp 与本地杂项清理

Status: completed
Targets: `_tmp/`、`.DS_Store`、`.playwright-mcp/`、`tmp/`

- Item Types: `Fix`

- [x] `git worktree remove _tmp/head-wt2`（按 Failure Paths 流程；移除前 `git merge-base --is-ancestor 5ba245fa5 master` 核实无独有提交，移除后 `git worktree list` 复核干净）
- [x] 删除 `_tmp/ph9-e2e/`、`_tmp/depcruise.json`、`_tmp/ph10-flake/` 及根级探针/日志残留（close781/close782/discover-×3/fill4/fix781/ph17-×4/ph9-check/steps-head/styling-×2/wb782b/wizard-head，逐项 mtime 10-26..10-28 核实 <10-29）
- [x] 清扫 `.DS_Store`（find -delete）、`.playwright-mcp/`、`tmp/` 构建缓存
- [x] 保留：mtime ≥ 2026-10-29 的全部工件（w1-dev-server.log 10-30、并行会话 c2-_/c2-probe_·2-7 活跃工件）、`_tmp/audit-2026-10-31-logs/`、`.stryker-tmp/`

Exit Criteria:

- [x] `du -sh _tmp` 从 159MB 降至 7.6MB（剩余全部为保留项）
- [x] `git status` 不出现任何因清理产生的已跟踪文件变化（仅既有并行会话修改与本计划 `pnpm` 删除）

### Phase 2 - 跟踪面修正

Status: completed
Targets: 仓库根 `pnpm` 文件

- Item Types: `Fix`

- [x] `git rm pnpm`（0 字节 blob e69de29 误跟踪文件）
- [x] `git status -s tests/e2e/artifacts/` 确认无 A/M（空输出）

Exit Criteria:

- [x] `git ls-files | grep -c "^pnpm$"` = 0

## Draft Review Record

- Reviewer / Agent: 独立子代理（general-purpose fresh session，2026-10-31）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 2 Major 全数就地修订——①"801 WIP 活跃"前提失效（801 已收口提交），Current Baseline 与 Closure Gate 改为并行会话 C2 口径 ②lockfile 提交时序与 820 冲突——条目整体移入 820 Phase 1，本计划 lockfile 义务移除。2 Minor 修订——w1-dev-server.log（mtime 10-30）移入保留清单；体量数字标注"执行时实测为准"（159M/9,678、.playwright-mcp 120）

## Closure Gates

- [x] Phase 1/2 Exit Criteria 全勾
- [x] `pnpm check:src-artifacts` exit 0（审计员独立复跑 verify-no-src-artifacts.mjs exit 0，清理未误伤）
- [x] `git status` 工作区无本计划产生的残留临时物；并行会话 C2 文件（roadmap/complex-pages-model/crm mock/replication.ts/axe-baseline 等）原样未动（审计员逐项核对归属）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（verdict `approved`，零 Blocker/Major，2 cosmetic Minor 不阻塞）
- [x] `docs/logs/2026/10-31.md` 收口记录已更新

## Deferred But Adjudicated

（执行中无改判；w1-dev-server.log 保留与 lockfile 移交 820 两项均在草案评审时裁决并记录于正文/Draft Review Record）

## Non-Blocking Follow-ups

- `_audit-*.log` 类临时日志的 .gitignore 通配是否值得固化——留给后续工具治理轮次（out-of-scope improvement，非 in-scope defect）
- w1-dev-server.log 等保留工件的下轮复检（C2 收口后可清）

## Closure

Status Note: `_tmp/` 159MB→7.6MB（保留本审计日志、并行会话活跃 c2-\* 工件与保留窗内 w1-dev-server.log）；head-wt2 已注册 worktree 安全移除（5ba245fa5 为 master 祖先，无独有提交）；0 字节误跟踪文件 `pnpm` 已 git rm；本地杂项（.DS_Store/.playwright-mcp/tmp 构建缓存）清扫。closure audit 独立 fresh 子代理 verdict `approved`（逐项 live 观测核验，零 Blocker/Major）。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理 agent_921137f0（general-purpose fresh session，2026-10-31）
- Evidence: 审计员独立观测——`du -sh _tmp`=7.6M 且保留清单逐项吻合；worktree 注册表干净且 5ba245fa5 cat-file 可达；staged 变更仅 `pnpm` 删除（blob e69de29 尺寸 0 实证）；check-src-artifacts exit 0；plan 文本一致性核对（audit 门未预勾）；lockfile 缺席修改经 820 HEAD commit c5a5fa128 交叉核实为已移交落地

Follow-up:

- 见 Non-Blocking Follow-ups
