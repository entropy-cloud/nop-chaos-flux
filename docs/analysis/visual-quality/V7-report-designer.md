# V7 研究报告：Report Designer 视觉与结构

> 核查日期: 2026-09-21
> 基线: master @ 39a2f38ab（plan 476 / V6 spreadsheet 令牌化已收口，full-green）
> 输入: 路线图 `docs/backlog/visual-quality-roadmap.md` V7 行、普查报告 §5（Spreadsheet / Report Designer 域）、证据卡 `docs/audits/visual-quality/report-designer.md`、owner docs `docs/architecture/report-designer/design.md` 与 `codec-design.md`、`docs/architecture/report-designer/spreadsheet-canvas-css.md`、`docs/analysis/2026-09-12-hucre-vs-report-designer-comparison.md`
> 状态: 已独立核实通过（revised → 勘误回写后 pass）

## 0. 勘误与域定位

- **F2 性质勘误（重要）**：证据卡称 `TemplateCodecAdapter`「仅抛错占位（`adapters.ts:157-167`）」。核实：`adapters.ts:157-167` 是 `createUnsupportedTemplateCodecAdapter` 工厂（显式"不支持"占位，仅测试消费）；`TemplateCodecAdapter` 接口本体在 `adapters.ts:59-70`，且**注册表、core 注册口、命令链、host method、错误 i18n 全部就绪**——缺的只是生产 adapter（见 F2）。
- **F4 实质性勘误（重要）**：证据卡称「fallback 壳只渲染文本摘要（`fallbacks.tsx:57-71`）」。核实：`fallbacks.tsx` 描述属实，但该文件已是**死代码**——全仓 0 importer（不在 `index.ts` barrel、page-renderer/renderers 均不引用，见 F4）。实际降级行为是 invalid document 就地替换为空模板并渲染完整工作台，恰与 `design.md:191`「不能退化成仅有诊断文本的空壳」契约一致。
- **F5 部分过期**：「无 dark」已不再成立——plan 476 落地的 `tests/e2e/spreadsheet-visual-tokens.spec.ts:121-167` 已覆盖 report 画布 `--ss-*` dark 翻转（双路由断言）。
- **域定位**：4 包分层——`report-designer-core`（语义层 ~2.3k 行）、`report-designer-renderers`（外壳 ~3.6k 行，hucre 对比报告 §2.1 口径），画布复用 `spreadsheet-renderers`（`SpreadsheetGrid`/`SheetTabBar`/`useSpreadsheetInteractions`，`report-spreadsheet-canvas.tsx:8-14`， coupling 裁决注释 :7）。共用画布色板已被 V6 令牌化（`canvas-styles.css:5-48` light / `:50-97` dark，`--ss-*` 42 枚 × 双态）；**V7 的 dark 剩余面只在 report 自有 chrome（field-panel）**（见 F6，发现 3 个未定义令牌缺陷）。
- 30×10 硬编码在**生产 renderer 唯一一处**（`report-spreadsheet-canvas.tsx:26-27`），另在 playground demo 复写一份（`report-designer-demo.tsx:77-78`，非生产路径）。

## 1. Findings 逐项核实

### F1 画布 30 行×10 列硬编码（成立；截断 + 契约不一致双重影响）

- 位置：`report-spreadsheet-canvas.tsx:26-27` `const ROWS = 30; const COLS = 10;`。消费点：`:50-55`（`useSpreadsheetInteractions` config）与 `:250-254`（`SpreadsheetGrid rows/cols`）。该组件是 `report-designer-page` 的**默认画布**（`page-renderer.tsx:661-671`，无自定义 body 时挂载）。
- 影响 1（视觉截断）：`SpreadsheetGrid` 由 rows/cols 构建偏移与视口（`spreadsheet-grid.tsx:232-245`），可滚动区域恰为 30×10；键盘导航 clamp 到 `(rows-1, cols-1)`（`spreadsheet-grid.tsx:61-64`、`:166`、`:182-193`）。文档超过 30 行 / 10 列（J 列）的内容**不可见且键盘不可达**；上下文菜单插行可交互式地把内容推进 30 行外的不可见区（import 场景之外的日常编辑即可触发）。
- 影响 2（契约不一致）：spreadsheet-page 默认 host 已按「已用边界推导 + 最小基线」派生——`default-page-body.tsx:10-11`（`DEFAULT_ROWS = 100` / `DEFAULT_COLS = 26`）、`:13-41`（`resolveGridDimensions`：行/列索引 + cells + merges 求已用边界）、`:36-37`（`Math.max(DEFAULT, last+1, 1)`）。架构契约明文 `design.md:195`「grid 维度必须从 active sheet 的已用边界推导」，但 §5.2 report-designer-page 无对应基线条款——**report 画布未跟随已落地的派生模式**。
- 附带发现：`useSpreadsheetInteractions` 的 `rows`/`cols` 参数只有类型声明（`use-spreadsheet-interactions.ts:46-47`），实现只解构 `{ bridge, sheetId, onLog }`（`:145`）——**声明未消费**；真实消费全在 `SpreadsheetGrid` props。
- 测试：`report-spreadsheet-canvas.test.tsx` mock 了 SpreadsheetGrid，**无任何 rows/cols 断言**（grep 零命中）。
- 改造面：`resolveGridDimensions` 是 `default-page-body.tsx:13` 的模块私有函数——report 侧复用需 export 或提取共享 util；派生输入 `spreadsheetSnapshot.activeSheet` 画布已持有（`report-spreadsheet-canvas.tsx:41`）。

### F2 TemplateCodecAdapter：通路完备、缺生产 adapter（成立，性质修正后）

调用方/接口面清单（全量核实）：

- 接口：`adapters.ts:59-70`（`id` / `importDocument` / `exportDocument`）。
- 注册表：`adapters.ts:103-110`（`codecs: Map` :107）；`runtime/registry.ts:15` 构建、`:40` `getCodecId(profile)`。
- core 注册口：`core.ts:45`（`registerCodec` 契约）、`:501`（实现 `registry.codecs.set`）。
- 命令链：`runtime/codec-commands.ts:15-30` `resolveCodecAdapter`（无 codecId → `flux.reportDesigner.noCodecConfigured` :21；未注册 → `codecNotFound` :26，均已 i18n）；`:32-49` `importTemplateWithCodec`；`:51-69` `exportTemplateWithCodec`。
- host 面：`host-action-provider.ts:20-21` 声明 `importTemplate`/`exportTemplate` methods；profile.codecId 解析 `page-renderer.tsx:133`。
- 占位工厂：`adapters.ts:157-167`，barrel 导出 `index.ts:76`；**生产 0 调用**（仅测试）。
- live 表面：playground demo 无 profile/codec（`report-designer-demo.tsx` 零命中）；host-demo adapters 仅注册 preview（`report-designer-host-demo.tsx:134-136`）；默认工具栏无 import/export 按钮（`report-designer-toolbar-defaults.ts:3-42` 仅 undo/redo/preview/stop/save）。

结论：`report-designer:importTemplate/exportTemplate` 端到端就绪，但在所有 live 表面必然失败于 `noCodecConfigured`——是「有接口无实现」的**显式留白**，与 hucre 对比报告 §2.2/§4.1 判断一致。

hucre 引入利弊（引 2026-09-12 对比报告，本次未重新核查外部库）：利 = headless 文件引擎（XLSX/ODS/CSV 读写、样式超集、round-trip 字节级保留、0 deps 哲学一致、MIT），恰好填补二进制格式空白；弊 = 幼年项目（1.0 于 2026-08-04，13 版/5.5 月）、稠密行数组 ↔ A1 稀疏 map 需映射层、样式面有损映射、`engines: node>=24`（仅 Node 侧）、API 稳定性需锁精确版本。推荐形态 = 独立 codec 包或宿主 adapter 注册侧，**禁止进入 `spreadsheet-core`**（保 0-deps 边界，对比报告 §4.2）。

### F3 带区/分组头语义视觉（成立：零语义；唯一既有语义视觉是绑定指示）

- 文档模型无带区概念：`ReportTemplateDocument`（`report-designer-core/src/types.ts:49-56`）= spreadsheet + semantic；`ReportSemanticDocument`（`:34-41`）是 namespaced MetadataBag 平面（workbook/sheet/row/column/cell/range meta，语义由外部适配器解释，`design.md` §6.2）。4 包内 `band`/分组头/`expandType`/分页语义 **0 命中**（`types.ts:69` `expanded` 是字段面板组展开态，非报表语义）。
- 画布唯一既有语义视觉 = 字段绑定指示：`getCellMetadata`（`report-spreadsheet-canvas.tsx:148-155`，读 `semantic.cellMeta`）→ `table-shell.tsx:166-167` → `getBoundFieldLabel`（`:27-49`，`metadata.field` 字符串 / `.data.label` / `.fieldId` 三级兜底）→ `data-cell-bound` 属性（`:241`）+ `spreadsheet-bound-indicator` 角标（`:273`）+ CSS `canvas-styles.css:723-736`（`--ss-bound-bg`/`--ss-bound-outline`，:731 角标色 `--ss-accent-strong`；V6 已令牌化 + dark :31-32/:80-81）。demo drop patch 写 `field:{type,sourceId,fieldId,label}`（`report-designer-demo.tsx:67-74`，label 走 fieldId 兜底分支）。
- 行级语义通道缺失：grid 只有 cell 级 `getCellMetadata` 钩子（`table-shell.tsx:166`），无 row 级 metadata 通道——「行带区」视觉需给 spreadsheet-renderers 新增跨包 prop。
- 最小实现切口评估：(a) 元数据约定键（如 cellMeta/rowMeta `band`）+ 渲染端 `data-cell-band` → 令牌化样式，渲染端纯增量，但**当前无任何 producer**（无 adapter 写此类键），属无生产者的投机 UI；(b) nop-report 语义（`expandType`/`rowParent`）属外部 profile，本仓无消费方。`design.md:348-353` 对 sort/filter 已确立「底层能力缺失时不提前暴露占位」纪律——同一纪律适用于带区视觉。

### F4 fallback 壳（勘误：已是死代码；实际降级行为已达标）

- `fallbacks.tsx` 内容：`renderFallbackCanvas :55-79`（文本摘要：document.name / selectionTarget.kind / preview 状态 / 字段数）、`renderFallbackFieldPanel :32-37`、`renderFallbackInspector :39-53`。
- 引用面（全仓 grep）：**0 importer**——不在 `index.ts` barrel；`report-designer-canvas-fallback`/`report-designer-eyebrow`/`report-designer-meta-list` 数据槽无 CSS、无 e2e 引用；近三次触碰该文件的提交均为全仓机械改造（prettier / i18n lint / BEM→data-slot 迁移）。
- 实际降级路径：document prop 无效 → `resolveReportTemplateDocument`（`page-renderer.tsx:96-102`）就地替换为 `report-designer-page-invalid-document` 空模板 + 一次性 warning toast（`:331-344`）→ **完整工作台照常渲染**（`:644-682`）。e2e host spec `:128-138` 断言 empty template fallback 下 canvas 可见。
- 契约对照：`design.md:191` 明文禁止「退化成仅有诊断文本的空壳」——现行为符合契约；死文件里的文本摘要壳恰是该契约禁止的形态。
- 残留物：i18n 键 `flux.reportDesigner.coreTitle`（`flux-i18n/src/locales/zh-CN.ts:759`）与 `noMetadata` 仅被死文件消费；`noFieldSources` 另有活引用（`field-panel-renderer.tsx`）须保留。

### F5 e2e 断言面（部分过期：dark 令牌翻转已补；结构/交互视觉缺口仍在）

- 现有 spec：`report-designer-demo.spec.ts`（**9 test**，路由 `/#/report-designer`）——结构存在性为主；计算样式断言 4 处 evaluate 块：fieldItemStyles `:50-59`（display/cursor/border/borderRadius/transition）、sticky 前后 `:97-113`/`:126-142`（position/偏移 delta）、toolbarLayout `:168-189`（flexWrap/display/backgroundColor/borderBottomWidth/height/rowCount）。绑定只断属性存在 `data-cell-bound="true"`（`:228`），**不断绑定底色/虚线框视觉，无 dark、无画布尺寸/截断断言、无 fallback 视觉断言**（证据卡「6 处计算样式」按 evaluate 块口径实为 4 处约 12 项属性，计数微漂）。
- `report-designer-host.spec.ts`（**5 test**，路由 `/#/report-designer-host`，走生产 report-designer-page）——**0 计算样式断言**（行为/属性为主：dirty probe `:60-63`/`:91-95`、toolbar testid `:35-41`）。
- 已补 dark 面（plan 476）：`spreadsheet-visual-tokens.spec.ts:121-167` report 画布路由——`--ss-gridline` 双态精确值（:132-142/:151-161）+ 行头 border 翻转（:145-163）。
- 可复用先例：V0 helper `tests/e2e/helpers/visual-assert.ts`（`getComputedStyleValue :15-20` / `expectCssVarResolves :37-44` / `expectComputedStyleNot :52-74` / `captureVisualEvidence :81-90`，冒烟 spec `visual-assert-helpers.spec.ts`）；476 的 `setDarkMode` 模式（`:22-27`）与双 scope 断言写法。

### F6 dark/令牌现状（画布面已由 V6 收口；report 自有面发现 3 个未定义令牌缺陷）

- 共用画布：`canvas-styles.css:5-48` light / `:50-97` dark `--ss-*` 42 枚 × 双态；报告画布 import 生效（`report-spreadsheet-canvas.tsx:2`）；e2e 已验（F5）。
- report 自有 chrome：`report-field-panel.css` 13 处全走 `var(--nop-*, light-fallback)`。其中 **3 个令牌全仓无定义**（`packages/theme-tokens` 0 命中、playground `styles.css` 0 命中）：`--nop-border-hover`（:49，fallback `rgb(148 163 184)`）、`--nop-surface-hover`（:50，`rgb(248 250 252)`）、`--nop-surface-muted`（:74，`rgb(241 245 249)`）——var() 无定义时 fallback 恒亮色 → **dark 下 field item hover 底色与类型徽章底恒为浅色（dark 击穿）**。其余 4 枚（`--nop-text-strong` :23、`--nop-border` :43、`--nop-surface` :45、`--nop-body-copy` :75）由宿主 playground `styles.css` 定义且 dark 对称（light :154/:158/:155/:107；dark :210/:214/:211/:199）。
- 契约差异：spreadsheet 侧 `canvas-styles.test.ts:10-17` 禁止包内写 fallback 值（宿主发布默认值）；`report-field-panel.css` 写了 light 字面 fallback 且**无对应守卫测试**。门禁缺口同 V6 §5：`report-designer-renderers` 不在 `RENDERER_PACKAGE_SCOPE`（`/ ^packages\/flux-renderers-[^/]+\//`，`scripts/audit/find-ui-consistency-gaps.mjs:290`）扫描集内。
- 前缀先例：V5 `--fd-*` / V6 `--ss-*` 均为「域私有令牌发布于 `:root` 块 + `[data-mode='dark']` 同块」。report 自有面现依赖宿主 `--nop-*`；若需新增语义色，应沿既有模式而非新造第三套前缀。

## 2. 残余候选（逐项初裁）

| #   | 候选                                                                              | 证据                                          | 初裁                                                                  |
| --- | --------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------- |
| R1  | 3 个未定义 `--nop-*` 令牌（border-hover/surface-hover/surface-muted），dark 击穿  | §F6                                           | **并入主交付**（宿主定义 + dark 变体，或改用已定义令牌；加守卫测试）  |
| R2  | `fallbacks.tsx` 死文件 + 孤儿 i18n 键（coreTitle/noMetadata）                     | §F4                                           | **并入主交付**（删除；`noFieldSources` 保留）                         |
| R3  | demo 第二份 30×10 硬编码                                                          | report-designer-demo.tsx:77-78                | **并入主交付**（对齐派生；demo 与生产一致是 F1 断言前提）             |
| R4  | `useSpreadsheetInteractions` rows/cols 声明未消费                                 | use-spreadsheet-interactions.ts:46-47 vs :145 | watch-only（跨包 shared hook，清理无视觉收益；F1 修复不得依赖该参数） |
| R5  | `resolveGridDimensions` 模块私有不可复用                                          | default-page-body.tsx:13                      | **并入主交付**（export 或提取共享 util；F1 实现前提）                 |
| R6  | 无分页/页面设置语义视觉                                                           | 4 包 grep 零命中                              | out-of-scope（归 codec-design.md §6.2 props 保留面与 print 域）       |
| R7  | 带区/分组头/expandType 语义模型缺失                                               | §F3                                           | **显式 deferred**（裁决 A2）                                          |
| R8  | e2e 无画布尺寸/截断断言                                                           | §F5                                           | **并入 A5 断言面**                                                    |
| R9  | field-panel.css light 字面 fallback 与 spreadsheet 侧「宿主发布默认值」契约不一致 | §F6                                           | **并入 A6**（守卫测试或契约注记）                                     |
| R10 | report-designer-renderers 在一致性门禁扫描集外                                    | find-ui-consistency-gaps.mjs:290              | watch-only（与 V6 §5 同口径；令牌化合规靠守卫测试）                   |

## 3. 裁决

| #   | 项                             | 裁决                            | 要点                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | 画布解硬编码 30×10             | **Fix**                         | 沿用 spreadsheet host 已落地的派生模式：export `resolveGridDimensions`（default-page-body.tsx:13-41）或提取共享 util；`report-spreadsheet-canvas` 以 `spreadsheetSnapshot.activeSheet` 派生 rows/cols 替换常量（:26-27/:50-55/:250-254）。空白最小基线取值（维持 30×10 或对齐 100×26）在 plan 裁——**推荐对齐 100×26 走同一 helper 单实现**。先红后绿：单测断言大文档（>30 行）下 rows prop ≥ 数据边界（现测试零 rows/cols 断言）；demo 同步（R3）。不动 spreadsheet-core 数据结构。                                                  |
| A2  | 带区/分组头语义视觉最小实现    | **Deferred（显式否决）**        | 理由三连：①文档/语义模型无带区概念（types.ts:49-56/:34-41），报表语义归外部适配器解释（design.md §6.2/§13）；②零 producer——无任何 adapter 写 band 类元数据，渲染端先做视觉即无生产者的投机 UI，违反 design.md:348-353「不提前暴露占位」既有纪律；③行级视觉需给 spreadsheet grid 新增 row-metadata 通道（现仅 cell 级 table-shell.tsx:166），跨保护边界。登记：待 nop-report profile/codec 立项时随语义模型一并设计。既有唯一语义视觉（绑定指示）V6 已令牌化 + dark，V7 只补断言（A5）。                                              |
| A3  | fallback 壳可视化升级          | **改判（勘误驱动）**            | 「fallback 壳」前提已失效（0 importer 死代码，§F4）。交付收缩为：删除 `fallbacks.tsx` + 孤儿 i18n 键（R2）；「可视化升级」目标本身由现行为满足（invalid → 空模板 + 完整工作台，符合 design.md:191）。唯一合理增强切口——invalid-document 替换后的持久可见标记（现仅一次性 toast :344）——裁 **watch-only**，不入交付（属 UX 产品决策非视觉缺陷）。                                                                                                                                                                                     |
| A4  | TemplateCodecAdapter 方向      | **Decision（集成出独立 plan）** | ①方向：采纳 hucre 作为 codec 层依赖（对比报告 §4.1），以独立 codec 包或宿主注册侧实现 `TemplateCodecAdapter`；禁止进入 spreadsheet-core（0-deps）；锁精确版本 + 薄封装不外泄 hucre 类型。②接口面：现有 `adapters.ts:59-70` 足够——codec-design.md §8 两级 codec（SpreadsheetCodec/ReportSemanticCodec）作为未来 adapter 的内部组合，公共接口无需改。③现状定性：命令链/注册表/host method 全通，唯一缺口是生产 adapter；所有 live 表面 import/export 必失败于 noCodecConfigured——非视觉缺陷，V7 不动产品代码。④风险表沿对比报告 §4.3。 |
| A5  | report e2e 视觉断言补齐        | **Fix**                         | 扩展现有 spec 而非新建：(a) report-designer-demo 补绑定视觉计算样式断言（`data-cell-bound` 底色/outline 双态）；(b) spreadsheet-visual-tokens 的 report 路由（:121-167）增补 `--ss-bound-*` 翻转；(c) host spec 补「不出现 fallback 文本壳数据槽」断言；(d) A1 落地后补画布维度断言（行头数覆盖文档边界，R8）；(e) R1 修后补 field panel dark 双态。全部走 V0 helper 程序化判据（快照仅诊断）。                                                                                                                                      |
| A6  | dark/令牌收口（report 自有面） | **Fix**                         | R1 三令牌在宿主 playground styles.css 定义 light+dark（沿 `--nop-text-strong` :154/:210 先例）或改用已定义令牌；加守卫测试（沿 canvas-styles.test.ts「消费令牌必须已定义/禁裸 fallback」模式）堵 R9；report 域 owner doc 补 field-panel 令牌面契约注记。                                                                                                                                                                                                                                                                             |

## 4. 边界

- **不做**：hucre 真实集成（独立 plan，A4 只裁方向）；带区/分组头语义模型与视觉（A2 deferred）；分页/页面设置（R6）；styleId/条件格式渲染通道（V6 R9 裁决维持）；spreadsheet-core 数据结构变更；降级横幅/摘要壳（A3 watch-only）。
- **硬约束**：report→spreadsheet 既有耦合裁决（`report-spreadsheet-canvas.tsx:7` Adjudication 01-09 accept-and-annotate）——A1 沿既有组合面（grid props），不新增反向依赖；spreadsheet-core 0-deps 边界不破；双 scope 泄漏纪律（V6 §4，report 画布 scope `[data-slot='report-designer-spreadsheet-canvas']`）；`spreadsheet-renderers` 公共面增加（export resolveGridDimensions）须带该包测试守卫。
- **e2e 红线**：report-designer-demo 9 test + report-designer-host 5 test + spreadsheet-visual-tokens 3 test 零回归。
- **Owner docs 同步义务**：`design.md` §5.1:195 的派生基线明文只覆盖 spreadsheet-page——V7 须把同一基线写进 §5.2 report-designer-page（或画布一节）；`codec-design.md` 无需改（A4 方向裁决记录进证据卡与路线图）；证据卡 `report-designer.md` 逐条回写（含 F2/F4 勘误）；roadmap V7 行状态翻转；daily log。
- **Test Strategy 档位**：Must automate——A1 截断回归（先红后绿）+ A6/R1 未定义令牌守卫；Should have——A5 视觉断言扩展；Not applicable——A2/A3/A4 文档性裁决与方向裁定（理由见裁决行）。

## 5. 验证方式

1. 单测：`report-spreadsheet-canvas.test.tsx` 增维度派生断言（mock 大文档快照 → 断言传给 SpreadsheetGrid 的 rows/props，先红后绿）；新守卫测试：`report-field-panel.css` 消费的 `--nop-*` 令牌必须已定义（沿 `canvas-styles.test.ts` 模式，先红后绿）。
2. e2e：上述红线 spec 零回归；A5 新增断言全部程序化（`getComputedStyle`/属性断言，V0 helper；dark 用 476 `setDarkMode` 模式）；截图仅诊断（`_tmp/` 或 gitignored artifacts）。
3. `pnpm check`：`report-designer-renderers` 在 `RENDERER_PACKAGE_SCOPE`（mjs:290）扫描集外，无新门禁面；零新增未注册 red。
4. 外部依赖核查留待独立集成 plan：hucre 版本/体积/API 稳定性本次未重新核查（以 2026-09-12 对比报告为据，报告 §6 列有源码路径）。

## 6. 独立核实记录

- Reviewer / Agent: 独立核实审查员（fresh sub-agent session，2026-09-21，只读 live 验证）
- Verdict: `revised` → 勘误回写后 **pass**。F1-F6 全部 findings、R1-R10 与 A1-A6 证据基础全部成立（含两处自我勘误 F2/F4 判断正确）。已回写勘误：①F6 计数 13 处 → 8 处 var()；②owner-doc 义务归属——design.md :195 物理位于 §5.2 共享说明块且主语写 spreadsheet-page，同步义务 = 修订 ：195 条款措辞使其覆盖 report 画布；③行漂移订正：core.ts set 在 :500、host-demo 注册在 :126-129、data-cell-bound 在 table-shell.tsx:232、角标色 :738、dark --ss-bound-\* :81-82、toolbar-defaults :3-41。
- 已处理: 全部核实确认项
  （留空——待独立核实子 agent 回写）
