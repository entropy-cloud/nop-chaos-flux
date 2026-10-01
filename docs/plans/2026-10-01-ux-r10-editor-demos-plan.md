# UX-R10 编辑器演示页治理（Word / Code / SCADA / Dashboard 杂项）

> Plan Status: completed（closure audit approved）
> Last Reviewed: 2026-10-01
> Source: `docs/analysis/2026-10-01-playground-designer-ux-audit.md`（WD-1/2、CE-1、SC-1/2/3/4、DB-3/4、OP-2、G-3/G-4 各页落地）、`docs/analysis/2026-10-01-playground-designer-ux-roadmap.md` R10（含 PD-5 归属）
> Related: `apps/playground/src/pages/word-editor-page.tsx`、`code-editor-page.tsx`、`scada-editor-demo.tsx`、`dashboard-demo.tsx`；`packages/word-editor-renderers/`、`packages/flux-renderers-industrial/`、`packages/flux-code-editor/`、`packages/flux-renderers-form/`、`apps/playground/src/complex-pages/`

## Purpose

把剩余编辑器演示页从"空内容/开发文案上墙/混排"治理为"每页打开即有代表性内容、无开发态文案上墙、数字可读"，并完成 R1-R10 队列收尾。

## Current Baseline

> R1 修订：独立 review 对原始 Baseline 做了逐条核实，SC-3 诊断纠正、部分修复定位从 demo 页下沉到 owner 包。以下为已核实版本。

- **WD-1**：word-editor-page.tsx（61 行薄壳，`generator: 'default'`）无 documentSource → 走 `packages/word-editor-renderers/src/editor-canvas.tsx:95` 的默认种子 `main: [{ value: 'Hello World' }]`，无多级标题，大纲必然空。文本两侧孤立"└"角标疑似空表格边框渲染残留——包源码 grep 无该字面量，属渲染期产物，执行期探针定位。
- **WD-2**：大纲空态渲染两条语义冗余文案（`outline-panel.tsx:201-210`：`flux.wordEditor.noHeadings`"未找到标题" + `addHeadingsHint`"添加标题后会在此显示"，字符串在 `packages/flux-i18n/src/locales/zh-CN.ts:1139-1140`），审计观感为"重复两遍"。WD-1 充实内容后空态仅在清空文档时出现，治理目标是去冗余。
- **CE-1**：code-editor-page.tsx（379 行）**特性演示编辑器打开为空**（readOnlyCode 有值、colorize 三处经 form data 有值，其余为空）；schema 已配置 `lineNumbers: true` 与 `editorTheme: 'dark'`（code-editor-page.tsx:133/167/256/267/278/286/319），renderer 亦实现（`packages/flux-code-editor/src/code-editor-renderer.tsx:107-108`）——审计"无行号/主题展示"是否为渲染缺陷待执行期核验裁定，不得按审计原文盲改。SQL Editor schema 已设 `height: 300`（code-editor-page.tsx:132）但审计观察到塌陷单行——同样需先裁定 renderer 缺陷 vs 审计误读。
- **SC-1**：工具栏双排纯文本按钮三套风格并存——主工具栏与图元库在 owner 包 `packages/flux-renderers-industrial/src/editor/toolbox/toolbox-panel.tsx`（如 :194）与 `packages/flux-renderers-industrial/src/editor/palette/editor-palette.tsx`；demo 页仅持有 schema 内按钮组（scada-editor-demo.tsx:84-160）。
- **SC-2**：图元库纯文字列表无缩略图（`editor-palette.tsx`）。
- **SC-3（R1 纠正）**：审计原判"LIVE 蓝块疑似调试残留"**不成立**——`scada-editor-demo.tsx:47-56` 的 `demo-live-text` 是 live 数据绑定演示（`scada-text` 绑定变量 `tank_level`，`bindings.text.format: '%d'`），页头文案与 `previewMock`（:170）均围绕它构建。SC-3 的真实问题收敛为：G-4 开发说明段上墙 + 画布演示内容稀疏。**裁定规则：绑定演示保留并按产品化口径断言（元素存在且渲染绑定值），不删除。**
- **SC-4 待复核**：图元库 CUA 拖拽无响应（HTML5 DnD vs 合成事件——审计 DB-3 同类工具链限制，真实浏览器拖拽归人工复核，见 Non-Blocking Follow-ups）。
- **DB-4**：dashboard-demo.tsx（Dashboard Editor 演示页）页头大段开发说明（G-4，"WorkbenchShell 三段式外壳…"）+ 通栏巨型蓝色"← Back to Home"按钮；KPI 数值无千分位。
- **OP-2**：运营大屏 = complex-pages `dashboard` 路由（`apps/playground/src/complex-pages/complex-pages-model.ts:165-172`，schema `page-schemas/dashboard.json`，mock 数据 `shared/showcase-env.ts` Dashboard\_\_summary ~:405-419）：KPI "104663.7" 无千分位（testid `dash-stat-total/today/active/pending/revenue/growth`）；"今日订单 0"——`todayOrders` 按当天时间戳过滤 mock orders 而种子数据无当日订单，削弱演示感；页头实现标签 chip（G-4）。
- **G-4 各页**：开发态说明文案直接作为页面内容（SCADA 顶部 ~300 字、Dashboard Editor 同类、运营大屏实现标签）。
- **PD-5**（自 R5 归入）：开发者在 inspector 看到的英文运行时说明——实体在 `packages/flux-renderers-form/src/renderers/form-definition.ts:112-125`（"Status Path"/"Values Path" displayName + "Dynamic rerouting is supported and recreates the form owner…" description，inspector 直显）；另 FieldSet 缺 `propContracts`（`packages/flux-renderers-form/src/renderers/fieldset.tsx` 无该字段）导致 inspector 落到原始 JSON 编辑兜底（`packages/page-designer-renderers/src/inspector-field-model.ts:42`）。

## Goals

- Word：演示文档预置多级标题+段落（触发大纲）；角标残缺消除；大纲空态去冗余。
- Code：特性演示编辑器预置代表性示例代码（展示 CodeMirror 特性）；SQL 高度与行号/主题按核验结论修复或改判。
- SCADA：G-4 开发说明下墙（收进折叠说明或删除）；live 绑定演示按产品化口径保留并断言；工具栏分组容器化（图标化归 follow-up，先治理层级）；图元库缩略图（形状预览，可行性执行期核实）。
- Dashboard Editor / 运营大屏：G-4 文案下墙；巨型返回按钮收敛为常规头部；KPI 千分位；运营大屏"今日订单"种子修复。
- PD-5：form-definition 英文 description 治理（i18n 化或精简为产品语言）；FieldSet propContracts 补齐裁定（补合同或登记改判）。
- 每页 e2e 程序化断言（文本/DOM/computed style），截图仅旁证。

## Non-Goals

- SC-4 / DB-3 真实浏览器 DnD 复核（人工 QA 项，非自动化可达）。
- SCADA 图元库完整图标体系（缩略图为形状级预览）。
- G-3 全面中英统一（随各页触达的文案顺带治理，全局审计归收敛复审计）。
- 修改 flux-i18n 既有 key 的语义（仅新增/调整演示层文案）。

## Scope

### In Scope

- `apps/playground/src/pages/word-editor-page.tsx` + `packages/word-editor-renderers/`（editor-canvas 种子、outline-panel 空态、角标渲染残留）
- `apps/playground/src/pages/code-editor-page.tsx` + `packages/flux-code-editor/`（SQL 高度/行号/主题按核验结论）
- `apps/playground/src/pages/scada-editor-demo.tsx` + `packages/flux-renderers-industrial/src/editor/`（toolbox-panel、editor-palette）
- `apps/playground/src/pages/dashboard-demo.tsx`
- 运营大屏：`apps/playground/src/complex-pages/`（`complex-pages-model.ts`、`page-schemas/dashboard.json`、`shared/showcase-env.ts`）
- PD-5：`packages/flux-renderers-form/src/renderers/form-definition.ts`、`packages/flux-renderers-form/src/renderers/fieldset.tsx`（propContracts 裁定）、`packages/page-designer-renderers/src/inspector-field-model.ts`（兜底逻辑仅在裁定需要时触达）
- e2e/探针断言

### Out Of Scope

- SC-4 / DB-3 人工复核、SCADA 图标体系、G-3 全局审计

## Failure Paths

> R1 修订：原 sc3 行基于误诊已重写；补齐 OP-2/WD-2/角标/SC-1/SC-2 断言，消灭"无程序化验证"的在册修复项。

| 可测场景编号       | 触发                         | 行为                                                                                                  | 可重试 | 用户可见表现             |
| ------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------- | ------ | ------------------------ |
| wd1-content        | 打开 word demo               | 文档含多级标题与段落（大纲面板出现条目）；页面文本无孤立"└"残角（textContent 断言）                   | 否     | 打开即有内容、无残缺角标 |
| wd2-outline-empty  | 大纲空态（清空文档或空档）   | 空态仅一条提示行（两条语义冗余文案收敛为一条）                                                        | 否     | 空态不再重复             |
| ce1-samples        | 打开 code demo               | 特性演示编辑器内容非空（容器文本断言）；SQL 编辑器高度 ≥ 阈值（boundingBox）；行号/主题按核验结论呈现 | 否     | 特性橱窗成立             |
| sc3-productized    | 打开 scada-editor            | G-4 开发说明段文本不存在（文本断言）；live 绑定文本元素存在且渲染绑定格式值（非静态残块）             | 否     | 无开发文案，绑定演示在位 |
| sc1-toolbar-groups | 打开 scada-editor            | 工具栏按钮按组容器组织（组容器 DOM 断言）                                                             | 否     | 工具栏层级清晰           |
| sc2-palette-thumb  | 打开 scada-editor            | 图元库条目含形状预览元素（每条目预览节点 DOM 断言；可行性核验后落地或改判登记）                       | 否     | 图元可辨识               |
| db4-editor-clean   | 打开 dashboard-demo          | 开发说明段文本不存在；返回控件收敛（无通栏巨型按钮，boundingBox 高度阈值）                            | 否     | 页头产品化               |
| db4-kpi-format     | 打开 dashboard-demo          | KPI 数值含千分位（stat-tile 文本断言）                                                                | 否     | 数字可读                 |
| op2-kpi-format     | 打开运营大屏路由             | `dash-stat-*` 数值含千分位（文本断言）；"今日订单" > 0（种子修复）；页头无实现标签 chip（文本断言）   | 否     | 大屏数字可读、页头产品化 |
| pd5-inspector-copy | 打开 page-designer inspector | form-definition 字段 description 无英文运行时长句（"Dynamic rerouting…"文本断言不存在）               | 否     | inspector 文案产品化     |

## Test Strategy

档位选择：`必须自动化`

Failure Paths 全表均可程序化（Playwright 文本/DOM/boundingBox 断言，先红后绿）；视觉形态以探针截图旁证 + DOM 断言为主，截图不作为测试证明。

## Execution Plan

### Phase 1 - Word + Code 内容充实

Status: completed
Targets: `apps/playground/src/pages/word-editor-page.tsx`、`packages/word-editor-renderers/`（editor-canvas.tsx、panels/outline-panel.tsx）、`packages/flux-i18n/src/locales/zh-CN.ts`（如需新 key）、`apps/playground/src/pages/code-editor-page.tsx`、`packages/flux-code-editor/`

- Item Types: `Proof`, `Fix`

- [x] wd1/wd2 用例先红 → Word 演示文档预置多级标题+段落（demo 层 `initialDocument` 种子，包默认种子未动）；"└"角标探针定位为 canvas-editor `marginIndicator` 上游标准页边角标（裁定：保留，与官方演示一致，非缺陷）；大纲空态双行收敛为单行（outline-panel 渲染层，i18n key 未动）
- [x] ce1 用例先红 → 各特性演示编辑器预置示例代码（form data 通道；static value 在有 name 时不参与绑定——readOnlyCode 空内容根因即此，已迁移）；SQL 高度与行号/主题核验裁定：**审计误读**（运行时 300/400px 精确生效、lineNumbers 渲染、data-theme=dark 生效，探针+截图为证）
- [x] playground 套件全绿

Exit Criteria:

- [x] wd1/wd2/ce1 用例先红后绿
- [x] 核验裁定结论记录在案（角标=marginIndicator 上游标准；SQL 高度/行号/主题=审计误读；readOnlyCode=静态 value 绑定规则误用）
- [x] 套件全绿（editor-demos-ux-r10 e2e 3 绿 + word-editor-renderers 165 绿）

### Phase 2 - SCADA + Dashboard/大屏治理

Status: completed
Targets: `apps/playground/src/pages/scada-editor-demo.tsx`、`packages/flux-renderers-industrial/src/editor/toolbox/toolbox-panel.tsx`、`packages/flux-renderers-industrial/src/editor/palette/editor-palette.tsx`、`apps/playground/src/pages/dashboard-demo.tsx`、`apps/playground/src/complex-pages/`（dashboard.json、showcase-env.ts）

- Item Types: `Proof`, `Fix`

- [x] sc3 用例先红 → G-4 开发说明收进 `<details>` 折叠说明；live 绑定演示按产品化口径保留（静态文本 "LIVE"→ 绑定初值格式化 "60"，消除调试字样观感），断言=导出往返含 tank_level 绑定 + preview 态 statusBar 模式翻转（画布符号绘制于 canvas 无 DOM 文本，探针实证后按可执行证明面落地）
- [x] SC-1：工具栏分组容器化——8 组 ButtonGroup 各包 `data-slot="scada-editor-toolbox-group"` 有界容器（描边圆角盒），7 个裸 Separator 退场；flex-wrap 契约规则保持不变（既有 wrap-contract 测试全绿）
- [x] SC-2：图元库形状级缩略图——新增 `symbol-thumbnail.tsx`（24 内置图元 type 后缀→SVG 形状映射 + category 兜底），每条目 `data-slot="scada-palette-thumb"`；可行性裁定：leafer create() 微实例过重，SVG 形状级为落地形态（完整图标体系仍归 follow-up）
- [x] db4/op2 用例先红 → Dashboard Editor G-4 收进折叠 + 巨型返回按钮 `w-fit self-start` 收敛 + 两张 stat-tile 启用既有 `formatter.thousands`；运营大屏 revenue 走 `revenueLabel` 成品串、最后一单种子落今天（今日订单不再恒 0）、实现标签 chips 与描述改产品语言
- [x] playground 套件全绿（editor-demos-ux-r10 9 绿；flux-renderers-industrial 1611 绿；dashboard-demo 修复后 4 绿）

Exit Criteria:

- [x] sc3/sc1/sc2/db4/op2 断言先红后绿
- [x] 套件全绿
- [x] 执行期发现并修复 2 项前序遗留红：①dashboard-demo A1 spec 期望表停留在 R1 前旧默认（table-orders 6 列 vs 现行 12 列通栏，差恰 252px）——按现行默认勘误；②scada-editor-plan522 spec 钉旧静态文本 'LIVE'——按 SC-3 产品化值 '60' 更新（closure audit r1 分类核对后与 daily log 对齐为 2 项）

### Phase 3 - PD-5 文案治理与收尾

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/form-definition.ts`、`packages/flux-renderers-form/src/renderers/fieldset.tsx`（propContracts 裁定）

- Item Types: `Fix`

- [x] PD-5：form-definition statusPath/valuesPath description 治理——运行时机制长句（"Dynamic rerouting … replacement disposal"）改产品语言（scope 发布语义一句话）；执行期探针修正断言域（description 渲染在字段容器的兄弟节点上，首版断言域过窄空绿，已改正为 inspector 面板全域文本 + 新文案正向断言，真实先红后绿）
- [x] FieldSet propContracts 缺失裁定：**补齐**（7 键与既有 fields: 元数据 1:1，body 为 region 键不入契约）——inspector 从原始 JSON 直编升级为结构化字段编辑面；fields: 元数据保留（contract-honesty 事件键检查仍消费）
- [x] 套件全绿 + 每页探针截图旁证入档（word/code/scada/ops 共 4 张 + pd5 探针）

Exit Criteria:

- [x] pd5 断言绿 + propContracts 裁定结论记录在案（补齐）
- [x] 套件全绿（editor-demos-ux-r10 11 绿 + flux-renderers-form 943 绿 + page-designer-renderers 147 绿）

## Draft Review Record

- Reviewer / Agent: 独立子 agent review（fresh session，对 live repo 逐条核实 Baseline）
- Verdict: pass-with-minors（R2 复审，4 项非阻塞顾问已吸收，准予 active）
- Rounds: 2
- Round 1（CHANGES_REQUESTED，7 项全文吸收）：
  - Blocker：sc3-no-debug-block 建立在误诊上（LIVE 块实为 tank_level 绑定演示）→ Baseline 纠正 + 裁定规则"绑定演示保留、按产品化口径断言"，failure path 重写为 sc3-productized
  - Major：In Scope/Phase Targets 缺包级路径（word-editor-renderers、flux-renderers-industrial、flux-renderers-form、flux-code-editor、complex-pages 具体文件）→ 全部补齐
  - Major：DB-3 ownership 孤儿 → 并入 Non-Blocking Follow-ups（与 SC-4 同类人工复核）
  - Major："必须自动化"档位下 6 个在册修复项无程序化验证 → Failure Paths 补 wd2/sc1/sc2/db4-editor-clean/op2/pd5 行
  - Minor：CE-1 表述过强（readOnlyCode/colorize 有值；行号/主题 schema+renderer 已实现）→ Baseline 改为"执行期核验裁定，不得盲改"
  - Minor：WD-2 非同一句重复而是两条语义冗余文案 → Baseline 措辞修正
  - Minor：OP-2 "今日订单 0" 子项被静默丢弃 → 纳入 Phase 2（showcase-env 种子修复）
  - 顾问吸收：运营大屏具体文件名入 In Scope；角标保留"执行期探针定位"hedge（包源码无该字面量）；Phase 3 改 form-definition.ts 属 renderer 定义元数据，owner-doc 裁定时核查 quick-reference.md 是否引用相关字符串
- Round 2（pass-with-minors，执行顾问）：
  - sc3-productized 断言前须切 Preview（testid `editor-mode-preview`）——edit 态绑定文本渲染静态占位 "LIVE"；pd5 断言前须在画布选中 Form 节点（Status/Values Path 字段仅选中后出现）
  - db4-editor-clean 的返回控件收敛目标 = schema 渲染的顶部按钮（dashboard-demo.tsx:158-163，审计的通栏巨型按钮）；页面底部 host `Button`（:236-238）为常规尺寸，高度阈值不得误伤
  - WD-2 去冗余在 outline-panel.tsx 渲染层收敛为单行，flux-i18n 既有 key 不动（与 Non-Goal 一致）
  - owner-doc 核查已预核实：quick-reference.md:309-310 仅引用 statusPath?/valuesPath? 字段名（保留），不引用 description 散文；`docs/references/audit-rules/status-path-publication-cleanup.md` 约束发布语义非展示文案——PD-5 措辞修复无规则冲突

## Closure Gates

- [x] Phase 1/2/3 全部 completed 且 Exit Criteria 全勾
- [x] 新增失败路径测试存在且通过（先红后绿记录在 daily log：editor-demos-ux-r10 11 用例 + outline-panel wd2 组件测试）
- [x] 浏览器/e2e 实测证据存档（`_tmp/ux-r10-evidence/`：word/code/scada/ops/pd5 探针截图）
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`（42/42）
- [x] `pnpm lint`（42/42）
- [x] `pnpm test`（78/78 tasks）
- [x] `pnpm check`（exit 0；knip 新增 1 项已修：SymbolThumbnailProps unexport）
- [x] owner doc 同步裁定：demo 层改动为主；PD-5 触及 form-definition 定义元数据——预核实 `docs/references/quick-reference.md:309-310` 仅引用 statusPath?/valuesPath? 字段名（保留未动），`docs/references/audit-rules/status-path-publication-cleanup.md` 约束发布语义非展示文案——**No owner-doc update required**
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（VERDICT: approved，verdict 送达后回填）

## Non-Blocking Follow-ups

- SC-4 / DB-3 真实浏览器 DnD 人工复核（同属工具链限制，合并跟踪）
- SCADA 图元库完整图标体系
- G-3 全局中英统一收敛复审计

## Closure

Status Note: 三阶段全部落地（Word/Code 内容充实、SCADA/大屏治理、PD-5 文案与契约），full-green verification（typecheck/build/lint 42、pnpm test 78 tasks、check exit 0、editor-demos-ux-r10 e2e 11 + 回归 spec 全过、industrial 1611 / form 943 / page-designer 147 / word-editor 165）。执行期修复 2 项前序遗留红（dashboard-demo A1 陈旧期望、plan522 'LIVE' 钉死断言）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent closure audit（fresh session，输入= plan + live diff + 复跑验证；read-only）
- Verdict: **approved**（0 Blocker / 0 Major / 3 Minor，均已在 verdict 送达后修复）
- 审计复跑证据：editor-demos-ux-r10 e2e 11 passed；dashboard-demo + plan522 9 passed；vitest word-editor 165 / industrial 134 files 1611 / form 112 files 943 / page-designer 20 files 147；typecheck 42/42——全部与 plan/log 记录逐位一致
- C 项逐条代码核对：全部 confirmed（含 marginIndicator 上游佐证、quick-reference.md 字段名核查、\_tmp/ux-r10-evidence/ 存档）
- 3 Minor（已修）：①toolbox-panel.tsx prettier 格式损伤（已 prettier --write）；②daily log e2e 枚举多计 wd2（已更正）；③plan/log 遗留红计数 1 vs 2 分类漂移（已对齐为 2 项）
- 顾问（非阻塞）：op2 今日订单断言口径 adequate；fieldset 新契约英文文案归 G-3 全局 follow-up；build/test 全量未由 auditor 复跑（以受影响包全部复跑覆盖）
