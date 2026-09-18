# hucre vs 本项目 Report Designer 对比：定位、能力、互补集成路径

> 核查日期: 2026-09-12
> 对照基准: hucre 1.1.0（`~/sources/hucre`，[github.com/productdevbook/hucre](https://github.com/productdevbook/hucre)，MIT，源码约 138 个 TS 文件 / 7.4 万行，最后提交 2026-09-01）
> 本侧基准: `packages/spreadsheet-core` / `packages/spreadsheet-renderers` / `packages/report-designer-core` / `packages/report-designer-renderers`（live master）
> 关联: `docs/architecture/report-designer/design.md`（目标架构契约）、`docs/archive/analysis/2026-03-21-excel-report-designer-research.md`（早期 Excel 报表设计器调研）
> 目的: 回答 "hucre 是什么 / 与本项目 report designer 是什么关系 / 能否以及如何为我所用"

---

## 0. 结论先行

| 维度         | 结论                                                                                                                                                                                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **定位关系** | ⚡ **根本不同，正交互补，不是竞品**。hucre 是 **headless 电子表格文件引擎**（读写 XLSX/CSV/ODS/JSON/NDJSON/XML，无任何 UI、无编辑交互）；本项目是 **schema 驱动的 UI 设计工作台**（网格渲染、直接操控、字段面板、inspector），文档只有 JSON，**没有二进制格式能力**                                    |
| **名称纠偏** | hucre（土耳其语 "cell"）常被描述为 "Excel 编辑控件"，**不准确**——它不提供任何编辑界面。`web/` 目录只是一个调用库 API 的演示页，不是控件。准确说法是"电子表格文件读写/转换引擎"                                                                                                                         |
| **互补判断** | 🟢 **高度互补**。hucre 恰好填 report designer 显式留白的两块：① `TemplateCodecAdapter` 至今只有 `createUnsupportedTemplateCodecAdapter` 占位（`report-designer-core/src/adapters.ts:157`），真实二进制导入导出完全空缺；② XLSX 公式字符串/缓存值的读写。本项目恰好填 hucre 完全没有的 UI/编辑/设计器层 |
| **工程姿态** | 两者哲学意外一致：**都零运行时依赖**。hucre 全库 0 deps；本侧 spreadsheet-core 也 0 deps（peer 仅 zustand）。hucre 测试规模（约 236 个文件 / 1.03 万用例，覆盖率阈值 98%+）远高于本侧 4 包（61 文件 / 639 用例）                                                                                       |
| **主要风险** | 🟡 hucre 是**幼年项目**：npm 首发 2026-03-27，5.5 个月发了约 13 个版本，1.0 于 2026-08-04；`engines: node>=24`；`readXlsx` 约 39 KB gz（仅 CSV 约 4 KB）。引入前需评估 API 稳定性锁定策略                                                                                                              |
| **建议**     | ✅ 值得引入，但**只作为 codec/文件层依赖**（实现 `TemplateCodecAdapter` 的 XLSX/CSV/ODS 导入导出），绝不能也不能替代本侧网格渲染或编辑层。集成需要写一层 **行数组稠密模型 ↔ A1 稀疏文档模型** 的映射                                                                                                   |

---

## 1. hucre 是什么：headless 文件引擎能力盘点

### 1.1 它不是什么

- **没有 UI**：全库无网格、无画布、无编辑器组件；确认不依赖 React（package.json 中无任何 UI 依赖）。
- **不求值公式**：读写公式字符串（shared/array/dynamic 全支持），但无任何求值/重算引擎；写出时统一带 `calcPr fullCalcOnLoad="1"`，靠 Excel 打开时重算。
- **无编辑态/历史概念**：没有 selection、undo/redo、协同——它是"文档进、文件出"的转换器。

### 1.2 文档模型（`src/_types.ts`，约 2053 行）

- `Workbook`：`sheets: Sheet[]` + properties / namedRanges / dateSystem / defaultFont / themeColors / 工作簿保护 / externalLinks / cellImages / pivotCaches 等。
- `Sheet`：**行数组稠密矩形为主**——`rows: CellValue[][]`（每行等长）；另有可选稀疏层 `cells?: Map<string, Cell>`（键 `"row,col"`，`readXlsx(input, { sparse: true })` 专属）。
- `CellValue = string | number | boolean | Date | null`；`Cell` 携带 style / formula / formulaResult / richText / hyperlink / comment / checkbox（Excel 2024 原生复选框）。
- **列 key 是一等概念**：`ColumnDef { header, key, width, numFmt, style, hidden, outlineLevel }`，`WriteSheet.data: Record<string, CellValue>[]` 按对象行写入；`readObjects` / `writeObjects` 系列对象式 API 贯穿全库。

### 1.3 文件格式矩阵

| 格式         | 读  | 写  | 备注                                                                                                                                                                                                                                              |
| ------------ | --- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| XLSX         | ✅  | ✅  | 完整样式（字体/填充/边框/对齐/numFmt/保护）、merges、数据校验、15 种条件格式、冻结/拆分、行列尺寸、命名区域、批注、图片、表格、保护、页面设置、页眉页脚、大纲、sparklines、文本框、主题色；图表 16 种可读+round-trip、7 种可新建；透视表读+写骨架 |
| XLSX 加密    | ✅  | ✅  | ECMA-376 Agile 加密，WebCrypto AES；`ReadOptions.password` 解密读、`WriteOptions.encryption` 加密写                                                                                                                                               |
| XLS（BIFF8） | ✅  | ❌  | 仅值/日期/合并，公式只取缓存值                                                                                                                                                                                                                    |
| XLSB         | ✅  | ❌  | 窄模型只读                                                                                                                                                                                                                                        |
| ODS          | ✅  | ✅  | 窄模型：6 项样式 + merges/超链接/富文本/命名区域/公式双向；边框/对齐/列宽/冻结/校验/条件格式**不建模**；ODS→ODS 无损                                                                                                                              |
| CSV/TSV      | ✅  | ✅  | RFC 4180、分隔符嗅探、类型推断、BOM、任意编码、公式注入逃逸、fastMode                                                                                                                                                                             |
| JSON/NDJSON  | ✅  | ✅  | + 流式；flatten/unflatten 点路径                                                                                                                                                                                                                  |
| XML / HTML   | ✅  | ✅  | 表格 XML 读写；HTML toHtml/fromHtml                                                                                                                                                                                                               |
| Markdown/TSV | ❌  | ✅  | 仅写出                                                                                                                                                                                                                                            |

### 1.4 其他关键能力

- **流式**：`streamXlsxRows` async generator（真流式 ZIP + SAX，ReadableStream 输入直通）；`writeXlsxStream` pull 驱动恒定内存，超 `XLSX_MAX_ROWS_PER_SHEET`（1,048,576）自动分表；CSV/ODS/NDJSON 均有对应流式读写，共享 `SpreadsheetStreamWriter` 接口。
- **Schema 校验**：`validateWithSchema<T>(rows, schema)` 行级校验 + 类型强转（type/required/pattern/min/max/enum/自定义 validate），错误收集为 `SchemaValidationIssue[]`。是轻量行校验，不是 JSON Schema。
- **Round-trip**：`openXlsx()`/`saveXlsx()` 把 hucre 不理解的 part（图表、宏、透视表、slicer 等）**字节级原样拷回**并重建 rels/content-types。
- **CLI**：`hucre convert`（任意格式互转、stdin/stdout）/ `inspect` / `validate`。
- **运行时**：Node 24+ / Deno / Bun / 现代浏览器 / Cloudflare Workers / Web Workers；零 Node API（ZIP 走 CompressionStream + 纯 TS 回退，加密走 WebCrypto）；CSP 合规（无 eval）；CI 实测 bun/deno 构件。

---

## 2. 本项目 spreadsheet + report designer 是什么

### 2.1 分层（与 `docs/architecture/report-designer/design.md` 一致）

| 包                                     | 职责                                                                                  | 规模（非测试 LOC） |
| -------------------------------------- | ------------------------------------------------------------------------------------- | ------------------ |
| `@nop-chaos/spreadsheet-core`          | 纯表格运行时：文档模型、命令执行器、undo/redo、序列化；**0 deps**（peer 仅 zustand）  | ~4.0k              |
| `@nop-chaos/spreadsheet-renderers`     | SchemaRenderer 集成：DOM 网格 + 自研虚拟化、交互 hooks、toolbar、sheet tab、右键菜单  | ~7.2k              |
| `@nop-chaos/report-designer-core`      | 报表语义层：元数据平面、字段源、inspector schema 组装、preview/codec/表达式适配器接口 | ~2.3k              |
| `@nop-chaos/report-designer-renderers` | 设计器外壳：page renderer、字段面板拖拽、inspector 壳、toolbar、host scope 投影       | ~3.6k              |

### 2.2 关键事实

- **文档模型**：`SpreadsheetDocument → WorkbookDocument → WorksheetDocument`，单元格是 **A1 地址为 key 的稀疏 map**（`cells?: Record<string, CellDocument>`，`types.ts:50`）；`CellDocument.value?: unknown`（任意 JSON 值，无类型区分），另有 formula / numberFormat / style / comment / richText / linkUrl。
- **命令系统**：62 个 `spreadsheet:*` 命令（值/样式/结构/sheet/剪贴板/查找替换/排序筛选/冻结/事务/undo/redo），命令模式 + handler 注册表（`command-handlers/` 按域拆分）。设计器层另有 12 个 `report-designer:*` 命令。
- **undo/redo**：整文档深拷贝快照栈，默认深度 100，支持事务（beginTransaction/commit/rollback）；designer 层有独立栈 + saved baseline（dirty 语义）。
- **渲染**：DOM 表格 + spacer 占位（非 canvas），自研行/列偏移前缀和虚拟化（OVERSCAN=5），冻结窗格独立区；交互覆盖点选/拖拽 range/行/列选择、内联编辑、填充柄（含双击按数据区填充）、行列 resize、剪贴板（含 transpose）、右键菜单（排序/真实筛选/插删行列/合并/冻结/隐藏/autoFit）、查找替换、批注、键盘快捷键。
- **公式**：**不执行**。`formula` 只作为字符串存取与搬运；表达式编辑经 `ExpressionEditorAdapter` 外接，表达式语言不固定（design.md 明确"不内建公式执行引擎"）。
- **导入导出**：`report-designer:importTemplate/exportTemplate` 只是把 payload 交给 `TemplateCodecAdapter`——仓库内**只有 `createUnsupportedTemplateCodecAdapter` 占位实现**，apps/ 也没有注册真实 codec。文档持久化格式即纯 JSON。
- **测试**：4 包共 61 个测试文件 / 约 639 用例（vitest）+ 3 个 Playwright spec（spreadsheet-demo / report-designer-demo / report-designer-host）。

---

## 3. 逐维度对照

| 维度                           | hucre 1.1.0                                                       | 本项目 spreadsheet + report designer                             | 关系判定                           |
| ------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------- |
| **产品形态**                   | headless 库 + CLI，无 UI                                          | schema 驱动 UI 工作台（渲染 + 直接操控 + 设计器外壳）            | 正交，无重叠                       |
| **单元格存储**                 | 行数组稠密矩形（`CellValue[][]`）+ 可选稀疏 Map                   | A1 地址稀疏 `Record<string, CellDocument>`                       | ❌ 结构错位，集成需映射层          |
| **单元格值类型**               | 强类型五元 `string/number/boolean/Date/null` + CellType 区分      | `value?: unknown`（任意 JSON），type 仅作字符串标注              | hucre 更严谨；映射时需类型收敛     |
| **列 key 模型**                | 一等概念（ColumnDef + 对象行读写）                                | 无列 key 概念，纯坐标                                            | hucre 独有，报表字段映射时可借力   |
| **公式**                       | 读写公式字符串 + 缓存值，**不求值**（靠 Excel 打开重算）          | 只存公式字符串，**不求值**（表达式经 adapter 外接 host 引擎）    | 同为求值留白，哲学一致             |
| **样式**                       | XLSX 完整样式面（字体/填充/边框/对齐/numFmt/保护）+ 15 种条件格式 | `CellStyle` 六类（字体/颜色/背景/边框/对齐/wrap+indent）+ numFmt | hucre 超集；本侧样式写出会有损映射 |
| **merges / 冻结**              | 双向支持                                                          | 双向支持（mergeRange/unmergeRange、freezePanes 命令）            | ✅ 模型可直接互映射                |
| **图片/图表/透视表/sparkline** | 支持（图表 16 读 7 写、透视表骨架写）                             | 无                                                               | hucre 独有                         |
| **条件格式**                   | 15 种读写                                                         | 无                                                               | hucre 独有                         |
| **undo/redo**                  | 无（转换器无编辑态）                                              | 整文档快照栈（深度 100 + 事务）+ designer 独立栈                 | 本侧独有                           |
| **持久化格式**                 | 二进制（XLSX/ODS）+ 文本（CSV/JSON/XML/HTML/MD）                  | 纯 JSON 文档                                                     | ❌→✅ 互补点：hucre 可补二进制     |
| **流式**                       | 读+写全格式流式，恒定内存                                         | 无（文档级操作）                                                 | hucre 独有                         |
| **渲染/虚拟化**                | 无                                                                | DOM 表格 + 前缀和虚拟化 + 冻结窗格                               | 本侧独有                           |
| **运行时依赖**                 | **0 deps**                                                        | spreadsheet-core **0 deps**（renderers 依赖 workspace 内部包）   | ✅ 哲学一致                        |
| **运行环境**                   | Node/Deno/Bun/浏览器/Edge/Workers                                 | 浏览器（React 19）为主                                           | 兼容                               |
| **测试**                       | ~236 文件 / ~1.03 万用例，覆盖率阈值 98%+，模糊测试               | 4 包 61 文件 / 639 用例 + 3 个 Playwright spec                   | hucre 规模约 16 倍                 |
| **成熟度**                     | 1.1.0，npm 2026-03 首发，13 版本/5.5 月，迭代极快                 | 本仓 4 包，随主仓节奏演进                                        | 双方都偏年轻                       |
| **许可**                       | MIT                                                               | 本仓许可                                                         | ✅ 可引入                          |

---

## 4. 集成路径建议

### 4.1 推荐形态：hucre 作为 report designer 的 codec 层依赖

`report-designer-core` 的 `TemplateCodecAdapter`（`adapters.ts:59`：`importDocument` / `exportDocument`）就是为此预留的接缝。落地一个 `hucre-template-codec` 即可打通真实文件能力：

```text
XLSX/ODS/CSV 文件 ──readXlsx/readOds/parseCsv──▶ Workbook（行数组）
                        │  映射层（新写）
                        ▼
        SpreadsheetDocument（A1 稀疏 JSON）
                        │  report-designer:importTemplate
                        ▼
              设计器画布（现有 UI 不变）
```

映射层要点（集成时的主要工作量）：

1. **稠密行数组 → A1 稀疏 map**：跳过空单元格；`ColumnDef.key/header` 可转成 designer 元数据平面的首行/列头标注（报表字段源天然对齐）。
2. **值类型收敛**：hucre 的 `Date` 需决定序列化策略（ISO 字符串 + numberFormat，还是保留原生 Date——本侧 `value?: unknown` 两者都能装，但要与 UI 编辑/剪贴板行为对齐）。
3. **样式面有损映射**：hucre 读到的边框线型/填充渐变/条件格式等超出本侧 `CellStyle` 六类，首版只映射交集，其余丢入 cell metadata 或记录丢弃清单（hucre 的 `toWriteOptions(wb, { onDrop })` 有现成的丢弃报告模式）。
4. **公式语义**：两边都不求值，公式字符串可原样透传；但导出后最终重算依赖 Excel 打开（hucre 写 `fullCalcOnLoad`），若未来要"画布内即见公式结果"，缺口在本侧——需接 host 的 flux-formula 引擎做单元格求值，与 hucre 无关。
5. **反向导出**：A1 稀疏 map → 稠密行数组需先求 used range（本侧 grid 维度已有"从 active sheet 已用边界推导"的现成逻辑，见 design.md §5.1 基线）。

### 4.2 不推荐的形态

- **不要**试图用 hucre 替代本侧网格/编辑/undo 体系——它没有这些概念，方向完全不可行。
- **不要**把 hucre 引入 `spreadsheet-core`——会打破该包零依赖与纯运行时边界；依赖应落在独立的 codec 包或宿主 adapter 注册侧。
- **不要**现阶段引入透视表/图表等高阶映射——本侧文档模型没有对应物，先保"值 + 交集样式 + merges + 冻结"的保真往返即可。

### 4.3 引入前需确认的风险

| 风险             | 事实                                                            | 缓解                                                                      |
| ---------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| API 稳定性       | 1.0 于 2026-08-04 才发布，5.5 个月 13 个版本，仍有 MIGRATION.md | 锁定精确版本；codec 包内做一层自己的薄封装，不把 hucre 类型外泄到本侧契约 |
| 体积             | readXlsx ~39 KB gz；仅 CSV ~4 KB                                | 利用 tree-shaking 子路径导出按需引入；动态 import 延迟加载                |
| engines node>=24 | 仅约束 Node 侧；浏览器不受影响                                  | codec 运行在浏览器/构建侧即可                                             |
| ODS/样式短板     | ODS 只建模 6 项样式，边框/列宽/冻结不建模                       | 文档中明确 ODS 导入为"窄保真"，避免用户预期错位                           |

---

## 5. 工程姿态观察（可借鉴项）

- **PARITY 文档模式**：hucre 用 846 行 `docs/PARITY.md` 逐格式列明读写差异，另用 `SPEC-COVERAGE.md` 按 ECMA-376/OASIS schema 生成覆盖清单——本侧 report designer 的"能力边界对外发布"（如 config 收窄记录）可用同样方式沉淀。
- **尺寸预算 CI 化**：`scripts/size-budget.json` + CI 强制（README 里的数字漂移过一次，因此被 pin 进 CI）——对本侧 renderer 包体积治理是可直接抄的做法。
- **覆盖率 ratchet**：98%+ 阈值随行随守；本侧 4 包测试密度（639 用例/17k LOC）相对 hucre（1.03 万/74k）偏低，codec 集成层应按"Must automate"档补齐格式往返用例。

---

## 6. 参考路径

- hucre 源码：`~/sources/hucre`（`src/_types.ts` 文档模型、`docs/PARITY.md` 格式差异、`README.md` 对比表）
- 本侧架构契约：`docs/architecture/report-designer/design.md`
- 本侧 adapter 接缝：`packages/report-designer-core/src/adapters.ts`（`TemplateCodecAdapter` / `ExpressionEditorAdapter` / `createUnsupportedTemplateCodecAdapter`）
- 本侧文档模型：`packages/spreadsheet-core/src/types.ts`
- 早期调研：`docs/archive/analysis/2026-03-21-excel-report-designer-research.md`
