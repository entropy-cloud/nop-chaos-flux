# Web 打印开源项目调研报告

> 调研日期: 2026-09-05
> 源码位置: `~/sources/print/`（8 个项目）
> 关联: `missions/web-print.json`、`docs/backlog/web-print-roadmap.md`（P0）、plan `docs/plans/2026-09-05-2304-1-web-print-p0-research-and-design-plan.md`
> 方法: 每个项目由独立子 agent 只读调研源码后汇总；许可证结论以各仓库 LICENSE 文件实测为准

---

## 1. 项目总览与许可证合规

| #   | 项目               | 实测协议（以 LICENSE 文件为准）                                        | 技术栈                                    | 合规档位                             |
| --- | ------------------ | ---------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------ |
| 1   | openprint          | AGPL-3.0（package.json 误标 GPL-3.0，以 LICENSE 为准）                 | TS + Vue 3 + Naive UI + Fabric.js + Pinia | 仅参考设计思想，**不拷贝代码**       |
| 2   | vue-print-designer | AGPL-3.0（另有 COMMERCIAL_LICENSE.md 双授权口径）                      | Vue 3 + Pinia + Web Components            | 仅参考设计思想，**不拷贝代码**       |
| 3   | myprint            | Apache 2.0（根目录 LICENSE.txt；roadmap 原表误写"无 LICENSE"，已修正） | Vue 3 + TS + Vite monorepo                | 可参考设计与代码，引用需附声明       |
| 4   | fastprint-designer | 木兰宽松许可证 v2                                                      | Vue 3 + Vite + Element Plus + Interact.js | 可参考设计与代码                     |
| 5   | vue-plugin-hiprint | MIT（基于 hiprint 2.5.4）                                              | Vue 2/3 + jQuery                          | 完全可参考                           |
| 6   | vue-print          | MIT（Lodop/C-Lodop 控件本身为商业软件）                                | Vue 3 + TS + Lodop                        | 项目代码可参考；Lodop 依赖不建议引入 |
| 7   | report-designer    | 无 LICENSE                                                             | 自研框架（多合一设计器）                  | 仅参考设计思想，**不拷贝代码**       |
| 8   | open-press         | Apache 2.0                                                             | Vue + React + TS monorepo                 | 可参考设计与代码                     |

**合规红线**：AGPL-3.0 与无 LICENSE 项目（openprint、vue-print-designer、report-designer）只提取架构思想与算法思想并独立实现，不复制代码、不做翻译式改写；JSON 字段命名等功能性结构不受版权保护，但本项目 schema 命名自行设计。Apache 2.0 / MIT / 木兰项目可参考代码，引用片段须附版权与许可声明。

---

## 2. 逐项目调研

### 2.1 openprint（AGPL-3.0）

**定位与技术栈**：Web 打印模板可视化设计器（面单/发票/标签/报表），纯前端零后端。单包应用按目录分层：`src/core`（引擎，纯 TS 零框架）+ `src/design`（Vue3+Naive UI+Fabric7+Pinia 设计器）+ SDK 双入口（浏览器与 Node，仅渲染 HTML）。重依赖（bwip-js/qrcode/KaTeX/jspdf/svg2pdf 等）全部动态按需加载。

**架构分层**：UI 层 → SDK 契约（`render`/`renderDocument`/`createHeadless`）→ 排版引擎 layout-engine（分页/表格/分组/表达式/绑定）→ 渲染引擎 renderer-html → 导出引擎 → print-client。核心思想：**排版产物是纯数据中间模型**（已定位、已绑定、已测量的 PlacedNode，零 DOM/Fabric/Vue），渲染后端可替换。

**模板数据模型**：TemplateData → Document{type, page, sections} → Section(header/body/footer) → controls。PageSetup 存精确数字（width/height/unit(mm|in|pt)/orientation/margin/水印/minPages）。13 种控件：text/image/table/barcode/qrcode/richtext/rect/line/chart/math/signature/zone/labelgrid。ControlBase：id/type/left/top/width/height/angle/printable/visibleIf/locked。文本三态 `contentType: fixed|variable|expression`。表格：columns（field、列宽、format、aggregate）+ cells 设计期网格（运行期渲染真理源）+ options（repeatHeader/repeatFooter/pageRows:auto/keepTogether/summaryRow）+ groupBy + dataSource 或内嵌 data。

**渲染流程**：layout() = 单位换算 → 正文结构分析 → DataBinder 解析（条码/二维码 SVG、KaTeX 等异步资源全部前置解析）→ 共享离屏 DOM 真实测量文本换行 → TableEngine 两步（先建模全部行高，再纯几何切片）→ 产出 LayoutPage[] → renderHtml 机械翻译为 mm 绝对定位 HTML + @page CSS。**渲染器刻意"笨"**：不做测量/换行/判断，避免"测量一套规则、渲染另一套"导致错位。

**打印与导出**：预览与打印共用 iframe srcdoc 自包含 HTML，打印即 `iframe.contentWindow.print()`，@page 写死纸张尺寸。PDF：jsPDF 逐页栅格化为位图底图 + 图表 svg2pdf 矢量注入。静默打印：HTTP 推送本机 C++ Qt 客户端（127.0.0.1:18888），载荷支持位图 PDF / 自包含 HTML / ESC-POS/TSC/ZPL 指令直通。

**分页方案**："绝对定位+单表流动"：正文控件不参与文档流，唯一数据表格按行流过 N 页；表格上方控件仅首页、下方控件下移至末页；每页重复内容归 header/footer section（ERP 单据式结构）。支持每页行数 auto、行 keepTogether、表尾每页合计 vs 仅末页、MAX_PAGES 防死循环、minPages 手动加页。

**数据绑定**：值三态（固定值/binding 路径/expression）；自研 Pratt 表达式解析器（约 900 行，白名单运算符、禁函数调用，CSP 安全），`{{}}` 插值+管道过滤器，EvalContext{data,row,rowIndex,page,pages}；visibleIf 与表格聚合复用同一引擎。

**设计器交互**：Fabric 画布，协议层 mm、画布层 px 统一换算；SmartGuides 边缘+中心吸附；表格/图表用 Fabric 底图+HTML overlay 双层；命令模式 undo/redo + 连续拖拽批合并（栈限 200）。

**对本项目的借鉴**：① 排版产物=纯数据中间模型的分层（与 flux-json 的 schema→编译→渲染同构）；② 渲染层刻意笨、排版层负责一切测量；③ 真实 DOM 文本测量；④ 单表流动分页+建模/切片两步法；⑤ 三态 contentType；⑥ 重依赖动态加载。不适用：Fabric 位图画布交互层、Pinia 拆法、C++ 客户端。

### 2.2 vue-print-designer（AGPL-3.0）

**定位与技术栈**：可视化打印设计器（标签/票据/表单），Vue 3.5 + Pinia + Vite 6 + Tailwind，依赖极少。跨框架方案：`PrintDesignerElement extends HTMLElement`，attachShadow 后在 Shadow DOM 内挂载整个 Vue 应用；对外用 observedAttributes + 实例方法（`print/export/loadTemplateData/setVariables`）+ CustomEvent 作 API。

**架构分层**：设计器（canvas/elements/properties/layout 组件 + Pinia store，actions 拆 history/element/selection/guide/table）；渲染引擎（renderEngine：iframeRenderer + pagination + imageRenderer + domToImage + pdfBuilder，工厂函数组装）；打印通道（usePrint 编排 + printChannel，browser/local/remote 三模式）；模板 CRUD（localStorage 或远程 API，scopeId 隔离多实例）。

**模板数据模型**：`{pages:[{id,elements}], canvasSize, guides, headerHeight/footerHeight, watermark, testData, availableVariables}`。元素为绝对定位 px 模型（x/y/w/h + type + content + variable + style）；10 种类型：text/image/table/pageNumber/barcode/qrcode/line/rect/circle/multiLabel。表格扩展：columns(field/header/width)、data、autoPaginate、tfootRepeat、footerData、customScript。页眉页脚非独立区域，而是页面级高度阈值+元素位置判定。纸张为 96dpi px 常量表（A4=794×1123，含 58/80mm 热敏、241mm 针式连续纸）。

**渲染流程**：打印态用 PrintRenderer 复用设计器 Canvas 渲染进隐藏 iframe → 在 iframe DOM 上跑分页 → domToImage（DOM 序列化为 SVG foreignObject → canvas → 每页 JPEG）→ 自研极简 pdfBuilder 按 PDF 1.4 手写二进制拼合多页 JPEG（零第三方依赖）。浏览器打印走 blob URL + window.print。

**静默/云打印**：统一策略是先合成 PDF Blob，再装 payload（printer、份数、pages 范围、layout、color/sides/paper/tray）。local 模式：WebSocket 连本机客户端（地址+secretKey 鉴权），任务串行队列、等回执；remote 模式：WebSocket 连云中转（token 鉴权）下发指定在线客户端。任一通道未连接自动回退浏览器打印。

**分页算法**（重点，思想层面）：核心是"渲染后测量 + DOM 克隆拆分 + 多轮收敛"，非流式排版：

- 元数据前置：每元素 wrapper 带原始 top/height、flow-id、flow-kind（table/auto-height）属性；内容区高 = 页高 − 页眉 − 页脚 − 页距。
- 表格：解除固定高度让内容自然展开；若表底超限，利用行 bottom 单调性**二分查找**第一个放不下的行作为切点；克隆整个元素到新页，旧表删切点后行、新表删切点前行。整表放不进新页且不在页顶→整体后移（防孤行）；切点为 0 且已在页顶→强制保留一行（防死循环）。tfoot 重复时预留其测量高度，每页拆分后重算页内汇总。
- 自动高度文本：**二分猜字符长度**——每次写入前缀文本再量实际底边；切点归一化到最近换行/空格；后半段克隆到新页，首块保留垂直对齐补偿。
- 新页由工厂创建：复制页面样式，按区域阈值整体克隆页眉/页脚元素及 repeat-per-page 元素。
- 位置收敛：流块膨胀后，其下方固定元素按"原始间距"整体平移；两阶段策略（拆分链中间页只重排流块，链结束后统一收敛固定元素），溢出量向后页传递防重叠。
- 外层多轮 pass 循环（上限 60）防未收敛；读写分离批测、预计算流块列表避免 O(n²)。局限：仅 Y 轴，旋转元素跳过。

**数据绑定**：文本 content 内嵌 `@key` token；求值优先级：导出时 variables（业务数据）> 设计态 testData。表格绑数组变量（行对象按列 field 取值）；页内汇总用 customScript（传当前页行数据+页脚数据，回写 tfoot）。宿主可注入变量树供面板选择，也可导出"空值模板"作为变量 schema。

**设计器交互**：ElementWrapper 统一承担拖拽/8 向 resize/旋转手柄；吸附候选点=用户参考线+其他元素边缘/中心，阈值约 6px 取最近；旋转磁吸 0/90/180/270；撤销=pages 全量快照栈+actionKey 去重；属性面板为声明式 schema。

**对本项目的借鉴**：(a) **分页思想可直接移植**——渲染后测量+克隆拆分+二分切点+多轮收敛+防死循环规则+页眉页脚区域克隆，与 UI 框架无关，React 中可用隐藏渲染层+effect 后测量实现；(b) 统一 PDF Blob 中间产物的打印路由；(c) 本地 WS 客户端静默打印协议；(d) WC 外壳+实例方法/事件 API 适合嵌入 flux 平台；(e) 声明式属性面板 schema。不适用：绝对定位 px 模型需映射层；DOM→foreignObject→JPEG→PDF 是位图路线（文字不可选）；Pinia→Zustand 需重写。

### 2.3 myprint（Apache 2.0）

**定位与技术栈**：一站式 Web 打印设计器（模板设计+预览+打印/导出）。Vue 3.4 + TS + Vite，pnpm monorepo：`packages/design`（核心库 myprint-design）、`packages/demo`、`packages/docs`；配套独立 server/desktop/docker。核心库约 180 个源文件。

**架构分层**：Pinia 多 store（app/config/dragStore/socket）+ mitt 事件总线；组件四层：design（画布，按类型分目录）/preview（分页渲染）/print（输出通道）/content（属性面板/工具栏/控件列表）。交互基于 egjs moveable+selecto（内含混淆打包产物，不宜拷贝）。

**模板数据模型**：Template{id, content}；Panel 继承 Container：宽高 + PageUnit(px/mm/cm/in)、pageSize（标准纸型或 AutoHeight）、orientation、pageHeader/pageFooter 元素、groupList、auxiliaryLineList（参考线）。元素 type：Text/TextTime/Image/DataTable/FreeTable/Rect/横竖实虚线/Container/PageHeader/PageFooter/PageNum/Svg 系列/DrawPanel。属性在 option（字体/边框/旋转/fixed 固定定位/displayStrategy 首/末/奇/偶页/formatter 等），runtimeOption 明确"不提交后台"。**多级表头建模**：tableHeadList 为行×列二维数组 + 表头单元格递归 columnList（rowspan/colspan）；statisticsList 统计行支持 Sum/Avg/Count/Max/Min/CustomFormula 与 everyPageStatisticsIs（每页小计）。

**渲染流程**：纯 HTML+CSS 绝对定位。Panel + previewDataList → autoPage() 产出一组分页 page → 隐藏渲染真实 DOM → 按 outerHTML 提取 HTML 字符串 → 三通道消费。

**打印与导出**：7 个入口——浏览器打印（隐藏 iframe 注入 `@page{size}` 后 contentWindow.print()）；本地 PDF（html2canvas 逐页 JPEG + jsPDF，位图）；本地图片；服务端（POST HTML）；客户端（WebSocket `ws://127.0.0.1:9898`，命令字 print/printerList/generatePdf/ping，taskId→Promise 映射回包，心跳+自动重连）。

**分页方案**：真实 DOM 测量——元素按 y 排序，逐个放入当前页后读 clientHeight/offsetTop，越界即 newPage，页头/页脚每页重铺。DataTable 逐行 append+测量：超限则 pop 该行、标记续排、递归下页，可选重复表头，统计行按页计算。超长自动高度文本用**二分查找**截断续页。PageNum 等 fixed 元素每页复制，按 displayStrategy 过滤。AutoHeight 纸型单页撑高。

**数据绑定**：previewDataList 为记录数组（每条记录一套页面）；取值链：previewData[field] → formatter（`{{var}}` 模板替换）→ 设计期 data；内置变量 pageIndex/pageSize/nowDate/行号；无真正表达式引擎。

**对本项目的借鉴**：模板模型（Panel/元素枚举/多级表头二维数组+递归列/统计行/displayStrategy）；DOM 实测自动分页（表格跨页续排、每页表头、页小计、文本二分截断、AutoHeight）；三输出通道复用同一分页 HTML；iframe `@page` 打印；taskId-Promise 的 WS 协议；`{{var}}` 轻量 formatter。不适用：Vue 组件、nextTick 测量（React 改 useLayoutEffect/flushSync）、html2canvas+jsPDF 位图 PDF、混淆的 moveable 产物。

### 2.4 vue-print（MIT，基于 Lodop）

**定位与技术栈**：基于 Lodop 的可视化拖拽打印模板设计器。Lodop 是浏览器打印控件：现代浏览器走 C-Lodop 云打印（本机安装 exe 启动本地服务 localhost:8000/18000，页面注入 `CLodopfuncs.js` 获得 `LODOP` 对象），能精确控制纸张/位置并静默直打。Vue 3.5 + TS + Vite 6 + Pinia + Element Plus。

**架构分层**：views（模板列表/设计器壳）+ components/print（画布+自研拖拽+元素渲染件+属性面板残桩）+ utils/print（LodopLoader 动态加载与安装引导、LodopPrintAdapter 核心适配器、ExportUtils）。状态双轨（Pinia store + class 单例观察者），存在状态重复。

**模板数据模型**：`PrintTemplate { id, name, width, height(mm), items[] }`；元素 discriminated union 6 类：TEXT/IMAGE/BARCODE/LINE/RECT/TABLE；基类 id/type/content/left/top/width/height/zIndex/locked。无多页概念，localStorage 持久化。

**打印链路**：加载 CLodopfuncs.js（本地 HTTP 服务注入脚本）→ `getLodop()` 取对象 → `PRINT_INIT`/`SET_PRINT_PAGESIZE` → 按类型映射 `ADD_PRINT_TEXT/IMAGE/BARCODE/LINE/RECT` + `SET_PRINT_STYLE` → `PREVIEW()` 或 `PRINT()`。纯 Web 兜底：html2canvas + jsPDF 单页 PDF，或 outerHTML 复制到新窗口 window.print。

**分页**：无真正分页（无 NEWPAGE），单纸张单页；表格靠 Lodop 自行分页，设计器不感知。**数据绑定**：无字段绑定与表达式，content 是静态字符串。**交互**：按钮点击添加元素、自研鼠标拖拽/8 向 resize/旋转、30 步快照 undo/redo；属性面板仅坐标尺寸，成熟度 demo 级。

**对本项目的借鉴**：Lodop 依赖本身不建议引入（需安装 exe、Windows 主、商业授权）；可借其**可插拔打印后端**思路——模板 JSON → 打印指令的适配层（本项目可定义 PrintBackend 接口：browser-print / jsPDF 实现，Lodop 作可选企业增强）。mm 为单位的绝对定位模型 + discriminated union 元素类型、html2canvas+jsPDF 零安装兜底可借鉴；Vue 组件、双轨状态、无分页无绑定不适用。

### 2.5 fastprint-designer（木兰宽松 v2）

**定位与技术栈**：医院单据类 Web 打印模板设计器，Vue 3.5 + Vite + Element Plus + JsBarcode + qrcode，状态用 Vue Composition API 模块级单例。**关键事实：`interactjs` 仅在 package.json 依赖中，源码零引用**——拖拽/缩放均为原生 mouse 事件手写。项目仅 5 次提交（1861 行），属早期原型。

**模板数据模型**（以 `template-all-components.json` 为准）：`{name, width, height, paper:"A4", unit:"pixel", elements[]}`，无 orientation/margin。元素通用六件套 + 四槽：`id`（`type_序号`）、`type`、`x/y/width/height`、`style`（文本用）、`title`（静态文本/标注）、`field`（绑定字段名）、`testData`（测试值）、`options`（类型私有配置）。元素类型仅 5 种：text/image/barcode/qrcode/table。表格列 `columns[{title,field,width,textAlign}]` + `dataField` + `headerHeight/rowHeight`；条码选项 `barcodeType/textVisible/lineWidth`；二维码 `margin/errorLevel`。

**渲染与绑定**：无独立渲染引擎，Vue 组件 v-for 生成绝对定位 div，条码/二维码渲染到 canvas，deep watch + nextTick 重绘。数据绑定约定式：`field` 存字段名、`testData` 存预览值；渲染 fallback `testData || field`（语义含糊）。**无打印功能**（README 明确打印由独立仓库承担）、**无分页**。

**设计器交互**：document 级 mouse 事件拖拽（位移除以 zoom 修正缩放）、网格吸附 `Math.round(v/10)*10`、8 向缩放手柄（八分支 switch + 中心点不变重算）、HTML5 原生 dragstart/drop 携带完整默认元素、el-collapse 按类型分区属性面板、快捷键 input 聚焦跳过、快照式 undo/redo（上限 50）。

**对本项目的借鉴**：schema 字段设计（通用六件套 + `style/title/field/testData/options` 四槽分层是清晰的最小完备模型；`options` 收纳类型私有配置、`field/testData` 分离绑定与预览）；纸张预设表与 mm↔px 换算系数；表格列描述与条码/二维码选项集；交互细节（位移除以 zoom、实时坐标角标、元素默认值集中工厂函数）。不适用：无打印与分页、无辅助线/标尺/旋转、快照历史、764 行巨石组件、testData 存 JSON 字符串。

### 2.6 vue-plugin-hiprint（MIT，生态最成熟）

**定位与技术栈**：纯 JS 工具库（非 Vue 组件库），对已停更的 hiprint 2.5.4（LGPL）的深度改造 fork，MIT。核心是 webpack 产物（11379 行、类名混淆）；jQuery 3.6 是基础设施（DOM 拼接/事件/拖拽插件）；核心完全框架无关（官方有 react_demo、jQuery/uniapp 用法）。

**架构分层**：hinnn 工具 → 元素类型注册（provider + PrintElementTypeManager）→ 元素类（BasePrintElement 及 text/long-text/image/table/html/hline/vline/rect/oval/barcode/qrcode 子类）→ Paper → Panel → PrintTemplate → hiwebSocket（socket.io 静默打印）→ plugins（iframe 浏览器打印、qrcode、watermark）。CSS 两套：设计器样式 + `print-lock.css`（打印锁定样式，`media=print` link 引入）。**元素注册**：provider 调 `addPrintElementTypes` 注册 `{tid, title, type}` 组；`tid` 定位模板项、`type` 映射实现类——与 flux renderer 注册表同构。

**模板数据模型**：`{panels:[{paperType:"A4"|自定义, width, height(mm), orient, paperHeader/paperFooter(pt 页眉/页脚线), panelPaperRule odd/even, panelPageRule, 页码四要素, firstPaperFooter/evenPaperFooter/oddPaperFooter/lastPaperFooter, leftOffset/topOffset, fontFamily, watermarkOptions, printElements[]}]}`。printElement：`{tid, type, options}`；options 核心字段：title/field/testData、left/top/width/height(pt)、zIndex、textType(text|barcode|qrcode)、barcodeMode、qrcodeLevel、barColor/barTextMode/barWidth/barAutoWidth、字体类、颜色边框类、transform(rotate)、fixed、showInPage、pageBreak、dataType+format、columns 配置（tableHeaderRepeat: first/last/all/none、maxRows、gridColumns）、每列聚合 tableSummary（sum/count/avg/min/max/totalCap 人民币大写/自定义 formatter）、groupFields/groupFormatter/groupFooterFormatter。columns 是二维数组支持两级表头 rowspan/colspan；列字段 {title,field,width,align,fixed,checked,tableTextType（条码/二维码列）}。注意：formatter/styler 以**函数 toString 存进 JSON**（与严格 JSON schema 冲突，本项目应改为表达式/注册函数名引用）。

**渲染与打印链路**：全程 jQuery 拼 DOM。设计态 `design(container)` 生成 panel>paper>element 层级（纸 mm 定宽高、元素 pt 绝对定位）；打印态 `getHtml(data)` 在 0 高隐藏临时容器逐元素生成并分发到各 paper。**打印调用链**：浏览器 `print(data)` → getHtml → 隐藏 iframe srcdoc 写入 print-lock.css link + 打印 HTML → 轮询图片加载完 `contentWindow.print()`；静默 `print2(data,{printer,title})` → socket.io emit `news` 事件 `{id, html, templateId, printer}` → 默认 `http://localhost:17521` → electron-hiprint 客户端（URLScheme 唤起）用 Chromium 渲染调系统驱动；超大 HTML 分片（5 万字符/片）；多模板批量打印；PDF 用 dom-to-image + jsPDF 逐 paper addImage。始终是 HTML 渲染路线，无 cpcl/esc 指令生成。

**分页方案**：`Panel.getHtml` 是调度核心：元素按 top,left 排序；每元素返回携带游标的结果（beginPrintPaperIndex/printTopInPaper/bottomInLastPaper）；超出 paperFooter 即 createNewPage（新页 top 从 paperHeader 起）。三类分页器：普通元素放不下整体移下页；表格把表放临时容器**逐行实测**（pt→px），循环填行直到本页上限，新页重画表头（tableHeaderRepeat 控制），tfoot 汇总仅 last 页，空间不足输出红字提示而非死循环；长文本按字符切分 + **二分实测**找分页字符点。页眉/页脚：fixed/header/footer 元素每张纸重复渲染，showInPage 按页码显隐；first/even/odd/last 四档页脚线；odd/even 自动补空白页实现双面排版；页码续排。

**数据绑定**：field 支持 `a.b.c` 嵌套取值；无 field 用 testData/默认值；formatter/styler 自定义；表格 field 取数组循环行，groupBy 按 groupFields 分组 + 组脚聚合；列级聚合含人民币大写。

**设计器交互**：hidraggable/hidroppable/hireizeable；`HIPRINT_CONFIG` 定义 movingDistance(1.5pt)、adsorbMin(3pt 吸附)、adsorbLineMin(6pt 吸附参考线)、标尺/网格/坐标宽高提示；方向键微移、ctrl 多选与框选、ctrl+C/V 粘贴 JSON、右键菜单（表格插删行列/合并单元格）；undo/redo 为 JSON 快照栈（≤50 条，事件驱动推入）；**属性面板配置即数据**（按 config 的 tabs/supportOptions 生成表单）。

**对本项目的借鉴**：① schema 命名（panels/printElements/options 扁平结构、纸张 mm + 元素 pt 的单位约定、paperHeader/Footer 线定义内容区）；② 元素类型注册表（tid+type → 实现类 + optionItems/supportOptions，provider 可插拔对应 flux-renderers-\* 分包）；③ 分页策略整体移植（排序→带游标分页结果→满页开新页→fixed 每页重绘→表格逐行实测+表头重复+汇总脚；React 化用隐藏测量容器替代 jQuery 临时容器，分页结果即"每页一个 React 子树"）；④ 打印链路（iframe srcdoc + media print css + 图片轮询；socket 协议可对接 electron-hiprint 获得静默打印）；⑤ 需替换项：jQuery DOM/拖拽→dnd-kit/react-rnd、hinnn→dayjs/lodash、eval 页码→函数插值、函数字符串存 JSON→表达式引用、JSON 快照 undo/redo 与 zustand 时间旅行契合。

### 2.7 report-designer（无 LICENSE，仅思想）

**定位与技术栈**：多合一打印/可视化设计器（报表、标签、IoT 大屏、小票），2018 年起步，2020 年中因源码被盗转为闭源至今活跃。仓库形态：**无 src，仅两个自研框架单文件产物** `dist/designer.js`（约 494KB）与 `dist/viewer.js`（约 152KB），附 9 语言 i18n。多场景统一方式：同一模板 JSON 内用页面级 `viewer` 字段区分五种渲染器（fixed 静态分页 / stack 流式分页 / label 标签 / iot / board 看板），2025 年新增 receipt 小票与 mixture 混合渲染。

**架构分层**：设计器与预览器彻底分离（设计时产物是模板 JSON，运行时只加载 viewer）；宿主通过 `designer.setup()`/`viewer.install()` 传入端点映射与 request/response/io 拦截器钩子；模板经"模板编译器"编译为优化代码执行；配套 rds 服务（Node+Puppeteer）承担服务端打印。

**模板数据模型**（依 apis/\*.json 样例推断）：`{unit, 辅助线, page, elements}`；page 承载纸张模型：viewer 类型、宽高（带单位）、页数、缩放、份数 copies、空白占位 blank、labelCol/labelGap（标签多列排距）、网格、字体、背景图。elements 为扁平数组，props 分公共几何（x/y/宽高/透明度/旋转/锁定/动画）与元素特有属性，及 `bind:{tag 数据源地址, id, fields[]}`。

**渲染与打印**：`viewer.getHTML({stage, data})` 返回 `{styles[], pages[]}`（按页切分的 HTML）→ 自行拼装或 `viewer.print()` 直印；数据可由 viewer 按 bind 远端获取，也可外部预取后注入加速。打印：浏览器预览页；LODOP 逐页 `ADD_PRINT_HTM`；rds 服务枚举打印机→按 taskId 缓存任务→分批传页→Puppeteer 自定义纸张 mm 尺寸 `page.pdf()`（支持双面、deviceScaleFactor 3、SumatraPDF/lp 直连）。

**分页方案**：分页责任在 viewer 端按场景策略化：stack 流式分页（动态避开页脚、每页条数）、label（N 列标签拼版+空标签占位+份数）、receipt 连续纸；设计区以"投影"预览分页位置；mixture 将多种分页策略产物合并输出。

**数据绑定**：数据源面板来自端点返回的分组字段树 `{name, tag, id, fields[]}`；元素 bind 引用 tag+id；iot 场景扁平 key-value 经 ws/sse/http 推送实时刷新；格式化走可注册的自定义 JS 函数；字段可多次绑定、跨实例拖拽绑定。

**对本项目的借鉴**：① 设计器/预览器双产物分离（对应 flux 的 designer/renderer 切分）；② 单模板 schema + viewer 判别字段 + 分页策略注册表，统一报表/标签/小票；③ 纸张模型（copies/blank/labelCol/labelGap/背景平铺）可充实 print 页面 meta；④ 服务端 Puppeteer 自定义纸张 PDF；⑤ setup 端点映射 + request/response 拦截器的宿主集成契约；⑥ bind 外部预取加速；⑦ 按 viewer 的元素能力矩阵。不适用：混淆元素 ID、自研事件框架、闭源产物组件层。

### 2.8 open-press（Apache 2.0，与本项目架构最接近）

**定位与技术栈**：类 hiprint 的开源 Web 打印模板设计器+渲染引擎（MVP 早期 v0.1.0）。TS + pnpm monorepo；Vue 3.5 承载设计器主体，React 19 仅是 61 行 iframe 预览壳。core/designer-core/renderer 三包**零第三方运行时依赖**。"数据驱动"：模板 JSON 只存绑定规则（`binding.path`/`dataPath`）不存业务值，运行时数据由渲染器注入。包划分：`core`（schema+绑定工具）、`designer-core`（无头编辑状态机）、`renderer`（模板+数据→HTML）、`vue`（适配层）、`react`（占位）。双框架支持 = 框架无关三核心 + 薄适配层。

**架构分层**：五层：业务系统 → Vue/React 适配 → designer-core → renderer → core。状态：`OpenPressDesigner` 类私有持有 template + selectedIds，全部修改走命令 API（addComponent/updateComponent/moveComponent/resizeComponent/reorder/align 等），自写 40 行 Emitter 发布 change（深拷贝快照）/select 事件；吸附、边界等交互规则刻意留在适配层，core 只收最终 frame。设计态由 Vue 自绘组件（字段显示 `${字段名}` 占位），不走 renderer；renderer 只服务预览/打印态。

**模板数据模型**：根 `OpenPressTemplate`：`schemaVersion / title / page{width,height,unit:'mm'|'px'} / pages[] / dataSchema? / sampleData?`。Page：可选覆盖纸张 + `guides{margins,headerHeight,footerHeight,gutter}` + `components[]`。组件为 type 判别联合 8 种：text（支持 `{{path}}` 插值）、field（label+binding）、richText、image（src/binding+fit）、line、qrCode/barCode、table（dataPath+columns+summary）。通用基座：`id/name/type/frame{x,y,width,height,rotate?}/style/locked/visible/meta`。**OpenPressStyle 是结构化样式白名单**（font/color/textAlign/border/padding/opacity…），禁止任意 CSS 字符串。表格列 `{id,title,binding,width,align,format}`，合计按 columnId 关联 sum/count。`dataSchema.fields[{path,label,type,children}]` 是给设计器的数据字段目录。

**渲染流程**：解释执行无编译：`renderTemplateToHtml(template, data, options)` 单遍字符串拼接；`renderComponent` 按 type switch 分发（组件注册表被列为后续扩展点）；frame 转内联绝对定位样式，白名单字段映射；输出完整 HTML（内联 baseCss 含 `@page` 尺寸）或 body 片段。文本均经 escapeHtml。与 flux 对比：flux 是 type→组件注册表+schema 编译+React 组件树；open-press 是硬编码 switch+字符串模板。相同点："type 判别 + 纯数据输入"。

**打印与导出**：playground 链：renderTemplateToHtml → `window.open('')` → `document.write(html)` → 延时 `previewWindow.print()`。CSS 靠 `@page{size;margin:0}`、`page-break-after:always`、`tr{break-inside:avoid}`、`thead{display:table-header-group}`。**无 PDF 专用导出器**；设计意图是同一 HTML 可喂服务端无头浏览器出 PDF。

**分页方案**：模板页≠打印页：`paginatePage` 可把一个模板页拆成 N 个打印页。当前只处理"单页内一个增长表格"：按"列宽/字号 + 加权字符长度（全角算 2）→ 估算每行行数"做保守行高，再按表格 frame 高度贪心装箱切段；末段放不下合计行时行回流新段；**每段重复表头、合计只在最后一段、非表格组件只在第一页**。文档明示不是精确排版引擎，精确方案需 DOM 测量或服务端 PDF 引擎。

**数据绑定**：`Binding{path, fallback, format}`。getValueByPath 支持 `a.b`/`items[0].name`/`items.0.name`，缺失返回 undefined 不抛错；resolveBinding = 取值→fallback→formatValue（number/currency/date/boolean trueText/falseText/prefix/suffix，且兼容 `{showFieldValue|label|value}` 形态——专为对接低代码表单数据）。文本插值用正则替换 `{{path}}`，源码注释明确"故意只做轻量插值而不是表达式引擎"。

**设计器交互**：画布按 px 换算的纸张 div，组件绝对定位；pointerdown 驱动 move/resize，**基于 pointerdown 时刻的原始 frame 快照算增量**（防连续 update 叠加位移）；8 向缩放、框选、Shift/Cmd 多选、基于外接矩形的多选对齐；snapFrame 产出吸附线+近距离标注；页眉/页脚/边距/装订线画成半透明辅助区；左侧面板用 dataTransfer 自定义 MIME 拖入创建；属性面板只发局部 patch（frame/style 浅合并）。

**对本项目的借鉴**：① schema 结构可直接映射 flux（schemaVersion ↔ 版本迁移；frame+type 判别联合 ↔ flux schema type；locked/visible/meta ↔ node meta；dataSchema ↔ 数据源面板树；结构化 style 白名单与 flux styling contract 同思路，可抄字段集作为打印样式 token 起点）；② 渲染输入契约：`render(template, data)` 纯函数、模板/数据分离、**设计态与打印态双渲染**（共享 schema 不共享实现）；③ `path+fallback+format` 三段式可映射为 flux-formula 表达式的退化形态——打印 renderer 里把 binding.path 升级为 formula 表达式即获得求值能力；formatValue 规则值得直接移植；④ 分页（加权估行高+贪心装箱+分段重复表头+`@page`/page-break CSS）可作 v1 低成本方案，短板（估算不准、单表格）正是 flux 用 DOM 测量改进的切入点；⑤ 交互细节：pointerdown frame 快照算增量、dataTransfer 自定义 MIME、属性面板局部 patch；⑥ 缺口即机会：无撤销重做、无组件注册表、无表达式引擎、分页粗糙——flux 的 editor-core、registry、formula 引擎恰好覆盖。

---

## 3. 本项目复用分析（逐项核实 roadmap 复用表）

| roadmap 复用项                              | 实测结论                                                                                                                                                                                                                                           | live 证据                                                                                                                                                                                                                                |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 设计器核心框架（core + renderers 分包模式） | **可复用分包模式**：flow-designer-core（状态/命令/投影，零 React）+ flow-designer-renderers（React 画布/面板）。print 包按同模式拆 `flux-print-core` + `flux-print-renderers`                                                                      | `packages/flow-designer-core/src/`（core.ts、tree-projection.ts）、`packages/flow-designer-renderers/src/`                                                                                                                               |
| 编辑器核心 undo/redo                        | **直接复用**：`UndoCommandStack<TDiff>` 纯逻辑栈（深度 100、entry 持 forward+inverse），配合 `EditorDomainAdapter<TDocument,TDiff>` + `createEditorCore`。仓库内完整先例：dashboard 编辑器（canvas+inspector+palette+domain-adapter 全套）         | `packages/editor-core/src/undo-command-stack.ts:17`、`packages/editor-core/src/types.ts:64`、`packages/flux-renderers-dashboard/src/editor/`（dashboard-domain-adapter.ts、editor-canvas.tsx、editor-inspector.tsx、editor-palette.tsx） |
| 属性面板框架                                | **可参考**：DefaultInspector 按 nodeTypeConfig.inspector.body 渲染，snapshot selector 细粒度订阅；打印属性面板建议同构（按元素类型分区），但不直接复用 flow-designer 的 context                                                                    | `packages/flow-designer-renderers/src/designer-inspector.tsx`                                                                                                                                                                            |
| 拖拽交互                                    | **仅参考思想**：flow-designer 画布是 xyflow 节点-边图，非自由元素拖拽；打印设计器的自由拖拽/8 向 resize/吸附需新建（调研结论：pointer 事件自研或引入成熟库；vue-print-designer 的"pointerdown frame 快照算增量"与 hiprint 的吸附参数设计值得借鉴） | `packages/flow-designer-renderers/src/designer-canvas.tsx`（节点画布形态）                                                                                                                                                               |
| Canvas 渲染                                 | **不适用**：`flux-renderers-graph/xyflow-canvas.tsx` 是图编辑器适配器；打印是绝对定位 DOM 排版，无画布引擎依赖                                                                                                                                     | `packages/flux-renderers-graph/src/xyflow-canvas.tsx`                                                                                                                                                                                    |
| 数据绑定和表达式                            | **直接复用**：flux-formula 提供 parseFormula/createFormulaCompiler/evaluateAst/createFormulaRegistry；打印 schema 的绑定路径/表达式求值走同一引擎（open-press 的 `path+fallback+format` 三段式作为表达式退化形态）                                 | `packages/flux-formula/src/index.ts:1-10`                                                                                                                                                                                                |
| Schema 编译                                 | **可参考**：createSchemaCompiler/validateSchema 的编译-校验管线；打印模板 schema 较简单（绝对定位、无反应系统），预计只需轻量校验器而非完整编译器                                                                                                  | `packages/flux-compiler/src/schema-compiler.ts:32,269`                                                                                                                                                                                   |
| React 组件模式                              | **复用**（P1 裁定注记：打印设计器为独立 React 交互层，不走 flux RendererComponentProps/renderer registry 契约——P1 plan Non-Goals 已裁定；此处保留 flux 渲染器契约认知供打印组件未来嵌入 flux 页面时参考）                                          | `docs/references/quick-reference.md`、`packages/flux-core/src/types/renderer-core.ts:256`                                                                                                                                                |
| UI 组件库                                   | **直接使用**：Button/Input/Dialog/Tabs/Select 等全部就绪                                                                                                                                                                                           | `packages/ui/src/index.ts`                                                                                                                                                                                                               |
| Zustand 状态管理                            | **复用**：vanilla store + use-sync-external-store 模式                                                                                                                                                                                             | 全项目惯例                                                                                                                                                                                                                               |
| 测试框架                                    | **复用**：Vitest + Playwright 基础设施                                                                                                                                                                                                             | `playwright.config.ts`、各包 \*.test.tsx                                                                                                                                                                                                 |
| calendar print 已有实现                     | **直接复用**：html2canvas→PNG 导出 + window.print + `@media print` 标记类隐藏/强制打印色的 CSS 模式；P3 浏览器打印与 PDF 导出的仓库内先例                                                                                                          | `packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-export.ts:17-76`、`packages/flux-renderers-scheduling/src/calendar/utils/calendar-print.css`                                                                         |

**复用表未覆盖、但实际可复用**：

- **纸张模型**：`packages/word-editor-core/src/paper-settings.ts`——`PaperSettings{width,height,direction:'vertical'|'horizontal',margins:[4]}` + `PAPER_SIZE_PRESETS`（a2–a5/b4/b5，pt 单位，A4=595×842）。打印模板页面模型直接对齐该形状，避免两套纸张常量。
- **二维码生成**：`packages/flux-renderers-content/src/qrcode.tsx` 已用 `qrcode` npm 包（级别 L/M/Q/H 校验、前景色/尺寸 props）——打印二维码元素复用同一依赖与参数语义。
- **renderer 类型自动生成**：flux-guide 的 `generate-types.mjs` 从注册后的 RendererDefinition（fields/propContracts/eventContracts）生成 `.d.ts`——打印元素类型定义后可自动进入 flux-types 体系。

**不可复用、需新建**（附理由）：

- **自由元素拖拽/缩放/吸附**：仓库内无自由表单画布（flow=图、word=文档流、spreadsheet=网格、dashboard=栅格布局）。按调研结论新建（React + pointer 事件，参考 vue-print-designer/hiprint 的交互参数）。
- **分页引擎**：仓库内无任何分页实现（calendar print 是单页矩阵）。按调研提炼的"渲染后测量 + 克隆拆分 + 二分切点 + 多轮收敛"或 hiprint 的"游标式逐元素分发"新建。
- **条形码生成**：仓库无 barcode 生成库（barcode-input 只是扫描输入框）；需新增 `jsbarcode` 或 `bwip-js` 依赖。
- **打印模板 schema/编译**：全新，但绑定语义必须走 flux-formula、页面模型对齐 word-editor PaperSettings、RendererDefinition 注册模式对齐 flux-core。

---

## 4. 横向对比与关键结论

### 4.1 架构模式对比

| 项目               | 分层模式                                                | 状态管理                  | 渲染产物                 |
| ------------------ | ------------------------------------------------------- | ------------------------- | ------------------------ |
| openprint          | SDK 契约 → 排版引擎（纯数据 LayoutPage）→ 渲染器 → 导出 | Pinia ×3                  | mm 绝对定位 HTML         |
| vue-print-designer | 设计器 / 渲染引擎 / 打印通道三分                        | Pinia（actions 拆分模块） | iframe DOM → 位图 PDF    |
| myprint            | design/preview/print/content 四层组件                   | Pinia ×4 + mitt           | HTML 字符串三通道复用    |
| fastprint-designer | 单一巨石组件                                            | 模块级单例                | Vue 组件即渲染器         |
| vue-plugin-hiprint | 元素注册表 → 元素类 → Panel/Template → socket/plugins   | 事件驱动 + JSON 快照      | jQuery 拼 HTML           |
| report-designer    | designer/viewer 双产物分离 + 服务端 rds                 | 自研事件框架              | viewer.getHTML 分页 HTML |
| open-press         | 框架无关三核心（core/designer-core/renderer）+ 薄适配层 | 命令类 + Emitter 快照     | 解释执行 HTML 字符串     |

**共识结论**（本项目采用）：① 模板是纯 JSON schema，与渲染/交互解耦；② 设计态与打印态可双实现但必须共享 schema 语义；③ 排版/分页层负责一切测量，渲染层保持机械翻译；④ 打印产物 = 自包含 HTML（iframe srcdoc + `@page`）。

### 4.2 分页算法思想对比

| 项目                                  | 算法                                                                                                   | 可移植性                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| hiprint（MIT）                        | 游标式逐元素分发：排序 → 每元素返回带游标结果 → 超页脚开新页；表格临时容器逐行实测；长文本二分实测切分 | **高**（框架无关，隐藏测量容器可 React 化）——v1 采用 |
| vue-print-designer（AGPL，仅思想）    | 渲染后测量 + 克隆拆分 + 二分切点 + 多轮收敛（pass 上限）+ 防孤行/防死循环规则 + 页眉页脚区域克隆       | 思想可借鉴（防死循环、切点归一化）                   |
| openprint（AGPL，仅思想）             | 建模/切片两步法：先建全部行高模型再纯几何切片；单表流动                                                | 思想可借鉴（数据中间模型）                           |
| myprint（Apache 2.0）                 | 逐元素放入后 nextTick 读 clientHeight 越界翻页；表格逐行 append 测量；文本二分截断                     | 可参考                                               |
| open-press（Apache 2.0）              | 加权字符长度估算行高 + 贪心装箱；每段重复表头                                                          | 低成本但中文误差大，不采用为 v1 主方案               |
| report-designer（无 LICENSE，仅思想） | 按 viewer 场景策略化分页（fixed/stack/label/receipt）+ 混合输出                                        | 策略注册表思想可借鉴（v2）                           |

### 4.3 数据绑定机制对比

| 项目                  | 机制                                                    | 结论                                                                     |
| --------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| openprint             | 三态 contentType + 自研 Pratt 表达式（CSP 安全）        | 表达式引擎思想重；本项目已有 flux-formula                                |
| vue-plugin-hiprint    | field 嵌套路径 + formatter/styler 函数字符串存 JSON     | 函数存 JSON 与严格 schema 冲突，不采用                                   |
| open-press            | `path + fallback + format` 三段式 + `{{path}}` 轻量插值 | **可直接映射**：format 规则移植为声明式格式化层；path 升级为 flux 表达式 |
| myprint               | `{{var}}` 正则替换 + 内置页码变量                       | 轻量；内置变量集（page/pages/nowDate）可借鉴                             |
| vue-print / fastprint | 无绑定 / 约定式 field+testData                          | —                                                                        |

**结论**：本项目绑定统一走 flux-formula（`${var | FILTER}`），叠加 open-press 式声明式 `format`；行级 `$row/$rowIndex`、页级 `$page/$pages` 为内置变量。

### 4.4 输出通道对比

| 通道            | 采用                   | 说明                                                                      |
| --------------- | ---------------------- | ------------------------------------------------------------------------- |
| 浏览器打印      | ✅ v1                  | iframe srcdoc + `@page` + `contentWindow.print()`（4 个项目共识）         |
| PDF 导出        | ✅ v1 位图             | html2canvas + jspdf（roadmap 指定；位图文字不可选为已知限制）             |
| 服务端矢量 PDF  | 🔜 扩展位              | report-designer rds（Puppeteer 自定义纸张）思想                           |
| 静默打印/云打印 | 🔌 PrintBackend 接口位 | hiprint socket 协议、vue-print-designer WS 协议可作企业增强；Lodop 不引入 |

### 4.5 许可证合规结论

- **AGPL-3.0**（openprint：package.json 误标 GPL-3.0，以 LICENSE 为准；vue-print-designer：AGPL + 商业双授权口径）：零代码拷贝、零翻译式改写；本项目打印体系全部独立实现，文档仅引用思想并标注来源。
- **无 LICENSE**（report-designer，2020 年起有意闭源）：同上，仅设计思想。
- **Apache 2.0**（myprint；open-press——注意其 README 写 MIT 但 LICENSE 文件为 Apache 2.0 全文，以 LICENSE 为准）：可参考代码；引用须保留许可声明。myprint 的 moveable_js.js 为混淆产物，不参考。
- **MIT**（vue-plugin-hiprint；vue-print——Lodop 控件本身商业授权，不引入）：自由参考。
- **木兰宽松 v2**（fastprint-designer，README/package.json 写 ISC 系笔误，以 LICENSE 为准）：可自由参考。
- 本项目 schema 命名与代码全部原创；已修正 roadmap 中 myprint 的许可证误记（无 LICENSE → Apache 2.0）。

---

## 5. 对 P1–P4 的调整建议（roadmap Rule 3）

调研后确认 roadmap P1–P4 的工作项方向成立，以下为落地层面的建议（详细设计见 `docs/components/print/design.md`）：

1. **P1 包分工**：`flux-print-core` 应承载"纯 TS 引擎"（schemas/validate/unit/bind/layout/render-html/print/export-pdf），`flux-print-renderers` 承载 React 设计器与预览；比 roadmap 原文（renderers 里放 renderer-definitions）更明确——打印 HTML 渲染器属于 core 而非 renderers，因为它必须零 React 依赖（iframe/服务端复用）。
2. **P1 schema 落点**：`schemas.ts` 直接实现 design.md §4 的类型；页面模型对齐 `word-editor-core/paper-settings.ts` 的 `PaperSettings` 形状（跨包复用或形状复制，P1 执行时裁定，倾向形状复制避免给 print-core 引入 word-editor 依赖）。
3. **新增依赖**：`jsbarcode`（条码生成，仓库缺失）需在 P1 声明；`qrcode`（已有）；`html2canvas` + `jspdf`（P3，calendar 已用 html2canvas）。
4. **P2 设计器**：复用 editor-core（UndoCommandStack + EditorDomainAdapter），先例为 `flux-renderers-dashboard/src/editor/`；拖拽用 pointer 事件自研（dnd-kit 等库不擅长自由 resize+吸附组合），交互参数采纳调研结论（pointerdown frame 快照、3px 吸附阈值、网格 10mm）。
5. **P3 分页**：v1 采用 hiprint 游标模型 + 表格逐行 DOM 实测 + 文本二分切分；MAX_PAGES=500、防孤行、防死循环规则并入；P3.4 的"表格分组"裁剪为 footerAggregate（lastPage/everyPage），groupBy 多组分组列入 v2。
6. **P4 演示**：playground 页面建议提供 2 个模板示例（A4 单据含跨页表格、80mm 小票），e2e 覆盖设计器拖拽/属性修改/预览分页/打印 HTML 生成。

**结论**：P1–P4 工作项无需增删；上述建议在各自 plan 起草时吸收。
