# 2026-09-28-3 Playground bundle 体积优化

> Plan Status: active
> Last Reviewed: 2026-09-28
> Source: `docs/analysis/2026-09-28-perf-ux-deep-optimization-analysis.md`（P5）
> Related: `apps/playground/vite.config.ts`、`apps/playground/src/App.tsx`

## Purpose

修复 playground 构建的 chunk 拆分失效（manualChunks 对 workspace 包永不命中），并按既有 lazy 模式扩展重页面按需加载，使 8.56MB（gzip 2.38MB）的单入口显著下降；建立修复前后的量化记录。

## Current Baseline

- 实测（`apps/playground/dist`，2026-09-27 构建）：入口 `index-COfSWHdG.js` 8560KB / gzip 2376KB；总 JS 18.1MB（162 个 chunk）。
- `apps/playground/vite.config.ts` `manualChunks(id)`：用 `id.includes('@nop-chaos/…')` 匹配，但 workspace 包经 `vite.workspace-alias` 解析为绝对源码路径（`/…/packages/ui/src/index.ts`）→ 永不命中。产物中不存在 `ui-*`/`spreadsheet-*`/`flow-designer-*`/`report-designer-*`/`word-editor`-core/`code-editor` 目标 chunk；唯 `react-vendor`（匹配 `node_modules/react/`）生效——同一函数内两种匹配的结果差异即为根因证据。
- `App.tsx`（416 行）：11 个重页面已 lazy（report-designer/spreadsheet/debugger-lab/condition-builder×2/word-editor/page-designer/ai-rich-text/leafer/three，注释明确"mirrors … lazy isolation"为既定模式）；仍有 68 个 `./pages` 静态导入（scada 五连、gantt/kanban/calendar 及其 perf-scale、dashboard、print-designer、graph、map、pivot、env-stream、data-verify、AI 13 连等；第 14 个 ai-rich-text 已 lazy）；13 个 renderer 包模块顶注册。
- e2e（`playwright.config.ts`）以 dev server 跑，`reuseExistingServer: !CI`；构建产物不影响 e2e 运行方式。
- 本计划只影响 playground 应用构建；host 侧产物（各包独立构建/flux-bundle）不在其内。

## Goals

- manualChunks 按 resolved 源码路径正确分组，vendor 级 chunk 真实产出（ui/spreadsheet/flow-designer/report-designer/word-editor/code-editor）。
- 重演示页面按既定 lazy 模式改为按需加载；入口 chunk 与首屏传输量较基线显著下降（量化记录）。
- 全部既有单测（App 路由测试）与 e2e 语义不变。

## Non-Goals

- 不改变 13 个 renderer 包的启动注册时机（涉及全部测试与运行时行为的广谱变更，收益已被 chunk 拆分+lazy 覆盖大半，记入 Deferred 裁定）。
- 不处理 host 侧（nop-chaos-next）产物。
- 不改 Tailwind CSS 产物策略（432KB CSS 为全组件画廊所需）。
- 不动 `flux-bundle` 打包脚本（`check:flux-bundle-pack` 门禁面）。

## Scope

### In Scope

- `apps/playground/vite.config.ts`（manualChunks 路径匹配）
- `apps/playground/src/App.tsx`（静态导入 → lazy 化，沿用既有 `lazy(() => import(...))` + Suspense 模式）
- `apps/playground` 相关单测（`app.test.tsx`、`route-matrix.test.ts`）

### Out Of Scope

- 各 `packages/*` 的构建配置与导出面
- playground 视觉/交互行为（lazy 化仅改变加载时机，Suspense fallback 为既有 `Spinner`）

## Failure Paths

| 可测场景编号         | 触发                              | 行为                                                                                                                                                             | 可重试              | 用户可见表现   |
| -------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------------- |
| lazy-chunk-load-fail | 深链直达 lazy 页且 chunk 加载失败 | 无 error boundary：chunk 加载失败向上抛、根卸载白屏（React 无默认 error boundary，Suspense 不捕获渲染错误）；与既有 11 个 lazy 页行为一致，playground 场景可接受 | 是（重试导航/刷新） | 白屏，刷新恢复 |

## Test Strategy

档位选择（三选一）：`建议有测`

本档选择：建议有测。`app.test.tsx`/`route-matrix.test.ts` 全量回归 + 构建产物尺寸量化对比（脚本化记录）；e2e 抽样冒烟（home → 任一 lazy 化页面）。

## Execution Plan

### Phase 1 - manualChunks 路径匹配修复

Status: planned
Targets: `apps/playground/vite.config.ts`

- Item Types: `Fix | Proof`

- [ ] Fix: 分组规则改为按 resolved 源码路径匹配（如 `id.includes('/packages/spreadsheet-core/')`），保留 react/react-dom 的 node_modules 匹配
- [ ] Proof: `pnpm --filter @nop-chaos/flux-playground build` 产物中出现 ui/spreadsheet/flow-designer/report-designer/word-editor/code-editor chunk；记录修复前后入口尺寸与总传输量（gzip）对照表进 daily log

Exit Criteria:

- [ ] 构建成功且目标 vendor chunk 实际产出（记录精确 chunk 名如 `ui-*.js`/`spreadsheet-*.js`；注意与既有 lazy 页面 chunk `spreadsheet-page-*.js`/`report-designer-page-*.js` 区分，不得混淆）
- [ ] 入口 chunk 尺寸较 8560KB/gzip 2376KB 基线显著下降（数字记录）
- [ ] `pnpm --filter @nop-chaos/flux-playground test` 全绿

### Phase 2 - 重页面 lazy 化扩展

Status: planned
Targets: `apps/playground/src/App.tsx`

- Item Types: `Fix`

- [ ] Fix: 沿既有模式将重演示页改为 lazy + Suspense：scada 五页、calendar/gantt/kanban（含 perf-scale 变体）、diff-perf、dashboard、print-designer、graph、map、pivot、env-stream、data-verify、AI 族演示页；home/flux-basic/component-lab/complex-pages 保持 eager（核心审查面）
- [ ] Fix: 导入语义核对——lazy 化页面的模块顶层副作用（如有）迁入页面组件内或确认无副作用
- [ ] Proof: `app.test.tsx`/`route-matrix.test.ts` 全绿；抽样 e2e 冒烟（home → scada-demo → gantt-demo → ai-chat-demo）通过

Exit Criteria:

- [ ] 目标页面全部经 lazy 加载（App.tsx 审查记录），静态导入数量下降清单记录
- [ ] 入口 chunk 尺寸进一步下降（累计数字记录进 daily log）
- [ ] 单测全绿 + 冒烟 e2e 通过

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-09-28）
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed: 0 Blocker / 0 Major；3 Minor 全部修订——Failure Paths lazy-chunk 行为描述改写为"无 error boundary 白屏"（原文语义错误）；静态导入计数更正为 68/AI 13 连；Phase 1 Exit 补精确 vendor chunk 名要求并与既有页面 chunk 区分

## Closure Gates

- [ ] manualChunks 失效缺陷已修复且产物 chunk 实际产出（live defect 收敛）
- [ ] 行为/契约结果已达成：lazy 化后所有路由可达、测试全绿
- [ ] 必要 focused verification 已完成（尺寸对照表 + 冒烟 e2e）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（renderer 注册时机已显式裁定 Deferred）
- [ ] 受影响的 owner docs 已同步（`docs/architecture/playground-experience.md` 若描述构建/加载策略需更新；无变化则明确写 No owner-doc update required）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 13 个 renderer 包启动注册时机延后

- Classification: `optimization candidate`
- Why Not Blocking Closure: 广谱行为变更（所有路由首访时序、测试渲染假设、注册顺序依赖），风险/收益比在 chunk 拆分与 lazy 化落地后显著恶化；留待真实 profiling 证据支持时再做。
- Successor Required: `no`
- Successor Path: profiling 驱动的后续 plan

## Non-Blocking Follow-ups

- 432KB CSS 产物评估（Tailwind v4 全包扫描天然产物，暂不处理）。

## Closure

Status Note:

Closure Audit Evidence:

- Auditor / Agent:
- Evidence:

Follow-up:

- <<见 Non-Blocking Follow-ups>>
