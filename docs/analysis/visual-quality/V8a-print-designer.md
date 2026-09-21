# V8a 研究报告：Print 设计器视觉修复

> 核查日期: 2026-09-21
> 基线: master @ d227fd347（print 域最后一次代码提交 = 09-13 三分支审查修复；其后两包零提交、工作区零未提交改动——09-13 登记的全部遗留在 live 原样存在）
> 输入: 路线图 V8a 行、普查 §6（`docs/analysis/2026-09-15-visual-quality-deep-survey.md`）、证据卡 `docs/audits/visual-quality/print.md`、owner doc `docs/components/print/design.md`、09-13 登记（`docs/logs/2026/09-13.md` 遗留行 + `docs/analysis/2026-09-13-threejs-webprint-echarts-branch-review.md` §2.2/§2.3/§5）
> 状态: 已独立核实通过（revised → 勘误回写后 pass）

## 0. 勘误与域定位

- **域定位**：`packages/flux-print-core`（纯 TS 引擎：validate/bind/layout/render-html/print/export-pdf）+ `packages/flux-print-renderers`（React 设计器：designer/canvas/palette/inspector/preview + `editor/`）+ `tests/e2e/print-designer.spec.ts` + demo `apps/playground/src/pages/print-designer-demo.tsx`。与 V8b（word/canvas-editor）零交集。
- **勘误①（证伪一项对标缺口）**：普查 §6 与证据卡 V8a-F11「无方向键微移」**不成立**——`print-designer.tsx:74-85` 已实现 Arrow 四键微移（1mm / Shift 0.1mm 档位、输入框聚焦跳过），命令层 `use-print-editor.ts:178-186` `nudge(dx,dy)` 移动全部选中元素。对标缺口实际只剩：多选创建、undo 栈面板、图层树、标尺拖动参考线（§1 F11 逐项核）。
- **勘误②（i18n 键计数 88 → 92，且语义需澄清）**：`flux-i18n/src/locales/zh-CN.ts:809-912` 的 `flux.print.*` 块实为 **92 个 leaf 键**（程序化 flatten 计数），en-US 对称 92、双 locale 零漂移；88 是 09-15 普查时点计数（其后键有增长）。且 92 键**全部是 UI chrome 标签**（palette/toolbar/inspector/preview）——诊断消息 per-code 键**一个都没有**。「88 键已备而不用」的准确含义：UI 标签键已备且 renderers 已全量消费（renderers 源码 grep 中文零命中）；诊断 message 是 core 直出的中文字面量、无键可用（§1 F10）。
- **勘误③（F12 断言面精确化）**：证据卡「`print-designer.spec.ts` 0 计算样式/0 截图」需精确为——1 处 `getBoundingClientRect` 几何断言存在（spec:70-76 行高闭合）；**0 getComputedStyle、0 截图、0 画布交互断言（选中框/手柄/拖拽/吸附）成立**。
- **基线勘误**：证据卡 F5 引 `canvas-math.ts:84-89`——live 中 `SnapResult` 接口在 `canvas-math.ts:83-89`（注释「供画布绘制辅助线」在 :85），`computeSnap` 返回两轴 lines 在 :124-137；结论不变，行号微漂。

## 1. Findings 逐项核实

> 每项：原始登记处 → live 状态（file:line 证据）→ 修复面。①–⑩ 顺序对齐 branch review §2.2/§2.3 与证据卡 V8a-F1–F10。

### F1（①）旋转元素按未旋转 AABB 排版 — 成立

- 登记：branch review §2.3（code-dimensions.md D15-02）+ `docs/logs/2026/09-13.md:12`。
- live：`layout.ts` 全文 **0 处 rotate**——flow 排序（:115-131 用 `element.top/height`）、`targetTopAbs`（:180）、普通元素判放（:249-286）、表格切片容量（:198-204）全按未旋转 frame；`render-html.ts:34-43/:69` 只在最终 HTML 加 `transform:rotate(...)`。分页几何与视觉外接框不一致：旋转元素会按未旋转 AABB 提前/滞后翻页。
- 修复面：layout 对 `rotate≠0` 元素算旋转 AABB（四角绕中心变换取 min/max）再入游标；或（初裁倾向，见 A6）v1 契约显式化「rotate 仅视觉、不参与分页几何」+ owner doc 登记。

### F2（②）autoGrow 尾片高度用声明值 — 成立

- 登记：branch review §2.3（D21-05）+ 09-13 log。
- live：`layout.ts:251-264`——首片 `place(..., { pageTop: startY, pageHeight: available })`（:256），尾片 `place(item.element, { pageTop: contentRect.top, pageHeight: item.height })`（:261）且 `cursorY = contentRect.top + item.height`（:263）——`item.height` 是元素**声明高度**，不是 `measure.textHeight(split.rest)` 的实测剩余高度；尾片视觉高度与占位推进量错误。
- 修复面：有 measure 时尾片 pageHeight/cursorY 用实测；无 measure 维持现行为（整体移页路径不切分，:268-283 不受影响）。

### F3（③）printDate 跨页漂移 — 成立

- 登记：branch review §2.3（D19-03）+ 09-13 log。
- live：`bind.ts:168` `const now = context.now ?? new Date()`——每次 bind 调用各自取时刻；`layout.ts:295-301` header/footer **按页循环**调 `bindPrintTemplate(regionTemplate, data, { page: pageNo, pages: total })`（:297）且不传 `now` → 多页模板页眉 printDate 每页重新 `new Date()`，秒级必然漂移（body printDate 只绑一次 :105，不受影响）。
- 修复面：`layoutPrintTemplate` 顶部取一次 `now` 传入每次 per-page bind（`BindPrintContext.now` 注入位已在，bind.ts:16）；一行级修复。

### F4（④）PDF JPEG 压缩伪影 — 成立

- 登记：branch review §2.3 + 证据卡（引 `export-pdf.ts:68`，live 行号命中）。
- live：`export-pdf.ts:68` `pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', ...)`——文本/线条类页面 JPEG 0.92 有可见振铃伪影；html2canvas `scale: 2`（:30）维持。
- 修复面：切 PNG（`toDataURL('image/png')` + `'PNG'`）；位图页数多时包体需实测后定稿（见 A6/R7）。

### F5（⑤）吸附辅助线算了不画 + Alt 禁用吸附未实现 — 成立（最高性价比项）

- 登记：branch review §2.2 W-7 + 09-13 log 遗留 + 证据卡 V8a-F5。
- live 数据面（已算出）：`canvas-math.ts:83-89` `SnapResult { frame, verticalLines, horizontalLines }`，:85 注释明言「供画布绘制辅助线」；`computeSnap`（:124-137）把命中线随两轴回传；单测已锁命中线语义（`canvas-math.test.ts:52-62` 断言 `verticalLines).toEqual([20])`）。
- live 消费面（丢弃）：`print-designer-canvas.tsx:130` `const snapped = computeSnap(moved, buildSnapOptions(...))` 只消费 `snapped.frame`（:131）；`verticalLines/horizontalLines` 被丢弃；全文件无辅助线渲染节点，`print-designer-canvas.test.tsx` 零 snap 断言，`print-designer.css` 无对应类。
- Alt 禁用吸附：`canvas.tsx:148` `event.altKey` 仅用于旋转 free 模式；move 分支（:123-133）不读 altKey。owner doc design.md §8（:191）承诺「Alt 临时禁用」未兑现。
- **最小实现方案**（零 core/schema 变更，纯 renderers 域内）：
  1. `print-designer-canvas.tsx` 增 `useState<{v: number[]; h: number[]}>` 存当前命中线；
  2. move 分支（:130）把 `snapped.verticalLines/horizontalLines` 写入 state；区域坐标 mm + `drag.regionOrigin` 换算纸面绝对 px（同元素定位换算法 :264-265）；Alt 时（`event.altKey`）跳过 `computeSnap` 直接用 `moved`；
  3. paper 内渲染 2 类绝对定位 div：marker 类建议 `nop-print-snap-line-v/h`，1px 宽/高，颜色 `hsl(var(--primary))`，`pointer-events: none`（同 region guide 惯例 :71-84）；
  4. `handlePaperPointerUp`（:152-156）清空 state。
  5. CSS 两规则 + palette drop 路径（:169-173）不需要线（瞬时落位）。

### F6（⑥）验证仅按钮时更新 / 无元素级标红 — 成立

- 登记：branch review §2.3（「验证计数仅按钮点击时更新…元素级标红未实现」）+ owner doc design.md §10（:205）承诺「设计器标红警示」。
- live：`print-designer.tsx:88-90` `handleValidate` 只在按钮点击时调 `controller.validate()`（= `validatePrintTemplate(working)`，use-print-editor.ts:199）并 `setErrorCount`；errorCount 只改按钮 variant（:151）与文案（:157-159）。画布零消费诊断——`canvas.tsx:252-305` 元素渲染不读任何 diagnostics，无标红通道；`print-inspector.tsx` 零 validate/diagnostic 引用（grep 零命中）。另一消费点仅在预览：`print-preview.tsx:52-68`（预览打开才展示 layout.diagnostics）。
- 修复面：最小 = 画布 wrapper 消费 `validate()` 结果 map（elementId → has error）→ `data-print-diagnostic="error"` + CSS 标红（红 outline 或角标）；实时化 = 结果按 `state.working` 派生（useMemo），不再等按钮。

### F7（⑦）设计态 ImageRenderer 忽略 fit — 成立

- 登记：branch review §2.3 + 证据卡。
- live：`renderer-definitions.tsx:20-27` `<img className="fmt-design-image">` 不读 `element.fit`；`print-designer.css:158-163` `.fmt-design-image { object-fit: contain; }` 全类型固定 contain；打印态 `render-html.ts:102` `object-fit:${element.fit ?? 'contain'}`。设计态与打印态视觉语义分叉，违反 design.md §3「字段语义一致」承诺（:184）。
- 修复面：设计态把 fit 落成元素级 inline style（一处 renderer 改动）。

### F8（⑧）resetPrintElementIdSeq 泄漏 barrel — 成立

- 登记：branch review §2.3 + 证据卡。
- live：`schemas.ts:26-28` `resetPrintElementIdSeq` 测试专用（`renderer-definitions.test.tsx:5,11` 消费）；`index.ts:3` `export * from './schemas.js'` 将其连同 `seed/next/createDefaultElement` 全量导出生产 barrel。
- 修复面：index.ts 改具名白名单导出（生产只需 `createDefaultElement`）；reset 移测试同域或保留导出面收紧。纯收敛、低风险。

### F9（⑨）iframe 打印清理无超时 — 成立

- 登记：branch review §2.3 + 证据卡。
- live：`print.ts:67` `iframe.addEventListener('load', () => printFrame(...), { once: true })`——srcdoc 写入异常/被拦截导致 load 不触发时，**既不 print 也永不清理**（无任何兜底定时器）；`printFrame` 内的 `setTimeout(iframe.remove())`（:47）只在 print 已触发路径生效。
- 修复面：挂 load 同时挂超时兜底（如 5s remove + 诊断回调）；或 load/readystatechange 双通道 + 超时。

### F10（⑩）诊断消息硬编码中文、i18n 未接管 — 成立（直出的是中文，非英文）

- 登记：branch review §2.3（「诊断信息全部硬编码中文（88 个 flux.print.\* 键本身在两个 locale 中齐备）」）。
- live 直出位置——core **17 个诊断 code 的 message 全部中文字面量**：
  - `validate.ts` 12 codes：PRINT_KIND_INVALID(:44)、PRINT_PAGE_MISSING(:49)、PRINT_PAPER_UNKNOWN(:54)、PRINT_ELEMENTS_INVALID(:58)、PRINT_ID_REQUIRED(:65)、PRINT_ID_DUPLICATE(:67)、PRINT_TYPE_UNKNOWN(:73)、PRINT_FIELD_REQUIRED(:78)、PRINT_FIELD_INVALID(:84/:91)、PRINT_SOURCE_REQUIRED(:95)、PRINT_REGION_INVALID(:99)、PRINT_REGION_OVERFLOW(:109)；
  - `bind.ts` 4 codes：PRINT_BIND_SYNTAX(:211/:264)、PRINT_BIND_EVAL(:219/:286/:308)、PRINT_BIND_PATH_MISSING(:228)、PRINT_BIND_SOURCE_NOT_ARRAY(:278)，另有单元格错误拼接 :195；
  - `layout.ts` 1 code：PRINT_LAYOUT_PAGE_LIMIT(:147)。
  - 异常消息混中英：`print.ts:17/41/61`、`export-pdf.ts:17/46/51`（PRINT_VALIDATION_BLOCKED 拼接中文 + print-blocked/EXPORT_EMPTY 英文）。
- 渲染消费直出：`print-preview.tsx:64` `[{diagnostic.code}] {diagnostic.message}`。
- **接管面**：`PrintDiagnostic` 已结构化 `{ level, code, message, elementId? }`（validate.ts:11-16）——core 保持 code+params 为契约不动（core 纯 TS 零 React，message 保留为 fallback 文案）；renderers 侧新增 `flux.print.diagnostic.<code>` 键（17 codes × 2 locale）按 code 映射 `t()` 渲染，未知 code 回退 raw message。现有 92 UI 键不动。

### F11 对标缺口逐项（两项成立、一项证伪、两项成立但裁决不同）

| 缺口（普查/证据卡口径） | live 核实                                                                                                                                                                                                                                                                              | 结论                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 无多选/框选             | 交互层成立：`canvas.tsx:88/:104` `setSelection` 恒传单元素数组，paper pointerdown（:214）清空选区，无 shift/ctrl 修饰、无 marquee。**命令层已天然支持多 id**：`use-print-editor.ts:114-115` `setSelection(ids)`，deleteSelected/copy/paste/nudge（:150-186）全按 `Set(selection)` 操作 | 缺口只在画布「创建多选」交互 |
| 无方向键微移            | `print-designer.tsx:74-85` + `use-print-editor.ts:178-186` 已实现（1mm/Shift 0.1mm）                                                                                                                                                                                                   | **证伪**（勘误①）            |
| 无 undo 栈 UI           | snapshot 暴露 `undoDepth/redoDepth`（use-print-editor.ts:221-222，EditorSessionState 字段），renderers 全域 0 消费；工具栏仅 undo/redo 两按钮（print-designer.tsx:104-123）                                                                                                            | 成立                         |
| 无图层树                | `print-inspector.tsx` 零 zIndex/layer 引用（grep 0 命中）；层序无任何 UI 入口（schema `zIndex` 字段在，canvas.tsx:269 消费）                                                                                                                                                           | 成立                         |
| 标尺无拖动参考线        | 标尺为静态刻度渲染（`canvas.tsx:176-194` tick span），ruler div 无 pointer handler；无自定义参考线的状态/存储/吸附候选接入（`buildSnapOptions` :73-84 只喂网格+元素锚点）                                                                                                              | 成立                         |

### F12 print e2e 视觉断言缺口 — 成立（精确化见勘误③）

- live：`tests/e2e/print-designer.spec.ts` 8 test——壳可见性（:10-19）、palette 增元素 DOM 计数（:21-26）、预览 srcdoc 内容/页数（:28-40）、条码 svg（:42-50）、PDF 下载（:52-57）、打印按钮存在（:59-61）、行高几何闭合（:63-77，`getBoundingClientRect`，全 spec 唯一布局级断言）、聚合行+页码 token（:79-90）。
- 缺口：0 getComputedStyle、0 截图、0 画布交互断言（选中 outline/手柄可见性/拖拽落位/吸附辅助线）、0 light/dark 双态。
- 附带脆弱点：spec 以**中文按钮字面量**定位（预览 :29、80mm 小票 :43、导出 PDF :54、打印 :60）且 srcdoc 断言中文内容（出库单/收银小票）——A2 i18n 接管若改 demo 文案会连带红；断言应改 testid。

### F13（补充）dark 支持现状与令牌化面

- **已令牌化（chrome）**：`print-designer.css` 全部 chrome 类消费 `hsl(var(--muted)/--border/--primary/--background/--muted-foreground)`（:15-129），dark 宿主随变量翻转；预览警告色 09-13 已补 dark（`print-preview.tsx:61` `text-amber-600 dark:text-amber-400`）。css 头注释（:2-4）声明双轨契约：chrome 用 design tokens、纸面用「墨水语义」（#999/#fff 恒定）。
- **残余①（真 dark 击穿面）**：`canvas.tsx:206-209` 内联 style——纸张兜底 `backgroundColor: template.page.background ?? '#ffffff'` 与网格线 `rgba(0,0,0,0.06)` 双向 light-only：dark 宿主下纸面纯白（纸面语义可辩护）但**网格线在白纸上不变、画布外环境无网格色通道**；这是内联 style，不在 css 令牌面内。
- **残余②（文档化决策，非缺陷）**：`print-designer.css:174/188/201/208/215` `#999` ×5——纸面墨水语义契约（css:2-4）明示，维持；若要改契约须先改 owner doc。
- **先例**：`--ss-*`（`spreadsheet-renderers/src/canvas-styles.css:1-9`，plan 476，包作用域定义 + `[data-mode='dark']` 变体）与 `--fd-*`（`flow-designer-renderers/src/designer-theme.css:1-22`，plan 475，`.nop-designer` 作用域发布、消费点 `var(--fd-x, fallback)`、身份色不翻转）。print 若引入新令牌（仅画布环境色，如网格线/空纸兜底），定义域/作用域在 plan 定；纸面色不令牌化。
- **门禁定位**：`flux-print-*` 不匹配 `RENDERER_PACKAGE_SCOPE`（`/^packages\/flux-renderers-[^/]+\//`，`scripts/audit/find-ui-consistency-gaps.mjs:290`）——新增硬编码色不被该门禁拦截，令牌化纪律 self-imposed（同 V6 对 spreadsheet 的定位）。

## 2. 残余候选（逐项初裁）

| #   | 候选                                                            | 证据       | 初裁                                                                                                                                          |
| --- | --------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | 吸附辅助线渲染 + Alt 禁用吸附                                   | §1 F5      | **并入主交付**（最高性价比：数据已算出、消费点单行、纯 renderers 域内）                                                                       |
| R2  | 诊断 i18n 接管（17 codes × 2 locale + 预览消费点）              | §1 F10     | **并入主交付**                                                                                                                                |
| R3  | 元素级标红 + 验证实时化                                         | §1 F6      | **并入主交付**（data 标记 + CSS；实时化随 useMemo 派生）                                                                                      |
| R4  | 设计态 image fit                                                | §1 F7      | **并入主交付**（一处 renderer）                                                                                                               |
| R5  | resetPrintElementIdSeq barrel 收敛                              | §1 F8      | **并入主交付**（纯收敛）                                                                                                                      |
| R6  | iframe 打印超时兜底                                             | §1 F9      | **并入主交付**（小而关键）                                                                                                                    |
| R7  | PDF JPEG→PNG                                                    | §1 F4      | **并入主交付**（切 PNG 后实测多页包体，回退 JPEG quality 提档为备选）                                                                         |
| R8  | printDate 一次 now 注入                                         | §1 F3      | **并入主交付**（一行级）                                                                                                                      |
| R9  | autoGrow 尾片实测高度                                           | §1 F2      | **并入主交付**（有 measure 走实测；无 measure 行为不变 + doc 登记）                                                                           |
| R10 | 旋转 AABB 分页几何真修                                          | §1 F1      | **裁决项**：初裁「v1 契约显式化 + owner doc 登记（rotate 不参与分页几何）」而非几何修复——坐标系全面修订工作量/收益比差，v1 无存量 rotate 模板 |
| R11 | 多选创建（shift/ctrl+click；marquee）                           | §1 F11     | **部分并入**：shift/ctrl+click 最小面并入（命令层已备，只补交互修饰键）；marquee 裁决 deferred                                                |
| R12 | 标尺拖动参考线（自定义 guide 存储 + 吸附候选接入）              | §1 F11     | **deferred**——guides 是模板外持久状态（schema 无载体），存储设计超视觉修复边界，单独立项                                                      |
| R13 | undo 栈面板                                                     | §1 F11     | **watch-only**——工具型 UI 非视觉质量域（undoDepth 已暴露，接入成本在交互设计不在视觉）                                                        |
| R14 | 图层树                                                          | §1 F11     | **watch-only**——同上                                                                                                                          |
| R15 | e2e 视觉断言（选中/手柄/辅助线/dark 计算样式 + 定位 testid 化） | §1 F12/F13 | **并入主交付**                                                                                                                                |
| R16 | 画布内联网格/纸面兜底色 light-only（dark 残余①）                | §1 F13     | **并入主交付**（仅画布环境色令牌化；纸面 #fff/墨水语义维持 css:2-4 契约）                                                                     |

## 3. 裁决

| #   | 项                                             | 裁决            | 要点                                                                                                                                                                                                                                                                                                |
| --- | ---------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | 吸附辅助线渲染 + Alt（R1/F5）                  | **Fix**         | canvas.tsx 消费 `snapped.verticalLines/horizontalLines`（:130 处），区域坐标 + regionOrigin 换算纸面 px；marker 类 `nop-print-snap-line-v/h` + CSS 1px `hsl(var(--primary))` + `pointer-events:none`；move 分支读 `event.altKey` 跳过吸附；pointerUp 清空。区域坐标换算复用元素定位同法（:264-265） |
| A2  | 诊断 i18n（R2/F10）                            | **Fix**         | 新增 `flux.print.diagnostic.*` 17 codes × 2 locale；预览（print-preview.tsx:64）按 code→`t()` 渲染、未知 code 回退 `message`；core `PrintDiagnostic` 契约与 message 字段不动（fallback 文案）。**同步**：e2e 中文按钮/srcdoc 字面量定位改 testid，防连带红                                          |
| A3  | 元素级标红 + 实时化（R3/F6）                   | **Fix**         | 画布 wrapper `data-print-diagnostic="error"` + CSS 标红；validate 结果按 `state.working` useMemo 派生；按钮计数保留为汇总展示                                                                                                                                                                       |
| A4  | 多选/微移（R11/F11）                           | **部分 Fix**    | 微移已存在（勘误①，零交付）；多选补 shift/ctrl+click 修饰键创建多选（canvas.tsx:88/:104 两处 setSelection 加 modifier 分支），marquee deferred                                                                                                                                                      |
| A5  | undo 面板 / 图层树 / 标尺参考线（R12/R13/R14） | **Adjudicated** | undo 面板与图层树 watch-only（工具型 UI，超 V8a 视觉边界）；标尺拖动参考线 deferred（guides 需模板外状态存储设计）——三者均显式登记，不静默丢弃                                                                                                                                                      |
| A6  | ①②③④⑦⑧⑨ 其余项（R4-R10）                       | **Fix**         | fit/barrel/超时/PNG/now 注入/autoGrow 实测并入；**R10 旋转 AABB 显式裁决为契约显式化 + doc 登记**（拒真修：坐标系全面修订 vs v1 无存量 rotate 模板）；R7 PNG 交付须附多页包体实测数                                                                                                                 |
| A7  | dark 令牌化残余（R16/F13）                     | **Fix**         | 仅画布环境色（网格线 rgba、空纸兜底）走 `--print-*`（或复用既有 token）+ dark 变体，援引 --ss-_/--fd-_ 先例；纸面色维持墨水语义契约（css:2-4）不令牌化                                                                                                                                              |
| A8  | e2e 视觉断言（R15/F12）                        | **Fix**         | print spec 增：选中 outline 色、手柄边框、吸附辅助线可见性、标尺定位的 **getComputedStyle** 断言（light/dark 双态，复用 V0 helper + `theme-switcher.spec.ts` 先例）；辅助线用程序化 pointer 拖拽触发；定位全面 testid 化                                                                            |

## 4. 边界

- **不做**：undo 栈面板、图层树、marquee 框选、标尺拖动参考线（A5，显式裁决非静默）；旋转 AABB 分页几何真修（A6/R10）；core message 字段本地化（core 纯 TS 零 React，message 为 fallback 契约）；纸面色令牌化（墨水语义契约维持）。
- **硬约束**：打印态 HTML（`fmt-*`）自包含、不接 Tailwind/设计令牌（design.md §9 :200-201）——令牌化只针对设计态画布 chrome 与内联 style；`renderPrintTemplateToHtml` 产物是唯一打印真理源，视觉修复不得分叉设计态/打印态几何语义（design.md §3 :29「共享 schema、不共享实现」：设计态 fit 修复（F7）以打印态 `render-html.ts:102` 语义为准）；许可证红线（design.md §12）不涉本报告改动面。
- **Owner docs 义务**：`docs/components/print/design.md` §8（Alt 吸附承诺兑现）、§10（标红承诺兑现）回写；若 R10 走契约显式化，§6 分页语义节须加 rotate 条款；证据卡 print.md 12 项 Findings 回写；roadmap V8a 行；daily log。
- **测试红线**：flux-print-core + flux-print-renderers 现有单测（09-13 时点 154 个：core 82 + renderers 72，含 canvas-math/canvas/inspector/preview/definitions/designer 7 个 spec 文件）与 `print-designer.spec.ts` 8 test 零回归。

## 5. 验证方式

1. **单测**：canvas-math 既有 computeSnap 断言（canvas-math.test.ts:52-69）不回归；canvas 渲染层新增 snap-line data/可见性断言、`data-print-diagnostic` 断言、多选修饰键断言；layout 一次 now 注入断言（F3：两页 layout 的 header printDate 相等）；ImageRenderer fit 断言；barrel 导出面快照（F8：reset 不在生产导出）。
2. **e2e**：`print-designer.spec.ts` 8 test 零回归 + 新增计算样式断言（选中 outline 色/手柄边框/辅助线，light/dark 双态，V0 helper `getComputedStyleValue`）；辅助线用 Playwright pointer 拖拽程序化触发后 locator 可见性断言；i18n 接管后预览诊断文案断言走 locale 无关的 code 前缀。
3. **门禁**：`pnpm typecheck`/`build`/`lint` 全绿；`pnpm check` 零新增命中——`flux-print-*` 在 RENDERER_PACKAGE_SCOPE 扫描集外（find-ui-consistency-gaps.mjs:290），硬编码色不会被拦截，交付时须 self-review 色值纪律（引用点全部走 token 或已登记墨水语义）。

## 6. 独立核实记录

- Reviewer / Agent: 独立核实审查员（fresh sub-agent session，2026-09-21，只读 live 验证含 git 基线 diff）
- Verdict: `revised` → 勘误回写后 **pass**。①-⑩ 登记与 live 一致性、17 诊断 code、92 键对称、吸附数据面/消费面、e2e 断言面、R/A 证据行号全部成立。必须勘误已回写：①勘误②解释性主张错误——print 键块自 09-13 基线零变更、当时已是 92 键，survey 的 88 系当时误计（非后继增长）；②文件名统一为 print-designer-canvas.tsx（多处写 canvas.tsx）；③F13 #999 计数 5 → 6（漏 :189）。顺手订正：F2 登记处 §2.3 → branch review §5（:98）；F7 句在 §7 非 §3；「renderers 中文零命中」收窄为「UI chrome 标签零硬编码」（schemas.ts:65 '文本'、renderer-definitions.tsx:30 '列' 为默认内容字面量）；「零 snap 断言」收窄为「零辅助线断言」；基线口径收窄为 print 域。
- 已处理: 全部核实确认项

（留空——待独立核实）
