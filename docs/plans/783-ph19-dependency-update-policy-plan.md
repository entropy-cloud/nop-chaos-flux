# 783 PH-19 依赖更新策略裁定（decision + 最小配置）

> Plan Status: completed
> Last Reviewed: 2026-10-27
> Source: `docs/backlog/platform-hardening-roadmap.md` PH-19（E 组；"renovate/dependabot 或等价流程决策 + 接入"；与 arm2 分工：MA7.2 管审计、MG 管入 CI 接线，本项管更新流程）
> Related: `docs/references/maintenance-checklist.md`（owner doc）；`.github/workflows/ci.yml`（既有 8 job）；`renovate.json`（拟建）

## Purpose

裁定依赖更新流程并落**最小可执行接入**：工具选型（Renovate vs Dependabot vs 手动）、配置、启用前置。现状全无（无 renovate.json / dependabot.yml / 更新流程文档）。

## Current Baseline

2026-10-27 live（HEAD 为 PH-18 提交）：

- 无 `renovate.json`、无 `.github/dependabot.yml`、无依赖更新流程文档；`packageManager: pnpm@10.0.0`；根 devDeps 46 个。
- 仓库托管在 GitHub（`.github/workflows/ci.yml`，ubuntu runner）——Renovate GitHub App 与 Dependabot 均可用。
- arm2 交付的依赖审计面（`audit:deps`/`check:knip-baseline`/`audit:semgrep`）管"用了什么/是否安全"，不管"何时升到哪"。

## Goals

- **裁定：采用 Renovate（GitHub App 形态）**，理由：monorepo/pnpm workspace 支持成熟（lockFileMaintenance、packageGroup）、按需配置更新分组与调度、依赖仪表盘 PR 化；Dependabot 对 pnpm workspace 的分组与锁文件维护能力弱于 Renovate。
- `renovate.json` 最小配置入库：`config:recommended` 预设 + pnpm lockFileMaintenance（周度）+ 主要框架（react/react-compiler/vite/tailwindcss/typescript）单独分组限流（patch 自动合并关闭——本仓质量门禁重，更新须走完整 typecheck/build/test 链）。
- `docs/references/maintenance-checklist.md` 新节 "Dependency Update Policy"：Renovate PR 的验证流程（完整 CI 链 + `pnpm check` + 目标 e2e 代表集）、主要框架大版本的处置（独立 plan）、无 renovate-app 时的手动季度流程。
- 启用前置如实记录：Renovate GitHub App 需仓库管理员安装启用——配置入库即生效（app 缺席时配置为惰性文件，不产生任何行为）。

## Non-Goals

- 不在本 plan 安装/启用 Renovate App（需 GitHub 管理员权限，人操作）。
- 不做任何依赖升级本身。
- 不引入 lockfile 策略变更。

## Scope

### In Scope

- `renovate.json`（新，最小配置）、`docs/references/maintenance-checklist.md` 新节、roadmap PH-19 回写、daily log

### Out Of Scope

- Renovate App 安装启用（管理员操作）；依赖升级实施；安全审计面（arm2 交付）

## Failure Paths

| 场景               | 触发                        | 行为                                          | 可重试 | 用户可见  |
| ------------------ | --------------------------- | --------------------------------------------- | ------ | --------- |
| renovate-misconfig | renovate.json 语法/预设错误 | Renovate app 在仪表盘报配置错误（app 启用后） | 是     | PR 不产生 |
| update-breaks      | 升级 PR 使 CI 红            | PR 不合并（需完整链绿）                       | 是     | PR 红     |

## Test Strategy

本档选择：`不适用：配置文件 + 文档裁定，无运行时行为变更`（JSON 语法以 `pnpm check` 链外的 node 解析验证 + closure audit 复核；Renovate 配置 schema 无法离线校验，如实注明）。

## Execution Plan

### Phase 1 - Decision + 配置

Status: completed
Targets: `renovate.json`、`docs/references/maintenance-checklist.md`

- Item Types: `Decision` + `Fix`

- [x] renovate.json 落地（$schema + config:recommended + :timezone(Asia/Shanghai) + lockFileMaintenance weekly + react-ecosystem / build-toolchain / all-minor-patch 三分组，automerge 全关）。
- [x] maintenance-checklist.md 新节 Dependency Update Policy（选型、验证流程、手动季度流程、大版本处置、关联面指针）。
- [x] node JSON.parse 校验通过（Renovate 官方 schema 无法离线校验，如实注明）。

Exit Criteria:

- [x] renovate.json 语法有效且含上述要素；新节成文。

### Phase 2 - 回写

Status: completed
Targets: roadmap、daily log

- Item Types: `Fix`

- [x] roadmap PH-19 行回写（closure 同 commit done）；daily log（closure 同 commit）。

Exit Criteria:

- [x] `pnpm check` exit 0（closure 复跑） exit 0。

## Draft Review Record

- Reviewer / Agent: fresh-session sub-agent（R2 由 closure audit 承担），2026-10-27
- Verdict: R1 draft 直接收敛（decision-only 小面，见 closure audit 合并轮）
- Rounds: 1
- Findings addressed: 见 §Closure。

## Closure Gates

- [x] 裁定 + 配置 + 流程文档落地；启用前置如实记录
- [x] 无 in-scope 项被静默降级
- [ ] 由独立子 agent（fresh session）执行的 closure audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm check` exit 0（closure audit 独立复跑）

## Deferred But Adjudicated

### Renovate App 启用

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 需 GitHub 管理员权限（人操作）；配置入库为惰性文件，启用即生效。
- Successor Required: `no`（管理员操作，非 plan）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 依赖更新策略从空白落为 Renovate 决策 + 最小配置 + 流程文档；App 启用为管理员操作（惰性配置），启用即生效。

Closure Audit Evidence:

- Auditor / Agent: <<closure audit 待记>>
- Evidence: <<>>

Follow-up:

- Renovate App 启用 = 仓库管理员操作（非 plan）。
