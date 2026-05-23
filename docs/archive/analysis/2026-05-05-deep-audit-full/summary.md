# 深度审核汇总报告

## 审核范围

- 执行的维度：01-20 全量深度审核
- 覆盖的区域：`packages/*`、`apps/playground/src`、`tests/e2e`、`docs/architecture`、`docs/references`、`docs/index.md`
- 审核日期：2026-05-05
- 执行方式：20 个初审子 agent + 20 个维度复核子 agent + 8 个逐项复核子 agent + 1 个最终共识子 agent，共 49 个子 agent

## 复核统计

- 初审发现总数：61
- 已独立复核条目数：61
- 维度级复核完成数：20
- 子项逐条复核数：8
- 保留：33
- 降级：16
- 驳回：2

## P0 清单

- 无

## P1 清单

| 维度 | 条目                                                                                   | 文件                                                                                                                                                                                         |
| ---- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01   | CSS 子路径导出仍指向 `src/`                                                            | `packages/flux-react/package.json`, `packages/theme-tokens/package.json`, `packages/word-editor-renderers/package.json`                                                                      |
| 02   | `action-dispatcher.test.ts` 超过 700 行且跨语义混杂                                    | `packages/flux-action-core/src/__tests__/action-dispatcher.test.ts`                                                                                                                          |
| 03   | report designer host projection 在 manifest/runtime/doc 三处漂移                       | `packages/report-designer-renderers/src/report-designer-manifest.ts`, `host-data.ts`, `docs/components/report-designer-page/design.md`                                                       |
| 06   | report designer 启动期 field source 双加载与 mount 无 catch                            | `packages/report-designer-core/src/core.ts`, `packages/report-designer-renderers/src/page-renderer.tsx`                                                                                      |
| 08   | surface-root validation owner 创建后未 attach compiled model                           | `packages/flux-runtime/src/surface-runtime.ts`, `packages/flux-react/src/schema-renderer.tsx`                                                                                                |
| 09   | `designer-canvas` / `designer-palette` live renderer 不接收 `RendererComponentProps`   | `packages/flow-designer-renderers/src/designer-page.tsx`, `index.tsx`                                                                                                                        |
| 10   | flow designer palette 依赖 playground 私有 gradient 样式                               | `packages/flow-designer-renderers/src/designer-palette.tsx`, `apps/playground/src/styles-theme-utilities.css`                                                                                |
| 12   | wrapped field renderer 在默认 `FieldFrame<label>` 下放次级按钮                         | `packages/flux-renderers-form-advanced/src/array-editor.tsx`, `key-value.tsx`, `detail-view/detail-field.tsx`                                                                                |
| 16   | active docs 仍引用不存在的 playground 路径                                             | `docs/index.md`, `docs/architecture/playground-experience.md`, `theme-compatibility.md`, `debugger-runtime.md`, `flow-designer/collaboration.md`, `docs/references/maintenance-checklist.md` |
| 18   | host page renderer 缺少 `rendererClass` 导致 shared tooling 误判为 `instance-renderer` | `packages/spreadsheet-renderers/src/renderers.tsx`, `packages/report-designer-renderers/src/renderers.tsx`, `packages/word-editor-renderers/src/renderers.tsx`                               |
| 19   | data-source 顶层 `retry/backoff` 在 compile/runtime 传递链中丢失                       | `packages/flux-compiler/src/source-compiler.ts`, `packages/flux-core/src/types/compilation.ts`, `packages/flux-runtime/src/async-data/source-registry.ts`                                    |
| 20   | `FieldFrame` 未把错误/提示关联到真实焦点控件                                           | `packages/flux-react/src/field-frame.tsx`, `packages/flux-renderers-form/src/renderers/input.tsx`                                                                                            |
| 20   | spreadsheet grid 缺少核心键盘导航/选择入口                                             | `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`                                                                                                                                    |

## 高频问题文件

| 文件                                                     | 维度               | 模式                                          |
| -------------------------------------------------------- | ------------------ | --------------------------------------------- |
| `packages/report-designer-renderers/src/*`               | 03, 06, 09, 18, 20 | host 契约、async、防透传、i18n、a11y 混合缺口 |
| `packages/flux-react/src/field-frame.tsx`                | 08, 20             | owner / a11y 共享壳层缺口                     |
| `packages/flow-designer-renderers/src/designer-page.tsx` | 09, 10, 20         | live renderer 契约、样式归属、键盘入口        |
| `packages/flux-renderers-form-advanced/src/*`            | 08, 12, 13, 20     | validation、FieldFrame、事件类型、ARIA 结构   |
| `apps/playground/src/*`                                  | 10, 16             | legacy 样式与文档锚点漂移                     |

## 跨维度模式

- owner 已文档化，但 runtime attach 链仍未闭合：surface validation owner、non-form validation 参与链
- live renderer 已注册，但根契约透传不完整：`RendererComponentProps`、`meta.className/testid/cid`、event passthrough
- 共享基础设施已存在，但局部路径仍绕开：监控上报、i18n、authoring metadata、FieldFrame ARIA 传递
- demo/playground 与 reusable package 之间仍有反向依赖：palette 视觉依赖 playground CSS、active docs 仍指向旧 playground 文件名

## 已自动化的检查项

- `pnpm check:oversized-code-files` 已覆盖 `>700` 行硬阈值
- `pnpm lint` 的 `max-lines` 已提供第二道超大文件防线
- 活跃源码中 `eval` / `new Function` 未命中，安全动态执行红线当前为零发现

## 建议新增的自动化检查

- 检查 package `exports` 是否把公开子路径错误地指向 `src/`
- 检查 active docs 中的代码锚点是否指向真实存在的文件路径
- 检查 live host renderer 若声明 `hostContract` 时是否同时声明 `rendererClass: 'domain-host-renderer'`
- 为 `FieldFrame` 增加真实焦点控件的 `aria-describedby` / `aria-errormessage` 回归测试
- 为 report designer field source 加载增加 single-flight / stale-write 回归测试
- 为 data-source `retry/backoff` compile/runtime 传递链补合同测试

## 可暂缓项

- `flux-react` 中仅测试使用的 `@nop-chaos/flux-compiler` 依赖分类偏宽
- report field panel 长列表虚拟化需求
- code-editor / condition-builder 的公开 `any` 收口
- code-editor source-ref 中 `dataPath` 到 `path` 的命名收敛
- playground demo 原生按钮替换为 `@nop-chaos/ui/Button`
- `table quick-edit` deep region 半成品规则的收口方案

## 误报排除清单

- renderer 到 `flux-core` / `flux-runtime` 的稳定公开 API 依赖未报为边界问题
- spreadsheet 高性能宿主表面中的原生元素未机械报为 UI 组件违约
- declarative surface 生命周期双轨被降级为已知收敛债，而非直接主缺陷
- `report-inspector.body` 被当作 prop-based schema carrier 的当前 bridge shape 未判定为 slot 违约
- `logs/archive/plans` 中的历史路径未算作文档-代码当前漂移
