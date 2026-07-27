# MA1.3 Basic Renderers 包簇结构审计报告

> Audit Date: 2026-07-27
> Plan: `docs/plans/2026-07-27-0800-2-ma1-structure-architecture-audit.md`
> Package Cluster: basic-renderers (flux-renderers-basic, flux-renderers-form, flux-renderers-form-advanced, flux-renderers-data)
> Owner Doc: `docs/architecture/renderer-runtime.md`

## 审计范围

审计 basic renderers 包簇的四个包，覆盖：

1. Renderer 定义完整性（`*-renderer-definitions.ts` 等定义文件是否缺少必填字段）
2. 样式 marker 类合规性
3. data-slot 使用正确性
4. 无 BEM 原则遵循情况

## 1. Renderer 定义完整性

### 检查的定义文件

| 包                           | 文件                                                                   | 渲染器数 |
| ---------------------------- | ---------------------------------------------------------------------- | -------- |
| flux-renderers-basic         | `basic-renderer-definitions.ts`, `surface-renderer-definitions.ts`     | 12+2     |
| flux-renderers-form          | `definitions.ts`, `date-renderer-definitions.ts`, `form-definition.ts` | 15+7+1   |
| flux-renderers-form-advanced | 各渲染器文件内的内联定义                                               | 19       |
| flux-renderers-data          | `data-renderer-definitions.ts`, `crud-renderer-definition.ts`          | 10+1     |

### 所有 renderer 定义均包含：

- ✅ `type` — 渲染器类型标识
- ✅ `component` — 渲染器组件
- ✅ `sourcePackage` — 所属包

### 缺失 displayName/category 问题：

**发现 F3-001**: flux-renderers-form-advanced 的 17 个渲染器定义普遍缺少 `displayName` 和 `category`（详见下方发现）
**发现 F3-002**: flux-renderers-form 的 7 个 date 类型渲染器缺少 `displayName` 和 `category`

## 2. 样式 marker 类合规性

### cn() 使用情况

| 包                           | cn() 使用文件数 | 结果        |
| ---------------------------- | --------------- | ----------- |
| flux-renderers-basic         | 9 文件          | ✅ 一致使用 |
| flux-renderers-form          | 15 文件         | ✅ 一致使用 |
| flux-renderers-form-advanced | 20 文件         | ✅ 一致使用 |
| flux-renderers-data          | 12 文件         | ✅ 一致使用 |

所有包一致地从 `@nop-chaos/ui` 导入 `cn` 并使用。根元素统一使用 `nop-<type>` marker 模式。

### data-slot 使用

所有四个包在结构区域上一致使用 `data-slot` 属性：

- layout renderers: `data-slot="page-header"`, `data-slot="container-body"`, `data-slot="tabs-content"` 等
- form renderers: `data-slot="field-control"`, `data-slot="checkbox-wrapper"`, `data-slot="radio-group-item"` 等
- data renderers: `data-slot="list-item"`, `data-slot="table-header"`, `data-slot="crud-toolbar"` 等
- 所有值遵循 kebab-case 命名

✅ data-slot 使用正确一致。

### @nop-chaos/ui 组件使用

所有渲染器从 `@nop-chaos/ui` 导入 shadcn 组件，未发现绕过模式（如使用 `<button>` 代替 `Button`）。

## 3. 发现列表

### P0 — 无

### P1 — 1 个

#### F3-001: BEM 风格 `nop-hairline--*` 修饰符命名

- **文件**: 多个文件见下方
- **严重程度**: P1（违反"无 BEM 原则"）
- **现状**: 以下位置使用 `nop-hairline--bottom`（BEM 修饰符语法 `block--modifier`）：
  - `packages/flux-renderers-data/src/list-renderer.tsx:137` — `'nop-hairline nop-hairline--bottom'`
  - `packages/flux-renderers-data/src/table-renderer/table-expanded-row.tsx:53` — `"nop-hairline nop-hairline--bottom rounded-md border ..."`
  - `packages/flux-renderers-form/src/renderers/select-mobile-renderer.tsx:195` — `"nop-hairline nop-hairline--bottom"`
  - `packages/flux-renderers-form-advanced/src/tree-controls.tsx:446` — `"nop-hairline nop-hairline--bottom"`
  - CSS 定义在 `packages/ui/src/styles/mobile.css:31-79` 中
- **风险**: 中。违反项目"无 BEM 原则"，可能被后续开发者复制。
- **建议**: 要么将 `--` 替换为 `-`（如 `nop-hairline-bottom`），要么在 AGENTS.md 中明确将 `nop-hairline--*` 列入例外。

### P2 — 2 个

#### F3-002: flux-renderers-form-advanced 17 个渲染器缺 displayName/category

- **文件**: `packages/flux-renderers-form-advanced/src/` 内各渲染器文件
- **严重程度**: P2（工具链发现性受损）
- **缺少字段的渲染器**:
  `combo`, `input-tree`, `tree-select`, `tag-list`, `key-value`, `array-editor`, `condition-builder`, `object-field`, `array-field`, `variant-field`, `detail-field`, `detail-view`, `editor`, `input-file`, `input-image`, `icon-picker`, `transfer`, `picker`, `input-table`
- **风险**: 低-中。运行时不受影响，但 schema 编辑器、渲染器目录等工具的展示会显示空值/回退值。
- **建议**: 为每个定义添加 `displayName` 和 `category`。类别建议：`form` 或 `composite`。

#### F3-003: flux-renderers-form 7 个 date 渲染器缺 displayName/category

- **文件**: `packages/flux-renderers-form/src/renderers/date-renderer-definitions.ts:45-146`
- **严重程度**: P2（工具链发现性受损）
- **缺少字段的渲染器**: `input-date`, `input-datetime`, `input-time`, `date-range`, `input-month`, `input-quarter`, `input-year`
- **风险**: 同 F3-002。
- **建议**: 添加 `displayName`（如 `'Date'`, `'Datetime'`, `'Time'` 等）和 `category: 'form'`。

### P3 — 2 个

#### F3-004: form-advanced 的 renderer-definition-discovery test 检查不完整

- **文件**: `packages/flux-renderers-form-advanced/src/__tests__/renderer-definition-discovery.test.ts:20-25`
- **严重程度**: P3（增强项）
- **现状**: 现有测试仅检查 `sourcePackage`，不检查 `displayName`/`category`。
- **建议**: 扩展测试以断言 `displayName` 和 `category` 存在。

#### F3-005: 三处使用原始字符串 className 而非 cn()

- **文件**: `select-mobile-renderer.tsx:195`, `table-expanded-row.tsx:53`, `tree-controls.tsx:446`
- **严重程度**: P3（一致性问题）
- **现状**: 固定类字符串（无需条件合并），功能上可接受但与代码库惯例不一致。
- **建议**: 统一使用 `cn()`。

## 合规项摘要

| 检查项                   | 状态 |
| ------------------------ | ---- |
| cn() 一致使用            | ✅   |
| data-slot 正确使用       | ✅   |
| @nop-chaos/ui 组件导入   | ✅   |
| 布局渲染器仅发 marker 类 | ✅   |
| 小部件渲染器自我样式化   | ✅   |

## 总结

Basic renderers 包簇整体结构良好。cn()、data-slot 和 @nop-chaos/ui 使用一致且正确。主要问题：P1 BEM 风格 hairline 命名 + P2 渲染器定义缺失 displayName/category。无 P0 或运行时问题。
