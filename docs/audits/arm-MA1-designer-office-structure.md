# MA1.5 Designer + Office 结构审计报告

> Audit Date: 2026-07-27
> Plan: `docs/plans/2026-07-27-0800-2-ma1-structure-architecture-audit.md`
> Packages: flow-designer-core/renderers, report-designer-core/renderers, word-editor-core/renderers, spreadsheet-core/renderers, flux-renderers-scheduling (tail-check), flux-renderers-ai (tail-check)
> Owner Docs: `docs/architecture/styling-system.md`, `docs/architecture/flow-designer/design.md`

## 审计范围

审计 designer + office 包簇，覆盖：

1. 包边界合规性
2. 样式契约合规性
3. Scheduling 尾随确认（无新增 drift）
4. AI 尾随确认（无新增 drift）

## 1. Designer 包边界合规性

### flow-designer-core

| 检查              | 结果           |
| ----------------- | -------------- |
| @nop-chaos 依赖   | 仅 `flux-core` |
| 依赖 \*-renderers | ✅ 无          |
| 源码级向上引入    | ✅ 无          |

**结论：合规。**

### flow-designer-renderers

| 检查            | 结果                                                               |
| --------------- | ------------------------------------------------------------------ |
| @nop-chaos 依赖 | `flow-designer-core`, `flux-core`, `flux-i18n`, `flux-react`, `ui` |
| 依赖方向        | 全部正确                                                           |
| devDependencies | 含 `flux-runtime`, `flux-formula`（仅测试用，可接受）              |

**结论：合规。**

### report-designer-core

| 检查              | 结果                            |
| ----------------- | ------------------------------- |
| @nop-chaos 依赖   | `flux-core`, `spreadsheet-core` |
| 依赖 \*-renderers | ✅ 无                           |

**结论：合规。** 依赖 `spreadsheet-core` 是合理的架构选择（report designer 内嵌 spreadsheet 数据模型）。

### report-designer-renderers

| 检查            | 结果                                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| @nop-chaos 依赖 | `spreadsheet-core`, `spreadsheet-renderers`, `report-designer-core`, `flux-react`, `flux-core`, `flux-i18n`, `ui` |
| 发现            | 依赖 `spreadsheet-renderers`（跨包 renderers 耦合）——见 F5-001                                                    |

**结论：大部分合规，一个发现。**

## 2. Office 包边界合规性

### word-editor-core

| 检查              | 结果  |
| ----------------- | ----- |
| @nop-chaos 依赖   | 无    |
| 依赖 \*-renderers | ✅ 无 |

**结论：合规。** 审计中最干净的边界之一。

### word-editor-renderers

| 检查                | 结果                                                             |
| ------------------- | ---------------------------------------------------------------- |
| @nop-chaos 依赖     | `flux-core`, `flux-i18n`, `flux-react`, `ui`, `word-editor-core` |
| 跨包 renderers 依赖 | ✅ 无                                                            |

**结论：合规。**

### spreadsheet-core

| 检查              | 结果  |
| ----------------- | ----- |
| @nop-chaos 依赖   | 无    |
| 依赖 \*-renderers | ✅ 无 |

**结论：合规。**

### spreadsheet-renderers

| 检查                | 结果                                                             |
| ------------------- | ---------------------------------------------------------------- |
| @nop-chaos 依赖     | `spreadsheet-core`, `flux-react`, `flux-core`, `flux-i18n`, `ui` |
| 跨包 renderers 依赖 | ✅ 无                                                            |

**结论：合规。**

## 3. 样式契约合规性

### Designer 包

- **flow-designer-renderers**: 一致使用 `@nop-chaos/ui` 组件（Button, Badge, Label, Switch 等），使用 `cn()`，使用 `data-slot` marker，无 BEM。✅
- **report-designer-renderers**: 使用 `@nop-chaos/ui` 组件，使用 `data-slot`，有自包含 CSS 文件。✅

### Office 包

- **word-editor-renderers**: 主要通过外部 `@hufe921/canvas-editor` 渲染，有自包含 styles.css。✅
- **spreadsheet-renderers**: 主要通过 canvas 渲染，有自包含 canvas-styles.css。✅

**样式结论：所有包均合规，未发现样式违规。**

## 4. Scheduling 尾随确认

- **审计基线**: `docs/audits/2026-07-23-0714-multi-audit-scheduling.md`（19 个确认问题：0 P0, 1 P1, 11 P2, 7 P3）
- **审计后变更**: 仅有 1 个 commit（2026-07-26 的 Gantt Strict Mode/hook 顺序修复），未触及 `scheduling-renderer-definitions.ts`
- **结论**: ✅ 无新增 drift。所有 19 个已知问题保持开放。

## 5. AI 尾随确认

- **审计基线**: `docs/audits/2026-07-25-0707-multi-audit-ai.md`（8 个确认问题：0 P0, 2 P1, 6 P2）
- **审计后变更**: 仅有 1 个 commit（2026-07-25 的 ai-bubble 编辑状态迁移增强），未触及 `ai-renderer-definitions.ts`
- **结论**: ✅ 无新增 drift。所有 8 个已知问题保持开放。

## 发现列表

### P0 — 无

### P1 — 无

### P2 — 无

### P3 — 1 个

#### F5-001: report-designer-renderers 依赖 spreadsheet-renderers（跨包 renderer 耦合）

- **文件**: `packages/report-designer-renderers/package.json`
- **严重程度**: P3（观察项）
- **现状**: `report-designer-renderers` 同时依赖 `@nop-chaos/spreadsheet-core` 和 `@nop-chaos/spreadsheet-renderers`。这在架构上是合理的（report designer 内嵌 spreadsheet canvas），但创建了跨包 renderer 耦合链。
- **风险**: 低。spreadsheet-renderers 的 API 变更会影响 report-designer-renderers。
- **建议**: 记录此耦合为架构选择，无需采取行动。

## 合规项摘要

| 包                        | 边界合规           | 样式合规      |
| ------------------------- | ------------------ | ------------- |
| flow-designer-core        | ✅                 | N/A（纯逻辑） |
| flow-designer-renderers   | ✅                 | ✅            |
| report-designer-core      | ✅                 | N/A（纯逻辑） |
| report-designer-renderers | ⚠️ P3（见 F5-001） | ✅            |
| word-editor-core          | ✅                 | N/A（纯逻辑） |
| word-editor-renderers     | ✅                 | ✅            |
| spreadsheet-core          | ✅                 | N/A（纯逻辑） |
| spreadsheet-renderers     | ✅                 | ✅            |
| scheduling（尾随）        | ✅ 无 drift        | ✅            |
| AI（尾随）                | ✅ 无 drift        | ✅            |

## 总结

Designer 和 Office 包簇整体干净。所有包边界合规，样式契约遵守良好。仅有的发现是 P3 级别（report-designer-renderers 的交叉 renderer 耦合，架构上合理）。Scheduling 和 AI 尾随确认均未发现新增 drift。
