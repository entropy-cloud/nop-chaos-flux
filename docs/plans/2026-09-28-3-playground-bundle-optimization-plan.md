# 2026-09-28-3 Playground bundle 体积优化

> Plan Status: completed
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

Status: completed
Targets: `apps/playground/vite.config.ts`

- Item Types: `Fix | Proof`

- [x] Fix: 分组规则改为按 resolved 源码路径正则匹配（`/[\\/]packages[\\/]spreadsheet-(core|renderers)[\\//` 等，含 Windows 反斜杠兼容），保留 react/react-dom 的 node_modules 匹配
- [x] Proof: 构建产物 vendor chunks 实际产出：ui 628KB/191KB gzip、flow-designer 2460KB/726KB、report-designer 240KB/68KB、word-editor 836KB/237KB、code-editor 1400KB/461KB；入口 8560KB/2376KB gzip → 5764KB/1508KB gzip（Phase 1 后 -36.5% gzip）；数字已记 daily log

Exit Criteria:

- [ ] 构建成功且目标 vendor chunk 实际产出（记录精确 chunk 名如 `ui-*.js`/`spreadsheet-*.js`；注意与既有 lazy 页面 chunk `spreadsheet-page-*.js`/`report-designer-page-*.js` 区分，不得混淆）
- [ ] 入口 chunk 尺寸较 8560KB/gzip 2376KB 基线显著下降（数字记录）
- [ ] `pnpm --filter @nop-chaos/flux-playground test` 全绿

### Phase 2 - 重页面 lazy 化扩展

Status: completed
Targets: `apps/playground/src/App.tsx`

- Item Types: `Fix`

- [x] Fix: 35 个重演示页静态导入转为 `lazy(() => import(...))` + JSX 用点替换（scada 五页、gantt/gantt-states/kanban/calendar 及 perf-scale 变体、diff/diff-perf、dashboard、print-designer、graph、map、pivot、barcode、env-stream、data-verify、AI 13 连）；home/flux-basic/component-lab/complex-pages/performance-table 保持 eager
- [x] Fix: 导入语义核对——目标页面均为演示组件（无注册类模块顶层副作用；渲染器注册保留在 App 顶层不变）
- [x] Proof: `app.test.tsx`/`route-matrix.test.ts`/performance-table-page 三套件 51+1skip 全绿；e2e 冒烟 home-entry-navigation（6/6，覆盖 report-designer-host/map-demo/pivot-table-demo 卡片导航）+ visual-helpers-smoke（2/2）通过

Exit Criteria:

- [x] 目标页面全部经 lazy 加载：App.tsx 静态 `./pages` 导入 68 → 33（35 转 lazy + 既有 11 = 46 个 lazy 声明）
- [x] 入口累计：8560KB → 4984KB raw，gzip 2376KB → 1285KB（**-46%**）；数字记入 daily log
- [x] 单测全绿 + 冒烟 e2e 通过

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-09-28）
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed: 0 Blocker / 0 Major；3 Minor 全部修订——Failure Paths lazy-chunk 行为描述改写为"无 error boundary 白屏"（原文语义错误）；静态导入计数更正为 68/AI 13 连；Phase 1 Exit 补精确 vendor chunk 名要求并与既有页面 chunk 区分

## Closure Gates

- [x] manualChunks 失效缺陷已修复且产物 chunk 实际产出（live defect 收敛）
- [x] 行为/契约结果已达成：lazy 化后所有路由可达、测试全绿
- [x] 必要 focused verification 已完成（尺寸对照表 + 冒烟 e2e）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（renderer 注册时机已显式裁定 Deferred）
- [x] 受影响的 owner docs 已同步——No owner-doc update required：playground-experience.md 未描述 chunk 策略细节；加载时序行为不变（仅打包分组与加载时机）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（audit 进行中）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 13 个 renderer 包启动注册时机延后

- Classification: `optimization candidate`
- Why Not Blocking Closure: 广谱行为变更（所有路由首访时序、测试渲染假设、注册顺序依赖），风险/收益比在 chunk 拆分与 lazy 化落地后显著恶化；留待真实 profiling 证据支持时再做。
- Successor Required: `no`
- Successor Path: profiling 驱动的后续 plan

## Non-Blocking Follow-ups

- 432KB CSS 产物评估（Tailwind v4 全包扫描天然产物，暂不处理）。

## Closure

Status Note: manualChunks 死配置修复（workspace 包按 resolved 源码路径分组）+ 35 个重页面 lazy 化，入口 gzip 2376KB → 1285KB（-46%），五个 vendor chunk 独立产出（spreadsheet 组归入 report-designer chunk，分组目标达成仅命名不同）。独立审计 approved，全部量化数字由审计方复现。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-09-28）
- Evidence: verdict approved——审计方独立重建构建（17s 成功、133 chunks、entry 4982KB/1284KB gzip）、逐 chunk 尺寸核验（五组全部命中）、lazy 化核验（静态导入 68→33、lazy 声明 46、eager 五面确认、Suspense Spinner 兜底）、三套件 51+1skip 独立复跑、playground typecheck/lint 干净；renderer 注册 Deferred 判定诚实。3 项 bookkeeping note 已由执行者处置（Phase 1 exit 勾选 + spreadsheet 命名注记、正则文本勘误、audit evidence 填写）。

Follow-up:

- <<见 Non-Blocking Follow-ups>>
