# 深度审核汇总报告

## 审核范围

- 执行的维度: 01-18 全量
- 覆盖的包: `packages/*` 与相关 `apps/*` / `docs/*`
- 审核日期: 2026-05-01
- 执行方式: 18 个初审子 agent + 18 个维度复核子 agent + 12 个子项复核子 agent，共 48 个子 agent

## 复核统计

- 初审发现总数: 78
- 已独立复核条目数: 78
- 维度级复核完成数: 18
- 子项逐条复核数: 12
- 批量复核覆盖条目数: 0
- 保留: 48
- 降级: 23
- 驳回: 7

## P0 清单

无。

## P1 清单

| 文件                                                                                                               | 维度     | 问题                                                                                                             | 复核结论 |
| ------------------------------------------------------------------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------- | -------- |
| `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx`                                             | 04       | 电子表格清空选择后未清理 report `selectionTarget`                                                                | 保留     |
| `packages/flow-designer-renderers/src/designer-page.tsx`                                                           | 04/07/09 | `treeDocument` props-to-state 双事实源，且存在 render-phase `setState`，并直接从 `props.schema` 读取关键业务输入 | 保留     |
| `packages/flux-compiler/src/schema-compiler-registry.test.ts`                                                      | 02/14    | 735 行 omnibus test，已超过必须拆分阈值                                                                          | 保留     |
| `packages/flux-compiler/src/schema-compiler/validation-collection.ts`                                              | 08       | 校验收集未在 `create-owner` 边界停止                                                                             | 保留     |
| `packages/flux-renderers-form/src/field-utils.tsx`                                                                 | 05/06/08 | `useFieldPresentation()` 广播订阅；异步 `adapter.out` 无 stale guard；`validateOn: change` 被 `touched` 错误门控 | 保留     |
| `packages/flux-react/src/field-frame.tsx`                                                                          | 05       | 动态 required 计算使用全表单广播订阅                                                                             | 保留     |
| `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts`                                    | 09       | 直接读 store，绕过响应式订阅契约                                                                                 | 保留     |
| `packages/flux-code-editor/src/code-editor-renderer.tsx` + `apps/playground/src/styles.css`                        | 10       | 代码编辑器包视觉外观依赖 playground CSS                                                                          | 保留     |
| `packages/flow-designer-renderers/src/designer-theme.css`                                                          | 10       | Flow Designer token 默认值仍大量依赖字面量而非共享 token                                                         | 保留     |
| `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx` + `packages/spreadsheet-renderers/src/canvas-styles.css` | 10       | 电子表格结构类命名与 canvas CSS owner 边界漂移                                                                   | 保留     |
| `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`                                       | 12       | semantic action slot 标成 `ignored`，但运行时仍直接读原始 schema 执行                                            | 保留     |
| `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`                                           | 12       | semantic action slot 标成 `ignored`，但运行时仍直接读原始 schema 执行                                            | 保留     |
| `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`                                            | 12       | semantic action slot 标成 `ignored`，但运行时仍直接读原始 schema 执行                                            | 保留     |
| `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`                                        | 12       | `detectVariantAction` / nested variant 内容绕过 metadata / region 归一化                                         | 保留     |
| `packages/ui/src/index.ts`                                                                                         | 14       | 公开组件面很宽，但直接契约测试偏薄                                                                               | 保留     |
| `docs/architecture/frontend-baseline.md`                                                                           | 16       | 活跃基线文档遗漏 `flux-compiler` / `flux-action-core`                                                            | 保留     |
| `docs/plans/143-unit-test-coverage-80-percent-target-plan.md`                                                      | 16       | 计划头部已写 completed，但正文仍保留 partially completed 状态                                                    | 保留     |

## 高频问题文件

| 文件                                                     | 涉及维度       | 模式                                                        |
| -------------------------------------------------------- | -------------- | ----------------------------------------------------------- |
| `packages/flow-designer-renderers/src/designer-page.tsx` | 04/07/09/13    | 状态所有权、生命周期、renderer 契约、类型契约同时漂移       |
| `packages/flux-renderers-form/src/field-utils.tsx`       | 05/06/08/12    | 订阅精度、异步提交、验证触发、field chrome 归一化交织       |
| `packages/flux-code-editor/src/*`                        | 03/09/10/11/18 | API 表面积、store 访问、样式 owner、UI 合规、跨包模式一致性 |
| `packages/flux-compiler/src/*`                           | 02/08/14       | 编译器职责膨胀、校验 owner 边界、mega test                  |
| `docs/skills/deep-audit-prompts.md`                      | 16/17          | 活跃审核手册存在术语与现状漂移                              |

## 跨维度模式

- 原始 schema 逃逸: 多个复杂 renderer 仍绕过 `props.props` / `props.regions` / metadata，直接消费 `schema`。
- owner 边界未彻底收口: form validation owner、surface/status publication、report/spreadsheet host projection 仍有 React 桥接或边界未断开的痕迹。
- 测试文件持续膨胀: compiler/runtime/react 若干测试文件已演变成 omnibus spec。
- 文档路由与活跃 baseline 漂移: 部分 architecture doc、audit prompt、plan 状态没有跟上现状。
- 包级 public surface 偏宽: `flux-react`、`flux-code-editor`、word editor 相关包仍有 facade/authority blur。

## 已自动化的检查项

- `pnpm check:oversized-code-files` 已覆盖 `>500` / `>700` 行阈值。
- `eslint max-lines` 已作为超大文件第二道防线。
- 当前 live source 未发现 `eval(` / `new Function(` 违规。
- 当前 live source 未发现跨包 `@nop-chaos/*/src/...` 内部路径导入。
- 测试脚本层面未发现 Vitest/Jest 双栈混用。

## 建议新增的自动化检查

- 检查 package build 是否把 `*.test.*` / `__tests__` 产物发进 `dist/`。
- lint 规则: renderer 业务输入禁止直接从 `props.schema` 读取。
- lint 规则: renderer 禁止 `store.getState()` 直读，要求 selector hook。
- 编译期校验: `ignored` field 不得在 renderer 中作为 semantic action / slot 再消费。
- docs 检查: 活跃 architecture doc 中的文件行号锚点失效扫描。
- 安全规则补全: 为 `eval(` 增加与 `new Function` 对称的静态检查。
- i18n 规则: 统一检查 user-facing fallback string 与 key 风格。

## 可暂缓项

- `flux-react` / `flux-renderers-data` 中 test-only dependency 仍在 runtime `dependencies`，更像清单卫生问题。
- `flux-compiler/src/schema-compiler.ts` 轻度二次膨胀，应观察而非立即拆。
- host-scope broad projection 精度问题存在，但尚未确认到必须立刻重构的程度。
- condition-builder 的 `any` 更偏 API 可读性问题，不是当前 runtime bug。

## 误报排除清单

- spreadsheet grid / virtualized table / `input[type=file]` / `input[type=color]` 保留原生 HTML 属于合理例外。
- `dynamic-renderer` 的一次性 schemaApi 拉取在当前 baseline 下仍可归属 renderer。
- `closeDialog` / `closeDrawer` 仍是有意支持的 compatibility alias，不构成 live code 违约。
- code-editor `editorTheme` 是 props 驱动，而不是本地主题状态 owner 违规。
