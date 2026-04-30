# 维度 14：测试覆盖与质量

## 初审概览

- 初审候选：4
- 维度复核：3 条保留，1 条降级

## 条目复核

### [保留] `flux-i18n` 是真实零测试包

- **关键文件**: `packages/flux-i18n/package.json`, `packages/flux-i18n/src/i18n.ts`
- **说明**: 包有实际状态性逻辑，但 `test` 脚本允许无测试直接通过。

### [降级] component-lab coverage manifest 对关键行为覆盖有夸大

- **关键文件**: `tests/e2e/component-lab/coverage-manifest.ts`, `tests/e2e/component-lab/action-logic.spec.ts`, `tests/e2e/component-lab/simple-form.spec.ts`
- **说明**: 部分场景已退化为 smoke 级断言，但不是所有条目都只剩“页面未崩”。

### [保留] `spreadsheet-renderers` 缺少真实交互行为测试

- **关键文件**: `packages/spreadsheet-renderers/src/renderers.integration.test.tsx`, `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`, `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-editing.ts`
- **说明**: grid 核心交互入口很多，但自动化主要仍覆盖 bridge/model/style 层。

### [保留] `report-designer-renderers` 集成测试文件过大且混合多条契约

- **关键文件**: `packages/report-designer-renderers/src/renderers.integration.test.tsx:149,248,341,402,443`
- **说明**: 539 行文件混合多类独立契约，失败定位成本高。
