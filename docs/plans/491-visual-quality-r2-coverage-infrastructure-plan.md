# 491 视觉质量二期覆盖基建（R2-0：清单程序化枚举、覆盖台账与对账、截图矩阵与证据卡）

> Plan Status: completed
> Last Reviewed: 2026-09-23
> Source: `docs/backlog/visual-quality-r2-roadmap.md`（R2-0 work item，本 plan 为其 owner plan）、`docs/skills/visual-page-quality-inspection-prompt.md`（走查口径）、`docs/logs/2026/09-23.md`（执行队列启动）
> Related: `docs/plans/490-design-system-overlay-size-and-surface-rhythm-plan.md`（R2-3a，已 completed）

## Purpose

为 R2 全量走查建四件套基建：①页面/控件清单**程序化枚举**（带再生成命令，禁止手抄）；②覆盖台账（逐项状态机 `pending → carded → digested → verified`）与对账命令（uncovered 计数）；③evidence card 模板；④截图矩阵 runner。并完成控件批次划分裁定（R2-2a–c 分组 + 复杂控件全矩阵/简化矩阵阈值规则）。本 plan **不做任何产品代码修改**、不产出任何走查 findings（那是 R2-1/R2-2 批的事）。

## Current Baseline（2026-09-23 live 实测）

- 页面枚举源：`apps/playground/src/route-model.ts` 聚合 8 个 route-entry 文件（basic 18 + form 41 + data 14 + layout 8 + content 20 + mobile 5 + ai 14 + scheduling 4 = **124 条 lab 路由**）+ `domain-route-entries.ts`（**78 条 domain 路由**，grep `id: ' 计 78）+ `complex-pages-model.ts`（showcase-page 注册，条目数以枚举为准）+ home/lab/showcase 3 条索引路由。`apps/playground/src/route-matrix.test.ts` 已验证"lab 路由 ↔ live renderer definitions"双向覆盖（lab 124 条中 basic/form/form-advanced/data 三个路由域按 4 个 definitions 数组计、layout/content/mobile/ai/scheduling 五域按路由数组计，另有 convention-only 路由 dashboard-filter 一条无对应 definition）。
- 控件枚举源（2026-09-23 逐包核实导出面）：`basicRendererDefinitions`、`formRendererDefinitions`（date 族已折入其中）、`formAdvancedRendererDefinitions`（form-advanced 包根导出；`allFormDefs` 是 test-support 私有 const，不作源）、`dataRendererDefinitions`、`layoutRendererDefinitions`、`contentRendererDefinitions`、`mobileRendererDefinitions`、`aiRendererDefinitions`、`schedulingRendererDefinitions`（模块导出但**包根未 re-export**——枚举器经相对源路径深导入，不改产品代码）、`industrialRendererDefinitions` + `industrialEditorRendererDefinitions`（经 `/editor` subpath）、`threeCanvasRendererDefinition`（3d，单数）、`wordEditorRendererDefinitions`、`spreadsheetRendererDefinitions`、`flowDesignerRendererDefinitions`、`graphRendererDefinitions`、`mapRendererDefinitions`、`pivotRendererDefinitions`、`dashboardRendererDefinition` + `dashboardEditorRendererDefinition`。**`flux-print-renderers` 无任何 flux `RendererDefinition[]`**（其 `PRINT_ELEMENT_RENDERERS` 形状不同）——裁定 print 控件域贡献为零，print 面由 R2-1b 的 print-designer 设计器页覆盖。控件总数待枚举（预估 130–170）。
- TS 模块可执行性：定义数组与路由模型是 TS + `.js` 后缀 ESM 导入，普通 node 不能直接 import；但 vitest（vite-node 解析）+ `vite.workspace-alias.ts` 工作区别名已可解析——`route-matrix.test.ts` 即为例证。`vitest.scripts.config.ts`（`test:scripts`）提供 scripts 域测试的既有载体。
- 截图工具链：Playwright 1.63 + playground dev server（4175，hash 路由）；一期 V0 交付的 `tests/e2e/helpers/` 计算样式断言 helper 与 replica 截图存档惯例可直接复用；探针脚本临时落 `_tmp/`（AGENTS.md 快照政策）。
- 覆盖台账：**不存在**（一期从未做页面级/控件级渲染面走查，无任何覆盖台账）——本 plan 从零建立。
- R2-3a（plan 490）已 completed：弹层阶梯/解剖学/块距/门禁已落地，走查批看到的是收敛后的渲染面。

## Goals

- `pnpm visual:inventory` 一条命令从 live 路由模型 + live renderer definitions 再生成全量清单（`docs/audits/visual-quality-r2/inventory/`），清单含批次归属（R2-1a–d / R2-2a–c），新增页面/控件随再生成自动扩面。
- `docs/audits/visual-quality-r2/ledger.md` 覆盖台账建立：每个页面/控件条目携带状态机字段；再生成采用**合并语义**（新条目 → pending，已有条目保留状态，消失条目标记 orphan），台账永不因再生成丢失走查进度。
- `pnpm visual:reconcile` 对账命令：inventory ∖ ledger = uncovered（结构性缺失，exit 1）、ledger ∖ inventory = orphan、四状态计数输出——R2-5 的 uncovered=0 验收以本命令为准。
- evidence card 模板 + 截图矩阵 runner（双主题 × 双视口批量截图落 `_tmp/visual-inspection-*/`，支持显式交互态注册表）就位，R2-1a 开工即用。

## Non-Goals

- 不执行任何走查、不产出任何 findings、不修任何产品缺陷（R2-1/R2-2/R2-4 的范围）。
- 不把对账命令接入 `pnpm check` fail-fast 链（R2 期间 pending 是合法状态；R2-5 验收时按 roadmap 门槛解读输出，是否固化进 check 链由 R2-5 裁定）。
- 不做 product code 修改（ui/渲染器/样式零改动）；不含 plan 490 复检范围外的视觉修复。
- 不为截图矩阵跑一次全量页面（那是 R2-1/R2-2 批的执行动作）；本 plan 只交付 runner 本身 + 冒烟验证（少量页面抽样）。

## Scope

### In Scope

- `scripts/visual-quality/`：`vitest.inventory.config.ts`、`generate-visual-inventory.test.ts`（枚举器）、`reconcile-coverage.mjs`（对账）、`capture-visual-matrix.mjs`（截图 runner）、`interactions.mjs`（交互态注册表，初始含 R2-1a 域页面）。
- 根 `package.json`：新增 `visual:inventory`、`visual:reconcile`、`visual:capture` 三个命令。
- `docs/audits/visual-quality-r2/`：`inventory/pages.json`、`inventory/controls.json`、`ledger.md`、`evidence-card-template.md`、`README.md`（目录角色 + 命令用法）。
- 复杂控件裁定规则：复杂度属性表（拖拽/画布/弹层编辑/视图切换/异步加载/行内编辑六属性，≥3 即全矩阵）+ 逐控件归类落 inventory。
- roadmap 回写：R2-0 → done（closure audit 通过后）。

### Out Of Scope

- `tests/e2e/` 既有 spec 的任何改动；`pnpm check` 链变更。
- 各 demo/replica 页面的 schema/content 修改。
- findings 台账结构（归族台账是 R2-1a closure 时按首批归族结果建，本 plan 只建覆盖台账）。

## Failure Paths

| 可测场景编号       | 触发                                                  | 行为                                                                         | 可重试                | 用户可见表现                   |
| ------------------ | ----------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------- | ------------------------------ |
| inv-unresolvable   | 枚举器 import 的定义数组导出名不存在（包重构）        | `pnpm visual:inventory` 报错退出并列出缺失导出名                             | 是（修枚举器 import） | 命令行错误输出                 |
| ledger-orphan      | 台账条目在最新 inventory 中不存在（页面/控件删除）    | reconcile 列出 orphan 并 exit 1；orphan 条目保留在台账标 `orphan` 供人工裁决 | 是                    | 命令行 orphan 清单             |
| capture-route-dead | runner 打开的 hash 路由渲染为 home（路由不存在/白屏） | 截图仍产出但 runner 输出 `suspect` 清单（DOM 指纹不符预期）                  | 是                    | `_tmp/` 下 capture-report.json |

## Test Strategy

档位选择：**必须自动化**

理由：枚举器与对账命令本身就是自动化验证工具（工具的自证即测试）。Proof 项：枚举器断言清单规模与 route-matrix.test.ts 的 liveTotal 口径一致（124 lab + 78 domain + showcase N + 索引 3）；reconcile 对 fixture 台账的 uncovered/orphan 判定单测（先于 ledger 落地写）。

## Execution Plan

### Phase 1 - 清单程序化枚举器

Status: completed
Targets: `scripts/visual-quality/vitest.inventory.config.ts`、`scripts/visual-quality/generate-visual-inventory.test.ts`、`package.json`

- Item Types: `Fix | Proof`

- [x] Fix：vitest.inventory.config.ts（happy-dom 环境 + workspacePackageAliases + leafer alias 桩 + canvas 全局 setup + include scripts/visual-quality），根 package.json 加 `visual:inventory` 命令
- [ ] Fix：枚举器——页面域：import route-model（124 lab + 78 domain + 3 索引）+ complex-pages-model（showcase-page N 条）；控件域：import 上述 20 个定义数组（18 包，print 已排除）（form-advanced 用包根 `formAdvancedRendererDefinitions`；scheduling 经相对源路径深导入；print 不导入、裁定为零贡献），提取 `type`/`sourcePackage`/`category`
- [x] Fix：批次归属规则落枚举器——页面：complex-pages 40 条 → R2-1a、设计器域 live id 10 条（含 dingtalk-flow-demo、scada-editor-demo；dashboard-editor 无 live 路由已在 README 说明）→ R2-1b、可视化与表格域 live id 13 条 → R2-1c、其余 58 条 → R2-1d；lab 124 条为 R2-2 carrier（walkPhase 标记，不占 R2-1 行）；控件：{basic, form, form-advanced}=59 → R2-2a、{data, content, layout, mobile}=46 → R2-2b、其余 34 → R2-2c
- [x] Proof：枚举器断言绿——lab=124 与 route-matrix liveTotal 口径互证；controls=139 每条带 sourcePackage；再生成幂等（md5 两次一致）；输出 `inventory/{pages,controls}.json`（Proof 排序说明：生成器无独立先红对象，先红由 Phase 2 reconcile 判定单测承接）

Exit Criteria:

- [x] `pnpm visual:inventory` 可重复执行，产出两份 JSON 清单且含批次字段；清单规模断言绿（245 页 = 124 carrier + 121 走查页；139 控件）
- [x] 清单零手抄：枚举器内仅批次域/包集合与复杂度属性表（裁定规则），无逐条 id 字面清单

### Phase 2 - 覆盖台账与对账命令

Status: completed
Targets: `scripts/visual-quality/reconcile-coverage.mjs`、`docs/audits/visual-quality-r2/ledger.md`、`package.json`

- Item Types: `Fix | Proof`

- [x] Proof：reconcile 的判定单测先写（scripts/**tests**/reconcile-coverage.test.ts，5 用例：闭合/ uncovered/orphan/进度信息性/行序不敏感）——fixture 台账场景：uncovered（inventory 有台账无）exit 1、orphan（台账有 inventory 无）列出并 exit 1、状态计数正确、全 verified 输出 uncovered=0
- [x] Fix：reconcile-coverage.mjs——解析 inventory JSON + ledger.md 表格行（carrier 页 walkPhase=R2-2-carrier 不计台账单元），输出 `{total, pending, carded, digested, verified, uncovered[], orphan[]}`；结构缺失 exit 1，纯状态进度（pending 多）不阻塞 exit code
- [x] Fix：ledger.md 初始化——由枚举器派生初始台账（全 pending；按批次分节表格：`| id | kind | batch | status | card | note |`），合并语义写入枚举器（再生成时保留已有行状态、新增行 pending、消失行标 orphan）。表格规约：单元格禁含管道符与换行（必要时 HTML 实体转义）；行序 = inventory 规范序，reconcile 对行序不敏感、按 id 匹配
- [x] Proof：`pnpm visual:reconcile` 对真实台账输出 uncovered=0（121 页 + 139 控件全 pending，结构闭合）；再生成→reconcile 幂等

Exit Criteria:

- [x] `pnpm visual:reconcile` 存在且判定单测绿（5/5）；真实台账 uncovered=0、orphan=0
- [x] ledger.md 每个条目与 inventory 一一对应（121 页 + 139 控件，计数相等），状态机字段齐备

### Phase 3 - 证据卡模板与截图矩阵 runner

Status: completed
Targets: `docs/audits/visual-quality-r2/evidence-card-template.md`、`scripts/visual-quality/capture-visual-matrix.mjs`、`scripts/visual-quality/interactions.mjs`、`package.json`

- Item Types: `Fix | Proof`

- [x] Fix：evidence-card-template.md——截图清单（状态矩阵勾选）+ A–H 维度勾选表 + 发现归族栏（systemic/local/watch-only 三态）+ 简化矩阵裁剪理由栏，对齐检查提示词发现条目格式（≥10 行/条）
- [x] Fix：capture-visual-matrix.mjs——参数 `--routes <id,...>|--batches <B,...> --themes light,dark --viewports 1280x800,800x900`；输出 `_tmp/visual-inspection-<本地日期>/` PNG + `capture-report.json`；route-dead suspect 检测 = home 精确 h1 签名（`<h1>Playground</h1>` 全仓唯一；初版 `nop-hero` 子串指纹因 lab 壳层复用同令牌误报全部 carrier 页，closure audit B1 退回后改 DOM 精确匹配）；未知 id/空批次守卫 exit 1（audit M2）；dev server 生命周期——4175 已有服务则复用，否则 runner 自行启动并仅清理自己启动的进程；交互态经 interactions.mjs 显式注册表驱动，初始登记 R2-1a 域真实 id（antdpro-list/airtable-grid/linear-board/sundial-workbench/notion-database 等；初版 antdpro/airtable/sundial 键为死配置，audit M1 退回后更正）
- [x] Proof：runner 冒烟——home/flow-designer/antdpro-list/lab-button 四页双主题双视口产出 28 张截图（含 flow-designer JSON 面板与 antdpro-list 的 interaction 态；lab-button 为 R2-2 carrier 抽样）+ report 0 suspect；`_tmp/` 落点经 git check-ignore 核实。（首轮冒烟曾误报 16 张/3 页且 `antdpro` 非 inventory id 静默 0 选择——closure audit M2 退回后补空选择守卫并以合法 id 按实数重跑）

Exit Criteria:

- [x] `pnpm visual:capture --routes ...` 可用，冒烟截图 + report 落 `_tmp/`；模板文件就位且字段与检查提示词口径一致
- [x] runner 不写入 `tests/e2e/artifacts/`、不产生任何 tracked 文件

### Phase 4 - 批次划分裁定与 roadmap 回写

Status: completed
Targets: `docs/audits/visual-quality-r2/inventory/*.json`、`docs/audits/visual-quality-r2/README.md`、`docs/backlog/visual-quality-r2-roadmap.md`

- Item Types: `Decision | Proof`

- [x] Decision：复杂控件裁定——六属性复杂度表（拖拽/画布/弹层编辑/视图切换/异步加载/行内编辑；≥3 属性 = 全矩阵控件），逐控件归类落 controls.json `matrix: full|simplified` 字段与裁定理由列；R2-2a–c 默认分组经枚举实数确认或调整（调整须在 README 裁定记录节说明）
- [x] Proof：批次覆盖互斥完备——每条 inventory 恰属一个批次、四批页面并集 = 全部页面、三批控件并集 = 全部控件（枚举器断言）
- [x] Fix：README.md（目录角色、命令用法、裁定记录）；roadmap R2-0 行回写（closure audit 通过后 `done`）

Exit Criteria:

- [x] controls.json 每条带 `matrix` 字段与理由（full 12 / simplified 127）；批次互斥完备断言绿
- [x] README 就位；roadmap R2-0 → done（closure audit 通过后回写）

## Closure Gates

- [x] `pnpm visual:inventory` / `pnpm visual:reconcile` / `pnpm visual:capture` 三命令可用且可重复执行
- [x] 清单程序化零手抄（枚举器无逐条 id 字面清单）+ 规模与 route-matrix 口径互证（124 lab / 78 domain / 40 showcase / 3 索引；139 控件）
- [x] 台账 uncovered=0、orphan=0、状态机与合并语义落地（再生成幂等 md5 一致）
- [x] 批次互斥完备 + 复杂控件裁定落字段（full 12 / simplified 127）
- [x] 证据卡模板 + 截图 runner 冒烟通过（28 captures / 0 suspects，截图仅 `_tmp/`）
- [x] 无任何 product code 修改（`git status` 仅 scripts/visual-quality、scripts/**tests**、docs/audits/visual-quality-r2、package.json、roadmap、docs/logs、plan 491）
- [x] 独立子 agent（fresh session）closure audit 完成并记录证据（见 Closure Audit Evidence）
- [x] `pnpm test:scripts`（84/84，含 reconcile 判定单测 5 用例）+ `pnpm visual:inventory`（4/4 自证）
- [x] `pnpm typecheck` / `pnpm lint` / `pnpm check`（全链 exit 0）；`pnpm build` exit 0

## Closure

Status Note: 四 Phase 全部 completed、Closure Gates 全勾（2026-09-23）。三命令基建（inventory/reconcile/capture）可用且幂等；清单 245 页 + 139 控件程序化枚举并与 route-matrix 口径互证；台账结构闭合（uncovered=0/orphan=0）；批次与复杂控件裁定落 README 与 inventory 字段。closure audit 首轮退回的三项（B1 suspect 指纹误报 carrier 页 / M1 interactions 死键 / M2 零选择静默+冒烟数字失实）已修复并经审计员 live 复验通过。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure auditor（fresh sub-agent session，两轮：首轮 verdict `issues`（1 Blocker / 2 Major）→ 退回修复 → 复验 `approved`（0B/0M））
- Evidence: 首轮发现 B1（capture runner 的 `nop-hero` 子串指纹把 lab 壳层误判为 home 回退，124 条 carrier 页全部被跳过）、M1（interactions.mjs 键非 inventory id，死配置）、M2（`antdpro` 非 inventory id 静默 0 选择 exit 0 + 冒烟数字失实）；修复后复验实测：lab-button 1 capture/0 suspect、四页冒烟 28 captures/0 suspects、未知 id exit 1、interactions 键全部精确匹配、ledger.md 三方 md5 一致、test:scripts 84/84、inventory 4/4。全程无 product code 变更混入。

Follow-up:

- 对账命令接入 `pnpm check` fail-fast（R2-5 验收时裁定，见 Non-Blocking Follow-ups）。
- interactions.mjs 注册表随 R2-1b–d / R2-2 批次扩面（各批 plan 范围；扩面时键必须用 inventory 精确 id）。

## Non-Blocking Follow-ups

- 对账命令接入 `pnpm check` fail-fast（R2-5 验收时裁定是否固化）。
- interactions.mjs 注册表随 R2-1b–d / R2-2 批次逐步扩面（各批 plan 的范围）。

## Draft Review Record

- Reviewer / Agent: 独立 draft reviewer（fresh sub-agent session，round 1）→ 同 reviewer 修订回送复审（round 2）
- Verdict: `pass-with-minors`（Round 2，0 Blocker / 0 Major，共识达成）
- Rounds: 2
- Findings addressed: Round 1（`revised`，2 Major / 9 Minor）——Major-1 控件枚举源漏 graph/map/pivot/dashboard 四包（R2-2c 范围冲突 + 并集断言同义反复假绿），已补入 Baseline 与 R2-2c 分组；Major-2 三处导出面失实（form-advanced 改包根 formAdvancedRendererDefinitions、scheduling 包根未 re-export 改相对源路径深导入、print 无 flux 定义裁定零贡献由 R2-1b print-designer 页覆盖），已逐项修订。Minor 9 条全落：Source 路径、test:scripts include 范围拆写、liveTotal 精确口径、date 双计消除、industrial/dashboard editor 定义计入裁定、dashboard-editor live id 差异说明、Phase 1 Proof 排序说明、runner dev server 生命周期、ledger 表格规约。Round 2 复审确认 2 Major 全消除、9 Minor 全落，残留 3 条计数/措辞级 notes 已当场更正（liveTotal 三域/四数组、20 数组/18 包计数标签、report-designer live id 以枚举实数落 README）。
