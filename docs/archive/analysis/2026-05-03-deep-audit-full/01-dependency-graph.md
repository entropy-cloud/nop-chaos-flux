# 维度 01：依赖图与包边界

## 初审摘要

- 初审重建了 workspace 内部依赖图，未发现跨包内部路径导入、manifest 循环依赖、`*-core -> *-renderers` 反向依赖。
- 初审发现 2 条测试源码依赖未在 manifest 声明的低风险问题。

## 维度复核结论

- 复核结果：2 条均保留但降级为低风险“测试依赖声明缺失”。
- 无需继续逐项复核。

## 通过复核的结论

### [维度01] `flux-renderers-form` 测试依赖未在 manifest 声明

- **文件**: `packages/flux-renderers-form/src/renderers/form.schema-validator.test.ts:1-4`, `packages/flux-renderers-form/package.json:17-27`
- **证据片段**:

```ts
1: import { describe, expect, it } from 'vitest';
2: import { createRendererRegistry } from '@nop-chaos/flux-core';
3: import { createSchemaCompiler } from '@nop-chaos/flux-compiler';
4: import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
```

- **严重程度**: P3
- **现状**: 测试直接导入 `@nop-chaos/flux-compiler`，但包 manifest 未声明该 workspace 依赖。
- **风险**: 包级测试依赖工作区 hoist，削弱边界自描述能力。
- **建议**: 将该依赖补入 `devDependencies`。
- **复核状态**: 已降级

### [维度01] `flux-renderers-data` 测试依赖未在 manifest 声明

- **文件**: `packages/flux-renderers-data/src/schema-validator.test.ts:1-4`, `packages/flux-renderers-data/package.json:15-27`
- **证据片段**:

```ts
1: import { describe, expect, it } from 'vitest';
2: import { createRendererRegistry } from '@nop-chaos/flux-core';
3: import { createSchemaCompiler } from '@nop-chaos/flux-compiler';
4: import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
```

- **严重程度**: P3
- **现状**: 同类测试依赖声明缺口再次出现。
- **风险**: 包边界在隔离安装或未来拆分时更容易失效。
- **建议**: 同步补入 `devDependencies` 并考虑加自动化检查。
- **复核状态**: 已降级
