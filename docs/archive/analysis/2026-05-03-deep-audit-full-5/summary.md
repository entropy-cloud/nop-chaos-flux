# 深度审核汇总报告

## 审核范围

- 执行的维度: 01-18 全量
- 覆盖的包: `flux-core`, `flux-formula`, `flux-compiler`, `flux-action-core`, `flux-runtime`, `flux-react`, `flux-renderers-basic`, `flux-renderers-form`, `flux-renderers-form-advanced`, `flux-renderers-data`, `flux-code-editor`, `flux-i18n`, `ui`, `tailwind-preset`, `theme-tokens`, `flow-designer-core`, `flow-designer-renderers`, `spreadsheet-core`, `spreadsheet-renderers`, `report-designer-core`, `report-designer-renderers`, `word-editor-core`, `word-editor-renderers`, `nop-debugger`, `apps/playground`, `docs/*`, `scripts/*`
- 审核日期: 2026-05-03
- 执行方式: 18 个初审子 agent + 18 个维度复核子 agent + 8 个子项复核子 agent，共 44 个子 agent

## 复核统计

- 初审发现总数: 56
- 复核新增条目数: 2
- 已独立复核条目数: 58
- 维度级复核完成数: 18
- 子项逐条复核数: 19
- 批量复核覆盖条目数: 0
- 保留: 25
- 降级: 22
- 驳回: 11

## P0 清单（按文件分组）

无。

## P1 清单（按文件分组）

| 文件                                                                     | 维度 | 问题                                             |
| ------------------------------------------------------------------------ | ---- | ------------------------------------------------ |
| `scripts/check-workspace-manifest-deps.mjs`                              | 01   | 误报合法导出子路径依赖                           |
| `packages/flow-designer-renderers/src/designer-page.tsx`                 | 06   | create dialog 缺少方法级并发 guard               |
| `packages/flux-runtime/src/form-runtime-validation.ts`                   | 08   | hidden participation 未覆盖 runtime-registration |
| `packages/flux-react/src/field-frame.tsx`                                | 08   | non-form owner 下 dynamic required 展示失配      |
| `packages/flux-renderers-form/src/renderers/input.tsx`                   | 09   | `frameWrap:none` 下根级 `meta` 丢失              |
| `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx` | 09   | `frameWrap:none` 下根级 `meta` 丢失              |
| `packages/flux-code-editor/src/code-editor-styles.css`                   | 10   | 包级主题色硬编码                                 |
| `docs/architecture/flux-runtime-module-boundaries.md`                    | 16   | 迁移叙述落后于 live code                         |
| `docs/references/action-payload-matrix.md`                               | 17   | 仍把 action `dataPath` 当 stable field           |
| `docs/architecture/api-data-source.md`                                   | 17   | 仍把 action `dataPath` 当正式 contract           |
| `docs/architecture/action-algebra-formal-spec.md`                        | 17   | 仍把 action `dataPath` 当 targeting field        |

## 高频问题文件（出现在多个维度中的文件）

| 文件                                                     | 涉及维度 | 说明                                               |
| -------------------------------------------------------- | -------- | -------------------------------------------------- |
| `packages/flow-designer-renderers/src/designer-page.tsx` | 02, 06   | 宿主页持续膨胀，同时存在 async guard 缺口          |
| `packages/flux-react/src/hooks.ts`                       | 08, 15   | 展示层订阅与微性能问题都集中在公共 hook 面         |
| `docs/architecture/flux-runtime-module-boundaries.md`    | 03, 16   | API/owner 说明与 live code 多处出现同步滞后        |
| `docs/references/action-payload-matrix.md`               | 16, 17   | action `dataPath` 文档残留同时是文档漂移和术语冲突 |

## 跨维度模式

- action `dataPath` 已从代码契约移除，但 active docs/examples 仍在多处把它写成当前正式字段。
- 多个 renderer 的默认壳层负责输出根级 `meta`，但关闭壳层后 renderer 自身没有补齐根级 contract。
- 部分新能力或新边界已经在代码稳定落地，但 owner/reference 文档没有同步收口。
- 少量 async 入口仍在用 UI flag 代替方法级 guard，或用 fire-and-forget promise 遗漏 rejection 处理。

## 已自动化的检查项（lint/check 已覆盖，不需人工跟进）

- 超过 700 行的源码文件：`pnpm check:oversized-code-files` + ESLint `max-lines`
- 大量 runtime / validation / action 主路径：已有单测覆盖，不应再机械按“无同名测试文件”上报
- workspace 包导出 map 是否存在：`packages/*/package.json` 已有一致的 root exports 风格

## 建议新增的自动化检查

- 修正并扩展 `check-workspace-manifest-deps`，让它先归一化 workspace 子路径 import 再做依赖比对
- 增加 docs lint：检测 active docs/examples 中 action `dataPath` 残留
- 增加 renderer contract test：`wrap:true` renderer 在 `frameWrap:none` 下仍必须保留根级 `meta`
- 增加 i18n 扫描：优先检查 domain/workbench 包中的运行时可见硬编码文案

## 可暂缓项（有问题但 ROI 暂时不高）

- `DialogView/DrawerView` 的 host 级宽订阅，需要先做重渲染计数或 profiling 再决定是否收窄/删除
- `condition-builder` 的 `any` 暴露更像上层 schema typing 基线问题
- spreadsheet `canvas-styles.css` 范围漂移目前更像样式组织待收敛，而非 owner 越界
- `createFlowDesignerRegistry` 与 code-editor source-ref `dataPath` 属于 public naming rough edge，宜和后续 API 收敛一起处理

## 误报排除清单（看起来像问题但不建议动）

- `flux-runtime -> flux-compiler / flux-action-core`：当前正式架构，不是包边界违规
- `flow-designer-renderers` 根入口泄露 Xyflow 细节：live code 已收口到 `./unstable`
- `fieldset.collapsed` 本地状态：与组件设计文档一致，为初始值 + 本地 UI 状态
- `runtime-imports.test.ts` / `runtime-scope-actions.test.ts`：仍属于各自集成缝的公共契约测试，不宜机械报成跨域混测
- report designer 字段面板“未虚拟化”: 缺少规模基线与 profiling 证据，不足以列为性能红线
