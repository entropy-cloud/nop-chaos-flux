# Web Print P1 — 基础设施搭建

> Plan Status: completed

> 执行备注（2026-09-06）：全仓验证结果——`pnpm test` 71/71 task、`pnpm typecheck` 39/39、`pnpm build` 39/39、`turbo run lint` 39/39 全绿；`pnpm check`/根 `pnpm lint` 中 `check:i18n-keys` 失败为基线既有红（与主工作树 `~/app/nop-chaos-flux` 命中清单逐条一致、非本计划引入，证据已记 daily log）；其余 14 项 check 门禁全部 exit 0（含 manifest-deps 修复后的复验）。
> Last Reviewed: 2026-09-05
> Source: `docs/backlog/web-print-roadmap.md`（P1.1–P1.4）、`docs/components/print/design.md`（P0 产出）、`docs/analysis/web-print-research.md` §5（P1 调整建议）
> Related: 前置 plan `2026-09-05-2304-1-web-print-p0-research-and-design-plan.md`（completed）；后续 P2–P4 计划另行起草

## Purpose

收口 roadmap P1 全部 4 个工作项：创建 `flux-print-core` 包（P1.1）、创建 `flux-print-renderers` 包（P1.2）、完成 workspace 注册与构建链路（P1.3）、实现打印模板 schema 编译器（校验 + 数据绑定求值，P1.4）。交付后，两个新包可通过 `pnpm typecheck`/`pnpm build`/`pnpm test`，schema 类型、单位换算、校验诊断、表达式绑定求值有 focused 单测覆盖。

## Current Baseline

- P0 已收口（plan `2026-09-05-2304-1` completed）：`docs/components/print/design.md` 定义了 `PrintTemplateSchema`（§4）、mm 单位制（§4 坐标系）、元素 v1 九类型、结构化样式白名单、region 归属、表格 schema（§4.3）、绑定语义（§5：flux-formula + `$row/$rowIndex/$page/$pages`）、诊断要求（§10）；`docs/analysis/web-print-research.md` §5 给出 P1 调整建议（引擎归 core、jsbarcode 在 P1 声明依赖、页面模型对齐 word-editor `PaperSettings` 形状并复制而非依赖）。
- `packages/` 现有 36 个包，无任何 `flux-print-*` 包；`pnpm-workspace.yaml` 用 `packages/*` glob（新包目录创建后 `pnpm install` 即纳入 workspace）。
- 包注册机制实测：`vite.workspace-alias.ts`（源码别名）、`tsconfig.base.json` `paths`（跨包 typecheck 解析）、根 `tsconfig.json` `references`（project references）、各包 `vitest.config.ts` 用 `vitest.shared.ts` 的 `createSharedVitestConfig`（测试模块解析走同一别名表）。
- 包模板实测：纯 TS 包参照 `packages/editor-core`（tsc 构建、无 vitest.config、`vitest run` 直接跑）；React 包参照 `packages/flux-renderers-content`（`vitest.config.ts` + happy-dom + coverage 80 阈值、peerDependencies 收 react 等）。
- 依赖现状：`qrcode@^1.5.4` 已在 flux-renderers-content 使用；`html2canvas` 已在 flux-renderers-scheduling 使用；`jsbarcode` 在 lockfile 中零命中（需新装）；`jspdf` 未安装（P3 才需要，P1 不装）。
- `bind.ts` 需要 flux-formula（`createFormulaCompiler`/`parseFormula` 等，`packages/flux-formula/src/index.ts:1-10`）；word-editor `PaperSettings` 形状为 `{width,height,direction:'vertical'|'horizontal',margins:[4]}` + `PAPER_SIZE_PRESETS`（`packages/word-editor-core/src/paper-settings.ts`）。

## Goals

- `@nop-chaos/flux-print-core`：纯 TS 零 React 包，含 `schemas.ts`（design.md §4 全部类型）、`unit.ts`（mm↔px↔pt 换算）、`validate.ts`（结构校验 + 结构化诊断）、`bind.ts`（flux-formula 绑定求值）、`index.ts`。
- `@nop-chaos/flux-print-renderers`：React 交互层包骨架，含 `schemas.ts`、`renderer-definitions.ts`（设计态元素 React 渲染件注册表，v1 九类型的骨架渲染件）、`index.ts`。
- 两包完成 workspace 全链路注册（alias、paths、references、install），`pnpm typecheck`/`pnpm build` 全仓通过。
- schema 编译器（validate + bind）有 focused 单测：合法模板通过、各类非法结构产出 error 诊断、绑定路径求值与内置变量语义正确。**bind 契约二分**：行级 `$row/$rowIndex/$rows` 由 bind 真实注入；`$page/$pages` 是页面级变量（P3 layout 分页后才产生），bind 只交付**注入机制**——经 `ctx` 接受外部提供值并透传求值，单测用桩值证明机制，真实取值由 P3 layout 提供（与 design.md §5"分页前一次性绑定"+ §6 pageNumberToken 一致）。

## Non-Goals

- 不实现分页引擎 `layout.ts`、HTML 渲染 `render-html.ts`、打印 `print.ts`、PDF 导出 `export-pdf.ts`（P3）。
- 不实现设计器画布/面板/预览/undo 交互（P2）；P1 的 renderer-definitions 只交付设计态元素的静态渲染件与注册表，不含拖拽/选中/属性编辑。
- 不改动任何既有包的行为；除注册机制文件（alias/paths/references）外不触碰既有代码。
- 不引入 `jspdf`；`jsbarcode` 仅在 `flux-print-core` package.json 声明依赖，实现（条码生成 util）落 P3。
- 不做 flux registry 注册（`PrintTemplateSchema` 不是 flux 页面 schema，不进 flux renderer registry；"flux 页面内嵌打印组件"是后续扩展位）。

## Scope

### In Scope

- 新建 `packages/flux-print-core/`：package.json、tsconfig.json、tsconfig.build.json、vitest.config.ts、src/{index.ts, schemas.ts, unit.ts, validate.ts, bind.ts} + 对应 `*.test.ts`。
- 新建 `packages/flux-print-renderers/`：package.json、tsconfig.json、tsconfig.build.json、vitest.config.ts、src/{index.ts, schemas.ts, renderer-definitions.tsx} + 对应测试。
- 注册：`pnpm install`、`vite.workspace-alias.ts`、`tsconfig.base.json` paths、根 `tsconfig.json` references。
- 依赖声明：flux-print-core 依赖 `@nop-chaos/flux-formula` + `@nop-chaos/flux-core`（均 workspace:_，bind 需 `EvalContext`/`RendererEnv` 类型，否则 `check:workspace-manifest-deps` 必红）；flux-print-renderers 依赖 `@nop-chaos/flux-print-core` + `@nop-chaos/ui`（workspace:_）+ react peer。**scope 调整（执行期裁定，2026-09-06）**：`jsbarcode` 不在 P1 声明——`check:workspace-manifest-deps` 硬门禁要求 declared 依赖必须被 src 引用，而条码生成实现属 P3；调研报告 §5"jsbarcode 在 P1 声明"的建议与硬门禁冲突，按 guide Rule 13（硬约束不可降级）改为"在首个引用它的 Phase 随实现一并声明"。
- `docs/logs/` 记录。

### Out Of Scope

- layout/render-html/print/export-pdf（P3）、设计器交互（P2）、playground 与 e2e（P4）。
- flux-guide 类型再生（`generate-types.mjs` 面向 flux registry 渲染器，打印 schema 不走该链路）。
- i18n key 注册（P1 无用户可见文案；P2 面板文案时再进 flux-i18n）。

## Failure Paths

| 可测场景编号        | 触发                                                | 行为（含诊断码）                                                                                                    | 可重试 | 用户可见表现                  |
| ------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------- |
| v-invalid-structure | 模板缺 `page`/`elements`、元素缺 id/type、type 未知 | `validatePrintTemplate` 返回 error 级诊断（`PRINT_*` 诊断码 + elementId），不抛异常                                 | 是     | 设计器校验面板标红（P2 接入） |
| v-region-overflow   | body 元素超出内容区（页眉线/页脚线外）              | warning 级诊断                                                                                                      | 是     | 黄色警示                      |
| v-table-source      | table.source 非数组路径或不可解析                   | warning 级诊断；bind 时按空数组处理                                                                                 | 是     | 黄色警示                      |
| b-path-miss         | 绑定路径不可达（`${user.missing}`）                 | 求值返回空字符串，不抛错；**warning 诊断由 bind 产出**（validate 无 data 参数，静态不可判定）                       | 是     | 渲染为空 + 警示               |
| b-syntax-error      | 表达式语法非法（`${a +}`）                          | **compile 阶段 catch `FormulaSyntaxError`**（flux-formula 在 compile 抛出而非 exec）：error 诊断 + 该元素按空串处理 | 是     | 校验面板报错                  |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化` —— unit/validate/bind 是整个打印体系的公共契约与核心回归路径（分页引擎与渲染器都消费它们），后续 P2/P3 立即依赖。Proof 项（单测先红后绿）置于 Phase 4 的 Fix 项之前；Phase 1/2 的 schemas/unit 也以 `*.test.ts` 固化类型约束与换算契约。

## Execution Plan

### Phase 1 - flux-print-core 包 + schemas + unit + 注册（P1.1 + P1.3 前半）

Status: completed
Targets: `packages/flux-print-core/`、`vite.workspace-alias.ts`、`tsconfig.base.json`、根 `tsconfig.json`、`pnpm-lock.yaml`

- Item Types: `Fix | Proof`

- [x] 创建包骨架：package.json（`@nop-chaos/flux-print-core`，private，ESM，tsc 构建，deps：`@nop-chaos/flux-formula`、`@nop-chaos/flux-core` 均 workspace:\*；jsbarcode 按上方 scope 调整不声明，移至首个引用的 Phase）、tsconfig.json（extends base，noEmit）、tsconfig.build.json（outDir dist）、vitest.config.ts（createSharedVitestConfig，node 环境）、src/index.ts
- [x] `src/schemas.ts`：按 design.md §4 落全部类型——`PrintTemplateSchema`/`PrintPageSchema`/`PrintElementBase`/`PrintElementStyle`/九元素判别联合（text/image/table/barcode/qrcode/line/rect/pageNumber/printDate）/`PrintTableElement`/`PrintTableColumn`/`PrintValueFormat`/`PrintFieldMeta`/`PaperSettings` 形状复制 + `PAPER_SIZE_PRESETS`（键位与物理纸张对齐 word-editor，数值按 print 协议单位 mm 换算——word-editor 为 pt，A4=210×297mm）+ `PRINT_ELEMENT_TYPES` 常量集
- [x] `src/unit.ts`：`MM_PER_INCH`/`PX_PER_MM(96dpi)`/`mmToPx`/`pxToMm`/`mmToPt`/`ptToMm`/`getContentRect(page)`（页眉页脚划出的内容区）
- [x] `src/unit.test.ts` + `src/schemas.test.ts`：换算数值锚点（A4 595×842pt ↔ 210×297mm、1mm=3.7795px）与类型契约（判别联合收窄）
- [x] **core 注册**：`vite.workspace-alias.ts` 与 `tsconfig.base.json` paths 加 `@nop-chaos/flux-print-core`，根 `tsconfig.json` references 加条目，`pnpm install` 链接。执行备注：根 tsconfig references 指向尚不存在的包目录会使 vite:oxc 解析 setup 文件的 tsconfig 失败（全仓测试报 TSCONFIG_ERROR），故 renderers 的 references 条目随 Phase 2 建包同步补入；alias/paths 已先行就位

Exit Criteria:

- [x] `packages/flux-print-core/src/{schemas.ts,unit.ts}` 存在，类型与 design.md §4 一一对应，`getContentRect` 按 headerHeight/footerHeight 划区
- [x] core 三处注册完成且出现在 pnpm-lock.yaml workspace 链接中
- [x] `pnpm --filter @nop-chaos/flux-print-core test` 通过（13/13）；`pnpm --filter @nop-chaos/flux-print-core typecheck` 通过

### Phase 2 - flux-print-renderers 包骨架 + 注册（P1.2 + P1.3 后半）

Status: completed
Targets: `packages/flux-print-renderers/`、`vite.workspace-alias.ts`、`tsconfig.base.json`、根 `tsconfig.json`、`pnpm-lock.yaml`

- Item Types: `Fix`

- [x] 创建包骨架：package.json（deps：`@nop-chaos/flux-print-core`、`@nop-chaos/ui` 均 workspace:\*；peerDependencies：react ^19；devDependencies：react ^19、@types/react、jsdom——peer+dev 双声明对齐 flux-renderers-content 模板）、tsconfig.json/tsconfig.build.json、vitest.config.ts（createSharedVitestConfig，happy-dom）、src/index.ts
- [x] `src/schemas.ts`：设计器态 schema 视图（元素默认值工厂 `createDefaultElement(type)`：每个 type 的默认 frame/style，单点集中，参考 fastprint 调研结论）
- [x] `src/renderer-definitions.tsx`：`PrintElementRenderer` 注册表（type → React 设计态渲染件）+ v1 九类型的骨架渲染件（按 schema 静态呈现：文本框、图片占位、表格线框 + 表头、条码/二维码占位框、line/rect/pageNumber/printDate）——仅渲染，无交互
- [x] `src/renderer-definitions.test.tsx`：注册表完备性（九类型全注册、未知 type 回退占位）与默认值工厂契约
- [x] **renderers 注册**：alias/paths/references 三处加 `@nop-chaos/flux-print-renderers`，`pnpm install` 二次链接

Exit Criteria:

- [x] `packages/flux-print-renderers/src/{schemas.ts,renderer-definitions.tsx}` 存在，九类型渲染件注册完备；renderers 三处注册完成
- [x] `pnpm --filter @nop-chaos/flux-print-renderers test` 通过（10/10）；`pnpm --filter @nop-chaos/flux-print-renderers typecheck` 通过

### Phase 3 - workspace 构建链路收口（P1.3 收尾）

Status: completed
Targets: 两包构建产物、全仓 typecheck

- Item Types: `Proof`

- [x] `pnpm --filter @nop-chaos/flux-print-core build && pnpm --filter @nop-chaos/flux-print-renderers build` 通过（dist 产物落位；注：build 需上游 flux-core/flux-formula dist，经全仓 `pnpm build` 按依赖序完成）
- [x] 全仓 `pnpm typecheck` 通过（39/39 task）——此处全仓验证是 guide Rule 18 例外：注册改动（alias/paths/references）属全仓契约，需证明未破坏既有 36 包（注：reference 指向不存在的包目录会令 vite:oxc 的 tsconfig 解析全仓失败，已验证两包就位后解除）

Exit Criteria:

- [x] 两包 dist 构建成功；全仓 `pnpm typecheck` 通过（36+2 包及 playground，39/39 task）

### Phase 4 - schema 编译器：validate + bind（P1.4）

Status: completed
Targets: `packages/flux-print-core/src/{validate.ts,bind.ts}`

- Item Types: `Proof | Fix`

- [x] Proof 先行：`src/validate.test.ts` + `src/bind.test.ts` 写目标用例（合法模板零诊断；缺 page/未知 type/缺 id → error 诊断码；region 越界 → warning；pageNumber 出现在 body 区 → warning；必填专有字段缺失（image.fit、barcode.barcodeType、qrcode.level）→ error；`${path}` 求值、缺失路径空串 + bind warning、`$row/$rowIndex/$rows` 真实注入、`$page/$pages` 经 ctx 桩值透传、语法错误在 compile 阶段 catch → error 诊断）——先红（模块缺失 2 文件 fail）后绿
- [x] `src/validate.ts`：`validatePrintTemplate(template): PrintDiagnostic[]`（`{level:'error'|'warning', code:'PRINT_*', message, elementId?}`）——结构必填、type 白名单、必填专有字段（image.fit/barcode.barcodeType/qrcode.level）、pageNumber 仅限 header/footer 区、region 越界（用 unit.getRegionRect）、table.source 形态、page.paperName 预设合法
- [x] `src/bind.ts`：`bindPrintTemplate(template, data, ctx?): {template: BoundPrintTemplate, diagnostics: PrintDiagnostic[]}`——文本/字段 `${}` 求值走 flux-formula（`createFormulaCompiler`；`import type { EvalContext, FormulaCompiler, RendererEnv } from '@nop-chaos/flux-core'`，测试用最小 env stub：noop `fetcher`/`notify`）；表格 source 求值为数组；行级 `$row/$rowIndex/$rows` 真实注入；`$page/$pages` 经 ctx 接受外部值透传（P3 layout 提供真实值）；缺失路径空串 + PRINT_BIND_PATH_MISSING warning（经 env.onUndefinedVariable 捕获——evaluator 对成员访问抛错，compile/exec 两阶段分离以区分 PRINT_BIND_SYNTAX 与路径缺失）；printDate 内置轻量 dayjs-token 格式化器（YYYY/MM/DD/HH/mm/ss，避免引入 dayjs 依赖）
- [x] Proof 收口：36/36 全绿；诊断码与 Failure Paths 表逐条对应（v-invalid-structure/v-region-overflow/v-table-source/b-path-miss/b-syntax-error 全覆盖）

Exit Criteria:

- [x] `validatePrintTemplate`/`bindPrintTemplate` 实现并有 focused 单测覆盖 Failure Paths 全部 5 个场景（先红后绿）
- [x] `pnpm --filter @nop-chaos/flux-print-core test` 全绿（36/36，含 schemas/unit/validate/bind 四文件）
- [x] `docs/logs/` 记录 P1 收口（docs/logs/2026/09-06.md）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_7c5cc38a-a67d-4fd9-87f1-8c2dbdde279c）
- Verdict: `pass-with-minors`（零 Blocker、零 Major）
- Rounds: 2
- Findings addressed:
  - Round 1 B-1（注册时点在 Phase 3，Phase 2 跨包解析不可达）→ 注册前置：Phase 1 内完成 core 三处注册 + install，Phase 2 内完成 renderers 注册 + 二次 install，Phase 3 收缩为构建收口
  - Round 1 M-1（缺 `@nop-chaos/flux-core` 依赖声明，type-only import 也会触发 manifest-deps 红线）→ In Scope 与 Phase 1/4 补声明与最小 env stub 约定
  - Round 1 M-2（`$page/$pages` bind 时机与 design.md §5/§6 冲突、漏 `$rows`）→ bind 契约二分：行级真实注入（含 $rows），页面级经 ctx 透传（桩值单测，真实值归 P3 layout）
  - Round 1 M-3（Closure Gates 缺 `pnpm check`）→ 已补（零新增红项门禁）
  - Round 1 m1–m6（包计数、b-path-miss 产出方、compile 阶段 catch、peer+dev 双声明、validate 覆盖必填专有字段与 pageNumber 区域、Rule 18 例外理由）→ 全部修复
  - Round 2 残留 cosmetic（Goals bullet 自指标签"Goals 第 4 条："）→ 已清理

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（含 P0 设计与本实现间的契约偏差：design.md §4.2 pageNumber 示例已按 §5 语义修正）
- [x] 所有 in-scope confirmed contract drifts 已收敛（audit 实测 schemas.ts 与 design.md §4 逐类型一致）
- [x] 行为/契约结果已达成（audit 实测 Failure Paths 5 场景断言齐全且全绿）
- [x] 必要 focused verification 已完成（audit 实跑 core 36/36 + renderers 10/10；typecheck/build/test/lint 39–71 task 全绿）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（audit 确认两处 scope 调整记录诚实、理由成立）
- [x] 受影响的 owner docs 已同步到 live baseline（design.md §4.2 已回写；其余无 owner-doc 改动需求）
- [x] roadmap P1 状态回写（两处同步）：Phase Status 区 `P1. 基础设施搭建` 行 + Work Items 表 P1.1–P1.4 四行——`planned` → `done`（closure audit 通过后）
- [x] `docs/logs/` 已记录 P1 收口（docs/logs/2026/09-06.md）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（agent_b0eb0613-ea7f-46f4-ae8a-0c11f3751c4a）
- [x] `pnpm typecheck`（39/39）
- [x] `pnpm build`（39/39）
- [x] `pnpm lint`（turbo lint 39/39；根 lint 链仅败于基线既有 check:i18n-keys，与主工作树命中逐条一致，零新增）
- [x] `pnpm test`（71/71）
- [x] `pnpm check`（零新增红项：15 门禁中 14 项 exit 0，check:i18n-keys 为基线既有红且命中清单与主工作树 diff 为空）

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

（暂无）

## Closure

Status Note: 2026-09-06 收口。P1.1–P1.4 全部落地：flux-print-core（schemas/unit/validate/bind）+ flux-print-renderers（骨架/默认值工厂/九类型渲染件注册表）+ workspace 三处注册；全仓验证全绿（test 71/71、typecheck/build/lint 39-39/39-39/71 task），check 仅剩基线既有 check:i18n-keys（与主工作树命中 diff 为空，零新增）。独立子 agent closure audit 提出 3 处计划文本不一致（未勾选项与 completed 状态矛盾、jsbarcode 陈旧措辞），已当场修复并获审计员条件性通过。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_b0eb0613-ea7f-46f4-ae8a-0c11f3751c4a）
- Evidence: 审计报告 7 项核对——交付物存在性与 design.md §4 契约逐类型一致 PASS；三处注册与 lockfile PASS；实跑两包测试 36/36 + 10/10 且 Failure Paths 5 场景断言属实、bind 真实调用 flux-formula PASS；全仓验证复跑（typecheck/build/test/lint + 15 check 门禁逐个 exit code + i18n 命中与主工作树 byte-identical）PASS；执行期裁定诚实性 PASS；文本一致性 3 处缺陷（已修复）；roadmap 状态自洽 PASS。记录同步至 docs/logs/2026/09-06.md。

Follow-up:

- no remaining plan-owned work（P2–P4 由后续 plan 承接；check:i18n-keys 基线既有红建议维护者裁定登记，非本 plan 债务）
