# 维度 01：依赖图与包边界

## 第 1 轮（初审）

### [维度01-01] `flux-renderers-basic` 测试直接导入 `@nop-chaos/flux-compiler`，但包清单未声明该 workspace 依赖

- **文件**: `packages/flux-renderers-basic/src/__tests__/basic-page-layout-structure.test.tsx:3-7`；`packages/flux-renderers-basic/package.json:25-30`
- **证据片段**:
  ```ts
  import { createRendererRegistry, getIn, type RendererDefinition } from '@nop-chaos/flux-core';
  import { createSchemaCompiler } from '@nop-chaos/flux-compiler';
  import { createExpressionCompiler } from '@nop-chaos/flux-formula';
  import { createSchemaRenderer, useScopeSelector } from '@nop-chaos/flux-react';
  import { createRendererRuntime } from '@nop-chaos/flux-runtime';
  ```
- **严重程度**: P1
- **现状**: `pnpm check:workspace-manifest-deps` 已直接报错，说明 live test source 使用了未声明的 workspace 依赖。
- **风险**: 包级测试/隔离安装会出现隐藏依赖，真实依赖图失真，并持续污染边界审计基线。
- **建议**: 在 `packages/flux-renderers-basic/package.json` 的 `devDependencies` 中显式加入 `@nop-chaos/flux-compiler`，或移除对 compiler 的直接测试依赖。
- **为什么值得现在做**: 这是当前硬门禁失败，不是风格问题。
- **误报排除**: 这里不是在报告“renderers 依赖 core/runtime”这种允许形态；问题是 manifest 与 source import 不一致且已触发硬检查失败。
- **历史模式对应**: package manifest hygiene / undeclared workspace import。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`、`docs/references/audit-tooling.md`
- **复核状态**: 未复核

### [维度01-02] `flux-react` 测试向上依赖 `@nop-chaos/flux-renderers-form` 的候选项未在 live code 复核中成立

- **文件**: `packages/flux-react/package.json:1-39`
- **证据片段**:
  ```json
  {
    "name": "@nop-chaos/flux-react",
    "private": true,
    "devDependencies": {
      "@nop-chaos/flux-compiler": "workspace:*"
    }
  }
  ```
- **严重程度**: P3
- **现状**: 初审曾把一条测试向上依赖当作候选，但独立复核时未在 `packages/flux-react` live test/source 中找到对应 `@nop-chaos/flux-renderers-form` import。
- **风险**: 如果直接保留，会把不存在的边界问题写进最终报告，破坏审计可信度。
- **建议**: 驳回该候选，不进入最终保留项。
- **为什么值得现在做**: 深度审核手册要求复核 agent 必须把初审结论当线索而非事实。
- **误报排除**: 该条目正是一次复核后被排除的候选，不应继续汇总。
- **历史模式对应**: suspect / manual note recheck rejection。
- **参考文档**: `docs/skills/deep-audit-prompts.md`、`docs/references/audit-tooling.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度01-01]：保留 (P1)。未声明 workspace import 由硬门禁与 live source 双重确认。
- [维度01-02]：驳回。复核未在 `flux-react` live code 中找到支撑 import。

## 子项复核结论

- [维度01-01]：成立。属于真实 manifest defect。
- [维度01-02]：驳回。缺少 live import 证据。

## 依赖图摘要

```text
flux-core
  -> flux-formula
    -> flux-compiler
      -> flux-action-core
        -> flux-runtime
          -> flux-react
            -> flux-renderers-basic / flux-renderers-form / flux-renderers-data
              -> flux-renderers-form-advanced
designer families:
  flow-designer-core -> flow-designer-renderers
  report-designer-core -> report-designer-renderers
  spreadsheet-core -> spreadsheet-renderers
  word-editor-core -> word-editor-renderers
shared:
  ui, flux-i18n, tailwind-preset, theme-tokens
```

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                   | 一句话摘要                                                           |
| ----- | -------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 01-01 | P1       | `packages/flux-renderers-basic/src/__tests__/basic-page-layout-structure.test.tsx:3-7` | `flux-renderers-basic` 测试导入了未声明的 `@nop-chaos/flux-compiler` |
