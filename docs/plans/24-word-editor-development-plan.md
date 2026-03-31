# Word Editor 开发计划

## Purpose

基于 `@hufe921/canvas-editor` 构建一个类 Word 文档编辑器，作为 nop-chaos-flux 平台的文档模板设计器。整体功能布局仿照 SpringReport 的 docDesign 页面，但模板表达式体系采用 NOP 平台的 XLang 语法（`${expr}` + `<tag>content</tag>`），与 nop-entropy 的 WordTemplate 模型对齐。

## Research Basis

### SpringReport 实现分析

- **源码路径**: `~/sources/springreport/SpringReport-ui-vue3/src/views/editor/`
- **核心库**: `@hufe921/canvas-editor` v0.9.79（Canvas 2D 渲染的富文本文档编辑器）
- **数据模型**: 文档分为 `header`（页眉）、`main`（正文）、`footer`（页脚）三个独立 JSON 区域
- **工具栏**: Ribbon 风格，所有操作通过 `instance.command.executeXxx()` 命令模式
- **数据集管理**: 左侧面板，支持 SQL/API/MongoDB 数据源，字段一键复制插入
- **模板变量**: `{{数据集.字段}}` 语法，区块对 `{{?数据集}}...{{/数据集}}`
- **DOCX 导入**: 上传 DOCX → 后端 POI 解析 → JSON → canvas-editor 渲染
- **图表/条码**: 作为图片占位符插入，配置独立存储在 `docTplCharts` / `docTplCodes` 数组

### canvas-editor 项目状态

| 指标 | 数据 |
|------|------|
| Stars | 4,859 |
| Forks | 810 |
| License | MIT |
| 最新版本 | v0.9.130（2026-03-27） |
| 发版频率 | 1-2 周 |
| Open Issues | 60 |

结论：**项目活跃，可放心用于生产。**

### NOP WordTemplate 模板体系

- **参考路径**: `~/app/nop-entropy-wt/nop-entropy-master/`
  - `docs/dev-guide/report/word-template.md` — Word 模板语法指南
  - `docs/dev-guide/report/xpt-word-template.md` — 集成 NopReport 动态表格
  - `docs/theory/how-to-implement-visual-word-template-with-800-lines-of-code.md` — 设计原理
  - `nop-format/nop-ooxml/nop-ooxml-docx/src/main/java/io/nop/ooxml/docx/WordTemplate.java` — 核心实现
  - `nop-format/nop-ooxml/nop-ooxml-docx/src/main/java/io/nop/ooxml/docx/parse/WordTemplateParser.java` — 模板解析器

- **模板语法核心**:
  - 文本表达式: `${expr}`（EL 表达式，接近 JavaScript 语法）
  - 标签块: `<c:for var="item" items="${data.list}">...</c:for>`
  - 超链接标注: `expr:EL表达式` 或 `xpl:XPL片段`
  - 配对超链接: `xpl:<c:for var="order" items="${entity.orders}>"` ... `xpl:</c:for>` 表示块结构
  - 图片替换: `expr:resourceExpr`（返回 IResource 接口）
  - Xpt 表格: `xpt:table=true` 启用 NopReport 动态表格展开
  - 配置表: 文档尾部 XplGenConfig 表格，支持 dump/importLibs/beforeGen/afterGen

- **关键设计原则**:
  1. 普通文档就是合法模板（恒等变换）
  2. 扩展信息通过超链接承载（不破坏原始文档结构）
  3. 模板编译为 XPL 再执行（语法制导翻译）
  4. 支持自定义标签库扩展

---

## 与 SpringReport 的核心差异

| 维度 | SpringReport | 本项目 |
|------|-------------|--------|
| **模板表达式** | `{{数据集.字段}}` | `${expr}`（EL 表达式） |
| **区域/循环** | `{{?数据集}}...{{/数据集}}` | `<c:for items="${list}">...</c:for>` |
| **条件判断** | 无原生支持 | `<c:if test="${condition}">...</c:if>` |
| **图片变量** | `{{@数据集.字段}}` | `expr:${imageResource}` |
| **数据集概念** | SQL/API 数据集 + 字段列表 | 与 nop-entropy ReportDataSet 对齐 |
| **后端渲染** | Java POI 变量替换 | nop-entropy WordTemplate + XPL 编译执行 |
| **表格展开** | 无 | 支持 XptWordTable（NopReport 中国式报表展开） |
| **标签扩展** | 无 | 支持自定义 XPL 标签库 |
| **前端框架** | Vue 3 + Options API | React 19 + TypeScript + Zustand |
| **状态管理** | Vue data + 直接 DOM 操作 | Zustand store + React hooks |
| **代码组织** | 单文件 2500+ 行 JS | 按职责拆分的 TypeScript 模块 |

---

## Architecture Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                     Word Editor Page (Playground)                 │
│  ┌────────────┐  ┌──────────────────────────┐  ┌──────────────┐ │
│  │  左侧面板   │  │     canvas-editor 画布     │  │  右侧面板    │ │
│  │            │  │                          │  │              │ │
│  │ 数据集管理  │  │  header (页眉)           │  │ 属性面板     │ │
│  │ ├ 数据源   │  │  main   (正文)           │  │ ├ 文档设置   │ │
│  │ ├ 字段列表 │  │  footer (页脚)           │  │ ├ 纸张/边距  │ │
│  │ └ 模板变量 │  │                          │  │ └ 水印设置   │ │
│  │            │  │                          │  │              │ │
│  │ 模板片段   │  │                          │  │ 大纲/目录    │ │
│  │ ├ 循环标签 │  │                          │  │              │ │
│  │ ├ 条件标签 │  │                          │  │              │ │
│  │ └ 自定义   │  │                          │  │              │ │
│  └────────────┘  └──────────────────────────┘  └──────────────┘ │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    Ribbon 工具栏                              │ │
│  │ 撤销/重做 | 格式刷 | 字体字号 | 加粗斜体下划线 | 对齐 | 列表  │ │
│  │ 表格 | 图片 | 超链接 | 模板表达式 | 分隔线 | 分页符 | 搜索   │ │
│  │ 纸张设置 | 缩放 | 页面模式 | 打印 | 保存 | 导入/导出        │ │
│  └──────────────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────────────┤
│                         Package Layer                             │
│  ┌──────────────────┐  ┌───────────────────┐  ┌───────────────┐ │
│  │ word-editor-core │  │ word-editor-      │  │ flux-runtime  │ │
│  │ (Zustand store,  │  │ renderers         │  │ (actions,     │ │
│  │  template model, │  │ (React components,│  │  scope,       │ │
│  │  dataset model)  │  │  toolbar, panels, │  │  datasets)    │ │
│  │                  │  │  canvas bridge)   │  │               │ │
│  └──────────────────┘  └───────────────────┘  └───────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

---

## Package Structure

```
packages/
├── word-editor-core/           # 核心逻辑（不依赖 React）
│   src/
│   ├── index.ts
│   ├── editor-store.ts         # Zustand store: 编辑器状态管理
│   ├── template-model.ts       # 模板数据模型（header/main/footer JSON）
│   ├── template-expr.ts        # 模板表达式解析（${expr}, <tag>...</tag>）
│   ├── template-tags.ts        # 内置标签定义（c:for, c:if, c:choose 等）
│   ├── dataset-model.ts        # 数据集模型（SQL/API/MongoDB 数据源定义）
│   ├── dataset-store.ts        # 数据集状态管理
│   ├── canvas-editor-bridge.ts # canvas-editor 实例封装与命令适配
│   ├── document-io.ts          # 文档导入/导出（DOCX ↔ JSON）
│   ├── paper-settings.ts       # 纸张设置模型（大小/方向/边距）
│   ├── chart-model.ts          # 图表配置模型
│   └── code-model.ts           # 条形码/二维码配置模型
│
├── word-editor-renderers/      # React 渲染层
│   src/
│   ├── index.ts
│   ├── WordEditorPage.tsx      # 编辑器主页面组件（三栏布局）
│   ├── EditorCanvas.tsx        # canvas-editor 容器组件
│   ├── toolbar/
│   │   ├── RibbonToolbar.tsx   # Ribbon 工具栏
│   │   ├── FontControls.tsx    # 字体/字号/加粗/斜体等
│   │   ├── ParagraphControls.tsx # 对齐/行间距/列表
│   │   ├── InsertControls.tsx  # 表格/图片/超链接/分隔线/分页符
│   │   ├── TemplateControls.tsx # 模板表达式/标签插入
│   │   └── PageControls.tsx    # 纸张/缩放/页面模式/打印
│   ├── panels/
│   │   ├── DatasetPanel.tsx    # 左侧数据集面板
│   │   ├── FieldList.tsx       # 字段列表（拖拽/复制/插入）
│   │   ├── TemplateSnippets.tsx # 模板片段（循环/条件/自定义标签）
│   │   ├── PropertyPanel.tsx   # 右侧属性面板
│   │   ├── OutlinePanel.tsx    # 大纲/目录面板
│   │   └── SearchReplace.tsx   # 搜索替换面板
│   ├── dialogs/
│   │   ├── HyperlinkDialog.tsx # 超链接编辑弹窗
│   │   ├── WatermarkDialog.tsx # 水印设置弹窗
│   │   ├── PaperMarginDialog.tsx # 页边距设置弹窗
│   │   ├── ChartDialog.tsx     # 图表配置弹窗
│   │   ├── CodeDialog.tsx      # 条形码/二维码弹窗
│   │   └── DatasetDialog.tsx   # 数据集编辑弹窗（含 SQL 编辑器）
│   └── preview/
│       └── DocPreviewPage.tsx  # 文档预览页面
```

---

## Phased Implementation Plan

### Phase 1: 基础编辑器集成（P0 — 核心 MVP）

**目标**: 在 playground 中集成 canvas-editor，实现基本的文档编辑和保存。

#### 1.1 包脚手架

- [ ] 创建 `packages/word-editor-core/` 和 `packages/word-editor-renderers/`
- [ ] 配置 `package.json`、`tsconfig.json`、`tsconfig.build.json`
- [ ] 安装 `@hufe921/canvas-editor` 依赖
- [ ] 添加到 workspace 别名和 project references
- [ ] 添加 playground 路由 `/word-editor` 和 `/word-editor/preview`

#### 1.2 canvas-editor 桥接层

- [ ] `canvas-editor-bridge.ts`: 封装 Editor 实例的创建、销毁、命令代理
- [ ] `editor-store.ts`: Zustand store 管理编辑器实例、文档状态
  ```typescript
  interface WordEditorState {
    instance: Editor | null
    isReady: boolean
    isDirty: boolean
    paperSettings: PaperSettings
    documentData: DocumentData | null
  }
  ```
- [ ] `template-model.ts`: 文档数据模型
  ```typescript
  interface DocumentData {
    header: IElement[]    // canvas-editor IElement 格式
    main: IElement[]
    footer: IElement[]
  }
  ```

#### 1.3 编辑器画布组件

- [ ] `EditorCanvas.tsx`: canvas-editor 容器，管理实例生命周期
- [ ] `WordEditorPage.tsx`: 三栏布局骨架（左面板占位 + 画布 + 右面板占位）
- [ ] 基本页面设置：纸张大小、方向、边距

#### 1.4 Ribbon 工具栏 — 基础格式

- [ ] `RibbonToolbar.tsx`: 工具栏容器
- [ ] 撤销/重做: `executeUndo()` / `executeRedo()`
- [ ] 格式刷: `executePainter()`
- [ ] 字体: `executeFont()`
- [ ] 字号: `executeSize()` / `executeSizeAdd()` / `executeSizeMinus()`
- [ ] 加粗/斜体/下划线/删除线: `executeBold()` / `executeItalic()` / `executeUnderline()` / `executeStrikeout()`
- [ ] 上标/下标: `executeSuperscript()` / `executeSubscript()`
- [ ] 字体颜色/高亮: `executeColor()` / `executeHighlight()`
- [ ] 工具栏状态同步: 通过 `listener.rangeStyleChange` 更新 active 状态

#### 1.5 文档保存与加载

- [ ] `document-io.ts`: `getValue()` → JSON 序列化，`setValue()` → JSON 反序列化
- [ ] Mock API: 使用 localStorage 模拟保存/加载
- [ ] 页面加载时恢复文档状态

**验收标准**:
- playground `/word-editor` 可打开编辑器
- 能输入文字、调整格式、插入表格和图片
- 页面刷新后文档状态保持
- 纸张设置（大小/方向/边距）可调整

---

### Phase 2: 模板表达式系统（P0 — 核心差异化）

**目标**: 实现基于 NOP XLang 语法的模板表达式插入和编辑。

#### 2.1 表达式模型

- [ ] `template-expr.ts`: 解析和生成模板表达式
  ```typescript
  // 支持的表达式类型
  type TemplateExpr =
    | { kind: 'el'; expr: string }                     // ${order.amount}
    | { kind: 'image'; expr: string }                   // expr:${imageResource}
    | { kind: 'tag-open'; tagName: string; attrs: Record<string, string> }  // <c:for var="item" items="${list}">
    | { kind: 'tag-close'; tagName: string }            // </c:for>
    | { kind: 'tag-selfclose'; tagName: string; attrs: Record<string, string> } // <c:if test="${cond}" />
  ```

#### 2.2 表达式插入机制

canvas-editor 支持通过超链接和控件实现表达式标注。本项目的方案：

- [ ] **内联表达式 `${expr}`**: 作为特殊文本控件插入
  - 在编辑器中以特殊样式显示（类似代码高亮）
  - 内部存储为 `expr:xxx` 格式的超链接或自定义控件
- [ ] **标签块 `<tag>...</tag>`**: 使用配对超链接机制
  - 开始标签 `xpl:<c:for var="item" items="${list}">` 插入为超链接
  - 结束标签 `xpl:</c:for>` 插入为超链接
  - 标签之间的内容被包裹在循环/条件中
- [ ] **图片表达式**: 通过 `expr:${imageResource}` 超链接标注图片

#### 2.3 模板片段面板

- [ ] `TemplateSnippets.tsx`: 可拖拽的模板片段列表
  - **循环**: `<c:for var="item" items="${data.list}"> ... </c:for>`
  - **条件**: `<c:if test="${condition}"> ... </c:if>`
  - **多分支**: `<c:choose><c:when test="${a}">...</c:when><c:otherwise>...</c:otherwise></c:choose>`
  - **变量赋值**: `<c:set var="x" value="${expr}"/>`
  - **自定义标签**: 从注册的标签库中选择
- [ ] 点击片段 → 在光标处插入对应的标签对
- [ ] 支持片段自定义（用户可保存常用表达式）

#### 2.4 模板表达式编辑弹窗

- [ ] `ExprInsertDialog.tsx`: 插入/编辑表达式的弹窗
  - 表达式类型选择（文本/图片/标签）
  - 代码编辑器（简单的 textarea 或集成 CodeMirror）
  - 实时预览表达式在文档中的显示效果
  - 语法校验（基本的括号匹配、标签闭合检查）

**验收标准**:
- 可在文档中插入 `${expr}` 表达式
- 可插入 `<c:for>...</c:for>` 配对标签
- 标签和表达式在编辑器中有视觉区分（颜色/边框/图标）
- 模板片段面板可一键插入常用结构

---

### Phase 3: 数据集管理（P1）

**目标**: 实现数据源管理、数据集定义、字段列表和模板变量插入。

#### 3.1 数据集模型

- [ ] `dataset-model.ts`: 数据集定义
  ```typescript
  interface DataSet {
    id: string
    name: string
    type: 'sql' | 'api' | 'mongo' | 'static'
    datasourceId?: string
    sql?: string
    apiUrl?: string
    params: DataParam[]
    columns: DataColumn[]
  }

  interface DataColumn {
    name: string           // 字段编码
    label: string          // 字段名称
    dataType: string       // 数据类型
  }

  interface DataParam {
    paramName: string
    paramCode: string
    paramType: string
    paramDefault?: string
    paramRequired: boolean
  }
  ```
- [ ] `dataset-store.ts`: 数据集列表的 CRUD 状态管理

#### 3.2 数据集面板 UI

- [ ] `DatasetPanel.tsx`: 左侧数据集面板
  - 数据源选择下拉
  - 数据集列表（带分组）
  - 数据集的新增/编辑/删除
- [ ] `FieldList.tsx`: 选中数据集后的字段列表
  - 每个字段显示: 名称、编码、类型
  - 操作按钮: 复制文本表达式 `${数据集.字段}`、复制图片表达式、直接插入到文档

#### 3.3 数据集编辑弹窗

- [ ] `DatasetDialog.tsx`: 数据集编辑弹窗
  - 基本信息配置（名称、类型、数据源）
  - SQL 编辑器（集成 CodeMirror 6，语法高亮、格式化）
  - 参数配置表格
  - **不内置 SQL 执行能力** — SQL 文本通过回调/接口传递给外部调用者执行，外部返回字段列表后填入 `columns`

> **注意**: SQL 编辑器仅提供编辑和语法高亮，**不内置远程执行能力**。SQL 的执行（预览字段列表、获取数据等）由外围调用者（如 nop-entropy 后端）负责。数据集面板通过接口回调将 SQL 文本传递给外部，由外部执行后返回字段列表。

#### 3.4 字段插入集成

- [ ] 点击字段 → 生成 `${数据集.字段}` 表达式 → 插入到文档光标处
- [ ] 右键菜单: 复制为文本表达式、复制为图片表达式、复制为循环标签
- [ ] 拖拽字段到文档中自动插入对应表达式

**验收标准**:
- 可创建 SQL 数据集，编辑 SQL 文本（不内置远程执行）
- 外部调用者可通过接口传入字段列表，面板正确显示
- 字段列表正确显示
- 点击字段可将 `${dataset.field}` 插入到文档
- 数据集持久化保存

---

### Phase 4: 高级格式与页面控制（P1）

**目标**: 完善工具栏的全部格式控制功能。

#### 4.1 段落控制

- [ ] 对齐: 左/居中/右/两端
- [ ] 行间距: 1/1.15/1.5/2/2.5/3 倍
- [ ] 标题级别: H1-H6 + 正文
- [ ] 列表: 有序列表/无序列表，多级嵌套

#### 4.2 插入元素

- [ ] 表格: 拖拽选择行列数 → `executeInsertTable()`
- [ ] 图片: 文件上传 → `executeImage()`
  - 上传到服务器获取 URL
  - 自动按纸张宽度缩放
- [ ] 超链接: 弹窗编辑 → `executeHyperlink()`
- [ ] 分隔线: 多种线型 → `executeSeparator()`
- [ ] 分页符: `executePageBreak()`

#### 4.3 页面控制

- [ ] 页面模式: 分页/连页 → `executePageMode()`
- [ ] 缩放: 放大/缩小/恢复 → `executePageScaleAdd/Minus/Recovery()`
- [ ] 纸张大小: A2/A3/A4/A5/B4/B5/自定义 → `executePaperSize()`
- [ ] 纸张方向: 纵向/横向 → `executePaperDirection()`
- [ ] 页边距: 上/下/左/右 → `executeSetPaperMargin()`
- [ ] 水印: 添加/删除 → `executeAddWatermark()` / `executeDeleteWatermark()`

#### 4.4 搜索替换

- [ ] 搜索框输入 → `executeSearch()`
- [ ] 上一个/下一个导航 → `executeSearchNavigatePre/Next()`
- [ ] 替换 → `executeReplace()`
- [ ] 搜索结果计数显示

#### 4.5 目录大纲

- [ ] `OutlinePanel.tsx`: 右侧目录面板
  - 调用 `getCatalog()` 获取标题树
  - 点击标题项 → `executeLocationCatalog()` 定位
  - 内容变化时自动更新目录

#### 4.6 打印

- [ ] `executePrint()` 打印当前文档
- [ ] 字数统计显示: `getWordCount()`

**验收标准**:
- 所有格式控制按钮功能正常
- 纸张设置可调整且持久化
- 搜索替换可正常工作
- 目录面板正确显示并可导航

---

### Phase 5: DOCX 导入/导出（P1）

**目标**: 支持 DOCX 文件的上传导入和模板导出。

#### 5.1 DOCX 导入

**前端流程**:
- [ ] 上传 DOCX 文件到后端
- [ ] 后端解析 DOCX → 转换为 canvas-editor JSON 格式
- [ ] 前端接收 JSON → `executeSetValue()` 加载

**后端 API**（依赖 nop-entropy 基础设施）:
- [ ] `POST /api/word-editor/import-docx`: 接收 DOCX 文件
  - 使用 Apache POI 或 nop-ooxml 解析
  - 将 OOXML 结构转换为 canvas-editor IElement JSON
  - 提取纸张设置、页边距、页眉页脚
  - 返回 `{ header, main, footer, width, height, paperDirection, margins }`

#### 5.2 模板导出

- [ ] 导出为 DOCX: `GET /api/word-editor/export-docx/{tplId}`
  - 后端将 canvas-editor JSON + 模板标注转换为 OOXML
  - 保留所有格式和样式信息

#### 5.3 文档预览

- [ ] `DocPreviewPage.tsx`: 文档预览页面
  - 使用 iframe 加载后端渲染的 PDF
  - 或使用 `docx-preview` 前端预览 DOCX

**验收标准**:
- 可上传 .docx 文件并在编辑器中打开
- 文档格式基本保持（字体、表格、图片）
- 可导出为 .docx 文件
- 预览页面可正常显示

---

### Phase 6: 图表与条码（P2）

**目标**: 支持图表、条形码、二维码的配置和插入。

#### 6.1 图表

- [ ] `chart-model.ts`: 图表配置模型
  ```typescript
  interface DocChart {
    id: string
    chartName: string
    chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'area'
    showChartName: boolean
    datasetId: string
    categoryField: string
    valueField: string[]
    seriesField?: string[]
  }
  ```
- [ ] `ChartDialog.tsx`: 图表配置弹窗
  - 图表类型选择
  - 数据集和字段绑定
  - 已添加图表列表管理
- [ ] 在文档中插入图表占位图片
  - 编辑时显示占位图
  - 渲染时后端生成实际图表

#### 6.2 条形码/二维码

- [ ] `code-model.ts`: 条码配置模型
  ```typescript
  interface DocCode {
    id: string
    codeName: string
    codeType: 'barcode' | 'qrcode'
    datasetId: string
    valueField: string
  }
  ```
- [ ] `CodeDialog.tsx`: 条码配置弹窗
- [ ] 在文档中插入条码占位图片

**验收标准**:
- 可配置图表（类型、数据集、字段）并插入文档
- 可配置条形码/二维码并插入文档
- 图表和条码配置随文档保存

---

### Phase 7: 与 nop-entropy 后端集成（P2）

**目标**: 对接 nop-entropy 的 WordTemplate 引擎，实现完整的模板编译和渲染。

#### 7.1 模板编译

- [ ] 将 canvas-editor 文档数据转换为 OOXML + XPL 标注格式
  - `${expr}` → OOXML 中的 EL 表达式
  - `<c:for>...</c:for>` → XPL 标签
  - 超链接中的 `expr:` / `xpl:` 标注
- [ ] 后端使用 `WordTemplateParser` 编译模板
- [ ] 后端使用 `WordTemplate.generateToFile()` 生成最终 DOCX

#### 7.2 Xpt 表格集成

- [ ] 在表格中标注 `xpt:table=true` 启用 NopReport 展开
- [ ] 配置 `expandType` / `expandExpr` 等展开参数
- [ ] 后端使用 `XptWordTemplateParser` 解析并生成动态表格

#### 7.3 XplGenConfig 支持

- [ ] 在文档尾部插入配置表格（可视化编辑）
- [ ] 支持 dump / dumpFile / importLibs / beforeGen / afterGen 配置
- [ ] 调试模式: 显示编译后的 XPL 代码

**验收标准**:
- 在编辑器中设计的模板可通过 nop-entropy 后端编译执行
- 生成的 DOCX 文件中表达式被正确替换
- Xpt 表格可正确展开

---

### Phase 8: UX 优化与生产化（P2）

**目标**: 完善用户体验，处理边界情况，达到生产可用级别。

#### 8.1 协同编辑准备

- [ ] 编辑器状态与 Zustand store 完全同步
- [ ] 为后续 Yjs 集成预留接口
- [ ] 光标位置和选区状态的外部化

#### 8.2 性能优化

- [ ] 大文档性能测试（100+ 页）
- [ ] 工具栏状态更新的 debounce
- [ ] 目录更新的增量计算
- [ ] 图片懒加载

#### 8.3 键盘快捷键

- [ ] Ctrl+B/I/U: 加粗/斜体/下划线
- [ ] Ctrl+Z/Y: 撤销/重做
- [ ] Ctrl+S: 保存
- [ ] Ctrl+F: 搜索
- [ ] Ctrl+P: 打印
- [ ] Ctrl+L/E/R/J: 对齐
- [ ] Ctrl+[/]: 增大/减小字号

#### 8.4 国际化与无障碍

- [ ] 工具栏 tooltip
- [ ] 键盘导航支持
- [ ] 右键菜单

#### 8.5 测试

- [ ] `word-editor-core` 单元测试（模板表达式解析、数据集模型）
- [ ] `word-editor-renderers` 组件测试（工具栏交互、面板操作）
- [ ] E2E 测试（完整编辑流程）

**验收标准**:
- 快捷键全部可用
- 100 页文档流畅编辑
- 核心功能有测试覆盖

---

## Dependency Flow

```
flux-core
    ↓
flux-formula (表达式编译)
    ↓
flux-runtime (动作/作用域/数据源)
    ↓
flux-react (React hooks/contexts)
    ↓
word-editor-core (Zustand store, 模板模型, canvas-editor 桥接)
    ↓
word-editor-renderers (React 组件, 工具栏, 面板)
    ↓
apps/playground (编辑器页面路由)
```

---

## Key Technical Decisions

### 1. canvas-editor 实例管理

canvas-editor 是命令式的（new Editor(container, data)），不提供 React 绑定。桥接方案：

```typescript
// canvas-editor-bridge.ts
export class CanvasEditorBridge {
  private instance: Editor | null = null

  mount(container: HTMLElement, data: DocumentData): void {
    this.instance = new Editor(container, data)
    this.setupListeners()
  }

  unmount(): void {
    this.instance?.destroy()
    this.instance = null
  }

  // 代理所有 command API
  get command() { return this.instance?.command }
  get listener() { return this.instance?.listener }
  get register() { return this.instance?.register }
}
```

React 组件通过 `useRef` 持有 Bridge 实例，通过 `useSyncExternalStore` 订阅 Zustand store 状态变化。

### 2. 模板表达式在 canvas-editor 中的承载方式

canvas-editor 没有原生的"模板表达式"概念。我们利用其控件（Control）或超链接机制：

- **内联表达式 `${expr}`**: 作为特殊样式的文本，通过 `executeInsertElementList()` 插入，用自定义控件包裹以标记为表达式
- **标签块 `<tag>...</tag>`**: 作为配对的超链接插入（`expr:xxx` 格式），与 nop-entropy 的超链接标注方案一致
- **图片表达式**: 在图片上附加超链接标注

这种方案的优势：导出为 DOCX 后，超链接标注可以直接被 `WordTemplateParser` 解析，无需额外转换。

### 3. 数据集与模板表达式的关联

```
数据集(Dataset) → 字段(Field) → 表达式(Expression) → 文档中的占位
    "orders"    → "amount"  → "${orders.amount}"  → [文本控件]
    "orders"    → "photo"   → "expr:${orders.photo}" → [图片+超链接]
    "orders"    → 整个集合   → <c:for items="${orders}"> → [配对超链接]
```

### 4. 状态同步策略

canvas-editor 内部管理自己的状态（文本、选区、格式），我们需要将关键状态外化到 Zustand：

- **文档内容**: 通过 `listener.contentChange` 同步到 store
- **选区格式**: 通过 `listener.rangeStyleChange` 同步到 store（驱动工具栏状态）
- **纸张设置**: 通过 `getOptions()` / `getPaperMargin()` 同步到 store
- **脏标记**: 通过 `contentChange` 事件设置 `isDirty = true`
- **保存**: store 持久化 → 后端 API

---

## Risk Assessment

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| canvas-editor 控件 API 不够灵活 | 中 | 高 | 利用超链接作为备用方案 |
| DOCX 导入格式丢失 | 高 | 中 | 支持常见格式即可，复杂文档建议直接在编辑器中设计 |
| 大文档性能 | 中 | 中 | canvas-editor 基于 Canvas 渲染，天然比 DOM 方案好 |
| canvas-editor 版本升级不兼容 | 低 | 中 | 锁定版本，按需升级 |
| 模板表达式与 WordTemplate 对齐 | 中 | 高 | Phase 7 专门处理，前期可用 mock |
| 图表渲染依赖后端 | 低 | 低 | 编辑时用占位图，渲染时后端生成 |

---

## Success Metrics

### Phase 1 (MVP)
- playground 可打开 Word 编辑器
- 基本文档编辑（输入、格式、保存）正常工作
- 纸张设置可调整

### Phase 2 (模板表达式)
- 可在文档中插入 `${expr}` 和 `<tag>...</tag>`
- 表达式有视觉区分

### Phase 3 (数据集)
- 可管理数据集、浏览字段、插入表达式到文档

### Phase 4 (完整格式)
- 所有工具栏按钮功能正常
- 搜索替换、目录、打印正常

### Phase 5 (DOCX)
- 可导入/导出 .docx 文件
- 基本格式保持

### Phase 6 (图表/条码)
- 图表和条码可配置并插入

### Phase 7 (后端集成)
- 模板可通过 nop-entropy 后端编译执行

### Phase 8 (生产化)
- 快捷键、性能、测试、无障碍全部到位
