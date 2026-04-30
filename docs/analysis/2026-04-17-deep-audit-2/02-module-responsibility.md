# [维度02] 模块职责与文件边界 — 初审报告

## 超大文件清单

### 700+ 行（必须拆分）

无。

### 500-700 行（需评估）

| 文件                   | 行数 | 建议                                        |
| ---------------------- | ---- | ------------------------------------------- |
| data-source-runtime.ts | 681  | **应拆分**：merge 策略 + formula controller |
| shape-validation.ts    | 596  | 可接受：内聚验证管道                        |
| designer-page.tsx      | 520  | 可接受：页面编排器                          |
| parser.ts              | 510  | 可接受：Pratt parser                        |

## 发现清单

### [维度02] data-source-runtime.ts 职责混合 (P1)

- **文件**: `packages/flux-runtime/src/data-source-runtime.ts:1-681`
- 5 个可分离职责：merge 策略(75行)、scope 写入辅助(94行)、formula 控制器(118行)、API 控制器(317行)、source 执行器(23行)
- **建议**: 提取 merge 策略 + formula controller

### [维度02] flux-renderers-data/index.tsx 含验证逻辑 (P2)

- **文件**: `packages/flux-renderers-data/src/index.tsx:10-99`
- validateTableSchema + 4 个辅助函数在入口文件中
- **建议**: 提取到 table-schema-validator.ts

### [维度02] designer-page.tsx 可小幅提取 (P2)

- **文件**: `packages/flow-designer-renderers/src/designer-page.tsx:24-107`
- normalizeTreeModeConfig + matchesShortcut 可提取
- **建议**: 提取到 designer-page-utils.ts

## 积极发现

- 无 700+ 行文件
- flux-runtime/index.ts 仅 18 行，范例级入口
- schema-compiler 已按职责拆分为子模块
- spreadsheet-core 按操作类别分文件，良好拆分范例
