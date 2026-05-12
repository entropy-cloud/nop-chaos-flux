# 深度审核阶段性报告

> 状态：阶段性结果，尚未完成手册要求的追加深挖轮次。当前内容仅代表第 1 轮初审 + 一次独立复核，不能作为最终深度审核结论。

## 审核范围

- 执行维度：01-20 全量维度。
- 覆盖范围：`packages/`、`apps/`、`tests/e2e/`、`docs/architecture/`、`docs/references/`、`docs/plans/`。
- 审核日期：2026-05-12。
- 执行方式：20 个维度第 1 轮初审 + 4 个独立复核 agent 分组复核。第 2 轮追加深挖尚未完成，需补跑后重新复核并生成最终报告。

## 深挖统计

- 维度总数：20。
- 深挖轮次：所有维度均为 1 轮初审。
- 初审发现数：59。
- 零发现维度：1 个（维度 01）。

## 复核统计

- 已独立复核条目数：59。
- 维度级复核覆盖数：20。
- 保留：45。
- 降级保留：12。
- 驳回：2。
- 最终需跟进条目：57。

## P1 清单

| 编号  | 文件                                                                  | 摘要                                                                                                |
| ----- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 07-05 | `packages/flux-react/src/render-nodes.tsx`                            | `RenderNodes` 在 render/useMemo 阶段写 fragment scope cache，pre-commit abort 时 cleanup 不会运行。 |
| 08-01 | `packages/flux-react/src/hooks/use-form-hooks.ts`                     | 表单内部 validation owner 解析可能优先读祖先 `ValidationContext`。                                  |
| 08-02 | `packages/flux-runtime/src/form-runtime-validation.ts`                | disposed/未激活 validation owner 返回 clean success。                                               |
| 08-04 | `packages/flux-runtime/src/form-runtime-validation.ts`                | 同一路径含 async rule 时，同步错误被 debounce/async 阶段延后发布。                                  |
| 12-02 | `packages/flux-compiler/src/schema-compiler/node-compiler.ts`         | deep parameterized region 编译期缺 `$slot` 符号表。                                                 |
| 16-03 | `packages/flux-runtime/src/action-adapter.ts`                         | `setValues` live 行为与 current-scope/no-targeting 文档契约冲突。                                   |
| 19-01 | `packages/flux-action-core/src/action-dispatcher/action-execution.ts` | request-backed action 绕过 action-layer retry，软失败不重试/不计数。                                |

## P2 清单

| 编号  | 文件                                                                              | 摘要                                                                         |
| ----- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 02-01 | `packages/flux-compiler/src/schema-compiler/node-compiler.ts`                     | >700 行且混合节点、动作、导入、验证、source/reaction 编译职责。              |
| 02-03 | `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`       | ArrayField 混合 identity、runtime projection、validation、UI。               |
| 03-02 | `docs/references/form-validation-runtime-types.md`                                | Store API 文档缺 `subscribeToModelGeneration`。                              |
| 04-01 | `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-editing.ts`      | Spreadsheet editing 状态在 renderer local state/ref 与 core snapshot 双轨。  |
| 05-01 | `packages/flux-runtime/src/form-runtime.ts`                                       | field state 变更会广播给 form scope 数据订阅。                               |
| 06-01 | `packages/flux-react/src/schema-renderer.tsx`                                     | schema import preload 未把 AbortSignal 传到底层 prepare/importLoader。       |
| 06-03 | `packages/flow-designer-renderers/src/use-designer-auto-layout.ts`                | auto-layout cleanup 未失效 requestId，卸载后可能 setState。                  |
| 06-04 | `packages/flow-designer-renderers/src/designer-page-body.tsx`                     | 创建节点失败只返回 false/console.warn，无用户反馈。                          |
| 07-04 | `packages/flux-runtime/src/action-scope.ts`                                       | ActionScope 缺少 scope-level namespace cleanup。                             |
| 09-02 | `packages/flux-renderers-data/src/tree-renderer.tsx`                              | tree parameterized region 缺 repeated `instancePath`。                       |
| 10-01 | `packages/flux-react/src/node-error-boundary.tsx`                                 | 错误兜底 UI 仍使用 BEM 状态/区域类。                                         |
| 10-02 | `packages/flux-react/src/default-spacing.css`                                     | 默认 CSS 仍使用 BEM error UI selector。                                      |
| 12-01 | `packages/flux-react/src/node-frame-wrapper.tsx`                                  | FieldFrame 部分 chrome 从 raw schema 读取。                                  |
| 12-03 | `packages/flux-compiler/src/schema-compiler/tables.ts`                            | deep region rules 位于 compiler 全局表，未进入 RendererDefinition metadata。 |
| 13-01 | `packages/word-editor-core/src/document-io.ts`                                    | persisted datasets JSON 直接断言为 `Dataset[]`。                             |
| 15-01 | `packages/report-designer-renderers/src/page-renderer.tsx`                        | 双向同步热路径全量 `JSON.stringify` spreadsheet document。                   |
| 16-01 | `docs/architecture/report-designer/design.md`                                     | `selection`/`target` alias 文档与 live code/tests 冲突。                     |
| 16-02 | `docs/architecture/report-designer/design.md`                                     | `inspectorPanels` 文档称非规范但 manifest/host-data/tests 发布。             |
| 17-02 | `docs/references/flux-json-conventions.md`                                        | Button variant 文档与 live `ButtonSchema` 值域冲突。                         |
| 17-03 | `packages/flow-designer-core/src/types.ts`                                        | toolbar button variant 与 basic Button variant 值域分裂。                    |
| 17-07 | `packages/flux-renderers-form-advanced/src/condition-builder/operators.ts`        | condition-builder operator ids 使用 snake_case。                             |
| 18-01 | `packages/flow-designer-renderers/src/index.tsx`                                  | `designer-page` 声明 `$designer` scope export，但 live projection 不发布。   |
| 20-01 | `packages/flux-react/src/field-frame.tsx`                                         | `FieldFrame` `rootTag="div"` 路径 label 未程序化关联复合控件。               |
| 20-02 | `packages/flux-renderers-form/src/renderers/input.tsx`                            | Select/RadioGroup 错误说明未稳定关联实际 focus target。                      |
| 20-03 | `packages/flux-runtime/src/form-runtime-submit-flow.ts`                           | 提交校验失败后无首个错误字段聚焦。                                           |
| 20-04 | `packages/flux-renderers-form-advanced/src/condition-builder/condition-group.tsx` | AND/OR 状态只通过视觉样式表达。                                              |
| 20-05 | `packages/flux-renderers-form-advanced/src/condition-builder/condition-group.tsx` | 删除子组按钮缺稳定语义名称。                                                 |
| 20-06 | `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx`    | 可点击表格行缺 role/name/`aria-expanded`。                                   |
| 20-07 | `packages/flux-renderers-data/src/chart-renderer.tsx`                             | 图表缺数据文本替代。                                                         |

## P3 / 降级保留清单

| 编号  | 文件                                                                            | 摘要                                                       |
| ----- | ------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 02-02 | `packages/flow-designer-renderers/src/index.tsx`                                | root entry 过厚，包含 config compile 和 definitions。      |
| 02-04 | `packages/report-designer-renderers/src/page-renderer.tsx`                      | page renderer 是 report/spreadsheet bridge 可维护性热点。  |
| 03-01 | `packages/flux-renderers-form/src/index.tsx`                                    | form root barrel 暴露底层 field helpers。                  |
| 05-02 | `packages/flux-renderers-form/src/field-utils/field-handlers.tsx`               | scope fallback 缺 path 订阅。                              |
| 05-03 | `packages/flux-react/src/dialog-host.tsx`                                       | surface host 整 scope 订阅较粗。                           |
| 05-04 | `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts` | form 模式下仍启用 scope fallback 订阅。                    |
| 06-02 | `packages/report-designer-renderers/src/page-renderer.tsx`                      | 初始 field source refresh 失败可能产生旧告警。             |
| 07-01 | `packages/flux-react/src/use-node-source-props.ts`                              | anonymous source hook/runtime lifecycle 边界仍偏 React。   |
| 07-03 | `packages/flux-runtime/src/async-data/request-runtime.ts`                       | parent signal listener 请求完成后不移除。                  |
| 08-03 | `packages/flux-runtime/src/form-runtime-submit-flow.ts`                         | `summary-gate` 命名/行为与 recurse-submit 边界模糊。       |
| 09-01 | `packages/flux-renderers-basic/src/flex.tsx`                                    | flex renderer semantic props 与 marker-only 口径存在张力。 |
| 09-03 | `packages/flux-renderers-basic/src/tabs.tsx`                                    | tabs semantic event payload 一致性不足。                   |
| 09-04 | `packages/flux-renderers-data/src/crud-renderer.tsx`                            | CRUD refresh semantic event payload 一致性不足。           |
| 10-03 | `apps/playground/src/flow-designer/flow-designer-canvas.tsx`                    | playground Flow Designer 保留 modifier class。             |
| 11-01 | `packages/nop-debugger/src/panel/json-viewer.tsx`                               | JSON viewer 折叠控件使用 raw button。                      |
| 14-01 | `tests/e2e/component-lab/coverage-manifest.ts`                                  | Component Lab manifest 漏 `input-number`。                 |
| 14-02 | `tests/e2e/component-lab/coverage-manifest.ts`                                  | manifest write 覆盖声明与 spec 不一致。                    |
| 17-01 | `packages/flux-code-editor/src/types.ts`                                        | source ref 仍兼容 `dataPath`。                             |
| 17-04 | `docs/components/button/example.json`                                           | Button 示例使用不在 live schema 的 `size: "md"`。          |
| 17-05 | `docs/architecture/flow-designer/config-schema.md`                              | icon 示例使用 PascalCase。                                 |
| 17-06 | `packages/flow-designer-renderers/src/index.tsx`                                | `createFlowDesignerRegistry` 命名与行为不一致。            |

## 驳回项

| 编号  | 理由                                                                                                       |
| ----- | ---------------------------------------------------------------------------------------------------------- |
| 04-02 | report-designer 与 spreadsheet-core 双 core bridge 属 owner doc 支持的 bridge 形态，不作为单一事实源缺陷。 |
| 07-02 | `useSourceValue` 的 React mount/subscribe/dispose wiring 与当前 runtime observer 设计一致。                |

## 高频问题文件

| 文件                                                                              | 涉及维度           |
| --------------------------------------------------------------------------------- | ------------------ |
| `packages/report-designer-renderers/src/page-renderer.tsx`                        | 02, 06, 15         |
| `packages/flux-runtime/src/form-runtime-validation.ts`                            | 08                 |
| `packages/flux-react/src/*`                                                       | 05, 07, 10, 12, 20 |
| `packages/flux-renderers-form-advanced/src/condition-builder/condition-group.tsx` | 20                 |
| `docs/architecture/report-designer/design.md`                                     | 16                 |

## 建议新增自动化检查

- 检查 Component Lab route registry 与 `coverage-manifest.ts` 集合一致。
- 检查 `nop-*__*`、`nop-*--*`、`fd-*--*` BEM selector 残留。
- 检查 docs JSON examples 是否符合 live schema 枚举（Button variant/size/icon）。
- 检查 raw `<button>` 在非 `packages/ui`、非测试、非 host surface 的使用。

## 归档文件说明

- `review-results.md` 保存逐条复核结论。
- `01-*.md` 到 `20-*.md` 保存每维度最终保留项与复核状态。
- 本轮没有修改源代码，未运行 typecheck/build/lint/test。
- 2026-05-12 修正：该报告不能视为最终审核结果；需执行追加深挖直到各维度无新发现后，再重新独立复核。
