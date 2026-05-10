# 240 jsdom → happy-dom 升级计划

> Plan Status: planned
> Last Reviewed: 2026-05-10
> Source: `scripts/scan-jsdom-usage.mjs` 扫描结果，`dom-perf-test/benchmark.mjs` 性能基准
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

将 `nop-chaos-flux` 项目中所有测试环境的 DOM 模拟层从 `jsdom` 升级到 `happy-dom`，提升测试性能（DOM 查询 **330x**）和兼容性（25/25 vs 23/25）。

## Current Baseline

`scripts/scan-jsdom-usage.mjs` 在 `nop-chaos-flux` 根目录扫描结果（已排除 `node_modules`、`dist`、`.stryker-tmp` 等）：

| 类别                                          | 数量 | 位置                                                             |
| --------------------------------------------- | ---- | ---------------------------------------------------------------- |
| `package.json` 直接依赖 `jsdom`               | 2    | 根 `package.json`、`packages/word-editor-renderers/package.json` |
| `vitest.config.*` 使用 `environment: 'jsdom'` | 10   | apps/playground + 9 个 packages                                  |
| `vitest.shared.ts` 引用 `'jsdom'` / `isJSDOM` | 1    | 根 `vitest.shared.ts`                                            |
| 测试文件 `@vitest-environment jsdom` pragma   | 47   | 各 package 下的测试文件                                          |

### 性能基准数据

| 测试项             | jsdom     | happy-dom | 倍率      |
| ------------------ | --------- | --------- | --------- |
| 环境初始化         | 26.13 ms  | 26.25 ms  | 持平      |
| 创建 1000 元素     | 16.28 ms  | 11.71 ms  | **1.39x** |
| querySelector      | 396.33 ms | 1.20 ms   | **330x**  |
| 事件派发 (1000 次) | 7.25 ms   | 1.63 ms   | **4.45x** |
| innerHTML 解析     | 10.55 ms  | 6.69 ms   | **1.58x** |

### API 兼容性

- jsdom: 23/25（缺少 `localStorage`、`sessionStorage`）
- happy-dom: 25/25

## Goals

- `vitest.shared.ts` 中 `'jsdom'` → `'happy-dom'`、`isJSDOM` → `isHappyDOM`
- 所有 `vitest.config.ts` 的 `environment: 'jsdom'` → `'happy-dom'`
- 所有测试文件的 `@vitest-environment jsdom` → `@vitest-environment happy-dom`
- `package.json` 中 `jsdom` devDependency → `happy-dom`
- 全量测试通过
- 提供自动化脚本扫描、修改、验证

## Non-Goals

- **其他项目迁移**：`nop-chaos2`、`nop-mobile`、`nop-chaos`、`templates/` 不在本计划 scope
- **worktree 迁移**：`nop-chaos-flux-wt/` 可在主项目验证后按同样步骤执行
- **源码直接 import jsdom**：本项目内无此情况

## Scope

### In Scope

- `nop-chaos-flux/` 下所有 `vitest.config.*`、`vitest.shared.ts`
- `nop-chaos-flux/` 下所有测试文件 pragma
- `nop-chaos-flux/` 下 `package.json` 依赖替换
- 3 个自动化脚本

### Out Of Scope

- `nop-chaos-flux-wt/`（可复用脚本，单独执行）
- 其他子项目
- `pnpm-lock.yaml`（由 `pnpm install` 自动处理）
- 文档中提到 jsdom 的 `.md` 文件（注释性质）

## Risks And Rollback

1. **API 行为差异**：happy-dom 对少数边界 API 行为可能不同，需跑全量测试
2. **Rollback**：所有改动均可通过 `git revert` 回退

## Execution Plan

### Phase 1 - 运行扫描脚本确认 baseline

Status: planned
Targets: `scripts/scan-jsdom-usage.mjs`

- Item Types: `Proof`

- [ ] 执行 `node scripts/scan-jsdom-usage.mjs` 确认当前基线
- [ ] 确认输出：2 package.json + 11 vitest configs + 47 test pragmas

Exit Criteria:

- [ ] 扫描脚本输出与 Current Baseline 一致
- [ ] No owner-doc update required

---

### Phase 2 - 使用迁移脚本自动替换

Status: planned
Targets: `scripts/migrate-jsdom-to-happy-dom.mjs`, 所有 vitest 配置、测试文件、package.json

- Item Types: `Fix`

- [ ] 执行 `node scripts/migrate-jsdom-to-happy-dom.mjs --dry-run` 预览变更
- [ ] 确认 dry-run 输出覆盖所有扫描项
- [ ] 执行 `node scripts/migrate-jsdom-to-happy-dom.mjs` 实际替换
- [ ] 手动检查 `vitest.shared.ts` 替换结果是否正确（类型、变量名、注释）

Exit Criteria:

- [ ] dry-run 输出覆盖 2 + 11 + 47 = 60 个文件
- [ ] `vitest.shared.ts` 内容正确：`'happy-dom'`、`isHappyDOM`、注释已更新
- [ ] No owner-doc update required

---

### Phase 3 - 安装依赖并运行验证

Status: planned
Targets: 全项目

- Item Types: `Proof`

- [ ] 执行 `pnpm install`
- [ ] 执行 `node scripts/validate-happy-dom-migration.mjs` 验证无残留
- [ ] 执行 `pnpm typecheck`
- [ ] 执行 `pnpm build`
- [ ] 执行 `pnpm test`（全量测试通过）

Exit Criteria:

- [ ] `validate-happy-dom-migration.mjs` 输出 ALL CHECKS PASSED
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 通过
- [ ] `pnpm test` 全量通过（无新增失败）
- [ ] No owner-doc update required

---

### Phase 4 - 记录结果

Status: planned
Targets: `docs/logs/`

- Item Types: `Follow-up`

- [ ] 更新 `docs/logs/2026/05-10.md` 记录迁移结果和测试数据

Exit Criteria:

- [ ] 日志已更新
- [ ] No owner-doc update required

## Closure Gates

- [ ] 所有 `vitest.config.*` 的 `environment` 已改为 `'happy-dom'`
- [ ] 所有 `@vitest-environment jsdom` pragma 已改为 `@vitest-environment happy-dom`
- [ ] 所有 `package.json` 中 `jsdom` devDependency 已替换为 `happy-dom`
- [ ] `vitest.shared.ts` 已适配（`isHappyDOM`、`'happy-dom'`）
- [ ] `validate-happy-dom-migration.mjs` 全量 PASS
- [ ] `pnpm typecheck && pnpm build && pnpm test` 通过
- [ ] 不存在被静默降级到 deferred 的 in-scope 项

## Deferred But Adjudicated

### worktree 迁移

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `nop-chaos-flux-wt/` 是独立目录，可复用同样脚本执行
- Successor Required: no
- Successor Path: 同样脚本，目标目录改为 worktree 路径即可

### 其他项目迁移

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `nop-chaos2`、`nop-mobile`、`templates/` 是独立项目，不在本 plan scope
- Successor Required: no

## Non-Blocking Follow-ups

- 将同样的迁移流程应用到 `nop-chaos-flux-wt/`
- 将同样的迁移流程应用到 `nop-chaos2`、`nop-mobile`

## Appendix: 脚本说明

### scan-jsdom-usage.mjs

```bash
# 扫描当前项目所有 jsdom 引用（排除 node_modules, dist, .stryker-tmp 等）
node scripts/scan-jsdom-usage.mjs
# 或指定目录
node scripts/scan-jsdom-usage.mjs /path/to/project
```

输出分类统计 + JSON 结果文件。

### migrate-jsdom-to-happy-dom.mjs

```bash
# 预览变更（不写文件）
node scripts/migrate-jsdom-to-happy-dom.mjs --dry-run

# 实际执行替换
node scripts/migrate-jsdom-to-happy-dom.mjs
```

自动替换：vitest config、test pragma、package.json 依赖。

### validate-happy-dom-migration.mjs

```bash
# 验证迁移完成
node scripts/validate-happy-dom-migration.mjs
```

检查：无残留 jsdom environment、无残留 pragma、无残留 jsdom 依赖。输出 PASS/FAIL。

## Closure

Status Note: (待迁移完成后填写)

Closure Audit Evidence:

- Reviewer / Agent: (待填写)
- Evidence: (待填写)

Follow-up:

- worktree 迁移
- 其他项目迁移
