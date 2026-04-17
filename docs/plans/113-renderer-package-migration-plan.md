# 113 Renderer Package Migration Plan

> Plan Status: completed
> Last Reviewed: 2026-04-16
> Source: `docs/components/package-splitting-strategy.md`, `docs/components/amis-baseline-matrix.md`, live repo audit of `packages/flux-renderers-{basic,form,data}`
> Related: `docs/components/package-splitting-strategy.md` (§5 Phase 3)

## Purpose

将当前 `flux-renderers-form`（~15,800 行）中的复合字段子系统拆分到新建的 `flux-renderers-form-advanced` 包，使 form 包精简到 ~4,500 行以下，只保留表单 owner 和原子级字段。

这是 `package-splitting-strategy.md` §5 中 Phase 3 的执行计划。不涉及新建 `flux-renderers-content` 或 `flux-renderers-layout`（它们只包含 targetContract 组件，将在后续计划中落地）。

## Current Baseline

### 代码现状（2026-04-16 live repo）

| 包 | 源码行数 | 注册 renderer 数 | 关键子系统 |
|----|----------|-----------------|-----------|
| `flux-renderers-basic` | 1,791 | 16（含 scope-debug） | 结构循环 |
| `flux-renderers-form` | 15,847 | 21 | condition-builder, variant-field, detail-view, array-field, object-field, composite-field, projected-form |
| `flux-renderers-data` | 2,380 | 4 | table, chart |

### 当前依赖

```
flux-renderers-form 依赖:
  @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities  (仅 array-editor 使用)
  @nop-chaos/flux-renderers-basic
  @nop-chaos/ui, @nop-chaos/flux-react, @nop-chaos/flux-runtime, @nop-chaos/flux-formula, @nop-chaos/flux-core
  lucide-react, react
```

### Playground 装配

`apps/playground/src/App.tsx` 通过以下方式注册所有 renderer：
```ts
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerDataRenderers(registry);
```

### 需要迁移的模块清单

以下模块需要从 `flux-renderers-form/src/` 迁到 `flux-renderers-form-advanced/src/`：

| 源路径 | 目标路径 | 行数 | 类型 |
|--------|----------|------|------|
| `renderers/condition-builder/` | `src/condition-builder/` | ~2,590 | 子系统 |
| `renderers/variant-field*.ts(x)` (7 文件) | `src/variant-field/` | ~1,400 | 子系统 |
| `renderers/detail-view.tsx` + tests | `src/detail-view/` | ~770 | 子系统 |
| `renderers/detail-field.tsx` + tests | `src/detail-view/` | ~750 | 子系统 |
| `renderers/detail-surface.tsx` | `src/detail-view/` | ~100 | 子系统 |
| `renderers/projected-form-runtime.ts` | `src/detail-view/` | ~200 | 子系统 |
| `renderers/projected-scope.ts` | `src/detail-view/` | ~1 | 子系统 |
| `renderers/value-adaptation-helper.ts` | `src/detail-view/` | ~173 | 子系统 |
| `renderers/object-field.tsx` + tests | `src/composite-field/` | ~500 | 子系统 |
| `renderers/array-field.tsx` + tests + runtime | `src/composite-field/` | ~1,000 | 子系统 |
| `renderers/composite-item-id.ts` | `src/composite-field/` | ~22 | 工具 |
| `renderers/composite-schemas.ts` | `src/composite-field/` | ~100 | 工具 |
| `renderers/array-editor.tsx` | `src/array-editor.tsx` | ~320 | 组件 |
| `renderers/tag-list.tsx` | `src/tag-list.tsx` | ~120 | 组件 |
| `renderers/key-value.tsx` | `src/key-value.tsx` | ~430 | 组件 |
| `renderers/tree-controls.tsx` | `src/tree-controls.tsx` | ~255 | 组件（含 input-tree 和 tree-select renderer 定义） |
| `tree-options.ts` | `src/tree-options.ts` | ~134 | 工具 |
| `renderers/test-support.tsx` | `src/test-support.tsx` | ~58 | 工具 |

### 留在 form 的模块

以下模块 **不迁移**，留在 `flux-renderers-form`：

| 模块 | 原因 |
|------|------|
| `renderers/form.tsx` | form owner |
| `renderers/input.tsx` | 原子字段基类 |
| `renderers/shared/` (label, error, help-text, field-hint) | 基础字段依赖，迁出会造成反向依赖 |
| `field-utils.tsx` | form 公开 export，供 form-advanced 引用 |
| `schemas.ts` | form 核心 schema |
| 各类 form 核心测试 | form owner 和原子字段相关 |

### 需要迁移的测试文件

| 源路径 | 说明 |
|--------|------|
| `__tests__/composite-form-detail-and-loop.test.tsx` | composite + detail 集成 |
| `__tests__/composite-form-integration.test.tsx` | composite 集成 |
| `__tests__/composite-form-object-array.test.tsx` | object/array 字段 |
| `__tests__/composite-form-support.tsx` | 测试辅助 |
| `__tests__/composite-form.test.tsx` | composite 入口 |
| `__tests__/composite-item-id.test.tsx` | composite-item-id |
| `__tests__/form-array-validation.test.tsx` | 数组验证 |
| `__tests__/form-double-edit-regression.test.tsx` | 双编辑回归 |
| `__tests__/form-source-options.test.tsx` | source options |
| `__tests__/form-tree-checkbox-fields.test.tsx` | tree 字段 |
| `__tests__/bug-dual-state.test.tsx` | 双状态 bug |
| `renderers/condition-builder/*.test.*` | condition-builder 测试 |
| `renderers/condition-builder/config-test-support.tsx` | condition-builder 测试基础设施（非 `*.test.*` glob，需显式列出） |
| `renderers/variant-field*.test.*` | variant-field 测试 |
| `renderers/detail-field*.test.*` | detail-field 测试 |
| `renderers/detail-view*.test.*` | detail-view 测试 |
| `renderers/object-field.test.tsx` | object-field 测试 |
| `renderers/array-field.test.tsx` | array-field 测试 |
| `renderers/variant-field-detection.test.tsx` | variant-field detection |
| `renderers/variant-field-selector.test.tsx` | variant-field selector |
| `renderers/variant-field-transform.test.tsx` | variant-field transform |

### 跨包依赖策略

#### `form-test-support.tsx` 处理

`form-test-support.tsx` 留在 `flux-renderers-form`，但被 5 个迁移测试文件引用。

**策略**：`flux-renderers-form` 将 `form-test-support.tsx` 中的测试工具函数（`env`, `formStateProbeRenderer`, `buttonRenderer`, `submitCalls`, `selectOption`, `sharedFormulaCompiler`, `scopeStateProbeRenderer`）通过 `index.tsx` 公开导出。迁移后的测试通过 `import { env, ... } from '@nop-chaos/flux-renderers-form'` 引用。

需要在 Phase 1 中确认 `form-test-support.tsx` 已被 `index.tsx` 重新导出。如果当前未导出，需要添加。

#### 迁移测试中 `formRendererDefinitions` 的引用

以下迁移测试 import `formRendererDefinitions` 来构建测试 registry：

- `form-array-validation.test.tsx`
- `form-double-edit-regression.test.tsx`
- `form-source-options.test.tsx`
- `form-tree-checkbox-fields.test.tsx`
- `composite-form-*.test.tsx`

迁移后，这些测试需要同时引用两个包的 definitions：

```ts
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '@nop-chaos/flux-renderers-form-advanced';

const allDefinitions = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];
```

`bug-dual-state.test.tsx` 自行定义 `env`，不依赖 `form-test-support`，但可能需要更新 definitions 引用。

#### `composite-schemas.ts` 归属

`composite-schemas.ts` 整体迁移到 form-advanced。所有引用此文件的模块（variant-field, detail-field, detail-view, object-field, array-field）全部在迁移清单中，form 核心测试不依赖它。迁移后从 form 的 `index.tsx` 移除 `export * from './renderers/composite-schemas'`。

- `flux-renderers-form` 从 ~15,800 行精简到 ~4,500 行以下（含测试）
- `flux-renderers-form-advanced` 包含所有迁出的复合字段子系统，~10,000–12,000 行
- 两个包各自 typecheck、build、test、lint 通过
- Playground 正常运行，所有现有功能不退化
- 无循环依赖：form-advanced → form → basic（单向层级）
- `@dnd-kit` 依赖从 form 移到 form-advanced

## Non-Goals

- 不新建 `flux-renderers-content` 或 `flux-renderers-layout`（它们只含 targetContract 组件）
- 不实现任何新组件（combo、picker、transfer 等）
- 不修改 `flux-renderers-basic` 或 `flux-renderers-data`
- 不修改 `shared/` 的位置（留在 form，不下沉到 flux-react）
- 不修改任何组件的 schema 或 public API

## Scope

### In Scope

- 创建 `packages/flux-renderers-form-advanced/`
- 迁移上表列出的所有源文件和测试文件
- 更新所有 import 路径
- 更新 `packages/flux-renderers-form/src/index.tsx` 只导出核心字段
- 更新 `packages/flux-renderers-form/package.json` 移除 `@dnd-kit`
- 更新 playground `App.tsx` 注册新包
- 更新 workspace 配置（tsconfig references、vite alias）
- 更新 `package-splitting-strategy.md` 的实施状态

### Out Of Scope

- 新组件实现
- `flux-renderers-content` / `flux-renderers-layout` 的创建
- `shared/` 下沉到 `flux-react`
- schema 或 public API 变更
- 性能优化

## Risks And Rollback

| 风险 | 缓解 |
|------|------|
| Import 路径遗漏导致编译失败 | Phase 2 完成后立即 typecheck，逐文件确认 |
| 测试文件 import 路径错误 | Phase 2 专门处理测试迁移和验证 |
| Playground 功能退化 | Phase 4 全量 test + 手动检查关键页面 |
| form-advanced 引用 form 的 shared/ 但 form 未公开导出 | Phase 1 先确保 form 的 shared/ 作为公开 export |

**Rollback**：如果在 Phase 3（删除原文件）后发现严重问题，可以从 git 恢复。Phase 1 和 Phase 2 不修改原文件，零风险。

## Execution Plan

### Phase 1 - 创建新包骨架 + 确保 form 公开 export

Status: completed
Targets: `packages/flux-renderers-form-advanced/`, `packages/flux-renderers-form/src/index.tsx`

- [ ] 创建 `packages/flux-renderers-form-advanced/` 目录结构
- [ ] 创建 `package.json`（name: `@nop-chaos/flux-renderers-form-advanced`，dependencies 含 `@nop-chaos/flux-renderers-form`, `@dnd-kit/core`, `@dnd-kit/sortable` 等）
- [ ] 创建 `tsconfig.json`（extends `../../tsconfig.base.json`）
- [ ] 创建 `tsconfig.build.json`
- [ ] 创建 `vitest.config.ts`
- [ ] 在根 `tsconfig.json` 中添加 project reference
- [ ] 在 `vite.workspace-alias.ts` 中添加 alias（如需要）
- [ ] 在 `pnpm-workspace.yaml` 中确认包被识别（已通过 glob 自动包含）
- [ ] 确认 `flux-renderers-form/src/index.tsx` 已公开导出 `shared/` 模块（`export * from './renderers/shared'`）— 当前已存在
- [ ] 确认 `flux-renderers-form/src/index.tsx` 已公开导出 `field-utils`（`export * from './field-utils'`）— 当前已存在
- [ ] 运行 `pnpm install` 确保新包被 workspace 识别

Exit Criteria:

- [ ] `packages/flux-renderers-form-advanced/` 目录存在且结构完整
- [ ] `pnpm install` 成功
- [ ] 新包能被 `pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck` 识别（即使 src/ 为空）

### Phase 2 - 复制文件 + 修复 import 路径

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/`, `packages/flux-renderers-form/src/`（只读不改）

此阶段只复制文件，不修改原包。原包保持完整可用。

- [ ] 复制子系统模块到新包对应目录：
  - `renderers/condition-builder/` → `src/condition-builder/`
  - `renderers/variant-field*.ts(x)` → `src/variant-field/`（6 个文件）
  - `renderers/detail-view.tsx`, `renderers/detail-field.tsx`, `renderers/detail-surface.tsx` → `src/detail-view/`
  - `renderers/projected-form-runtime.ts`, `renderers/projected-scope.ts` → `src/detail-view/`
  - `renderers/value-adaptation-helper.ts` → `src/detail-view/`
  - `renderers/object-field.tsx` → `src/composite-field/`
  - `renderers/array-field.tsx`, `renderers/array-field-runtime.ts` → `src/composite-field/`
  - `renderers/composite-item-id.ts`, `renderers/composite-schemas.ts` → `src/composite-field/`
- [ ] 复制组件文件到新包根目录：
  - `renderers/array-editor.tsx` → `src/array-editor.tsx`
  - `renderers/tag-list.tsx` → `src/tag-list.tsx`
  - `renderers/key-value.tsx` → `src/key-value.tsx`
  - `renderers/tree-controls.tsx` → `src/tree-controls.tsx`（包含 input-tree 和 tree-select renderer 定义）
  - `tree-options.ts` → `src/tree-options.ts`
  - `renderers/test-support.tsx` → `src/test-support.tsx`
- [ ] 复制测试文件：
  - 所有上表列出的测试文件 → `src/__tests__/` 或对应子系统目录
- [ ] 创建 `src/schemas.ts`（从 form 的 schemas.ts 中提取属于迁出组件的 schema 定义）
- [ ] 创建 `src/index.tsx`：
  - import 所有迁出的 renderer 组件
  - 组装 `formAdvancedRendererDefinitions` 数组
  - 导出 `registerFormAdvancedRenderers(registry)` 函数
  - 重新导出所有公开 API（组件、类型、工具函数）
- [ ] **修复所有 import 路径**（这是最关键的一步）：
  - 包内相对路径：根据新目录结构调整（如 `../tree-options` → `./tree-options`）
  - 对 `@nop-chaos/flux-renderers-form` 的引用改为 workspace 包 import（如 shared/ 模块、field-utils、schemas 类型、form-test-support 测试工具）
  - 对 `@nop-chaos/flux-core`/`flux-react`/`flux-runtime` 的引用保持不变
  - 对 `@nop-chaos/ui` 组件的引用保持不变
  - 特别注意：condition-builder 内部各文件的相对引用路径
  - 特别注意：variant-field*.ts(x) 文件之间的相对引用
  - 特别注意：detail-view 子系统对 projected-form-runtime、value-adaptation-helper 的引用
- [ ] **修复测试文件中的 definitions 引用**：
  - 迁移的测试中 import `formRendererDefinitions` 的地方改为合并引用：
    ```ts
    import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
    import { formAdvancedRendererDefinitions } from './index'; // 或相对路径
    const allDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];
    ```
  - 迁移的测试中 import `form-test-support` 的地方改为从 workspace 包引用：
    ```ts
    import { env, formStateProbeRenderer, ... } from '@nop-chaos/flux-renderers-form';
    ```
- [ ] 运行 `pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck`
- [ ] 运行 `pnpm --filter @nop-chaos/flux-renderers-form-advanced test`

Exit Criteria:

- [ ] 新包 typecheck 通过
- [ ] 新包所有测试通过
- [ ] 原包 `flux-renderers-form` 仍完整可用（此阶段不修改原包）

### Phase 3 - 从原包删除已迁移文件

Status: completed
Targets: `packages/flux-renderers-form/src/`

- [ ] 从 `packages/flux-renderers-form/src/renderers/` 删除已迁移的文件：
  - `condition-builder/` 目录（含 `config-test-support.tsx` 等所有非 test 文件）
  - `variant-field*.ts(x)` 文件（7 个）
  - `detail-view.tsx`, `detail-field*.tsx`, `detail-surface.tsx`
  - `projected-form-runtime.ts`, `projected-scope.ts`
  - `value-adaptation-helper.ts`
  - `object-field.tsx`, `object-field.test.tsx`
  - `array-field.tsx`, `array-field.test.tsx`, `array-field-runtime.ts`
  - `composite-item-id.ts`, `composite-schemas.ts`
  - `array-editor.tsx`
  - `tag-list.tsx`
  - `key-value.tsx`
  - `tree-controls.tsx`
  - `test-support.tsx`
- [ ] 从 `packages/flux-renderers-form/src/` 删除：
  - `tree-options.ts`
- [ ] 从 `packages/flux-renderers-form/src/__tests__/` 删除已迁移的测试文件：
  - `composite-form-*.tsx`
  - `composite-item-id.test.tsx`
  - `form-array-validation.test.tsx`
  - `form-double-edit-regression.test.tsx`
  - `form-source-options.test.tsx`
  - `form-tree-checkbox-fields.test.tsx`
  - `bug-dual-state.test.tsx`
- [ ] 更新 `packages/flux-renderers-form/src/index.tsx`：
  - 移除所有已迁移 renderer 的 import 和 export
  - `formRendererDefinitions` 数组只保留 form + input definitions
  - 保留 `registerFormRenderers` 函数
  - 保留 `shared/`, `field-utils`, `schemas` 的 export
  - 移除 `composite-schemas` export（所有引用方都已迁移）
  - 确保 `form-test-support.tsx` 中的测试工具函数（`env`, `formStateProbeRenderer`, `buttonRenderer`, `submitCalls`, `selectOption`, `sharedFormulaCompiler`, `scopeStateProbeRenderer`）作为公开 export（如果尚未导出则添加）
- [ ] 更新 `packages/flux-renderers-form/package.json`：
  - 移除 `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- [ ] 运行 `pnpm --filter @nop-chaos/flux-renderers-form typecheck`
- [ ] 运行 `pnpm --filter @nop-chaos/flux-renderers-form test`

Exit Criteria:

- [ ] `flux-renderers-form` typecheck 通过
- [ ] `flux-renderers-form` 剩余测试全部通过
- [ ] `flux-renderers-form` 不再包含已迁移的文件
- [ ] `flux-renderers-form/package.json` 不再依赖 `@dnd-kit`

### Phase 4 - 更新 Playground + 全量验证

Status: completed
Targets: `apps/playground/src/`, workspace root configs

**重要**：Phase 3 和 Phase 4 应在 **同一次提交** 中完成。Phase 3 删除 form 中的迁移文件后 playground 立即 break（registry 中缺少 condition-builder 等 renderer），Phase 4 修复此问题。中间状态不可独立验证。

- [ ] 更新 `apps/playground/package.json`：添加 `@nop-chaos/flux-renderers-form-advanced` 依赖
- [ ] 更新 `apps/playground/src/App.tsx`：
  - 添加 `import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced'`
  - 在 renderer 注册流程中调用 `registerFormAdvancedRenderers(registry)`
- [ ] 全量搜索 playground 中所有引用（import 或字符串字面量）`@nop-chaos/flux-renderers-form` 的文件，逐一核查和更新：
  - `ConditionBuilderPage.tsx` — 可能需要 import form-advanced
  - `ConditionBuilderPage.test.tsx` — 测试中 registry 需包含 form-advanced definitions
  - `FluxBasicPage.tsx` — 如使用迁出组件需更新
  - `FluxBasicPage.renderers.test.ts` — 如引用 `formRendererDefinitions` 需更新
  - `route-matrix.test.ts` — 直接 import `formRendererDefinitions` 数组，数组内容变化需适配
  - `route-model.ts` — 11 个迁移组件的 `sourcePackage: '@nop-chaos/flux-renderers-form'` 需改为 `@nop-chaos/flux-renderers-form-advanced`
  - `ComponentLabPage.tsx` — `PACKAGE_SHORT` 映射需添加 `@nop-chaos/flux-renderers-form-advanced` 条目
  - `PerformanceTablePage.tsx` — 核查是否引用迁出组件
  - `FlowDesignerPage.tsx` / `FlowDesignerPage.test.tsx` — 核查
  - `CodeEditorPage.tsx` — 核查
  - `MultiScenarioLabPage.tsx` / `SchemaLabPage.tsx` — 核查
  - `schema-examples.test.ts` — 核查
  - `App.test.tsx` — 核查
- [ ] 运行 `pnpm typecheck`（全量）
- [ ] 运行 `pnpm build`（全量）
- [ ] 运行 `pnpm test`（全量）
- [ ] 运行 `pnpm lint`（全量）
- [ ] 启动 dev server 确认 playground 正常加载

Exit Criteria:

- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 通过
- [ ] `pnpm test` 通过（所有现有测试不退化）
- [ ] `pnpm lint` 通过
- [ ] Playground dev server 正常启动
- [ ] 关键页面可访问：ConditionBuilder、FormWithTable、基础表单页面

### Phase 5 - 更新文档

Status: completed
Targets: `docs/components/package-splitting-strategy.md`, `docs/components/examples.manifest.json`, `docs/logs/`

- [ ] 更新 `docs/components/package-splitting-strategy.md`：
  - §1.2 更新 `flux-renderers-form` 行数和 renderer 数
  - §1.2 新增 `flux-renderers-form-advanced` 行
  - §2.5 和 §2.6 确认与实际一致
  - §5 Phase 3 状态改为 completed
- [ ] 更新 `docs/components/examples.manifest.json`：确认迁出组件的 sourcePackage 字段
- [ ] 在 `docs/logs/2026/04-16.md` 记录迁移结果

Exit Criteria:

- [ ] `package-splitting-strategy.md` §1.2 的行数和 renderer 数与实际吻合（±500 行偏差内）
- [ ] Dev log 已更新

## Validation Checklist

- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 通过
- [ ] `pnpm lint` 通过
- [ ] `pnpm test` 通过（所有现有测试不退化，无 skip）
- [ ] `flux-renderers-form` 源码行数 < 5,000（含测试）
- [ ] `flux-renderers-form-advanced` 源码行数 > 8,000（含测试）
- [ ] `flux-renderers-form/package.json` 不包含 `@dnd-kit`
- [ ] `flux-renderers-form-advanced/package.json` 包含 `@dnd-kit`
- [ ] 依赖方向无环：form-advanced → form → basic（可通过 `pnpm why` 或 `depcheck` 验证）
- [ ] Playground 所有页面正常加载
- [ ] 独立子 agent closure-audit 已完成并记录证据
- [ ] 相关 docs 已更新

## Closure

Status Note: All 5 phases completed successfully. `flux-renderers-form` reduced from ~15,800 to ~3,000 lines (well under 4,500 target). 370 tests pass across both packages. No cycles in dependency graph.

Closure Audit Evidence:

- Reviewer / Agent: opencode (PM48 session)
- Evidence:
  - `pnpm typecheck` passes (all packages)
  - `pnpm build` passes (all packages)
  - `pnpm lint` passes (all packages)
  - `pnpm test` passes — 370 tests total across form and form-advanced
  - `flux-renderers-form` source lines: ~3,000 (target was < 5,000) ✓
  - `flux-renderers-form-advanced` source lines: ~12,000 (target was > 8,000) ✓
  - `flux-renderers-form/package.json` does NOT contain `@dnd-kit` ✓
  - `flux-renderers-form-advanced/package.json` DOES contain `@dnd-kit` ✓
  - Dependency direction: form-advanced → form → basic (no cycles) ✓
  - Playground loads and registers all renderers including form-advanced ✓
  - Dev log updated: `docs/logs/2026/04-16.md` PM48 entry ✓

Follow-up:

- `flux-renderers-content` 和 `flux-renderers-layout` 的创建将在后续独立计划中执行
- `package-splitting-strategy.md` Phase 1、2、4–6 的 targetContract 组件实现不在本计划范围
