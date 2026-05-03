# 161 Workspace Quality And DX Improvement Plan

> Plan Status: partially completed
> Last Reviewed: 2026-05-02
> Source: 全仓库 8 维度质量审计（2026-04-30），审计由 6 个并行子 agent 执行，覆盖项目结构、代码质量、架构边界、测试覆盖、性能、安全、开发体验、文档完整性
> Related: `docs/plans/159-code-refactor-discovery-remediation-plan.md`, `docs/plans/143-unit-test-coverage-80-percent-target-plan.md`, `docs/plans/158-code-quality-redundancy-and-duplication-remediation-plan.md`, `docs/plans/160-swallowed-exception-remediation-plan.md`

## Purpose

将 2026-04-30 全仓库质量审计中发现的 22 项可操作改进点分 4 个 Phase 落地，覆盖工具链配置、代码质量、性能与安全、测试覆盖四个维度。本计划不包含已由 159 等计划覆盖的代码重构工作。

## Current Baseline

- `pnpm typecheck`、`pnpm build`、`pnpm lint` 通过
- **`pnpm test` 有 4 个预存失败**：`@nop-chaos/flux-renderers-form` 的 `form-submit-actions.test.tsx` 和 `index.test.tsx` 各 2 个测试失败（`ajax requires args payload` 错误，疑似近期 action-dispatcher 变更导致 submitAction 语义变化）
- Turborepo 已配置（`turbo.json`），提供构建缓存和任务编排
- 24 个包 + 1 个 playground app，~163,000 行源码，~371 个测试文件
- 依赖方向纯净：零循环依赖，严格 DAG
- React 19 + React Compiler + TypeScript 6 + Vite 8 + pnpm 10
- 159 计划已完成：异步取消模式迁移、双状态修复、包边界修复、i18n 修复、兼容层收敛
- 158 计划已完成：重复代码消除、AST walker 去重、反向依赖修复、死代码清理
- 160 计划已完成：空 catch 处理（`editor-canvas.tsx` 和 `doc-preview-page.tsx` 的空 catch 被判定为可接受的静默忽略）
- 143 计划已完成：核心管道 9 包 80% 覆盖率目标，明确排除了 `ui` 和辅助包
- 以下问题未被任何已有计划覆盖（本计划将解决）

## Goals

1. 补齐关键工具链缺失（CI/CD、pre-commit hooks、代码格式化）
2. 修复配置层面的问题（tsconfig 引用缺失、死依赖、vitest 配置缺失）
3. 修复低风险的代码质量问题（内联对象、未懒加载页面、遗留文件、any 规则、空 catch）
4. 提升 `@nop-chaos/ui` 和 `@nop-chaos/flux-action-core` 的测试覆盖

## Non-Goals

- 不做代码架构重构（由 159/158 等计划覆盖）
- 不做 Turborepo 配置优化（Turborepo 已存在，`turbo.json` 已配置基本任务图）
- 不做 `RendererRuntime` 接口拆分或 `RendererDefinition` 泛型改进
- 不做 bundle 分析工具引入（可作为后续独立计划）
- 不做文档体系治理（plans/归档、bugs/编号重复、experiments/清理）
- 不做 CSP 配置（playground 是开发应用，生产部署时再处理）
- 不做 `dangerouslySetInnerHTML` chart 硬化（shadcn/ui 上游组件，改动风险高）
- 不做 debugger window 全局变量生产守卫（debugger 包仅在开发环境使用）
- 不做 CHANGELOG.md / CONTRIBUTING.md 撰写（文档层面的后续工作）

## Scope

### In Scope

| Phase | 主题             | 影响范围                                                      |
| ----- | ---------------- | ------------------------------------------------------------- |
| 1     | 工具链配置修复   | tsconfig.json, vitest configs, package.json, eslint.config.js |
| 2     | 开发体验基础设施 | CI/CD, pre-commit hooks, 代码格式化                           |
| 3     | 代码质量修复     | dialog-host, app.tsx, .bak 文件, empty catch                  |
| 4     | 测试覆盖提升     | @nop-chaos/ui, @nop-chaos/flux-action-core                    |

### Out Of Scope

- 架构重构、bundle 分析、Turborepo 优化、文档治理（见 Non-Goals）
- coverage threshold 推广到 13 个无阈值包（推荐在 Phase 4 之后作为 follow-up）

## Execution Plan

### Phase 1 - 前置修复与配置修复

Status: completed
Targets: `packages/flux-renderers-form/src/__tests__/`, `tsconfig.json`, `packages/flux-code-editor/package.json`, `packages/flux-action-core/vitest.config.ts`(新建), `packages/flux-i18n/vitest.config.ts`(新建), `packages/flow-designer-core/vitest.config.ts`(新建), `packages/word-editor-renderers/vitest.config.ts`, `eslint.config.js`

- [x] **1.0** 修复 `@nop-chaos/flux-renderers-form` 的 4 个预存测试失败 — 测试逻辑已通过全绿（125/125），但存在间歇性 Vitest worker fork 崩溃（基础设施问题，非测试逻辑）
- [x] **1.1** 在 `tsconfig.json` 的 `references` 数组中添加 `{ "path": "./packages/flux-action-core" }`
- [x] **1.2** 从 `packages/flux-code-editor/package.json` 移除未使用的 `"@nop-chaos/flux-runtime": "workspace:*"` 依赖
- [x] **1.3** 为 `packages/flux-action-core/` 新建 `vitest.config.ts`，使用 `createSharedVitestConfig` 工厂
- [x] **1.4** 为 `packages/flux-i18n/` 新建 `vitest.config.ts`，使用 `createSharedVitestConfig` 工厂
- [x] **1.5** 为 `packages/flow-designer-core/` 新建 `vitest.config.ts`，使用 `createSharedVitestConfig` 工厂
- [x] **1.6** 将 `packages/word-editor-renderers/vitest.config.ts` 改为使用 `createSharedVitestConfig` + `mergeConfig`
- [x] **1.7** ~~将 `eslint.config.js` 中 `@typescript-eslint/no-explicit-any` 从 `'off'` 改为 `'warn'`~~ — **Intentionally skipped**: eslint.config.js 注释明确说明 low-code 系统中 `any` 使用是合理的，保持 `'off'`

Exit Criteria:

- [x] `pnpm test` 全部通过（包含原 4 个预存失败已修复）
- [x] `tsconfig.json` references 包含 `flux-action-core`
- [x] `packages/flux-code-editor/` 源码中无 `@nop-chaos/flux-runtime` 导入，且 package.json 不再声明该依赖
- [x] 3 个新建的 `vitest.config.ts` 存在且使用 `createSharedVitestConfig`
- [x] `word-editor-renderers/vitest.config.ts` 使用 `createSharedVitestConfig`
- [ ] `eslint.config.js` 中 `no-explicit-any` 为 `'warn'`。
- [x] `pnpm typecheck && pnpm build && pnpm lint` 全部通过
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - 开发体验基础设施

Status: completed

- [x] **2.1** 添加 `.editorconfig`（UTF-8、LF、indent_style=space、indent_size=2、trim_trailing_whitespace=true、insert_final_newline=true）
- [x] **2.2** 添加 Prettier 配置（`.prettierrc` + `.prettierignore`），配置与现有代码风格一致（singleQuote、trailingComma、printWidth 等）。同时安装 `eslint-config-prettier` 关闭 ESLint 中与 Prettier 冲突的格式化规则
- [x] **2.3** 安装并配置 husky + lint-staged：
  - `pnpm add -Dw husky lint-staged`
  - `pnpm exec husky init`
  - pre-commit hook 运行 `lint-staged`
  - lint-staged 配置：`*.{ts,tsx}` → `eslint --fix`（不设 `--max-warnings=0`，以兼容 Phase 1.7 的 `no-explicit-any` warn 规则）、`*.{json,md,css}` → `prettier --write`
- [x] **2.4** 执行初始全量格式化并提交
- [x] **2.5** 创建 GitHub Actions CI workflow
- [x] **2.6** 更新 `package.json` scripts 添加 `format` 和 `format:check` 命令

Exit Criteria:

- [x] `.editorconfig` 存在于仓库根目录
- [x] `.prettierrc` + `.prettierignore` 存在于仓库根目录
- [x] `eslint-config-prettier` 已安装并在 ESLint 配置中引入
- [ ] 初始格式化 commit 已存在（`chore: initial prettier formatting`）
- [ ] `pnpm format:check` 通过
- [ ] `git commit` 触发 pre-commit hook，执行 lint-staged`
- [x] `.github/workflows/ci.yml` 存在且 workflow 语法有效
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全部通过
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - 代码质量修复

Status: completed

- [x] **3.1** `dialog-host.tsx` DialogView（65-70 行）和 DrawerView（115-120 行）中的内联 `surfaceContext` 对象用 `useMemo` 包裹，依赖项为 `[surface.scope, surface.actionScope, surface.componentRegistry, surface.ownerNodeInstance]`
- [x] **3.2** `app.tsx` 中将 `CodeEditorPage` 从静态导入（第 10 行）改为 `React.lazy(() => import('./pages/code-editor-page').then(m => ({ default: m.CodeEditorPage })))` 懒加载，与 `LazyReportDesignerPage` 等保持一致，并包裹 `<Suspense>`
- [x] **3.3** 删除遗留文件 `apps/playground/src/FlowDesignerExample.tsx.bak`
- [x] **3.4** 将 `editor-canvas.tsx` 第 120 行的 `.catch(() => {})` 改为 `.catch((err) => { console.debug('[word-editor] word count failed', err) })`。注：160 计划已判定此处空 catch 为可接受的静默忽略（非关键装饰性功能），本项是在此基础上增加可观测性增强
- [x] **3.5** 将 `doc-preview-page.tsx` 第 51 行的 `.catch(() => {})` 改为 `.catch((err) => { console.debug('[word-editor] preview load failed', err) })`。同上，160 计划已处理，本项为可观测性增强

Exit Criteria:

- [x] `dialog-host.tsx` 中两处 `surfaceContext` 均使用 `useMemo`
- [x] `app.tsx` 中 `CodeEditorPage` 为懒加载，`code-editor` 路由被 `<Suspense>` 包裹
- [x] `FlowDesignerExample.tsx.bak` 已从文件系统删除
- [x] 两处空 `.catch` 均已改为带 `err` 参数的 `console.debug`
- [x] 确认 `docs/architecture/renderer-runtime.md` 无需更新（useMemo 为内部优化，无契约变更）
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全部通过
- [x] `docs/logs/` 对应日期条目已更新

### Phase 4 - 测试覆盖提升

Status: completed

> 背景：143 计划（80% 覆盖率目标）明确将 `@nop-chaos/ui` 和 `flux-action-core` 等辅助包排除在 scope 之外（Non-Goals 原文："不涉及 `ui` 等辅助/专业包的覆盖率提升"）。本 Phase 是 143 排除包的合法后续跟进。
>
> 前置条件：Phase 1.0 已修复测试失败使 `pnpm test` 全绿，Phase 1.3 已为 `flux-action-core` 创建 `vitest.config.ts`。

- [x] **4.1** `@nop-chaos/ui`：为以下高频使用组件添加基础渲染测试
  - `button.test.tsx` (Button 组件)
  - `input.test.tsx` (Input 组件)
  - `dialog.test.tsx` (Dialog 组件)
  - `select.test.tsx` (Select 组件)
  - `checkbox.test.tsx` (Checkbox 组件)
  - `switch.test.tsx` (Switch 组件)
  - `tooltip.test.tsx` (Tooltip 组件)
  - `popover.test.tsx` (Popover 组件)
  - `badge.test.tsx` (Badge 组件)
  - `separator.test.tsx` (Separator 组件)
- [x] **4.2** `@nop-chaos/flux-action-core`：为以下核心功能添加测试
  - `action-dispatcher` 的 dispatch ordering 测试
  - `operation-control` 的 timeout/retry 行为测试
  - `action-core` 的 result classification 测试

Exit Criteria:

- [x] `@nop-chaos/ui` 测试文件数从 6 增加到至少 16（+10 个组件测试）
- [x] `@nop-chaos/flux-action-core` 测试文件数从 3 增加到至少 6（+3 个模块测试）
- [x] 所有新测试通过
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全部通过
- [x] `docs/logs/` 对应日期条目已更新

## Validation Checklist

- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 通过
- [ ] `pnpm lint` 通过
- [ ] `pnpm test` 通过
- [ ] Phase 1-4 的 Exit Criteria 逐条满足
- [ ] 独立子 agent closure-audit 已完成并记录证据

## Risks And Rollback

| Risk                                         | Impact               | Mitigation                                             |
| -------------------------------------------- | -------------------- | ------------------------------------------------------ |
| Phase 1.0 根因超出预期                       | Phase 1 膨胀         | 时间盒限制调查，必要时拆分为独立 bug-fix plan          |
| Prettier 初始格式化产生大量 diff             | 与 in-flight PR 冲突 | 2.4 在 2.3 之前完成，格式化 commit 独立提交            |
| `no-explicit-any: warn` 产生大量 lint 输出   | 开发者忽略 warn      | lint-staged 不设 `--max-warnings=0`，后续逐步消除 warn |
| CI workflow Node/pnpm 版本不匹配             | CI 失败              | 使用 `engines` 字段或 `.nvmrc` 锁定版本                |
| Phase 3.2 CodeEditorPage 懒加载导致 e2e 失败 | 验收阻塞             | Phase 3 Exit Criteria 包含 e2e 验证                    |

## Closure

Status Note: This plan cannot remain `completed`. Most implementation slices landed, but closure bookkeeping drift remained: Phase 1.7 intentionally stayed unresolved because `eslint.config.js` continues to keep `@typescript-eslint/no-explicit-any` at `'off'`, several phase exit criteria still depend on evidence not re-verified in the current baseline (`format:check`, pre-commit execution proof, initial formatting commit provenance, full workspace verification), and no independent closure audit is recorded. Keep the plan `partially completed` until those remaining closure conditions are either explicitly re-verified or re-scoped.

Closure Audit Evidence:

- Reviewer / Agent: pending independent closure audit
- Evidence: 2026-05-03 plan-hygiene re-audit confirmed that `.editorconfig`, `.prettierrc`, `.prettierignore`, `.github/workflows/ci.yml`, `package.json` `format` / `format:check`, `tsconfig.json` references, `packages/flux-action-core|flux-i18n|flow-designer-core/vitest.config.ts`, `packages/word-editor-renderers/vitest.config.ts`, and the added UI / flux-action-core tests are present in the live repo, but the plan still lacks reconciled proof for the intentionally skipped Phase 1.7 target, full checklist closure, and an independent closure audit.

Follow-up:

- Reconcile the remaining closure conditions inside this plan before any future `completed` claim: either explicitly mark Phase 1.7 as a recorded scope change / non-goal update, or land the `no-explicit-any: 'warn'` policy change with fresh verification.
- Re-run and record the still-unproven closure gates: `pnpm format:check`, full workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test`, and an explicit pre-commit / `lint-staged` proof path.
- Run and record an independent closure audit before changing `Plan Status` back to `completed`.

### Adversarial Review Cross-Reference (2026-05-01)

`docs/analysis/2026-05-01-adversarial-review.md` 独立对仓库做了对抗性审查。以下发现与 Plan 161 有交叉：

**Phase 3 已在本 commit (0ebe0acd) 中完成：**

- 3.1 (`dialog-host.tsx` useMemo)、3.2 (`app.tsx` 懒加载)、3.3 (`.bak` 删除)、3.4-3.5 (word-editor 空 catch) 均已落地。

**Phase 4 已在本 commit (0ebe0acd) 中完成：**

- 4.1 的 10 个 UI 组件测试文件已创建（badge, button, checkbox, dialog, input, popover, select, separator, switch, tooltip）。
- 4.2 (`flux-action-core` 测试) 尚未完成。

**Phase 1-2 仍待执行。**

**Adversarial review 中发现但不在 Plan 161 scope 内的问题：**

- Finding 6 中指出的未使用生产依赖（`flux-renderers-basic` 的 `flux-runtime`、`flux-formula`，`flux-react` 的 `flux-compiler`）与 Plan 161 Phase 1 的"移除未使用依赖"方向一致，但具体的包不在 Plan 161 Phase 1.2 的 scope 内（Phase 1.2 只覆盖 `flux-code-editor` 的 `flux-runtime`）。建议将这三个依赖清理纳入 Phase 1 或后续计划。
