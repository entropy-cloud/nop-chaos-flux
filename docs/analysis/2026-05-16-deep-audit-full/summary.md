# 深度审核汇总报告

## 审核范围

- 执行的维度：01-20 全部维度
- 覆盖的包：`packages/*`、`apps/playground`、相关 `docs/*`
- 审核日期：2026-05-16
- 执行方式：按 `docs/skills/deep-audit-prompts.md` 进行首轮初审、针对有发现维度追加深挖、再做独立维度复核；零发现维度也做独立复核确认

## 深挖统计

- 维度总数：20
- 各维度深挖轮次：01=2, 02=1, 03=2, 04=2, 05=1, 06=2, 07=2, 08=2, 09=1, 10=2, 11=2, 12=1, 13=1, 14=1, 15=1, 16=1, 17=1, 18=1, 19=1, 20=1
- 深挖总轮次：28
- 深挖总发现数：40

## 复核统计

- 深挖发现总数：40
- 已独立复核条目数：40
- 维度级复核完成数：20
- 子项逐条复核数：16
- 保留：26
- 降级：12
- 驳回：2

## P0 清单（按文件分组）

无。

## P1 清单（按文件分组）

| 编号  | 文件                                                                                      | 一句话摘要                                                               |
| ----- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 01-01 | `packages/flux-renderers-basic/src/__tests__/basic-page-layout-structure.test.tsx`        | 测试导入了未声明的 `@nop-chaos/flux-compiler`                            |
| 03-04 | `packages/flux-bundle/src/types.ts`                                                       | facade 公开了不被底层 registry 支持的 renderer 定义形态                  |
| 04-03 | `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`                  | detail-field commit 失败时不会回滚已写入父 owner 的值                    |
| 06-01 | `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-sheet-commands.ts`       | spreadsheet 命令在 `ok:false` 时仍记录成功日志                           |
| 06-04 | `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx`                    | report-spreadsheet 字段拖拽存在半提交                                    |
| 07-01 | `packages/flux-react/src/use-node-scopes.ts`                                              | node-owned `ActionScope` 缺少显式 release                                |
| 07-02 | `packages/flux-react/src/node-renderer.tsx`                                               | import-owned `ActionScope` 只弹出 frame 不释放 scope                     |
| 07-04 | `packages/flux-react/src/render-nodes.tsx`                                                | fragment scope cache 淘汰时未 dispose child scope                        |
| 08-01 | `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`                   | detail-view 的 parent-form subtree commit 路径丢失 `commit` reason       |
| 08-03 | `packages/flux-runtime/src/runtime-owned-factories.ts`                                    | non-form validation owner 缺少 dependent revalidation diagnostics wiring |
| 08-04 | `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`                   | detail commit 只做 subtree 校验，漏掉子树外 dependents                   |
| 10-01 | `packages/spreadsheet-renderers/src/canvas-styles.css`                                    | spreadsheet package CSS 含有与 canvas 无关的全局选择器                   |
| 10-03 | `packages/spreadsheet-renderers/src/canvas-styles.css`                                    | spreadsheet header 基础样式重复定义且冲突                                |
| 12-01 | `packages/flux-compiler/src/schema-compiler/regions.ts`                                   | slot param 校验仍允许任意 `$foo` 名称                                    |
| 12-02 | `packages/flux-compiler/src/schema-compiler/shape-validation.ts`                          | deep extracted region compile-aware 但 validation-blind                  |
| 13-01 | `packages/flux-bundle/src/types.ts`                                                       | bundle 公开 renderer API 把真实 contract 擦除成 variadic `any`           |
| 14-01 | `packages/word-editor-renderers/src/hooks/use-word-editor-save.ts`                        | 失败/abort 分支缺少 focused tests                                        |
| 14-02 | `packages/report-designer-renderers/src/field-panel-renderer.tsx`                         | 失败测试未校验 diagnostics contract                                      |
| 15-01 | `packages/flux-runtime/src/async-data/api-cache.ts`                                       | API cache 默认 key 忽略 headers                                          |
| 16-01 | `docs/plans/281-deep-audit-2026-05-14-runtime-owner-lifecycle-validation-closure-plan.md` | plan 281 已标 completed 但仍保留未勾选 exit criterion                    |
| 16-02 | `docs/references/maintenance-checklist.md`                                                | maintenance checklist 仍把 spreadsheet/report families 写成 future       |
| 17-01 | `docs/examples/action-flow-tree.md`                                                       | active examples 仍教授 `visibleOn`                                       |
| 17-02 | `docs/components/alert/design.md`                                                         | alert severity 在 active docs 中同时使用 `variant` 与 `level`            |
| 18-01 | `packages/flow-designer-renderers/src/schemas.ts`                                         | Flow Designer page input 缺少同族 host-page 的通用 props                 |
| 18-03 | `packages/flow-designer-renderers/src/index.tsx`                                          | Flow Designer 缺少 peer-style `define*PageSchema` helper                 |
| 19-02 | `packages/flux-runtime/src/import-stack.ts`                                               | import-stack 失败回滚未释放 owned `ActionScope`                          |
| 20-01 | `packages/flux-renderers-form/src/renderers/input.tsx`                                    | group widget 缺少程序化名称                                              |
| 20-02 | `packages/flux-renderers-form-advanced/src/tree-controls.tsx`                             | tree 控件根节点缺少 accessible name                                      |

## 高频问题文件（出现在多个维度中的文件）

| 文件                                                                    | 维度   | 说明                                                                  |
| ----------------------------------------------------------------------- | ------ | --------------------------------------------------------------------- |
| `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx` | 08     | commit reason / subtree closure 两类验证违约集中出现                  |
| `packages/flux-react/src/render-nodes.tsx`                              | 07, 13 | 同时暴露 retained scope teardown 与 defensive type fallback 问题      |
| `packages/spreadsheet-renderers/src/canvas-styles.css`                  | 10     | 同一 stylesheet 同时存在作用域泄漏、基础样式冲突和 primitive coupling |
| `packages/flux-bundle/src/types.ts`                                     | 03, 13 | facade 既有 API 表面积问题，也有公开类型擦除问题                      |

## 跨维度模式

- facade / wrapper 层的“类型或公开面比底层实现更宽”反复出现，典型在 `flux-bundle`。
- retained owner 资源的 teardown 漏口集中在 `flux-react` 与 `flux-runtime` 的交界层。
- detail / staged owner 路径仍是验证与状态所有权的高风险聚集区。
- spreadsheet 相关问题主要集中在 shell/styling/command result fidelity，而不是核心 canvas 渲染本身。

## 已自动化的检查项（lint/check 已覆盖，不需人工跟进）

- React 19 legacy API
- src 产物泄漏
- package CSS export 指向 `dist`
- i18n used-key 缺失
- oversized file `>700` 硬错误
- workspace manifest deps 硬门禁
- fieldframe bypass suspects
- missing renderer marker suspects

## 建议新增的自动化检查

- 检查 facade/public type 是否比底层 registry/runtime contract 更宽
- 检查 retained child scope/action scope 是否缺少对应 release/dispose
- 检查 `validateSubtree(..., 'commit')` 在 detail/staged owner 路径是否漏传 reason
- 检查 stylesheet 中未根植到 package root / stable slot 的裸类选择器
- 检查测试是否断言 diagnostics side effect，而不只断言 notify

## 可暂缓项（有问题但 ROI 暂时不高）

- `designer-palette.tsx` 的重复 `.find()` render lookup
- `word-editor-page-actions.test.tsx` 的跨域厚测试拆分
- debugger inspector enrich 失败的 telemetry 补强
- spreadsheet outer chrome 对 `--nop-*` token 的残余绕开

## 误报排除清单（看起来像问题但不建议动）

- `object-field` 的 adapted working state 没有被保留为最终 owner 缺陷
- `scope-debug` 的 broad subscription 属 debug renderer 有意设计
- virtualized spacer `<tr>` 不适合机械替换成 `TableRow`
- `dataPath` fallback 属显式 deprecated compatibility，不作为 naming finding 保留
