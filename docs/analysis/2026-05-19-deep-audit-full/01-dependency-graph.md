# 维度 01: 依赖图与包边界

## 第 1 轮（初审）

### [维度01-01] `flux-react` 测试依赖 renderer 包但 manifest 未声明

- **文件**: `packages/flux-react/src/__tests__/schema-renderer-strictmode-form.test.tsx:4-8`; `packages/flux-react/package.json:22-39`
- **证据片段**:
  ```ts
  import { createSchemaRenderer } from '../schema-renderer.js';
  import { createDefaultRegistry } from '../defaults.js';
  import {
    env,
    formRenderer,
    probeInputRenderer,
    sharedFormulaCompiler,
    textRenderer,
  } from '../test-support-core.js';
  import type { RendererComponentProps } from '@nop-chaos/flux-core';
  import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
  ```
- **严重程度**: P0
- **现状**: `flux-react` 测试文件导入 `@nop-chaos/flux-renderers-basic`，但 `flux-react/package.json` 未在 `dependencies`、`devDependencies` 或 `peerDependencies` 声明该 workspace 包。
- **风险**: `pnpm check:workspace-manifest-deps` 当前失败，包级隔离测试和增量 CI 无法信任 manifest；也容易被误读为未声明的 React 层到 renderer 层耦合。
- **建议**: 将 `@nop-chaos/flux-renderers-basic: "workspace:*"` 加入 `packages/flux-react/package.json` 的 `devDependencies`，不要放入生产 `dependencies`。
- **为什么值得现在做**: 修复成本低，能直接恢复 hard gate，并把依赖限定为测试边界。
- **误报排除**: 不是生产 `flux-react -> renderer` 反向依赖；但 `docs/references/audit-tooling.md` 明确 manifest deps 是 hard gate，测试 source import 也必须声明。
- **参考文档**: `docs/references/audit-tooling.md`, `AGENTS.md`
- **复核状态**: 子项复核通过

## 深挖第 2 轮追加

维度 01：未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度01-01]: 保留 (P0)。独立复核重新确认 `pnpm check:workspace-manifest-deps` 仍失败，且 import 与 manifest 缺口均存在。

## 子项复核结论

- [维度01-01]: 成立 (P0)。hard gate 失败项，适合进入最终汇总；修复策略应保持该依赖为测试 `devDependencies`。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                             | 一句话摘要                                          |
| ----- | -------- | -------------------------------------------------------------------------------- | --------------------------------------------------- |
| 01-01 | P0       | `packages/flux-react/src/__tests__/schema-renderer-strictmode-form.test.tsx:4-8` | `flux-react` 测试导入 renderer 包但 manifest 未声明 |
