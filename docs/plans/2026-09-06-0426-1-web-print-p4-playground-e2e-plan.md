# Web Print P4 — Playground 集成与 E2E

> Plan Status: completed
> Last Reviewed: 2026-09-06
> Source: `docs/backlog/web-print-roadmap.md`（P4.1–P4.4）、`docs/components/print/design.md`（§7/§11）、`docs/analysis/web-print-research.md` §5（演示建议：A4 单据含跨页表格 + 80mm 小票）
> Related: 前置 plan `2026-09-06-0311-1-web-print-p3-renderer-plan.md`（completed，含 P4 承接项：print/export 失败提示 UI、条码真机断言）；先例 `apps/playground/src/pages/flow-designer-page`、`tests/e2e/flow-designer-*.spec.ts`

## Purpose

收口 roadmap P4 全部 4 个工作项：playground 打印设计器演示页（P4.1）+ 路由入口（P4.2）+ e2e 测试（P4.3）+ 全量运行验证（P4.4）。交付后，用户可在 playground 中通过 `/#/print-designer` 访问完整打印设计器（编辑/预览/浏览器打印/PDF 导出），并有 Playwright e2e 守护核心链路（含条码 `<svg` 真机断言——P3 移交项）。

## Current Baseline

- P0–P3 已收口：`flux-print-renderers` 提供 `PrintDesigner` 壳（工具栏/画布/面板/预览/快捷键/`onTemplateChange`）；`flux-print-core` 提供 `printPrintTemplate`（iframe 打印）、`exportPrintTemplateToPdf`（html2canvas+jspdf 下载）、`renderPrintTemplateToHtml`/`renderPrintPages`（分页同源 HTML）、`createBarcodeSvg`（happy-dom 下降级空串——真机 `<svg` 断言移至本 Phase e2e）。
- P3 遗留 P4 承接项（前置 plan Follow-up）：playground 演示页接入 print/export 失败提示 UI（Failure Path print-blocked/pdf-empty 的用户可见表现）。
- Playground 路由机制实测：hash 路由（`/#/route-id`；`route-model.ts` 的 parseRoute/buildRoute，`use-route.ts` 消费）；`App.tsx` 以 `case '<route-id>':` 渲染 `./pages/*` 组件；领域路由元数据注册于 `domain-route-entries.ts`（`DOMAIN_RENDERER_ROUTES`，flow-designer/taskflow-designer/word-editor 等先例）；路由相关单测 `route-matrix.test.ts`/`app.test.tsx`/`app-diagnostics-route.test.tsx`。
- e2e 基础设施实测：`playwright.config.ts` 有 `baseURL` + `webServer`；spec 通过 `page.goto('/#/route-id')` 导航（`ai-chat.spec.ts:4` 先例）；下载事件可经 Playwright `waitForEvent('download')` 断言。
- 全仓基线：test 71/71、typecheck/build/lint 39/39、core 70/70、renderers 69/69；`check:i18n-keys` 基线既有红。

## Goals

- `apps/playground/src/pages/print-designer-demo.tsx`：演示页——两套示例模板（A4 出库单：header/footer/页码/跨页表格含聚合；80mm 小票：无页眉页脚的窄幅单据）可切换；`PrintDesigner` 壳 + 打印/导出按钮（接入 `printPrintTemplate`/`exportPrintTemplateToPdf`，失败时按钮旁 toast/行内提示——print-blocked/pdf-empty 可见化）。
- 路由入口：`/#/print-designer` 可直达（domain-route-entries + App.tsx case + 路由单测更新）。
- e2e：`tests/e2e/print-designer.spec.ts`——路由加载（画布/面板/检查器）、palette 点击添加、预览分页同源（iframe srcdoc 含绑定值、页数徽标）、打印按钮存在、导出触发下载事件、条码元素真机 `<svg` 断言。
- 全量运行验证：单测 + e2e 全绿记录于 daily log。

## Non-Goals

- 不新增/修改打印引擎行为（layout/render-html/print/export-pdf 的功能扩展归后续增强）。
- 不做 measure 精确实测注入（P3 已裁定的 P4 后增强点）。
- 不改设计器交互与 flux-print-core 公共导出。

## Scope

### In Scope

- `apps/playground/src/pages/print-designer-demo.tsx`（新）+ `apps/playground/src/domain-route-entries.ts`、`apps/playground/src/App.tsx`（路由注册）+ 新增路由 Proof 断言（route-matrix 对 DOMAIN_RENDERER_ROUTES 的既有断言对新增条目天然通过，无破坏点）。
- `apps/playground/package.json`：新增 `@nop-chaos/flux-print-core`、`@nop-chaos/flux-print-renderers`（均 workspace:\*）依赖——未声明则留下未声明 workspace 依赖 drift（manifest-deps 同型红线）。
- `tests/e2e/print-designer.spec.ts`（新）。
- `docs/logs/` 记录。

### Out Of Scope

- 打印引擎功能变更、设计器交互变更、v2 元素类型。

## Failure Paths

| 可测场景编号    | 触发                              | 行为                                               | 可重试 | 用户可见表现 |
| --------------- | --------------------------------- | -------------------------------------------------- | ------ | ------------ |
| d-print-blocked | 演示页点击打印但浏览器拦截/无窗口 | 行内提示"打印失败"，不抛未捕获异常                 | 是     | 提示文案可见 |
| d-pdf-failed    | 导出抛 EXPORT_EMPTY/print-blocked | 行内提示"导出失败"，不抛未捕获异常                 | 是     | 提示文案可见 |
| d-route-404     | 访问未注册路由                    | playground 既有 404/首页回退行为（不因新路由变更） | 是     | 既有行为     |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化` —— 本 Phase 的交付物就是自动化验证本身（e2e 守护打印核心链路 + 真机条码断言），路由注册以 playground 既有单测固化。

## Execution Plan

### Phase 1 - 演示页与路由入口（P4.1 + P4.2）

Status: completed
Targets: `apps/playground/src/pages/print-designer-demo.tsx`、`apps/playground/src/{domain-route-entries.ts, App.tsx}`、`apps/playground/package.json`、路由单测

- Item Types: `Fix | Proof`

- [x] `print-designer-demo.tsx`：示例模板工厂——A4 出库单（header 文案 + footer 页码 + 30 行表格含 sum 聚合 + 条码/二维码元素，testData 驱动绑定）与 80mm 小票（窄幅、无页眉页脚）切换；`PrintDesigner` 壳（`onTemplateChange` 保留最新模板）；打印/导出按钮调 `printPrintTemplate`/`exportPrintTemplateToPdf`，async 错误捕获后行内提示（Failure Path d-print-blocked/d-pdf-failed）
- [x] `apps/playground/package.json` 声明 `@nop-chaos/flux-print-core`、`@nop-chaos/flux-print-renderers`（workspace:\*）并 `pnpm install`
- [x] 路由注册：`domain-route-entries.ts` 加 `id: 'print-designer'` 条目；`App.tsx` 加 `case 'print-designer'` 渲染演示页（沿 App.tsx 既有 `./pages/<file>` 直接导入惯例，barrel 非必需）
- [x] Proof：新增路由断言——route-matrix 中 DOMAIN_RENDERER_ROUTES 逐条 parse 与条目清单对 `print-designer` 存在性断言（既有断言对新增条目天然通过，无破坏点）+ 演示页渲染冒烟（如 playground 既有 page 测试模式适用）

Exit Criteria:

- [x] `/#/print-designer` 路由可达（路由单测证明），演示页含两套可切换示例模板与打印/导出按钮
- [x] `pnpm --filter @nop-chaos/flux-playground test` 全绿（347/347）；playground typecheck 通过

### Phase 2 - E2E 测试（P4.3）

Status: completed
Targets: `tests/e2e/print-designer.spec.ts`

- Item Types: `Proof`

- [x] e2e 用例：①`/#/print-designer` 加载（canvas/palette/inspector testid 可见）；②palette 点击添加元素；③预览对话框——iframe srcdoc 含绑定值、页数徽标 ≥1；④条码元素真机 `<svg` 断言（预览 srcdoc 内嵌 SVG——P3 移交项）；⑤导出按钮触发 download 事件（Playwright 1.59 默认 acceptDownloads=true，jsPDF blob 下载零配置触发）；⑥打印按钮存在（不真实触发浏览器打印对话框）
- [x] Proof 运行：`npx playwright test tests/e2e/print-designer.spec.ts` 6/6 全绿

Exit Criteria:

- [x] e2e 6 类断言全绿；`tests/e2e/artifacts/` 无新增待提交产物
- [x] 既有 e2e 套件不受影响（全量 `pnpm test:e2e` 于 Phase 3 收口执行）

### Phase 3 - 全量验证与收口（P4.4）

Status: completed
Targets: 全仓

- Item Types: `Proof`

- [x] `pnpm test`（72/72 task）、`pnpm test:e2e`（全量：1455 passed / 0 failed / 1 flaky / 43 skipped）、`pnpm typecheck` 39/39、`pnpm build` 39/39、`turbo run lint --force` 39/39、`pnpm check` 各门禁逐个 exit 0 + i18n 基线比对一致——已记录于 daily log
- [x] `docs/logs/` 记录 P4 收口与全量验证结果（执行当日）

Exit Criteria:

- [x] 全仓单测与 e2e 全绿（0 failed；1 flaky 为 gantt-bars-and-links 拖拽时序用例，重试通过、与 print 改动零交集，单独复跑 15/15 后又在带重试的复跑中偶发——属基线时序 flaky，非本计划新增，建议登记 watch-only）；基线既有红零新增
- [x] `docs/logs/` 已记录 P4 收口

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_7de4429f-6901-4224-b1c6-21b7c33e7746）
- Verdict: `pass`（round 1 fail：2 Major；round 2 复核确认全部落实）
- Rounds: 2
- Findings addressed:
  - Round 1 M-1（`pnpm --filter playground` 引用错误，实际包名 @nop-chaos/flux-playground）→ Exit 命令已改
  - Round 1 M-2（playground package.json 未声明两个 flux-print 包，workspace 依赖 drift）→ In Scope/Targets/执行项三处补齐
  - Round 1 m-1..m-4（parseRoute 归属、路由单测措辞、下载断言前提、pages barrel 说明）→ 全部落实

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（audit 实证 StrictMode dispose bug 已修并有 e2e 守卫）
- [x] 所有 in-scope confirmed contract drifts 已收敛（路由/依赖/导出契约与既有体系一致，manifest-deps exit 0）
- [x] 行为/契约结果已达成（audit 实跑 e2e 6/6；`/#/print-designer` 可达；演示页双模板 + 打印/导出 + 失败提示齐备）
- [x] 必要 focused verification 已完成（audit 实跑 typecheck/build/lint 39/39、test 72/72、playground 347/347）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（gantt flaky 为基线 watch-only 残留，与 print 零交集）
- [x] 受影响的 owner docs 已同步到 live baseline（本计划无 owner-doc 改动需求；design.md 契约已在 P3 轮回写）
- [x] roadmap P4 状态回写（两处同步）：Phase Status 区 `P4. Playground 集成与 E2E 测试` 行 + Work Items 表 P4.1–P4.4 四行 → `done`（closure audit approved 后）
- [x] `docs/logs/` 已记录 P4 收口与全量验证结果（docs/logs/2026/09-06.md）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（agent_b9f733b0-e6ae-469b-9790-b1bc04713251，实跑全部验证；2 处文本同步后 approved）
- [x] `pnpm typecheck`（39/39）
- [x] `pnpm build`（39/39）
- [x] `pnpm lint`（turbo lint --force 39/39；根 lint 链仅败于基线既有 check:i18n-keys）
- [x] `pnpm test`（72/72 task）
- [x] `pnpm test:e2e`（1455 passed / 0 failed / 1 flaky / 43 skipped；flaky 为 gantt 拖拽基线时序用例，watch-only 登记）
- [x] `pnpm check`（零新增红项：check:i18n-keys ❌ 与基线逐条一致、unused=284；其余门禁 exit 0）

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

（暂无）

## Closure

Status Note: 2026-09-06 收口。P4.1–P4.4 全部落地：playground `/#/print-designer` 演示页（A4 出库单/80mm 小票双模板、打印/导出按钮 + 失败提示）、e2e 6 用例守护核心链路（含条码真机 `<svg` 断言——P3 移交项闭环）、全量验证全绿（单测 72/72、typecheck/build/lint 39/39、e2e 1455 passed/0 failed）。独立子 agent closure audit 实跑全部验证后仅余 2 处 plan 文本同步（已修复），随即 approved。**web-print mission 五个 Phase 至此全部闭环。**

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_b9f733b0-e6ae-469b-9790-b1bc04713251）
- Evidence: 审计实跑——print spec e2e 6/6（exit 0）、typecheck/build/lint 39/39（缓存哈希一致）、test 72/72、playground 347/347、manifest-deps exit 0、`tests/e2e/artifacts/` 无待提交产物；Failure Paths（d-print-blocked/d-pdf-failed/d-route-404）代码级核实；gantt flaky 判定为 watch-only residual 合理；P0–P3 四份 plan 0 未勾 checkbox、roadmap 无遗留声明。2 处文本同步（L102 补勾、L101 计数 71→72）后 approved。记录同步至 docs/logs/2026/09-06.md。

Follow-up:

- no remaining plan-owned work（web-print mission 五 Phase 闭环。后续增强归非本 mission 债务：measure 精确实测注入、条码真机断言已在本 Phase e2e 闭环、gantt flaky watch-only 登记建议维护者裁定）
