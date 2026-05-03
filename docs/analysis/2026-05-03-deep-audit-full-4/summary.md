# 深度审核汇总报告

## 审核范围

- 执行的维度: 01-18 全量
- 覆盖的包: `packages/*` 全部 workspace 包，`apps/playground`，以及 `docs/` 中相关 architecture/reference/plan 路由文档
- 审核日期: 2026-05-03
- 执行方式: 18 个初审子 agent + 18 个维度复核子 agent + 10 个高风险逐项复核子 agent，共 46 个子 agent

## 复核统计

- 初审发现总数: 60
- 已独立复核条目数: 60
- 维度级复核完成数: 18
- 子项逐条复核数: 10
- 批量复核覆盖条目数: 0
- 保留: 35
- 降级: 25
- 驳回: 0

## P0 清单（按文件分组）

本轮无经独立复核确认的 P0 条目。

## P1 清单（按文件分组）

| 文件                                                                                                                | 维度 | 问题                                                                      |
| ------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------- |
| `apps/playground/src/styles.css`                                                                                    | 01   | 直接导入 `packages/ui/src/styles/base.css`，绕过 `@nop-chaos/ui/base.css` |
| `packages/flux-react/src/dialog-host.tsx` / `dialog-host-surface.tsx`                                               | 05   | Dialog/Drawer host 订阅整份 visible surface scope                         |
| `packages/flux-runtime/src/form-runtime-owner.ts`                                                                   | 06   | `validateForm()` 吞掉 rejected field validation                           |
| `packages/flux-react/src/use-node-source-props.ts` / `node-source-prop-controller.ts`                               | 07   | source prop 执行与治理仍滞留在 React 层                                   |
| `packages/word-editor-renderers/src/word-editor-page.tsx` 等                                                        | 10   | 直接依赖只在 playground 定义的 `--nop-*` token                            |
| `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`                                            | 12   | `wrap: true` 下把交互按钮放进 FieldFrame label 子树                       |
| `packages/flux-renderers-form-advanced/src/composite-field/composite-schemas.ts`                                    | 12   | `openAction/confirmAction/cancelAction` 公开但完全 silent no-op           |
| `packages/spreadsheet-renderers/src/page-renderer.tsx` / `packages/report-designer-renderers/src/page-renderer.tsx` | 13   | host action provider 用 `any` 打穿命令边界                                |
| `packages/ui/src/index.ts` / `packages/ui/src/components/ui/*`                                                      | 14   | 共享 UI 重型公共组件缺核心回归测试                                        |
| `packages/flux-i18n/src/i18n.ts`                                                                                    | 14   | 共享 i18n 单例基础设施测试极弱                                            |
| `packages/flow-designer-renderers/src/index.xyflow.test.tsx` 等                                                     | 14   | 测试直接跨包导入 `src/*`                                                  |
| `packages/spreadsheet-renderers/src/page-renderer.tsx` / `packages/report-designer-renderers/src/page-renderer.tsx` | 18   | namespaced action 返回面丢失统一 `ActionResult.error`                     |

## 高频问题文件（出现在多个维度中的文件）

| 文件                                                       | 命中维度       |
| ---------------------------------------------------------- | -------------- |
| `packages/report-designer-renderers/src/page-renderer.tsx` | 04, 09, 13, 18 |
| `packages/word-editor-renderers/src/word-editor-page.tsx`  | 02, 09, 10, 18 |
| `packages/flow-designer-renderers/src/index.tsx`           | 02, 17         |
| `packages/flux-react/src/index.tsx`                        | 02, 03         |
| `packages/flux-runtime/src/form-runtime-owner.ts`          | 06             |
| `apps/playground/src/styles.css`                           | 01, 10         |

## 跨维度模式

- 公共入口过宽: `flux-react`、`flow-designer-renderers`、`word-editor-renderers` 的根入口都出现了不同程度的 surface 膨胀。
- host/workbench 家族双轨演进: report/spreadsheet/word/flow 在 action provider、theme token、i18n、region usage 上出现了相似但不完全一致的收口缺口。
- React 层承担过多 owner 语义: dialog host 订阅、source prop 执行、surface status publication 都说明 runtime/React 边界仍有残余双轨。
- 文档/实现“过渡已完成”表述偏早: `resolveGap`、计划路由、import-stack 术语/接口都显示文档收口节奏快于 live code。

## 已自动化的检查项（lint/check 已覆盖，不需人工跟进）

- 超大代码文件阈值: `pnpm check:oversized-code-files`
- 超 700 行 ESLint 防线: `max-lines`
- `eval/new Function` 的显性扫描本轮未命中
- 大量基础类型/构建/导出一致性由 `typecheck`、`build`、workspace scripts 提供基础防线

## 建议新增的自动化检查

- 检查 `apps/*` / `packages/*` 是否直接导入 `packages/*/src/*`
- 检查 renderer 中是否存在 `helpers.render(props.regions.*.templateNode, ...)`，提示改用 `regions.*.render(...)`
- 检查 host action provider 是否把失败写入 `ActionResult.error`
- 检查公共包源码是否引用只在 `apps/playground/src/styles.css` 中定义的 token
- 检查 `docs/index.md` / active plans 中失效的 `docs/plans/*` 路由

## 可暂缓项（有问题但 ROI 暂时不高）

- playground demo 层的 BEM 残留
- `createFlowDesignerRegistry` 命名语义偏差
- `flux-code-editor` 的 `expressionConfig/sqlConfig` 仍是 `any`
- `ProtectSheetCommand.password` 未实现的契约澄清
- `useCurrentFormModelGeneration()` 的广播过宽优化

## 误报排除清单（看起来像问题但不建议动）

- `runtime-factory.ts`、`form-runtime.ts`、`reaction-runtime.ts` 虽超过 500 行，但当前 owner 边界基本自洽，不建议仅为行数机械拆分。
- `spreadsheet-renderers` 画布内的 `ss-*` 与结构类不按普通 renderer 样式规则处理，它是 hybrid CSS 特例。
- `input[type=file]`、`input[type=color]` 等原生能力控件在当前仓库里属于合理保留范围。
- `renderers -> flux-core/flux-formula/flux-runtime` 的稳定公开 API 依赖本轮不按越层问题上报。
