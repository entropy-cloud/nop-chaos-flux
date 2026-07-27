# MA1.2 Runtime 包簇结构审计报告

> Audit Date: 2026-07-27
> Plan: `docs/plans/2026-07-27-0800-2-ma1-structure-architecture-audit.md`
> Package Cluster: runtime-cluster (flux-runtime, flux-react, flux-bundle)
> Owner Doc: `docs/architecture/flux-runtime-module-boundaries.md`

## 审计范围

审计 runtime 包簇的三个包：`flux-runtime`、`flux-react`、`flux-bundle`（发布为 `@nop-chaos/flux`），覆盖：

1. 模块边界合规性
2. 跨层引用纪律
3. 公共导出面纪律

## 1. 模块边界合规性

### flux-runtime

| 检查项                                       | 结果                                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 预期依赖                                     | flux-core, flux-formula, flux-compiler, flux-action-core（下层）                                             |
| 实际 package.json 依赖                       | `@nop-chaos/flux-core`, `@nop-chaos/flux-formula`, `@nop-chaos/flux-compiler`, `@nop-chaos/flux-action-core` |
| 禁止依赖（flux-react/flux-bundle/renderers） | ✅ 不存在                                                                                                    |
| 源码级向上引入                               | ✅ 零次                                                                                                      |

**结论：完全合规。**

### flux-react

| 检查项                            | 结果                                                                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 预期依赖                          | flux-core, flux-formula, flux-runtime, flux-i18n, ui（下层/同层）                                                     |
| 实际 package.json 依赖            | `@nop-chaos/flux-core`, `@nop-chaos/flux-formula`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-runtime`, `@nop-chaos/ui` |
| 禁止依赖（flux-bundle/renderers） | ✅ 不存在                                                                                                             |
| 便利再导出                        | flux-runtime 的 `createFormComponentHandle`/`createReadonlyScopeBinding`——doc 许可的方便面                            |
| `src/unstable.ts` 子路径          | 正确分离内部帮助函数                                                                                                  |

**结论：完全合规。**

### flux-bundle（@nop-chaos/flux）

| 检查项   | 结果                                                           |
| -------- | -------------------------------------------------------------- |
| 角色     | 宿主面对接外观（facade），构建时打包                           |
| 依赖策略 | 内部包均为 devDependencies（构建时打包，不暴露为宿主安装需求） |
| 导入方向 | 下行至 flux-core/flux-formula/flux-react + 同级 renderers      |
| 导出面   | 7 个命名导出，刻意收窄                                         |

**结论：完全合规。**

## 2. 跨层引用纪律

| 方向                             | 检查         | 结果    |
| -------------------------------- | ------------ | ------- |
| flux-runtime → flux-react        | 禁止（向上） | ✅ 零次 |
| flux-runtime → flux-bundle       | 禁止（向上） | ✅ 零次 |
| flux-runtime → flux-renderers-\* | 禁止（向上） | ✅ 零次 |
| flux-react → flux-bundle         | 禁止（向上） | ✅ 零次 |
| flux-react → flux-renderers-\*   | 禁止（向上） | ✅ 零次 |
| flux-bundle → flux-bundle        | 禁止（循环） | ✅ 零次 |

所有跨层引用方向均干净，零违规。

## 3. 公共导出面纪律

### flux-runtime (`src/index.ts`)

- 导出：运行时工厂函数、组件句柄注册表、scope 基础设施、表单诊断、异步数据工具
- 评估：好。导出范围适当，无内部实现泄漏。

### flux-react (`src/index.tsx`)

- 导出：28 个 hooks、10 个 React context、`SchemaRenderer`/`NodeRenderer`/`RenderNodes`/`DialogHost`、表单状态选择器等
- 评估：好。稳定 API 表面 + `unstable.ts` 分离内部帮助函数。

### flux-bundle (`src/index.tsx`)

- 导出：`registerDefaultFluxRenderers()`、`createFluxRendererRegistry()`、`createDefaultFluxEnv()`、`createFluxSchemaRendererWithRegistry()`、`createFluxSchemaRenderer()`、`FLUX_ROOT_CLASS`
- 评估：刻意收窄的外观表面，符合 facade 模式。

## 发现列表

### P0 — 无

### P1 — 无

### P2 — 无

### P3 — 无

**所有三个包均完全符合文档化的模块边界，无任何级别的发现。**

## 合规项摘要

| 检查项                                       | 状态 |
| -------------------------------------------- | ---- |
| flux-runtime: 仅依赖下层包                   | ✅   |
| flux-runtime: 无向上引入                     | ✅   |
| flux-react: 仅依赖下层/同层包                | ✅   |
| flux-react: 无 renderers 或 flux-bundle 依赖 | ✅   |
| flux-bundle: facade 模式正确                 | ✅   |
| flux-bundle: 无循环依赖                      | ✅   |
| 所有跨层方向均干净                           | ✅   |
| 所有导出面适当                               | ✅   |

## 总结

Runtime 包簇架构完全干净，所有模块边界严格遵循层级方向（flux-runtime → flux-react → flux-bundle），无向上依赖，导出面纪律良好，零发现。
