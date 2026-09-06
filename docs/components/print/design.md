# Print 打印模板体系设计

> Status: design baseline (P0 产出，P1–P4 按此实现)
> Last Reviewed: 2026-09-05
> 来源: `docs/analysis/web-print-research.md`（8 项目调研）+ plan `docs/plans/2026-09-05-2304-1-web-print-p0-research-and-design-plan.md`
> 范围: 打印模板 schema、渲染链路、分页语义、设计器架构、浏览器打印与 PDF 导出

## 1. 定位

Web 打印体系：**打印模板设计器**（可视化拖拽设计模板）+ **打印渲染器**（模板 + 数据 → 分页 HTML）+ **输出通道**（浏览器打印 / PDF 导出）。面向单据、标签、票据、证书类"绝对定位 + 固定纸张"场景；flux 页面本身（流式布局低代码表单/页面）不在本体系范围内，但数据通过 scope 与表达式互通。

## 2. 与调研项目的能力对照

| 能力        | 采用方案                                                   | 思想来源（合规引用）                                                                  |
| ----------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 分层模式    | 纯 TS 引擎（core）+ React 交互层（renderers）              | openprint"排版产物=纯数据中间模型"（AGPL，仅思想）；open-press 三核心 + 薄适配层      |
| 模板 schema | 判别联合元素 + 结构化样式白名单 + schemaVersion            | open-press（Apache 2.0）、fastprint 四槽分层                                          |
| 分页        | 游标式逐元素分发 + 表格逐行实测 + auto-height 文本二分切分 | vue-plugin-hiprint（MIT）；防死循环/防孤行规则参考 vue-print-designer（AGPL，仅思想） |
| 浏览器打印  | 隐藏 iframe srcdoc + `@page` + `contentWindow.print()`     | openprint / hiprint / myprint 共识路线                                                |
| PDF 导出    | html2canvas 逐页位图 + jspdf                               | roadmap 指定；仓库内 calendar export 先例                                             |
| 纸张模型    | 对齐 word-editor `PaperSettings` 形状与预设                | 仓库内既有模型                                                                        |
| 表达式      | flux-formula（`${var}` tpl 语法 + 过滤器）                 | flux 体系惯例                                                                         |

## 3. 包与模块划分

- **`@nop-chaos/flux-print-core`**（纯 TS，零 React）：`schemas.ts`（模板 schema 类型）、`validate.ts`（模板校验）、`unit.ts`（mm↔px↔pt 换算）、`bind.ts`（数据绑定求值编排，调 flux-formula；表格绑定附带 sourceRows 原始行供聚合取值）、`barcode.ts`（createBarcodeSvg/createQrcodeSvg：jsbarcode/qrcode → SVG 标记串，非法输入优雅降级为空串）、`layout.ts`（分页引擎：模板+数据 → `PrintLayoutPage[]`；表格片 PlacedElement 附 sliceRows/sliceHeader/sliceAggregate/totalsAggregate 元数据）、`render-html.ts`（LayoutPage[] → 自包含 HTML + 逐页片段 renderPrintPages）、`print.ts`（浏览器打印：mountPrintFrame/printFrame 分层）、`export-pdf.ts`（PDF 导出）、`index.ts`。
- **`@nop-chaos/flux-print-renderers`**（React 交互层）：`print-designer.tsx`（设计器壳：工具栏/组合/快捷键）、`print-designer-canvas.tsx`（纸张画布）、`print-palette.tsx`（组件面板）、`print-inspector.tsx`（属性面板）、`print-preview.tsx`（分页同源预览）、`renderer-definitions.tsx`（元素 React 渲染件，设计态）、`editor/`（`use-print-editor.ts` editor-core 会话控制器、`print-domain-adapter.ts` 文档适配、`canvas-math.ts` 画布交互纯函数）、`schemas.ts`（默认值工厂）、`index.ts`。

设计态（React 组件渲染元素、可交互）与打印态（core 输出静态 HTML）**共享 schema、不共享实现**——避免"测量一套规则、渲染另一套"；打印态 HTML 是打印/PDF 的唯一真理源。

## 4. 模板 schema 设计

```ts
interface PrintTemplateSchema {
  kind: 'print-template';
  schemaVersion: 1;
  name: string;
  page: PrintPageSchema;
  elements: PrintElementSchema[];
  dataSchema?: PrintFieldMeta[]; // 字段目录，供设计器绑定面板；可选
  testData?: Record<string, unknown>; // 设计态预览数据
}

interface PrintPageSchema {
  paper: PaperSettings; // 复用 word-editor-core 形状 {width,height,direction,margins}
  paperName?: string; // 'a4' | 'a5' | 'b5' | 'custom' ...（PAPER_SIZE_PRESETS 键）
  unit: 'mm'; // v1 协议单位固定 mm；pt/in 为后续扩展位
  headerHeight?: number; // mm，页眉区高度（内容区上界）
  footerHeight?: number; // mm，页脚区高度（内容区下界）
  background?: string; // 纸张背景（CSS 颜色）
  watermark?: { text: string; opacity?: number; rotate?: number };
}
```

- 坐标系：元素 `left/top/width/height` 单位 mm，相对**内容区**原点（页眉线以下、页脚线以上）——页眉/页脚区内的元素相对各自区域原点。与 hiprint"纸 mm + 元素 pt"不同，本项目统一 mm，渲染层负责 mm→px（96dpi：1mm=3.7795px）与 mm→pt（打印 CSS）换算。
- `schemaVersion` 从 1 开始；迁移函数表随版本递增。

### 4.1 元素通用属性

```ts
interface PrintElementBase {
  id: string; // 设计器生成，模板内唯一
  type: PrintElementType;
  region: 'header' | 'body' | 'footer'; // 区域归属；header/footer 元素每页重复
  left: number;
  top: number;
  width: number;
  height: number; // mm
  rotate?: number; // 度
  zIndex?: number;
  locked?: boolean;
  visible?: boolean;
  style: PrintElementStyle; // 结构化白名单，禁止任意 CSS 字符串
}
```

```ts
interface PrintElementStyle {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
  color?: string;
  backgroundColor?: string;
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed';
  borderRadius?: number;
  opacity?: number;
}
```

结构化样式白名单（对齐 open-press 思路与本仓库 styling contract：样式是 schema 数据，不是自由 CSS）。

### 4.2 元素类型集（v1）

| type         | 专有字段                                                                                                                                                             | 说明                      |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------- | --------------------------- | ----------------------------------------------------------- | ----- | ----------------------------------- | ---------------------------- |
| `text`       | `text: string`（SchemaTpl，支持 `${var}` 与过滤器）；`field?: string`（快捷绑定，等价 `${field}`）；`autoGrow?: boolean`（内容超高自动跨页续排，分页需注入 measure） | 静态/动态文本一体         |
| `image`      | `src?: string`；`field?: string`（数据驱动图片 URL）；`fit: 'contain'                                                                                                | 'cover'                   | 'fill'` |                             |
| `table`      | 见 §4.3                                                                                                                                                              | 数据表格，分页主体        |
| `barcode`    | `field? / value?`；`barcodeType: 'CODE128'                                                                                                                           | 'CODE39'                  | 'EAN13' | 'EAN8'                      | 'UPC'                                                       | 'ITF' | 'CODABAR'`；`textVisible?: boolean` | 生成库 `jsbarcode`（新依赖） |
| `qrcode`     | `field? / value?`；`level: 'L'                                                                                                                                       | 'M'                       | 'Q'     | 'H'`；`foreground?: string` | 复用 `qrcode` 库（flux-renderers-content 同依赖同参数语义） |
| `line`       | `direction: 'horizontal'                                                                                                                                             | 'vertical'`               | 分隔线  |
| `rect`       | —                                                                                                                                                                    | 色块/边框盒               |
| `pageNumber` | `format?: string`（如 `'${$page}/${$pages}'`）                                                                                                                       | 页码；仅 header/footer 区 |
| `printDate`  | `format?: string`（dayjs 格式）                                                                                                                                      | 打印时间                  |

v2 预留（不在 P1–P4 范围）：richtext、多级表头（二维 columns + rowspan/colspan）、标签拼版（labelGrid）、表格 groupBy 分组、签名/手绘。

### 4.3 table 元素 schema

```ts
interface PrintTableElement extends PrintElementBase {
  type: 'table';
  source: string; // scope 数组路径（SchemaTpl 形态，如 `${orders}`）
  columns: PrintTableColumn[];
  repeatHeader?: boolean; // 跨页重复表头，默认 true
  footerAggregate?: 'none' | 'lastPage' | 'everyPage'; // 合计行策略，默认 'lastPage'
  rowHeight?: number; // mm；v1 内置链路使用估算回退（ESTIMATE_ROW_HEIGHT_MM=6），宿主/真机链路可经 LayoutMeasure 注入实测行高
  zebra?: boolean;
}

interface PrintTableColumn {
  label: string; // 表头文案
  field?: string; // 行对象取值路径（缺失时可用 tpl）
  text?: string; // SchemaTpl 行级模板（$row 上下文）
  width?: number | 'auto'; // mm
  align?: 'left' | 'center' | 'right';
  format?: PrintValueFormat; // number/currency/date/prefix/suffix
  aggregate?: 'sum' | 'count' | 'avg' | 'min' | 'max';
}
```

`PrintValueFormat` 参考 open-press 的 `{type, digits, prefix, suffix, trueText, falseText, dateFormat}` 结构（Apache 2.0，可直接参考），作为 flux 表达式过滤器之外的声明式格式化层。

## 5. 数据绑定与表达式

- 求值统一走 `flux-formula`：`text`/`text?` 内的 `${var | FILTER}` 由 formula 编译器解析；表格 `source` 求值结果必须是数组。
- 行级上下文注入 `$row`（当前行对象）、`$rowIndex`、`$rows`（本页行）；页面级注入 `$page`（1 起）、`$pages`（总页数）。内置变量与 flux tpl 语法一致（`${$page}/${$pages}`）。
- 绑定缺失语义：路径不可达 → 空字符串（不抛错），校验器产出 warning（对齐 open-press"缺失返回 undefined 不抛错"与 flux 诊断习惯）。
- `dataSchema`（`PrintFieldMeta[]`：`{path,label,type,children}`）只服务设计器字段面板，运行期不依赖（P5 审计注记：当前渲染/分页链路未消费该字段，属设计器增强预留）。
- 求值时机：分页前完成**一次性数据绑定**（所有元素内容解析为最终字符串/数组，异步资源如图片、条码数据全部前置），分页与 HTML 渲染全同步。实现命名：`layoutPrintTemplate(template, data, options) => {pages, diagnostics}`（bind 内置）；HTML 产物经 `renderPrintTemplateToHtml(template, data)`。语义裁定：body 元素内容不依赖页变量（$page/$pages 仅 header/footer/pageNumber 使用，由 layout 在分页完成后按页局部重插值）。

## 6. 分页语义

打印页 ≠ 模板页：一个模板经分页引擎展开为 N 个 `PrintLayoutPage`：

```ts
interface PrintLayoutPage {
  pageIndex: number; // 0 起
  pageSize: { width: number; height: number }; // mm
  header: PlacedElement[]; // region 元素原样复制
  footer: PlacedElement[];
  body: PlacedElement[]; // 已绑定、已定位、已测量
  pageNumberToken: { page: number; pages: number };
}
```

分页算法（hiprint 游标模型 + vue-print-designer 防死循环规则，全部独立实现）：

1. header/footer 区元素 + `pageNumber` 元素每页重复渲染；headerHeight/footerHeight 划出内容区。
2. body 元素按 `top` 排序，携带游标（当前页、页内 y、内容区高度）逐个分发：
   - 普通元素放不下 → 整体移到下一页（不切割）。
   - `table`：逐行测量填充当前页；写满 → 在行边界切割，新页从内容区顶重建表体，`repeatHeader` 时重复表头；`footerAggregate` 按策略（lastPage 仅末页 / everyPage 每页小计）追加合计行；整表放不进新页且不在页顶 → 整体后移（防孤行）；切点为 0 且已在页顶 → 强保一行（防死循环）；总页数上限 500。
   - `text`（内容超高时）：按字符索引二分查找切分点（v1 不做空白边界回退），后半段续排新页（仅对设置 autoGrow 的文本启用；无 measure 时整体移页不切分）。
3. 表格等流式元素膨胀后，其下方 `top` 更大的元素整体按原间距下移（跨页时落到对应页）。
4. 输出 `PrintLayoutPage[]`；无表格等流式元素时模板页数即 1。

## 7. 渲染与输出链路

```
PrintTemplateSchema + data
  → bind（flux-formula 一次性求值，异步资源前置）
  → layout（分页引擎 → PrintLayoutPage[]）
  → render-html（LayoutPage[] → 自包含 HTML：内联样式 + @page 纸张尺寸 + page-break）
      → 浏览器打印：隐藏 iframe srcdoc + contentWindow.print()
      → PDF 导出：逐页 html2canvas 位图 + jspdf 合成（v1，仓库 calendar export 同路线）
      → （后续扩展）服务端无头浏览器矢量 PDF、客户端静默打印（宿主基于同一 HTML 产物对接）
```

- `render-html` 产物是**唯一打印真理源**；设计器画布是同一 schema 的 React 交互视图，两者字段语义一致由 renderer-definitions 的字段契约保证。
- 打印 CSS：`@page { size: <W>mm <H>mm; margin: 0 }`，页与页之间 `page-break-after`；颜色打印 `print-color-adjust: exact`（对齐 calendar-print.css 惯例）。
- 输出通道函数：`printPrintTemplate(template, data, options)`（浏览器打印）与 `exportPrintTemplateToPdf(template, data, options)`（PDF），二者内部前置 `validatePrintTemplate` 闸门（error 级诊断抛 `PRINT_VALIDATION_BLOCKED`，`validate:false` 可跳过）。客户端静默打印/云打印为宿主级扩展（基于同一 HTML 产物自行对接；vue-print 调研结论：不建议引入 Lodop 依赖）。

## 8. 设计器架构（P2）

- **状态**：editor-core 会话（`createEditorCore`，policy=auto）持有 working/committed 双态与选区，修改走命令函数并产生 forward/inverse diff 进 `UndoCommandStack`；React 侧经 `usePrintEditorSnapshot`（useSyncExternalStore）订阅会话快照与 zoom。会话控制器 `createPrintEditorController` 为框架无关纯逻辑。
- **画布**：纸张 div 按 zoom 缩放（默认 1mm=3.7795px×zoom）；元素绝对定位；pointer 事件实现拖拽/8 向 resize/旋转手柄——**pointerdown 时快照原始 frame，move 按快照算增量**（vue-print-designer 思想）；吸附目标=纸张边距线/参考线/其他元素边缘与中心，阈值 3px，Alt 临时禁用；10mm 网格背景。
- **组件面板**：按元素类型列出，HTML5 dragstart/drop 携带类型默认值，drop 处换算纸面坐标 + 网格吸附落位。
- **属性面板**：按元素类型分区的表单（@nop-chaos/ui 组件）；只发局部 patch（frame/style 浅合并）。
- **快捷键**：Delete、方向键微移（1mm/Shift 0.1mm）、Ctrl+C/V/D、Ctrl+Z/Y；输入框聚焦跳过。
- **预览**：分页结果逐页渲染（调 core layout + render-html，iframe 或直接 DOM），与打印产物同源。

## 9. 样式与 DOM marker 约定

- 打印元素渲染件是"完整自绘控件"（widget 契约），画布容器仅发 marker 类：`nop-print-canvas`、`nop-print-paper`、`nop-print-element`（`data-print-type="text|table|..."`）、`nop-print-region-header/footer/body`。
- 打印态 HTML 用独立类名空间 `fmt-*`（print markup tag），不依赖 Tailwind——HTML 必须在无构建页面的 iframe 中自包含。
- 无 BEM；`data-slot` 仅用于 @nop-chaos/ui 内部组件。

## 10. 校验与诊断

`validatePrintTemplate(template)`（flux-print-core）：结构必填、区域越界（元素超出内容区）、纸张预设合法、table.source 形态、pageNumber 区域、必填专有字段。绑定路径 warning 由 `bindPrintTemplate` 产出（validate 无 data 参数，静态不可判定）。产出结构化诊断（level: error/warning，code，elementId），设计器标红警示；print/export 前置闸门对 error 级诊断抛 `PRINT_VALIDATION_BLOCKED`（`validate:false` 可跳过）。

## 11. 实现拆分（对应 roadmap P1–P4）

| Phase | 交付                                                                                                 |
| ----- | ---------------------------------------------------------------------------------------------------- |
| P1    | 两包脚手架 + `schemas.ts`/`unit.ts`/`validate.ts`/`bind.ts` + 包注册                                 |
| P2    | 设计器画布/面板/预览/undo（flux-print-renderers）                                                    |
| P3    | `layout.ts` + `barcode.ts` + `render-html.ts` + `print.ts` + `export-pdf.ts`（含预览升级为分页同源） |
| P4    | playground 演示页 + 路由 + e2e                                                                       |

## 12. 风险、取舍与被拒绝的替代方案

- **统一 mm 而非"纸 mm + 元素 pt"（hiprint 模式）**：减少一次换算与设计器缩放心智；代价是与 hiprint 模板不兼容（本项目无存量 hiprint 模板，接受）。
- **打印态独立 HTML 引擎而非复用 flux renderer registry**：打印产物必须脱离 React 运行时自包含（iframe srcdoc、服务端渲染位）；registry 模式保留给"flux 页面内嵌打印组件"的未来扩展。
- **v1 位图 PDF（html2canvas+jspdf）而非矢量**：roadmap 指定且与仓库现状一致；矢量 PDF（svg2pdf/服务端 Puppeteer）列为后续优化，接口位已留。
- **分页行高：估算回退 + measure 可注入扩展点**：行高解析顺序为 schema rowHeight → `LayoutMeasure` 注入实测（扩展点，宿主/真机链路可自行构造隐藏容器注入；v1 内置 print/export/preview 链路不自动注入）→ 估算常量 ESTIMATE_ROW_HEIGHT_MM=6。纯几何回退保证无 DOM 环境可确定性分页（单测/服务端）；浏览器内按估算行高分页的精度由 repeatHeader/聚合行预留与 schema rowHeight 兜底，精确 DOM 实测注入是 P4 后的增强点。
- **不引入 Fabric.js 位图画布**：openprint 用 Fabric 但与 DOM 流式生态冲突；本仓库全部设计器均为 DOM 体系。
- **许可证红线**：openprint/vue-print-designer/report-designer 的代码零拷贝；本文档只引用其思想并标注来源。schema 命名为本项目原创（不抄 hiprint tid/options 命名）。
