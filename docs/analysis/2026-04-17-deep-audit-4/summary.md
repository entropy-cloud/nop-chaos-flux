# 深度审核汇总报告

## 审核范围
- 执行维度：01-18 全量
- 覆盖范围：`packages/*`、`apps/playground`、`tests/e2e/component-lab`、活跃架构文档
- 审核日期：2026-04-17
- 执行方式：18 个初审子 agent + 18 个维度复核子 agent + 48 个子项复核子 agent，共 84 个子 agent

## 复核统计
- 初审发现总数：48
- 已独立复核条目数：48
- 保留：31
- 降级：15
- 驳回：2

## P0 清单
- 无

## P1 清单（按文件分组）
| 文件 | 问题 |
| --- | --- |
| `packages/word-editor-renderers/src/EditorCanvas.tsx` / `packages/word-editor-renderers/src/WordEditorPage.tsx` | 自动保存对 `charts/codes` 使用第二事实源 |
| `packages/flux-renderers-data/src/crud-renderer.tsx` | CRUD 选区摘要与 table 真实选区脱节 |
| `packages/flux-runtime/src/operation-control.ts` | retry/backoff 不感知 abort |
| `packages/flux-runtime/src/form-runtime-validation.ts` | runtime-only 异步验证缺少 stale suppression |
| `packages/flux-runtime/src/form-runtime-field-ops.ts` | hidden transition 不即时清 stale errors |
| `packages/flux-core/src/types/schema.ts` / `packages/flux-runtime/src/schema-compiler.ts` | `showErrorOn` 仍停留在旧 touched/submit 基线 |
| `packages/flux-renderers-data/src/index.tsx` / `packages/flux-renderers-data/src/table-renderer.tsx` | `loadingSlot` metadata 缺失 |
| `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx` | 缺少核心交互行为测试 |
| `packages/flux-renderers-form-advanced/src/condition-builder/i18n.ts` | condition-builder 自建私有 i18n |
| `packages/word-editor-renderers/src/WordEditorPage.tsx` 等 | word-editor 大量英文硬编码未接入统一 i18n |
| `packages/flux-runtime/src/data-source-runtime.ts` | `stopWhen` 异常被吞掉并继续轮询 |

## P2 清单（按文件分组）
| 文件 | 问题 |
| --- | --- |
| `packages/flow-designer-renderers/src/index.tsx` | 根入口公开面过宽 |
| `packages/report-designer-renderers/src/index.ts` | 根 barrel 泄露 toolbar/host wiring helper |
| `packages/word-editor-renderers/src/index.ts` | 根 barrel 暴露页面内部组合件 |
| `packages/flux-react/src/dialog-host-surface.tsx` | surface shell 订阅整份 visible scope |
| `packages/flux-renderers-form/src/renderers/input.tsx` / `packages/flux-renderers-form/src/form-renderers.css` | `nop-*` wrapper 承载默认布局/视觉 |
| `apps/playground/src/flow-designer-nodes.css` | 活跃 playground 样式仍以 BEM 为基线 |
| `packages/report-designer-renderers/src/renderers.integration.test.tsx` | 集成测试文件过大且混合多条契约 |
| `docs/architecture/frontend-baseline.md` | workspace 结构块漏列包，且仍推荐 `CompiledSchemaNode` |
| `docs/architecture/schema-file-validator.md` | 仍以 `CompiledSchemaNode` 作为现行编译结果 |

## 高频问题文件
| 文件 | 命中次数 |
| --- | ---: |
| `docs/architecture/frontend-baseline.md` | 2 |
| `packages/flow-designer-renderers/src/index.tsx` | 2 |
| `packages/flux-renderers-form/src/renderers/input.tsx` | 2 |
| `packages/word-editor-renderers/src/WordEditorPage.tsx` | 2 |
| `docs/architecture/schema-file-validator.md` | 2 |

## 跨维度模式
- 根入口公开面过宽：`flow-designer-renderers`、`report-designer-renderers`、`word-editor-renderers`
- 文档术语残留：`CompiledSchemaNode` 在多个活跃文档里继续出现
- i18n 收口不完整：私有 i18n 与裸字符串并存
- owner 边界重复：React 层或组合层继续维护本应由 owner/store 管理的状态摘要
- 验证系统仍残留旧 touched/submit 基线与 stale 处理缺口

## 已自动化的检查项
- 源码超大文件的硬阈值：`pnpm check:oversized-code-files`
- `>700` 行文件的二次防线：ESLint `max-lines`
- workspace 基础构建脚本/`tsconfig.build.json` 缺失：本轮未见问题，现有工程基线已较稳定

## 建议新增的自动化检查
- 检查活跃文档中是否仍出现 `CompiledSchemaNode`
- 检查 renderer 组件内是否直接访问 `.store.getState()` / `.store.subscribe()`
- 检查已接入 `flux-i18n` 的包中是否仍混入明显用户可见英文硬编码
- 检查 `resolveRendererSlotContent(props, 'x')` 的字段是否在 `RendererDefinition.fields` 中声明
- 检查 `withRetry` 类控制流是否接受并传播 `AbortSignal`

## 可暂缓项
- `designer-page.tsx` 继续收薄
- `flux-code-editor` 补统一包级注册入口
- `FieldFrame/useFieldPresentation` 订阅精度收敛
- `flux-renderers-form/src/renderers/form.tsx` 对 `ownedForm.store` 的直接访问收口

## 误报排除清单
- `useBoundFieldValue()` 在 form 模式的 scope 订阅：已被 `enabled: !currentForm` 关闭
- `dialog-host.tsx` 重复发布 surface status：当前 live code 已无该 effect
- UI 组件维度中的 `input[type=file]`、`input[type=color]`、spreadsheet 原生表格：均属允许例外
