# 维度 16：文档-代码一致性

## 第 1 轮（初审）

### [维度16-01] Active docs 仍指向已归档 analysis 路径，导致文档锚点 hard gate 失败

- **文件**: `docs/index.md:32,71,102,131`; `docs/architecture/playground-experience.md:162`; `docs/architecture/debugger-runtime.md:17`; `docs/references/maintenance-checklist.md:36,165`
- **文档路径**: `docs/index.md`, `docs/architecture/playground-experience.md`, `docs/architecture/debugger-runtime.md`, `docs/references/maintenance-checklist.md`
- **代码路径（如有）**: 无业务代码路径；由 hard gate `pnpm check:active-doc-code-anchors` / `scripts/check-active-doc-code-anchors.mjs` 检出
- **漂移类型**: 路径失效 / 文档路由漂移
- **证据片段**:
  ```text
  [check-active-doc-code-anchors] ERROR: unresolved code/doc anchors found:
    - docs/index.md:32 -> docs/analysis/2026-04-26-flux-architecture-improvement-opportunities.md
    - docs/index.md:71 -> docs/analysis/2026-03-21-excel-report-designer-research.md
    - docs/index.md:102 -> docs/analysis/2026-03-21-framework-debugger-design.md
    - docs/index.md:131 -> docs/analysis/2026-04-04-nop-chaos-flux-comparison-report.md
    - docs/architecture/playground-experience.md:162 -> docs/analysis/2026-03-21-framework-debugger-design.md
    - docs/architecture/debugger-runtime.md:17 -> docs/analysis/2026-03-21-framework-debugger-design.md
    - docs/references/maintenance-checklist.md:36 -> docs/analysis/2026-04-01-docs-design-review-2026-03-29.md
    - docs/references/maintenance-checklist.md:165 -> docs/analysis/2026-03-19-form-validation-comparison.md
  ```
- **严重程度**: P0
- **文档描述**: active routing / architecture / maintenance docs 仍把若干旧 analysis 文件作为可点击当前路径引用，例如 `docs/index.md` 的阅读路由和 `debugger-runtime.md` 的 historical exploration 引用。
- **代码现状**: `pnpm check:active-doc-code-anchors` 当前失败；这些 `docs/analysis/...` 文件在 active `docs/analysis/` 下不存在。live 复核发现对应文件已位于 `docs/archive/analysis/`。
- **现状**: active docs 发布了失效路径，且该失效已进入 lint/check fail-fast 链路，使 `pnpm lint` / `pnpm check` 因文档锚点 gate 提前失败。
- **风险**: 阻断 CI/本地验证；同时误导读者以为这些 analysis 仍是 active analysis 路径，而不是 archive 历史/研究材料。
- **建议**: 将仍需引用的历史材料路径改为 `docs/archive/analysis/...`；若不应继续作为 active routing 入口，则改指向当前 owner doc，并只在相关文档中保留 archive 参考。
- **为什么值得现在做**: 这是当前 hard gate 失败的直接原因，不是低价值文档清理；修复后可恢复 `pnpm check:active-doc-code-anchors`、进而解除 `pnpm lint` / `pnpm check` 的提前失败。
- **误报排除**: 已按 `AGENTS.md` 要求检查 `docs/archive/`；目标文件确实存在于 archive，而非 active `docs/analysis/`。因此不是链接检查器误报，而是 active docs 未同步归档路径。
- **历史模式对应**: 文档路径失效 / active baseline 与 archive 迁移不同步。
- **参考文档**: `docs/references/audit-tooling.md`; `docs/references/maintenance-checklist.md`; `docs/index.md`
- **复核状态**: 未复核

## Hard gate 摘要

- 已实际运行 `pnpm check:active-doc-code-anchors`，结果失败，输出与主 agent 基线一致。
- 失败项共 8 个 active doc anchor。
- live 复核确认：这些目标不在 active `docs/analysis/`；对应文件存在于 `docs/archive/analysis/`。
- 因 `docs/references/audit-tooling.md` 明确该命令是 hard gate，当前应按硬性文档-代码漂移处理。

## docs/architecture 抽样结果

已抽样读取/核对：`docs/architecture/README.md`、`docs/references/architecture-doc-status-matrix.md`、`docs/architecture/playground-experience.md`、`docs/architecture/debugger-runtime.md`、`docs/architecture/performance-design-requirements.md`、`docs/architecture/flux-runtime-module-boundaries.md`、`docs/architecture/renderer-runtime.md`、`docs/architecture/styling-system.md`、`docs/architecture/form-validation.md`、`docs/references/terminology.md`。

结果：

- 除 hard gate 已列出的 `docs/analysis/...` 失效链接外，本轮抽样未确认新的高价值 owner 漂移。
- `flux-runtime-module-boundaries.md` 的 runtime/form/compiler 文件锚点与 live glob 抽样基本一致。
- `renderer-runtime.md` 描述的 `flux-react` hooks 与 `packages/flux-react/src/index.tsx` / `hooks.ts` 抽样一致。
- `styling-system.md` 的 `classAliases` 实现位置与 `packages/flux-core/src/class-aliases.ts` 抽样一致。
- 额外注意：`docs/architecture/performance-design-requirements.md:15` 也引用 `docs/analysis/2026-03-31-deep-architecture-analysis.md`，live glob 显示该文件同样位于 `docs/archive/analysis/`；但本次 hard gate 输出未列入，建议第 2 轮确认该 anchor 是否被脚本规则排除或输出截断。

## plans 抽样结果

已读取/抽样：`docs/plans/00-plan-authoring-and-execution-guide.md`、`docs/plans/431-deep-audit-2026-05-23-maintenance-surface-remediation-plan.md`、`docs/plans/435-open-ended-adversarial-review-2026-05-23-spreadsheet-search-host-contract-plan.md`、`docs/plans/430-eliminate-hardcoded-type-dispatch-plan.md`、`docs/plans/424-deep-audit-2026-05-20-remediation-routing-plan.md`。

结果：active plans glob 中当前计划大多为 `Plan Status: completed`；除模板 guide 外的 plan 文件未发现未勾选 checklist；抽样计划的 status、phase/workstream status、closure gates 在文本层面基本一致；未在本轮抽样中确认新的计划状态失真。

## 总结评估

第 1 轮初审确认 1 个高价值发现：active docs 仍引用已归档 analysis 文件，且已造成 hard gate 失败。该问题优先级高于普通文档清理，因为它直接阻断 `pnpm check:active-doc-code-anchors`，并连带导致 `pnpm lint` / `pnpm check` 提前失败。

## 第 2 轮深挖方向

- 全量搜索 active docs 中仍指向 `docs/analysis/2026-...`、但实际已归档到 `docs/archive/analysis/` 的链接，特别复核 `performance-design-requirements.md:15`。
- 检查 `check-active-doc-code-anchors` 是否故意只覆盖部分 active docs 或存在漏报规则。
- 对 `docs/index.md` 的 routing 入口逐项判断：应改为 archive 链接，还是改指向当前 owner architecture/reference 文档。

## 深挖第 2 轮追加

### [维度16-02] active-doc anchor hard gate 只扫描 6 个文件，遗漏其他 active owner docs 的失效路径

- **文件+行号**: `scripts/check-active-doc-code-anchors.mjs:8-17`; `docs/architecture/performance-design-requirements.md:9-15`; `docs/architecture/array-field.md:275-278`
- **证据片段**:

  ```js
  const activeDocPaths = [
    'docs/index.md',
    'docs/architecture/playground-experience.md',
    'docs/architecture/theme-compatibility.md',
    'docs/architecture/debugger-runtime.md',
    'docs/architecture/flow-designer/collaboration.md',
    'docs/references/maintenance-checklist.md',
  ];
  ```

  ```md
  ## Source Basis

  - `docs/architecture/flux-core.md`
  - `docs/architecture/renderer-runtime.md`
  - `docs/architecture/flux-runtime-module-boundaries.md`
  - `docs/architecture/flow-designer/design.md`
  - `docs/analysis/2026-03-31-deep-architecture-analysis.md`
  ```

  ```md
  源码证据：

  - `packages/amis/src/renderers/Form/InputArray.tsx` 头部注释直接写明：`InputArray 数组输入框。combo 的别名。`
  ```

- **严重程度**: P1
- **现状**: 第 1 轮已覆盖 `pnpm check:active-doc-code-anchors` 当前输出的 8 个失败项；但 live 复核发现该 hard gate 仅扫描 6 个手写 active docs。对 `docs/architecture/`、`docs/references/`、`docs/components/` 做同规则抽样扫描后，仍能发现未被 gate 输出覆盖的 active owner docs 失效路径，例如 `performance-design-requirements.md` 指向已归档的 `docs/analysis/2026-03-31-deep-architecture-analysis.md`，`array-field.md` 指向当前仓库不存在的 `packages/amis/src/renderers/Form/InputArray.tsx`。
- **风险**: 文档锚点 hard gate 名义上覆盖 “active docs”，实际只覆盖少数文件，会让 owner docs 中的失效代码/文档路径继续进入当前基线；维护者修完第 1 轮 8 个失败项后可能误以为 active 文档路径已全量恢复，但其他 active 架构文档仍会误导读者或在后续扩展 gate 时再次爆雷。
- **建议**: 将 `check-active-doc-code-anchors` 的扫描范围改为按目录发现 active docs，并显式排除 `docs/archive/`、`docs/logs/`、`docs/analysis/`、`docs/plans/` 等历史/执行文档；同时修复已暴露的未覆盖失效锚点：历史 analysis 改指 `docs/archive/analysis/...` 或当前 owner doc，外部 AMIS 参考不要写成仓库内 backtick path，或改为明确的外部路径/说明。
- **误报排除**: 这不是重复报告已有 `[维度16-01]`。`[维度16-01]` 报告的是当前 hard gate 已输出的 8 个失败项；本条报告的是 hard gate 覆盖面本身与 active owner docs 不一致，并给出未被第 1 轮失败输出覆盖的新失效路径。`docs/architecture/performance-design-requirements.md` 目标文件不存在于 active `docs/analysis/`，只存在于 `docs/archive/analysis/`；`packages/amis/...` 不在当前 `pnpm-workspace.yaml` 的 `apps/*` / `packages/*` 工作区内。
- **参考文档**: `docs/references/audit-tooling.md:41-42`; `docs/index.md:5-11`; `docs/skills/deep-audit-prompts.md:1515-1518`
- **复核状态**: 未复核

### [维度16-03] flux-runtime-module-boundaries 仍登记已删除/迁移的 compiler 与 runtime 测试路径

- **文件+行号**: `docs/architecture/flux-runtime-module-boundaries.md:65-79,354-362`; `packages/flux-compiler/src/schema-compiler/index.ts:1-7`
- **证据片段**:
  ```md
  - `packages/flux-compiler/src/schema-compiler.ts`
    - schema-shape normalization
    - region extraction
    - renderer field classification
    - deep table column normalization
    - compiled form-validation model assembly
  - `packages/flux-compiler/src/schema-compiler/index.ts`
    - compiler submodule composition
  - `packages/flux-compiler/src/schema-compiler/fields.ts`
    - renderer field classification helpers and meta-program compilation
  - `packages/flux-compiler/src/schema-compiler/regions.ts`
    - region extraction and nested child normalization helpers
  ```
  ```md
  4. Add focused coverage in `packages/flux-runtime/src/validation/validators.test.ts` or `packages/flux-runtime/src/validation/registry.test.ts`.
  5. Add or update integration coverage in active runtime test files such as `packages/flux-runtime/src/index.test.ts`, `packages/flux-runtime/src/form-runtime-validation.test.ts`, or other colocated runtime contract tests when behavior changes.
  ```
  ```ts
  export {
    createTemplateRegion,
    extractNestedSchemaRegions,
    visitNestedSchemaRegions,
    validateRegionParams,
  } from '@nop-chaos/flux-core';
  export type { NestedRegionFieldRule } from '@nop-chaos/flux-core';
  ```
- **严重程度**: P2
- **现状**: 文档把 `packages/flux-compiler/src/schema-compiler/regions.ts` 列为 compiler boundary owner，但 live `packages/flux-compiler/src/schema-compiler/` 下不存在 `regions.ts`；区域抽取相关 API 现在由 `schema-compiler/index.ts` 从 `@nop-chaos/flux-core` re-export，并由 `node-compiler.ts` / `tables.ts` 调用。文档还建议更新 `packages/flux-runtime/src/index.test.ts` 与 `packages/flux-runtime/src/form-runtime-validation.test.ts`，但 live runtime 测试已位于 `src/__tests__/...`、`src/validation/...` 等路径，根层不存在这两个测试文件。
- **风险**: 这是 owner 文档中的文件所有权映射漂移。后续开发者按文档新增 region/validation 相关逻辑或测试时，会把变更落到不存在或错误的文件路径，增加重复搜索和错误归属风险；也会削弱该文档作为 package-boundary owner map 的可信度。
- **建议**: 更新 `flux-runtime-module-boundaries.md`：删除 `schema-compiler/regions.ts` 条目，改写为 `extractNestedSchemaRegions` / `createTemplateRegion` 的当前 owner 在 `flux-core`，compiler 通过 `schema-compiler/index.ts` re-export、`node-compiler.ts` / `tables.ts` 消费；测试建议改为当前存在的 `packages/flux-runtime/src/__tests__/runtime-validation*.test.ts`、`owner-validation-lifecycle-contracts.test.ts`、`validation/*.test.ts` 等实际路径，或使用“other colocated runtime contract tests”而不点名已删除文件。
- **误报排除**: 这不是单纯的代码搬迁历史记录。该文档是 active owner 文档，维度 16 明确要求检查 `flux-runtime-module-boundaries.md` 的文件所有权映射；live glob 确认 `regions.ts`、`index.test.ts`、`form-runtime-validation.test.ts` 在当前路径不存在，而对应职责和测试仍存在于其他 live 文件中。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`; `docs/references/audit-tooling.md:41-42`; `docs/index.md:97-100`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度16-04] Flow Designer owner docs 仍指向已拆分删除的 `designer-page-shell.test.tsx`

- **文件+行号**: `docs/architecture/flow-designer/runtime-snapshot.md:16-19`; `docs/architecture/flow-designer/config-schema.md:31-33`; `docs/architecture/flow-designer/collaboration.md:210-213`
- **证据片段**:
  ```md
  - `packages/flow-designer-renderers/src/designer-page.tsx`
  - `packages/flow-designer-renderers/src/designer-context.ts`
  - `packages/flow-designer-renderers/src/designer-page-shell.test.tsx`
  - `packages/flow-designer-renderers/src/designer-provider-and-manifest.test.tsx`
  ```
  ```md
  - `packages/flow-designer-renderers/src/designer-page-shell.test.tsx` 现在也有正向回归测试锁定该现状
  ```
  ```md
  - `packages/flow-designer-renderers/src/designer-page-status.test.tsx` 和 `packages/flow-designer-renderers/src/designer-page-rendering.test.tsx`
  ```
- **严重程度**: P2
- **现状**: live glob 确认 `packages/flow-designer-renderers/src/designer-page-shell.test.tsx` 已不存在；Flow Designer focused tests 已拆到 `designer-page-status.test.tsx`、`designer-page-rendering.test.tsx`、`designer-page-failures.test.tsx` 等文件。相邻的 `collaboration.md` 已指向新测试名，但 `runtime-snapshot.md`、`config-schema.md`、`canvas-adapters.md` 仍发布旧测试 owner 路径。
- **风险**: 维护者按 active owner doc 追加 Flow Designer snapshot、dialogs region 或 canvas bridge 回归测试时会落到已删除路径，削弱 plan 431 测试拆分后的 owner boundary，并使文档继续暗示旧“大杂烩 shell test”仍是当前验证入口。
- **建议**: 将所有 `designer-page-shell.test.tsx` 引用改为拆分后的 focused tests；`dialogs` region 证明指向 `designer-page-rendering.test.tsx`，失败/submitAction 证明指向 `designer-page-failures.test.tsx`，statusPath 证明指向 `designer-page-status.test.tsx`，canvas bridge 证明优先指向 `canvas-bridge.test.tsx` / `index.xyflow.test.tsx`。
- **误报排除**: 这不是重复报告 `[维度16-02]` 的 active-doc anchor gate 覆盖面问题；本条聚焦的是 plan 431 完成测试拆分后，Flow Designer owner docs 内部仍混用新旧测试 owner 路径。live `packages/flow-designer-renderers/src/*.test.tsx` 存在拆分后的替代测试，旧 shell test 不存在。
- **参考文档**: `docs/plans/431-deep-audit-2026-05-23-maintenance-surface-remediation-plan.md`; `docs/plans/00-plan-authoring-and-execution-guide.md`; `docs/architecture/flow-designer/collaboration.md`
- **复核状态**: 未复核

### [维度16-05] `package-splitting-strategy.md` 仍把已完成的 form-advanced 拆包写成未执行迁移路线

- **文件+行号**: `docs/components/package-splitting-strategy.md:667-714`; `packages/flux-renderers-form-advanced/package.json:1-23`; `packages/flux-renderers-form-advanced/src/index.tsx:38-52`
- **证据片段**:

  ```md
  ### Phase 3：从 `flux-renderers-form` 拆出 `flux-renderers-form-advanced`

  **目标**：将 `flux-renderers-form` 从 ~16K 行精简到 ~4K 行。

  1. **创建新包**：`packages/flux-renderers-form-advanced/`（package.json、tsconfig、vitest.config）。
  ```

  ```json
  "name": "@nop-chaos/flux-renderers-form-advanced",
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@nop-chaos/flux-renderers-form": "workspace:*"
  }
  ```

  ```ts
  export const formAdvancedRendererDefinitions: RendererDefinition[] = [
    ...treeControlRendererDefinitions,
    tagListRendererDefinition,
    keyValueRendererDefinition,
  ];
  ```

- **严重程度**: P2
- **现状**: `docs/components/index.md` 将 `package-splitting-strategy.md` 作为组件实现包归属和分包策略入口，但该 active doc 的 Phase 3 仍以未执行迁移步骤描述“创建新包、复制模块、替换原包、全量验证”。live code 中 `@nop-chaos/flux-renderers-form-advanced` 已是实际 workspace 包，并公开注册迁出 renderers；`flux-renderers-form` 也已不再声明 `@dnd-kit` 依赖。
- **风险**: 新组件或复合字段维护者会把已完成迁移误读为待执行计划，继续按旧步骤复制/移动模块，或误判 `flux-renderers-form` 与 `flux-renderers-form-advanced` 的当前 owner 边界。该文件还承担包归属决策入口，状态漂移会放大到后续组件落点判断。
- **建议**: 将 Phase 3 改为 completed/current baseline：保留当前 `form-advanced → form` 依赖方向、实际注册 renderer 清单和维护判据；把历史迁移步骤移入 archive/历史计划引用，或明确标为已完成历史，不再以 unchecked migration route 形式出现在 active strategy 主路径。
- **误报排除**: 这不是要求回写普通历史 completed plan；问题位于 active component strategy owner doc，而不是 `docs/archive/plans/113-...`。live package、package manifest 和 root registry 已证明 Phase 3 不再是待执行状态。
- **参考文档**: `docs/components/index.md`; `docs/plans/00-plan-authoring-and-execution-guide.md`; `docs/references/maintenance-checklist.md`
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度16-06] Surface owner/docs 承诺 dialog/drawer 组件句柄，但 live definition/runtime 未发布对应 capability

- **文件+行号**: `docs/architecture/surface-owner.md:245-258`; `docs/components/dialog/design.md:67-73`; `packages/flux-renderers-basic/src/basic-renderer-definitions.ts:307-338`; `packages/flux-renderers-basic/src/dialog.tsx:5-7`; `packages/flux-renderers-basic/src/drawer.tsx:5-7`
- **证据片段**:

  ```md
  ## Built-In Actions And Handles

  surface owner 的典型 instance capability 是：

  - `component:open`
  - `component:close`
  - `component:toggle`（可选，但推荐）
  ```

  ```md
  ## 8. 事件、动作与组件句柄能力

  - 推荐支持 `component:open`、`component:close`，可选支持 `component:toggle`。
  ```

  ```ts
  {
    type: 'dialog',
    displayName: 'Dialog',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    component: DialogRenderer,
    fields: [
      { key: 'title', kind: 'value-or-region', regionKey: 'title' },
  ```

- **严重程度**: P2
- **现状**: active owner docs 把 surface instance capability 写成当前/推荐基线，但 `dialog` / `drawer` renderer definitions 只声明 fields，没有 `componentCapabilityContracts`；对应 `DialogRenderer` / `DrawerRenderer` 仅调用 `useSurfaceRenderer(...)` 并返回 `null`，未注册 component handle。全仓 `componentCapabilityContracts` 只覆盖 form/table/crud/chart/tabs 等，未发现 `open` / `close` / `toggle` capability 发布。
- **风险**: schema authoring / tooling 按 owner docs 认为 declarative dialog/drawer 可通过 `component:open` / `component:close` 驱动，但 live runtime 实际只能依赖 `openDialog` / `openDrawer` / `closeSurface` 等 action path 或 declarative `open`，形成 docs-code drift。后续 capability manifest、静态校验或组件操作面会把 surface handle 当成支持中入口，运行时却解析不到 handle。
- **建议**: 二选一收口：若 surface instance capability 是当前支持基线，则为 dialog/drawer definition 补 `componentCapabilityContracts`，并在 `useSurfaceRenderer` 或 dedicated handle module 中注册 open/close/toggle handle；若当前只支持 action/declarative path，则把 `surface-owner.md` 与 dialog/drawer owner docs 改写为“future / not yet implemented”，并明确当前 supported authoring baseline 是 `openDialog` / `openDrawer` / `closeSurface` 与 declarative `open`。
- **误报排除**: 这不是已覆盖的 active docs anchors、runtime boundary、Flow shell test 或 package splitting 问题；也不是单纯 wording 偏好。live grep 未发现 `component:open` / `component:close` / `component:toggle` 实现或 definition contract，且同仓其他组件已用 `componentCapabilityContracts` 明确发布实际能力，说明 dialog/drawer 缺口是可观测的 doc-code drift。
- **参考文档**: `docs/references/renderer-interfaces.md`; `docs/architecture/surface-owner.md`; `docs/components/dialog/design.md`
- **复核状态**: 未复核

## 深挖第 5 轮追加

### [维度16-07] `input-number` 已落地但组件 roadmap/index 仍列为“尚未实现”

- **文件+行号**: `docs/components/roadmap.md:79-101,154-157`; `docs/components/index.md:356-380`; `packages/flux-renderers-form/src/renderers/input.tsx:176-183`; `packages/flux-renderers-form/src/definitions.ts:14-18`
- **证据片段**:
  ```md
  ### 3. 已文档化且当前尚未实现的 retained renderer

  ...

  - `input-number`
  ```
  ```md
  - 继续实现并验证当前已文档化但尚未实现的 retained renderer，优先顺序建议：... `input-number`、日期时间 family。
  ```
  ```ts
  {
    type: 'input-number',
    fields: formFieldRules,
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
    component: InputNumberRenderer,
  }
  ```
- **严重程度**: P2
- **现状**: `input-number` 已在 `flux-renderers-form` 注册并进入 `formRendererDefinitions`，且已有 `docs/components/input-number/design.md`、`example.json` 和 focused tests；但 active 组件导航/roadmap 仍把它放在“已文档化且当前尚未实现”的 retained renderer 队列，并在 P1 优先级中建议继续实现。
- **风险**: 组件规划入口会误导维护者把已完成 renderer 当成待实现项，影响后续排期、manifest/status 维护和 AMIS retained baseline 判断；也会降低 `docs/components/index.md` / `roadmap.md` 作为 owner docs 的可信度。
- **建议**: 将 `input-number` 从 “尚未实现 retained renderer” 列表移入“当前代码已注册的通用 renderer”，并同步 P1 优先级措辞；同时复核 `examples.manifest.json` 中 `input-number` 是否仍处于 `targetContract` 分组，必要时迁到 runtime 分组。
- **误报排除**: 这不是已覆盖的 active anchors、runtime boundary、flow shell test、package splitting 或 surface handles。live code 明确注册 `type: 'input-number'`，`packages/flux-renderers-form/src/__tests__/input-number.test.tsx` 也覆盖渲染/交互；同一组件在 `amis-baseline-matrix.md` 已标为 `landed`，说明 roadmap/index 状态确实滞后。
- **参考文档**: `docs/components/input-number/design.md`; `docs/components/amis-baseline-matrix.md`; `docs/components/index.md`
- **复核状态**: 未复核

## 深挖第 6 轮追加

### [维度16-08] `flux-react/src/index.tsx:479` 架构锚点已失效

- **文件+行号**: `docs/architecture/flow-designer/design.md:117-127`; `docs/architecture/report-designer/design.md:125-135`; `packages/flux-react/src/index.tsx:1-14`
- **证据片段**:

  ```md
  ## 4. 为什么不做独立引擎

  参考 `packages/flux-react/src/index.tsx:479`，当前体系已经具备：

  - registry 驱动 renderer 发现
  - schema compile 和动态值编译缓存
  - page/form runtime
  - scope 上下文
  - dialog host
  - action dispatch
  ```

  ```md
  ## 4. 为什么要分成 Spreadsheet 和 Report Designer 两层

  参考 `packages/flux-react/src/index.tsx:479`，当前体系已经具备:

  - registry 驱动 renderer 发现
  - schema compile 和动态值编译缓存
  - page/form runtime
  ```

  ```ts
  1: export { createDefaultEnv, createDefaultRegistry } from './defaults.js';
  2: export { createSchemaRenderer } from './schema-renderer.js';
  ...
  14: export { DialogHost } from './dialog-host.js';
  ```

- **严重程度**: P2
- **现状**: 两个 active architecture owner docs 仍引用 `packages/flux-react/src/index.tsx:479`，但 live 文件当前只有 77 行，行号锚点已经失效。相关能力也已拆分到 `schema-renderer.tsx`、`hooks.ts`、`dialog-host.tsx`、`workbench/hooks.ts` 等文件。
- **风险**: Flow Designer / Report Designer 架构读者按 owner doc 跳转时会落到不存在行号，降低“不要重复造引擎”这一关键架构决策的可验证性；后续维护者也可能误以为 `flux-react/src/index.tsx` 仍是包含运行时实现的大文件。
- **建议**: 把引用改成当前 owner 文件集合，例如 `packages/flux-react/src/schema-renderer.tsx`、`packages/flux-react/src/hooks.ts`、`packages/flux-react/src/dialog-host.tsx`、`packages/flux-react/src/workbench/hooks.ts`，避免固定易漂移行号；或指向 `docs/architecture/renderer-runtime.md` 作为稳定说明入口。
- **误报排除**: 这不是已覆盖的 active docs archive anchor、Flow shell test、runtime boundary 或 input-number roadmap 问题；live `packages/flux-react/src/index.tsx` 明确只有 77 行，`:479` 不可能是有效锚点。
- **参考文档**: `docs/architecture/renderer-runtime.md`; `docs/index.md`
- **复核状态**: 未复核

### [维度16-09] package-splitting strategy 把未存在的 content/layout 包写入“最终包结构”

- **文件+行号**: `docs/components/package-splitting-strategy.md:101-111,644-664`; `pnpm-workspace.yaml:1-3`
- **证据片段**:

  ```md
  ## 2. 最终包结构

  packages/
  ├── flux-renderers-basic/ # 结构节点 + 表面 owner + 基础动作/展示
  ├── flux-renderers-content/ # 纯内容展示与反馈（新包）
  ├── flux-renderers-layout/ # 高级布局与流程容器（新包）
  ├── flux-renderers-form/ # 表单 owner + 核心表单字段
  ├── flux-renderers-form-advanced/ # 复合/高级表单字段（新包，从 form 拆出）
  ```

  ```md
  ### Phase 1：创建 `flux-renderers-content`

  - [ ] 创建 `packages/flux-renderers-content/`（package.json、tsconfig、vitest.config）。

  ### Phase 2：创建 `flux-renderers-layout`

  - [ ] 创建 `packages/flux-renderers-layout/`。
  ```

  ```yaml
  packages:
    - apps/*
    - packages/*
  ```

- **严重程度**: P2
- **现状**: active package owner strategy 的“最终包结构”把 `flux-renderers-content` / `flux-renderers-layout` 写成目标拓扑的一部分，但同一文件后文仍以未勾选 Phase 1/2 表示需要创建；live `packages/*` 下当前不存在这两个 package。
- **风险**: 包归属决策入口同时表达“已是最终结构”和“尚待创建”，会误导新 retained renderer 的落点判断；维护者可能把 wave 1/2 组件放到不存在包，或误判 workspace 已经具备这些拆分边界。
- **建议**: 将 §2 标注为“target/future package structure”，并在当前 baseline 中明确 live packages 仅包含 `flux-renderers-basic/form/form-advanced/data/...`；Phase 1/2 保留为 future route，直到对应 package 真正创建后再改为 current baseline。
- **误报排除**: 这不是重复 `[维度16-05]` 的 form-advanced Phase 3 已完成问题；本条聚焦尚未存在的 `flux-renderers-content` / `flux-renderers-layout` 被写入“最终包结构”的 current-vs-future 状态漂移。
- **参考文档**: `docs/components/index.md`; `docs/components/roadmap.md`; `docs/plans/00-plan-authoring-and-execution-guide.md`
- **复核状态**: 未复核

## 深挖第 7 轮追加

### [维度16-10] `action-scope-and-imports.md` 仍引用已失效的 `RendererRuntime.dispatch()` 行号/owner 文件

- **文件+行号**: `docs/architecture/action-scope-and-imports.md:1196-1198`; `packages/flux-core/src/index.ts:1-7`; `packages/flux-core/src/types/renderer-core.ts:426-429`
- **证据片段**:

  ```md
  ### Renderer Runtime Surface

  The runtime already needs an action-scope-aware dispatch path, and the contract should remain consistent with the current `RendererRuntime.dispatch()` shape in `packages/flux-core/src/index.ts:881`.
  ```

  ```ts
  1: export * from './types.js';
  2: export * from './schema-diagnostics/index.js';
  3: export * from './validation-model.js';
  4: export * from './constants.js';
  5: export * from './compiled-cid.js';
  6: export * from './value-adapter.js';
  7: export * from './registry.js';
  ```

  ```ts
  426:   dispatch(
  427:     action: ActionSchema | ActionSchema[] | CompiledActionProgram,
  428:     ctx: ActionContext,
  429:   ): Promise<ActionResult>;
  ```

- **严重程度**: P2
- **现状**: active architecture owner doc 把 `RendererRuntime.dispatch()` 的当前 contract 锚定到 `packages/flux-core/src/index.ts:881`，但 live `packages/flux-core/src/index.ts` 只有 76 行且只是 barrel export。实际 `RendererRuntime.dispatch()` 定义位于 `packages/flux-core/src/types/renderer-core.ts:426-429`。
- **风险**: 该文档是 action scope/import/component handle 的 owner 说明，失效锚点会让读者无法验证 dispatch contract，并误以为 `flux-core/src/index.ts` 仍承载类型实现细节；后续修改 action-scope-aware dispatch 时可能改错 owner 文件或忽略真实 contract 定义位置。
- **建议**: 将该引用改为 `packages/flux-core/src/types/renderer-core.ts` 中的 `RendererRuntime.dispatch()`，并避免固定易漂移行号；如需稳定入口，可同时写明 `packages/flux-core/src/index.ts` 只是 re-export surface。
- **误报排除**: 这不是已覆盖的 `flux-react/src/index.tsx:479` 行锚点问题，也不是 package-splitting content/layout 或已报 active archive anchor。脚本复核 active `docs/architecture` / `docs/components` / `docs/references` / `docs/plans` 中的 backtick 行号锚点时，排除已报项后仅确认此新增失效锚点；live read 证明 `index.ts:881` 不可能存在，而 `RendererRuntime.dispatch()` 可在 `renderer-core.ts` 找到。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`; `docs/architecture/renderer-runtime.md`; `docs/references/audit-tooling.md`
- **复核状态**: 未复核

## 深挖第 8 轮追加

### [维度16-11] `data-source` 组件文档把刷新写成 `component:refresh`，但 live baseline 是 runtime-owned `refreshSource`

- **文件+行号**: `docs/components/data-source/design.md:42-45`; `packages/flux-renderers-data/src/data-renderer-definitions.ts:303-311`; `packages/flux-renderers-data/src/data-source-renderer.tsx:21-32`; `docs/architecture/api-data-source.md:273-277`
- **证据片段**:
  ```md
  - 当前应优先支持 `component:refresh` 这类重新执行能力。
  - `component:cancel` 可以作为后续增强，但不应在当前文档中伪装成已落地句柄。
  ```
  ```ts
  type: 'data-source', ... component: DataSourceRenderer, compilation: { artifacts: ['data-source'] }
  ```
  ```md
  refreshSource ... runtime-entry targeting rather than component-handle targeting
  ... not component-handle dispatch
  ```
- **严重程度**: P2
- **现状**: `data-source` owner doc 在“事件、动作与组件句柄能力”中写成当前应优先支持 `component:refresh`；但 live renderer definition 没有 `componentCapabilityContracts`，`DataSourceRenderer` 只调用 `runtime.registerDataSource(...)` 并返回 `null`，没有注册 component handle。架构文档反而明确当前刷新入口是 built-in `refreshSource` + `targetId`，且不是 component-handle dispatch。
- **风险**: schema authoring / tooling 可能按组件文档生成 `component:refresh`，运行时却无法通过 component registry 解析到 `data-source` 实例句柄；同时与 `api-data-source.md` 的 runtime-owned source owner 模型冲突，削弱数据源刷新入口的 owner 边界。
- **建议**: 二选一收口：若当前支持基线是 runtime-owned source refresh，则把 `docs/components/data-source/design.md` 改为 `refreshSource` + `targetId/name`，并明确 `component:refresh` 尚未实现；若确实要支持 component handle，则补 `componentCapabilityContracts`、renderer handle 注册和对应测试，并说明它与 `refreshSource` 的关系。
- **误报排除**: 这不是已报的 surface `component:open/close` 问题，也不是 action-scope `RendererRuntime.dispatch` 行号锚点。live code 中 `data-source` definition 未发布 component capability，renderer 未使用 component registry；架构文档还显式声明 refresh 是 runtime-entry targeting，不是 component-handle targeting。
- **参考文档**: `docs/architecture/api-data-source.md`; `docs/architecture/capability-contract-model.md`; `docs/components/data-source/design.md`
- **复核状态**: 未复核

## 深挖第 9 轮追加

### [维度16-12] `docs/components` 当前 runtime 清单漏登记已注册的 composite/detail/variant renderers

- **文件+行号**: `docs/components/index.md:299-338`; `docs/components/roadmap.md:22-62`; `docs/components/examples.manifest.json:32-42`; `packages/flux-renderers-form-advanced/src/index.tsx:38-49`
- **证据片段**:
  ```json
  "runtime": [
    "input-tree",
    "tree-select",
    "tag-list",
    "key-value",
    "array-editor",
    "condition-builder",
    "table",
    "tree",
    "data-source",
    "chart",
    "crud"
  ]
  ```
  ```ts
  export const formAdvancedRendererDefinitions: RendererDefinition[] = [
    objectFieldRendererDefinition,
    arrayFieldRendererDefinition,
    variantFieldRendererDefinition,
    detailFieldRendererDefinition,
    detailViewRendererDefinition,
  ];
  ```
- **严重程度**: P2
- **现状**: active 组件入口文档和 examples manifest 的 runtime 清单只登记到 `input-tree` / `tree-select` / `tag-list` / `key-value` / `array-editor` / `condition-builder`，但 live `formAdvancedRendererDefinitions` 已注册 `object-field`、`array-field`、`variant-field`、`detail-field`、`detail-view`，且这些组件有架构 owner docs 和测试覆盖。
- **风险**: 组件导航、示例批量验证和 schema 生成入口会误判这些已注册 renderer 不是当前 runtime baseline，导致示例被漏验、owner docs 难以发现、后续实现者重复规划已落地能力。
- **建议**: 同步更新 `docs/components/index.md`、`docs/components/roadmap.md`、`docs/components/examples.manifest.json` 的 runtime 清单，加入 `object-field`、`array-field`、`variant-field`、`detail-field`、`detail-view`；若这些不打算作为组件目录级 retained renderer 暴露，则应在清单中单独增加“registered advanced/internal renderer”分组，而不是完全缺席。
- **误报排除**: 这不是已覆盖的 `input-number` 状态漂移，也不是 `package-splitting-strategy.md` 的 form-advanced 迁移状态问题。本条聚焦当前组件导航/manifest 对 live registered renderer 的漏登记；live code 明确把五个 renderer 放入 `formAdvancedRendererDefinitions`。
- **参考文档**: `docs/components/index.md`; `docs/components/roadmap.md`; `docs/architecture/value-adaptation-and-detail-field.md`; `docs/architecture/variant-field.md`; `docs/architecture/array-field.md`
- **复核状态**: 未复核

## 深挖第 10 轮追加

### [维度16-13] `@nop-chaos/flux` facade 文档称可创建默认 renderer stack，但 live facade 未纳入已注册的 form-advanced renderer

- **文件+行号**: `docs/architecture/flux-runtime-module-boundaries.md:442-449`; `packages/flux-bundle/src/index.tsx:4-7,33-37`; `packages/flux-renderers-form-advanced/src/index.tsx:38-52`
- **证据片段**:

  ```md
  hosts should create the default renderer stack through `createFluxRendererRegistry()` or `createFluxSchemaRenderer()` from `@nop-chaos/flux`
  hosts should not import `@nop-chaos/flux-core`, `@nop-chaos/flux-runtime`, `@nop-chaos/flux-react`, or `@nop-chaos/flux-renderers-*` directly for ordinary page rendering
  ```

  ```ts
  import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
  import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
  import { registerFormRenderers } from '@nop-chaos/flux-renderers-form/definitions';

  export function registerDefaultFluxRenderers(...)
    registerBasicRenderers(registry);
    registerFormRenderers(registry);
    registerDataRenderers(registry);
  ```

  ```ts
  export const formAdvancedRendererDefinitions: RendererDefinition[] = [
  ```

- **严重程度**: P2
- **现状**: active owner doc 把 `@nop-chaos/flux` 描述为 ordinary page rendering 的默认 renderer stack 入口，并建议 host 不直接 import 内部 `flux-renderers-*` 包；但 live facade 只注册 basic/form/data，不注册 `@nop-chaos/flux-renderers-form-advanced`。同时 live package 已发布 `registerFormAdvancedRenderers()` 和多项已注册 renderer definitions，playground 也需要额外注册该包。
- **风险**: host 按文档只接入 `@nop-chaos/flux` 时，会缺失当前仓库已注册且文档化的 advanced field renderer；而文档又 discourages 直接 import 内部 renderer 包，导致 host 侧排障路径和 owner 边界不清。
- **建议**: 二选一收口：若 facade 应代表当前通用默认 stack，则把 `form-advanced` 纳入 `registerDefaultFluxRenderers()` 并补 facade registry 覆盖测试；若 facade 有意保持 minimal stack，则在 owner doc 明确列出默认包含/不包含的 renderer packages，并说明 advanced/code-editor/domain packages 的 opt-in 注册方式。
- **误报排除**: 这不是重复“components runtime 清单漏登记”。本条聚焦 host-facing facade composition 与 owner doc 的默认 stack 承诺不一致；live code 证明 facade 未注册 form-advanced，而 playground 仍需手动注册。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`; `docs/architecture/frontend-baseline.md`; `docs/components/index.md`
- **复核状态**: 本轮 live 复核完成；未二次复核。

### [维度16-14] `check:flux-bundle-pack` 文档声称校验 facade peers，但脚本只强制 5 个 peer，未覆盖当前 manifest peer baseline

- **文件+行号**: `docs/references/audit-tooling.md:44`; `docs/architecture/frontend-baseline.md:110-111`; `scripts/check-flux-bundle-pack.mjs:95-100`; `packages/flux-bundle/package.json:24-32`
- **证据片段**:
  ```md
  | pnpm check:flux-bundle-pack | ... manifest, peers, and stylesheet |
  ```
  ```md
  facade peers: react, react-dom, zustand, lucide-react, @nop-chaos/ui
  singleton-sensitive libraries include react, react-dom, zustand, lucide-react, i18next, react-i18next, recharts, sonner
  ```
  ```js
  const peerDependencies = manifest.peerDependencies ?? {};
  for (const peerName of ['@nop-chaos/ui', 'lucide-react', 'react', 'react-dom', 'zustand']) {
  ```
  ```json
  "peerDependencies": {
    "i18next": "^26.0.0",
    "react-i18next": "^17.0.0",
    "recharts": "^3.8.0"
  }
  ```
- **严重程度**: P2
- **现状**: active tooling/reference docs 把 `check:flux-bundle-pack` 描述为 packed facade manifest/peer gate；`frontend-baseline.md` 也记录了 host-facing singleton-sensitive peer baseline。但脚本实际只强制 `@nop-chaos/ui`、`lucide-react`、`react`、`react-dom`、`zustand`，未校验 live manifest 中同样存在的 `i18next`、`react-i18next`、`recharts`。
- **风险**: facade manifest 的部分 peer 发生回归时，维护者可能因文档相信 hard gate 已覆盖“peers”而漏检；尤其 release artifact 边界依赖该脚本作为 packed tarball truth gate。
- **建议**: 将脚本 peer 校验扩展到当前 documented/live peer baseline，或把 docs 改成“只校验最小 required peer subset”，并明确其余 peer 由 manifest review/其他 gate 负责。
- **误报排除**: 本条不声称当前 `packages/flux-bundle/package.json` peer manifest 已缺项；问题是 active docs 对 gate 覆盖面的描述大于 live script 实现。
- **参考文档**: `docs/references/audit-tooling.md`; `docs/architecture/frontend-baseline.md`
- **复核状态**: 本轮 live 复核完成；未二次复核。

## 深挖第 11 轮追加

### [维度16-15] `renderer-runtime.md` 当前 metadata pilot 清单漏掉已落地的 tabs/table/chart/code-editor

- **文件+行号**: `docs/architecture/renderer-runtime.md:438-442`; `packages/flux-renderers-basic/src/basic-renderer-definitions.ts:341-372`; `packages/flux-renderers-data/src/data-renderer-definitions.ts:100-108,192-220,313-324`; `packages/flux-code-editor/src/code-editor-renderer.tsx:207-313`
- **证据片段**:
  ```md
  Current implementation baseline:

  - `packages/flux-core/src/types/renderer-core.ts` now defines ...
  - `packages/flux-core/src/types/renderer-authoring-contract.ts` ...
  - current pilot metadata is wired for `button`, `form`, `crud`, and `designer-page`
  ```
  ```ts
  type: 'tabs',
  propContracts: { orientation: ..., variant: ... },
  componentCapabilityContracts: [
    { handle: 'setValue', ... },
    { handle: 'getValue', ... },
  ]
  ```
  ```ts
  type: 'chart',
  componentCapabilityContracts: [
    { handle: 'resize', ... },
  ]
  ```
  ```ts
  export const codeEditorRendererDefinition: RendererDefinition = {
    type: 'code-editor',
    sourcePackage: '@nop-chaos/flux-code-editor',
    propContracts: { ... },
    eventContracts: { ... },
  }
  ```
- **严重程度**: P2
- **现状**: `renderer-runtime.md` 的 “Current implementation baseline” 仍把 renderer static metadata pilot 限定为 `button`、`form`、`crud`、`designer-page` 四个；但 live code 已在 `tabs`、`table`、`chart`、`code-editor` 等 renderer definition 上发布 `propContracts` / `eventContracts` / `componentCapabilityContracts`。
- **风险**: 架构 owner doc 会误导维护者认为当前 metadata 仍只有早期四个 pilot，导致 authoring discovery、capability contract、组件设计文档同步时漏看已扩展的正式 metadata 面；后续审计或补齐工作也可能重复规划已落地的 renderer metadata。
- **建议**: 将 `renderer-runtime.md:442` 改成当前实际 baseline：列出已发布 metadata 的代表性 renderer，或改为“initial pilots were ...; current coverage has expanded, inspect renderer definitions / `ResolvedAuthoringContract` tests for live truth”。如不想维护完整清单，应避免使用封闭的 “current ... is wired for only these” 表述。
- **误报排除**: 这不是已报的 components runtime 清单漏登记，也不是 facade default stack 或 flux-bundle peer check；本条只聚焦 `renderer-runtime.md` 对 `RendererDefinition` static metadata 覆盖面的当前实现描述。live 代码中明确存在四个以外的 `propContracts` / `eventContracts` / `componentCapabilityContracts`，且同文件把该段标为 “Current implementation baseline”。
- **参考文档**: `docs/architecture/renderer-runtime.md`; `docs/references/renderer-interfaces.md`; `docs/components/code-editor/design.md`
- **复核状态**: 本轮 live 复核完成；未二次复核。

## 深挖第 12 轮追加

### [维度16-16] `package-splitting-strategy.md` 的 renderer 依赖矩阵与 live package manifests 明确冲突

- **文件+行号**: `docs/components/package-splitting-strategy.md:595-608`; `packages/flux-renderers-basic/package.json:15-28`; `packages/flux-renderers-form/package.json:24-43`; `packages/flux-renderers-data/package.json:15-37`; `packages/flux-renderers-form-advanced/package.json:15-39`
- **证据片段**:
  ```md
  包依赖 → | flux-core | flux-formula | flux-runtime | ...
  basic | x | x | x |
  form | x | x | x | ... basic x
  form-advanced | x | x | x |
  data | x | x | x | basic x\*

  - `x` = 有直接运行时 import 依赖。
  ```
  ```json
  "dependencies": {
    "@nop-chaos/flux-core": "workspace:*",
    "@nop-chaos/flux-i18n": "workspace:*",
    "@nop-chaos/flux-react": "workspace:*",
    "@nop-chaos/ui": "workspace:*"
  }
  ```
- **严重程度**: P2
- **现状**: active component owner doc 明确说矩阵中的 `x` 表示“有直接运行时 import 依赖”，但 live manifests 中 `basic` / `form` / `data` 的 runtime dependencies 并不包含 `flux-formula`、`flux-runtime`，`form` 也不包含 `flux-renderers-basic`。这些包里相关 imports 多数只出现在 tests/test-support，对应 manifest 也放在 `devDependencies`。同时 `form-advanced` 文档矩阵声称依赖 `flux-runtime`，live manifest 只把它放在 `devDependencies`，且源码存在非测试主路径 import，这一点已由其他维度作为 manifest 问题覆盖；本条聚焦 active owner doc 的依赖拓扑 truth table 本身不可信。
- **风险**: 该文档是组件包归属和拆包边界入口；维护者按矩阵判断运行时依赖方向时，会误以为多个 renderer 包允许直接依赖 runtime/formula/basic，可能引入错误 package dependency、放宽边界审查，或在修 manifest 时被文档反向误导。
- **建议**: 将矩阵拆成 “runtime dependencies from package.json dependencies” 与 “test/dev dependencies” 两类；以 package manifests 为准重写 `basic/form/data/code-editor/form-advanced` 行。若某些 runtime 依赖是目标态而非当前态，应标为 target/future，不要继续用 `x = 有直接运行时 import 依赖`。
- **误报排除**: 这不是重复已报的 content/layout 未建包或 form-advanced 迁移状态问题；本条仅针对 §4.1 依赖拓扑矩阵与 live package manifests 冲突。已核对 package manifests：被文档标为 runtime dependency 的多项依赖实际不存在于 `dependencies`，而在 live source 中多数仅为测试/fixture 使用。
- **参考文档**: `docs/components/index.md`; `docs/architecture/frontend-baseline.md`; `docs/references/audit-rules/workspace-manifest-dependency-hygiene.md`
- **复核状态**: 本轮 live 复核完成；未二次复核。

## 深挖第 13 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- `[维度16-01]`: 保留（P0）。重新运行 `pnpm check:active-doc-code-anchors` 仍失败并输出同 8 个 `docs/analysis/...` 缺失锚点，目标文件 live 确认位于 `docs/archive/analysis/`。
- `[维度16-02]`: 保留（P1）。`scripts/check-active-doc-code-anchors.mjs` live 仍只枚举 6 个 active docs，且 `performance-design-requirements.md`、`array-field.md` 中仍存在未被 gate 覆盖的失效/外部仓库路径。
- `[维度16-03]`: 保留（P2）。`flux-runtime-module-boundaries.md` 仍登记不存在的 `schema-compiler/regions.ts` 与根层 runtime 测试路径，live compiler 目录和 runtime test glob 均显示职责已迁移/拆分。
- `[维度16-04]`: 保留（P2）。Flow Designer docs 中 `runtime-snapshot.md`、`config-schema.md`、`canvas-adapters.md` 仍引用已不存在的 `designer-page-shell.test.tsx`，live 测试已拆为 focused tests。
- `[维度16-05]`: 保留（P2）。`package-splitting-strategy.md` 仍把 form-advanced 写作待创建/迁移 Phase 3，而 live `packages/flux-renderers-form-advanced` 已存在并注册 renderer。
- `[维度16-06]`: 保留（P2）。surface/dialog docs 仍描述 `component:open/close/toggle` capability，但 live dialog/drawer definitions 无 `componentCapabilityContracts`，renderer 也仅注册 surface entry 而非 component handle。
- `[维度16-07]`: 保留（P2）。`input-number` live 已在 `formRendererDefinitions` 注册且有 focused test，但 `docs/components/index.md` 与 `roadmap.md` 仍列入“尚未实现”清单。
- `[维度16-08]`: 保留（P2）。Flow/Report designer docs 仍引用 `packages/flux-react/src/index.tsx:479`，live 文件只有 77 行且只是 barrel export。
- `[维度16-09]`: 保留（P2）。`package-splitting-strategy.md` 仍把 `flux-renderers-content/layout` 写入“最终包结构”，但 live workspace 中两个 package 均不存在且同文 Phase 仍未勾选创建。
- `[维度16-10]`: 保留（P2）。`action-scope-and-imports.md` 仍锚定 `packages/flux-core/src/index.ts:881`，live `index.ts` 只是短 barrel，`RendererRuntime.dispatch()` 实际在 `types/renderer-core.ts`。
- `[维度16-11]`: 保留（P2）。`data-source` 组件文档仍写 `component:refresh`，live definition/renderer 无 component handle，而 `api-data-source.md` 明确当前入口是 runtime-owned `refreshSource`。
- `[维度16-12]`: 保留（P2）。组件 index/roadmap/manifest runtime 清单仍漏掉 live `formAdvancedRendererDefinitions` 已注册的 `object-field`、`array-field`、`variant-field`、`detail-field`、`detail-view`。
- `[维度16-13]`: 保留（P2）。`@nop-chaos/flux` owner doc 仍建议通过 facade 创建默认 renderer stack 且不直接 import renderer 包，但 live facade 只注册 basic/form/data，playground 仍需手动注册 form-advanced。
- `[维度16-14]`: 降级（P3）。live `check-flux-bundle-pack.mjs` 确实只强制 5 个 peer，而 packed/package manifest 还有 i18next/react-i18next/recharts；但 `frontend-baseline.md` 同时把 5 个列为 facade peers，问题更像 gate 覆盖描述不精确而非当前 manifest 违约。
- `[维度16-15]`: 保留（P2）。`renderer-runtime.md` 仍称 metadata pilot 仅 wired for `button/form/crud/designer-page`，live tabs/table/chart/code-editor 等 definitions 已发布 prop/event/capability contracts。
- `[维度16-16]`: 保留（P2）。`package-splitting-strategy.md` 依赖矩阵仍把 basic/form/data 等标成直接运行时依赖 flux-formula/flux-runtime/basic，但 live package manifests 将这些依赖缺省或仅放 devDependencies，且源码命中多为测试/支撑文件。

## 子项复核建议

无。

## 子项复核结论

- `[维度16-01]`: 子项复核通过（P0）。重新运行 `pnpm check:active-doc-code-anchors` 仍失败并输出同 8 个 active `docs/analysis/...` 缺失锚点，目标文件 live 确认仅在 `docs/archive/analysis/` 下存在。
- `[维度16-02]`: 子项复核通过（P1）。live 脚本仍只枚举 6 个 active docs，且 `performance-design-requirements.md` 与 `array-field.md` 仍存在未被 gate 覆盖的失效/外部仓库路径。
- `[维度16-03]`: 子项复核通过（P2）。`flux-runtime-module-boundaries.md` 仍登记不存在的 `schema-compiler/regions.ts` 与根层 runtime 测试路径，live glob 显示职责和测试已迁移/拆分。
- `[维度16-04]`: 子项复核通过（P2）。Flow Designer owner docs 仍引用已不存在的 `designer-page-shell.test.tsx`，live 测试文件已拆为 `designer-page-status/rendering/failures` 等 focused tests。
- `[维度16-05]`: 子项复核通过（P2）。`package-splitting-strategy.md` 仍把 form-advanced 写成待创建/迁移 Phase 3，而 live `packages/flux-renderers-form-advanced` 已存在并导出注册定义。
- `[维度16-06]`: 子项复核通过（P2）。surface/dialog/drawer 文档仍描述 `component:open/close/toggle`，但 live dialog/drawer definitions 无对应 `componentCapabilityContracts` 且 renderer 仅注册 surface。
- `[维度16-07]`: 子项复核通过（P2）。`input-number` live 已注册且有测试/组件文档，但 `docs/components/index.md`、`roadmap.md` 与 manifest 仍把它放在未实现/target 队列。
- `[维度16-08]`: 子项复核通过（P2）。Flow/Report Designer docs 仍引用 `packages/flux-react/src/index.tsx:479`，而 live 文件只有 77 行且只是 barrel export。
- `[维度16-09]`: 子项复核通过（P2）。`package-splitting-strategy.md` 仍把 `flux-renderers-content/layout` 写入最终包结构，但 live workspace 中两个 package 均不存在且 Phase 1/2 仍未完成。
- `[维度16-10]`: 子项复核通过（P2）。`action-scope-and-imports.md` 仍锚定 `packages/flux-core/src/index.ts:881`，live `index.ts` 只有 76 行，`RendererRuntime.dispatch()` 实际在 `types/renderer-core.ts`。
- `[维度16-11]`: 子项复核通过（P2）。`data-source` 组件文档仍写当前应支持 `component:refresh`，但 live data-source definition/renderer 无 component handle，架构文档明确当前入口是 runtime-owned `refreshSource`。
- `[维度16-12]`: 子项复核通过（P2）。组件 index/roadmap/manifest runtime 清单仍漏掉 live `formAdvancedRendererDefinitions` 已注册的 `object-field`、`array-field`、`variant-field`、`detail-field`、`detail-view`。
- `[维度16-13]`: 子项复核通过（P2）。`@nop-chaos/flux` 文档仍承诺默认 renderer stack/facade 接入，但 live facade 只注册 basic/form/data，playground 仍手动注册 form-advanced。
- `[维度16-14]`: 降级（P3）。live 脚本确实只强制 5 个 peer 而 manifest 还有 i18next/react-i18next/recharts，但 docs 同时把这 5 个列为 facade peers，主要是 gate 覆盖描述不精确。
- `[维度16-15]`: 子项复核通过（P2）。`renderer-runtime.md` 仍称 metadata pilot 仅 wired for `button/form/crud/designer-page`，但 live tabs/table/chart/code-editor 等 definitions 已发布 metadata contracts。
- `[维度16-16]`: 子项复核通过（P2）。`package-splitting-strategy.md` 依赖矩阵仍把 basic/form/data 等标成直接运行时依赖 flux-formula/flux-runtime/basic，但 live manifests 将这些依赖缺省或仅放在 devDependencies。

## 最终保留项

| 编号      | 严重程度 | 文件路径                                                                                                                                                      | 摘要                                                                                                      |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 维度16-01 | P0       | `docs/index.md`; `docs/architecture/playground-experience.md`; `docs/architecture/debugger-runtime.md`; `docs/references/maintenance-checklist.md`            | Active docs 仍指向已归档 analysis 路径，导致文档锚点 hard gate 失败。                                     |
| 维度16-02 | P1       | `scripts/check-active-doc-code-anchors.mjs`; `docs/architecture/performance-design-requirements.md`; `docs/architecture/array-field.md`                       | active-doc anchor hard gate 扫描范围过窄，遗漏其他 active owner docs 失效路径。                           |
| 维度16-03 | P2       | `docs/architecture/flux-runtime-module-boundaries.md`                                                                                                         | runtime boundary 文档仍登记已删除/迁移的 compiler 与 runtime 测试路径。                                   |
| 维度16-04 | P2       | `docs/architecture/flow-designer/runtime-snapshot.md`; `docs/architecture/flow-designer/config-schema.md`; `docs/architecture/flow-designer/collaboration.md` | Flow Designer owner docs 仍指向已拆分删除的 `designer-page-shell.test.tsx`。                              |
| 维度16-05 | P2       | `docs/components/package-splitting-strategy.md`                                                                                                               | package splitting strategy 仍把已完成的 form-advanced 拆包写成未执行迁移路线。                            |
| 维度16-06 | P2       | `docs/architecture/surface-owner.md`; `docs/components/dialog/design.md`                                                                                      | Surface owner/docs 承诺 dialog/drawer 组件句柄，但 live definition/runtime 未发布对应 capability。        |
| 维度16-07 | P2       | `docs/components/roadmap.md`; `docs/components/index.md`                                                                                                      | `input-number` 已落地但组件 roadmap/index 仍列为“尚未实现”。                                              |
| 维度16-08 | P2       | `docs/architecture/flow-designer/design.md`; `docs/architecture/report-designer/design.md`                                                                    | `flux-react/src/index.tsx:479` 架构锚点已失效。                                                           |
| 维度16-09 | P2       | `docs/components/package-splitting-strategy.md`                                                                                                               | package-splitting strategy 把未存在的 content/layout 包写入“最终包结构”。                                 |
| 维度16-10 | P2       | `docs/architecture/action-scope-and-imports.md`                                                                                                               | action-scope 文档仍引用已失效的 `RendererRuntime.dispatch()` 行号/owner 文件。                            |
| 维度16-11 | P2       | `docs/components/data-source/design.md`                                                                                                                       | `data-source` 组件文档把刷新写成 `component:refresh`，但 live baseline 是 runtime-owned `refreshSource`。 |
| 维度16-12 | P2       | `docs/components/index.md`; `docs/components/roadmap.md`; `docs/components/examples.manifest.json`                                                            | `docs/components` runtime 清单漏登记已注册的 composite/detail/variant renderers。                         |
| 维度16-13 | P2       | `docs/architecture/flux-runtime-module-boundaries.md`; `packages/flux-bundle/src/index.tsx`                                                                   | `@nop-chaos/flux` facade 文档称可创建默认 renderer stack，但 live facade 未纳入 form-advanced renderer。  |
| 维度16-14 | P3       | `docs/references/audit-tooling.md`; `docs/architecture/frontend-baseline.md`; `scripts/check-flux-bundle-pack.mjs`                                            | `check:flux-bundle-pack` 文档对 facade peer 校验覆盖面描述不精确。                                        |
| 维度16-15 | P2       | `docs/architecture/renderer-runtime.md`                                                                                                                       | `renderer-runtime.md` 当前 metadata pilot 清单漏掉已落地的 tabs/table/chart/code-editor。                 |
| 维度16-16 | P2       | `docs/components/package-splitting-strategy.md`                                                                                                               | package-splitting strategy 的 renderer 依赖矩阵与 live package manifests 冲突。                           |
