# MA1.1 Core 包簇结构审计报告

> Audit Date: 2026-07-27
> Plan: `docs/plans/2026-07-27-0800-2-ma1-structure-architecture-audit.md`
> Package Cluster: core-cluster (flux-core, flux-formula, flux-compiler, flux-action-core)
> Owner Doc: `docs/architecture/flux-core.md`

## 审计范围

审计 core 包簇的四个包：`flux-core`、`flux-formula`、`flux-compiler`、`flux-action-core`，覆盖：

1. 跨包依赖 DAG 合规性
2. 包公共导出面纪律
3. Renderer 定义字段正确性
4. 样式契约合规性

## 1. 依赖 DAG 合规性

### package.json 依赖检查

| 包               | 声明的 @nop-chaos/\* 依赖                         | 预期                     | 结果    |
| ---------------- | ------------------------------------------------- | ------------------------ | ------- |
| flux-core        | 无                                                | 零依赖                   | ✅ 合规 |
| flux-formula     | `@nop-chaos/flux-core: workspace:*`               | 仅 flux-core             | ✅ 合规 |
| flux-compiler    | `@nop-chaos/flux-core`, `@nop-chaos/flux-formula` | flux-core + flux-formula | ✅ 合规 |
| flux-action-core | `@nop-chaos/flux-core: workspace:*`               | 仅 flux-core             | ✅ 合规 |

### 源码级 import 检查

各包 src/ 下对 `@nop-chaos/*` 的 import 全部指向合法下层包，未发现向上依赖或内部路径导入（如 `from '@nop-chaos/flux-core/src/...'`）。

**DAG 结论：完全合规，零违规。**

## 2. 导出面纪律

| 包               | 导出风格                           | 评估                                         |
| ---------------- | ---------------------------------- | -------------------------------------------- |
| flux-core        | barrel `export *` + 命名导出       | 适当广泛（基础层应有广度）。无内部实现泄漏。 |
| flux-formula     | 仅命名导出（9 行）                 | 干净、精简。仅暴露公式引擎公开 API。         |
| flux-compiler    | 命名导出（40 行）                  | 清晰有序。无内部实现泄漏。                   |
| flux-action-core | 命名导出 + 1 个 re-export（39 行） | 总体干净。见发现 F2-002。                    |

**导出面结论：总体健康，无明显泄漏。**

## 3. Renderer 定义字段正确性

检查 `RendererDefinitionShape`（`types/renderer-definition-types.ts`）与 `renderer-interfaces.md` 规范的一致性。

- 所有 doc 中列出的字段在类型中都存在 ✅
- 类型中有 4 个字段未在 doc 中列出：`deepFields`, `compilation`, `validationDefaults`, `frameRootTag`（见 F2-001）
- 所有辅助类型（`RendererPropContract`, `RendererEventContract`, `RendererCapabilityContract` 等）匹配规范 ✅

## 4. 样式契约合规性

| 包               | CSS 文件 | JSX/TSX | 结果    |
| ---------------- | -------- | ------- | ------- |
| flux-core        | 零       | 零      | ✅ 合规 |
| flux-formula     | 零       | 零      | ✅ 合规 |
| flux-compiler    | 零       | 零      | ✅ 合规 |
| flux-action-core | 零       | 零      | ✅ 合规 |

所有 core 包仅含 `.ts` 文件，无样式文件。

## 发现列表

### P0 — 无

无阻塞性问题。

### P1 — 1 个

#### F1-001: `RendererDefinition` 重复声明四个继承自 `RendererDefinitionShape` 的字段

- **文件**: `packages/flux-core/src/types/renderer-core.ts:286-289`
- **严重程度**: P1（结构完整性风险）
- **现状**: `RendererDefinition` 扩展 `RendererDefinitionShape` 但重新声明了 `validation`, `validationDefaults`, `deepFields`, `compilation`，签名完全一致。
- **风险**: 中。维护隐患——开发者可能修改一份而不修改另一份。
- **建议**: 从 `RendererDefinition` 中移除四个冗余字段声明。

### P2 — 2 个

#### F2-001: `renderer-interfaces.md` 字段映射缺少 `deepFields`/`compilation`/`validationDefaults`/`frameRootTag`

- **文件**: `docs/references/renderer-interfaces.md:128-139`
- **严重程度**: P2（文档缺口）
- **现状**: doc 未列出 `deepFields`、`compilation`、`validationDefaults`、`frameRootTag`，但这些字段已在 `RendererDefinitionShape` 中定义并被 renderer 实现使用。
- **风险**: 低-中。依赖此 doc 作为参考的团队可能不知道这些字段的存在。
- **建议**: 补充缺失字段到 doc 的字段映射表中。

#### F2-002: `flux-action-core` re-export flux-core debounce 函数造成传递耦合

- **文件**: `packages/flux-action-core/src/index.ts:39`
- **严重程度**: P2（架构边界关注点）
- **现状**: `export { cancelPendingDebounce, scheduleDebounce } from '@nop-chaos/flux-core'` 将 core 工具函数通过 action-core 的公开 API 再导出。
- **风险**: 低。消费者可通过 action-core 访问 `scheduleDebounce` 而无需显式依赖 flux-core。
- **建议**: 移除 re-export 或文档化这些是 flux-core 的便利再导出。

### P3 — 0 个需处理

无需要修复的 P3 发现。

## 合规项摘要

| 检查项                                           | 状态 | 备注 |
| ------------------------------------------------ | ---- | ---- |
| DAG: flux-core 零 @nop-chaos/\* 依赖             | ✅   |      |
| DAG: flux-formula 仅依赖 flux-core               | ✅   |      |
| DAG: flux-compiler 依赖 flux-core + flux-formula | ✅   |      |
| DAG: flux-action-core 仅依赖 flux-core           | ✅   |      |
| 无内部路径跨包导入                               | ✅   |      |
| 导出面适当                                       | ✅   |      |
| RendererDefinitionShape 含全部 doc 字段          | ✅   |      |
| 辅助类型匹配规范                                 | ✅   |      |
| 无 JSX/CSS 文件                                  | ✅   |      |

## 总结

Core 包簇架构整体健康。依赖 DAG 完全合规，导出面纪律良好，无样式问题。P1 发现 1 个（类型接口冗余声明），P2 发现 2 个（文档缺口 + 便利再导出），均不构成即时风险。
