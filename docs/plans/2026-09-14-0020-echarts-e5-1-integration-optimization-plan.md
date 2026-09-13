# E5.1 — ECharts 集成优化（按需引入包体、文档和示例、测试覆盖）

> Plan Status: active
> Last Reviewed: 2026-09-13
> Source: `docs/backlog/echarts-integration-roadmap.md`（E5.1）, `analysis/echarts-migration-analysis.md`（rev 3, §六 风险与缓解）
> Related: 前置 E1.1（按需引入粒度裁决）～E4.1（均 completed）

## Purpose

收口 roadmap E5.1 三件事：a) 按需引入的包体控制落地为**可复核的隔离守卫 + 实测包体记录**（粒度沿用 E1.1 裁决：单一 setup 模块注册清单即裁剪点）；b) 文档和示例（组件设计文档 + example schema + docs 路由）；c) 测试覆盖补强（真实浏览器 e2e smoke + 覆盖率核验）。

## Current Baseline

- 按需引入现状：echarts 为 optional peer（E1.1）；渲染器组件经 `createLazyRendererComponent` 动态 import，echarts 全量位于懒 chunk（未挂载 echarts 渲染器的宿主零加载）；`flux-bundle` vite external 使单文件 bundle 不含 echarts；`echarts-setup.ts` 集中注册 22 类 chart + 组件（E5 需要时的收窄点）。**但「静态可达模块不 import echarts」无自动守卫**（类型隔离目前只是约定），包体亦无实测记录。
- 文档现状：`docs/components/echarts/` 不存在；`docs/index.md` 仅有 roadmap 路由行；`docs/components/chart/design.md` 已声明双渲染器边界（chart 侧零迁移）。flux-guide 无 echarts 主题文件。
- 测试现状：单元层 9 个 echarts 测试文件（theme/dataset/events/advanced/full-features/schema-validation/renderer/renderer-load-failure/definition-contracts）约 74 用例全绿；e2e 无 echarts spec（真实浏览器从未渲染过 echarts 渲染器）；包级 vitest 覆盖率阈值 80%（branches/functions/lines/statements），echarts 新文件的覆盖率未核验。
- e2e 基座：`tests/e2e/component-lab/helpers.ts` 提供 `ComponentLabHelper.openRenderer(slug)` / `scenarioStage(slug)` 模式，真实浏览器 + 程序化 DOM 断言（canvas 一律程序化断言纪律）。

## Goals

- 隔离守卫自动化：静态可达模块（schemas/validation/definition/barrel）不得 import `'echarts'` 任何符号——违规即测试红（防未来回归破坏 optional peer）。
- 包体实测：echarts-setup 懒 chunk 的构建产物体积（min/gzip）实测并记录于设计文档，附可复现命令；载明裁剪点（setup 注册清单）与宿主零加载证据链。
- 文档和示例：`docs/components/echarts/design.md`（最终态设计：双渲染器边界、schema 字段契约表、dataset/events/theme/map 桥接、Failure Paths、验证锚点）+ `docs/components/echarts/example.json`（含 dataset 绑定与事件示例）+ `docs/index.md` 路由更新。
- 测试覆盖：echarts lab 的真实浏览器 e2e（canvas 程序化断言 + dataset 切换场景）；覆盖率核验（echarts 文件 ≥ 包级 80% 阈值）。

## Non-Goals

- 注册清单收窄（会砍掉 E3.1/E4.1 已验证的类型支持）——仅在文档载明收窄点与做法，供未来需求驱动。
- nop-datav 集成评估 → E5.2。
- e2e 全场景矩阵（本计划仅 smoke 级：渲染 + 交互各一）。

## Scope

### In Scope

- Fix：`src/__tests__/echarts-import-isolation.test.ts`——按 import source 匹配的守卫（`/from\s+['"]echarts|import\s*\(\s*['"]echarts|import\s+['"]echarts/`，覆盖静态 from、动态 import()、side-effect import 三种形态，含子路径）：`src/` 下除 `echarts-setup.ts` 外不得出现任何 echarts import；`echarts-renderer.tsx` 仅允许 type-only 与指向 `./echarts-setup.js` 的动态 import。
- Proof：包体实测——以 vite lib 模式构建最小入口（动态 import echarts-setup + 渲染 echarts 渲染器）产物，记录 min/gzip 体积与命令于 `docs/components/echarts/design.md`「按需引入与包体」节（`_tmp/` 下的测量产物用后即清）。
- Fix：`docs/components/echarts/design.md` + `docs/components/echarts/example.json`；`docs/index.md` 的 echarts 路由行更新（加组件文档指引）。
- Proof：`tests/e2e/component-lab/echarts-lab.spec.ts`——真实浏览器打开 echarts renderer lab：① bar 场景 canvas 渲染（`canvas` 元素存在 + 尺寸非零）；② dataset 切换场景点击按钮后 `echarts-empty` 不出现、无 `data-empty="true"`、无页面错误。按 canvas 程序化断言纪律（非截图）。
- Proof：覆盖率核验——`flux-renderers-data` vitest coverage 报告中 echarts 系文件各阈值 ≥ 80%（不达标文件补测，或按 Phase 2 Exit 在 plan 记录豁免理由）。

### Out Of Scope

- playground dev server 性能优化；e2e 全矩阵。
- flux-guide 主题文件（design.md 的 schema 表已承载作者契约；guide 扩充待需求）。

## Failure Paths

> 不适用：纯守卫/文档/测试补强，无新运行时行为。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`。理由：交付物即测试（隔离守卫、e2e）与可复核文档；e2e 程序化断言先写后绿。

## Execution Plan

### Phase 1 - 隔离守卫与包体实测

Status: planned
Targets: `packages/flux-renderers-data/src/__tests__/echarts-import-isolation.test.ts`, `docs/components/echarts/design.md`（「按需引入与包体」节，含自包含 harness）, `_tmp/echarts-size-*`（build 输出产物，用后即清；harness 源码内嵌 design.md）

- Item Types: `Proof | Fix`

- [ ] Proof：隔离守卫测试对当前代码为绿；红侧有效性以临时植入违规 import 单独验证（注入→红→移除，证据记 daily log）。
- [ ] Fix：`echarts-import-isolation.test.ts` 守卫规则落地（白名单 = echarts-setup.ts 全量 + echarts-renderer.tsx 的 type-only 与动态 import）。
- [ ] Proof：包体实测——最小入口 vite 构建产物 min/gzip 体积记录于 design.md「按需引入与包体」节，**该节内嵌 harness 完整源码（最小入口 + vite config，约 20 行）使命令自包含可复现**，并记录 echarts 版本与构建工具版本、注明「同 setup 注册清单下的代理实测：宿主懒 chunk 还含渲染器组件小 chunk，echarts 部分与实测一致」的可比性口径；`_tmp/` 下的 build 输出产物用后即清。

Exit Criteria:

- [ ] 隔离守卫测试全绿且红侧有效性已验证（临时违规注入会红，证据记 daily log）。
- [ ] design.md 含实测体积数字与自包含 harness（命令无需 plan 外文件即可复现）。

### Phase 2 - 文档、示例与 e2e

Status: planned
Targets: `docs/components/echarts/design.md`, `docs/components/echarts/example.json`, `docs/index.md`, `tests/e2e/component-lab/echarts-lab.spec.ts`

- Item Types: `Proof | Fix`

- [ ] Fix：`docs/components/echarts/design.md`（最终态：双渲染器边界、schema 字段契约表、dataset/事件/主题/map 桥接、Failure Paths 表、验证锚点）+ `example.json`（静态 option、dataset 绑定、事件、map 四类示例）+ `docs/index.md` 路由行更新 + `docs/components/index.md` 清单补 `echarts`。
- [ ] Proof（先红→绿）：`echarts-lab.spec.ts` e2e（test 取自 `../fixtures.js`，assertTrackedPageErrors 校验 fixture 管理的 page）——bar 场景 `[data-slot="echarts-canvas"] canvas` 存在且 boundingBox 非零；dataset 切换场景点击后 `data-slot="echarts-empty"` 不出现且容器无 `data-empty="true"`、无页面错误。
- [ ] Proof：覆盖率核验——`pnpm --filter @nop-chaos/flux-renderers-data exec vitest run --coverage`，从 json-summary 逐文件核对 echarts 系文件 ≥ 80% 四阈值（包级聚合 fail-fast 之外的逐文件人工读数；不达标即补测）。

Exit Criteria:

- [ ] design.md/example.json/index.md 落地且与 live 代码一致（字段、Failure Paths、诊断码逐项可对上）。
- [ ] e2e spec 全绿（真实浏览器）。
- [ ] echarts 文件覆盖率 ≥ 80% 或豁免理由记录在案。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，rounds 1–2）
- Verdict: `revised`（round 1 fail：2 Major——harness 可复现性矛盾、e2e gate 范围歧义；round 2 `pass-with-minors`：零 Blocker/Major，3 残余措辞 Minor 已由起草者合并，共识达成）
- Rounds: 2
- Findings addressed: R1-Major-1 harness 可复现（→ design.md「按需引入与包体」节内嵌 harness 完整源码，`_tmp/` 仅 build 输出用后即清）；R1-Major-2 e2e gate 歧义（→ `pnpm test` 单元全量 + `npx playwright test tests/e2e/component-lab/echarts-lab.spec.ts` 仅此 spec）；R1-Minor-1 守卫按 import source 三形态匹配；R1-Minor-2 先红措辞拆分；R1-Minor-3 e2e 断言对齐 live DOM 契约 + fixtures.js 来源注明；R1-Minor-4 测量口径标注（echarts 版本/构建工具/代理实测）；R1-Minor-5 docs/components/index.md 清单 + manifest 登记移入 Follow-ups；R1-Minor-6 baseline 修正 9 文件/约 74 用例；R1-Minor-7 coverage 命令与逐文件读数说明；R2-Minor-1/2/3 措辞同步。

## Closure Gates

- [ ] 所有 in-scope 项已落地：隔离守卫、包体实测记录、文档示例、e2e、覆盖率核验
- [ ] 行为/契约结果已达成：守卫规则与 white list 与 E1.1 类型隔离约束一致
- [ ] 必要 focused verification 已完成：隔离守卫/e2e/coverage 全绿
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响的 owner docs 已同步（design.md/example.json/index.md、roadmap E5.1 → done、daily log 收口记录）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`（单元全量）+ `npx playwright test tests/e2e/component-lab/echarts-lab.spec.ts`（e2e 范围仅此 spec，非全量 e2e）
- [ ] `pnpm check`（既有 i18n 4 键红之外零新增）

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- e2e 全场景矩阵（sankey/map/custom 的真实渲染细节断言）→ out-of-scope improvement，待需求驱动。
- `coverage-manifest-entries-data.ts` 补 echarts 条目纳入 manifest 驱动 smoke、`docs/components/examples.manifest.json` 登记 → out-of-scope improvement（本计划 design/example 已落地，登记为可选加固）。
- 注册清单收窄 → out-of-scope improvement，仅在有砍类型需求的裁决时按 design.md 载明做法执行。

## Closure

Status Note: （收口时填写）

Closure Audit Evidence:

- Auditor / Agent: 待独立子 agent closure audit
- Evidence: 待定

Follow-up:

- （待收口时填写）
