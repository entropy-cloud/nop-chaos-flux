# MA7.2 — CI/Deprecation/i18n 审计报告

> Audit Status: completed
> Audit Date: 2026-07-27
> Plan: `docs/plans/2026-07-27-2100-2-ma72-ci-deprecation-i18n-audit.md`
> Baseline: M0 (2026-07-27)

## Phase 1 — Deprecation 合规审计

### Finding 1.1 — `@deprecated` API 清单

全仓库扫描到 **11 处** `@deprecated` 标记，分布在 4 个包中：

| #      | Package                   | File                            | Symbol                                                                                                  | Type               | Replacement                                 |
| ------ | ------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------- |
| D1     | flow-designer-renderers   | `renderer-definitions.ts:324`   | `createFlowDesignerRegistry()`                                                                          | function           | `extendFlowDesignerRegistry()`              |
| D2     | nop-debugger              | `types.ts:137`                  | `NopScopeChainEntry`                                                                                    | type alias         | `ScopeSnapshot` from `@nop-chaos/flux-core` |
| D3     | flux-renderers-scheduling | `calendar/calendar.types.ts:86` | `CalendarResource.text`                                                                                 | field              | `title`                                     |
| D4     | flux-renderers-scheduling | `gantt/gantt-store.ts:331`      | `GanttStore` (type + constructor)                                                                       | type alias + const | `createGanttStore(config?)`                 |
| D5-D11 | flux-renderers-scheduling | `gantt/gantt.types.ts:155-174`  | `scales`, `startDate`, `endDate`, `childrenField`, `initiallyExpanded`, `progressBarHeight`, `calendar` | fields             | **Unspecified**                             |

### Finding 1.2 — 合规性评估

- **D1-D4**: 符合 `deprecated-feature-cleanup.md` 规则——每个 deprecated API 都标注了替代方案，且替代方案已存在于相同或依赖包中。这些属于兼容过渡期保留，满足 2-release-cycle 规则。
- **D5-D11**: **合规缺口**（P1）——7 个 deprecated 字段的 JSDoc 仅标注 `/** @deprecated */` 未附带任何替代方案描述。违反 `deprecated-feature-cleanup.md` 的核心规则：`@deprecated` JSDoc 必须说明替代方案。消费者无从知晓应迁移到哪个字段。

### Finding 1.3 — CI Guard 评估

- `eslint.config.js` 中 `react/no-deprecated: 'error'` 仅覆盖 React 自身的 deprecated API。**无项目级 `@deprecated` 使用的 fail-fast 规则**（P2）。
- 无 `.github/workflows/` 目录——GitHub Actions CI 尚未配置。
- 建议：引入 `eslint-plugin-deprecation` 或在 typescript-eslint 配置中启用 `@typescript-eslint/no-deprecated`（若版本支持）。

## Phase 2 — i18n 完整性审计

### 资源文件状态

| 指标                | 值                        |
| ------------------- | ------------------------- |
| zh-CN 定义 keys     | 788                       |
| en-US 定义 keys     | 788                       |
| 源代码使用 keys     | 675                       |
| 未定义但使用的 keys | 0 ✅                      |
| 定义但未使用的 keys | 113（动态使用或模板引用） |

### 发现

- **12.1**: 全部使用的 i18n keys 均已定义，中英文 locale 完全同步（788/788）✅
- **12.2**: 113 个 "可能未使用的 keys" 中包含 `flux.ai.voiceNoResult`、`flux.ai.mentions`、`flux.flowDesigner.addCondition` 等——部分可能确实未被引用，但多数通过动态 key 构造或模板字符串使用（如 `flux.debugger.renders`、`flux.codeEditor.execute`）。建议在 MR 阶段核实并清理确已无用的 key。
- **12.3**: CI 层已有 `check:i18n-keys` 脚本且纳入 `lint` 链——确保不会出现未定义的 key。

## Phase 3 — 静态分析工具审计

### `pnpm audit:deps`

| 类目     | 计数                            |
| -------- | ------------------------------- |
| 总违规   | 14（14 errors, 0 warnings）     |
| 巡航模块 | 2318 modules, 4924 dependencies |

**违规分类**：

| Severity | Count | 类型     | 涉及包                                                                                       |
| -------- | ----- | -------- | -------------------------------------------------------------------------------------------- |
| P2       | 7+    | 循环依赖 | scheduling/gantt (3), form/input-choice-renderers (4), condition-builder (3), playground (1) |

所有 14 个违规均为循环依赖。无跨包 src import（与 M0 基线一致，已移除或未复现）。**P2 设计债**——不影响运行，但增加构建和重构难度。

### `pnpm audit:knip`

| 类目                | 计数                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------- |
| Unused exports      | ~39 types/interfaces                                                                  |
| Duplicate exports   | 2（`formulaCompiler`/`sharedFormulaCompiler`, `executeApiSchema`/`executeApiObject`） |
| Configuration hints | 7（knip.json 清理建议）                                                               |

Unused exports 主要集中在 report-designer、spreadsheet、word-editor 包。这些多为内部类型定义，部分可能为公共 API 表面但暂未被消费。**P3**——建议在 MR 阶段逐一确认。

### `react-doctor` Maintainability 抽样（20% = ~35 warnings）

抽样范围：Maintainability 173 warnings 中按包抽取约 20%。

| 规则                                                | 出现次数  | 代表性文件                                                                    |
| --------------------------------------------------- | --------- | ----------------------------------------------------------------------------- |
| `no-eager-new-in-use-state-initializer`             | 多（>15） | `table-renderer/use-table-expand.ts`, `table-renderer/use-table-selection.ts` |
| `no-assertive-status`                               | 1         | `detail-view/detail-surface.tsx`                                              |
| `effect-observer-needs-disconnect`                  | 1         | `swipe-cell.tsx`                                                              |
| `role-button-requires-complete-keyboard-activation` | 1         | `gantt/gantt-links.tsx`                                                       |

Maintainability 类别中最高频模式是 `no-eager-new-in-use-state-initializer`——因 React 18→19 迁移中 `useState(() => new X())` 惰性初始化写法的 lint 规则的增加。总体为 **P3**——不影响功能，长期可修复。

### `check:audit-non-retained-renderer-references`

| 指标        | 值                                        |
| ----------- | ----------------------------------------- |
| 疑似引用    | 32                                        |
| 涉及类型    | 4（action, calendar, icon-picker, radio） |
| CI 可自动化 | ✅ 已自动化——在 `check` 链中              |

**评估**：所有 32 个引用均已在 M0 阶段裁决为 false positives（100% 来自 docs、tests、或 definition 文件）。此脚本已纳入 `pnpm check` 链且退出码为 0（无失败），可作为 CI guard 使用。无需额外自动化。

## 发现汇总

| ID          | Severity | 来源    | 描述                                                          | 建议处理                             |
| ----------- | -------- | ------- | ------------------------------------------------------------- | ------------------------------------ |
| MA72-P1-001 | **P1**   | Phase 1 | `gantt.types.ts:155-174` 7 个 deprecated 字段缺少替代方案描述 | MR3 补全 JSDoc                       |
| MA72-P2-001 | P2       | Phase 1 | 无项目级 `@deprecated` 使用 fail-fast CI guard                | MR3 引入 `eslint-plugin-deprecation` |
| MA72-P2-002 | P2       | Phase 3 | 14 个循环依赖（scheduling/gantt, form, condition-builder）    | MR3 评估是否可重构                   |
| MA72-P2-003 | P2       | Phase 3 | react-doctor Score 32/100 → Maintainability 173 warnings      | 关注即可                             |
| MA72-P3-001 | P3       | Phase 2 | 113 个可能未使用的 i18n keys                                  | MR 阶段核实清理                      |
| MA72-P3-002 | P3       | Phase 3 | knip 39 unused exports                                        | MR 阶段确认                          |

## 工具基线对比

| 工具                                           | M0 基线            | MA7.2              | 变化   | 备注               |
| ---------------------------------------------- | ------------------ | ------------------ | ------ | ------------------ |
| `pnpm audit:deps`                              | 14                 | 14                 | 无变化 | 同一组循环依赖     |
| `pnpm audit:knip`                              | 1                  | 1                  | 无变化 | 同基线             |
| `react-doctor`                                 | 607 issues, 32/100 | 607 issues, 32/100 | 无变化 | 未修复             |
| `check:audit-non-retained-renderer-references` | 32                 | 32                 | 无变化 | 仍为 4 类型        |
| `pnpm audit:semgrep`                           | not found          | not found          | 无变化 | 仍未安装           |
| `pnpm check:i18n-keys`                         | N/A (M0 未记录)    | 0                  | —      | 通过，788/788 同步 |

## 移交 MR3 的 P0/P1

- **MA72-P1-001**: 补全 `gantt.types.ts` 7 个 deprecated 字段的替代方案说明
